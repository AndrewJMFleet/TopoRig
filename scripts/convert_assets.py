"""Convert original FBX samples without simplifying geometry or removing controls.
Run with Blender 4.2+: blender -b -noaudio --python scripts/convert_assets.py
"""
import bpy
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.asset-build'
OUT.mkdir(exist_ok=True)
manifest = []
for source in sorted((ROOT / 'samples').glob('*.fbx')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    # The provided captures use image-style coordinates (X left, Y down, Z
    # forward). Rotate their common parent, preserving head/eye alignment.
    root = bpy.data.objects.new('TopoRig_CoordinateSystem', None)
    bpy.context.scene.collection.objects.link(root)
    for obj in meshes:
        if obj.parent is None:
            obj.parent = root
    root.rotation_euler = (math.pi / 2, math.pi, 0)
    controls = []
    for obj in meshes:
        # Keep the FBX scene transforms, including eye placement. Blender's
        # exporter converts the entire Z-up scene into glTF's Y-up convention.
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks[1:]:
                key.value = 0
                if key.name not in controls:
                    controls.append(key.name)
        for mat in obj.data.materials:
            if mat and mat.use_nodes:
                for node in mat.node_tree.nodes:
                    if node.type == 'BSDF_PRINCIPLED':
                        node.inputs['Metallic'].default_value = 0
                        node.inputs['Roughness'].default_value = 0.85
                        node.inputs['Emission Strength'].default_value = 0
                        for link in list(node.inputs['Alpha'].links):
                            mat.node_tree.links.remove(link)
                        node.inputs['Alpha'].default_value = 1
                mat.blend_method = 'OPAQUE'
    bpy.ops.export_scene.gltf(filepath=str(OUT / (source.stem + '.glb')),
        export_format='GLB', export_animations=False, export_morph=True,
        export_morph_normal=False, export_morph_tangent=False,
        export_image_format='JPEG', export_jpeg_quality=90, export_yup=True)
    manifest.append({'id': source.stem, 'file': source.stem + '.glb',
        'vertices': sum(len(o.data.vertices) for o in meshes),
        'triangles': sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),
        'controls': controls})
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2))
