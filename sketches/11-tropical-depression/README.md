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

So far: a 3D globe (CesiumJS) filling the window and opening over Dubai, with OpenStreetMap buildings, colour satellite imagery, a flat grey sky, and sunlight and shadows for each moment's time of day, dimmed by its cloud and rain. A timeline of ten key moments runs along the bottom; the camera circles Dubai International Airport very slowly (once round in 6 minutes), where the reports come from, and only the weather changes. Dragging or zooming the map stops the turning; the Airport button starts it again. A panel on the right shows the airport's weather report, a weather icon built from that moment's numbers in the 3D view's colours (a cloud for each band, rain, wind arrows, the visibility ring, and a sun when it is daytime and the sky is not fully covered), and the readings for wind, rain, cloud and visibility, each with its symbol as the key. Buttons at the top left of the map fly the camera to All of Dubai, the Airport, the Burj Khalifa, Jumeirah Burj Al Arab, Dubai Harbour or Sharjah; at each place but All of Dubai it circles slowly (at the two towers from low down, looking up). The places and views were chosen by hand (`js/config.js`). Over the whole city, from Jebel Ali to Deira and the airport, the storm of 15–16 April 2024 drives a diagram of small coloured symbols for wind, rain, cloud and visibility (`js/weather.js`, `js/effects.js`). A timeline along the bottom steps through ten key moments, chosen by hand from Dubai airport's 100 weather reports of those two days (observed wind and visibility), with ERA5 rain and cloud for each hour (reanalysed); Play moves from one to the next. The ten and their reasons are in `data/moments.json`. The data is in `data/april-2024.json`; `node tools/fetch_april_2024.mjs` downloads it again. Next: rain from several forecast models, played over time, compared with satellite and rain-gauge observations (see `PLAN.md`).

## 3. Situate

Below the map, "The Aftermath" has three parts: the damage, the conspiracy theories that blamed the UAE's cloud seeding for the floods, and the cloud-seeding programme itself. First drafts for now: figures to be checked and sources to be added. The page keeps a short Sources and limits (buildings, imagery, wind, rain and cloud); the full record is below.

## 4. Narrate

At each of the ten moments the panel on the right says what was happening: the airport's own words for the weather, a weather icon and the readings. A short news text can be added to each moment in `data/moments.json` (headline, text, source, url; set `placeholder` to false); it then shows under the readings. Photos and posts from X were tried and dropped (see NOTES.md).

## Sources and limits

- Buildings: Cesium OSM Buildings, made by Cesium from OpenStreetMap, © OpenStreetMap contributors, ODbL. Streamed from Cesium ion, not stored in the repository. Cartographic.
- Satellite imagery: the default Cesium ion imagery, credited on the globe, in its own colours (`COLOUR_IMAGERY` in `js/config.js` turns it back to black and white). Cartographic.
- Ground heights: Cesium World Terrain, from Cesium ion. Cartographic.
- Light: the sun's position over Dubai at each moment's time (CesiumJS's own sun model: modelled), so night moments are dark and buildings cast shadows when the sun is up. How much cloud and rain dim the light, darken the ground and sky, and fade the shadows was chosen by eye (`setLighting` in `js/viewer.js`): interpretive, not a measure of real light. The buildings keep a little glow of their own (`BUILDING_GLOW`) so they stay visible at night. The flat grey sky is a design choice.
- Wind, gusts, visibility, present weather: METAR reports from Dubai International Airport (OMDB, 25.25° N, 55.36° E), 15 April 00:00 to 17 April 00:00 2024 Dubai time (100 reports), from the Iowa Environmental Mesonet ASOS/METAR archive, Iowa State University, downloaded 2026-11-16. Observed. Decoded from the report text; knots to km/h; 9999 and CAVOK as "10 km or more"; variable wind drawn without arrows. No rain amounts in the reports.
- Rain (mm per hour) and cloud cover (low, mid, high): ERA5 hourly reanalysis (ECMWF, Copernicus Climate Change Service), via the Open-Meteo historical weather API (CC BY 4.0), grid cell 25.25° N, 55.25° E (about 28 km), downloaded 2026-11-16. Reanalysed. Contains modified Copernicus Climate Change Service information 2024. Each report takes the ERA5 hour it falls in. ERA5 gives about 122 mm for 15–16 April, with its heaviest rain later than the airport's.
- Saved in `data/april-2024.json` (about 50 KB) by `tools/fetch_april_2024.mjs`.
- Weather diagram (`js/effects.js`): small coloured symbols drawn from those numbers, the same across all of Dubai and Sharjah (`window.WEATHER_AREA` in `js/config.js`). Interpretive. Symbols are drawn in six rings centred under the camera, each twice as wide as the last with symbols twice the size, spacing and speed (the innermost about 1.5 times the camera height across; `RINGS`, `RING_FACTOR` in `js/effects.js`), so density on screen is about even whichever way the camera points and the work for the graphics card stays the same. Rings out of view or outside Dubai are skipped; outer-ring cloud is more see-through. Labels and the visibility ring are at the airport. How many symbols follows the numbers; where each starts is random (the same on every load). They move 4 times faster than real (`SPEED`), wrapping round the square; rain restarts at 1 km; cloud drifts with the 10 m wind. Wind: 2,500 golden-yellow arrows per ring (70 % opaque) scattered from 30 m to the cloud base at 1 km (measured at 10 m), 5 m per m/s. Rain: grey-blue 25 m streaks (70 % opaque) scattered below 1 km, 13,000 per ring at 50 mm/h (square-root scale), slanted along a drop falling 8 m/s. Cloud: see-through teal circles (15 % opaque, radius 30–150 m at random, facing the camera), 800 per band per ring at 100 % cover, scattered through low 1–2 km, mid 2–6 km and high 6–9 km. Visibility: dashed purple ring around the airport. All sizes are at the top of `js/effects.js`.
- Timeline: ERA5 rain per hour as grey-blue bars (reanalysed); ten airport reports as ticks, highlighted where they report rain (observed). The ten were chosen by hand (interpretive); the other 90 stay in the data file.
- The camera's turn round the airport (`window.AIRPORT_VIEW` in `js/config.js`: 4 km away, 14° down, 1° a second): chosen by hand, the same for every moment. It says nothing about the weather.
- The panel's "Airport:" line is the airport report's own weather code in plain words (observed).
- The weather icon in the panel: interpretive. It draws one airport report and one ERA5 cell as a picture: a cloud for each band with 15 % cover or more (larger for more cover), up to 8 rain streaks (square-root scale), 1 to 3 wind arrows, longer for stronger wind (they always point right; the direction is in the text), the visibility ring (full width = 10 km), and a sun when no band has 90 % cover or more. The sun is not in the 3D view; it only marks open sky.
- News texts: none yet. Each will give its source.
- No forecasts of the April 2024 storm yet.

This sketch cannot show yet forecasts of the storm, rain-gauge totals, or how the weather differed across the city: the airport is about 9 km from the Burj Khalifa, and the ERA5 cell is about 28 km across. OpenStreetMap building heights are incomplete and partly estimated.
