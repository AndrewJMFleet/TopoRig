import { test, expect } from '@playwright/test';

async function openPlayground(page){
  await page.goto('/');
  await page.locator('#playground').scrollIntoViewIfNeeded();
  await expect(page.locator('#action-unit')).toBeEnabled({timeout:30000});
  await page.waitForFunction(()=>window.__toporig.getState().renderedTriangles>0);
}
const state=page=>page.evaluate(()=>window.__toporig.getState());
async function intensity(page,value){await page.locator('#intensity').fill(String(value));}

test('real geometry interpolates, resets, compares, animates, and retains topology',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await openPlayground(page);
  await expect(page.locator('#action-unit option')).toHaveCount(43);
  await intensity(page,1);
  const full=await state(page);
  expect(full.changedVertices).toBeGreaterThan(1000);
  expect(full.maxDisplacement).toBeGreaterThan(.01);
  await intensity(page,.5);
  const half=await state(page);
  expect(half.maxDisplacement/full.maxDisplacement).toBeCloseTo(.5,4);
  expect(half.renderedTriangles).toBe(full.renderedTriangles);
  await page.locator('#hold-neutral').focus();
  await page.keyboard.down('Space');
  expect((await state(page)).changedVertices).toBe(0);
  await page.keyboard.up('Space');
  expect((await state(page)).activeWeight).toBe(.5);
  await page.locator('#reset-expression').click();
  expect((await state(page)).changedVertices).toBe(0);
  await page.locator('#intensity').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('#intensity-value')).toHaveText('0.01');
  await page.locator('#play').click();
  await expect.poll(async()=> (await state(page)).activeWeight).toBeGreaterThan(.1);
  await page.locator('#play').click();expect((await state(page)).playing).toBe(false);
  await page.getByRole('button',{name:'Clay',exact:true}).click();
  expect((await state(page)).mode).toBe('clay');
  await page.getByRole('button',{name:'Wireframe',exact:true}).click();
  expect((await state(page)).mode).toBe('wireframe');
  await page.getByRole('button',{name:'Texture',exact:true}).click();
  expect(errors).toEqual([]);
});

test('all four samples expose working facial and gaze controls',async({page})=>{
  await openPlayground(page);
  for(const id of ['00033','00041','00049','00250']){
    await page.getByRole('button',{name:`Choose sample ${id}`}).click();
    await expect(page.locator('#action-unit')).toBeEnabled({timeout:30000});
    expect((await state(page)).sample).toBe(`sample_${id}`);
    await page.locator('#control-group').selectOption('mouth');
    await page.locator('#action-unit').selectOption('mouthSmile_L');
    await intensity(page,1);
    expect((await state(page)).changedVertices).toBeGreaterThan(100);
    await page.locator('#control-group').selectOption('all');
    await expect(page.locator('#action-unit option')).toHaveCount(43);
    await expect(page.locator('#action-unit option[value^="eyeWide"]')).toHaveCount(0);
    await expect(page.locator('#action-unit option[value^="eyeLook"]')).toHaveCount(0);
    await expect(page.locator('#gaze-control option')).toHaveCount(8);
    expect(await page.locator('#gaze-control').textContent()).not.toMatch(/AU\d/);
    const faceOnly=await state(page);
    await page.locator('#gaze-control').selectOption('eyeLookDown_L');
    await page.locator('#gaze-intensity').fill('1');
    const combined=await state(page);
    expect(combined.changedVertices).toBeGreaterThan(faceOnly.changedVertices);
    expect(combined.activeControl).toBe('mouthSmile_L');
    expect(combined.gazeControl).toBe('eyeLookDown_L');
    await page.locator('#intensity').fill('0.5');
    expect((await state(page)).gazeIntensity).toBe(1);
    await page.locator('#reset-gaze').click();
    expect((await state(page)).gazeIntensity).toBe(0);
    expect((await state(page)).activeWeight).toBe(.5);
  }
});

test('rapid character changes keep the final selection and geometry in sync',async({page})=>{
  await openPlayground(page);
  await page.route('**/models/sample_00041.glb',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue();});
  await page.getByRole('button',{name:'Choose sample 00041'}).click();
  await page.getByRole('button',{name:'Choose sample 00250'}).click();
  await expect(page.locator('#action-unit')).toBeEnabled({timeout:30000});
  await expect(page.locator('#sample-title')).toHaveText('SAMPLE 00250');
  expect((await state(page)).sample).toBe('sample_00250');
  expect((await state(page)).meshCount).toBe(3);
});

test('asset load failure has a working retry',async({page})=>{
  await page.route('**/models/sample_00033.glb',route=>route.abort(),{times:1});
  await page.goto('/');await page.locator('#playground').scrollIntoViewIfNeeded();
  await expect(page.getByText('Unable to load the 3D face')).toBeVisible();
  await expect(page.locator('#action-unit')).toBeDisabled();
  await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.locator('#action-unit')).toBeEnabled({timeout:30000});
});

test('mobile layout fits, assets resolve, and paper download is available',async({page,request})=>{
  await page.setViewportSize({width:390,height:844});
  await openPlayground(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#control-group').selectOption('eye');
  await page.locator('#action-unit').selectOption('eyeBlink_L');
  await intensity(page,1);
  expect((await state(page)).changedVertices).toBeGreaterThan(100);
  for(const src of await page.locator('img').evaluateAll(imgs=>[...new Set(imgs.map(i=>i.src))])){
    expect((await request.get(src)).ok()).toBeTruthy();
  }
  const pdf=await request.get('/paper.pdf');expect(pdf.ok()).toBeTruthy();expect(pdf.headers()['content-type']).toContain('application/pdf');
});
