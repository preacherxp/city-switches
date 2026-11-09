import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mercator, unmercator, wrapDelta, clusterPoints, zoomPath, textBitmap, FONT3, FONT5 } from '../globe.mjs';

const close = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) < epsilon, `${a} ≠ ${b}`);

// Projection: round trip, the equator in the middle, longitudes wrap
for (const [lon, lat] of [[0, 0], [18.78576, 50.32492], [-9.1498, 38.72509], [179.9, -59], [-180, 84]]) {
  const p = mercator(lon, lat), back = unmercator(p.x, p.y);
  close(back.lon, lon); close(back.lat, lat);
}
close(mercator(0, 0).y, 0.5);
assert.ok(mercator(0, 89).y >= 0 && mercator(0, -89).y <= 1, 'poles are clamped');
close(wrapDelta(0.95, 0.05), 0.1); close(wrapDelta(0.05, 0.95), -0.1);

// Grouping is transitive
assert.deepEqual(clusterPoints([{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }, { x: 100, y: 0 }], 25).map((g) => g.length), [3, 1]);
assert.deepEqual(clusterPoints([], 25), []);

// Fly path starts and ends at the requested views, including a pure zoom
for (const [from, to] of [[[0.5, 0.3, 1], [0.55, 0.32, 0.001]], [[0.2, 0.4, 0.01], [0.2, 0.4, 0.5]]]) {
  const path = zoomPath(from, to);
  path.at(0).forEach((v, i) => close(v, from[i], 1e-9));
  path.at(1).forEach((v, i) => close(v, to[i], 1e-9));
  for (let t = 0; t <= 1; t += 0.1) assert.ok(path.at(t).every(Number.isFinite) && path.at(t)[2] > 0);
}

// Every catalogue name can be lettered, accents included, in both fonts
const cities = JSON.parse(fs.readFileSync(new URL('../cities.json', import.meta.url)));
for (const city of cities) for (const font of [FONT3, FONT5]) {
  for (const ch of city.name.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')) assert.ok(font[ch], `${city.name}: missing ${ch}`);
  assert.ok(textBitmap(city.name, font).width > 0);
}
const plain = textBitmap('CZESTOCHOWA'), accented = textBitmap('Częstochowa');
assert.equal(accented.width, plain.width);
assert.equal(accented.points.length, plain.points.length + 2, 'ogonek drawn');
assert.ok(accented.bottom > plain.bottom);
assert.ok(textBitmap('Ó').top < 0, 'acute above the cap');

// Packed map data decodes into closed rings and lines
const world = JSON.parse(fs.readFileSync(new URL('../data/world.json', import.meta.url)));
for (const key of ['land', 'lakes', 'rivers', 'borders', 'deserts', 'mountains']) assert.ok(world[key]?.length > 10, `${key} present`);
for (const rings of world.land) for (const ring of rings) assert.ok(ring.length % 2 === 0 && ring.length >= 6);

console.log('Map projection, wrapping, grouping, fly path, pixel lettering and map data passed.');
