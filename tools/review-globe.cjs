const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const origin=process.env.ORIGIN||'http://127.0.0.1:8080';
(async()=>{
 // Chrome includes the H.264 codec required by the exported MP4s.
 const browser=await chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:960},colorScheme:'light',reducedMotion:'reduce'});
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()}: ${response.url()}`);});
 fs.mkdirSync('capture/globe',{recursive:true});
 const map=page.locator('#map');
 const scale=async()=>Number(await map.getAttribute('data-scale'));
 const lon=async()=>Number(await map.getAttribute('data-lon'));
 const brightness=()=>page.evaluate(()=>{const c=document.getElementById('map'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=4)s+=d[i]+d[i+1]+d[i+2];return s/(d.length/4)/3;});
 const settle=()=>page.waitForTimeout(250);
 try{
  await page.goto(`${origin}/`,{waitUntil:'networkidle'});
  await page.waitForSelector('#map[data-ready="true"]');await settle();
  await page.screenshot({path:'capture/globe/world.png'});
  console.log('Map renderer ready');
  assert.equal(await page.locator('.city-button').count(),8);
  assert.equal(await page.locator('#zoom-out').isDisabled(),true,'world view is the widest');
  const world=await scale();

  // Grouped markers zoom in until the Silesian cities separate
  for(let i=0;i<8&&!(await page.locator('.pin[data-cities="gliwice"]').count());i++){
   const before=await scale();
   await page.locator('.pin.cluster').first().click();await settle();
   assert.ok(await scale()>before,'cluster click zooms in');
  }
  assert.equal(await page.locator('.pin[data-cities="gliwice"]').count(),1,'Gliwice separates from its neighbours');
  await page.screenshot({path:'capture/globe/clusters-opened.png'});
  await page.locator('.pin[data-cities="gliwice"]').click();
  assert.equal(await page.locator('#city-name .sr-only').textContent(),'Gliwice');

  const cities=JSON.parse(fs.readFileSync('cities.json'));
  for(const city of cities){
   console.log('Selecting',city.id);
   await page.locator(`[data-city="${city.id}"]`).click();await settle();
   await page.waitForFunction(id=>document.querySelector(`${id}-switch`).gl,city.id);
   assert.equal(await page.locator('#city-name .sr-only').textContent(),city.name);
   assert.ok(Math.abs(await lon()-city.longitude)<0.01,`map centres on ${city.id}`);
   assert.equal(await page.locator(`.pin[data-cities="${city.id}"].current`).count(),1,`${city.id} marker stands alone and is current`);
   assert.ok((await page.locator('#mp4-link').getAttribute('href')).endsWith(`/${city.id}-day-night-60fps.mp4`));
   const control=page.getByRole('switch');
   await control.press('End');await page.waitForFunction(id=>document.querySelector(`${id}-switch`).checked,city.id);
   assert.equal(await control.getAttribute('aria-checked'),'true');
   await control.press('Home');await page.waitForFunction(id=>document.querySelector(`${id}-switch`).position===0,city.id);
  }

  // The map follows the selected switch into night
  await page.locator('[data-city="zabrze"]').click();await page.waitForTimeout(600);
  const day=await brightness();
  await page.getByRole('switch').press('End');await page.waitForTimeout(900);
  const night=await brightness();
  assert.ok(night<day*0.6,`map darkens at night (${day.toFixed(0)} → ${night.toFixed(0)})`);
  await page.screenshot({path:'capture/globe/night.png'});
  await page.getByRole('switch').press('Home');await page.waitForTimeout(900);

  await page.locator('[data-city="gliwice"]').click();
  // The lens travels even under reduced motion, so wait for it to arrive
  await page.getByRole('switch').press('End');await page.waitForFunction(()=>document.querySelector('gliwice-switch').checked);
  await page.locator('[data-city="zabrze"]').click();
  await page.locator('[data-city="gliwice"]').click();
  assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'true');
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#map[data-ready="true"]');
  assert.equal(await page.locator('#city-name .sr-only').textContent(),'Gliwice');
  assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'true');

  // Keyboard, drag, wheel and buttons
  await page.locator('[data-city="zabrze"]').click();await settle();
  let before=await lon();
  await map.focus();await page.keyboard.press('ArrowLeft');await settle();
  assert.notEqual(await lon(),before,'arrow keys pan');
  before=await scale();await page.keyboard.press('+');await settle();
  assert.ok(await scale()>before,'plus zooms in');
  const box=await map.boundingBox();
  before=await lon();
  await page.mouse.move(box.x+200,box.y+200);await page.mouse.down();await page.mouse.move(box.x+320,box.y+260,{steps:6});await page.mouse.up();await settle();
  assert.notEqual(await lon(),before,'drag pans');
  before=await scale();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,400);await settle();
  assert.ok(await scale()<before,'wheel zooms out');
  before=await scale();await page.mouse.wheel(0,-200);await settle();
  assert.ok(await scale()>before,'wheel zooms in');
  await page.locator('#show-world').click();await settle();
  assert.equal(await scale(),world,'World button shows the whole map');
  await page.locator('#zoom-in').click();await settle();
  assert.ok(await scale()>world);
  await page.locator('#show-city').click();await settle();
  assert.ok(Math.abs(await lon()-18.78576)<0.01,'City button returns to the selection');

  for(const [name,width,height] of [['desktop',1280,960],['tablet',820,1000],['phone',390,844],['narrow',320,680]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(300);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);
   const listFits=await page.locator('.city-button').evaluateAll(buttons=>buttons.every(button=>{const parent=button.getBoundingClientRect();return [...button.children].every(child=>{const box=child.getBoundingClientRect();return box.left>=parent.left&&box.right<=parent.right+1;});}));
   assert.ok(listFits,`city labels overlap at ${width}px`);
   const huds=await page.locator('.hud:visible').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect()).map(r=>({l:r.left,r:r.right,t:r.top,b:r.bottom})));
   for(let i=0;i<huds.length;i++)for(let j=i+1;j<huds.length;j++){const a=huds[i],b=huds[j];assert.ok(a.r<=b.l||b.r<=a.l||a.b<=b.t||b.b<=a.t,`map controls overlap at ${width}px`);}
   const pins=await page.locator('.pin').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};}));
   for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++)assert.ok(Math.hypot(pins[i].x-pins[j].x,pins[i].y-pins[j].y)>18,'overlapping pins');
   await page.screenshot({path:`capture/globe/${name}-map.png`});
   await page.locator('#switch-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
   await page.screenshot({path:`capture/globe/${name}.png`,fullPage:true});
   const stage=await page.locator('#switch-stage').boundingBox();
   const control=await page.getByRole('switch').boundingBox();
   assert.ok(control.x>=stage.x&&control.x+control.width<=stage.x+stage.width+1,'clipped switch');
   await page.evaluate(()=>scrollTo(0,0));
  }
  await page.setViewportSize({width:1280,height:960});
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-city="lisbon"]').click();await page.waitForTimeout(2200);
  assert.ok(Math.abs(await lon()+9.1498)<0.01,'animated flight lands on Lisbon');
  assert.equal(await page.locator('#city-name .sr-only').textContent(),'Lisbon');
  await page.goto(`${origin}/videos.html`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('video').count(),8);
  assert.ok(await page.locator('video').first().evaluate(video=>video.canPlayType('video/mp4; codecs="avc1.640020"')),'browser needs H.264 support');
  for(let index=0;index<cities.length;index++){
   console.log('Playing',cities[index].id);
   const video=page.locator('video').nth(index);await video.scrollIntoViewIfNeeded();
   await video.evaluate(video=>{video.muted=true;video.play().catch(error=>{video.dataset.playError=error.message;});});
   await page.waitForFunction(index=>document.querySelectorAll('video')[index].currentTime>0,index);
   await video.evaluate(video=>video.pause());
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('capture/globe/checks.json',JSON.stringify({cities:8,map:true,clusterZoom:true,keyboard:true,drag:true,wheel:true,buttons:true,nightMap:{day,night},persistence:true,reducedMotion:true,videoPlayback:true,widths:[1280,820,390,320],errors},null,2));
  console.log('Map review passed');
 }catch(error){await page.screenshot({path:'capture/globe/failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync('capture/globe/failure.json',JSON.stringify({message:error.message,errors},null,2));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
