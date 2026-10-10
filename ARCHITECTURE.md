# RuhLife — Architecture Spec

## Overview
RuhLife = 3D living ecosystem simulation game. Single-page web app (Three.js r128 UMD,
bundled at `www/three.min.js`) packaged as Android WebView APK (package `com.ruhlife.app`).
100% offline. No backend. All state in localStorage.

## File layout (www/)
```
index.html          # shells: #screen-home, #screen-setup, #screen-worlds, #screen-help,
                    #          #screen-game (canvas #gl + HUD), #screen-settings ; loads three.min.js then js/*.js
css/style.css       # all UI styling, dark-nature premium theme, rounded panels
js/i18n.js          # RL.I18N dict {en:{...}, hi:{...}}, RL.setLang(l), RL.t(key)
js/audio.js         # RL.Audio: procedural WebAudio ambience (birds/wind/rain/water/music),
                    #           RL.Audio.setVolumes({master,sfx,music}), mute toggle. No external files.
js/engine.js        # RL.Engine: Three.js scene, terrain, water, sky, lights, clouds,
                    #           day/night, weather visuals, touch camera. See API below.
js/sim.js           # RL.Sim: plants, animals, ecosystem tick. See API below.
js/ui.js            # RL.UI: screens, HUD, build mode, library, weather/time panel,
                    #        dashboard, worlds manager, settings, tutorial, toasts.
js/save.js          # RL.Save: worlds CRUD in localStorage key `ruhlife_worlds_v1`,
                    #         settings in `ruhlife_settings_v1`.
js/app.js           # boot: load settings/lang, wire home buttons, init on world start.
```

## Global namespace
All modules attach to `window.RL`. Load order: three.min.js → i18n → audio → engine →
sim → save → ui → app. `app.js` runs on DOMContentLoaded.

## RL.Engine API (engine.js)
- `RL.Engine.init(canvas, opts)` — opts: `{size:'s|m|l', env:'forest|grassland|island|lake', quality:'low|med|high'}`
  Builds: renderer (antialias per quality, pixelRatio capped 2 / 1.5 / 1),
  procedural terrain (PlaneGeometry 64/96/128 segs by size; heightmap via layered
  sine noise; vertex colors: grass→forest→rock→snow by height; island => water ring,
  lake => central lake), water plane (animated opacity/normal-ish via time-based
  vertex wobble), sky dome (shader-less: big sphere w/ vertex-color gradient updated
  by time of day), sun+moon directional lights, hemisphere light, stars (Points,
  visible at night), clouds (billboard-ish white blobs drifting), fog.
- `RL.Engine.setQuality(q)` — toggles shadows, pixelRatio, cloud count.
- `RL.Engine.setTimeOfDay(h)` — 0–24; lerps sky colors, sun/moon position, light
  intensity, fog color, star opacity. `RL.Engine.getTimeOfDay()`.
- `RL.Engine.setTimeSpeed(mult)` — 0=paused, 1/2/4. Internal clock advances game hours.
- `RL.Engine.setWeather(w)` — 'sunny|cloudy|rain|fog|wind|storm'; rain = Points
  particle system; fog = scene.fog density; wind = stronger sway; storm = rain+flash.
  Smooth transitions (lerp over ~3s).
- `RL.Engine.onTapSelect(cb)` — raycast on tap (not drag): cb({kind:'plant|animal|decor', id}).
- `RL.Engine.enterPlaceMode(ghostMesh)` / `RL.Engine.exitPlaceMode()` — shows
  semi-transparent ghost following touch point on terrain; green/red validity tint.
  `RL.Engine.confirmPlacement()` returns {x,z} or null.
- `RL.Engine.worldToScreen(v3)`, `RL.Engine.terrainHeight(x,z)`, `RL.Engine.isWater(x,z)`,
  `RL.Engine.worldBounds()` → {minX,maxX,minZ,maxZ}.
- `RL.Engine.addMesh(obj3d)`, `RL.Engine.removeMesh(obj3d)`.
- `RL.Engine.start()`, `RL.Engine.stop()`, `RL.Engine.resize()`.
- `RL.Engine.setPaused(b)` — pauses render-loop sim advance (render continues).
- Camera: custom touch controls — 1-finger drag = orbit, pinch = zoom (clamp dist),
  2-finger drag = pan; double-tap = recenter. No external OrbitControls.

## RL.Sim API (sim.js) — owns ALL entity state; engine only renders
Entity kinds:
- plants: types `grass, bush, flower, sapling, tree, fruitTree, aquatic` —
  fields: {id, type, x, z, growth:0..1, health:0..1, water:0..1}
  Growth: growth += dt * rate(type) * sunlight * waterFactor; stages scale mesh.
  Health drops if water<0.2 or overcrowded; recovers slowly when good.
  Reproduce: mature healthy plants spawn saplings nearby (cap total by quality).
