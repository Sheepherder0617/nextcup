// node record.cjs stills|video  — captures NextCup demo with fictional data and a mocked AI.
const { chromium } = require('playwright'); const fs = require('fs'); const serve = require('./server.cjs'); const seed = require('./seed.cjs');
const MODE = process.argv[2] || 'stills';
const W = 1280, H = 800;
const FONT_CSS = fs.existsSync(__dirname + '/site/fonts/nc-jakarta.woff2') ? `
@font-face{font-family:"Newsreader";font-style:normal;font-weight:400 700;src:url(http://localhost:4181/fonts/nc-newsreader.woff2) format("woff2")}
@font-face{font-family:"Newsreader";font-style:italic;font-weight:400 700;src:url(http://localhost:4181/fonts/nc-newsreader-italic.woff2) format("woff2")}
@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:400 800;src:url(http://localhost:4181/fonts/nc-jakarta.woff2) format("woff2")}
@font-face{font-family:"Material Symbols Outlined";font-style:normal;font-weight:400;font-display:block;src:url(http://localhost:4181/fonts/nc-symbols.woff2) format("woff2")}` : '';
const CURSOR = `(() => { const c = document.createElement('div'); c.id='fake-cursor';
  c.style.cssText='position:fixed;z-index:99999;left:0;top:0;width:22px;height:22px;border-radius:50%;background:rgba(46,26,12,.18);border:2px solid rgba(46,26,12,.75);pointer-events:none;transform:translate(-50%,-50%);transition:transform .12s, background .12s;';
  const add=()=>document.body&&!document.getElementById('fake-cursor')&&document.body.appendChild(c); addEventListener('DOMContentLoaded',()=>{add(); new MutationObserver(add).observe(document.body,{childList:true});});
  addEventListener('mousemove',e=>{c.style.left=e.clientX+'px';c.style.top=e.clientY+'px'},true);
  addEventListener('mousedown',()=>{c.style.transform='translate(-50%,-50%) scale(.7)';c.style.background='rgba(153,110,72,.45)'},true);
  addEventListener('mouseup',()=>{c.style.transform='translate(-50%,-50%)';c.style.background='rgba(46,26,12,.18)'},true); })()`;
(async () => {
  const srv = serve(__dirname + '/site', 4181); const b = await chromium.launch(MODE === 'video' ? { args: ['--force-device-scale-factor=1.5'] } : {});
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: MODE === 'video' ? 1.5 : 2 });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: FONT_CSS }));
  await ctx.addInitScript((data) => { if (!localStorage.getItem('nextcup:v1')) localStorage.setItem('nextcup:v1', JSON.stringify(data)); }, seed());
  if (MODE === 'video') await ctx.addInitScript(CURSOR);
  const pg = await ctx.newPage(); const t0 = Date.now(); const marks = {}; const mark = (n) => (marks[n] = (Date.now() - t0) / 1000); const events = []; const sfx = (type) => events.push({ type, t: (Date.now() - t0) / 1000, epoch: Date.now() / 1000 });
  const frames = [];
  if (MODE === 'video') {
    fs.rmSync(__dirname + '/frames', { recursive: true, force: true }); fs.mkdirSync(__dirname + '/frames');
    const cdp = await ctx.newCDPSession(pg);
    cdp.on('Page.screencastFrame', async (f) => { const n = frames.length; fs.promises.writeFile(`${__dirname}/frames/${String(n).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64')); frames.push(f.metadata.timestamp); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: W * 1.5, maxHeight: H * 1.5, everyNthFrame: 1 });
    pg.__cdp = cdp;
  } const errs = []; pg.on('pageerror', e => errs.push(e.message));
  let mx = W / 2, my = H / 2;
  const wait = (ms) => pg.waitForTimeout(MODE === 'video' ? ms : Math.min(ms, 400));
  async function moveTo(loc) { await loc.scrollIntoViewIfNeeded(); const bb = await loc.boundingBox(); const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2; await pg.mouse.move(x, y, { steps: MODE === 'video' ? 25 : 1 }); mx = x; my = y; }
  async function click(loc, pause = 500) { await moveTo(loc); await wait(250); sfx('click'); await pg.mouse.down(); await pg.mouse.up(); await wait(pause); }
  async function smoothScroll(y, ms = 900) { await pg.evaluate(([y]) => window.scrollTo({ top: y, behavior: 'smooth' }), [y]); await wait(ms); }
  const shot = (n) => MODE === 'stills' && pg.screenshot({ path: `${__dirname}/shots/${n}.png` });
  fs.mkdirSync(__dirname + '/shots', { recursive: true });

  // 1. Contacts list
  await pg.goto('http://localhost:4181/#contacts'); await pg.evaluate(() => document.fonts.ready); mark('start'); await wait(1600); await shot('contacts');
  // 2. Open Marcus → meeting history / log
  await click(pg.getByRole('button', { name: /Open Profile/ }).nth(4), 1200);
  await shot('contact');
  await click(pg.getByText('Log History', { exact: true }).first(), 900);
  await smoothScroll(560, 1600); await shot('log');
  // 3. Follow-up ideas
  mark('ideas');
  await smoothScroll(300, 700);
  await click(pg.getByText('Follow-up Ideas', { exact: true }).first(), 700);
  await smoothScroll(560, 900);
  await click(pg.getByRole('button', { name: /Generate ideas/ }), 300); await pg.getByText('Ask how demo day went').waitFor(); sfx('chime'); await wait(900);
  await smoothScroll(620, 1800); await shot('followup'); await wait(1500);
  // 4. Calendar
  mark('calendar');
  await pg.evaluate(() => window.scrollTo({ top: 0 })); await wait(300);
  await click(pg.getByRole('link', { name: 'Calendar' }).first(), 1600); await shot('calendar'); await smoothScroll(260, 2000); await smoothScroll(0, 1400);
  // 5. Log Ryan's chat with AI debrief
  mark('debrief');
  await smoothScroll(420, 900);
  await click(pg.getByRole('button', { name: /Log a Chat/ }).first(), 900);
  const ta = pg.locator('#log-raw'); await moveTo(ta); await ta.click();
  const raw = 'ryan - 6 ppl on ML team, analysts move in via model monitoring. sql + eval skills > fancy models. learn pytorch basics. privacy training for clinical data. spring ML intern posting soon, he will flag it';
  if (MODE === 'video') { sfx('typestart'); await ta.pressSequentially(raw, { delay: 18 }); sfx('typeend'); } else await ta.fill(raw);
  await wait(500);
  await click(pg.getByRole('button', { name: /Tidy into a debrief/ }), 300); await pg.waitForFunction(() => document.querySelector('#log-raw')?.value.startsWith('•')); sfx('chime'); await wait(1200);
  await shot('debrief'); await wait(2500);
  await click(pg.getByRole('button', { name: /Save debrief/ }), 1500);
  mark('end'); console.log(JSON.stringify(marks)); if (pg.__cdp) { await wait(600); await pg.__cdp.send('Page.stopScreencast'); frames.push(Date.now() / 1000); }
  fs.writeFileSync(__dirname + '/events.json', JSON.stringify({ marks, events, frames }, null, 1)); console.log('errors', errs);
  await ctx.close(); await b.close(); srv.close();
})();
