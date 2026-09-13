import {test,expect} from '@playwright/test';

test('plain Python server opens the build from the project root and preserves section links',async({page})=>{
  await page.goto('http://127.0.0.1:8000/?preview=1#playground');
  await expect(page).toHaveURL('http://127.0.0.1:8000/dist/?preview=1#playground');
  await expect(page.locator('h1')).toContainText('Topology-Agnostic Facial Rigging');
  await expect(page.locator('#action-unit')).toBeEnabled({timeout:30000});
  await expect(page.locator('#gaze-control')).toBeEnabled();
  expect(await page.evaluate(()=>window.__toporig)).toBeUndefined();
});

test('production assets and interactions work under a subdirectory without Vite',async({page,request})=>{
  const errors=[];const failures=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8000')&&r.status()>=400)failures.push(r.url());});
  await page.goto('http://127.0.0.1:8000/dist/');
  await page.locator('#playground').scrollIntoViewIfNeeded();
  await expect(page.locator('#action-unit')).toBeEnabled({timeout:30000});
  await expect(page.locator('#action-unit option')).toHaveCount(43);
  await expect(page.locator('#action-unit option[value^="eyeWide"]')).toHaveCount(0);
  await expect(page.locator('#gaze-control option')).toHaveCount(8);
  await page.locator('#intensity').fill('0');
  const before=await page.locator('#canvas-host canvas').screenshot();
  await page.locator('#intensity').fill('1');
  const after=await page.locator('#canvas-host canvas').screenshot();
  expect(before.equals(after)).toBe(false);
  await page.locator('#gaze-control').selectOption('eyeLookUp_R');
  await page.locator('#gaze-intensity').fill('0.5');
  await expect(page.locator('#gaze-value')).toHaveText('0.50');
  await expect(page.locator('#intensity-value')).toHaveText('1.00');
  await page.getByRole('button',{name:'Choose sample 00250'}).click();
  await expect(page.locator('#action-unit')).toBeEnabled({timeout:30000});
  await expect(page.locator('#sample-title')).toHaveText('SAMPLE 00250');
  for(const url of await page.locator('img').evaluateAll(imgs=>[...new Set(imgs.map(i=>i.src))]))expect((await request.get(url)).ok()).toBeTruthy();
  expect((await request.get('http://127.0.0.1:8000/dist/paper.pdf')).headers()['content-type']).toContain('application/pdf');
  expect(errors).toEqual([]);expect(failures).toEqual([]);
});
