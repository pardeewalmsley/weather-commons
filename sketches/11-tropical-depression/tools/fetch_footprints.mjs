// Download the building outlines (footprints) around each place on the map's Simulation tab, from
// OpenStreetMap through the Overpass API, and save them as data/footprints.json for the airflow simulation.
// Run from the sketch folder:   node tools/fetch_footprints.mjs
// Or only some places, keeping the rest of the saved file:   node tools/fetch_footprints.mjs airport
// Needs Node 18 or newer (for fetch). No packages, no keys.
//
// Each place is a square SIZE metres across, centred on the point below (the points the camera circles, from
// js/config.js, except the airport: its camera point is on open apron, so its square is centred on Terminal 3
// and Concourse B, about 700 m to the south-west, from the OSM aeroway=terminal outlines). Outlines are stored in metres east and north of that centre, rounded to 0.5 m.
// Buildings are everything tagged building=*, plus airport terminals and concourses (aeroway=terminal), which
// are not always tagged as buildings. Data © OpenStreetMap contributors, ODbL 1.0. Cartographic.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SIZE = 800;  // metres
const PLACES = {
  airport: { name: 'Dubai International Airport, Terminal 3', lon: 55.3605, lat: 25.2470 },
  burj: { name: 'Burj Khalifa', lon: 55.2744, lat: 25.1972 },
  'burj-al-arab': { name: 'Jumeirah Burj Al Arab', lon: 55.1853, lat: 25.1412 },
  atlantis: { name: 'Atlantis The Palm', lon: 55.1160, lat: 25.1312 },
  sharjah: { name: 'Sharjah', lon: 55.3960, lat: 25.3470 },
};
// Two public Overpass servers; if the first is busy, the script waits and tries the other.
const SERVERS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const M_PER_DEG_LAT = 110574;
const mPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);
const r = (x) => Math.round(x * 2) / 2;

async function footprints(p) {
  const half = SIZE / 2 + 50;  // a little extra, so buildings at the edge are whole
  const dLat = half / M_PER_DEG_LAT, dLon = half / mPerDegLon(p.lat);
  const bbox = [p.lat - dLat, p.lon - dLon, p.lat + dLat, p.lon + dLon].map((x) => x.toFixed(6)).join(',');
  const query = `[out:json][timeout:60];(way["building"](${bbox});relation["building"](${bbox});way["aeroway"="terminal"](${bbox});relation["aeroway"="terminal"](${bbox}););out geom;`;
  let json;
  for (let attempt = 0; !json; attempt++) {
    const server = SERVERS[attempt % SERVERS.length];
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'weather-commons-sketch/1.0' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`${server} answered ${res.status}`);
      json = await res.json();
    } catch (err) {
      if (attempt >= 5) throw new Error(`${p.name}: ${err.message}`);
      console.log(`  ${err.message}; trying again`);
      await new Promise((done) => setTimeout(done, 5000 * (attempt + 1)));
    }
  }
  const toLocal = (g) => g.map(({ lon, lat }) => [r((lon - p.lon) * mPerDegLon(p.lat)), r((lat - p.lat) * M_PER_DEG_LAT)]);
  const rings = [];
  for (const el of json.elements) {
    if (el.type === 'way' && el.geometry) rings.push(toLocal(el.geometry));
    if (el.type === 'relation') for (const m of el.members ?? []) if (m.role === 'outer' && m.geometry) rings.push(toLocal(m.geometry));
  }
  return rings.filter((ring) => ring.length >= 3);
}

const out = {
  about: `Building outlines around each place on the map's Simulation tab, from OpenStreetMap via the Overpass API, downloaded ${new Date().toISOString().slice(0, 10)} by tools/fetch_footprints.mjs. © OpenStreetMap contributors, ODbL 1.0. Cartographic. Each place is a square ${SIZE} m across; points are metres east and north of its centre (lon, lat), rounded to 0.5 m. Only outlines: no heights. Buildings missing from OpenStreetMap are missing here.`,
  size: SIZE,
  places: {},
};
const only = process.argv.slice(2);
if (only.length) {
  const saved = JSON.parse(await readFile('data/footprints.json', 'utf8'));
  // Keep the saved places that are still in PLACES (a place taken out of PLACES is dropped).
  for (const id of Object.keys(PLACES)) if (saved.places[id]) out.places[id] = saved.places[id];
}
for (const [id, p] of Object.entries(PLACES)) {
  if (only.length && !only.includes(id)) continue;
  const polygons = await footprints(p);
  out.places[id] = { ...p, polygons };
  console.log(`${p.name}: ${polygons.length} buildings`);
  await new Promise((done) => setTimeout(done, 2000));  // be gentle with the shared Overpass server
}
await mkdir('data', { recursive: true });
await writeFile('data/footprints.json', JSON.stringify(out));
console.log('Saved data/footprints.json');
