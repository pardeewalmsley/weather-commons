// The airflow simulation, on the map's Simulation tab (modelled, indicative only).
//
// Around each camera place, a square of the city 800 m across (data/footprints.json) is cut into a grid of
// 200 × 200 cells, 4 m each. Buildings from OpenStreetMap are solid; air flows round them. The air is simulated
// with the lattice Boltzmann method (D2Q9, BGK collision): a standard way to simulate a fluid on a grid,
// light enough to run in the browser. Yellow streaks drawn on the ground follow the simulated air.
//
// What it is and isn't:
//   - A flat slice at street level: no heights, no air going over the buildings or down from above.
//   - The wind comes in from the ERA5 wind 10 m above the ground at each moment (reanalysed, the nearest hour,
//     one grid cell about 28 km across), the same for every place. Its speed only sets how fast the streaks move: the simulated air is far slower
//     and smoother than the storm (a low "Reynolds number"), so it shows patterns, such as wind squeezed
//     between towers and calm behind them, not real speeds or gusts.
//   - The grid is turned so the wind always enters from one side; it is redrawn when the wind turns, and the
//     air starts again from an even flow.

(function () {
  const N = 200;                 // cells across
  const TAU = 0.56;              // relaxation time: sets the simulated air's viscosity (0.5 would be none)
  const PARTICLES = 1100;        // streaks per place
  const CANVAS = 512;            // pixels across each place's drawing
  const WIND = '232, 177, 0';    // the wind yellow used on the first page (#e8b100)

  // D2Q9: nine directions a packet of air can move in each step.
  const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
  const EY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
  const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];

  const M_PER_DEG_LAT = 110574;
  const mPerDegLon = (lat) => 111320 * Math.cos((lat * Math.PI) / 180);

  // The even flow (equilibrium) for density 1 and velocity (u, 0) along the grid.
  const feqFree = (u) => W.map((w, k) => { const eu = 3 * EX[k] * u; return w * (1 + eu + eu * eu / 2 - 1.5 * u * u); });

  function makePlace(viewer, id, p, size) {
    const cell = size / N;
    const solid = new Uint8Array(N * N);          // buildings, for the streaks
    const ux = new Float32Array(N * N), uy = new Float32Array(N * N);
    // The simulation's own grid has a border one cell wide all round, which always holds the undisturbed wind.
    const S = N + 2, M = S * S;
    const sol = new Uint8Array(M);                  // 1: building
    const near = new Uint8Array(M);                 // 1: next to a building (needs the bounce check)
    let F = Array.from({ length: 9 }, () => new Float32Array(M)), G = Array.from({ length: 9 }, () => new Float32Array(M));
    let u0 = 0.06, free = feqFree(u0);
    let d = { e: 1, n: 0 }, q = { e: 0, n: 1 };  // grid x (downwind) and y, as east and north

    // ---- Buildings onto the grid, turned to the wind ----
    const raster = document.createElement('canvas');
    raster.width = raster.height = N;
    const rctx = raster.getContext('2d', { willReadFrequently: true });
    const toGrid = ([e, n]) => [(e * d.e + n * d.n) / cell + N / 2, (e * q.e + n * q.n) / cell + N / 2];
    function rasterise() {
      rctx.clearRect(0, 0, N, N);
      rctx.fillStyle = '#000';
      for (const ring of p.polygons) {
        rctx.beginPath();
        ring.forEach((pt, i) => { const [x, y] = toGrid(pt); i ? rctx.lineTo(x, y) : rctx.moveTo(x, y); });
        rctx.closePath();
        rctx.fill();
      }
      const px = rctx.getImageData(0, 0, N, N).data;
      sol.fill(0);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const v = px[(y * N + x) * 4 + 3] > 127 ? 1 : 0;
        solid[y * N + x] = v;
        sol[(y + 1) * S + x + 1] = v;
      }
      near.fill(0);
      for (let y = 1; y <= N; y++) for (let x = 1; x <= N; x++) {
        const i = y * S + x;
        near[i] = sol[i - 1] | sol[i + 1] | sol[i - S] | sol[i + S] | sol[i - 1 - S] | sol[i + 1 - S] | sol[i - 1 + S] | sol[i + 1 + S];
      }
    }
    function reset() {
      for (let k = 0; k < 9; k++) { F[k].fill(free[k]); G[k].fill(free[k]); }
      for (let i = 0; i < N * N; i++) { ux[i] = solid[i] ? 0 : u0; uy[i] = 0; }
    }

    // ---- One step: move each packet of air to its neighbour (or bounce it back off a building), then relax it
    // towards the even flow. The border always holds the undisturbed wind. Written out in full for speed. ----
    const omega = 1 / TAU;
    const w0 = 4 / 9, w1 = 1 / 9, w2 = 1 / 36;
    function step() {
      const [f0, f1, f2, f3, f4, f5, f6, f7, f8] = F, [g0, g1, g2, g3, g4, g5, g6, g7, g8] = G;
      for (let y = 1; y <= N; y++) {
        let i = y * S;
        for (let x = 1; x <= N; x++) {
          i++;
          if (sol[i]) continue;
          let a1, a2, a3, a4, a5, a6, a7, a8;
          const a0 = f0[i];
          if (!near[i]) {
            a1 = f1[i - 1]; a2 = f2[i - S]; a3 = f3[i + 1]; a4 = f4[i + S];
            a5 = f5[i - 1 - S]; a6 = f6[i + 1 - S]; a7 = f7[i + 1 + S]; a8 = f8[i - 1 + S];
          } else {
            a1 = sol[i - 1] ? f3[i] : f1[i - 1]; a2 = sol[i - S] ? f4[i] : f2[i - S];
            a3 = sol[i + 1] ? f1[i] : f3[i + 1]; a4 = sol[i + S] ? f2[i] : f4[i + S];
            a5 = sol[i - 1 - S] ? f7[i] : f5[i - 1 - S]; a6 = sol[i + 1 - S] ? f8[i] : f6[i + 1 - S];
            a7 = sol[i + 1 + S] ? f5[i] : f7[i + 1 + S]; a8 = sol[i - 1 + S] ? f6[i] : f8[i - 1 + S];
          }
          let rho = a0 + a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8;
          let vx = (a1 - a3 + a5 - a6 - a7 + a8) / rho, vy = (a2 - a4 + a5 + a6 - a7 - a8) / rho;
          if (!(rho > 0.2 && rho < 5) || !(vx * vx + vy * vy < 0.1)) { rho = 1; vx = u0; vy = 0; }  // keep it stable
          const j = (y - 1) * N + x - 1;
          ux[j] = vx; uy[j] = vy;
          const uu = 1.5 * (vx * vx + vy * vy), r1 = rho * w1, r2 = rho * w2;
          const xp = 3 * vx, yp = 3 * vy, pp = 3 * (vx + vy), pm = 3 * (vx - vy);
          g0[i] = a0 + omega * (rho * w0 * (1 - uu) - a0);
          g1[i] = a1 + omega * (r1 * (1 + xp + xp * xp / 2 - uu) - a1);
          g3[i] = a3 + omega * (r1 * (1 - xp + xp * xp / 2 - uu) - a3);
          g2[i] = a2 + omega * (r1 * (1 + yp + yp * yp / 2 - uu) - a2);
          g4[i] = a4 + omega * (r1 * (1 - yp + yp * yp / 2 - uu) - a4);
          g5[i] = a5 + omega * (r2 * (1 + pp + pp * pp / 2 - uu) - a5);
          g7[i] = a7 + omega * (r2 * (1 - pp + pp * pp / 2 - uu) - a7);
          g8[i] = a8 + omega * (r2 * (1 + pm + pm * pm / 2 - uu) - a8);
          g6[i] = a6 + omega * (r2 * (1 - pm + pm * pm / 2 - uu) - a6);
        }
      }
      [F, G] = [G, F];
    }

    // ---- The streaks, drawn on a canvas laid on the ground over the square ----
    const trail = document.createElement('canvas');
    trail.width = trail.height = CANVAS;
    const tctx = trail.getContext('2d');
    // Cesium only reloads a picture when it is a different object, so the finished frame alternates between two.
    const frames = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = c.height = CANVAS; return c; });
    let shown = 0;
    const R = N / 2 - 1;  // the streaks stay inside the circle that fits the square, whatever the wind direction
    const inCircle = (x, y) => (x - N / 2) ** 2 + (y - N / 2) ** 2 < R * R;
    const parts = Array.from({ length: PARTICLES }, () => ({ x: 0, y: 0, age: 0, life: 0 }));
    const spawn = (pt) => {
      for (let tries = 0; tries < 30; tries++) {
        const x = Math.random() * N, y = Math.random() * N;
        if (inCircle(x, y) && !solid[(y | 0) * N + (x | 0)]) { Object.assign(pt, { x, y, age: 0, life: 40 + Math.random() * 80 }); return; }
      }
      pt.life = 0;
    };
    parts.forEach((pt) => { spawn(pt); pt.age = Math.random() * pt.life; });
    // Grid cell to canvas pixel (north up).
    const toCanvas = (x, y) => {
      const a = (x - N / 2) * cell, b = (y - N / 2) * cell;
      const e = a * d.e + b * q.e, n = a * d.n + b * q.n;
      return [((e + size / 2) / size) * CANVAS, ((size / 2 - n) / size) * CANVAS];
    };
    const at = (arr, x, y) => arr[Math.min(N - 1, Math.max(0, y | 0)) * N + Math.min(N - 1, Math.max(0, x | 0))];

    function draw(stepsDone) {
      // Fade what is there, so each streak leaves a short tail.
      tctx.globalCompositeOperation = 'destination-out';
      tctx.fillStyle = 'rgba(0,0,0,0.12)';
      tctx.fillRect(0, 0, CANVAS, CANVAS);
      tctx.globalCompositeOperation = 'source-over';
      tctx.lineWidth = 2.2;
      tctx.lineCap = 'round';
      const k = 2.2 * Math.max(1, stepsDone);  // how far a streak moves per frame, in cells per unit of velocity
      for (const pt of parts) {
        if (pt.age++ > pt.life) { spawn(pt); continue; }
        const vx = at(ux, pt.x, pt.y), vy = at(uy, pt.x, pt.y);
        const nx = pt.x + vx * k, ny = pt.y + vy * k;
        if (!inCircle(nx, ny) || solid[(ny | 0) * N + (nx | 0)]) { spawn(pt); continue; }
        const speed = Math.hypot(vx, vy) / u0;  // 1 = the wind as it comes in
        const [ax, ay] = toCanvas(pt.x, pt.y), [bx, by] = toCanvas(nx, ny);
        tctx.strokeStyle = `rgba(${WIND}, ${Math.min(1, 0.55 + 0.45 * speed).toFixed(2)})`;
        tctx.beginPath(); tctx.moveTo(ax, ay); tctx.lineTo(bx, by); tctx.stroke();
        pt.x = nx; pt.y = ny;
      }
      shown = 1 - shown;
      const out = frames[shown].getContext('2d');
      out.clearRect(0, 0, CANVAS, CANVAS);
      // A thin ring marks the edge of the simulated area.
      out.strokeStyle = 'rgba(255,255,255,0.55)';
      out.lineWidth = 2;
      out.beginPath(); out.arc(CANVAS / 2, CANVAS / 2, CANVAS / 2 - 2, 0, 2 * Math.PI); out.stroke();
      out.drawImage(trail, 0, 0);
    }

    const half = size / 2;
    const dLat = half / M_PER_DEG_LAT, dLon = half / mPerDegLon(p.lat);
    // From far away (over 6 km), where the circle is only a few pixels across, a ring and the place's name mark it.
    const far = new Cesium.DistanceDisplayCondition(6000, Number.POSITIVE_INFINITY);
    const entity = viewer.entities.add({
      id: 'airflow-' + id,
      position: Cesium.Cartesian3.fromDegrees(p.lon, p.lat, 0),
      point: {
        pixelSize: 16, color: Cesium.Color.fromCssColorString('#e8b100').withAlpha(0.35), outlineColor: Cesium.Color.WHITE, outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, distanceDisplayCondition: far,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: p.label ?? p.name, font: '600 13px system-ui, sans-serif', fillColor: Cesium.Color.BLACK,
        showBackground: true, backgroundColor: Cesium.Color.WHITE.withAlpha(0.85), backgroundPadding: new Cesium.Cartesian2(5, 3),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT, pixelOffset: new Cesium.Cartesian2(14, 0),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND, distanceDisplayCondition: far,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(p.lon - dLon, p.lat - dLat, p.lon + dLon, p.lat + dLat),
        material: new Cesium.ImageMaterialProperty({ image: new Cesium.CallbackProperty(() => frames[shown], false), transparent: true }),
        classificationType: Cesium.ClassificationType.TERRAIN,  // on the ground, under the buildings
      },
    });

    return {
      p, ux, uy, solid, frame: () => frames[shown],
      setShown(on) { entity.show = on; },
      setWind(fromDeg, kmh) {
        const t = (fromDeg * Math.PI) / 180;
        d = { e: -Math.sin(t), n: -Math.cos(t) };  // the way the wind blows to
        q = { e: -d.n, n: d.e };
        u0 = Math.min(0.1, Math.max(0.03, 0.02 + 0.0013 * kmh));  // kept low: the method needs slow flow to stay accurate
        free = feqFree(u0);
        rasterise();
        reset();
        tctx.clearRect(0, 0, CANVAS, CANVAS);
        parts.forEach((pt) => { spawn(pt); pt.age = Math.random() * pt.life; });
      },
      step, draw,
    };
  }

  // viewer: the Cesium viewer. data: data/footprints.json. Returns { setWind(fromDegrees, kmh), setShown(on) }.
  // It starts hidden; while hidden it does no work, only remembers the wind.
  window.makeAirflow = function (viewer, data) {
    const places = Object.entries(data.places).map(([id, p]) => makePlace(viewer, id, p, data.size));
    let steps = 3;  // steps per frame for the places near the camera; fewer if the computer is slow
    let turn = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const pl of places) pl.centre = Cesium.Cartesian3.fromDegrees(pl.p.lon, pl.p.lat, 0);
    let shown = false, running = false;
    for (const pl of places) pl.setShown(false);
    const frame = () => {
      if (!shown) { running = false; return; }
      const t0 = performance.now();
      // Places within 6 km of the camera run every frame. The others keep their streaks moving on the flow they
      // have, and update it one place per frame, in turn.
      const cam = viewer.camera.positionWC;
      const far = [];
      for (const pl of places) {
        if (Cesium.Cartesian3.distance(cam, pl.centre) < 6000) { for (let s = 0; s < steps; s++) pl.step(); }
        else far.push(pl);
      }
      if (far.length) far[turn++ % far.length].step();
      for (const pl of places) pl.draw(steps);
      const ms = performance.now() - t0;
      window.airflowStats = { ms: Math.round(ms), steps };  // for checking speed from the browser console
      if (ms > 30 && steps > 1) steps--;
      else if (ms < 14 && steps < 4) steps++;
      viewer.scene.requestRender();
      if (reduced) running = false;
      else requestAnimationFrame(frame);
    };
    let wind = null, stale = false;
    // Under reduced motion: let the air settle, then draw it once, still.
    const settle = () => {
      for (const pl of places) { for (let s = 0; s < 300; s++) pl.step(); for (let s = 0; s < 30; s++) pl.draw(1); }
      viewer.scene.requestRender();
    };
    const start = () => {
      if (stale && wind) { for (const pl of places) pl.setWind(...wind); stale = false; }
      if (reduced) settle();
      else if (!running) { running = true; requestAnimationFrame(frame); }
    };
    return {
      places,
      setWind(fromDeg, kmh) {
        wind = [fromDeg, kmh];
        stale = true;  // applied now if shown, or when next shown
        if (shown) start();
      },
      setShown(on) {
        shown = on;
        for (const pl of places) pl.setShown(on);
        if (on) start();
        viewer.scene.requestRender();
      },
    };
  };
})();
