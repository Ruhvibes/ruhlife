/* RuhLife Engine — Three.js r128 scene: terrain, water, sky, day/night, weather, touch camera */
(function () {
  'use strict';

  var E = {
    renderer: null, scene: null, camera: null, canvas: null,
    terrain: null, water: null, sky: null, stars: null, rain: null,
    clouds: [], sun: null, moon: null, hemi: null,
    sizeM: 90, segs: 96, heights: null, gridN: 0, waterLevel: 0.4,
    hour: 10, timeSpeed: 1, paused: false,
    weather: 'sunny', weatherCur: null, weatherBlend: 1,
    quality: 'med', running: false, raf: 0, lastT: 0,
    selectables: [], tapCb: null,
    placeMode: false, ghost: null, placeValidator: null,
    // camera state
    camYaw: 0.7, camPitch: 0.9, camDist: 55, camTarget: null,
    sens: 1.0,
    _v1: null, _v2: null, _v3: null, _ray: null,
    _skyHour: -99, _touches: {}, _pinchD: 0, _tapT: 0, _tapX: 0, _tapY: 0, _moved: 0,
    _lastTap: 0, _simTick: null, _cloudT: 0, _flash: 0
  };

  var WORLD_SIZE = { s: 60, m: 90, l: 120 };
  var WORLD_SEG  = { s: 64, m: 96, l: 128 };

  function rand(seed) { // deterministic-ish
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { return (s = s * 16807 % 2147483647) / 2147483647; };
  }

  // ---------- terrain height ----------
  function heightAt(x, z, env, half) {
    var h = 2.2 * Math.sin(x * 0.055) * Math.cos(z * 0.062)
          + 1.1 * Math.sin(x * 0.13 + 1.7) * Math.sin(z * 0.11 + 0.6)
          + 0.45 * Math.sin(x * 0.31 + 4.2) * Math.cos(z * 0.27 + 2.1);
    var r = Math.sqrt(x * x + z * z) / half; // 0 center → 1 edge
    if (env === 'island') {
      h = h * (1 - r * r * 1.6) - 1.2;
      h -= r * r * 4.0;
    } else if (env === 'lake') {
      h = h * 0.7 + 1.0;
      var d = Math.sqrt(x * x + z * z);
      if (d < half * 0.35) h -= (half * 0.35 - d) * 0.35; // central basin
    } else if (env === 'grassland') {
      h *= 0.45;
      h += 1.2;
    } else { // forest
      h = h * 0.9 + 1.4;
    }
    // gentle rim lift so edges don't look cut
    if (env !== 'island') h += r * r * 2.0;
    return h;
  }

  function buildTerrain(env) {
    var half = E.sizeM / 2, n = E.segs;
    var geo = new THREE.PlaneGeometry(E.sizeM, E.sizeM, n, n);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    E.heights = new Float32Array((n + 1) * (n + 1));
    E.gridN = n;
    var colors = new Float32Array(pos.count * 3);
    var cGrass = [0.32, 0.62, 0.28], cForest = [0.16, 0.45, 0.22],
        cRock = [0.45, 0.42, 0.38], cSnow = [0.9, 0.92, 0.95],
        cSand = [0.76, 0.70, 0.50];
    var R = rand(1234);
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var h = heightAt(x, z, env, half);
      pos.setY(i, h);
      var gx = Math.round((x + half) / E.sizeM * n), gz = Math.round((z + half) / E.sizeM * n);
      E.heights[gz * (n + 1) + gx] = h;
      var c;
      if (h < E.waterLevel + 0.35) c = cSand;
      else if (h < 2.2) c = cGrass;
      else if (h < 4.5) c = cForest;
      else if (h < 6.5) c = cRock;
      else c = cSnow;
      var v = 0.92 + R() * 0.16;
      colors[i * 3] = Math.min(1, c[0] * v);
      colors[i * 3 + 1] = Math.min(1, c[1] * v);
      colors[i * 3 + 2] = Math.min(1, c[2] * v);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = (E.quality !== 'low');
    mesh.userData.ground = true;
    return mesh;
  }

  E.terrainHeight = function (x, z) {
    var half = E.sizeM / 2, n = E.gridN;
    var fx = (x + half) / E.sizeM * n, fz = (z + half) / E.sizeM * n;
    fx = Math.max(0, Math.min(n - 0.001, fx)); fz = Math.max(0, Math.min(n - 0.001, fz));
    var ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    var H = E.heights, w = n + 1;
    var a = H[iz * w + ix], b = H[iz * w + ix + 1], c = H[(iz + 1) * w + ix], d = H[(iz + 1) * w + ix + 1];
    return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + d * tx * tz;
  };
  E.isWater = function (x, z) { return E.terrainHeight(x, z) < E.waterLevel; };
  E.worldBounds = function () { var h = E.sizeM / 2 - 2; return { minX: -h, maxX: h, minZ: -h, maxZ: h }; };

  // ---------- water ----------
  function buildWater() {
    var geo = new THREE.PlaneGeometry(E.sizeM * 1.4, E.sizeM * 1.4, 24, 24);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshLambertMaterial({
      color: 0x2e86c1, transparent: true, opacity: 0.72
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = E.waterLevel;
    mesh.userData.baseY = new Float32Array(geo.attributes.position.count);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) mesh.userData.baseY[i] = p.getX(i) * 0 + i; // store index seed
    mesh.userData.geo = geo;
    return mesh;
  }

  // ---------- sky dome (vertex colors, updated on time change) ----------
  var SKY = {
    day:    { top: [0.25, 0.55, 0.95], bot: [0.75, 0.88, 0.98] },
    sunset: { top: [0.35, 0.25, 0.55], bot: [1.0, 0.55, 0.35] },
    night:  { top: [0.02, 0.04, 0.12], bot: [0.08, 0.12, 0.25] }
  };
  function skyMix(h) {
    // h: 0-24. returns {top:[r,g,b], bot:[...]}
    var t = { top: [0, 0, 0], bot: [0, 0, 0] };
    function mix(a, b, k, out) {
      for (var i = 0; i < 3; i++) out[i] = a[i] + (b[i] - a[i]) * k;
    }
    var tmp = { top: [0,0,0], bot: [0,0,0] };
    if (h < 4.5 || h >= 20.5) { mix(SKY.night.top, SKY.night.top, 0, t.top); mix(SKY.night.bot, SKY.night.bot, 0, t.bot); }
    else if (h < 6.5) { var k = (h - 4.5) / 2; mix(SKY.night.top, SKY.sunset.top, k, t.top); mix(SKY.night.bot, SKY.sunset.bot, k, t.bot); }
    else if (h < 8.5) { var k2 = (h - 6.5) / 2; mix(SKY.sunset.top, SKY.day.top, k2, t.top); mix(SKY.sunset.bot, SKY.day.bot, k2, t.bot); }
    else if (h < 16.5) { mix(SKY.day.top, SKY.day.top, 0, t.top); mix(SKY.day.bot, SKY.day.bot, 0, t.bot); }
    else if (h < 18.5) { var k3 = (h - 16.5) / 2; mix(SKY.day.top, SKY.sunset.top, k3, t.top); mix(SKY.day.bot, SKY.sunset.bot, k3, t.bot); }
    else { var k4 = (h - 18.5) / 2; mix(SKY.sunset.top, SKY.night.top, k4, t.top); mix(SKY.sunset.bot, SKY.night.bot, k4, t.bot); }
    return t;
  }

  function buildSky() {
    var geo = new THREE.SphereGeometry(600, 16, 12);
    var count = geo.attributes.position.count;
    var colors = new Float32Array(count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.userData.geo = geo;
    mesh.renderOrder = -10;
    return mesh;
  }
  function updateSky(h) {
    if (Math.abs(h - E._skyHour) < 0.03) return;
    E._skyHour = h;
    var s = skyMix(h);
    var geo = E.sky.userData.geo, pos = geo.attributes.position, col = geo.attributes.color;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) / 600; // -1..1
      var k = Math.max(0, Math.min(1, (y + 0.15) / 1.15));
      col.setXYZ(i,
        s.bot[0] + (s.top[0] - s.bot[0]) * k,
        s.bot[1] + (s.top[1] - s.bot[1]) * k,
        s.bot[2] + (s.top[2] - s.bot[2]) * k);
    }
    col.needsUpdate = true;
    // sun / moon
    var ang = (h - 6) / 12 * Math.PI; // sunrise 6h → sunset 18h
    var sx = Math.cos(ang) * 400, sy = Math.sin(ang) * 400;
    E.sun.position.set(sx, Math.max(sy, -50), 120);
    var mang = (h - 18) / 12 * Math.PI;
    E.moon.position.set(Math.cos(mang) * 400, Math.max(Math.sin(mang) * 400, -50), -120);
    var dayK = Math.max(0, Math.min(1, Math.sin(ang)));
    var wdim = E.weatherCur ? E.weatherCur.lightDim : 0;
    E.sun.intensity = (0.25 + dayK * 1.05) * (1 - wdim * 0.55);
    E.moon.intensity = 0.12 + (1 - dayK) * 0.25;
    E.hemi.intensity = 0.35 + dayK * 0.45;
    // stars
    var nightK = 1 - dayK;
    E.stars.material.opacity = Math.max(0, nightK - 0.25) * 0.9;
    // fog color follows sky
    var fc = E.scene.fog.color;
    fc.setRGB(s.bot[0] * 0.9, s.bot[1] * 0.9, s.bot[2] * 0.95);
    if (RL.Audio) RL.Audio.setScene({ hour: h });
  }

  // ---------- stars ----------
  function buildStars() {
    var n = 400, posArr = new Float32Array(n * 3);
    var R = rand(77);
    for (var i = 0; i < n; i++) {
      var th = R() * Math.PI * 2, ph = R() * Math.PI * 0.45;
      posArr[i * 3] = Math.cos(th) * Math.cos(ph) * 550;
      posArr[i * 3 + 1] = Math.sin(ph) * 550 + 40;
      posArr[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 550;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    var m = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    return new THREE.Points(g, m);
  }

  // ---------- clouds ----------
  function buildClouds(count) {
    var grp = new THREE.Group();
    var mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, fog: false });
    var R = rand(999);
    for (var i = 0; i < count; i++) {
      var c = new THREE.Group();
      var puffs = 3 + (R() * 3 | 0);
      for (var j = 0; j < puffs; j++) {
        var s = new THREE.Mesh(new THREE.SphereGeometry(3 + R() * 4, 7, 6), mat);
        s.position.set((R() - 0.5) * 14, (R() - 0.5) * 3, (R() - 0.5) * 8);
        s.scale.y = 0.55;
        c.add(s);
      }
      c.position.set((R() - 0.5) * 300, 55 + R() * 30, (R() - 0.5) * 300);
      c.userData.speed = 1 + R() * 2;
      grp.add(c);
    }
    return grp;
  }

  // ---------- rain ----------
  function buildRain() {
    var n = 700, arr = new Float32Array(n * 3);
    var R = rand(555);
    for (var i = 0; i < n; i++) {
      arr[i * 3] = (R() - 0.5) * 160;
      arr[i * 3 + 1] = R() * 60;
      arr[i * 3 + 2] = (R() - 0.5) * 160;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    var m = new THREE.PointsMaterial({ color: 0x9fc5e8, size: 0.35, transparent: true, opacity: 0.7 });
    var p = new THREE.Points(g, m);
    p.visible = false;
    p.userData.n = n;
    return p;
  }

  var WEATHERS = {
    sunny:  { fogFar: 420, rain: 0, cloudOp: 0.55, windSway: 1.0, lightDim: 0 },
    cloudy: { fogFar: 300, rain: 0, cloudOp: 0.95, windSway: 1.3, lightDim: 0.35 },
    rain:   { fogFar: 220, rain: 1, cloudOp: 1.0, windSway: 1.6, lightDim: 0.5 },
    fog:    { fogFar: 90,  rain: 0, cloudOp: 0.4, windSway: 0.8, lightDim: 0.3 },
    wind:   { fogFar: 380, rain: 0, cloudOp: 0.7, windSway: 2.6, lightDim: 0.1 },
    storm:  { fogFar: 160, rain: 1, cloudOp: 1.0, windSway: 2.2, lightDim: 0.65, flash: 1 }
  };

  // ---------- init ----------
  E.init = function (canvas, opts) {
    E.canvas = canvas;
    E.sizeM = WORLD_SIZE[opts.size] || 90;
    E.segs = WORLD_SEG[opts.size] || 96;
    E.quality = opts.quality || 'med';
    E.hour = 10; E.timeSpeed = 1; E.paused = false;
    E.weather = 'sunny';
    E.weatherCur = Object.assign({}, WEATHERS.sunny);
    E.selectables = [];
    E._v1 = new THREE.Vector3(); E._v2 = new THREE.Vector3(); E._v3 = new THREE.Vector3();
    E._ray = new THREE.Raycaster();
    E.camTarget = new THREE.Vector3(0, 2, 0);
    E.camYaw = 0.7; E.camPitch = 0.85; E.camDist = E.sizeM * 0.75;

    var pr = E.quality === 'low' ? 1 : (E.quality === 'med' ? Math.min(1.5, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1));
    E.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: E.quality !== 'low' });
    E.renderer.setPixelRatio(pr);
    E.renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false);
    if (E.quality !== 'low') {
      E.renderer.shadowMap.enabled = true;
      E.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    if (THREE.sRGBEncoding !== undefined) E.renderer.outputEncoding = THREE.sRGBEncoding;

    E.scene = new THREE.Scene();
    E.scene.fog = new THREE.Fog(0xbcd8ef, 95, 420);
    E.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1500);

    E.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6a8f5f, 0.7);
    E.scene.add(E.hemi);
    E.sun = new THREE.DirectionalLight(0xfff2d9, 1.1);
    E.sun.castShadow = (E.quality === 'high');
    if (E.sun.castShadow) {
      E.sun.shadow.mapSize.set(1024, 1024);
      var sc = E.sun.shadow.camera, ext = E.sizeM * 0.7;
      sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.far = 900;
    }
    E.scene.add(E.sun); E.scene.add(E.sun.target);
    E.moon = new THREE.DirectionalLight(0x9fb6ff, 0.2);
    E.scene.add(E.moon);

    E.terrain = buildTerrain(opts.env || 'forest');
    E.scene.add(E.terrain);
    E.water = buildWater();
    E.scene.add(E.water);
    E.sky = buildSky(); E.scene.add(E.sky);
    E.stars = buildStars(); E.scene.add(E.stars);
    var cloudCount = E.quality === 'low' ? 4 : (E.quality === 'med' ? 7 : 10);
    var cg = buildClouds(cloudCount); E.clouds = cg; E.scene.add(cg);
    E.rain = buildRain(); E.scene.add(E.rain);

    E._skyHour = -99;
    updateSky(E.hour);
    E.setWeather('sunny', true);
    bindTouch(canvas);
    E.resize();
    return E;
  };

  E.setQuality = function (q) {
    E.quality = q;
    var pr = q === 'low' ? 1 : (q === 'med' ? Math.min(1.5, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1));
    E.renderer.setPixelRatio(pr);
    E.renderer.shadowMap.enabled = (q !== 'low');
    E.sun.castShadow = (q === 'high');
  };

  E.setTimeOfDay = function (h) { E.hour = ((h % 24) + 24) % 24; updateSky(E.hour); };
  E.getTimeOfDay = function () { return E.hour; };
  E.setTimeSpeed = function (m) { E.timeSpeed = m; };
  E.setPaused = function (b) { E.paused = !!b; };

  E.setWeather = function (w, instant) {
    if (!WEATHERS[w]) return;
    E.weather = w;
    if (instant) { E.weatherCur = Object.assign({}, WEATHERS[w]); E.weatherBlend = 1; applyWeather(); }
    else { E._weatherFrom = Object.assign({}, E.weatherCur); E.weatherBlend = 0; }
    if (RL.Audio) RL.Audio.setScene({ weather: w });
  };
  function applyWeather() {
    var c = E.weatherCur;
    E.scene.fog.far = c.fogFar;
    E.rain.visible = c.rain > 0.05;
    E.rain.material.opacity = 0.7 * c.rain;
    if (E.clouds) E.clouds.children.forEach(function (cl) {
      cl.children.forEach(function (p) { p.material.opacity = c.cloudOp * 0.85; });
    });
    updateSky(E.hour + 0.001); E._skyHour = -99; updateSky(E.hour); // refresh light dim
  }

  // ---------- selection ----------
  E.onTapSelect = function (cb) { E.tapCb = cb; };
  E.addMesh = function (o) { E.scene.add(o); };
  E.removeMesh = function (o) { E.scene.remove(o); };
  E.addSelectable = function (o) { E.selectables.push(o); };
  E.removeSelectable = function (o) {
    var i = E.selectables.indexOf(o); if (i >= 0) E.selectables.splice(i, 1);
  };

  function pickAt(cx, cy) {
    var r = E.canvas.getBoundingClientRect();
    E._v1.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5);
    E._ray.setFromCamera(E._v1, E.camera);
    var hits = E._ray.intersectObjects(E.selectables, true);
    if (hits.length) {
      var o = hits[0].object;
      while (o && !o.userData.eid) o = o.parent;
      if (o) return { kind: o.userData.ekind, id: o.userData.eid, point: hits[0].point };
    }
    return null;
  }
  function groundAt(cx, cy) {
    var r = E.canvas.getBoundingClientRect();
    E._v1.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1, 0.5);
    E._ray.setFromCamera(E._v1, E.camera);
    var hits = E._ray.intersectObject(E.terrain);
    return hits.length ? hits[0].point : null;
  }

  // ---------- place mode ----------
  E.enterPlaceMode = function (ghost, validator) {
    E.exitPlaceMode();
    E.placeMode = true; E.ghost = ghost; E.placeValidator = validator || null;
    E.scene.add(ghost);
  };
  E.exitPlaceMode = function () {
    if (E.ghost) { E.scene.remove(E.ghost); E.ghost = null; }
    E.placeMode = false; E.placeValidator = null;
  };
  E.confirmPlacement = function () {
    if (!E.ghost || !E.ghost.userData.groundPoint) return null;
    var p = E.ghost.userData.groundPoint;
    if (E.placeValidator) {
      var v = E.placeValidator(p.x, p.z);
      if (!v.ok) return { error: v.reason };
    }
    return { x: p.x, z: p.z };
  };
  function setGhostTint(ok) {
    if (!E.ghost) return;
    E.ghost.traverse(function (o) {
      if (o.isMesh && o.material && o.material.transparent) {
        o.material.color.setHex(ok ? 0x4caf50 : 0xf44336);
      }
    });
  }

  E.worldToScreen = function (v3) {
    E._v2.copy(v3).project(E.camera);
    var r = E.canvas.getBoundingClientRect();
    return { x: (E._v2.x * 0.5 + 0.5) * r.width, y: (-E._v2.y * 0.5 + 0.5) * r.height };
  };

  // ---------- touch camera ----------
  function bindTouch(cv) {
    cv.style.touchAction = 'none';
    cv.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (RL.Audio) RL.Audio.unlock();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        E._touches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
      var ids = Object.keys(E._touches);
      if (ids.length === 1) { E._tapT = Date.now(); E._tapX = e.changedTouches[0].clientX; E._tapY = e.changedTouches[0].clientY; E._moved = 0; }
      if (ids.length === 2) {
        var a = E._touches[ids[0]], b = E._touches[ids[1]];
        E._pinchD = Math.hypot(a.x - b.x, a.y - b.y);
        E._panX = (a.x + b.x) / 2; E._panY = (a.y + b.y) / 2;
      }
    }, { passive: false });
    cv.addEventListener('touchmove', function (e) {
      e.preventDefault();
      var ids = Object.keys(E._touches);
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i], p = E._touches[t.identifier];
        if (!p) continue;
        var dx = t.clientX - p.x, dy = t.clientY - p.y;
        E._moved += Math.abs(dx) + Math.abs(dy);
        if (ids.length === 1) {
          var s = 0.005 * E.sens;
          E.camYaw -= dx * s;
          E.camPitch = Math.max(0.25, Math.min(1.45, E.camPitch - dy * s));
        }
        p.x = t.clientX; p.y = t.clientY;
      }
      if (ids.length === 2) {
        var a = E._touches[ids[0]], b = E._touches[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (E._pinchD > 0) {
          E.camDist = Math.max(12, Math.min(E.sizeM * 2.2, E.camDist * (E._pinchD / d)));
        }
        E._pinchD = d;
        // 2-finger drag = pan
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var pdx = mx - E._panX, pdy = my - E._panY;
        E._panX = mx; E._panY = my;
        var ps = E.camDist * 0.0016 * E.sens;
        var fx = Math.cos(E.camYaw), fz = -Math.sin(E.camYaw);
        var rx = Math.cos(E.camYaw + Math.PI / 2), rz = -Math.sin(E.camYaw + Math.PI / 2);
        E.camTarget.x -= (rx * pdx + fx * -pdy) * ps * -1;
        E.camTarget.z -= (rz * pdx + fz * -pdy) * ps * -1;
        clampTarget();
      }
      updateGhost(e);
    }, { passive: false });
    cv.addEventListener('touchend', function (e) {
      e.preventDefault();
      var now = Date.now();
      for (var i = 0; i < e.changedTouches.length; i++) delete E._touches[e.changedTouches[i].identifier];
      if (Object.keys(E._touches).length === 0) {
        // tap?
        if (E._moved < 12 && (now - E._tapT) < 450) {
          if (E.placeMode) { updateGhost(e, true); }
          else {
            if (now - E._lastTap < 320) { // double-tap recenter
              E.camTarget.set(0, 2, 0);
              E._lastTap = 0;
            } else {
              E._lastTap = now;
              var hit = pickAt(E._tapX, E._tapY);
              if (E.tapCb) E.tapCb(hit);
            }
          }
        }
      }
      E._pinchD = 0;
    }, { passive: false });
    cv.addEventListener('touchcancel', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) delete E._touches[e.changedTouches[i].identifier];
    });
    // mouse support (desktop testing)
    var mdown = false, lx = 0, ly = 0, mmoved = 0, mT = 0;
    cv.addEventListener('mousedown', function (e) { mdown = true; lx = e.clientX; ly = e.clientY; mmoved = 0; mT = Date.now(); if (RL.Audio) RL.Audio.unlock(); });
    cv.addEventListener('mousemove', function (e) {
      if (!mdown) return;
      var dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      mmoved += Math.abs(dx) + Math.abs(dy);
      var s = 0.005 * E.sens;
      E.camYaw -= dx * s;
      E.camPitch = Math.max(0.25, Math.min(1.45, E.camPitch - dy * s));
      if (E.placeMode) {
        var p = groundAt(e.clientX, e.clientY);
        if (p && E.ghost) { E.ghost.position.set(p.x, E.terrainHeight(p.x, p.z), p.z); E.ghost.userData.groundPoint = p; tintGhost(p); }
      }
    });
    cv.addEventListener('mouseup', function (e) {
      if (mdown && mmoved < 8 && (Date.now() - mT) < 450 && !E.placeMode && E.tapCb) {
        E.tapCb(pickAt(e.clientX, e.clientY));
      }
      mdown = false;
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      E.camDist = Math.max(12, Math.min(E.sizeM * 2.2, E.camDist * (1 + e.deltaY * 0.001)));
    }, { passive: false });
  }
  function clampTarget() {
    var b = E.worldBounds();
    E.camTarget.x = Math.max(b.minX, Math.min(b.maxX, E.camTarget.x));
    E.camTarget.z = Math.max(b.minZ, Math.min(b.maxZ, E.camTarget.z));
    E.camTarget.y = 2;
  }
  function updateGhost(e, fromEnd) {
    if (!E.placeMode || !E.ghost) return;
    var t = e.changedTouches[0] || { clientX: E._tapX, clientY: E._tapY };
    var p = groundAt(t.clientX, t.clientY);
    if (p) {
      E.ghost.position.set(p.x, E.terrainHeight(p.x, p.z), p.z);
      E.ghost.userData.groundPoint = p;
      tintGhost(p);
    }
  }
  function tintGhost(p) {
    if (!E.placeValidator) { setGhostTint(true); return; }
    var v = E.placeValidator(p.x, p.z);
    setGhostTint(v.ok);
    E.ghost.userData.valid = v;
  }

  function updateCamera() {
    var sp = Math.sin(E.camPitch), cp = Math.cos(E.camPitch);
    E._v3.set(
      E.camTarget.x + E.camDist * cp * Math.sin(E.camYaw),
      E.camTarget.y + E.camDist * sp,
      E.camTarget.z + E.camDist * cp * Math.cos(E.camYaw)
    );
    // keep camera above terrain
    var th = E.terrainHeight(E._v3.x, E._v3.z) + 2;
    if (E._v3.y < th) E._v3.y = th;
    E.camera.position.copy(E._v3);
    E.camera.lookAt(E.camTarget);
  }

  // ---------- main loop ----------
  E.start = function (simTick) {
    E._simTick = simTick || null;
    if (E.running) return;
    E.running = true; E.lastT = performance.now();
    function frame(now) {
      if (!E.running) return;
      E.raf = requestAnimationFrame(frame);
      var dt = Math.min(0.1, (now - E.lastT) / 1000);
      E.lastT = now;
      // weather blend
      if (E.weatherBlend < 1) {
        E.weatherBlend = Math.min(1, E.weatherBlend + dt / 3);
        var from = E._weatherFrom || WEATHERS.sunny, to = WEATHERS[E.weather];
        for (var k in to) {
          if (typeof to[k] === 'number') E.weatherCur[k] = from[k] + (to[k] - from[k]) * E.weatherBlend;
        }
        if (E.weatherBlend >= 1) E.weatherCur = Object.assign({}, to);
        applyWeatherLite();
      }
      // clock
      if (!E.paused && E.timeSpeed > 0) {
        E.hour = (E.hour + dt * E.timeSpeed / 15) % 24; // 1x = 1 game-hour / 15s
        updateSky(E.hour);
        if (E._simTick) E._simTick(dt * E.timeSpeed / 15); // dt in game-hours
      }
      animate(dt, now / 1000);
      updateCamera();
      E.renderer.render(E.scene, E.camera);
    }
    E._weatherFrom = Object.assign({}, E.weatherCur);
    E.raf = requestAnimationFrame(frame);
  };
  function applyWeatherLite() {
    var c = E.weatherCur;
    E.scene.fog.far += (c.fogFar - E.scene.fog.far) * 0.2;
    E.rain.visible = c.rain > 0.05;
  }
  function animate(dt, t) {
    // water wobble
    if (E.water) {
      var g = E.water.userData.geo, p = g.attributes.position;
      for (var i = 0; i < p.count; i += 4) {
        var bx = p.getX(i), bz = p.getZ(i);
        p.setY(i, Math.sin(t * 1.6 + bx * 0.25 + bz * 0.2) * 0.12);
      }
      p.needsUpdate = true;
    }
    // clouds drift
    if (E.clouds) {
      var ws = E.weatherCur ? E.weatherCur.windSway : 1;
      for (var ci = 0; ci < E.clouds.children.length; ci++) {
        var c = E.clouds.children[ci];
        c.position.x += c.userData.speed * ws * dt * 1.5;
        if (c.position.x > 180) c.position.x = -180;
      }
    }
    // rain fall
    if (E.rain && E.rain.visible) {
      var rp = E.rain.geometry.attributes.position, n = E.rain.userData.n;
      for (var ri = 0; ri < n; ri++) {
        var y = rp.getY(ri) - dt * 42;
        if (y < 0) { y = 55 + Math.random() * 10; }
        rp.setY(ri, y);
      }
      rp.needsUpdate = true;
      // storm lightning
      if (E.weather === 'storm' && Math.random() < dt * 0.5) {
        E._flash = 0.35;
        if (RL.Audio) RL.Audio.blip(90);
      }
    }
    if (E._flash > 0) {
      E._flash -= dt;
      E.hemi.intensity += E._flash * 2;
    }
  }

  E.stop = function () { E.running = false; cancelAnimationFrame(E.raf); };
  E.resize = function () {
    if (!E.canvas) return;
    var w = E.canvas.clientWidth || window.innerWidth, h = E.canvas.clientHeight || window.innerHeight;
    E.renderer.setSize(w, h, false);
    E.camera.aspect = w / h;
    E.camera.updateProjectionMatrix();
  };
  E.setCamSens = function (s) { E.sens = s; };
  E.snapshot = function () {
    try { return E.renderer.domElement.toDataURL('image/jpeg', 0.6); } catch (e) { return ''; }
  };

  window.RL = window.RL || {};
  RL.Engine = E;
})();
