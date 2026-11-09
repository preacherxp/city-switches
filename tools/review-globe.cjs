const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 // Chrome includes the H.264 codec required by the exported MP4s.
 const browser=await chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:960},colorScheme:'light',reducedMotion:'reduce'});
 page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()}: ${response.url()}`);});
 fs.mkdirSync('capture/globe',{recursive:true});
 try{
  await page.goto('http://127.0.0.1:8080/#zabrze',{waitUntil:'networkidle'});
  await page.waitForSelector('#earth[data-ready="true"]');
  await page.screenshot({path:'capture/globe/initial.png',fullPage:true});
  console.log('Globe renderer ready');
  assert.equal(await page.locator('.city-button').count(),8);
  const grouped=page.locator('.pin:not(.single)').first();
  await grouped.click();
  assert.ok(await page.locator('#cluster-menu button').count()>1);
  await page.locator('#cluster-menu button').first().click();
  assert.equal(await page.locator('#cluster-menu').isVisible(),false);
  const cities=JSON.parse(fs.readFileSync('cities.json'));
  for(const city of cities){
   console.log('Selecting',city.id);
   await page.locator(`[data-city="${city.id}"]`).click();
   await page.waitForFunction(id=>document.querySelector(`${id}-switch`).gl,city.id);
   assert.equal(await page.locator('#city-name').textContent(),city.name);
   assert.ok((await page.locator('#mp4-link').getAttribute('href')).endsWith(`/${city.id}-day-night-60fps.mp4`));
   const control=page.getByRole('switch');
   await control.press('End');await page.waitForFunction(id=>document.querySelector(`${id}-switch`).checked,city.id);
   assert.equal(await control.getAttribute('aria-checked'),'true');
   await control.press('Home');await page.waitForFunction(id=>document.querySelector(`${id}-switch`).position===0,city.id);
  }
  await page.locator('[data-city="gliwice"]').click();
  await page.getByRole('switch').press('End');
  await page.locator('[data-city="zabrze"]').click();
  await page.locator('[data-city="gliwice"]').click();
  assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'true');
  await page.reload({waitUntil:'networkidle'});await page.waitForSelector('#earth[data-ready="true"]');
  assert.equal(await page.locator('#city-name').textContent(),'Gliwice');
  assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'true');
  await page.locator('[data-city="zabrze"]').click();
  const oldYaw=await page.locator('#earth').getAttribute('data-yaw');
  await page.locator('#earth').focus();await page.keyboard.press('ArrowLeft');
  assert.notEqual(await page.locator('#earth').getAttribute('data-yaw'),oldYaw);
  const globe=await page.locator('#earth').boundingBox();
  const beforeDrag=await page.locator('#earth').getAttribute('data-yaw');
  await page.mouse.move(globe.x+40,globe.y+40);await page.mouse.down();await page.mouse.move(globe.x+100,globe.y+75,{steps:5});await page.mouse.up();
  assert.notEqual(await page.locator('#earth').getAttribute('data-yaw'),beforeDrag);
  await page.locator('#zoom-in').click();assert.equal(await page.locator('#earth').getAttribute('data-zoom'),'1.25');
  await page.locator('#reset-view').click();assert.equal(await page.locator('#earth').getAttribute('data-zoom'),'1');
  for(const [name,width,height] of [['desktop',1280,960],['tablet',820,1000],['phone',390,844],['narrow',320,680]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(250);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow at ${width}`);
   const pins=await page.locator('.pin').evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
   for(let i=0;i<pins.length;i++)for(let j=i+1;j<pins.length;j++)assert.ok(Math.hypot(pins[i].x-pins[j].x,pins[i].y-pins[j].y)>25,'overlapping pins');
   await page.locator('#switch-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
   await page.screenshot({path:`capture/globe/${name}.png`,fullPage:true});
   const stage=await page.locator('#switch-stage').boundingBox();
   const control=await page.getByRole('switch').boundingBox();
   assert.ok(control.x>=stage.x&&control.x+control.width<=stage.x+stage.width+1,'clipped switch');
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-city="lisbon"]').click();await page.waitForTimeout(650);
  assert.ok(Math.abs(Number(await page.locator('#earth').getAttribute('data-yaw'))-9.1498*Math.PI/180)<.001);
  assert.equal(await page.locator('#city-name').textContent(),'Lisbon');
  await page.goto('http://127.0.0.1:8080/videos.html',{waitUntil:'networkidle'});
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
  fs.writeFileSync('capture/globe/checks.json',JSON.stringify({cities:8,webgl:true,clusterSelection:true,keyboard:true,drag:true,zoom:true,persistence:true,reducedMotion:true,videoPlayback:true,widths:[1280,820,390,320],errors},null,2));
 }catch(error){await page.screenshot({path:'capture/globe/failure.png',fullPage:true}).catch(()=>{});fs.writeFileSync('capture/globe/failure.json',JSON.stringify({message:error.message,errors,media:await page.locator('video').evaluateAll(videos=>videos.map(v=>({src:v.currentSrc,readyState:v.readyState,networkState:v.networkState,error:v.error?.message,playError:v.dataset.playError,time:v.currentTime})))},null,2));throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
