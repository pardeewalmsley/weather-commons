// Settings for the globe. Edit these, not viewer.js.

// Cesium ion access token (account pardee_walmsley, token "Dubai_Rainfall"). Leave empty to use the trial
// token built into CesiumJS. Limit the token to the sites that use it (pardeewalmsley.github.io and
// localhost) in the Cesium ion dashboard: a token limited this way is meant to sit in a public page.
// Never put a password here.
window.CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IkZ6a3ZCc2UyN0ZyZldDMXoiLCJqdGkiOiI1NWViZjFiMi1mZTNhLTRmNzgtODkxNS00NmNmOWM3MjVlNDMiLCJpZCI6MTc3NDE2LCJzdWIiOiJwYXJkZWVfd2FsbXNsZXkiLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoiRHViYWlfUmFpbmZhbGwiLCJpYXQiOjE3OTQyNTY5NDB9.s07Py4OdQrZM_hDxz7uDC5myCrCsBY_qjp0oRtBPONo';

// The satellite imagery under the city: true for its own colours, false for black and white.
window.COLOUR_IMAGERY = true;

// How much light the buildings give off themselves in full daylight: 0 for lit only by the sun (sides away from
// it grey, shadows strong), up to 1 for flat white with no shading or shadows. At night it drops to 0.07.
window.BUILDING_GLOW = 0.25;

// The weather is shown over all of Dubai and Sharjah, from Jebel Ali in the south-west to Deira, the airport and
// Sharjah in the north-east (degrees). Outside this, no symbols are drawn.
window.WEATHER_AREA = { west: 55.03, south: 24.93, east: 55.50, north: 25.42 };

// Where the airport reports come from: Dubai International Airport. Labels and the visibility ring sit here.
window.AIRPORT = { lon: 55.364, lat: 25.253 };

// Symbols are drawn in rings centred under the camera (see js/effects.js). `half`: half the width of a ring
// whose symbols are at their own size; rings closer in are smaller, with smaller symbols, and rings further out
// larger. lon, lat: the point all positions are measured from, the Burj Khalifa.
window.FOCUS = { lon: 55.2744, lat: 25.1972, half: 2000 };

// The camera views, with a button each (top left of the map). The timeline never moves the camera: only the weather changes.
// Airport (the opening view): the camera circles Dubai International Airport, where the reports come from,
// always looking at it. range: metres from the airport; pitch: degrees below level; heading: the direction it
// starts looking (42 = north-east); degreesPerSecond: how fast it turns (1 = once round in 6 minutes).
// All of Dubai: high to the south-west, looking north-east over the city to the airport; no turning.
// Burj Khalifa: the camera circles the tower in the same way, low down and looking up at it. lon, lat: the
// tower; aim: the height on the tower it looks at (metres; the top is 828 m); pitch above 0 looks up.
window.AIRPORT_VIEW = { range: 4000, pitch: -14, heading: 42, degreesPerSecond: 1 };
window.BURJ_VIEW = { lon: 55.2744, lat: 25.1972, aim: 430, range: 1900, pitch: 5, heading: 42, degreesPerSecond: 1 };
// Jumeirah Burj Al Arab: low down, looking up at the hotel (321 m high). Dubai Harbour: from above, looking down
// over the marina between Palm Jumeirah and JBR. Sharjah: over the city centre and Khalid Lagoon, as at the airport.
window.BURJ_AL_ARAB_VIEW = { lon: 55.1853, lat: 25.1412, aim: 200, range: 1600, pitch: 2, heading: 60, degreesPerSecond: 1 };
window.HARBOUR_VIEW = { lon: 55.1405, lat: 25.0925, aim: 0, range: 2600, pitch: -22, heading: 300, degreesPerSecond: 1 };
window.SHARJAH_VIEW = { lon: 55.3960, lat: 25.3470, aim: 0, range: 4000, pitch: -14, heading: 30, degreesPerSecond: 1 };
window.DUBAI_VIEW = { lon: 55.10, lat: 24.95, height: 14000, heading: 38, pitch: -30 };
