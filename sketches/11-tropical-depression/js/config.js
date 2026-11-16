// Settings for the globe. Edit these, not viewer.js.

// Cesium ion access token (account pardee_walmsley, token "Dubai_Rainfall"). Leave empty to use the trial
// token built into CesiumJS. Limit the token to the sites that use it (pardeewalmsley.github.io and
// localhost) in the Cesium ion dashboard: a token limited this way is meant to sit in a public page.
// Never put a password here.
window.CESIUM_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IkZ6a3ZCc2UyN0ZyZldDMXoiLCJqdGkiOiI1NWViZjFiMi1mZTNhLTRmNzgtODkxNS00NmNmOWM3MjVlNDMiLCJpZCI6MTc3NDE2LCJzdWIiOiJwYXJkZWVfd2FsbXNsZXkiLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoiRHViYWlfUmFpbmZhbGwiLCJpYXQiOjE3OTQyNTY5NDB9.s07Py4OdQrZM_hDxz7uDC5myCrCsBY_qjp0oRtBPONo';

// The satellite imagery under the city: true for its own colours, false for black and white.
window.COLOUR_IMAGERY = true;

// How white the buildings are: 0 for lit only from the camera (grey sides), up to 1 for flat white with no shading.
window.BUILDING_GLOW = 0.6;

// The weather is shown over all of Dubai, from Jebel Ali in the south-west to Deira and the airport in the
// north-east (degrees). Outside this, no symbols are drawn.
window.WEATHER_AREA = { west: 55.03, south: 24.93, east: 55.45, north: 25.33 };

// Where the airport reports come from: Dubai International Airport. Labels and the visibility ring sit here.
window.AIRPORT = { lon: 55.364, lat: 25.253 };

// Symbols are drawn in rings centred under the camera (see js/effects.js). `half`: half the width of a ring
// whose symbols are at their own size; rings closer in are smaller, with smaller symbols, and rings further out
// larger. lon, lat: the point all positions are measured from, the Burj Khalifa.
window.FOCUS = { lon: 55.2744, lat: 25.1972, half: 2000 };

// The two camera views, with a button each. Burj Khalifa: about 2.7 km south-west of it, above the wind
// arrows, looking north-east down into the block. All of Dubai: high to the south-west, looking north-east
// over the city to the airport.
window.START_VIEW = { lon: 55.2556, lat: 25.1800, height: 800, heading: 42, pitch: -14 };
window.DUBAI_VIEW = { lon: 55.10, lat: 24.95, height: 14000, heading: 38, pitch: -30 };
