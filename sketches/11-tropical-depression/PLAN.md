# Plan: comparing forecasts of the Dubai rain, April 2024

Draft, 2026-11-09. A technical structure for the sketch, to be checked and changed as the research goes.

## The idea

On 15–16 April 2024 the UAE had its heaviest rain since records began in 1949. Dubai airport recorded well over a year's rain in about a day, and the city flooded. Some forecast models saw it coming days ahead; others missed or underplayed it. This sketch puts several of those forecasts side by side over a 3D model of Dubai, next to what was observed, so you can see who predicted what, how early, and how sure they were.

The question: *what did each model see, and when?*

## What kind of material each layer is

| Layer | Kind |
| --- | --- |
| Forecasts from each model | modelled |
| Satellite rain estimate (GPM IMERG) | observed (satellite estimate, itself partly modelled) |
| Rain gauges (Dubai airport and others) | observed |
| ERA5 | reanalysed |
| 3D buildings and terrain | cartographic |
| Smoothing a coarse grid onto the city, colour scales, heights | interpretive |

The page labels each layer this way, and so does the README.

## A limit to say early

Global models work on grids of about 9–28 km. At 0.25° (about 28 km) the whole of Dubai is only a handful of cells. So the 3D city shows where the forecasts fell, not street-level detail. That coarseness is part of the story. Show the storm at two scales: the region (UAE and Oman) to see its shape, and the city to see what each model gave Dubai.

## Data

### Forecasts (modelled)

Download past forecasts issued about 1, 3 and 5 days before the event (runs from 10–15 April 2024). For each model, take total precipitation every 3 or 6 hours.

