# Notes

Working notes for sketch 11. Read this first. Date each entry, and move items to Done when they ship.

## Next

- 2026-11-23: check the figures in The Aftermath (254.8 mm at Khatm Al Shakla, record since 1949, flight cancellations, deaths in the UAE and Oman, seeding since the 1990s, UAEREP since 2015) and add sources (publication, date, link) to each part; then remove the "Draft" line.
- 2026-11-23: optional: a short news text, with its source, for some of the ten moments, in data/moments.json.
- 2026-11-09: new direction: compare forecasts of the Dubai rain of 15–16 April 2024 over a 3D city model. See PLAN.md.
- Make a Cesium ion account and token limited to pardeewalmsley.github.io and localhost; paste it in js/config.js. The trial token expires with each CesiumJS release.
- Step 2 of PLAN.md: one forecast (GFS, run from 14 April) and IMERG on the timeline.

## Decisions

- 2026-11-23: second part of the project: the conspiracy theories about cloud seeding after the storm. Text below the map is now "The Aftermath" (The damage, Conspiracy theories, The UAE cloud-seeding program), drafted by Claude from widely reported facts and marked as a draft. Situate and Narrate sections removed from the page; the page's Sources and limits cut to buildings, imagery, METAR and ERA5. The full list stays in README.md.
- 2026-11-23: three more camera places, each circling slowly: Jumeirah Burj Al Arab (low, looking up; OSM has it as a plain block), Dubai Harbour (from above), Sharjah (over Khalid Lagoon). Weather area extended north and east (to 55.50° E, 25.42° N) so Sharjah has symbols; the weather there is still the Dubai airport report and the same ERA5 cell.
- 2026-11-23: panel trimmed: no byline (the name is in the footer and README), no line on why each moment was chosen (still in data/moments.json and read out by the timeline for screen readers), no Pause motion or About buttons. Motion still starts paused under reduced motion, but can no longer be paused by hand. Camera buttons' text centred.
- 2026-11-23: the Burj Khalifa view circles the tower like the airport view: low (about 265 m up), 1.9 km out, looking 5° up at 430 m on the tower (BURJ_VIEW). Button renamed "Airport".
- 2026-11-23: third camera view, Burj Khalifa (BURJ_VIEW in js/config.js, the old opening view: 2.7 km south-west of it, looking north-east, no turning). The three buttons are stacked at the top left of the map: All of Dubai, Airport view, Burj Khalifa.
- 2026-11-23: lighting follows the time of day: the sun (CesiumJS SunLight, clock set to each moment) lights the city, buildings cast shadows (shadow map, 6 km, soft; bias raised against stripes on flat roofs, using CesiumJS internals). Cloud and rain dim it: gloom = 0.65 × cover (low counts most) + 0.35 × rain (full at 10 mm/h); brightness = daylight × (1 − 0.65 × gloom) sets the light, the buildings' glow (0.07 at night to BUILDING_GLOW 0.25), imagery brightness and saturation, and the sky grey. Shadows fade out as cover goes from 20 % to 95 %. Night moments (00:00, 02:00, 19:10, 22:00) are dark, kept accurate on purpose (decided 2026-11-23). The icon's sun shows only while the sun is up. Replaces the light from the camera.
- 2026-11-23: layout: the weather icon is 96 px tall so the icon and readings fit in the panel without scrolling (checked at 1366 × 768). Airport view and All of Dubai moved to the top left of the map; Pause motion and About stay in the panel. On narrow screens the panel starts below those buttons.
- 2026-11-23: the camera circles the airport slowly (AIRPORT_VIEW: range 4 km, pitch -14°, 1°/s, starting looking north-east), aimed a little right so the airport sits in the map area the panel leaves free. Dragging or zooming stops it; Airport view flies back and restarts it; Pause motion stops it with the symbols; still under reduced motion. The timeline never moves the camera.
- 2026-11-23: the camera stays over the airport for all ten moments; the timeline changes only the weather. Opening view AIRPORT_VIEW in js/config.js (replaces START_VIEW, the Burj Khalifa view). Buttons: Airport view, All of Dubai. Places and camera views per moment removed from data/moments.json (they were: coast, airport, Creek and Deira, Sheikh Zayed Road, Dubai Marina, Al Barsha, Downtown, Business Bay, Mirdif, airport after).
- 2026-11-23: weather icon: wind arrows always point right (direction only in the text), no north marker; all symbols overlap and the whole icon is centred in its frame, whatever it holds. Sun at full colour.
- 2026-11-23: the weather graphic redrawn as a weather-app style icon, after reference images: outlined clouds per band (high pale at the back, low teal in front), thick rain streaks under the front cloud, 1–3 bold wind arrows, the visibility ring, and a pale yellow sun when the sky is not fully covered. The key uses the same small symbols.
- 2026-11-23: weather graphic in the panel: the 3D view's symbols layered in one small picture from each moment's numbers (cloud circles in three bands, wind arrows north up, rain streaks slanted by the east–west wind, visibility ring up to 10 km wide). The key uses a small version of each symbol instead of a coloured line. Kept still, not animated (decided 2026-11-23).
- 2026-11-23: photos and X posts dropped from the panel. X embeds were blocked in Edge (tracking prevention) and in other browsers with strict privacy or ad blockers, the posts found did not match the moments' times, and copied videos can't be published (rights, and no video files in git). The panel now shows the place, why the moment was chosen, the airport's weather in words and the readings with the key (moved up from the timeline). Optional news text (headline, text, source, url) stays in data/moments.json and shows under the readings once filled in. The X posts found, in case they are useful later:
  - 2024-04-15T00:00 https://x.com/mehroseahmed/status/1779901981500244270
  - 2024-04-15T18:11 https://x.com/mudasar_khan7/status/1779895040694726966
  - 2024-04-16T02:00 https://x.com/dxbmaven/status/1780247336498716882
  - 2024-04-16T07:18 https://x.com/uroojjawed12/status/1780215464062337378
  - 2024-04-16T08:40 https://x.com/weatherwalay/status/1780211159968219436
  - 2024-04-16T12:00 https://x.com/AbuBakar_Kohati/status/1780224142282793092
  - 2024-04-16T15:11 https://x.com/uroojjawed12/status/1780215464062337378
  - 2024-04-16T18:40 https://x.com/dxbmaven/status/1780247336498716882
  - 2024-04-16T19:10 https://x.com/h_dwtc/status/1780312073815093446
  - 2024-04-16T22:00 https://x.com/ObscureHidden/status/1780312763883233455
