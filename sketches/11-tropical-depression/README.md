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

So far: a 3D globe (CesiumJS) filling the window and opening over Dubai, with OpenStreetMap buildings, colour satellite imagery, a flat grey sky, and sunlight and shadows for each moment's time of day, dimmed by its cloud and rain. A timeline of ten key moments runs along the bottom; the camera circles Dubai International Airport very slowly (once round in 6 minutes), where the reports come from, and only the weather changes. Dragging or zooming the map stops the turning; the Airport button starts it again. A panel on the right shows the airport's weather report and the readings for wind, rain, cloud and visibility, each with its symbol as the key. Buttons at the top left of the map fly the camera to All of Dubai, the Airport, the Burj Khalifa, Jumeirah Burj Al Arab, Atlantis The Palm or Sharjah; at each place but All of Dubai it circles slowly (at the two towers from low down, looking up). The places and views were chosen by hand (`js/config.js`). Over the whole city, from Jebel Ali to Deira and the airport, the storm of 15–16 April 2024 drives a diagram of small coloured symbols for wind, rain, cloud and visibility (`js/weather.js`, `js/effects.js`). A timeline along the bottom steps through ten key moments, chosen by hand from Dubai airport's 100 weather reports of those two days (observed wind and visibility), with ERA5 rain and cloud for each hour (reanalysed); Play moves from one to the next. The ten and their reasons are in `data/moments.json`. The data is in `data/april-2024.json`; `node tools/fetch_april_2024.mjs` downloads it again. Next: rain from several forecast models, played over time, compared with satellite and rain-gauge observations (see `PLAN.md`).

Two tabs at the top of the map. **Visualisation**: the weather symbols above, the camera circling each place at an angle. **Simulation** (`js/airflow.js`, switched by `js/modes.js`): the symbols hidden, and round each of the five places a circle 800 m across holding an airflow simulation at street level (lattice Boltzmann), seen from straight above (SIM_VIEW in `js/config.js`). The wind enters from the direction ERA5 gives (10 m above the ground, the nearest hour to each moment) and yellow streaks follow it round the OpenStreetMap building outlines. On the Simulation tab, All of Dubai looks straight down on the whole city, high enough to show every circle, each marked from that height by a ring and its name. Switching tabs flies to the other view of the same place. A link ending in `#simulation` opens on the Simulation tab. Modelled and indicative: see Sources and limits.

## 3. Situate

Below the map, a short placeholder text says what the map shows, with a short note on each tab. ("The Aftermath", the earlier text on the damage, the cloud-seeding conspiracy theories and the cloud-seeding programme, was taken off the page on 2026-11-27; it is in the git history.) The page keeps a short Sources and limits; the full record is below.

## 4. Narrate

At each of the ten moments the panel on the right says what was happening: the airport's own words for the weather and the readings, each with its symbol from the map. A short news text can be added to each moment in `data/moments.json` (headline, text, source, url; set `placeholder` to false); it then shows under the readings. Photos and posts from X were tried and dropped (see NOTES.md).

## Sources and limits