| Model | Who | Where to get past runs | Open? |
| --- | --- | --- | --- |
| GFS (deterministic, 0.25°) | NOAA, USA | NOAA GFS archive on AWS (`noaa-gfs-bdp-pds`) | yes, public domain |
| GEFS (ensemble, 31 members) | NOAA | NOAA GEFS on AWS (`noaa-gefs-pds`) | yes |
| IFS HRES (0.25° open data) | ECMWF, Europe | ECMWF open data archive on AWS (`ecmwf-forecasts`) | yes, CC BY 4.0 |
| IFS ENS (ensemble, 51 members) | ECMWF | same | yes |
| AIFS (ECMWF's machine-learning model) | ECMWF | same, if 2024 runs are there (check) | yes |
| GraphCast, Pangu-Weather, FourCastNet | Google DeepMind, Huawei, NVIDIA | not archived: rerun with ECMWF's `ai-models` tool on a GPU from IFS or ERA5 starting data | open code, varying licences |
| ICON, UK Met Office, others | DWD, Met Office … | TIGGE archive (ensembles, research use) or ask the centre | research licence |
| WRF (optional, ~2–3 km over UAE) | you, driven by GFS or ERA5 | run yourself | open code |

Which models got it right or wrong should come from your sources (published studies, centre reports). The table only says what can be downloaded. The full-resolution IFS (9 km) is not open; the open data is 0.25°.

### Observations

- **GPM IMERG Final** (NASA): satellite rain estimate, 0.1°, every 30 minutes. Free with a NASA Earthdata login. Observed (satellite estimate).
- **Station data**: Dubai International and other UAE stations from NOAA's Integrated Surface Database (ISD). Hourly, open. Observed. The UAE National Center of Meteorology (NCM) has a denser network; ask them for data.
- **ERA5** (Copernicus): hourly, 0.25°, CC BY 4.0, via the Climate Data Store (`cdsapi`). Reanalysed, for context.

### City and ground (cartographic)

| Option | What | Licence and cost |
| --- | --- | --- |
| Cesium OSM Buildings | every building from OpenStreetMap, with heights; Dubai is well covered | ODbL; free Cesium ion account |
| Google Photorealistic 3D Tiles | textured mesh of the real city, via Cesium ion or Google's Map Tiles API | Google's terms: show attribution, no downloading or saving tiles; free quota |
| Overture Maps buildings | open building footprints and heights, to make your own tiles | ODbL / CDLA |
| Cesium World Terrain | ground heights; Dubai is flat, so it matters little | free ion account |

Start with Cesium OSM Buildings. It is open, plain grey and fits the black-and-white look. Google tiles look striking but come with stricter terms and colour photos.

## Viewer: CesiumJS, and the alternatives

**Recommended: CesiumJS.** It is a 3D globe in the browser with real coordinates, it streams 3D city tiles, and it has a built-in clock and timeline for playing through forecast hours. It can also split the screen between two layers with a slider (`splitDirection`), which suits comparing two models.

Other options:

- **deck.gl with MapLibre**: lighter and quick for coloured grids and extruded columns, with 2.5D buildings. A good choice if the globe and photoreal city are not needed.
- **three.js with `3d-tiles-renderer`**: full control over the look, but more code to write.
- **iTowns**: open-source and similar to Cesium, with a smaller community.

## Libraries

Web page (loaded from a CDN, at fixed versions, no build step to begin with):

- **CesiumJS**: globe, city, timeline.
- **Observable Plot**: small black-and-white charts, such as rain over time at the airport for each model against the gauge.
- Plain JavaScript for the rest.

Data preparation (Python scripts in `tools/`, run on your computer, not by the page):

- `herbie-data`: download GFS, GEFS and ECMWF open-data files by date.
- `xarray`, `cfgrib` (with `eccodes`), `numpy`: read the forecast files, cut out the region, add up rain totals.
- `earthaccess`: download IMERG from NASA.
- `cdsapi`: ERA5.
- `Pillow`: turn grids into greyscale PNG images for the globe.
- Optional: `ai-models` and its GraphCast or Pangu plug-ins, to rerun the machine-learning models (needs a GPU).

## How the page shows the comparison

1. **A map of each model** over the region and city, one image per forecast hour, played on Cesium's timeline. Rain totals in a single grey or white scale.
2. **Split slider**: two models at once, or a model against IMERG.
3. **Small multiples**: a grid of small views, one per model, all at the same moment.
4. **Columns over the city** (optional): rain total as height at each grid cell.
5. **Lead time**: a control to pick the forecast issued 5, 3 or 1 day before. Did a model see it early, or only at the last minute?
6. **Ensemble spread**: for GEFS and ENS, the share of members forecasting more than, say, 50 mm.
7. **Chart**: rain added up over time at Dubai airport, one line per model plus the gauge.
8. **Simple scores**: total at the airport against the gauge, the highest value in the region, and how far the heaviest rain sat from where it really fell.

The colour rule ("no colour except the source colours of scientific imagery") suggests greyscale rain. Check with a facilitator if you want a standard rain colour scale.

## Folder structure

```
sketches/11-…/
  index.html          page: Event, Simulate, Situate, Narrate, Sources and limits
  style.css           shared look
  js/
    viewer.js         Cesium setup: camera over Dubai, buildings, timeline
    layers.js         loads each model's images for the chosen run and hour
    compare.js        split slider, small multiples, lead-time control
    charts.js         Observable Plot charts
  data/
    manifest.json     list of models, runs, hours, files, units, kind of material
    gfs/2024-04-14T00/tp_006.png …     rain images (region, small)
    ifs/…  aifs/…  gefs/…  imerg/…
    stations.json     gauge readings
    points.json       rain over time at chosen points, for the charts
  tools/
    requirements.txt
    fetch_gfs.py  fetch_ecmwf.py  fetch_imerg.py  fetch_stations.py
    make_layers.py    crop, accumulate, write PNG images and JSON
  assets.json         raw downloads on Box (lab members) or links to their sources
  README.md  NOTES.md  PLAN.md
```

Raw forecast files (GRIB) are large: keep them out of git. Put them on Box with `node scripts/assets.mjs add`, or keep them locally and rely on the fetch scripts to download them again. Only the small images and JSON go in git. Budget: about 6 models × 3 runs × 20 hours × ~30 KB ≈ 11 MB, within the 50 MB limit.

## Keys and tokens

Cesium ion and Google need an access token in the page. It is visible to anyone, so restrict it in the ion dashboard to `pardeewalmsley.github.io` and `localhost`. Never commit a NASA Earthdata or Copernicus password: those stay in your own `.netrc` / `.cdsapirc`, outside the repository.

## Steps

1. Done 2026-11-09: page with a Cesium globe, flying to Dubai, OSM buildings, Sources and limits.
2. One forecast (GFS, run from 14 April) and IMERG on the timeline.
3. Add IFS, AIFS and the ensembles; the lead-time control.
4. Split slider, small multiples, charts at the airport.
5. Machine-learning reruns or WRF, if there is time and a GPU.
6. Situate and Narrate: who forecasts for the Gulf and with which tools, the flooding, the cloud-seeding claims and the NCM's denial, the World Weather Attribution study on climate change.

## To check

- Which models your sources say got it right or wrong, and at what lead time.
- Whether AIFS runs from April 2024 are in the ECMWF open data archive.
- Whether the NCM will share gauge or WRF data.
- Exact observed totals at Dubai airport, from ISD and NCM.
- Whether to keep this in sketch 11 or ask a facilitator for a new number (see NOTES).
