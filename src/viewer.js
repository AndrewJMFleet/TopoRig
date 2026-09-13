import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class FaceViewer {
  constructor(host,{capture=false}={}){
    this.host=host;this.meshes=[];this.loadId=0;this.mode='texture';this.visible=true;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:capture,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setClearColor(0,0);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.1;
    host.append(this.renderer.domElement);
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(32,1,.01,100);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.enablePan=false;
    this.controls.minDistance=1.4;this.controls.maxDistance=7;this.controls.minPolarAngle=.25;this.controls.maxPolarAngle=Math.PI-.25;
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x899474,1.7));
    const key=new THREE.DirectionalLight(0xfff5e5,1.7);key.position.set(3,4,5);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xe7edff,.8);fill.position.set(-4,1,3);this.scene.add(fill);
    const rim=new THREE.DirectionalLight(0xffffff,1.5);rim.position.set(0,3,-3);this.scene.add(rim);
    this.loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);
    this.visibilityObserver=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;});this.visibilityObserver.observe(host);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.onContextLost?.();});
    this.resize();this.resetCamera();
    this.renderer.setAnimationLoop(time=>{
      if(!this.visible||document.hidden||this.contextLost)return;
      this.onFrame?.(time);this.controls.update();this.renderer.render(this.scene,this.camera);
    });
  }
  resize(){const {width,height}=this.host.getBoundingClientRect();if(!width||!height)return;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();}
  resetCamera(){
    const distance=Math.max(3.65,2.05/(2*Math.tan(THREE.MathUtils.degToRad(16))*this.camera.aspect));
    this.camera.position.set(0,.03,distance);this.controls.target.set(0,0,0);this.controls.update();
  }
  async load(url,onProgress){
    const id=++this.loadId;
    // Release the old head before loading to keep memory bounded on mobile.
    if(this.model){this.scene.remove(this.model);this.disposeModel(this.model);this.model=null;this.meshes=[];}
    const gltf=await this.loader.loadAsync(url,onProgress);
    if(id!==this.loadId){this.disposeModel(gltf.scene);return;}
    this.model=gltf.scene;
    this.meshes=[];
    this.model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      const geometry=mesh.geometry;
      // Only one AU is active. Applying that delta on the CPU avoids uploading a
      // 53-layer morph texture for every high-resolution sample to mobile GPUs.
      const targets=geometry.morphAttributes.position||[];
      const dictionary={...mesh.morphTargetDictionary};
      // Meshopt quantizes attributes; decode normalized/interleaved values before
      // arithmetic so weights act in coordinate space instead of integer storage.
      const toFloat=attribute=>{
        if(!attribute)return null;
        const values=new Float32Array(attribute.count*3);
        for(let i=0;i<attribute.count;i++){values[i*3]=attribute.getX(i);values[i*3+1]=attribute.getY(i);values[i*3+2]=attribute.getZ(i);}
        return new THREE.BufferAttribute(values,3);
      };
      const neutral=toFloat(geometry.attributes.position);
      const neutralNormal=toFloat(geometry.attributes.normal);
      mesh.userData.rig={targets,dictionary,neutral,neutralNormal,relative:geometry.morphTargetsRelative};
      geometry.morphAttributes={};mesh.morphTargetInfluences=[];mesh.morphTargetDictionary={};
      geometry.setAttribute('position',neutral.clone().setUsage(THREE.DynamicDrawUsage));
      if(neutralNormal)geometry.setAttribute('normal',neutralNormal.clone().setUsage(THREE.DynamicDrawUsage));
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      mesh.userData.originalMaterials=materials;
      for(const material of materials){material.metalness=0;material.roughness=.87;material.side=THREE.DoubleSide;material.emissiveIntensity=0;material.transparent=false;material.opacity=1;material.depthWrite=true;}
      mesh.userData.clayMaterials=materials.map(()=>new THREE.MeshStandardMaterial({color:0xc6cbb6,roughness:.78,side:THREE.DoubleSide}));
      mesh.userData.wireMaterials=materials.map(()=>new THREE.MeshBasicMaterial({color:0x63734e,wireframe:true,transparent:true,opacity:.42}));
      mesh.frustumCulled=false;this.meshes.push(mesh);
    });
    this.model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(this.model);
    const size=box.getSize(new THREE.Vector3());const center=box.getCenter(new THREE.Vector3());
    const scale=1.9/size.y;
    this.model.scale.multiplyScalar(scale);this.model.position.addScaledVector(center,-scale);
    this.scene.add(this.model);this.lastExpression=null;this.resetCamera();this.setMode(this.mode);
  }
  setExpression(name,weight,gazeName=null,gazeWeight=0){
    if(!this.model)return;
    // Skip duplicate updates and limit playback quantization to 1/1000.
    weight=Math.round(weight*1000)/1000;
    const signature=`${name}:${weight}:${gazeName}:${gazeWeight}`;if(signature===this.lastExpression)return;this.lastExpression=signature;
    for(const mesh of this.meshes){
      const {targets,dictionary,neutral,neutralNormal,relative}=mesh.userData.rig;
      // Gaze shapes live on the separate eyeball meshes, so facial and gaze
      // controls can be adjusted independently without resetting one another.
      const isGazeMesh=gazeName&&dictionary[gazeName]!==undefined;
      const target=targets[dictionary[isGazeMesh?gazeName:name]];
      const influence=isGazeMesh?gazeWeight:weight;
      const position=mesh.geometry.attributes.position;
      const output=position.array, source=neutral.array;
      if(target&&influence>0){
        for(let i=0;i<position.count;i++){
          const j=i*3;
          output[j]=source[j]+influence*(target.getX(i)-(relative?0:source[j]));
          output[j+1]=source[j+1]+influence*(target.getY(i)-(relative?0:source[j+1]));
          output[j+2]=source[j+2]+influence*(target.getZ(i)-(relative?0:source[j+2]));
        }
        mesh.geometry.computeVertexNormals();
      }else{
        output.set(source);
        if(neutralNormal){mesh.geometry.attributes.normal.array.set(neutralNormal.array);mesh.geometry.attributes.normal.needsUpdate=true;}
      }
      position.needsUpdate=true;
    }
    this.activeControl=name;this.activeWeight=weight;
  }
  setMode(mode){this.mode=mode;for(const mesh of this.meshes){const materials=mode==='texture'?mesh.userData.originalMaterials:mode==='clay'?mesh.userData.clayMaterials:mesh.userData.wireMaterials;mesh.material=materials.length===1?materials[0]:materials;}}
  disposeModel(model){
    const textures=new Set();
    model.traverse(mesh=>{
      if(!mesh.isMesh)return;
      mesh.geometry.dispose();
      const materials=[...(mesh.userData.originalMaterials||[mesh.material].flat()),...(mesh.userData.clayMaterials||[]),...(mesh.userData.wireMaterials||[])];
      for(const material of materials){for(const value of Object.values(material)){if(value?.isTexture)textures.add(value);}material.dispose();}
      delete mesh.userData.rig;
    });
    for(const texture of textures){texture.source?.data?.close?.();texture.dispose();}
  }
  getDiagnostics(){
    let changedVertices=0,maxDisplacement=0;
    for(const mesh of this.meshes){const a=mesh.geometry.attributes.position.array,b=mesh.userData.rig.neutral.array;for(let i=0;i<a.length;i+=3){const d=Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]);if(d>1e-7)changedVertices++;maxDisplacement=Math.max(maxDisplacement,d);}}
    return {activeControl:this.activeControl,activeWeight:this.activeWeight,changedVertices,maxDisplacement,meshCount:this.meshes.length,renderedTriangles:this.renderer.info.render.triangles};
  }
  capture(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
}
