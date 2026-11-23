// Weather and story for the globe: the storm of 15–16 April 2024. A timeline at the bottom of the map moves
// between ten key moments. The camera stays over the airport; at each moment effects.js draws that moment's
// weather, and the panel on the right shows what happened, a weather icon and the readings.
//   data/april-2024.json (made by tools/fetch_april_2024.mjs): the weather.
//     Observed (Dubai airport METAR reports): wind, gusts, visibility, present weather.
//     Reanalysed (ERA5, hourly): rain in the hour, cloud cover low / mid / high.
//   data/moments.json: the ten moments, chosen by hand (interpretive): the airport report each one shows,
//     why it was chosen, and a news text (shown only once filled in).

const DATA_URL = 'data/april-2024.json';
const MOMENTS_URL = 'data/moments.json';
const PLAY_SECONDS_PER_MOMENT = 7;   // Play shows each moment for 7 seconds

const compass = (deg) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2024-04-16T15:11" (Dubai time) -> "16 Apr 2024, 15:11"
const when = (t) => `${Number(t.slice(8, 10))} ${MONTHS[Number(t.slice(5, 7)) - 1]} ${t.slice(0, 4)}, ${t.slice(11, 16)}`;

// Minutes since the start of the timeline. Times are Dubai time written without a zone; read them all the same way.
let START = 0;
const minutes = (t) => (Date.parse(t + 'Z') - START) / 60000;

// The panel at this moment: the airport's weather, and the key: one entry
// per symbol, in its colour, with the number it is drawn from and where that comes from.
function show(r) {
  document.getElementById('moment-airport').textContent = `Airport: ${r.weather}.`;
  const wind = r.windFrom == null
    ? `Wind ${r.windSpeed} km/h, direction varying`
    : `Wind ${r.windSpeed} km/h from the ${compass(r.windFrom)}`;
  const rows = [
    [ICONS.wind, wind + (r.gust ? `, gusts ${r.gust}` : ''), 'observed'],
    [ICONS.rain, `Rain ${r.rainRate.toFixed(1)} mm in the hour`, 'ERA5'],
    [ICONS.cloud, `Cloud ${r.cloudLow} / ${r.cloudMid} / ${r.cloudHigh} % (low / mid / high)`, 'ERA5'],
    [ICONS.visibility, r.visibility >= 10000 ? 'Visibility 10 km or more' : `Visibility ${(r.visibility / 1000).toFixed(1)} km (ring)`, 'observed'],
  ];
  document.getElementById('readings').innerHTML = rows
    .map(([icon, text, source]) => `<li>${icon}<div>${text} <em class="muted">${source}</em></div></li>`).join('');
  const graphic = document.getElementById('weather-graphic');
  graphic.innerHTML = weatherGraphic(r);
  centreGraphic(graphic.querySelector('svg'));
}

// ---- The weather graphic: a weather icon built from this moment's numbers, in the 3D view's colours ----
const C = { wind: '#e8b100', rain: '#4a6fa5', cloud: '#00a3b4', visibility: '#b000b0', sun: '#ffd970' };
// The three cloud bands, from the 3D view's teal: high is palest and furthest back, low darkest and in front.
const CLOUD_TINTS = { high: '#b3e4e9', mid: '#5fc6d0', low: C.cloud };

// A cloud: overlapping circles on a rounded base, drawn twice so it gets one white outline around the whole
// shape: first wide in white (the outline), then filled on top.
function cloud(x, y, scale, fill) {
  const shape = (attrs) => `<g transform="translate(${x} ${y}) scale(${scale})" ${attrs}>`
    + '<circle cx="-20" cy="4" r="14"/><circle cx="-2" cy="-8" r="20"/><circle cx="19" cy="2" r="14"/>'
    + '<rect x="-34" y="2" width="68" height="16" rx="8"/></g>';
  return shape(`fill="#fff" stroke="#fff" stroke-width="${(7 / scale).toFixed(1)}" stroke-linejoin="round"`) + shape(`fill="${fill}"`);
}

