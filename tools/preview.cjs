// Pictures and numbers from the real scene, without a browser, so a scene can be looked at
// after every change instead of once at the end. For each city it writes to capture/preview/:
//   <city>-<hour>.png        the flat scene at noon, golden hour, dusk, night and dawn, 3× size.
//                            Everything outside the switch window is dimmed; edge ticks mark
//                            every 10 logical pixels, long ticks every 50 (x: 0…350, y: 0…100).
//   <city>-strip-<hour>.png  the actor strip: the ground band every 6 s for 60 s, at noon and night.
// and prints how much moves and how much lights up, to compare with Warsaw, Berlin and Lisbon.
// These are flat previews with no glass, frame or bloom: they do not replace the browser checks.
// Usage: node tools/preview.cjs [city ...]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..');
const out = path.join(root, 'capture', 'preview');
const all = fs.readdirSync(path.join(root, 'repos')).filter((name) => name.endsWith('-switch')).map((name) => name.slice(0, -7));
const cities = process.argv.slice(2).length ? process.argv.slice(2) : all;

const BW = 400, BH = 190, PAD = 40;
const HOURS = [[12, 'noon'], [17, 'gold'], [18.5, 'dusk'], [22, 'night'], [30, 'dawn']];
const BAND = [95, 150]; // logical rows of the ground band shown in the actor strip
// The same stadium as check-composition.cjs, without the sign margin.
const inWindow = (x, y) => Math.hypot(Math.max(0, Math.abs(x + 0.5 - 160) - 89), y + 0.5 - 75) <= 75;

const png = (rgba, w, h) => {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const head = Buffer.alloc(4), crc = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

// Buffer rows y0..y1 of the world, scaled, with the outside of the window dimmed and edge ticks.
const picture = (world, y0, y1, scale) => {
  const w = BW * scale, rows = y1 - y0, img = Buffer.alloc(w * rows * scale * 4);
  for (let y = 0; y < rows; y++) for (let x = 0; x < BW; x++) {
    const lx = x - PAD, ly = y + y0 - PAD, i = ((y + y0) * BW + x) * 4;
    const tick = (lx % 10 === 0 && y < (lx % 50 === 0 ? 5 : 2)) || (ly % 10 === 0 && x < (ly % 50 === 0 ? 5 : 2));
    const k = inWindow(lx, ly) ? 1 : 0.45;
    const c = tick ? [255, 0, 255] : [world.rgba[i] * k, world.rgba[i + 1] * k, world.rgba[i + 2] * k];
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) img.set([...c, 255], ((y * scale + sy) * w + x * scale + sx) * 4);
  }
  return img;
};

const load = (city) => {
  const repo = path.join(root, 'repos', `${city}-switch`);
  const registry = new Map();
  const context = vm.createContext({
    HTMLElement: class { attachShadow() { return { querySelector: () => ({ addEventListener() {} }) }; } },
    customElements: { get: (tag) => registry.get(tag), define: (tag, element) => registry.set(tag, element) },
    matchMedia: () => ({ matches: false }),
  });
  context.window = context;
  for (const file of ['city-switch.js', `${city}.js`]) vm.runInContext(fs.readFileSync(path.join(repo, file), 'utf8'), context, { filename: file });
  return new (registry.get(`${city}-switch`))().world;
};

fs.mkdirSync(out, { recursive: true });
console.log('city          moving px/frame (noon, night)   lit px at night   materials');
for (const city of cities) {
  // Stills: let the scene run for two seconds at each hour so actors and lights have settled.
  let world = load(city);
  for (const [hour, name] of HOURS) {
    for (let frame = 0; frame < 60; frame++) world.tick(1 / 30, hour);
    fs.writeFileSync(path.join(out, `${city}-${name}.png`), png(picture(world, 0, BH, 3), BW * 3, BH * 3));
  }
  const stats = {};
  for (const [hour, name] of [[12, 'noon'], [22, 'night']]) {
    world = load(city);
    const crops = [];
    let moving = 0;
    for (let frame = 1; frame <= 1800; frame++) {
      world.tick(1 / 30, hour);
      for (let i = 0; i < world.fmat.length; i++) if (world.fmat[i] !== world.smat[i] || world.fneon[i] !== world.sneon[i]) moving++;
      if (frame % 180 === 0) crops.push(picture(world, BAND[0] + PAD, BAND[1] + PAD, 2), Buffer.alloc(BW * 2 * 2 * 4, 255));
    }
    fs.writeFileSync(path.join(out, `${city}-strip-${name}.png`), png(Buffer.concat(crops), BW * 2, 10 * ((BAND[1] - BAND[0]) * 2 + 2)));
    stats[name] = Math.round(moving / 1800);
  }
  let lit = 0;
  for (let i = 0; i < world.fneon.length; i++) if (world.fneon[i] && world.levels[world.fgroup[i]] > 0.5) lit++;
  console.log(`${city.padEnd(14)}${String(stats.noon).padStart(6)} ${String(stats.night).padStart(6)}${String(lit).padStart(26)}${String(new Set(world.smat).size).padStart(12)}`);
}
console.log(`Wrote previews and actor strips to ${path.relative(process.cwd(), out)}/`);
