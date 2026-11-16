// Download the weather of 15–16 April 2024 at Dubai and save it as data/april-2024.json for the page.
// Run from the sketch folder:   node tools/fetch_april_2024.mjs
// Needs Node 18 or newer (for fetch). No packages, no keys.
//
// Two sources, kept apart in the file:
//   Observed: the weather reports (METAR) from Dubai International Airport (OMDB), from the Iowa
//     Environmental Mesonet archive, Iowa State University. Wind, visibility and present weather.
//   Reanalysed: ERA5 (ECMWF, Copernicus Climate Change Service), hourly, through the Open-Meteo
//     historical weather API, at the ERA5 grid cell nearest the Burj Khalifa. Rain and cloud cover.

import { writeFile, mkdir } from 'node:fs/promises';

const START_UTC = '2024-04-14T20:00Z';   // 15 April 00:00 in Dubai (UTC+4)
const END_UTC = '2024-04-16T20:00Z';     // 17 April 00:00 in Dubai
const DUBAI_HOURS = 4;

const METAR_URL = 'https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=OMDB&data=all'
  + '&year1=2024&month1=4&day1=14&hour1=19&year2=2024&month2=4&day2=16&hour2=21'
  + '&tz=Etc%2FUTC&format=onlycomma&latlon=no&missing=M&trace=T&direct=no&report_type=3&report_type=4';
const ERA5_URL = 'https://archive-api.open-meteo.com/v1/archive?latitude=25.25&longitude=55.25'
  + '&start_date=2024-04-14&end_date=2024-04-17&models=era5&cell_selection=nearest&timezone=Asia%2FDubai'
  + '&hourly=precipitation,cloud_cover_low,cloud_cover_mid,cloud_cover_high';

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res;
};

// "2024-04-15 14:04" in UTC -> "2024-04-15T18:04" in Dubai time
const toDubai = (utc) => new Date(Date.parse(utc) + DUBAI_HOURS * 3600e3).toISOString().slice(0, 16);

// Present-weather codes in plain words: "+TSRA" -> "heavy thunderstorm with rain".
const WORDS = { RA: 'rain', DZ: 'drizzle', GR: 'hail', GS: 'small hail', SQ: 'squall', BR: 'mist', HZ: 'haze', DU: 'dust', SA: 'sand', FG: 'fog' };
function describe(code) {
  const intensity = code.startsWith('-') ? 'light ' : code.startsWith('+') ? 'heavy ' : '';
  let rest = code.replace(/^[-+]/, '');
  const nearby = rest.startsWith('VC') ? ' nearby' : '';
  rest = rest.replace(/^VC/, '');
  const thunder = rest.startsWith('TS'), showers = rest.startsWith('SH');
  rest = rest.replace(/^(TS|SH)/, '');
  const what = (rest.match(/../g) ?? []).map((c) => WORDS[c] ?? c).join(' and ');
  if (thunder) return intensity + 'thunderstorm' + (what ? ' with ' + what : '') + nearby;
  if (showers) return intensity + (what || 'rain') + ' showers' + nearby;
  return intensity + what + nearby;
}

// The main part of a METAR, before forecasts (TEMPO, BECMG, NOSIG), wind shear (WS) and recent weather (RE).
const mainPart = (metar) => metar.split(/\s(?:TEMPO|BECMG|NOSIG|WS|RE[A-Z]+)\b/)[0];

function readReport(row) {
  const metar = row.metar.replace(/^COR\s+/, '');
  const main = mainPart(metar);
  const wind = main.match(/\s(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT/);
  const kmh = (knots) => Math.round(Number(knots) * 1.852);
  // Visibility: CAVOK, or the first four-digit group after the wind (9999 means 10 km or more).
  const afterWind = wind ? main.slice(main.indexOf(wind[0]) + wind[0].length) : main;
  const vis = /\bCAVOK\b/.test(main) ? 10000 : Number((afterWind.match(/\s(\d{4})(?=\s|$)/) ?? [])[1] ?? NaN);
  const codes = row.wxcodes === 'M' ? [] : row.wxcodes.split(' ');
  return {
    utc: row.valid.replace(' ', 'T') + 'Z',
    time: toDubai(row.valid.replace(' ', 'T') + 'Z'),
    metar: row.metar,
    windSpeed: wind ? kmh(wind[2]) : null,
    windFrom: wind && wind[1] !== 'VRB' ? Number(wind[1]) : null,   // null: variable direction
    gust: wind && wind[3] ? kmh(wind[3]) : null,
    visibility: vis === 9999 ? 10000 : vis,
    weather: codes.length ? codes.map(describe).join(', ') : (/\bCAVOK\b/.test(main) ? 'no cloud or weather of note (CAVOK)' : 'no rain or other weather reported'),
    rainObserved: codes.some((c) => /RA|DZ|GR|GS/.test(c)),
  };
}

const csv = await (await get(METAR_URL)).text();
const [header, ...lines] = csv.trim().split('\n');
const columns = header.split(',');
const rows = lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [columns[i], v])));
const reports = rows.map(readReport).filter((r) => r.utc >= START_UTC && r.utc <= END_UTC);

const era5 = await (await get(ERA5_URL)).json();
const h = era5.hourly;
const hourly = h.time.map((time, i) => ({
  time, rain: h.precipitation[i], cloudLow: h.cloud_cover_low[i], cloudMid: h.cloud_cover_mid[i], cloudHigh: h.cloud_cover_high[i],
})).filter((x) => x.time > '2024-04-15T00:00' && x.time <= '2024-04-17T00:00');

// Each report gets the ERA5 hour it falls in. ERA5 rain at hh:00 is the total for the hour before it,
// so a report at 14:04 takes the hour ending 15:00; a report on the hour takes the hour ending then.
for (const r of reports) {
  const d = new Date(r.time + 'Z');
  if (d.getUTCMinutes() > 0) d.setUTCHours(d.getUTCHours() + 1, 0);
  const hour = hourly.find((x) => x.time === d.toISOString().slice(0, 16)) ?? hourly[0];
  Object.assign(r, { rainRate: hour.rain, cloudLow: hour.cloudLow, cloudMid: hour.cloudMid, cloudHigh: hour.cloudHigh, era5Hour: hour.time });
}

const out = {
  about: {
    made: `Downloaded ${new Date().toISOString().slice(0, 10)} by tools/fetch_april_2024.mjs. Times are Dubai time (UTC+4).`,
    observed: 'Wind, gusts, visibility and present weather: METAR reports from Dubai International Airport (OMDB, 25.25 N, 55.36 E), from the Iowa Environmental Mesonet ASOS/METAR archive, Iowa State University (mesonet.agron.iastate.edu). Wind is measured 10 m above the ground. The reports give no rain amounts.',
    reanalysed: `Rain (mm in the hour) and cloud cover (low, mid, high, %): ERA5 hourly reanalysis (ECMWF, Copernicus Climate Change Service), through the Open-Meteo historical weather API (CC BY 4.0), grid cell at ${era5.latitude} N, ${era5.longitude} E, about 28 km across. Contains modified Copernicus Climate Change Service information 2024.`,
  },
  start: '2024-04-15T00:00',
  end: '2024-04-17T00:00',
  hourly,
  reports,
};
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(new URL('../data/april-2024.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`${reports.length} airport reports and ${hourly.length} ERA5 hours saved to data/april-2024.json`);
console.log(`ERA5 rain, 15–16 April: ${hourly.reduce((s, x) => s + x.rain, 0).toFixed(1)} mm`);