// An arrow centred on (x, y), `len` long, pointing along (ux, uy) on the page.
function arrow(x, y, len, ux, uy, width, outline = false) {
  const tx = x + (ux * len) / 2, ty = y + (uy * len) / 2;
  const head = Math.max(6, len * 0.38), c = Math.cos(Math.PI / 5), s = Math.sin(Math.PI / 5);
  const bx = (sign) => (tx - head * (ux * c - sign * uy * s)).toFixed(1);
  const by = (sign) => (ty - head * (uy * c + sign * ux * s)).toFixed(1);
  const d = `M${(x - (ux * len) / 2).toFixed(1)} ${(y - (uy * len) / 2).toFixed(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}`
    + `M${bx(1)} ${by(1)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${bx(-1)} ${by(-1)}`;
  const line = (colour, w) => `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // With an outline: a wider white line underneath, so the arrow stays clear where it crosses cloud and rain.
  return (outline ? line("#fff", width + 3) : "") + line(C.wind, width);
}

// Small symbols for the key, in the same style.
const icon = (body) => `<svg class="key-icon" viewBox="0 0 28 18" aria-hidden="true">${body}</svg>`;
const ICONS = {
  wind: icon(arrow(14, 9, 22, 1, 0, 2.5)),
  rain: icon(`<path d="M9 3L6 15M15 3L12 15M21 3L18 15" stroke="${C.rain}" stroke-width="2.5" stroke-linecap="round"/>`),
  cloud: icon(cloud(14, 8, 0.32, C.cloud)),
  visibility: icon(`<ellipse cx="14" cy="9" rx="11" ry="5" fill="none" stroke="${C.visibility}" stroke-width="2" stroke-dasharray="3.5 2.5"/>`),
};

// The icon. What shows, and how much of it, follows the numbers:
//   sun       when it is up (daytime) and the sky is not fully covered (most cover in any band under 90 %)
//   clouds    one per band with 15 % cover or more (high at the back, mid, low in front), larger for more cover
//   rain      up to 8 streaks under the front cloud, more for heavier rain (square-root scale, as in 3D),
//             slanting more in stronger wind
//   wind      1 to 3 arrows across the cloud and rain, longer for stronger wind. They always point the same
//             way: the direction is in the text under the icon, not in the picture. None if calm.
//   ring      the visibility ring on the ground, as wide as you could see (the full width is 10 km); none at
//             10 km or more, as in 3D
// Everything overlaps in one group, which is then moved to the middle of the frame (centreGraphic).
// Interpretive: one airport report and one ERA5 cell, drawn as a picture.
function weatherGraphic(r) {
  const W = 200, H = 130, GROUND = 124, MID = W / 2;
  const out = [];
  const most = Math.max(r.cloudLow ?? 0, r.cloudMid ?? 0, r.cloudHigh ?? 0);
  const size = (cover) => 0.6 + 0.4 * Math.min(1, cover / 100);

  const bands = [
    { cover: r.cloudHigh, x: MID - 14, y: 30, s: 0.62, fill: CLOUD_TINTS.high },
    { cover: r.cloudMid, x: MID + 18, y: 44, s: 0.75, fill: CLOUD_TINTS.mid },
    { cover: r.cloudLow, x: MID - 2, y: 54, s: 1.0, fill: CLOUD_TINTS.low },
  ];
  const shown = bands.filter((b) => (b.cover ?? 0) >= 15);

  // Sun, behind everything: peeking out over the clouds, or in the middle of a clear sky.
  if (r.sunUp !== false && most < 90) {
    const [sx, sy] = shown.length ? [MID + 20, 30] : [MID, 40];
    const rays = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      rays.push(`M${(sx + Math.cos(a) * 20).toFixed(1)} ${(sy + Math.sin(a) * 20).toFixed(1)}L${(sx + Math.cos(a) * 27).toFixed(1)} ${(sy + Math.sin(a) * 27).toFixed(1)}`);
    }
    out.push(`<g><path d="${rays.join('')}" stroke="${C.sun}" stroke-width="3.5" stroke-linecap="round"/>`
      + `<circle cx="${sx}" cy="${sy}" r="14" fill="${C.sun}"/></g>`);
  }

  // Clouds, back to front.
  for (const b of shown) out.push(cloud(b.x, b.y, (b.s * size(b.cover)).toFixed(2), b.fill));
  const front = shown.at(-1) ?? bands[2];  // rain falls from the cloud in front

  // Rain under the front cloud, slanting with the wind (the same way as the arrows).
  const ms = (r.windSpeed ?? 0) / 3.6;
  if (r.rainRate > 0.05) {
    const n = Math.round(8 * Math.min(1, Math.max(0.15, Math.sqrt(r.rainRate / 50))));
    const slant = Math.min(1, ms / 8);  // drops fall at about 8 m/s
    const len = 13, dx = (slant / Math.hypot(slant, 1)) * len, dy = len / Math.hypot(slant, 1);
    const top = Math.min(front.y + 22 * front.s + 12, GROUND - 34);  // starts below the arrows
    const spots = [[-21, 0], [-7, 0], [7, 0], [21, 0], [-28, 16], [-14, 16], [0, 16], [14, 16]];
    const d = spots.slice(0, n).map(([ox, oy]) => `M${(front.x + ox - dx / 2).toFixed(1)} ${(top + oy).toFixed(1)}l${dx.toFixed(1)} ${dy.toFixed(1)}`).join('');
    out.push(`<path d="${d}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`
      + `<path d="${d}" stroke="${C.rain}" stroke-width="3.5" stroke-linecap="round"/>`);
  }

  // Wind arrows across the cloud and rain, all pointing right.
  if (ms >= 0.5) {
    const n = r.windSpeed < 15 ? 1 : r.windSpeed < 30 ? 2 : 3;
    const len = Math.min(56, Math.max(26, 20 + r.windSpeed * 0.6));
    // Across the lower part of the cloud, a little below the middle of the icon, above the rain.
    const rows = { 1: [[MID, 72]], 2: [[MID - 8, 66], [MID + 8, 77]], 3: [[MID, 60], [MID - 10, 70], [MID + 10, 80]] }[n];
    for (const [x, y] of rows) out.push(arrow(x, y, len, 1, 0, 4, true));
  }

  // Ground, and the visibility ring.
  out.push(`<line class="wg-ground" x1="${MID - 60}" y1="${GROUND}" x2="${MID + 60}" y2="${GROUND}"/>`);
  if (r.visibility < 10000) {
    const rx = Math.max(4, (r.visibility / 10000) * (W / 2 - 12));
    out.push(`<ellipse cx="${MID}" cy="${GROUND}" rx="${rx.toFixed(1)}" ry="${Math.max(2.5, rx * 0.1).toFixed(1)}" fill="none" `
      + `stroke="${C.visibility}" stroke-width="2.5" stroke-dasharray="6 4"/><circle cx="${MID}" cy="${GROUND}" r="2.5" fill="${C.visibility}"/>`);
  }

  const label = `Weather graphic: ${r.cloudLow} / ${r.cloudMid} / ${r.cloudHigh} % cloud, ${r.rainRate.toFixed(1)} mm of rain in the hour, `
    + `wind ${Math.round(r.windSpeed)} km/h, visibility ${r.visibility >= 10000 ? '10 km or more' : (r.visibility / 1000).toFixed(1) + ' km'}.`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}"><g class="wg-all">${out.join('')}</g></svg>`;
}

