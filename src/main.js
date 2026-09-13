import './style.css';
import { createIcons, ArrowUpRight, ArrowDownRight, ArrowDown, ArrowUp, FileText, ChevronDown, Move, Scan, Play, Pause, RotateCcw, Columns2, MousePointer2, Layers3, Network, ScanEye, Download, Box, Code, Database } from 'lucide';
import { CONTROLS, GAZE_CONTROLS } from './controls.js';

const icons={ArrowUpRight,ArrowDownRight,ArrowDown,ArrowUp,FileText,ChevronDown,Move,Scan,Play,Pause,RotateCcw,Columns2,MousePointer2,Layers3,Network,ScanEye,Download,Box,Code,Database};
const refreshIcons=()=>createIcons({icons,attrs:{'aria-hidden':'true'}});
refreshIcons();
const $=id=>document.getElementById(id);
const base=import.meta.env.BASE_URL;
const samples=['sample_00033','sample_00041','sample_00049','sample_00250'];
const state={sample:samples[0],control:'jawOpen',intensity:.65,gazeControl:'eyeLookDown_L',gazeIntensity:0,playing:false,comparing:false,mode:'texture',loaded:false};
let viewer, manifest, initialization, loadVersion=0, playbackOrigin=0;
const availableControls=()=>CONTROLS.filter(c=>manifest?.find(s=>s.id===state.sample)?.controls.includes(c.name)??true);

$('sample-strip').innerHTML=samples.map((id,i)=>`<button class="sample-button ${i===0?'active':''}" data-sample="${id}" aria-label="Choose sample ${id.slice(7)}" aria-pressed="${i===0}"><img src="${base}assets/${id}.webp" alt="" width="41" height="46"><span>Sample ${String(i+1).padStart(2,'0')}<small>${id.slice(7)}</small></span></button>`).join('');
function populateControls(){
  let options=availableControls().filter(c=>$('control-group').value==='all'||c.group===$('control-group').value);
  if(!options.some(c=>c.name===state.control)) state.control=options[0]?.name??'jawOpen';
  $('action-unit').innerHTML=options.map(c=>`<option value="${c.name}">${c.au} — ${c.label}</option>`).join('');
  $('action-unit').value=state.control;
  $('control-description').textContent=CONTROLS.find(c=>c.name===state.control).description;
  updateGeometry();
}
function updateGeometry(){if(state.loaded)viewer?.setExpression(state.control,state.comparing?0:state.intensity,state.gazeControl,state.comparing?0:state.gazeIntensity);}
function updateIntensity(value){state.intensity=Math.max(0,Math.min(1,value));$('intensity').value=state.intensity;$('intensity').style.setProperty('--value',`${state.intensity*100}%`);$('intensity-value').value=state.intensity.toFixed(2);updateGeometry();}
function updateGazeIntensity(value){state.gazeIntensity=Math.max(0,Math.min(1,value));$('gaze-intensity').value=state.gazeIntensity;$('gaze-intensity').style.setProperty('--value',`${state.gazeIntensity*100}%`);$('gaze-value').value=state.gazeIntensity.toFixed(2);updateGeometry();}
function setPlaying(value){
  state.playing=value;playbackOrigin=performance.now()-Math.acos(1-2*state.intensity)/Math.PI*1800;
  $('play').setAttribute('aria-pressed',String(value));
  $('play').innerHTML=`<i data-lucide="${value?'pause':'play'}"></i><span>${value?'Pause':'Animate'}</span>`;refreshIcons();
}
function loading(message,detail,error=false){$('viewer-loading').hidden=false;$('viewer-loading').classList.toggle('error',error);$('loading-label').textContent=message;$('loading-detail').textContent=detail;$('retry-load').hidden=!error;}

