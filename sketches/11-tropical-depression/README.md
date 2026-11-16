# 11 · Mapping the extreme rain event in Dubai, April 2024

Author: Alexander Walmsley · Started: 2026-11-02 · Status: sketch · Stack: static HTML + JS, CesiumJS

On 15 and 16 April 2024 the UAE had its heaviest rain since records began, and Dubai flooded; some forecast models saw it coming and others missed it. This sketch compares their forecasts over a 3D model of the city and asks what each model saw, and when.

## Run

Online, once published: `https://pardeewalmsley.github.io/weather-commons/11-tropical-depression/`

On your computer:

```bash
cd sketches/11-tropical-depression
python -m http.server 8000
```

Then open http://localhost:8000. The page needs an internet connection: CesiumJS, the buildings, terrain and imagery load from the web.

Settings, including the Cesium ion token, are in `js/config.js`. The technical plan is in `PLAN.md`.

## 1. Event

On 15–16 April 2024 a slow storm brought record rain to the UAE and Oman. Dubai airport recorded more than a year's usual rain in about a day; roads, the airport and homes flooded.

## 2. Simulate

So far: a 3D globe (CesiumJS) filling the window and opening over Dubai, with OpenStreetMap buildings, colour satellite imagery and a flat grey sky. A timeline of ten key moments runs along the bottom; at each one the camera flies to a different part of the city (places and views in `data/moments.json`), and a panel on the right shows what the news reported then (placeholders for now). It opens at Downtown and the Burj Khalifa; a button shows all of Dubai. Over the whole city, from Jebel Ali to Deira and the airport, the storm of 15–16 April 2024 drives a diagram of small coloured symbols for wind, rain, cloud and visibility (`js/weather.js`, `js/effects.js`). A timeline along the bottom steps through ten key moments, chosen by hand from Dubai airport's 100 weather reports of those two days (observed wind and visibility), with ERA5 rain and cloud for each hour (reanalysed); Play moves from one to the next. The ten and their reasons are in `KEY_MOMENTS` in `js/weather.js`. The data is in `data/april-2024.json`; `node tools/fetch_april_2024.mjs` downloads it again. Next: rain from several forecast models, played over time, compared with satellite and rain-gauge observations (see `PLAN.md`).

## 3. Situate

Still to come.

## 4. Narrate

The panel on the right tells what was happening in Dubai at each of the ten moments, from news reports, with a photo. Placeholders for now: the headline, text, source, link, photo and photo credit for each moment go in `data/moments.json`; photos in `data/photos/`, under 1 MB each, only ones that may be published.

## Sources and limits

- Buildings: Cesium OSM Buildings, made by Cesium from OpenStreetMap, © OpenStreetMap contributors, ODbL. Streamed from Cesium ion, not stored in the repository. Cartographic.
- Satellite imagery: the default Cesium ion imagery, credited on the globe, in its own colours (`COLOUR_IMAGERY` in `js/config.js` turns it back to black and white). Cartographic.
- Ground heights: Cesium World Terrain, from Cesium ion. Cartographic.
- The grey sky and the lighting from the camera are design choices: they say nothing about the weather or the time of day. Interpretive.
- Wind, gusts, visibility, present weather: METAR reports from Dubai International Airport (OMDB, 25.25° N, 55.36° E), 15 April 00:00 to 17 April 00:00 2024 Dubai time (100 reports), from the Iowa Environmental Mesonet ASOS/METAR archive, Iowa State University, downloaded 2026-11-16. Observed. Decoded from the report text; knots to km/h; 9999 and CAVOK as "10 km or more"; variable wind drawn without arrows. No rain amounts in the reports.
- Rain (mm per hour) and cloud cover (low, mid, high): ERA5 hourly reanalysis (ECMWF, Copernicus Climate Change Service), via the Open-Meteo historical weather API (CC BY 4.0), grid cell 25.25° N, 55.25° E (about 28 km), downloaded 2026-11-16. Reanalysed. Contains modified Copernicus Climate Change Service information 2024. Each report takes the ERA5 hour it falls in. ERA5 gives about 122 mm for 15–16 April, with its heaviest rain later than the airport's.
- Saved in `data/april-2024.json` (about 50 KB) by `tools/fetch_april_2024.mjs`.
- Weather diagram (`js/effects.js`): small coloured symbols drawn from those numbers, the same across all of Dubai (`window.WEATHER_AREA` in `js/config.js`). Interpretive. Symbols are drawn in six rings centred under the camera, each twice as wide as the last with symbols twice the size, spacing and speed (the innermost about 1.5 times the camera height across; `RINGS`, `RING_FACTOR` in `js/effects.js`), so density on screen is about even whichever way the camera points and the work for the graphics card stays the same. Rings out of view or outside Dubai are skipped; outer-ring cloud is more see-through. Labels and the visibility ring are at the airport. How many symbols follows the numbers; where each starts is random (the same on every load). They move 4 times faster than real (`SPEED`), wrapping round the square; rain restarts at 1 km; cloud drifts with the 10 m wind. Wind: 2,500 golden-yellow arrows per ring (70 % opaque) scattered from 30 m to the cloud base at 1 km (measured at 10 m), 5 m per m/s. Rain: grey-blue 25 m streaks (70 % opaque) scattered below 1 km, 13,000 per ring at 50 mm/h (square-root scale), slanted along a drop falling 8 m/s. Cloud: see-through teal circles (15 % opaque, radius 30–150 m at random, facing the camera), 800 per band per ring at 100 % cover, scattered through low 1–2 km, mid 2–6 km and high 6–9 km. Visibility: dashed purple ring around the airport. All sizes are at the top of `js/effects.js`.
- Timeline: ERA5 rain per hour as grey-blue bars (reanalysed); ten airport reports as ticks, highlighted where they report rain (observed). The ten were chosen by hand (interpretive); the other 90 stay in the data file.
- Places and camera views for the ten moments: chosen by hand (interpretive), in `data/moments.json`. The weather data does not say where in the city anything happened.
- News reports in the panel: placeholders; each will give its source, and each photo its credit and licence.
- No forecasts of the April 2024 storm yet.

This sketch cannot show yet forecasts of the storm, rain-gauge totals, or how the weather differed across the city: the airport is about 9 km from the Burj Khalifa, and the ERA5 cell is about 28 km across. OpenStreetMap building heights are incomplete and partly estimated.
