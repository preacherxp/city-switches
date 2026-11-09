// Composition checks that a syntax or engine test cannot see. For every city it builds the real
// scene and fails when:
//   - a sign leaves the safe area of the stadium-shaped window;
//   - static scenery painted after a sign covers that sign's pixels (poles through lettering);
//   - a light is in a different state at hour 12 and hour 36. The lens returns from 36 to 12
//     when it settles, so any difference snaps on screen.
// A scene may accept a flagged sign after looking at the real switch, with a reason:
//   checks: { signs: { 'TEXT': 'why this is intended' } }
// Usage: node tools/check-composition.cjs [city ...]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const all = fs.readdirSync(path.join(root, 'repos')).filter((name) => name.endsWith('-switch')).map((name) => name.slice(0, -7));
const cities = process.argv.slice(2).length ? process.argv.slice(2) : all;

// The window is a stadium about 328 × 150 logical pixels: a straight band from x 71 to 249
// with semicircular ends of radius 75 centred on y 75. Signs keep a few pixels of margin.
const MARGIN = 4;
const inside = (x, y) => Math.hypot(Math.max(0, Math.abs(x + 0.5 - 160) - 89), y + 0.5 - 75) <= 75 - MARGIN;

let failures = 0;
for (const city of cities) {
  const repo = path.join(root, 'repos', `${city}-switch`);
  const registry = new Map();
  const context = vm.createContext({
    HTMLElement: class { attachShadow() { return { querySelector: () => ({ addEventListener() {} }) }; } },
    customElements: { get: (tag) => registry.get(tag), define: (tag, element) => registry.set(tag, element) },
    matchMedia: () => ({ matches: false }),
  });
  context.window = context;
  vm.runInContext(fs.readFileSync(path.join(repo, 'city-switch.js'), 'utf8'), context);
  const define = context.CitySwitch.define;
  const signs = [], covered = new Map();
  let accepted = {};
  context.CitySwitch.define = (tag, scene) => {
    accepted = scene.checks?.signs || {};
    const build = scene.build;
    scene.build = function (w, ctx) {
      const px = w.px.bind(w);
      let current = null;
      const owner = new Map();
      w.px = (x, y, m) => {
        const key = y * 1000 + x;
        if (current) { current.pixels.add(key); owner.set(key, current); current.x0 = Math.min(current.x0, x); current.x1 = Math.max(current.x1, x); current.y0 = Math.min(current.y0, y); current.y1 = Math.max(current.y1, y); }
        else if (owner.has(key)) { const sign = owner.get(key); covered.set(sign, (covered.get(sign) || 0) + 1); owner.delete(key); }
        return px(x, y, m);
      };
      for (const name of ['hsign', 'vsign']) {
        const original = w[name].bind(w);
        w[name] = (...args) => {
          const outer = current;
          const text = name === 'hsign' ? args[4] : args[2];
          current = outer || { text, kind: name, pixels: new Set(), x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
          try { return original(...args); } finally { if (!outer) signs.push(current); current = outer; }
        };
      }
      build.call(this, w, ctx);
      w.px = px;
    };
    return define(tag, scene);
  };
  vm.runInContext(fs.readFileSync(path.join(repo, `${city}.js`), 'utf8'), context);
  const world = new (registry.get(`${city}-switch`))().world;

  const problems = [];
  for (const sign of signs) {
    if (!sign.pixels.size || accepted[sign.text]) continue;
    const corners = [[sign.x0, sign.y0], [sign.x1, sign.y0], [sign.x0, sign.y1], [sign.x1, sign.y1]];
    if (!corners.every(([x, y]) => inside(x, y))) problems.push(`sign "${sign.text}" (${sign.x0},${sign.y0})–(${sign.x1},${sign.y1}) leaves the safe window`);
    const hidden = covered.get(sign) || 0;
    if (hidden > 2) problems.push(`sign "${sign.text}" has ${hidden} pixels painted over by later scenery`);
  }
  const levelsAt = (hour) => { world.tick(1 / 30, hour, { calm: true }); return Array.from(world.levels.slice(0, world.groups.length)); };
  const noon = levelsAt(12), back = levelsAt(36);
  for (let group = 3; group < world.groups.length; group++) {
    if (Math.abs(noon[group] - back[group]) < 0.05) continue;
    const { on, off } = world.groups[group];
    problems.push(`light group ${group} (on ${on}, off ${off}) is ${noon[group] ? 'on' : 'off'} at 12:00 but ${back[group] ? 'on' : 'off'} at 36:00`);
  }
  if (problems.length) { failures++; console.log(`${city}: ${problems.length} problem(s)`); for (const p of problems) console.log(`  - ${p}`); }
  else console.log(`${city}: ${signs.length} signs inside the window and unobstructed; lights agree at both noons`);
}
process.exitCode = failures ? 1 : 0;
