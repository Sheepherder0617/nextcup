// Phone demo: 390x844 viewport, touch-style tap ripples, screencast at 2x.
const { chromium } = require('playwright'); const fs = require('fs'); const serve = require('./server.cjs'); const seed = require('./seed.cjs');
const W = 390, H = 844, DPR = 2, PORT = 4196;
const FONT_CSS = `
@font-face{font-family:"Newsreader";font-style:normal;font-weight:400 700;src:url(http://localhost:${PORT}/fonts/nc-newsreader.woff2) format("woff2")}
@font-face{font-family:"Newsreader";font-style:italic;font-weight:400 700;src:url(http://localhost:${PORT}/fonts/nc-newsreader-italic.woff2) format("woff2")}
@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:400 800;src:url(http://localhost:${PORT}/fonts/nc-jakarta.woff2) format("woff2")}
@font-face{font-family:"Material Symbols Outlined";font-style:normal;font-weight:400;font-display:block;src:url(http://localhost:${PORT}/fonts/nc-symbols.woff2) format("woff2")}`;
const TAP = `(() => { const css = document.createElement('style'); css.textContent = '@keyframes nc-tap{0%{transform:translate(-50%,-50%) scale(.4);opacity:.55}100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}.nc-tap{position:fixed;z-index:99999;width:44px;height:44px;border-radius:50%;background:rgba(125,86,50,.35);border:2px solid rgba(46,26,12,.45);pointer-events:none;animation:nc-tap .55s ease-out forwards}';
  addEventListener('DOMContentLoaded', () => document.head.appendChild(css));
  addEventListener('pointerdown', (e) => { const d = document.createElement('div'); d.className = 'nc-tap'; d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; document.body.appendChild(d); setTimeout(() => d.remove(), 700); }, true); })()`;
(async () => {
  const srv = serve(__dirname + '/site', PORT); const b = await chromium.launch({ args: [`--force-device-scale-factor=${DPR}`] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: FONT_CSS }));
  await ctx.addInitScript((data) => { if (!localStorage.getItem('nextcup:v1')) localStorage.setItem('nextcup:v1', JSON.stringify(data)); }, seed());
  await ctx.addInitScript(TAP);
  const pg = await ctx.newPage(); const t0 = Date.now(); const marks = {}; const mark = (n) => (marks[n] = (Date.now() - t0) / 1000);
  const events = []; const sfx = (type) => events.push({ type, epoch: Date.now() / 1000 });
  const frames = []; fs.rmSync(__dirname + '/frames', { recursive: true, force: true }); fs.mkdirSync(__dirname + '/frames');
  const cdp = await ctx.newCDPSession(pg);
  cdp.on('Page.screencastFrame', (f) => { const n = frames.length; fs.promises.writeFile(`${__dirname}/frames/${String(n).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64')); frames.push(f.metadata.timestamp); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  const wait = (ms) => pg.waitForTimeout(ms);
  async function tap(loc, pause = 600) { await loc.scrollIntoViewIfNeeded(); await wait(250); const bb = await loc.boundingBox(); sfx('click'); await pg.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await wait(pause); }
  async function scrollTo(y, ms = 900) { await pg.evaluate(([y]) => window.scrollTo({ top: y, behavior: 'smooth' }), [y]); await wait(ms); }
  async function scrollToEl(loc, offset = 90, ms = 900) { const y = await loc.evaluate((e, o) => e.getBoundingClientRect().top + scrollY - o, offset); await scrollTo(y, ms); }

  await pg.goto(`http://localhost:${PORT}/#contacts`); await pg.evaluate(() => document.fonts.ready); await wait(300);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W * DPR, maxHeight: H * DPR, everyNthFrame: 1 });
  mark('start'); await wait(1500);
  // 1. Open Marcus, see log
  await tap(pg.getByRole('button', { name: /Marcus Lee/ }).first(), 1200);
  await scrollTo(260, 900);
  await tap(pg.getByRole('button', { name: 'Log History' }), 700);
  await scrollToEl(pg.getByRole('heading', { name: /Log History/ }), 80, 1500); await wait(800);
  // 2. AI follow-up ideas
  mark('ideas');
  await scrollTo(260, 700);
  await tap(pg.getByRole('button', { name: 'Follow-up Ideas' }), 600);
  await tap(pg.getByRole('button', { name: /Generate ideas/ }), 200); await pg.getByText('Ask how demo day went').waitFor(); sfx('chime'); await wait(700);
  await scrollToEl(pg.getByText('Ask how demo day went'), 230, 1300); await wait(1200);
  await scrollToEl(pg.getByText('Offer something back'), 300, 1300); await wait(900);
  // 3. Calendar via bottom tab
  mark('calendar');
  await tap(pg.getByRole('navigation', { name: 'Tabs' }).getByRole('link', { name: 'Calendar' }), 1300);
  await scrollTo(380, 1500); await wait(700);
  // 4. Log Ryan's chat with AI tidy
  mark('debrief');
  await tap(pg.getByRole('button', { name: /Log a Chat/ }).first(), 900);
  const ta = pg.locator('#log-raw'); await ta.scrollIntoViewIfNeeded(); await tap(ta, 300);
  const raw = 'ryan - 6 ppl on ML team. analysts move in via model monitoring. sql + eval skills > fancy models. learn pytorch basics. spring ML intern posting soon';
  sfx('typestart'); await ta.pressSequentially(raw, { delay: 22 }); sfx('typeend'); await wait(400);
  await tap(pg.getByRole('button', { name: /Tidy into a debrief/ }), 200); await pg.waitForFunction(() => document.querySelector('#log-raw')?.value.startsWith('•')); sfx('chime'); await wait(2400);
  await tap(pg.getByRole('button', { name: /Save debrief/ }), 1600);
  mark('end'); await wait(400); await cdp.send('Page.stopScreencast'); frames.push(Date.now() / 1000);
  fs.writeFileSync(__dirname + '/events.json', JSON.stringify({ marks, events, frames }, null, 1));
  console.log(JSON.stringify(marks), 'frames', frames.length, 'errors', errs);
  await ctx.close(); await b.close(); srv.close();
})();