// Move the whole icon to the middle of its frame, whatever it holds (a clear sky has less in it than a storm).
// It is measured once it is on the page; if the panel is closed there is nothing to measure, so it stays put.
function centreGraphic(svg) {
  const g = svg?.querySelector('.wg-all');
  if (!g) return;
  const box = g.getBBox();
  if (!box.width) return;
  const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
  const pad = 6;  // room for the white outlines, which the measurement leaves out
  const k = Math.min(1, (W - 2 * pad) / box.width, (H - 2 * pad) / box.height);
  const tx = W / 2 - k * (box.x + box.width / 2), ty = H / 2 - k * (box.y + box.height / 2);
  g.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k.toFixed(3)})`);
}

// ---- The timeline ----
function makeTimeline(data, moments, onMoment) {
  const total = minutes(data.end);
  const slider = document.getElementById('tl-slider');
  const track = document.getElementById('tl-track');
  const chart = document.getElementById('tl-chart');
  const cursor = document.getElementById('tl-cursor');
  const timeText = document.getElementById('tl-time');
  const playButton = document.getElementById('tl-play');
  slider.max = moments.length - 1;

  // Bars: ERA5 rain in each hour (reanalysed). Ticks: the key airport reports, dark where they report rain (observed).
  const NS = 'http://www.w3.org/2000/svg';
  const top = Math.max(...data.hourly.map((h) => h.rain), 1);
  const el = (name, attrs) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  chart.setAttribute('viewBox', `0 0 ${total} 100`);
  for (const h of data.hourly) {
    const height = (h.rain / top) * 72;
    if (height > 0) chart.append(el('rect', { x: minutes(h.time) - 60, y: 76 - height, width: 58, height, class: 'tl-bar' }));
  }
  for (const r of moments) {
    chart.append(el('line', { x1: minutes(r.time), x2: minutes(r.time), y1: 80, y2: 100, class: r.rainObserved ? 'tl-tick rain' : 'tl-tick' }));
  }
  chart.append(cursor);  // the line for the current moment goes on top
  // Labels every 6 hours, with the date at midnight.
  const labels = document.getElementById('tl-labels');
  for (let m = 0; m <= total; m += 360) {
    const t = new Date(START + m * 60000).toISOString();
    const span = document.createElement('span');
    span.style.left = (100 * m) / total + '%';
    span.textContent = t.slice(11, 13) === '00' ? `${Number(t.slice(8, 10))} Apr` : t.slice(11, 16);
    labels.append(span);
  }

  let current = -1;
  function go(i) {
    i = Math.min(Math.max(i, 0), moments.length - 1);
    if (i === current) return;
    current = i;
    const r = moments[i];
    slider.value = i;
    cursor.setAttribute('x1', minutes(r.time)); cursor.setAttribute('x2', minutes(r.time));
    timeText.textContent = `${i + 1} of ${moments.length} · ${when(r.time)}`;    slider.setAttribute('aria-valuetext', `${when(r.time)} Dubai time. ${r.why}. Airport report: ${r.weather}.`);
    onMoment(r);
  }
  // The key moment nearest a point on the chart.
  const nearest = (m) => moments.reduce((best, r, i) => (Math.abs(minutes(r.time) - m) < Math.abs(minutes(moments[best].time) - m) ? i : best), 0);

  // Drag or click on the chart; the hidden slider under it takes the arrow keys.
  const fromPointer = (e) => {
    const box = track.getBoundingClientRect();
    go(nearest(((e.clientX - box.left) / box.width) * total));
  };
  track.addEventListener('pointerdown', (e) => { stop(); track.setPointerCapture(e.pointerId); fromPointer(e); slider.focus({ preventScroll: true }); });
  track.addEventListener('pointermove', (e) => { if (track.hasPointerCapture(e.pointerId)) fromPointer(e); });
  slider.addEventListener('input', () => { stop(); go(Number(slider.value)); });
  // Previous and next, buttons or arrow keys.
  const step = (by) => { stop(); go(current + by); };
  document.getElementById('tl-prev').addEventListener('click', () => step(-1));
  document.getElementById('tl-next').addEventListener('click', () => step(1));
  slider.addEventListener('keydown', (e) => {
    const keys = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, Home: -moments.length, End: moments.length };
    if (e.key in keys) { e.preventDefault(); step(keys[e.key]); }
  });

  // Play moves from moment to moment; it stops at the last one.
  let timer = null;
  function stop() { clearInterval(timer); timer = null; playButton.textContent = 'Play'; }
  playButton.addEventListener('click', () => {
    if (timer) return stop();
    if (current >= moments.length - 1) go(0);
    playButton.textContent = 'Stop';
    timer = setInterval(() => {
      go(current + 1);
      if (current >= moments.length - 1) stop();
    }, PLAY_SECONDS_PER_MOMENT * 1000);
  });

  return { go };
}

// News, under the readings: shown only once a moment has a real news text in data/moments.json.
function showNews(m) {
  const n = m.news ?? {};
  const box = document.getElementById('news');
  box.hidden = Boolean(n.placeholder || !n.text);
  if (box.hidden) return;
  document.getElementById('news-headline').textContent = n.headline ?? '';
  document.getElementById('news-text').textContent = n.text;
  const source = document.getElementById('news-source');
  source.replaceChildren();
  if (n.source) source.append(n.url ? Object.assign(document.createElement('a'), { href: n.url, textContent: n.source }) : n.source);
}

async function startWeather() {
  const status = document.getElementById('globe-status');
  let data, story;
  try {
    [data, story] = await Promise.all([DATA_URL, MOMENTS_URL].map(async (url) => (await fetch(url)).json()));
  } catch (err) {
    console.error(err);
    status.hidden = false;
    status.textContent = 'The weather data could not load (' + err.message + ').';
    return;
  }
  START = Date.parse(data.start + 'Z');
  const moments = story.moments.map((m) => {
    const r = data.reports.find((x) => x.time === m.time);
    if (!r) throw new Error(`No airport report at ${m.time} in ${DATA_URL}`);
    return { ...r, ...m };
  });
  const effects = window.makeWeatherEffects(window.globeViewer);
  // Each moment changes only the weather: the camera stays where it is.
  const timeline = makeTimeline(data, moments, (m) => {
    // The sun at that time of day, dimmed by cloud and rain (viewer.js); the icon shows a sun only while it is up.
    const light = window.setLighting?.(m);
    show({ ...m, sunUp: light ? light.elevation > 0 : true });
    showNews(m);
    effects.apply(m);
  });
  timeline.go(moments.findIndex((m) => m.time === '2024-04-16T15:11'));  // open at the worst visibility
  // A closed panel can't measure the icon, so centre it again when the panel opens.
  document.querySelector('.panel details')?.addEventListener('toggle', () => centreGraphic(document.querySelector('#weather-graphic svg')));
}

if (window.globeViewer) startWeather();
else window.addEventListener('globe-ready', startWeather, { once: true });