async function initialize(){
  if(viewer&&manifest)return;
  if(initialization)return initialization;
  initialization=(async()=>{
    const [{FaceViewer},response]=await Promise.all([import('./viewer.js'),fetch(`${base}models/manifest.json`)]);
    if(!response.ok)throw new Error('The sample manifest could not be loaded.');
    manifest=await response.json();
    viewer=new FaceViewer($('canvas-host'), {capture:import.meta.env.DEV&&new URLSearchParams(location.search).has('capture')});
    viewer.onFrame=time=>{if(state.playing&&!state.comparing)updateIntensity((1-Math.cos((time-playbackOrigin)/1800*Math.PI))/2);};
    viewer.onContextLost=()=>{state.loaded=false;setPlaying(false);$('expression-controls').disabled=true;$('gaze-controls').disabled=true;loading('The 3D view was interrupted','Reload the page to restore the graphics context.',true);};
  })();
  try{await initialization;}finally{initialization=null;}
}
async function loadSample(id){
  const version=++loadVersion;
  state.sample=id;state.loaded=false;setPlaying(false);state.comparing=false;
  $('expression-controls').disabled=true;
  $('gaze-controls').disabled=true;
  loading('Loading 3D face…','Preparing the sample and its blendshapes');
  document.querySelectorAll('[data-sample]').forEach(b=>{b.classList.toggle('active',b.dataset.sample===id);b.setAttribute('aria-pressed',String(b.dataset.sample===id));});
  $('sample-title').textContent=`SAMPLE ${id.slice(7)}`;
  try{
    await initialize();
    if(version!==loadVersion)return;
    const sample=manifest.find(s=>s.id===id);
    await viewer.load(`${base}models/${sample.file}`,progress=>{if(version===loadVersion)$('loading-detail').textContent=progress.total?`${Math.round(progress.loaded/progress.total*100)}% downloaded · ${Math.round(progress.total/1024/1024)} MB`:'Downloading textured mesh…';});
    if(version!==loadVersion)return;
    state.loaded=true;viewer.setMode(state.mode);populateControls();
    $('expression-controls').disabled=false;$('viewer-loading').hidden=true;
    const gazeOptions=GAZE_CONTROLS.filter(c=>sample.controls.includes(c.name));
    $('gaze-control').innerHTML=gazeOptions.map(c=>`<option value="${c.name}">${c.label}</option>`).join('');
    if(!gazeOptions.some(c=>c.name===state.gazeControl))state.gazeControl=gazeOptions[0]?.name;
    $('gaze-control').value=state.gazeControl;
    $('gaze-controls').disabled=!gazeOptions.length;
    updateGeometry();
    $('mesh-count').textContent=`${sample.vertices.toLocaleString()} source vertices · ${sample.triangles.toLocaleString()} triangles`;
    $('control-count').textContent=`${availableControls().length} facial controls`;
  }catch(error){
    if(version!==loadVersion)return;
    console.error(error);
    loading('Unable to load the 3D face',error.message.includes('WebGL')?'This viewer needs WebGL 2. Try a browser with hardware acceleration enabled.':'Check your connection, then try loading the sample again.',true);
    $('mesh-count').textContent='Sample unavailable';
  }
}
$('sample-strip').addEventListener('click',e=>{const button=e.target.closest('[data-sample]');if(button&&(!state.loaded||button.dataset.sample!==state.sample))loadSample(button.dataset.sample);});
$('retry-load').addEventListener('click',()=>{if(viewer?.contextLost){location.reload();return;}loadSample(state.sample);});
$('control-group').addEventListener('change',()=>{setPlaying(false);populateControls();});
$('action-unit').addEventListener('change',()=>{state.control=$('action-unit').value;setPlaying(false);$('control-description').textContent=CONTROLS.find(c=>c.name===state.control).description;updateGeometry();});
$('intensity').addEventListener('input',()=>{setPlaying(false);updateIntensity(Number($('intensity').value));});
$('gaze-control').addEventListener('change',()=>{state.gazeControl=$('gaze-control').value;updateGeometry();});
$('gaze-intensity').addEventListener('input',()=>updateGazeIntensity(Number($('gaze-intensity').value)));
$('reset-gaze').addEventListener('click',()=>updateGazeIntensity(0));
$('play').addEventListener('click',()=>setPlaying(!state.playing));
$('reset-expression').addEventListener('click',()=>{setPlaying(false);updateIntensity(0);});
$('reset-camera').addEventListener('click',()=>viewer?.resetCamera());
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  state.mode=button.dataset.mode;viewer?.setMode(state.mode);
  document.querySelectorAll('[data-mode]').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
}));
function compare(value){state.comparing=value;$('hold-neutral').setAttribute('aria-pressed',String(value));updateGeometry();}
const hold=$('hold-neutral');
hold.addEventListener('pointerdown',e=>{if(e.button!==0)return;hold.setPointerCapture(e.pointerId);compare(true);});
for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])hold.addEventListener(event,()=>compare(false));
hold.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();compare(true);}});
hold.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();compare(false);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){setPlaying(false);compare(false);}});
document.querySelectorAll('[data-hero-sample]').forEach((a,i)=>a.addEventListener('click',()=>{
  state.control=['jawOpen','mouthSmile_L','browInnerUp_R','noseSneer_L'][i];$('control-group').value='all';updateIntensity(.85);loadSample(a.dataset.heroSample);
}));
populateControls();updateIntensity(.65);
updateGazeIntensity(0);
// Download the large 3D asset only as the playground approaches the viewport.
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();if(!state.loaded&&!loadVersion)loadSample(state.sample);}},{rootMargin:'250px'});
observer.observe($('playground'));
if(import.meta.env.DEV){
  window.__toporig={getState:()=>({...state,...viewer?.getDiagnostics()}),loadSample,
    setExpression:(name,value)=>{state.control=name;$('control-group').value='all';populateControls();updateIntensity(value);},
    capture:()=>viewer.capture(),setCaptureSize:()=>{const el=$('viewport');el.style.width='600px';el.style.height='600px';viewer.resize();viewer.resetCamera();},
  };
  if(new URLSearchParams(location.search).has('capture'))loadSample(state.sample);
}
