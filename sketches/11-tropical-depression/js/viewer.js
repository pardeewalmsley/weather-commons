// The 3D globe: greyscale imagery, world terrain and OpenStreetMap buildings, opening over Dubai.
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
  const setSky = () => { scene.backgroundColor = Cesium.Color.fromCssColorString(dark.matches ? '#3a3a3a' : '#c8c8c8'); };
  setSky();
  dark.addEventListener('change', setSky);

  // Light the scene from the camera, not the sun, so the city is never in night-time shade.
  const light = new Cesium.DirectionalLight({ direction: viewer.scene.camera.directionWC });
  viewer.scene.light = light;
  viewer.scene.preRender.addEventListener(() => Cesium.Cartesian3.clone(viewer.scene.camera.directionWC, light.direction));

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

  const flyTo = (v, duration) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(v.lon, v.lat, v.height),
      orientation: { heading: Cesium.Math.toRadians(v.heading), pitch: Cesium.Math.toRadians(v.pitch), roll: 0 },
      duration,
    });
  };
  flyTo(window.START_VIEW, 0);
  window.flyToView = flyTo;  // weather.js flies to each moment's view; its "This view" button flies back to it
  document.getElementById('all-dubai').addEventListener('click', () => flyTo(window.DUBAI_VIEW, 2));
  status.hidden = true;  // loaded: the panel only shows this line for loading and errors

  // Let weather.js know the globe is ready.
  window.globeViewer = viewer;
  window.dispatchEvent(new CustomEvent('globe-ready'));
}

start().catch((err) => {
  console.error(err);
  status.textContent = 'The globe could not load: ' + err.message + '. If it mentions a token, check js/config.js.';
});
