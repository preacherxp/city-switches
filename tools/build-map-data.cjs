// Packs Natural Earth 1:50m GeoJSON into data/world.json for the pixel map.
//   node tools/build-map-data.cjs <directory with the five ne_50m_*.geojson files>
// Coordinates are quantized to 0.01° and delta encoded: [x0, y0, dx1, dy1, ...].
const fs = require('node:fs');
const path = require('node:path');

const dir = process.argv[2];
if (!dir) throw new Error('Pass the directory containing the Natural Earth GeoJSON files');
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.geojson`), 'utf8')).features;
const SCALE = 100;

// minStep drops points closer than that many quantized units to the last kept one.
function encode(points, minStep = 0) {
  const out = [];
  let px, py;
  for (const [lon, lat] of points) {
    const x = Math.round(lon * SCALE), y = Math.round(lat * SCALE);
    if (x === px && y === py) continue;
    if (minStep && px !== undefined && Math.abs(x - px) < minStep && Math.abs(y - py) < minStep) continue;
    if (px === undefined) out.push(x, y); else out.push(x - px, y - py);
    px = x; py = y;
  }
  return out;
}
const polygons = (geometry) => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
const lines = (geometry) => geometry.type === 'LineString' ? [geometry.coordinates] : geometry.coordinates;
const rank = (feature) => feature.properties.scalerank ?? feature.properties.SCALERANK ?? 0;

const world = {
  source: 'Natural Earth 1:50m (public domain): land, lakes, rivers_lake_centerlines, admin_0_boundary_lines_land',
  scale: SCALE,
  land: [],
  lakes: [],
  rivers: [],
  borders: [],
};
for (const feature of read('ne_50m_land')) {
  for (const polygon of polygons(feature.geometry)) {
    const rings = polygon.map(encode).filter((ring) => ring.length >= 6);
    if (rings.length) world.land.push(rings);
  }
}
for (const feature of read('ne_50m_lakes')) {
  for (const polygon of polygons(feature.geometry)) {
    const rings = polygon.map(encode).filter((ring) => ring.length >= 6);
    if (rings.length) world.lakes.push({ rank: rank(feature), rings });
  }
}
for (const [key, name] of [['rivers', 'ne_50m_rivers_lake_centerlines'], ['borders', 'ne_50m_admin_0_boundary_lines_land']]) {
  for (const feature of read(name)) {
    if (!feature.geometry) continue;
    for (const line of lines(feature.geometry)) {
      const encoded = encode(line);
      if (encoded.length >= 4) world[key].push({ rank: rank(feature), line: encoded });
    }
  }
}
// Deserts and mountain ranges are approximate label regions; they only tint the land.
const REGIONS = { Desert: 'deserts', 'Range/mtn': 'mountains' };
const NOT_DESERT = new Set(['PUNJAB']);
for (const feature of read('ne_50m_geography_regions_polys')) {
  const key = REGIONS[feature.properties.FEATURECLA];
  if (!key || NOT_DESERT.has(feature.properties.NAME) || !feature.geometry) continue;
  world[key] ??= [];
  for (const polygon of polygons(feature.geometry)) {
    const rings = polygon.map((ring) => encode(ring, 8)).filter((ring) => ring.length >= 6);
    if (rings.length) world[key].push(rings);
  }
}
world.source += ', geography_regions_polys (deserts, mountain ranges)';
const out = path.join(__dirname, '..', 'data', 'world.json');
fs.writeFileSync(out, JSON.stringify(world));
console.log(`${out}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB`, Object.fromEntries(['land', 'lakes', 'rivers', 'borders', 'deserts', 'mountains'].map((k) => [k, world[k].length])));
