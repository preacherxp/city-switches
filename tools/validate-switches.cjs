const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const cities = ['warsaw', 'berlin', 'lisbon', 'gliwice', 'czestochowa'];
let sharedEngine;
for (const city of cities) {
  const repo = path.join(root, 'repos', `${city}-switch`);
  const engine = fs.readFileSync(path.join(repo, 'city-switch.js'), 'utf8');
  if (sharedEngine) assert.equal(engine, sharedEngine, `${city}: gallery engine must match the standalone engine`);
  sharedEngine = engine;
  const scene = fs.readFileSync(path.join(repo, `${city}.js`), 'utf8');
  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, ['city-switch.js', `${city}.js`]);
  for (const file of scripts) execFileSync(process.execPath, ['--check', path.join(repo, file)]);
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    execFileSync(process.execPath, ['--check', '-'], { input: match[1] });
  }
  const registry = new Map();
  const context = vm.createContext({
    HTMLElement: class { attachShadow() { return { querySelector: () => ({ addEventListener() {} }) }; } },
    customElements: { get: (tag) => registry.get(tag), define: (tag, element) => registry.set(tag, element) },
    matchMedia: () => ({ matches: false }),
  });
  context.window = context;
  vm.runInContext(engine, context);
  vm.runInContext(scene, context);
  assert.equal(registry.size, 1, `${city}: one registered component`);
  const Element = registry.get(`${city}-switch`);
  const world = new Element().world;
  const paint = world.px.bind(world);
  world.px = (x, y, material) => {
    assert.ok(Number.isInteger(x) && Number.isInteger(y), `${city}: invalid pixel coordinates`);
    assert.ok(Number.isInteger(material) && material > 0 && material <= 255, `${city}: invalid material`);
    paint(x, y, material);
  };
  let day;
  for (const hour of [12, 15, 17, 18.5, 20, 22, 26, 29, 31, 36]) {
    for (let frame = 0; frame < 60; frame++) world.tick(1 / 30, hour);
    assert.ok(world.groups.length < 256);
    assert.equal(world.rgba.length, 400 * 190 * 4);
    if (hour === 12) day = Buffer.from(world.rgba);
    if (hour === 22) assert.notDeepEqual(Buffer.from(world.rgba), day);
  }
  world.startle();
  for (let frame = 0; frame < 60; frame++) world.tick(1 / 30, 18, { hurry: 1 });
  const time = world.t;
  world.tick(1 / 30, 22, { calm: true });
  assert.equal(world.t, time, `${city}: reduced motion stops time`);
  console.log(`${city}: syntax, standalone assets, full time cycle, paint coordinates and reduced motion passed`);
}
const gallery = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of gallery.matchAll(/<script src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
console.log('Gallery assets and shared engine compatibility passed.');
