const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const city = process.argv[2];
assert.ok(['warsaw', 'berlin', 'lisbon', 'gliwice', 'czestochowa'].includes(city));
const tag = `${city}-switch`;
const out = `capture/${city}`;
fs.mkdirSync(`${out}/frames`, { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
  try {
    await page.goto(`http://127.0.0.1:8080/repos/${city}-switch/`, { waitUntil: 'networkidle' });
    await page.waitForFunction((tag) => document.querySelector(tag).gl, tag);
    const control = page.getByRole('switch');
    await control.click();
    await page.waitForFunction((tag) => document.querySelector(tag).checked, tag);
    await control.press('Home');
    await page.waitForFunction((tag) => document.querySelector(tag).position < .001, tag);
    await control.press('ArrowRight');
    await page.waitForFunction((tag) => document.querySelector(tag).position > .01, tag);
    await control.press('End');
    await page.waitForFunction((tag) => document.querySelector(tag).checked, tag);
    await control.press('Space');
    await page.waitForFunction((tag) => !document.querySelector(tag).checked, tag);
    await page.locator(tag).evaluate((el) => el.jump(false));
    const bounds = await control.boundingBox();
    await page.mouse.move(bounds.x + bounds.width * .25, bounds.y + bounds.height * .5);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .8, bounds.y + bounds.height * .5, { steps: 12 });
    await page.mouse.up();
    await page.waitForFunction((tag) => document.querySelector(tag).position > .6, tag);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await control.press('Home');
    await page.waitForFunction((tag) => document.querySelector(tag).position === 0, tag);
    await control.press('End');
    await page.waitForFunction((tag) => document.querySelector(tag).checked, tag);
    assert.equal(await control.getAttribute('aria-checked'), 'true');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction((tag) => document.querySelector(tag).checked, tag);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    for (const [name, width, height] of [['desktop', 960, 600], ['phone', 390, 844], ['narrow', 320, 680]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      for (const [phase, position, morning] of [['day', 0, false], ['dusk', .64, false], ['night', 1, false], ['dawn', .48, true]]) {
        await page.locator(tag).evaluate((el, { position, morning }) => {
          el.position = position;
          el.branch = morning ? 'am' : 'pm';
          el.amStart = 22;
          el.nightHour = 22;
          el.settleGroups();
          el.emitScrub();
        }, { position, morning });
        await page.waitForTimeout(350);
        await page.evaluate(() => scrollTo(0, 0));
        await page.locator('section').screenshot({ path: `${out}/${name}-${phase}.png` });
        const box = await page.locator(tag).boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1, `${city}: clipped control at ${width}px`);
        assert.ok(box.y >= 0 && box.y + box.height <= height + 1, `${city}: vertical control clipping at ${width}x${height}: ${JSON.stringify(box)}`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${city}: horizontal overflow`);
      }
    }

    await page.setViewportSize({ width: 960, height: 600 });
    await page.addStyleTag({ content: 'section { height: 600px; min-height: 600px; padding: 48px 24px; gap: 32px; } footer { display: none; } .switch { width: 760px; }' });
    await page.locator(tag).evaluate((el) => { el.jump(false); cancelAnimationFrame(el.raf); el.raf = 0; });
    for (let frame = 0; frame < 420; frame++) {
      await page.locator(tag).evaluate((el, frame) => {
        const p = frame / 419;
        const ease = (t) => t * t * (3 - 2 * t);
        el.branch = p >= .58 ? 'am' : 'pm';
        el.amStart = 22;
        el.nightHour = 22;
        el.x = p < .1 ? 0 : p < .43 ? ease((p - .1) / .33) : p < .58 ? 1 : p < .92 ? 1 - ease((p - .58) / .34) : 0;
        el.lift = el.x > 0 && el.x < 1 ? .2 : 0;
        el.time += 1 / 60;
        el.world.tick(1 / 60, el.hour());
        el.uploadWorld();
        el.stepWater(1 / 60, false);
        el.emitScrub();
        el.draw();
      }, frame);
      await page.screenshot({ path: `${out}/frames/${String(frame).padStart(3, '0')}.png` });
      if (frame % 60 === 0) console.log(`${city}: ${frame + 1}/420 full-switch frames captured`);
    }
    assert.deepEqual(errors, [], 'no runtime errors or missing assets');
    fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ city, sourceFrames: 420, sourceFps: 60, seconds: 7, pointer: true, drag: true, keyboard: true, reducedMotion: true, persistence: true, widths: [960, 390, 320], errors }, null, 2));
    console.log(`${city}: real WebGL control, input, persistence, reduced motion and responsive checks passed`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
