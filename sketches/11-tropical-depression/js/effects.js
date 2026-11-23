// Weather on the globe as a diagram: small coloured symbols drawn from the numbers weather.js passes in.
// Nothing here tries to look like real rain or cloud. Each colour is one quantity:
//   wind        golden-yellow arrows, pointing and drifting where the air goes, longer for stronger wind
//   rain        grey-blue streaks below the cloud, more of them for heavier rain, falling along the wind's slant
//   cloud       see-through teal circles in three bands of the sky, more of them for more cover, drifting with the wind
//   visibility  purple ring on the ground, as far from the airport as you can see
// How many symbols there are follows the numbers; where each one starts is random (but the same each time).
// Everything moves 4 times faster than real (SPEED), so the movement shows from a distance. A symbol that
// leaves the square comes back on the other side; rain that reaches the ground starts again at the cloud base.
// The same numbers (one airport report and one ERA5 hour) are used across all of Dubai and Sharjah (window.WEATHER_AREA).
// The symbols are drawn in rings centred under the camera: a square close by, then rings around it, each twice
// as wide as the last, with symbols twice the size, twice as far apart and moving twice as fast. So they look
// about as dense on screen near and far, in whichever direction the camera points. The first ring's size
// follows the camera's height. Rings out of view or outside Dubai are skipped, and the graphics card drops any
// symbol outside the camera's view before drawing it. The work stays about the same wherever the camera is.
// Interpretive. All sizes are in metres unless they say pixels.
window.makeWeatherEffects = function (viewer) {
  const scene = viewer.scene;
  const COLOURS = {
    wind: Cesium.Color.fromCssColorString('#e8b100'),   // golden yellow
    rain: Cesium.Color.fromCssColorString('#4a6fa5'),   // grey-blue, like a storm
    cloud: Cesium.Color.fromCssColorString('#00a3b4'),
    visibility: Cesium.Color.fromCssColorString('#b000b0'),
  };
  // Yellow text is hard to read on the labels' white background, so the wind label uses a darker gold.
  const LABEL_COLOURS = { wind: Cesium.Color.fromCssColorString('#8a6a00') };
  const FOCUS = window.FOCUS;
  const HALF = FOCUS.half;      // half the side of a ring at step 0 (symbols at their own size)
  // Rings: RINGS of them around the camera, each twice as wide as the one inside it. The innermost is about
  // RING_FACTOR times the camera's height in half-width, so the near ring shrinks, with finer symbols, as the
  // camera comes down, and the view straight down is as full as the view to the horizon. Steps run from
  // MIN_STEP (symbols a quarter of their own size) to MAX_STEP (32 times).
  const RINGS = 6, RING_FACTOR = 1.5, MIN_STEP = -2, MAX_STEP = 5;
  const CLOUD_BASE = 1000;      // rain falls from here; wind arrows fill the air below it
  const SPEED = 4;              // symbols move this many times faster than the real air and rain (1: real speed)

  // Wind is measured at 10 m. Arrows are scattered through the air from `bottom` up to the cloud base.
  const WIND = { count: 2500, bottom: 30, scale: 5, min: 20, max: 70, width: 2, opacity: 0.7 };
  //   scale: arrow length per m/s of wind (40 km/h, 11 m/s, gives 55 m); min, max: limits on the length; width in pixels

  // Rain: short streaks along the path of a falling drop, scattered from the ground to the cloud base.
  // count is for 50 mm/h; lighter rain has fewer, on a square-root scale (40 mm/h: about 90 %; 1 mm/h: 14 %).
  const RAIN = { count: 13000, length: 25, fallSpeed: 8, width: 1.5, opacity: 0.7 };
  //   fallSpeed: real drops fall about 8 m/s; with the wind it sets the slant and speed of each streak

  // Cloud cover comes in three bands of the sky (low, mid, high). See-through circles that face the camera
  // are scattered through each band, `count` of them at 100 % cover, each with a random radius between the
  // two `radius` values; where they overlap the colour builds up. Band heights are typical values
  // (interpretive). They drift with the wind measured at 10 m, though real wind is usually stronger higher up.
  const CLOUD = {
    bands: [
      { key: 'cloudLow', name: 'Low cloud', bottom: 1000, top: 2000 },
      { key: 'cloudMid', name: 'Mid cloud', bottom: 2000, top: 6000 },
      { key: 'cloudHigh', name: 'High cloud', bottom: 6000, top: 9000 },
    ],
    count: 800, radius: [30, 150], opacity: 0.15,
    fadePerStep: 0.5, // rings further out are fainter: opacity divided by 1.5 at step 1, 2 at step 2, 3.5 at step 5
  };

  // Positions in metres east, north and up from the Burj Khalifa.
  const enu = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(FOCUS.lon, FOCUS.lat, 0));
  const local = (x, y, z) => Cesium.Matrix4.multiplyByPoint(enu, new Cesium.Cartesian3(x, y, z), new Cesium.Cartesian3());
  const fromEnu = Cesium.Matrix4.inverseTransformation(enu, new Cesium.Matrix4());
  const toLocal = (world) => Cesium.Matrix4.multiplyByPoint(fromEnu, world, new Cesium.Cartesian3());
  const fromDegrees = (lon, lat) => toLocal(Cesium.Cartesian3.fromDegrees(lon, lat, 0));
  // The weather area in local metres: west, south, east, north.
  const A = window.WEATHER_AREA;
  const sw = fromDegrees(A.west, A.south), ne = fromDegrees(A.east, A.north);
  const AREA = new Cesium.Cartesian4(sw.x, sw.y, ne.x, ne.y);
  const AIRPORT = fromDegrees(window.AIRPORT.lon, window.AIRPORT.lat);
  const atAirport = (z) => Cesium.Cartesian3.fromDegrees(window.AIRPORT.lon, window.AIRPORT.lat, z);

  // The same "random" places every time, so the pattern doesn't jump when the page reloads.
  let seed = 11;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const anywhere = () => -HALF + random() * 2 * HALF;
  const between = (a, b) => a + random() * (b - a);

  // ---- Moving lines, drawn by the graphics card ----
  // Each kind of symbol is one group: many short straight lines that all move with one velocity. The page
  // sends the lines to the graphics card once; each frame it only says how far the group has moved, and the
  // card works out where every line is, wraps it back into the square, and draws it `width` pixels wide.
  // (Moving each line from JavaScript was about ten times slower.) This uses parts of CesiumJS that are not
  // in its public documentation (DrawCommand, VertexArray, ShaderProgram), so check it after updating CesiumJS.
  const VERTEX_SHADER = `
    in vec3 anchor;    // where the symbol starts, metres from the Burj Khalifa
    in vec3 offsetA;   // the two ends of this line, relative to the anchor
    in vec3 offsetB;
    in vec2 corner;    // x: 0 for end A, 1 for end B; y: -1 or 1 for the two sides of the line
    uniform vec3 u_shift;  // how far the group has moved
    uniform vec3 u_low;    // the ring's outer square, between the group's heights
    uniform vec3 u_high;
    uniform float u_scale; // the ring's step: 1, 2, 4 ... (sizes and spacing across the ground)
    uniform vec4 u_area;   // the weather area: west, south, east, north
    uniform vec2 u_centre; // the point under the camera
    uniform float u_hole;  // the ring's inner half-width: symbols closer than this belong to the ring inside
    uniform float u_width; // pixels
    void main() {
      vec3 start = vec3(anchor.xy * u_scale, anchor.z);
      vec3 p = u_low + mod(start + u_shift - u_low, u_high - u_low);
      vec2 d = abs(p.xy - u_centre);
      bool outside = p.x < u_area.x || p.y < u_area.y || p.x > u_area.z || p.y > u_area.w;
      if (outside || max(d.x, d.y) < u_hole) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vec4 a = czm_modelViewProjection * vec4(p + offsetA * u_scale, 1.0);
      vec4 b = czm_modelViewProjection * vec4(p + offsetB * u_scale, 1.0);
      if (a.w <= 0.0 || b.w <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }  // behind the camera
      vec2 sa = a.xy / a.w * czm_viewport.zw;
      vec2 sb = b.xy / b.w * czm_viewport.zw;
      vec2 along = sb - sa;
      along = length(along) > 0.0 ? normalize(along) : vec2(1.0, 0.0);
      vec2 side = vec2(-along.y, along.x) * corner.y * u_width / czm_viewport.zw;
      vec4 c = corner.x < 0.5 ? a : b;
      gl_Position = c + vec4(side * c.w, 0.0, 0.0);
    }`;
  const FRAGMENT_SHADER = `
    uniform vec4 u_colour;
    void main() { out_FragColor = u_colour; }`;
  const ATTRIBUTES = { anchor: 0, offsetA: 1, offsetB: 2, corner: 3 };
  const CORNERS = [[0, -1], [1, -1], [1, 1], [0, -1], [1, 1], [0, 1]];  // two triangles per line

  // Discs (for cloud): flat circles that always face the camera, `radius` metres across from the centre,
  // see-through, with a softened edge. Where they overlap the colour builds up.
  const DISC_VERTEX_SHADER = `
    in vec3 anchor;    // the centre, metres from the Burj Khalifa
    in vec2 corner;    // -1 or 1 each way: the corners of the square the circle is cut from
    in float radius;   // metres
    uniform vec3 u_shift;
    uniform vec3 u_low;
    uniform vec3 u_high;
    uniform float u_scale;
    uniform vec4 u_area;
    uniform vec2 u_centre; // the point under the camera
    uniform float u_hole;  // the ring's inner half-width: symbols closer than this belong to the ring inside
    out vec2 v_corner;
    void main() {
      vec3 start = vec3(anchor.xy * u_scale, anchor.z);
      vec3 p = u_low + mod(start + u_shift - u_low, u_high - u_low);
      vec2 d = abs(p.xy - u_centre);
      bool outside = p.x < u_area.x || p.y < u_area.y || p.x > u_area.z || p.y > u_area.w;
      if (outside || max(d.x, d.y) < u_hole) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vec4 eye = czm_modelView * vec4(p, 1.0);
      eye.xy += corner * radius * u_scale;   // in the camera's own frame, so the circle faces the camera
      gl_Position = czm_projection * eye;
      v_corner = corner;
    }`;
  const DISC_FRAGMENT_SHADER = `
    uniform vec4 u_colour;
    in vec2 v_corner;
    void main() {
      float d = length(v_corner);
      if (d > 1.0) discard;
      out_FragColor = vec4(u_colour.rgb, u_colour.a * (1.0 - smoothstep(0.85, 1.0, d)));
    }`;
  const DISC_ATTRIBUTES = { anchor: 0, corner: 1, radius: 2 };
  const DISC_CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];

  // kind: 'lines' (arrows, streaks) or 'discs' (cloud).
  // low, high: the heights the group stays between; bottomScales: the lowest height grows with the zoom step
  // (rain, so that longer streaks still end above the ground).
  function makeGroup({ kind = 'lines', velocity, low, high, colour, width, bottomScales = false }) {
    return {
      kind, velocity, low, high, colour, width, bottomScales, symbols: [],
    };
  }
  // A line symbol: an anchor, and a list of lines, each [startOffset, endOffset].
  const addSymbol = (group, anchor, segments) => group.symbols.push({ anchor, segments });
  // A disc symbol: a centre and a radius.
  const addDisc = (group, anchor, radius) => group.symbols.push({ anchor, radius });

  // The data the graphics card needs for one group: an array per attribute, and the number of corners.
  function lineData(g) {
    const n = g.symbols.reduce((sum, s) => sum + s.segments.length, 0) * 6;
    const data = { anchor: new Float32Array(n * 3), offsetA: new Float32Array(n * 3), offsetB: new Float32Array(n * 3), corner: new Float32Array(n * 2) };
    let v = 0;
    for (const s of g.symbols) {
      for (const [a, b] of s.segments) {
        for (const [end, side] of CORNERS) {
          data.anchor.set(s.anchor, v * 3); data.offsetA.set(a, v * 3); data.offsetB.set(b, v * 3);
          data.corner[v * 2] = end; data.corner[v * 2 + 1] = side;
          v++;
        }
      }
    }
    return { n, data, sizes: { anchor: 3, offsetA: 3, offsetB: 3, corner: 2 } };
  }
  function discData(g) {
    const n = g.symbols.length * 6;
    const data = { anchor: new Float32Array(n * 3), corner: new Float32Array(n * 2), radius: new Float32Array(n) };
    let v = 0;
    for (const s of g.symbols) {
      for (const c of DISC_CORNERS) {
        data.anchor.set(s.anchor, v * 3); data.corner.set(c, v * 2); data.radius[v] = s.radius;
        v++;
      }
    }
    return { n, data, sizes: { anchor: 3, corner: 2, radius: 1 } };
  }

  const movingLines = {
    groups: [],
    commands: [],    // one per group per ring: { command, group, ring }
    arrays: [],      // one vertex array per group, shared by its rings
    elapsed: 0,
    rebuild: true,
    step: 0,         // the innermost ring's step
    centre: new Cesium.Cartesian2(),
    update(frameState) {
      if (this.rebuild) this.build(frameState.context);
      this.follow();
      for (const { command, group: g, ring } of this.commands) {
        ring.step = this.step + ring.index;
        if (ring.step > MAX_STEP) continue;
        const k = 2 ** ring.step;
        ring.scale = k;
        ring.hole = ring.index === 0 ? 0 : HALF * k / 2;
        // The ring's outer square, between the group's heights.
        const zLow = g.bottomScales ? Math.min(g.low[2] * k, g.high[2] - 50) : g.low[2];
        ring.low.x = this.centre.x - HALF * k; ring.low.y = this.centre.y - HALF * k; ring.low.z = zLow;
        ring.high.x = this.centre.x + HALF * k; ring.high.y = this.centre.y + HALF * k; ring.high.z = g.high[2];
        // Skip a ring that is wholly outside Dubai, or wholly out of the camera's view.
        if (ring.high.x < AREA.x || ring.low.x > AREA.z || ring.high.y < AREA.y || ring.low.y > AREA.w) continue;
        Cesium.Cartesian3.clone(local(this.centre.x, this.centre.y, (zLow + g.high[2]) / 2), ring.sphere.center);
        ring.sphere.radius = Math.hypot(HALF * k * Math.SQRT2, (g.high[2] - zLow) / 2);
        if (frameState.cullingVolume.computeVisibility(ring.sphere) === Cesium.Intersect.OUTSIDE) continue;
        // Keep the shift inside one box length, so the graphics card's numbers stay precise.
        const size = [2 * HALF * k, 2 * HALF * k, g.high[2] - zLow];
        const m = (v, i) => ((v * k * this.elapsed) % size[i] + size[i]) % size[i];
        ring.shift.x = m(g.velocity[0], 0); ring.shift.y = m(g.velocity[1], 1); ring.shift.z = m(g.velocity[2], 2);
        frameState.commandList.push(command);
      }
    },
    // Rings further out have fainter cloud (interpretive): seen from far off, the camera looks through
    // kilometres of circles, and at full cover the city would vanish under the colour.
    cloudColour(g, ring) {
      return Cesium.Color.clone(g.colour, ring.colour).withAlpha(g.colour.alpha / (1 + CLOUD.fadePerStep * Math.max(ring.step, 0)), ring.colour);
    },
    // The point under the camera, and the innermost ring's step for the camera's height.
    follow() {
      const camera = scene.camera;
      const below = toLocal(camera.positionWC);
      this.centre.x = below.x; this.centre.y = below.y;
      const height = Math.max(camera.positionCartographic.height, 1);
      // Change step only when well past the halfway point, so it doesn't flicker back and forth.
      const x = Math.log2((RING_FACTOR * height) / HALF);
      while (x > this.step + 0.6 && this.step < MAX_STEP) this.step++;
      while (x < this.step - 0.6 && this.step > MIN_STEP) this.step--;
    },
    build(context) {
      this.free();
      this.rebuild = false;
      for (const g of this.groups) {
        const discs = g.kind === 'discs';
        const { n, data, sizes } = discs ? discData(g) : lineData(g);
        if (!n) continue;
        const attributes = discs ? DISC_ATTRIBUTES : ATTRIBUTES;
        const vertexArray = new Cesium.VertexArray({
          context,
          attributes: Object.entries(attributes).map(([name, index]) => ({
            index,
            vertexBuffer: Cesium.Buffer.createVertexBuffer({ context, typedArray: data[name], usage: Cesium.BufferUsage.STATIC_DRAW }),
            componentsPerAttribute: sizes[name],
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
          })),
        });
        this.arrays.push(vertexArray);
        for (let index = 0; index < RINGS; index++) {
          const ring = {
            index, step: 0, scale: 1, hole: 0, colour: new Cesium.Color(), sphere: new Cesium.BoundingSphere(),
            low: new Cesium.Cartesian3(), high: new Cesium.Cartesian3(), shift: new Cesium.Cartesian3(),
          };
          const command = new Cesium.DrawCommand({
            owner: this,
            vertexArray,
            count: n,
            primitiveType: Cesium.PrimitiveType.TRIANGLES,
            shaderProgram: Cesium.ShaderProgram.fromCache({
              context,
              vertexShaderSource: discs ? DISC_VERTEX_SHADER : VERTEX_SHADER,
              fragmentShaderSource: discs ? DISC_FRAGMENT_SHADER : FRAGMENT_SHADER,
              attributeLocations: attributes,
            }),
            // See-through symbols (all of them now: cloud, wind, rain) are drawn after everything solid, blended,
            // and don't hide what is behind them.
            renderState: g.colour.alpha < 1
              ? Cesium.RenderState.fromCache({ depthTest: { enabled: true }, depthMask: false, blending: Cesium.BlendingState.ALPHA_BLEND })
              : Cesium.RenderState.fromCache({ depthTest: { enabled: true }, depthMask: true }),
            pass: g.colour.alpha < 1 ? Cesium.Pass.TRANSLUCENT : Cesium.Pass.OPAQUE,
            modelMatrix: enu,
            // Whether a ring is in view is tested in update(), with the ring's own position.
            cull: false,
            boundingVolume: ring.sphere,
            uniformMap: {
              u_shift: () => ring.shift, u_low: () => ring.low, u_high: () => ring.high,
              u_scale: () => ring.scale, u_area: () => AREA, u_centre: () => this.centre, u_hole: () => ring.hole,
              u_width: () => g.width * (scene.pixelRatio || 1),
              u_colour: () => (discs ? this.cloudColour(g, ring) : g.colour),
            },
          });
          this.commands.push({ command, group: g, ring });
        }
      }
    },
    free() {
      for (const { command } of this.commands) command.shaderProgram.destroy();
      for (const a of this.arrays) a.destroy();
      this.commands = [];
      this.arrays = [];
    },
    isDestroyed: () => false,
    destroy() { this.free(); },
  };
  scene.primitives.add(movingLines);

  // Still lines (the visibility ring) and labels.
  const lines = scene.primitives.add(new Cesium.PolylineCollection({ modelMatrix: enu }));
  // Labels get a new collection each time the weather changes: clearing and refilling one loses letters.
  let labels = scene.primitives.add(new Cesium.LabelCollection());
  // Labels sit just right of the airport, where the reports come from. row: labels at the ground stack downwards.
  const addLabel = (z, text, colour, row = 0) => labels.add({
    position: atAirport(z), text, font: '600 12px system-ui, sans-serif',
    fillColor: colour, showBackground: true, backgroundColor: Cesium.Color.WHITE.withAlpha(0.85),
    backgroundPadding: new Cesium.Cartesian2(5, 3),
    horizontalOrigin: Cesium.HorizontalOrigin.LEFT, pixelOffset: new Cesium.Cartesian2(14, row * 20),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,  // labels stay readable in front of buildings
  });

  const compass = (deg) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];

  // Each kind of symbol has its own fixed random sequence, so one kind doesn't jump when another's count changes.
  const SEEDS = { wind: 11, rain: 23, cloudLow: 37, cloudMid: 41, cloudHigh: 53 };

  function drawWind(s, wind) {
    seed = SEEDS.wind;
    const gust = s.gust ? `, gusts ${Math.round(s.gust)}` : '';
    const speed = Math.hypot(wind.east, wind.north);
    if (s.windFrom == null && s.windSpeed >= 1) {
      // A report can give a speed with no fixed direction ("variable"): no arrows, since there is no way to point them.
      addLabel(0, `Wind ${Math.round(s.windSpeed)} km/h, direction varying${gust}`, LABEL_COLOURS.wind, 0);
      return [];
    }
    if (speed < 0.5) {
      addLabel(0, 'Wind: calm', LABEL_COLOURS.wind, 0);
      return [];
    }
    const length = Cesium.Math.clamp(speed * WIND.scale, WIND.min, WIND.max);
    // Each arrow is a shaft and a head (two strokes angled back 30° from the tip), centred on its anchor.
    const ux = wind.east / speed, uy = wind.north / speed;   // one step downwind
    const head = length * 0.35, c = Math.cos(Math.PI / 6), sn = Math.sin(Math.PI / 6);
    const tip = [(ux * length) / 2, (uy * length) / 2, 0];
    const back = (sign) => [tip[0] - head * (ux * c - sign * uy * sn), tip[1] - head * (uy * c + sign * ux * sn), 0];
    const segments = [[[-tip[0], -tip[1], 0], tip], [back(1), tip], [back(-1), tip]];
    const group = makeGroup({
      velocity: [wind.east, wind.north, 0], low: [-HALF, -HALF, WIND.bottom], high: [HALF, HALF, CLOUD_BASE],
      colour: COLOURS.wind.withAlpha(WIND.opacity), width: WIND.width,
    });
    for (let i = 0; i < WIND.count; i++) addSymbol(group, [anywhere(), anywhere(), between(WIND.bottom, CLOUD_BASE)], segments);
    addLabel(0, `Wind ${Math.round(s.windSpeed)} km/h from the ${compass(s.windFrom)}${gust}`, LABEL_COLOURS.wind, 0);
    return [group];
  }

  function drawRain(s, wind) {
    seed = SEEDS.rain;
    if (s.rainRate <= 0.05) return [];
    const n = Math.round(RAIN.count * Cesium.Math.clamp(Math.sqrt(s.rainRate / 50), 0.05, 1));
    // A falling drop moves sideways with the wind and down at fallSpeed; each streak points along that path.
    const fall = new Cesium.Cartesian3(wind.east, wind.north, -RAIN.fallSpeed);
    const unit = Cesium.Cartesian3.normalize(fall, new Cesium.Cartesian3());
    const segments = [[[0, 0, 0], [unit.x * RAIN.length, unit.y * RAIN.length, unit.z * RAIN.length]]];
    const bottom = -unit.z * RAIN.length;  // the streak's top stays high enough that its foot is above ground
    const group = makeGroup({
      velocity: [fall.x, fall.y, fall.z], low: [-HALF, -HALF, bottom], high: [HALF, HALF, CLOUD_BASE],
      colour: COLOURS.rain.withAlpha(RAIN.opacity), width: RAIN.width, bottomScales: true,
    });
    for (let i = 0; i < n; i++) addSymbol(group, [anywhere(), anywhere(), between(bottom, CLOUD_BASE)], segments);
    addLabel(0, `Rain ${s.rainRate.toFixed(1)} mm per hour`, COLOURS.rain, 1);
    return [group];
  }

  function drawClouds(s, wind) {
    return CLOUD.bands.map((band) => {
      seed = SEEDS[band.key];
      const cover = s[band.key] ?? 0;
      const n = Math.round((cover / 100) * CLOUD.count);
      const group = makeGroup({
        kind: 'discs', velocity: [wind.east, wind.north, 0], low: [-HALF, -HALF, band.bottom], high: [HALF, HALF, band.top],
        colour: COLOURS.cloud.withAlpha(CLOUD.opacity),
      });
      // See-through circles of random sizes, scattered through the band.
      for (let i = 0; i < n; i++) {
        addDisc(group, [anywhere(), anywhere(), between(band.bottom, band.top)], between(CLOUD.radius[0], CLOUD.radius[1]));
      }
      return group;
    });
  }
  const cloudLabel = (s) => addLabel(0, `Cloud ${s.cloudLow} / ${s.cloudMid} / ${s.cloudHigh} % (low / mid / high)`, COLOURS.cloud, 2);

  function drawVisibility(s) {
    const v = s.visibility;
    // A ring around the airport, under 10 km; at 10 km or more it is in the label only. It doesn't move.
    if (v < 10000) {
      const r = Math.max(v, 20);
      const ring = [];
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        ring.push(new Cesium.Cartesian3(AIRPORT.x + Math.sin(a) * r, AIRPORT.y + Math.cos(a) * r, 15));
      }
      // Dashes need a colour that is a little see-through, or the gaps between them may be drawn black.
      const material = Cesium.Material.fromType('PolylineDash', { color: COLOURS.visibility.withAlpha(0.99), dashLength: 16 });
      lines.add({ positions: ring, material, width: 2 });
    }
    addLabel(0, v >= 10000 ? 'Visibility 10 km or more' : `Visibility ${(v / 1000).toFixed(1)} km`, COLOURS.visibility, 3);
  }

  // ---- Each frame: add the time since the last frame, sped up ----
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  scene.preUpdate.addEventListener(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.25);  // after a pause or a very slow frame, don't jump
    last = now;
    if (playing) movingLines.elapsed += dt * SPEED;
  });
  // While playing, the globe draws continuously (up to 30 frames a second, set in viewer.js); paused, it
  // draws only when the camera moves.
  const setPlaying = (on) => {
    playing = on;
    last = performance.now();
    scene.requestRenderMode = !on;
    scene.requestRender();
  };

  return {
    // s: the weather from weather.js, or null for none.
    apply(s) {
      lines.removeAll();
      scene.primitives.remove(labels);  // this also frees it
      labels = scene.primitives.add(new Cesium.LabelCollection());
      let groups = [];
      if (s) {
        const towards = Cesium.Math.toRadians(((s.windFrom ?? 0) + 180) % 360);
        const speed = (s.windSpeed ?? 0) / 3.6;  // km/h to m/s
        const wind = { east: Math.sin(towards) * speed, north: Math.cos(towards) * speed };
        groups = [...drawWind(s, wind), ...drawRain(s, wind), ...drawClouds(s, wind)];
        cloudLabel(s);
        drawVisibility(s);
        addLabel(0, 'Dubai International Airport', Cesium.Color.BLACK, -1);
      }
      movingLines.groups = groups;
      movingLines.rebuild = true;
      setPlaying(playing);
      // The letters of new labels arrive a moment later, so draw again twice more to show them when paused.
      for (const ms of [300, 1500]) setTimeout(() => scene.requestRender(), ms);
    },
    get playing() { return playing; },
    setPlaying,
  };
};
