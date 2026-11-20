/*
  Smoke test for /jobs/ : run before shipping any change to jobs/index.html.

    node tests/jobs-smoke.js

  It serves the repo itself, opens /jobs/?demo (example data, no database) in headless
  Chromium at laptop and phone sizes, and walks every tab and the main actions.
  Exit code 0 means everything passed. Needs the `playwright` package.

  Changelog
  v1.0 (20/11/2026): First version. Tabs, Notebook formatting, job read/edit, add job,
          Examples read/edit, reading panel, delete confirmation, stickers by mouse and touch.
*/
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium, devices } = require("playwright");
const ROOT = path.join(__dirname, "..");
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".json":"application/json", ".png":"image/png", ".webmanifest":"application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if(p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if(!f.startsWith(ROOT) || !fs.existsSync(f)){ res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type":TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});

const fails = [];
const check = (name, ok, extra) => { if(!ok) fails.push(name + (extra ? " (" + extra + ")" : "")); };
const LONG = Array.from({ length:40 }, (_, i) => "Paragraph " + (i + 1) + ". You will lead the front of house team and manage rotas and budgets.").join("\n\n");

async function common(p, tag){
  const URL = p.__base + "/jobs/?demo";
  await p.goto(URL); await p.waitForTimeout(600);
  // every tab opens
  const marks = { week:"h2:has-text('This week')", jobs:"table.jobs", evidence:"h2:has-text('Examples')", notebook:"h2:has-text('Notebook')", settings:"h2:has-text('Settings')" };
  for(const v of Object.keys(marks)){ await p.click("#nav-" + v); await p.waitForTimeout(350); check(tag + " tab " + v, await p.locator(marks[v] + ":visible").count() > 0); }
  // every page-building function exists
  const missing = await p.evaluate(() => ["homeHtml","weekHtml","jobsHtml","roleHtml","evidenceHtml","notebookHtml","settingsHtml","stickersHtml","stickerDlg","cleanHtml","saveRich","parseReply","buildPrompt","advertSheet","researchSheet","starDlg","helpDlg"].filter(f => typeof window[f] !== "function"));
  check(tag + " functions", missing.length === 0, missing.join(","));
  // notebook formatting saves
  await p.click("#nav-notebook"); await p.waitForTimeout(300);
  await p.locator(".rich").first().click(); await p.keyboard.type("Hello"); await p.keyboard.press("Control+A"); await p.click("[data-fmt='bold'] >> nth=0"); await p.waitForTimeout(600);
  check(tag + " note saved bold", /<b>Hello<\/b>/.test(await p.evaluate(() => Object.values(D.notebook).map(n => n.body).join("|"))));
  // deleting asks first
  const notes = await p.locator(".page").count();
  await p.click("[data-act='del-page'] >> nth=0"); await p.waitForTimeout(200);
  check(tag + " delete asks", await p.locator("#dlg[open] [data-act='confirm-yes']").count() === 1);
  await p.click("#dlg [data-act='dlg-close']"); check(tag + " cancel keeps note", await p.locator(".page").count() === notes);
  // a job opens to read; dates carry weekday, month and year
  await p.click("#nav-jobs"); await p.waitForTimeout(300); await p.click("table.jobs tbody tr >> text=Holburne"); await p.waitForTimeout(500);
  check(tag + " job reads", await p.locator(".jobhead h2").count() === 1 && await p.locator("#f-company").count() === 0);
  check(tag + " date style", /\b[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2} \d{4}\b/.test(await p.locator("#pane").innerText()));
  // edit, change, done
  await p.click("[data-act='job-edit']"); await p.waitForTimeout(200); await p.fill("#f-salary", "£31,000 a year"); await p.fill("#t-advert", LONG); await p.click("[data-act='job-done']"); await p.waitForTimeout(400);
  check(tag + " edit saved", (await p.locator(".facts").innerText()).includes("31,000"));
  // reading panel
  await p.click("[data-act='read-advert']"); await p.waitForTimeout(400);
  const sh = await p.evaluate(() => { const d = document.getElementById("dlg"), b = document.getElementById("sheetbody"); return { open:d.open, pct:Math.round(d.getBoundingClientRect().height / innerHeight * 100), scrolls:b && b.scrollHeight > b.clientHeight }; });
  check(tag + " reading panel", sh.open && sh.scrolls && sh.pct >= 80, JSON.stringify(sh));
  await p.click("#dlg [data-act='dlg-close']"); await p.waitForTimeout(200);
  // pasted research is kept and can be read
  await p.click("[data-act='prepare']"); await p.fill("#reply-text", "Intro line.\n**Key Facts**\n- **Closing date:** 2026-12-04\n**Advert Summary**\n- Runs front of house\n**Company**\n- A museum"); await p.click("form[data-form='file-reply'] button.add"); await p.waitForTimeout(300);
  if(await p.locator("form[data-form='apply-facts']").count()) await p.click("#dlg [data-act='dlg-close']"); await p.waitForTimeout(300);
  const res = await p.evaluate(() => D.roles.r1.research || {});
  check(tag + " research kept", !!res.summary && !!res.company && !!res.raw && /4 Dec 2026/.test(res.facts || ""), JSON.stringify(Object.keys(res)));
  // examples: read first, edit on request
  await p.click("#nav-evidence"); await p.waitForTimeout(400); await p.click(".acchead >> nth=1"); await p.waitForTimeout(200);
  check(tag + " example reads", await p.locator(".accbody textarea").count() === 0);
  await p.click("[data-act='ev-edit']"); await p.waitForTimeout(150); await p.fill(".star textarea >> nth=0", "A situation."); await p.click("[data-act='ev-done']"); await p.waitForTimeout(300);
  check(tag + " example saved", (await p.locator(".accbody").innerText()).includes("A situation."));
  check(tag + " no sideways scroll", !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = "http://localhost:" + server.address().port, browser = await chromium.launch(), errors = [];
  const watch = (p, tag) => { p.__base = base; p.on("pageerror", e => errors.push(tag + ": " + e.message)); p.on("console", m => { if(m.type() === "error" && !/Failed to load resource|ERR_/.test(m.text())) errors.push(tag + " console: " + m.text()); }); };

  // laptop, mouse
  { const p = await browser.newPage({ viewport:{ width:1280, height:900 } }); watch(p, "laptop"); await common(p, "laptop");
    await p.click("#nav-jobs"); await p.waitForTimeout(300); await p.click("table.jobs tbody tr >> text=Holburne"); await p.waitForTimeout(500);
    const a = await p.locator(".stk").first().boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x - 60, a.y + 180, { steps:8 }); await p.mouse.up(); await p.waitForTimeout(400);
    const b = await p.locator(".stk").first().boundingBox();
    check("laptop sticker drags", Math.abs(b.y - a.y) > 60, JSON.stringify([b.x - a.x, b.y - a.y]));
    check("laptop sticker controls after drag", await p.locator(".stkbar").count() === 1);
    await p.click("[data-act='add-role']").catch(() => {}); await p.close(); }

  // phone, touch
  { const ctx = await browser.newContext({ ...devices["iPhone 13"] }), p = await ctx.newPage(); watch(p, "phone"); await common(p, "phone");
    await p.click("#nav-jobs"); await p.waitForTimeout(300); await p.tap("table.jobs tbody tr >> text=Holburne"); await p.waitForTimeout(500);
    const cdp = await ctx.newCDPSession(p), touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints:pts.map((q, i) => ({ x:q[0], y:q[1], id:i + 1 })) });
    const a = await p.locator(".stk").first().boundingBox(), cx = a.x + a.width / 2, cy = a.y + a.height / 2;
    // drag straight away
    await touch("touchStart", [[cx, cy]]); for(let i = 1; i <= 6; i++){ await touch("touchMove", [[cx - 6 * i, cy + 22 * i]]); await p.waitForTimeout(30); } await touch("touchEnd", []); await p.waitForTimeout(500);
    const b = await p.locator(".stk").first().boundingBox();
    check("phone sticker drags at once", Math.abs(b.y - a.y) > 60, JSON.stringify([b.x - a.x, b.y - a.y]));
    // pinch with a second finger makes it bigger
    const x2 = b.x + b.width / 2, y2 = b.y + b.height / 2;
    await touch("touchStart", [[x2, y2]]); await p.waitForTimeout(40); await touch("touchStart", [[x2, y2], [x2 + 60, y2 + 60]]); await p.waitForTimeout(40);
    for(let i = 1; i <= 6; i++){ await touch("touchMove", [[x2, y2], [x2 + 60 + 15 * i, y2 + 60 + 15 * i]]); await p.waitForTimeout(30); }
    await touch("touchEnd", []); await p.waitForTimeout(500);
    const c = await p.locator(".stk").first().boundingBox();
    check("phone pinch resizes", c.width > b.width * 1.3, b.width + " to " + c.width);
    const saved = await p.evaluate(() => Object.values(D.roles.r1.stickers)[0].w);
    check("phone pinch saved", saved > 80, String(saved));
    await ctx.close(); }

  await browser.close(); server.close();
  errors.forEach(e => fails.push("page error: " + e));
  if(fails.length){ console.log("FAILED\n - " + fails.join("\n - ")); process.exit(1); }
  console.log("jobs smoke test: all passed");
})().catch(e => { console.error(e); process.exit(1); });
