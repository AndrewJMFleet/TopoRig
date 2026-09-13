import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('pageerror',error=>console.error(error));
  await page.goto('http://localhost:5173/?capture=1');
  await page.waitForFunction(()=>window.__toporig?.getState().loaded,{timeout:60000});
  await page.evaluate(()=>window.__toporig.setCaptureSize());
  const poses=[['sample_00033','jawOpen',.8],['sample_00041','mouthSmile_L',1],['sample_00049','browInnerUp_R',1],['sample_00250','noseSneer_L',1]];
  for(const [id,control,weight] of poses){
    await page.evaluate(id=>window.__toporig.loadSample(id),id);
    await page.waitForFunction(()=>window.__toporig.getState().loaded);
    await page.evaluate(([name,value])=>window.__toporig.setExpression(name,value),[control,weight]);
    const data=await page.evaluate(()=>window.__toporig.capture());
    const png=Buffer.from(data.split(',')[1],'base64');
    await sharp(png).resize(600,600).webp({quality:92}).toFile(`public/assets/${id}.webp`);
    if(id==='sample_00033')await writeFile('/tmp/toporig-head.png',png);
    console.log(id,await page.evaluate(()=>window.__toporig.getState()));
  }
}finally{await browser.close();}
