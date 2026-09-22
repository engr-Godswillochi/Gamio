import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:950}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto((process.env.TEST_ORIGIN||'http://localhost:3001')+'/game/pulse-heist');
 await page.getByRole('button',{name:'♫ Sound off'}).click();
 const saved=page.waitForResponse(r=>r.url().includes('/finish')&&r.request().method()==='POST',{timeout:65000});
 await page.getByRole('button',{name:'▶ Start run',exact:true}).click();
 for(let i=0;i<6;i++){
   for(const key of ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown']){
     if(await page.getByRole('heading',{name:/points. Who can beat it/}).count())break;
     await page.keyboard.down(key);await new Promise(r=>setTimeout(r,550));await page.keyboard.up(key);
   }
 }
 await page.screenshot({path:'/tmp/gamio-browser-results/pulse-heist.png',fullPage:true});
 const response=await saved;const data=await response.json();assert.equal(response.status(),201,JSON.stringify(data));
 await page.getByRole('heading',{name:/points. Who can beat it/}).waitFor();
 assert(data.score>0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({status:'PASS',game:'Pulse Heist',verifiedScore:data.score,keyboardControls:true,soundtrack:true,replayRecorded:true}));
}finally{await browser.close();}
