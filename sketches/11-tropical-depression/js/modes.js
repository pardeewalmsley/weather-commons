// The two tabs at the top of the map: Visualisation and Simulation.
//   Visualisation: the weather symbols over the city (js/effects.js), the camera circling each place at an angle.
//   Simulation: the symbols hidden; the airflow simulation (js/airflow.js) in a circle round each place, driven
//     by the ERA5 wind 10 m above the ground at each moment (reanalysed, the nearest hour; data/april-2024.json); the camera straight above the place's circle, looking down.
// The timeline and the panel's readings (ERA5 wind on both) stay the same on both. The address ends in #simulation on the
// Simulation tab, so a link can open it directly.

(function () {
  const tabs = { visualisation: document.getElementById('tab-visualisation'), simulation: document.getElementById('tab-simulation') };
  const note = document.getElementById('airflow-wind');

  let mode = 'visualisation', airflow = null, latest = null;

  const describe = () => {
    if (!latest) return;
    note.textContent = airflow
      ? 'Airflow (modelled), driven by the ERA5 wind below (reanalysed, as on the Visualisation tab), entering every circle on the map. '
        + 'Streaks are brighter where the air moves faster.'
      : 'Loading the simulation…';
  };
  // The wind at each moment on the timeline (js/weather.js). It may come before the outlines have loaded.
  window.addEventListener('moment', (e) => {
    latest = e.detail;
    airflow?.setWind(latest.era5WindFrom ?? 0, latest.era5WindSpeed ?? 0);
    describe();
  });

  function setMode(m) {
    mode = m;
    const sim = m === 'simulation';
    for (const [name, tab] of Object.entries(tabs)) {
      tab.setAttribute('aria-selected', String(name === m));
      tab.tabIndex = name === m ? 0 : -1;
    }
    document.body.classList.toggle('simulation', sim);
    note.hidden = !sim;
    window.weatherEffects?.setShown(!sim);
    if (latest) window.showReadings?.(latest);  // redraw the readings (visibility drops "(ring)" on Simulation)
    airflow?.setShown(sim);
    window.setCameraMode?.(m);
    history.replaceState(null, '', sim ? '#simulation' : location.pathname + location.search);
  }
  for (const [name, tab] of Object.entries(tabs)) tab.addEventListener('click', () => setMode(name));
  // Left and right arrow keys move between the tabs.
  document.querySelector('.mode-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = mode === 'visualisation' ? 'simulation' : 'visualisation';
    setMode(next);
    tabs[next].focus();
  });

  // Start once the globe, the weather symbols and the building outlines are ready.
  const globe = window.globeViewer ? Promise.resolve() : new Promise((done) => window.addEventListener('globe-ready', done, { once: true }));
  Promise.all([fetch('data/footprints.json').then((r) => r.json()), globe])
    .then(([data]) => {
      airflow = window.airflow = window.makeAirflow(window.globeViewer, data);  // window.airflow: for checking from the console
      if (latest) airflow.setWind(latest.era5WindFrom ?? 0, latest.era5WindSpeed ?? 0);
      describe();
      if (location.hash === '#simulation') setMode('simulation');
      else airflow.setShown(mode === 'simulation');
    })
    .catch((err) => {
      console.error(err);
      note.textContent = 'The simulation could not start (' + err.message + ').';
    });
})();