- Buildings: Cesium OSM Buildings, made by Cesium from OpenStreetMap, © OpenStreetMap contributors, ODbL. Streamed from Cesium ion, not stored in the repository. Cartographic.
- Satellite imagery: the default Cesium ion imagery, credited on the globe, in its own colours (`COLOUR_IMAGERY` in `js/config.js` turns it back to black and white). Cartographic.
- Ground heights: Cesium World Terrain, from Cesium ion. Cartographic.
- Light: the sun's position over Dubai at each moment's time (CesiumJS's own sun model: modelled), so night moments are dark and buildings cast shadows when the sun is up. How much cloud and rain dim the light, darken the ground and sky, and fade the shadows was chosen by eye (`setLighting` in `js/viewer.js`): interpretive, not a measure of real light. The buildings keep a little glow of their own (`BUILDING_GLOW`) so they stay visible at night. The flat grey sky is a design choice.
- Visibility and present weather: METAR reports from Dubai International Airport (OMDB, 25.25° N, 55.36° E), 15 April 00:00 to 17 April 00:00 2024 Dubai time (100 reports), from the Iowa Environmental Mesonet ASOS/METAR archive, Iowa State University, downloaded 2026-11-16. Observed. Decoded from the report text; 9999 and CAVOK as "10 km or more". The reports also give the wind (knots, converted to km/h), kept in the data but not shown: the map uses ERA5's wind. No rain amounts in the reports.
- Rain (mm per hour), cloud cover (low, mid, high) and, for the simulation, wind 10 m above the ground (added 2026-11-27; the nearest hour to each moment, used for the symbols, the panel and the simulation on both tabs, instead of the airport's wind): ERA5 hourly reanalysis (ECMWF, Copernicus Climate Change Service), via the Open-Meteo historical weather API (CC BY 4.0), grid cell 25.25° N, 55.25° E (about 28 km), downloaded 2026-11-16. Reanalysed. Contains modified Copernicus Climate Change Service information 2024. Each report takes the ERA5 hour it falls in. ERA5 gives about 122 mm for 15–16 April, with its heaviest rain later than the airport's.
- Saved in `data/april-2024.json` (about 50 KB) by `tools/fetch_april_2024.mjs`.
- Weather diagram (`js/effects.js`): small coloured symbols drawn from those numbers, the same across all of Dubai and Sharjah (`window.WEATHER_AREA` in `js/config.js`). Interpretive. Symbols are drawn in six rings centred under the camera, each twice as wide as the last with symbols twice the size, spacing and speed (the innermost about 1.5 times the camera height across; `RINGS`, `RING_FACTOR` in `js/effects.js`), so density on screen is about even whichever way the camera points and the work for the graphics card stays the same. Rings out of view or outside Dubai are skipped; outer-ring cloud is more see-through. Labels and the visibility ring are at the airport. How many symbols follows the numbers; where each starts is random (the same on every load). They move 4 times faster than real (`SPEED`), wrapping round the square; rain restarts at 1 km; cloud drifts with the 10 m wind. Wind: 2,500 golden-yellow arrows per ring (70 % opaque) scattered from 30 m to the cloud base at 1 km (measured at 10 m), 5 m per m/s. Rain: grey-blue 25 m streaks (70 % opaque) scattered below 1 km, 13,000 per ring at 50 mm/h (square-root scale), slanted along a drop falling 8 m/s. Cloud: see-through teal circles (15 % opaque, radius 30–150 m at random, facing the camera), 800 per band per ring at 100 % cover, scattered through low 1–2 km, mid 2–6 km and high 6–9 km. Visibility: dashed purple ring around the airport. All sizes are at the top of `js/effects.js`.
- Timeline: ERA5 rain per hour as grey-blue bars (reanalysed); ten airport reports as ticks, highlighted where they report rain (observed). The ten were chosen by hand (interpretive); the other 90 stay in the data file.
- The camera's turn round the airport (`window.AIRPORT_VIEW` in `js/config.js`: 4 km away, 14° down, 1° a second): chosen by hand, the same for every moment. It says nothing about the weather.
- The panel's "Airport:" line is the airport report's own weather code in plain words (observed).
- News texts: none yet. Each will give its source.
- Building outlines for the simulation: OpenStreetMap, © OpenStreetMap contributors, ODbL 1.0, through the Overpass API; a square 800 m across around each place (the airport's centred on Terminal 3 and Concourse B, 25.2470° N, 55.3605° E, as the camera's airport point is on open apron), outlines only, including airport terminals tagged aeroway=terminal. Saved in `data/footprints.json` by `tools/fetch_footprints.mjs` on 2026-11-27. Cartographic.
- Airflow (`js/airflow.js`, Simulation tab): lattice Boltzmann model (D2Q9, BGK collision, relaxation time 0.56) on a 200 × 200 grid of 4 m cells, buildings as solid walls (bounce-back), undisturbed wind at the edges. Modelled, indicative only: a flat slice with no heights or air over the roofs; the simulated air is far slower and smoother than the storm (low Reynolds number), so it shows patterns, not real speeds or gusts; every place gets the same ERA5 wind 10 m above the ground at the nearest hour (reanalysed, one grid cell about 28 km across, so the storm's gusts and squalls are smoothed out; often weaker than the airport's and from another direction); the incoming speed is scaled from it only to show stronger and weaker wind; the flow restarts from an even flow whenever the wind changes.
- No forecasts of the April 2024 storm yet.

This sketch cannot show yet forecasts of the storm, rain-gauge totals, or how the weather differed across the city: the airport is about 9 km from the Burj Khalifa, and the ERA5 cell is about 28 km across. OpenStreetMap building heights are incomplete and partly estimated.