- 2026-11-16: posts from X can be shown in the news panel in place of the photo: a `post` field (the post's address) in each moment in data/moments.json. Embedded with X's script, loaded only when needed, dnt on; a link is shown if the post or script can't load. No video files are copied into the sketch.
- 2026-11-16: buildings white, not grey: a custom shader gives them their own glow (BUILDING_GLOW = 0.6 in js/config.js; 0 = grey sides as before, 1 = flat white) on top of the light from the camera, so a little shading still shows their shapes.
- 2026-11-16: satellite imagery in colour (COLOUR_IMAGERY = true in js/config.js; false for black and white as before). Buildings stay white, sky grey. Golden-yellow wind arrows blend into the sandy ground inland; they stand out over the sea.
- 2026-11-16: title changed to Mapping the extreme rain event in Dubai, April 2024 (panel, page title, README header, footer). Folder name 11-tropical-depression kept: sketch folders are never renamed.
- 2026-11-16: narrative: at each of the ten moments the camera flies (3 s) to a place in the city chosen by hand: coast, airport, Creek and Deira, Sheikh Zayed Road, Dubai Marina, Al Barsha, Downtown, Business Bay, Mirdif, airport after. The moments (time, why, place, camera, news) moved from js/weather.js into data/moments.json so the story can be edited without code. Play shows each for 7 s.
- 2026-11-16: the right panel is now the news panel, titled "Mapping the extreme rain event in Dubai, April 2024": place, photo (placeholder box), headline, text, source. The weather key with values moved into the timeline, under the buttons. Buttons in the panel: Pause motion, This view (back to the moment's camera), All of Dubai, About.
- 2026-11-16: rings around the camera instead of one square around the point looked at: density changed as the camera tilted (the zoom step followed the distance to the point at the screen's centre, and looking at the sky had no such point). Now six rings centred under the camera, each twice as wide, symbols twice the size, spacing and speed; the innermost half-width is about 1.5 times the camera height (RING_FACTOR), steps -2 to 5. Per ring: 2,500 arrows, 13,000 rain streaks, 800 circles per cloud band. Rings wholly out of view (Cesium's culling volume) or outside WEATHER_AREA are skipped; the graphics card drops the rest outside the view. Measured: 2–4 ms page work per frame looking down, level, up and over all of Dubai; about 590,000 vertices per frame close in. Seams where the symbol size doubles between rings.
- 2026-11-16: weather over all of Dubai (WEATHER_AREA in js/config.js: 55.03–55.45 E, 24.93–25.33 N), not only the Burj Khalifa block. To keep the graphics card's load the same, only a square around where the camera looks is drawn and repeated as a pattern (4 km across close in, centred 70 % of the way from the camera to the point it looks at), with 4 times the old counts (5,000 arrows, 26,000 rain streaks, 1,600 circles per cloud band). Zoomed out, sizes, spacing and speed double in steps up to 32 times (BASE_DISTANCE, MAX_STEP in js/effects.js), and cloud fades by 1/(1 + step) so the city shows through at full cover. Labels, in one stack, and the visibility ring moved to the airport. Two view buttons: Burj Khalifa and All of Dubai (DUBAI_VIEW). Measured: 2–5 ms of page work per frame, close and wide. Drawing the same density over all of Dubai at once would have needed about 400 times as many symbols.
- 2026-11-16: the synthetic heavy-rain case is replaced by the real storm, 15 April 00:00 to 17 April 00:00 Dubai time: wind, gusts, visibility and present weather from the 100 Dubai airport METAR reports (Iowa Environmental Mesonet, observed); rain and cloud from ERA5 hourly via Open-Meteo, cell 25.25 N 55.25 E (reanalysed). The METARs give no rain amounts. Saved in data/april-2024.json by tools/fetch_april_2024.mjs.
- 2026-11-16: timeline along the bottom of the map: ERA5 rain bars and ten key airport reports, chosen by hand with a reason each (KEY_MOMENTS in js/weather.js): calm before 15 Apr 00:00, first thunderstorm 18:11, night storm 16 Apr 02:00, first squall 07:18, morning downpour 08:40, lull 12:00, worst visibility 15:11 (400 m), strongest squall 18:40 (gusts 87 km/h), storm passes 19:10, clear but ERA5 still raining 22:00. First tried all 100 reports, too many; a ranking rule (heaviest, lowest visibility, two hours apart) missed the squalls and the lull. Clicking snaps to the nearest moment; Play 4 s each; opens at 15:11. The other 90 reports stay in data/april-2024.json.
- 2026-11-15: the live Open-Meteo weather was removed and never committed; it used api.open-meteo.com/v1/forecast at 25.25 N, 55.36 E (current conditions).
- 2026-11-15: view and diagram focus on a 2 km square around the Burj Khalifa (window.FOCUS and START_VIEW in js/config.js). The camera starts outside the square and above the arrows: inside it, near symbols looked huge.
- 2026-11-15: symbols small, dense and scattered at random through the air, not in grids or layers: 1,250 wind arrows below 1 km, up to 6,500 rain streaks below 1 km, up to 400 cloud circles per band (dashes until 2026-11-16) (1–2, 2–6, 6–9 km). Counts follow the numbers; positions are random but seeded, so the same each load. Sizes and counts at the top of js/effects.js.
- 2026-11-15: the weather is a diagram, not a look-alike: wind arrows (#e8b100 golden yellow since 2026-11-16, was #ff6a00), rain streaks (#4a6fa5 grey-blue since 2026-11-16, was #0050ff), cloud #00a3b4 circles, visibility #b000b0 ring. Replaces the 2026-11-10 rain particles, cloud billboards and fog haze.
- 2026-11-10: live weather from Open-Meteo (no key, works from the browser); removed 2026-11-15, see above. The airport METAR from aviationweather.gov is blocked for web pages (CORS); reading it would need a small server or a scheduled GitHub Action that saves it to the sketch.
- 2026-11-15: symbols move (SPEED at the top of js/effects.js; 4 times real speed since 2026-11-15, first tried at half speed, which barely showed): arrows downwind, rain along its slant, cloud with the 10 m wind. They wrap round the square; rain restarts at 1 km. Pause/Play button; starts paused with prefers-reduced-motion.
- 2026-11-16: wind golden yellow and rain grey-blue, more storm-like; both 70 % opaque (WIND.opacity, RAIN.opacity), so all symbols now draw in the translucent pass. The wind label's text is darker gold (#8a6a00) to read on white. Timeline rain bars match the rain colour.
- 2026-11-16: cloud as see-through teal circles (15 % opaque, soft edge, radius 30–150 m at random, facing the camera), 400 per band at 100 % cover, instead of dashes: overlapping circles read as cover. Drawn by the graphics card in the translucent pass, not writing depth. CLOUD at the top of js/effects.js.
- 2026-11-15: the moving symbols are drawn by the graphics card (a custom DrawCommand and shader in js/effects.js), not as Cesium polylines: moving 12,000 polylines from JavaScript took about 340 ms a frame, the shader about 10–15 ms. It uses undocumented CesiumJS parts (DrawCommand, VertexArray, ShaderProgram, Buffer, RenderState, Pass): check it after any CesiumJS update.
- 2026-11-15: arrows are drawn as plain lines: Cesium's PolylineArrow drew black boxes around short arrows on light ground.
- 2026-11-10: the globe draws only when something moves (requestRenderMode), at most 30 frames a second. While the symbols play it draws continuously; paused, only when the camera moves.
- 2026-11-09: CesiumJS 1.146.0 from the jsDelivr CDN, no build step. Cesium OSM Buildings in white, imagery in grey, lit from the camera.
- 2026-11-09: the city, ground and sky stay grey; the weather layers will be in colour so they stand out. (Ground now in colour, 2026-11-16.)
- 2026-11-16: one small panel at the right of the map, not two: title, name, a key line per symbol with its value, Pause, Back to Dubai, About. Clicking the title folds it. It sits just below the header (measured, since the header wraps on narrow windows). The introduction, the meaning of each symbol and the map credits moved below the map under "About this view". Temperature and humidity are no longer shown, since nothing draws them.
- 2026-11-09: the globe fills the window, with the header on top; the rest of the page sits below it.
- 2026-11-09: title changed to Forecasting the Dubai rain, April 2024; folder name kept until the number question is settled.

## Questions

- 2026-11-23: Sharjah gets Dubai airport's weather. Sharjah has its own airport (OMSJ) with METAR reports; worth showing those there?
- 2026-11-23: with Pause motion gone, the moving symbols and turning camera can't be stopped by hand (only by the computer's reduce-motion setting). Fine, or bring back a small pause control?
- 2026-11-16: colour satellite imagery: check with a facilitator against the shared colour rule ("no colour except the source colours of scientific imagery"). Colour imagery is arguably its own source colours.
- 2026-11-16: wind arrows are hard to see on sandy ground; darker outline, or another colour?
- 2026-11-16: the pattern rearranges when the camera climbs or drops past a step; is that jump acceptable?
- 2026-11-16: symbols double in size where one ring meets the next; is the seam noticeable? A cross-fade between rings would hide it.
- 2026-11-16: grey-blue rain at 70 % is subtle against the grey city; stronger, or keep it quiet?
- 2026-11-16: low cloud (1–2 km) is thinner on screen than mid cloud (2–6 km), whose band is four times as deep; each band has the same number of circles at 100 %; should deeper bands get more?
- 2026-11-16: ERA5 rain peaks about 14:00–22:00 on 16 April, the airport's heaviest rain about 08:00–19:00. Show this mismatch more clearly (e.g. a second row on the timeline), or add a gauge or IMERG?
- 2026-11-16: the observed total at Dubai airport: find a citable figure (NCM, WMO or ISD) to set against ERA5's ~122 mm.
- 2026-11-16: use the observed cloud layers in the METARs (FEW/SCT/BKN/OVC with heights) instead of ERA5 cloud?
- 2026-11-16: the 3D labels at the airport repeat the panel; keep them?
- 2026-11-15: arrowheads are only a few pixels across from the start view; bigger heads, or thicker arrows?
- 2026-11-15: cloud starts at 1 km, above the start view: tilt up to see it. Should the start view show it?
- 2026-11-15: at 4 times real speed, is the movement right? The speed is the same near and far, so far symbols look slower.
- 2026-11-15: check the movement is smooth in a normal browser and on a laptop; the browser pane in Claude's app draws only 1–2 frames a second.
- Should the weather vary across the city (e.g. a grid of points from Open-Meteo) rather than one value for all of Dubai?
- Keep the Dubai work in sketch 11 (folder name says tropical-depression) or ask a facilitator for a new number?
- Which models did your sources find right or wrong, and at what lead time?
- Are AIFS runs from April 2024 in the ECMWF open data archive?
- Will the UAE National Center of Meteorology share gauge or WRF data?
- Greyscale rain, or a standard rain colour scale? Check with a facilitator.

## Done

- 2026-11-02: started from the template.
- 2026-11-02: first page with a draft question, a synthetic swirl and Sources and limits.
- 2026-11-09: PLAN.md written.
- 2026-11-09: step 1: Cesium globe over Dubai with OSM buildings and a Back to Dubai button.
- 2026-11-09: own Cesium ion token added; grey sky; full-window globe with a full-screen button.
- 2026-11-10: semi-transparent title panel; live weather panel; rain, clouds and fog effects with synthetic examples.
- 2026-11-15: weather redrawn as a schematic diagram (arrows, lines, hatching, ring) with a colour key in the weather panel.
- 2026-11-15: heavy rain only; view tightened on the Burj Khalifa block; smaller, denser symbols.
- 2026-11-15: symbols scattered at random through the scene instead of grids and flat layers.
- 2026-11-15: symbols move, drawn by the graphics card; Pause/Play button; sped up to 4 times real speed.
- 2026-11-16: the two overlays merged into one small, foldable panel at the right; longer text moved below the map.
- 2026-11-16: real April 2024 weather (airport METARs and ERA5) with a timeline at the bottom of the map.
- 2026-11-16: timeline cut to ten key moments, each with its reason.
- 2026-11-16: cloud drawn as overlapping see-through circles.
- 2026-11-16: wind golden yellow, rain grey-blue, both slightly see-through.
- 2026-11-16: weather over all of Dubai, drawn around the camera; All of Dubai view; labels and ring at the airport.
- 2026-11-16: symbols in rings around the camera: even density whichever way it points; only rings in view drawn.
- 2026-11-16: camera flies to a new place at each moment; news panel with placeholders; key moved into the timeline.
- 2026-11-16: sketch renamed Mapping the extreme rain event in Dubai, April 2024.
- 2026-11-16: satellite imagery in colour.
- 2026-11-16: buildings white instead of grey.
- 2026-11-16: post field and X embed in the news panel.
- 2026-11-23: readings, key and moment description moved into the side panel; photo box and X embeds removed.
- 2026-11-23: weather graphic and symbol key in the side panel.
- 2026-11-23: weather graphic redrawn as a layered weather icon.
- 2026-11-23: weather icon centred, overlapping, fixed wind arrows, no north marker.
- 2026-11-23: camera fixed over the airport; timeline changes only the weather.
- 2026-11-23: slow camera turn round the airport.
- 2026-11-23: smaller weather icon; camera buttons at the top left of the map.
- 2026-11-23: time-of-day sunlight and shadows, dimmed by cloud and rain.
- 2026-11-23: Burj Khalifa view; camera buttons stacked at the top left.
- 2026-11-23: camera circles the Burj Khalifa, looking up; Airport button renamed.
- 2026-11-23: panel trimmed (byline, moment line, Pause motion, About removed); camera button text centred.
- 2026-11-23: more space in the panel (padding, gaps around the icon and between readings); still fits without scrolling at 1366 × 768.
- 2026-11-23: Jumeirah Burj Al Arab, Dubai Harbour and Sharjah views; weather area extended to Sharjah.
- 2026-11-23: no jump between the flight to a place and the start of its turning (the flight now ends at the turning's exact first view, including the small turn clear of the panel).
- 2026-11-23: text below the map restructured as The Aftermath (draft); Situate and Narrate removed; short Sources and limits.
