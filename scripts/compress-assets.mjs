import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
await mkdir('public/models', {recursive:true});
const manifest = JSON.parse(await readFile('.asset-build/manifest.json', 'utf8'));
for (const sample of manifest) {
  const doc = await io.read(`.asset-build/${sample.file}`);
  await doc.transform(textureCompress({encoder:sharp, targetFormat:'webp', resize:[2048,2048]}), meshopt({encoder:MeshoptEncoder, level:'high'}));
  await io.write(`public/models/${sample.file}`, doc);
  console.log(`Prepared ${sample.file}`);
}
await writeFile('public/models/manifest.json', JSON.stringify(manifest, null, 2));
