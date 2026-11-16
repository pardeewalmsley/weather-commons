// Weather and story for the globe: the storm of 15–16 April 2024. A timeline at the bottom of the map moves
// between ten key moments. At each one the camera flies to a place in Dubai, the timeline's key shows the
// weather, effects.js draws it, and the panel on the right shows what the news reported.
//   data/april-2024.json (made by tools/fetch_april_2024.mjs): the weather.
//     Observed (Dubai airport METAR reports): wind, gusts, visibility, present weather.
//     Reanalysed (ERA5, hourly): rain in the hour, cloud cover low / mid / high.
//   data/moments.json: the ten moments, chosen by hand (interpretive): the airport report each one shows,
//     why it was chosen, the place and camera view, and the news report (placeholders for now).

const DATA_URL = 'data/april-2024.json';
const MOMENTS_URL = 'data/moments.json';
const PLAY_SECONDS_PER_MOMENT = 7;   // Play shows each moment for 7 seconds (3 of them flying there)
const FLIGHT_SECONDS = 3;            // how long the camera takes to fly to each moment's view

const compass = (deg) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2024-04-16T15:11" (Dubai time) -> "16 Apr 2024, 15:11"
const when = (t) => `${Number(t.slice(8, 10))} ${MONTHS[Number(t.slice(5, 7)) - 1]} ${t.slice(0, 4)}, ${t.slice(11, 16)}`;

// Minutes since the start of the timeline. Times are Dubai time written without a zone; read them all the same way.
let START = 0;
const minutes = (t) => (Date.parse(t + 'Z') - START) / 60000;

// The timeline's key: one entry per symbol, in its colour, with the number it is drawn from and where that comes from.
function show(r) {
  const wind = r.windFrom == null
    ? `Wind ${r.windSpeed} km/h, direction varying`
    : `Wind ${r.windSpeed} km/h from the ${compass(r.windFrom)}`;
  const rows = [
    ['#e8b100', wind + (r.gust ? `, gusts ${r.gust}` : ''), 'observed'],
    ['#4a6fa5', `Rain ${r.rainRate.toFixed(1)} mm in the hour`, 'ERA5'],
    ['#00a3b4', `Cloud ${r.cloudLow} / ${r.cloudMid} / ${r.cloudHigh} % (low / mid / high)`, 'ERA5'],
    ['#b000b0', r.visibility >= 10000 ? 'Visibility 10 km or more' : `Visibility ${(r.visibility / 1000).toFixed(1)} km (ring)`, 'observed'],
  ];
  document.getElementById('readings').innerHTML = rows
    .map(([c, text, source]) => `<li><span style="--c:${c}"></span><div>${text} <em class="muted">${source}</em></div></li>`).join('');
}

// ---- The timeline ----
function makeTimeline(data, moments, onMoment) {
  const total = minutes(data.end);
  const slider = document.getElementById('tl-slider');
  const track = document.getElementById('tl-track');
  const chart = document.getElementById('tl-chart');
  const cursor = document.getElementById('tl-cursor');
  const timeText = document.getElementById('tl-time');
  const weatherText = document.getElementById('tl-weather');
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
    timeText.textContent = `${i + 1} of ${moments.length} · ${when(r.time)}`;
    weatherText.textContent = `${r.why}. Airport: ${r.weather}.`;
    slider.setAttribute('aria-valuetext', `${when(r.time)} Dubai time. ${r.why}. Airport report: ${r.weather}.`);
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

// The panel: the place, a photo (or a placeholder box), the news headline, text and source.
function showNews(m) {
  const n = m.news ?? {};
  const el = (id) => document.getElementById(id);
  el('news-place').textContent = m.place;
  const photo = el('news-photo');
  photo.replaceChildren();
  if (n.photo) {
    const img = document.createElement('img');
    img.src = n.photo; img.alt = n.photoAlt ?? '';
    photo.append(img);
  } else {
    const span = document.createElement('span');
    span.textContent = 'Photo to come';
    photo.append(span);
  }
  el('news-headline').textContent = n.headline ?? '';
  const text = el('news-text');
  text.textContent = n.text ?? '';
  text.className = n.placeholder ? 'placeholder' : '';
  const source = el('news-source');
  source.replaceChildren();
  if (n.placeholder) {
    source.textContent = 'Placeholder: the news text, source and photo will follow.';
  } else if (n.source) {
    const link = n.url ? Object.assign(document.createElement('a'), { href: n.url, textContent: n.source }) : document.createTextNode(n.source);
    source.append(link);
    if (n.photoCredit) source.append(` · Photo: ${n.photoCredit}`);
  }
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
  let current = null;
  let first = true;
  const timeline = makeTimeline(data, moments, (m) => {
    current = m;
    show(m);
    showNews(m);
    effects.apply(m);
    // Fly to this moment's place; straight there the first time, when the page opens.
    window.flyToView(m.camera, first ? 0 : FLIGHT_SECONDS);
    first = false;
  });
  timeline.go(moments.findIndex((m) => m.time === '2024-04-16T15:11'));  // open at the worst visibility
  // "This view": back to the current moment's camera, after moving around.
  document.getElementById('home').addEventListener('click', () => window.flyToView(current.camera, 2));

  // Pause and play the movement of the symbols. It starts paused if the computer is set to reduce motion.
  const button = document.getElementById('play');
  const label = () => { button.textContent = effects.playing ? 'Pause motion' : 'Play motion'; };
  button.addEventListener('click', () => { effects.setPlaying(!effects.playing); label(); });
  label();
}

if (window.globeViewer) startWeather();
else window.addEventListener('globe-ready', startWeather, { once: true });