- animals: species `bird, butterfly, bee, rabbit, deer, fish, frog` —
  fields: {id, species, x, y, z, hunger:0..1, thirst:0..1, health, state}
  Behaviors (tick, cheap): wander (pick nearby target, move), seek water when
  thirsty (fish stay in water; frogs near water), seek food (bees/butterflies→flowers,
  rabbits/deer→grass/bushes, birds→fruit trees), rest at night (diurnal), flee nothing
  (peaceful). Keep in bounds; unstuck nudge if no progress 5s.
  Population: if avg health high & food abundant → occasional birth (cap by quality);
  if starving → health decline → death (fade out).
- Meshes: build LOW-POLY procedural meshes in sim (no external models):
  tree = cylinder trunk + 2-3 cone/sphere foliage; animal = 2-4 boxes/spheres
  composed per species with simple flap/hop/bob animation in tick.
  Use MeshLambertMaterial (cheap). Sway: rotate foliage slightly by wind+time.
- `RL.Sim.init(engine, worldConfig)` — worldConfig: {name,size,env,mode,quality,
  starter:{trees,bushes,flowers,animals:{...}}}
- `RL.Sim.tick(dtHours)` — advance plants+animals (called from engine loop).
- `RL.Sim.placePlant(type,x,z)`, `RL.Sim.placeAnimal(species,x,z)`, `RL.Sim.placeDecor(type,x,z)`,
  `RL.Sim.removeEntity(id)`, `RL.Sim.getEntity(id)`, `RL.Sim.counts()` →
  `{plants, plantsByType, animals, animalsBySpecies, avgPlantHealth, waterLevel}`
- `RL.Sim.ecosystemHealth()` → 0..100 from plant health, water, population balance,
  biodiversity. `RL.Sim.suggestions()` → array of i18n keys.
- `RL.Sim.events()` — recent event strings (birth, death, "rain refilled pond"...), max 20.
- `RL.Sim.serialize()` / `RL.Sim.deserialize(data)` — full world state.
- Caps by quality: low {plants:120, animals:24}, med {220, 40}, high {350, 60}.

## RL.UI screens & contract
- Home: logo img (`assets/logo.png`), animated CSS nature bg, buttons:
  New World → setup; Continue → loads `lastWorldId` or toast if none;
  My Worlds → worlds screen; Daily Fact (rotating fact from FACTS list, i18n);
  How to Play → help; Settings → settings; Lang toggle EN/हिं; Exit → toast
  "Press back again" / `Android.closeApp()` if bridge exists.
- Setup: world name input, size S/M/L, environment 4 cards, mode
  (sandbox/challenge), quality auto (Low/Med/High w/ auto-detect default),
  starter presets; [Start World].
- Game HUD: top bar (world name, time icon+clock, weather icon, pause btn,
  speed btn), right collapsible toolbar (Build, Library, Weather/Time, Stats,
  Save, Help, Home), bottom contextual panel, selected-entity card
  (name, growth/health bars, Remove button).
- Build mode: category tabs (Trees/Plants/Animals/Rocks/Water), item grid,
  tap item → ghost placement → tap terrain to place → ✓/✗ confirm; invalid =
  red tint + toast reason.
- Dashboard: live stats grid (plants, animals by species, water, health score
  bar, weather, time), suggestions list, recent events.
- Worlds: list w/ thumbnail (canvas snapshot dataURL), name, last played,
  Load/Rename/Duplicate/Delete (confirm).
- Settings: language, quality, master/music/sfx sliders, mute, camera
  sensitivity slider, vibration toggle, tutorial replay, reset settings,
  privacy text, version "1.0".
- Tutorial: 5-step overlay coach marks on first world start (skippable).
- Challenge mode: goal card with progress (goal types: forest10 trees,
  pondHealthy, popTarget, recoverHealth, surviveDays); success banner.
- All strings via RL.t(); every button does something real.

## RL.Save
- `list()`, `create(meta)`, `update(id, data)`, `remove(id)`, `get(id)`,
  `setLast(id)`, `getLast()`. World data = {meta, sim: Sim.serialize(),
  timeOfDay, weather, settings snapshot, thumb}.
- Autosave every 60s if dirty; validate on load (try/catch → toast + backup).

## RL.Audio
Procedural only: birds = chirp envelopes (sine blips), wind = filtered noise,
rain = noise bursts, water = low sine babble, music = soft pentatonic pad loop.
`RL.Audio.setScene({weather, timeOfDay})` adapts layers. Master mute persisted.

## RL.I18N
`RL.I18N = {en:{...}, hi:{...}}`; `RL.t(k)`; `RL.setLang(l)` re-renders `[data-i18n]`
and dynamic UI. Hindi = proper Devanagari, formal.

## Android bridge (optional, guarded)
`window.Android` may expose `closeApp()`, `vibrate(ms)`, `shareText(t)`.
Always `typeof Android!=='undefined'` guard.

## Performance rules
- No per-frame allocations in hot loops; reuse Vector3 temps.
- Lambert materials; shadows only on med/high; pixelRatio caps.
- requestAnimationFrame loop with dt clamp (max 0.1s).
- Pause sim when tab hidden.

## Acceptance (must all pass in smoke test)
index.html loads with 0 JS errors; New World → 3D world renders; tap selects;
build-mode places a tree; sim tick grows plants; weather change shows rain;
day/night slider changes lighting; dashboard numbers update; save → reload
restores; HI/EN toggle swaps strings; no external network requests.
