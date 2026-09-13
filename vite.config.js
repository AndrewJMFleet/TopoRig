import { defineConfig } from 'vite';
export default defineConfig({
  root:'src',
  publicDir:'../public',
  // Relative paths work on both username.github.io and username.github.io/repo/.
  base:'./',
  build:{
    outDir:'../dist',
    emptyOutDir:true,
    rollupOptions:{output:{manualChunks:{three:['three','three/addons/loaders/GLTFLoader.js','three/addons/controls/OrbitControls.js','three/addons/libs/meshopt_decoder.module.js']}}},
  },
});
