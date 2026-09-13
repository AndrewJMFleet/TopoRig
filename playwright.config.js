import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',timeout:60000,fullyParallel:false,workers:1,
  use:{baseURL:'http://localhost:5173',channel:'chrome',viewport:{width:1440,height:1000},screenshot:'only-on-failure'},
  webServer:[
    {command:'npm run dev -- --port 5173',url:'http://localhost:5173',reuseExistingServer:true},
    {command:'python3 -m http.server 8000 --bind 127.0.0.1',url:'http://127.0.0.1:8000',reuseExistingServer:true},
  ],
});
