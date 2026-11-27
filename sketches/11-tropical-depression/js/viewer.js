// The 3D globe: satellite imagery, world terrain and OpenStreetMap buildings, opening over Dubai airport, lit by
// the sun at each moment's time of day and dimmed by its cloud and rain.
// Rain layers from each forecast model come in later steps (see PLAN.md).
const status = document.getElementById('globe-status');

async function start() {
  if (window.CESIUM_ION_TOKEN) Cesium.Ion.defaultAccessToken = window.CESIUM_ION_TOKEN;

  const viewer = new Cesium.Viewer('globe', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
    navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: true,
    infoBox: false, selectionIndicator: false,
    // Draw only when something changes, and at most 30 times a second, to spare the graphics card.
    requestRenderMode: true, maximumRenderTimeChange: Infinity, targetFrameRate: 30,
  });

  // The satellite imagery: in its own colours, or black and white (COLOUR_IMAGERY in config.js).
  const imagery = viewer.imageryLayers.get(0);
  if (!window.COLOUR_IMAGERY) {
    imagery.saturation = 0;
    imagery.brightness = 1.1;
  }

  // A flat grey sky with no sun, moon, stars or blue haze, so the weather layers can be the only colour.
  const scene = viewer.scene;
  scene.skyAtmosphere.show = false;
  scene.skyBox.show = false;
  scene.sun.show = false;
  scene.moon.show = false;
  scene.globe.showGroundAtmosphere = false;
  scene.fog.enabled = false;
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  // The sky's grey follows the light at each moment (setLighting below); this is only the colour before that.
  scene.backgroundColor = Cesium.Color.fromCssColorString(dark.matches ? '#3a3a3a' : '#c8c8c8');

  // Light from the sun, where it really was over Dubai at each moment (setLighting below). The clock is set to
  // the moment's time and doesn't run on its own.
  viewer.clock.shouldAnimate = false;
  scene.light = new Cesium.SunLight();
  // Shadows of the buildings on each other and on the ground, near the camera (they fade with cloud, below).
  viewer.shadows = true;
  viewer.terrainShadows = Cesium.ShadowMode.RECEIVE_ONLY;
  scene.shadowMap.maximumDistance = 6000;
  scene.shadowMap.size = 2048;
  scene.shadowMap.softShadows = true;
  // Without this, flat roofs shadow themselves in stripes ("shadow acne"). These are CesiumJS's own internal
  // settings (not in its documented interface), so check them after updating CesiumJS.
  if (scene.shadowMap._primitiveBias) Object.assign(scene.shadowMap._primitiveBias, { normalOffsetScale: 2.0, depthBias: 0.0003 });

  // Buildings from OpenStreetMap, plain white (cartographic).
  const buildings = await Cesium.createOsmBuildingsAsync();
  buildings.style = new Cesium.Cesium3DTileStyle({ color: "color('white')" });
  buildings.imageBasedLighting.imageBasedLightingFactor = new Cesium.Cartesian2(0, 0); // no tint from the sky
  // White, not grey: each building gives off some light of its own (BUILDING_GLOW in config.js), so the sides
  // facing away from the light stay pale and only a little shading is left to show their shapes.
  buildings.customShader = new Cesium.CustomShader({
    uniforms: { u_glow: { type: Cesium.UniformType.FLOAT, value: window.BUILDING_GLOW ?? 0.6 } },
    fragmentShaderText: `
      void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
        material.diffuse = vec3(1.0);
        material.emissive = vec3(u_glow);
      }`,
  });
  viewer.scene.primitives.add(buildings);

  // ---- Light at each moment: the time of day, then the weather ----
  // How high the sun is over the airport at this time, in degrees (below 0: under the horizon).
  const AIRPORT_POS = Cesium.Cartesian3.fromDegrees(window.AIRPORT.lon, window.AIRPORT.lat, 0);
  const sunHeight = (date) => {
    const sun = Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(date);
    const toFixed = Cesium.Transforms.computeIcrfToFixedMatrix(date) ?? Cesium.Transforms.computeTemeToPseudoFixedMatrix(date);
    Cesium.Matrix3.multiplyByVector(toFixed, sun, sun);
    const up = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(AIRPORT_POS, new Cesium.Cartesian3());
    const toSun = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(sun, AIRPORT_POS, sun), sun);
    return Cesium.Math.toDegrees(Math.asin(Cesium.Cartesian3.dot(up, toSun)));
  };
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const SKY = { light: { day: [200, 200, 200], night: [28, 30, 36] }, dark: { day: [58, 58, 58], night: [16, 17, 20] } };

  // m: one moment (time in Dubai time, cloud cover low / mid / high %, rain mm in the hour). Interpretive: the
  // numbers below were chosen by eye, not measured.
  //   daylight  0 at night, 1 in full day: from the sun's height (0 below 6° under the horizon, 1 above 10° up)
  //   gloom     0 clear, 1 dark storm: from cloud cover (low cloud counts most) and rain
  //   shadows   as dark as on a clear day when the sky is clear, gone when it is overcast
  window.setLighting = (m) => {
    const date = Cesium.JulianDate.fromIso8601(`${m.time}:00+04:00`);
    viewer.clock.currentTime = date;
    const elevation = sunHeight(date);
    const daylight = smooth(-6, 10, elevation);
    const cover = Math.max(m.cloudLow ?? 0, 0.8 * (m.cloudMid ?? 0), 0.5 * (m.cloudHigh ?? 0)) / 100;
    const gloom = Math.min(1, 0.65 * cover + 0.35 * Math.min(1, (m.rainRate ?? 0) / 10));
    const brightness = daylight * (1 - 0.65 * gloom);  // 0 to 1

    scene.light.intensity = 2.2 * brightness;
    // Shadows: only with the sun up, fading out as cloud fills the sky (darkness 1 means no shadow at all).
    viewer.shadows = daylight > 0.05 && cover < 0.95;
    scene.shadowMap.darkness = mix(0.35, 1, smooth(0.2, 0.95, cover));
    // The buildings' own glow keeps them visible at night and pale in daylight.
    buildings.customShader.setUniform('u_glow', mix(0.07, window.BUILDING_GLOW ?? 0.25, brightness));
    // The ground and the sky darken with it.
    imagery.brightness = mix(0.22, window.COLOUR_IMAGERY ? 1 : 1.1, brightness);
    imagery.saturation = (window.COLOUR_IMAGERY ? 1 : 0) * mix(0.55, 1, 1 - gloom);
    const sky = SKY[dark.matches ? 'dark' : 'light'];
    const rgb = sky.day.map((d, i) => Math.round(mix(sky.night[i], d, Math.max(0.1, brightness))));
    scene.backgroundColor = Cesium.Color.fromBytes(...rgb, 255);
    scene.requestRender();
    return { elevation, daylight, gloom, brightness };
  };

  const flyTo = (v, duration) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(v.lon, v.lat, v.height),
      orientation: { heading: Cesium.Math.toRadians(v.heading), pitch: Cesium.Math.toRadians(v.pitch), roll: 0 },
      duration,
    });
  };
  // The camera circles a place very slowly: the airport (AIRPORT_VIEW in config.js), the Burj Khalifa
  // (BURJ_VIEW), the Burj Al Arab, Atlantis The Palm or Sharjah. The timeline doesn't move it. Dragging or zooming the map stops the turning so you can look
  // around; the place's button flies back and starts it again. It starts still if the computer is set to
  // reduce motion.
  // Each place has two views: one for the Visualisation tab (the views above) and one for the Simulation tab,
  // straight above the centre of its simulation circle, looking down (SIM_VIEW in config.js).
  const orbitOf = (view, at) => ({ view, at, target: Cesium.Cartesian3.fromDegrees(...at), heading: view.heading });
  const VIS = {
    airport: [window.AIRPORT_VIEW, window.AIRPORT.lon, window.AIRPORT.lat, 0],
    burj: [window.BURJ_VIEW], 'burj-al-arab': [window.BURJ_AL_ARAB_VIEW], atlantis: [window.ATLANTIS_VIEW], sharjah: [window.SHARJAH_VIEW],
  };
  const orbits = { visualisation: {}, simulation: {} };
  for (const [name, [view, lon = view.lon, lat = view.lat, aim = view.aim]] of Object.entries(VIS)) {
    orbits.visualisation[name] = orbitOf(view, [lon, lat, aim]);
    const [slon, slat] = window.SIM_VIEW.centres[name];
    const down = { range: window.SIM_VIEW.range, pitch: -90, heading: 0, degreesPerSecond: window.SIM_VIEW.degreesPerSecond };
    orbits.simulation[name] = orbitOf(down, [slon, slat, 0]);
  }
  let mode = 'visualisation', current = 'airport';  // the tab, and the place whose button was pressed last
  const orbit = { place: orbits.visualisation.airport, turning: false, wanted: !window.matchMedia('(prefers-reduced-motion: reduce)').matches };
  const offsetOf = (o) => new Cesium.HeadingPitchRange(Cesium.Math.toRadians(o.heading), Cesium.Math.toRadians(o.view.pitch), o.view.range);
  const place = () => {
    const o = orbit.place;
    viewer.camera.lookAt(o.target, offsetOf(o));
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);  // let go again, so the mouse moves the camera as usual
    // Turn a little to the right so the place sits in the middle of the map the panel leaves free (not on a
    // narrow screen, where the panel spans the width).
    const panel = document.querySelector('.panel');
    const width = viewer.canvas.clientWidth;
    // Not when looking straight down: turning would tilt the view off the vertical.
    if (panel && panel.offsetWidth < width * 0.6 && o.view.pitch > -89) {
      const fov = viewer.camera.frustum.fov * (width >= viewer.canvas.clientHeight ? 1 : width / viewer.canvas.clientHeight);
      viewer.camera.lookRight(((panel.offsetWidth + 12) / 2 / width) * fov);
    }
  };
  let last = null;
  const tick = (now) => {
    if (orbit.turning && orbit.wanted) {
      const o = orbit.place;
      if (last != null) o.heading = (o.heading + (o.view.degreesPerSecond * (now - last)) / 1000) % 360;
      place();
      viewer.scene.requestRender();
    }
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const circle = (name, duration) => {
    current = name;
    orbit.turning = false;
    orbit.place = orbits[mode][name];
    // Work out exactly where the turning will start (place() includes the small turn to the right, clear of the
    // panel), then put the camera back and fly there, so the flight ends where the turning begins: no jump.
    const cam = viewer.camera;
    const from = { destination: Cesium.Cartesian3.clone(cam.positionWC), orientation: { direction: Cesium.Cartesian3.clone(cam.directionWC), up: Cesium.Cartesian3.clone(cam.upWC) } };
    place();
    const to = { destination: Cesium.Cartesian3.clone(cam.positionWC), orientation: { direction: Cesium.Cartesian3.clone(cam.directionWC), up: Cesium.Cartesian3.clone(cam.upWC) } };
    if (duration > 0) cam.setView(from);
    cam.flyTo({ ...to, duration, complete: () => { orbit.turning = true; } });
  };
  // Any drag, zoom or touch on the map stops the turning.
  for (const type of ['pointerdown', 'wheel']) viewer.canvas.addEventListener(type, () => { orbit.turning = false; }, { passive: true });
  circle('airport', 0);
  document.getElementById('home').addEventListener('click', () => circle('airport', 2));
  for (const name of ['burj', 'burj-al-arab', 'atlantis', 'sharjah']) {
    document.getElementById(name).addEventListener('click', () => circle(name, 2));
  }
  // All of Dubai on the Simulation tab: straight down, north up, high enough to show every simulation circle
  // (SIM_VIEW.centres, plus each circle's 400 m radius and a margin), moved east so the panel on the right
  // doesn't cover them. Worked out from the window's shape each time.
  const allCircles = () => {
    const pts = Object.values(window.SIM_VIEW.centres).map(([lon, lat]) => Cesium.Cartesian3.fromDegrees(lon, lat, 0));
    const sphere = Cesium.BoundingSphere.fromPoints(pts);
    const radius = sphere.radius + 400 + 600;  // circle radius, and a margin
    const cam = viewer.camera, w = viewer.canvas.clientWidth, h = viewer.canvas.clientHeight;
    const panel = document.querySelector('.panel');
    const covered = panel && panel.offsetWidth < w * 0.6 ? panel.offsetWidth + 24 : 0;  // pixels on the right
    // Pixels at the bottom under the timeline, and at the top under the tabs.
    const bottom = (document.querySelector('.timeline')?.offsetHeight ?? 0) + 40, top = 50;
    // Field of view across and up the window, and the height at which the circles fit both ways in the free part.
    const fovY = w >= h ? 2 * Math.atan(Math.tan(cam.frustum.fov / 2) * h / w) : cam.frustum.fov;
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * w / h);
    const freeX = 2 * Math.atan(Math.tan(fovX / 2) * (w - covered) / w);
    const freeY = 2 * Math.atan(Math.tan(fovY / 2) * (h - top - bottom) / h);
    const height = radius / Math.tan(Math.min(freeY, freeX) / 2);
    // Shift the centre east by half the covered strip, and south by half the difference between bottom and top,
    // measured on the ground, so the circles sit in the middle of the free part of the map.
    const groundW = 2 * height * Math.tan(fovX / 2), groundH = 2 * height * Math.tan(fovY / 2);
    const east = (covered / 2 / w) * groundW, south = ((bottom - top) / 2 / h) * groundH;
    const c = Cesium.Cartographic.fromCartesian(sphere.center);
    const lon = Cesium.Math.toDegrees(c.longitude) + east / (111320 * Math.cos(c.latitude));
    const lat = Cesium.Math.toDegrees(c.latitude) - south / 110574;
    return { lon, lat, height, heading: 0, pitch: -90 };
  };
  const allOfDubai = () => {
    current = 'all-dubai';
    orbit.turning = false;
    flyTo(mode === 'simulation' ? allCircles() : window.DUBAI_VIEW, 2);
  };
  document.getElementById('all-dubai').addEventListener('click', allOfDubai);
  // Switching tabs flies to the other view of the same place.
  window.setCameraMode = (m) => {
    if (m === mode) return;
    mode = m;
    if (current === 'all-dubai') allOfDubai();
    else circle(current, 2);
  };
  status.hidden = true;  // loaded: the panel only shows this line for loading and errors

  // Let weather.js know the globe is ready.
  window.globeViewer = viewer;
  window.dispatchEvent(new CustomEvent('globe-ready'));
}

start().catch((err) => {
  console.error(err);
  status.textContent = 'The globe could not load: ' + err.message + '. If it mentions a token, check js/config.js.';
});
