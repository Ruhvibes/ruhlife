/* RuhLife Sim — owns ALL entity state; engine only renders. */
(function () {
  'use strict';

  var CAPS = {
    low: { plants: 120, animals: 24 },
    med: { plants: 220, animals: 40 },
    high: { plants: 350, animals: 60 }
  };

  var PLANT_DEFS = {
    grass:     { rate: 0.50, water: 'land',  food: 1 },
    bush:      { rate: 0.22, water: 'land',  food: 2 },
    flower:    { rate: 0.35, water: 'land',  food: 1 },
    sapling:   { rate: 0.30, water: 'land',  food: 0 },
    tree:      { rate: 0.12, water: 'land',  food: 0 },
    fruitTree: { rate: 0.10, water: 'land',  food: 3 },
    aquatic:   { rate: 0.30, water: 'water', food: 1 }
  };
  var ANIMAL_DEFS = {
    bird:      { food: ['fruitTree', 'flower'], water: 'land', flies: true },
    butterfly: { food: ['flower'],             water: 'land', flies: true },
    bee:       { food: ['flower'],             water: 'land', flies: true },
    rabbit:    { food: ['grass', 'bush'],      water: 'land' },
    deer:      { food: ['grass', 'bush', 'sapling'], water: 'land' },
    fish:      { food: ['aquatic'],            water: 'water' },
    frog:      { food: ['flower', 'grass'],     water: 'shore' }
  };

  var S = {
    engine: null, quality: 'med',
    plants: [], animals: [], decors: [],
    nextId: 1, waterLevel: 0.7,
    _events: [], simDays: 0,
    rainMemory: 0, births: 0,
    _mats: {}, _tmp: null
  };

  function mat(color) {
    if (!S._mats[color]) S._mats[color] = new THREE.MeshLambertMaterial({ color: color });
    return S._mats[color];
  }
  function ghostMat(color) {
    return new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: 0.55 });
  }
  S.ghostMat = ghostMat;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function ev(text) {
    S._events.unshift(text);
    if (S._events.length > 20) S._events.pop();
  }

  // ---------------- plant meshes ----------------
  function buildPlantMesh(type) {
    var g = new THREE.Group();
    var green = mat(0x3f9e3f), dark = mat(0x2c7a2c), trunkM = mat(0x7a5230);
    if (type === 'grass') {
      for (var i = 0; i < 5; i++) {
        var c = new THREE.Mesh(new THREE.ConeGeometry(0.09, rnd(0.5, 0.9), 4), green);
        c.position.set(rnd(-0.3, 0.3), 0.3, rnd(-0.3, 0.3));
        c.rotation.z = rnd(-0.2, 0.2);
        g.add(c);
      }
    } else if (type === 'bush') {
      var b = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), dark);
      b.scale.y = 0.7; b.position.y = 0.6; b.castShadow = true; g.add(b);
    } else if (type === 'flower') {
      var st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), green);
      st.position.y = 0.45; g.add(st);
      var cols = [0xff6b9d, 0xffd93d, 0xff8c42, 0xc77dff, 0xffffff];
      var fl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), mat(pick(cols)));
      fl.position.y = 0.95; g.add(fl);
    } else if (type === 'sapling' || type === 'tree' || type === 'fruitTree') {
      var big = (type !== 'sapling');
      var th = big ? 0.35 : 0.15, th2 = big ? 0.28 : 0.12, hh = big ? 2.2 : 1.0;
      var tr = new THREE.Mesh(new THREE.CylinderGeometry(th2, th, hh, 6), trunkM);
      tr.position.y = hh / 2; tr.castShadow = true; g.add(tr);
      var fs = big ? 1.6 : 0.7;
      for (var k = 0; k < (big ? 3 : 2); k++) {
        var f = new THREE.Mesh(new THREE.SphereGeometry(fs * (1 - k * 0.22), 8, 6), k ? dark : green);
        f.position.y = hh + k * fs * 0.75; f.castShadow = true; g.add(f);
      }
      if (type === 'fruitTree') {
        for (var m = 0; m < 6; m++) {
          var fr = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), mat(0xe63946));
          fr.position.set(rnd(-1.1, 1.1), hh + rnd(0, 1.4), rnd(-1.1, 1.1));
          g.add(fr);
        }
      }
      g.userData.foliage = g.children.slice(1);
    } else if (type === 'aquatic') {
      var pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 10), dark);
      pad.position.y = 0.05; g.add(pad);
      var bf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 6), mat(0xff9ecb));
      bf.position.y = 0.25; g.add(bf);
    }
    return g;
  }

  // ---------------- decor meshes ----------------
  function buildDecorMesh(type) {
    var g = new THREE.Group();
    if (type === 'rock' || type === 'bigrock') {
      var s = type === 'bigrock' ? rnd(1.2, 1.8) : rnd(0.5, 0.8);
      var r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(0x8d8d93));
      r.position.y = s * 0.5; r.rotation.set(rnd(0, 3), rnd(0, 3), 0);
      r.castShadow = true; g.add(r);
    } else if (type === 'flowers') {
      for (var i = 0; i < 7; i++) {
        var st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 4), mat(0x3f9e3f));
        st.position.set(rnd(-0.8, 0.8), 0.3, rnd(-0.8, 0.8)); g.add(st);
        var fl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5),
          mat(pick([0xff6b9d, 0xffd93d, 0xff8c42, 0xc77dff])));
        fl.position.copy(st.position); fl.position.y = 0.65; g.add(fl);
      }
    } else if (type === 'pond' || type === 'fountain') {
      var w = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.25, 14),
        new THREE.MeshLambertMaterial({ color: 0x2e86c1, transparent: true, opacity: 0.8 }));
      w.position.y = 0.1; g.add(w);
      var rim = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.25, 6, 14), mat(0x9c8b70));
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.2; g.add(rim);
      if (type === 'fountain') {
        var jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.4, 6),
          new THREE.MeshLambertMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.7 }));
        jet.position.y = 1.4; g.add(jet);
        g.userData.jet = jet;
      }
      g.userData.isWaterFeature = true;
    }
    return g;
  }

  // ---------------- animal meshes ----------------
  function buildAnimalMesh(sp) {
    var g = new THREE.Group();
    function part(geo, color, x, y, z) {
      var m = new THREE.Mesh(geo, mat(color));
      m.position.set(x || 0, y || 0, z || 0); m.castShadow = true;
      g.add(m); return m;
    }
    if (sp === 'bird') {
      part(new THREE.SphereGeometry(0.35, 8, 6), 0x4a90d9, 0, 0.5, 0);
      part(new THREE.SphereGeometry(0.22, 7, 6), 0x4a90d9, 0, 0.75, 0.3);
      var beak = part(new THREE.ConeGeometry(0.08, 0.25, 5), 0xffb703, 0, 0.72, 0.55);
      beak.rotation.x = Math.PI / 2;
      g.userData.wl = part(new THREE.BoxGeometry(0.9, 0.06, 0.4), 0x357abd, -0.5, 0.55, 0);
      g.userData.wr = part(new THREE.BoxGeometry(0.9, 0.06, 0.4), 0x357abd, 0.5, 0.55, 0);
    } else if (sp === 'butterfly' || sp === 'bee') {
      var bc = sp === 'bee' ? 0xf4d35e : 0xff8c42;
      part(new THREE.SphereGeometry(sp === 'bee' ? 0.18 : 0.12, 7, 6), bc, 0, 0.5, 0);
      g.userData.wl = part(new THREE.BoxGeometry(0.35, 0.03, 0.3), 0xffffff, -0.2, 0.55, 0);
      g.userData.wr = part(new THREE.BoxGeometry(0.35, 0.03, 0.3), 0xffffff, 0.2, 0.55, 0);
    } else if (sp === 'rabbit') {
      part(new THREE.SphereGeometry(0.4, 8, 6), 0xb08968, 0, 0.4, 0).scale.set(1, 0.85, 1.25);
      part(new THREE.SphereGeometry(0.25, 7, 6), 0xb08968, 0, 0.7, 0.45);
      part(new THREE.BoxGeometry(0.1, 0.35, 0.08), 0xb08968, -0.1, 1.05, 0.4);
      part(new THREE.BoxGeometry(0.1, 0.35, 0.08), 0xb08968, 0.1, 1.05, 0.4);
    } else if (sp === 'deer') {
      part(new THREE.BoxGeometry(0.7, 0.7, 1.4), 0xa47148, 0, 1.0, 0);
      part(new THREE.BoxGeometry(0.3, 0.7, 0.3), 0xa47148, 0, 1.6, 0.8);
      part(new THREE.BoxGeometry(0.35, 0.35, 0.5), 0xa47148, 0, 1.95, 0.95);
      for (var li = 0; li < 4; li++)
        part(new THREE.BoxGeometry(0.16, 0.75, 0.16), 0x8a5a33, li < 2 ? -0.25 : 0.25, 0.38, li % 2 ? 0.5 : -0.5);
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), 0x6b4423, -0.12, 2.3, 0.9);
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), 0x6b4423, 0.12, 2.3, 0.9);
    } else if (sp === 'fish') {
      var fb = part(new THREE.SphereGeometry(0.35, 8, 6), 0xff9f1c, 0, 0.4, 0);
      fb.scale.set(0.6, 0.7, 1.4);
      g.userData.tail = part(new THREE.BoxGeometry(0.08, 0.4, 0.35), 0xe07b00, 0, 0.4, -0.85);
    } else if (sp === 'frog') {
      part(new THREE.SphereGeometry(0.35, 8, 6), 0x55a630, 0, 0.3, 0).scale.set(1, 0.7, 1.15);
      part(new THREE.SphereGeometry(0.12, 6, 5), 0xffffff, -0.12, 0.55, 0.25);
      part(new THREE.SphereGeometry(0.12, 6, 5), 0xffffff, 0.12, 0.55, 0.25);
    }
    return g;
  }

  // ---------------- entity creation ----------------
  function addPlant(type, x, z, growth) {
    var E = S.engine;
    var cap = CAPS[S.quality].plants;
    if (S.plants.length >= cap) return null;
    var mesh = buildPlantMesh(type);
    var y = E.terrainHeight(x, z);
    if (type === 'aquatic') y = E.waterLevel;
    mesh.position.set(x, y, z);
    var sc = 0.25 + (growth || 0) * 0.75;
    mesh.scale.set(sc, sc, sc);
    var e = { id: S.nextId++, kind: 'plant', type: type, x: x, z: z,
              growth: growth !== undefined ? growth : rnd(0.15, 0.4),
              health: rnd(0.7, 1), water: 0.6, mesh: mesh, anim: Math.random() * 6.28 };
    mesh.userData.eid = e.id; mesh.userData.ekind = 'plant';
    E.addMesh(mesh); E.addSelectable(mesh);
    S.plants.push(e);
    return e;
  }

  function addAnimal(species, x, z) {
    var E = S.engine;
    var cap = CAPS[S.quality].animals;
    if (S.animals.length >= cap) return null;
    var mesh = buildAnimalMesh(species);
    var y = E.terrainHeight(x, z);
    if (species === 'fish') y = E.waterLevel - 0.3;
    if (ANIMAL_DEFS[species].flies) y += rnd(4, 8);
    mesh.position.set(x, y, z);
    var e = { id: S.nextId++, kind: 'animal', species: species, x: x, z: z,
              hunger: rnd(0.2, 0.5), thirst: rnd(0.2, 0.5), health: rnd(0.7, 1),
              state: 'wander', tx: x, tz: z, anim: Math.random() * 6.28,
              stuck: 0, lx: x, lz: z, mesh: mesh };
    mesh.userData.eid = e.id; mesh.userData.ekind = 'animal';
    E.addMesh(mesh); E.addSelectable(mesh);
    S.animals.push(e);
    return e;
  }

  function addDecor(type, x, z) {
    var E = S.engine;
    var mesh = buildDecorMesh(type);
    mesh.position.set(x, E.terrainHeight(x, z), z);
    var e = { id: S.nextId++, kind: 'decor', type: type, x: x, z: z, mesh: mesh };
    mesh.userData.eid = e.id; mesh.userData.ekind = 'decor';
    E.addMesh(mesh); E.addSelectable(mesh);
    S.decors.push(e);
    if (type === 'pond' || type === 'fountain') S.waterLevel = Math.min(1, S.waterLevel + 0.08);
    return e;
  }

  function removeEntity(id) {
    var E = S.engine;
    var lists = [S.plants, S.animals, S.decors];
    for (var li = 0; li < 3; li++) {
      var arr = lists[li];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === id) {
          var e = arr[i];
          E.removeMesh(e.mesh); E.removeSelectable(e.mesh);
          arr.splice(i, 1);
          return true;
        }
      }
    }
    return false;
  }

  // ---------------- placement rules ----------------
  function canPlaceAt(cat, item, x, z) {
    var E = S.engine, b = E.worldBounds();
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ)
      return { ok: false, reason: 'invalid_bounds' };
    var water = E.isWater(x, z);
    var def = PLANT_DEFS[item] || ANIMAL_DEFS[item];
    if (cat === 'plants') {
      if (def.water === 'water' && !water) return { ok: false, reason: 'invalid_water' };
      if (def.water === 'land' && water) return { ok: false, reason: 'invalid_land' };
    } else if (cat === 'animals') {
      if (item === 'fish' && !water) return { ok: false, reason: 'invalid_water' };
      if (item !== 'fish' && item !== 'frog' && water) return { ok: false, reason: 'invalid_land' };
    } else if (cat === 'water') {
      if (water) return { ok: false, reason: 'invalid_overlap' };
    } else if (cat === 'rocks') {
      if (water) return { ok: false, reason: 'invalid_land' };
    }
    // overlap check (cheap)
    var all = S.plants.concat(S.decors);
    for (var i = 0; i < all.length; i++) {
      var dx = all[i].x - x, dz = all[i].z - z;
      if (dx * dx + dz * dz < 1.2) return { ok: false, reason: 'invalid_overlap' };
    }
    return { ok: true };
  }

  // ---------------- tick ----------------
  function sunlight() {
    var h = S.engine.getTimeOfDay();
    if (h < 5.5 || h > 19.5) return 0.05;
    if (h < 8 || h > 17) return 0.6;
    return 1.0;
  }

  function tickPlants(dtH, weather) {
    var sun = sunlight();
    var rainK = (weather === 'rain' || weather === 'storm') ? 1 : 0;
    var dying = [];
    for (var i = 0; i < S.plants.length; i++) {
      var p = S.plants[i], def = PLANT_DEFS[p.type];
      // water
      p.water += (rainK * 0.25 + (def.water === 'water' ? 0.2 : 0) - 0.02) * dtH;
      p.water = Math.max(0, Math.min(1, p.water));
      var wf = p.water < 0.2 ? 0.25 : (p.water < 0.5 ? 0.7 : 1);
      // growth
      if (p.growth < 1) {
        p.growth = Math.min(1, p.growth + dtH * def.rate * (0.3 + sun * 0.7) * wf * 0.5);
      }
      // health
      if (p.water < 0.15 || sun < 0.1 && p.type !== 'aquatic') p.health -= dtH * 0.05;
      else if (p.water > 0.4) p.health = Math.min(1, p.health + dtH * 0.03);
      if (p.health <= 0) { dying.push(p); continue; }
      // mesh scale by growth
      var sc = 0.25 + p.growth * 0.75;
      p.mesh.scale.set(sc, sc, sc);
      // unhealthy tint
      p.mesh.traverse(function (o) {
        if (o.isMesh && !o.userData._tint) { o.userData._tint = true; }
      });
      // sway
      p.anim += 0.016;
      if (p.mesh.userData.foliage) {
        var sw = Math.sin(p.anim * 2 + p.x) * 0.03 * (S.engine.weatherCur ? S.engine.weatherCur.windSway : 1);
        p.mesh.rotation.z = sw;
      }
    }
    for (var d = 0; d < dying.length; d++) {
      removeEntity(dying[d].id);
      ev('A plant withered away');
    }
    // reproduction
    if (Math.random() < dtH * 0.15 && S.plants.length < CAPS[S.quality].plants) {
      var cand = [];
      for (var c = 0; c < S.plants.length; c++) {
        var q = S.plants[c];
        if (q.growth > 0.8 && q.health > 0.7 && (q.type === 'tree' || q.type === 'bush' || q.type === 'flower' || q.type === 'grass')) cand.push(q);
      }
      if (cand.length) {
        var par = pick(cand);
        var nx = par.x + rnd(-4, 4), nz = par.z + rnd(-4, 4);
        var v = canPlaceAt('plants', par.type === 'tree' ? 'sapling' : par.type, nx, nz);
        if (v.ok) { addPlant(par.type === 'tree' ? 'sapling' : par.type, nx, nz, 0.05); }
      }
    }
  }

  function nearestFood(a) {
    var def = ANIMAL_DEFS[a.species], best = null, bd = 1e9;
    for (var i = 0; i < S.plants.length; i++) {
      var p = S.plants[i];
      if (def.food.indexOf(p.type) < 0 || p.health < 0.3) continue;
      var dx = p.x - a.x, dz = p.z - a.z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = p; }
    }
    return best ? { x: best.x, z: best.z, d: Math.sqrt(bd), plant: best } : null;
  }
  function nearestWater(a) {
    // find water: sample terrain around
    var E = S.engine;
    for (var r = 3; r < 40; r += 4) {
      for (var k = 0; k < 8; k++) {
        var ang = k / 8 * Math.PI * 2;
        var x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r;
        if (E.isWater(x, z)) return { x: x, z: z };
      }
    }
    return null;
  }

  function tickAnimals(dtH, weather) {
    var E = S.engine, h = E.getTimeOfDay();
    var isNight = h < 5.5 || h > 19.5;
    var dying = [];
    for (var i = 0; i < S.animals.length; i++) {
      var a = S.animals[i], def = ANIMAL_DEFS[a.species];
      a.hunger = Math.min(1, a.hunger + dtH * 0.06);
      a.thirst = Math.min(1, a.thirst + dtH * 0.08);
      // decide target
      var speed = 2.2;
      if (isNight && !def.flies) { a.state = 'rest'; }
      else if (a.thirst > 0.6 && def.water !== 'water') {
        var w = nearestWater(a);
        if (w) { a.tx = w.x; a.tz = w.z; a.state = 'drink'; }
      } else if (a.hunger > 0.5) {
        var f = nearestFood(a);
        if (f) { a.tx = f.x; a.tz = f.z; a.state = 'eat'; a.food = f; }
      } else if (a.state === 'rest' || a.state === 'eat' || a.state === 'drink' || Math.random() < 0.02) {
        if (Math.random() < 0.3 || dist2(a.x, a.z, a.tx, a.tz) < 1) {
          var b = E.worldBounds();
          a.tx = rnd(b.minX, b.maxX); a.tz = rnd(b.minZ, b.maxZ);
          if (a.species === 'fish' && !E.isWater(a.tx, a.tz)) { a.tx = a.x; a.tz = a.z; }
          a.state = 'wander';
        }
      }
      // eat / drink when close
      if (a.state === 'eat' && a.food && dist2(a.x, a.z, a.food.x, a.food.z) < 2.5) {
        a.hunger = Math.max(0, a.hunger - dtH * 1.2);
        a.food.health = Math.max(0.2, a.food.health - dtH * 0.05);
        if (a.hunger < 0.2) a.state = 'wander';
      }
      if (a.state === 'drink' && E.isWater(a.x, a.z)) {
        a.thirst = Math.max(0, a.thirst - dtH * 1.5);
        if (a.thirst < 0.2) a.state = 'wander';
      }
      // move
      var dx = a.tx - a.x, dz = a.tz - a.z, d = Math.sqrt(dx * dx + dz * dz);
      if (a.state !== 'rest' && d > 0.3) {
        var sp = speed * (def.flies ? 2.2 : 1) * (isNight ? 0.4 : 1);
        var step = Math.min(d, sp * dtH * 8);
        a.x += dx / d * step; a.z += dz / d * step;
        // unstuck
        if (dist2(a.x, a.z, a.lx, a.lz) < 0.01) { a.stuck += dtH; } else { a.stuck = 0; }
        a.lx = a.x; a.lz = a.z;
        if (a.stuck > 0.05) { a.tx = a.x + rnd(-6, 6); a.tz = a.z + rnd(-6, 6); a.stuck = 0; }
        var b2 = E.worldBounds();
        a.x = Math.max(b2.minX, Math.min(b2.maxX, a.x));
        a.z = Math.max(b2.minZ, Math.min(b2.maxZ, a.z));
        if (a.species === 'fish' && !E.isWater(a.x, a.z)) { a.x = a.lx; a.z = a.lz; }
        if (a.species !== 'fish' && a.species !== 'frog' && E.isWater(a.x, a.z)) { a.x = a.lx; a.z = a.lz; }
      }
      // health
      if (a.hunger > 0.9 || a.thirst > 0.9) a.health -= dtH * 0.08;
      else if (a.hunger < 0.4 && a.thirst < 0.4) a.health = Math.min(1, a.health + dtH * 0.05);
      if (a.health <= 0) { dying.push(a); continue; }
      // mesh transform + animation
      var m = a.mesh;
      var gy = E.terrainHeight(a.x, a.z);
      var yy = gy;
      if (a.species === 'fish') yy = E.waterLevel - 0.3;
      else if (def.flies) yy = gy + 4 + Math.sin(a.anim * 1.5) * 0.8;
      else if (def.water === 'shore') yy = gy + (E.isWater(a.x, a.z) ? -0.1 : 0.1);
      m.position.set(a.x, yy, a.z);
      if (d > 0.3) m.rotation.y = Math.atan2(dx, dz);
      a.anim += 0.12;
      animateAnimal(a, isNight);
    }
    for (var di = 0; di < dying.length; di++) {
      removeEntity(dying[di].id);
      ev('An animal passed away');
    }
    // births
    if (Math.random() < dtH * 0.1 && S.animals.length < CAPS[S.quality].animals) {
      var healthy = S.animals.filter(function (x) { return x.health > 0.8 && x.hunger < 0.4; });
      if (healthy.length >= 2) {
        var par = pick(healthy);
        var na = addAnimal(par.species, par.x + rnd(-3, 3), par.z + rnd(-3, 3));
        if (na) { ev('A baby ' + par.species + ' was born!'); S.births++; }
      }
    }
    // water level follows weather
    if (weather === 'rain' || weather === 'storm') S.waterLevel = Math.min(1, S.waterLevel + dtH * 0.05);
    else S.waterLevel = Math.max(0.25, S.waterLevel - dtH * 0.008);
  }
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

  function animateAnimal(a, isNight) {
    var u = a.mesh.userData, t = a.anim;
    if (u.wl && u.wr) {
      var f = Math.sin(t * (a.species === 'butterfly' ? 3 : 2)) * 0.7;
      u.wl.rotation.z = f; u.wr.rotation.z = -f;
    }
    if (a.species === 'rabbit' || a.species === 'frog') {
      a.mesh.position.y += Math.abs(Math.sin(t * 1.4)) * 0.35;
    }
    if (a.species === 'fish' && u.tail) {
      u.tail.rotation.y = Math.sin(t * 2) * 0.5;
    }
    if (a.species === 'deer') {
      a.mesh.position.y += Math.sin(t) * 0.05;
    }
    if (u.jet) u.jet.rotation.y += 0.05;
  }

  // ---------------- public tick ----------------
  S.tick = function (dtH) {
    if (!S.engine || dtH <= 0) return;
    S.simDays += dtH / 24;
    var w = S.engine.weather;
    tickPlants(dtH, w);
    tickAnimals(dtH, w);
  };

  // ---------------- stats ----------------
  S.counts = function () {
    var byT = {}, byS = {}, hp = 0;
    for (var i = 0; i < S.plants.length; i++) { var p = S.plants[i]; byT[p.type] = (byT[p.type] || 0) + 1; hp += p.health; }
    for (var j = 0; j < S.animals.length; j++) { var a = S.animals[j]; byS[a.species] = (byS[a.species] || 0) + 1; }
    return {
      plants: S.plants.length, plantsByType: byT,
      animals: S.animals.length, animalsBySpecies: byS,
      avgPlantHealth: S.plants.length ? hp / S.plants.length : 1,
      waterLevel: S.waterLevel
    };
  };

  S.ecosystemHealth = function () {
    var c = S.counts();
    var plantH = c.avgPlantHealth;                       // 0..1
    var water = c.waterLevel;                            // 0..1
    var nA = c.animals, nP = c.plants;
    var balance = nP === 0 ? 0 : Math.max(0, 1 - Math.abs(nA - nP * 0.25) / (nP * 0.5 + 1));
    var bio = Math.min(1, (Object.keys(c.plantsByType).length + Object.keys(c.animalsBySpecies).length) / 8);
    var h = plantH * 40 + water * 25 + balance * 20 + bio * 15;
    return Math.round(Math.max(0, Math.min(100, h)));
  };

  S.suggestions = function () {
    var c = S.counts(), out = [];
    var sick = 0;
    for (var i = 0; i < S.plants.length; i++) if (S.plants[i].health < 0.5) sick++;
    if (sick > c.plants * 0.25 && c.plants > 3) out.push('sug_sick_plants');
    if (c.waterLevel < 0.35) out.push('sug_more_water');
    if (c.animals > c.plants * 0.4 && c.plants > 5) out.push('sug_balance');
    if (c.plants < 8) out.push('sug_more_plants');
    if (!out.length) out.push('sug_healthy');
    return out;
  };

  S.events = function () { return S._events.slice(); };

  S.getEntity = function (id) {
    var all = S.plants.concat(S.animals, S.decors);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  };

  // ---------------- init / serialize ----------------
  S.init = function (engine, cfg) {
    S.engine = engine; S.quality = cfg.quality || 'med';
    S.plants = []; S.animals = []; S.decors = [];
    S.nextId = 1; S._events = []; S.simDays = 0; S.waterLevel = 0.7; S.births = 0;
    var b = engine.worldBounds();
    function landPt() {
      for (var k = 0; k < 40; k++) {
        var x = rnd(b.minX, b.maxX), z = rnd(b.minZ, b.maxZ);
        if (!engine.isWater(x, z)) return { x: x, z: z };
      }
      return { x: 0, z: 0 };
    }
    function waterPt() {
      for (var k = 0; k < 40; k++) {
        var x = rnd(b.minX, b.maxX), z = rnd(b.minZ, b.maxZ);
        if (engine.isWater(x, z)) return { x: x, z: z };
      }
      return null;
    }
    var st = cfg.starter || {};
    var i, p;
    for (i = 0; i < (st.trees || 6); i++) { p = landPt(); addPlant('tree', p.x, p.z, rnd(0.5, 0.9)); }
    for (i = 0; i < (st.bushes || 8); i++) { p = landPt(); addPlant('bush', p.x, p.z, rnd(0.4, 0.9)); }
    for (i = 0; i < (st.flowers || 10); i++) { p = landPt(); addPlant('flower', p.x, p.z, rnd(0.4, 1)); }
    for (i = 0; i < (st.grass || 20); i++) { p = landPt(); addPlant('grass', p.x, p.z, rnd(0.5, 1)); }
    for (i = 0; i < (st.aquatic || 4); i++) { var wp = waterPt(); if (wp) addPlant('aquatic', wp.x, wp.z, rnd(0.5, 1)); }
    var an = st.animals || { rabbit: 3, bird: 2, butterfly: 3 };
    for (var sp in an) {
      for (i = 0; i < an[sp]; i++) {
        if (sp === 'fish') { var w2 = waterPt(); if (w2) addAnimal(sp, w2.x, w2.z); }
        else { p = landPt(); addAnimal(sp, p.x, p.z); }
      }
    }
    ev('World created');
  };

  S.serialize = function () {
    function ser(e) {
      var o = { id: e.id, kind: e.kind, type: e.type, species: e.species, x: e.x, z: e.z };
      if (e.kind === 'plant') { o.growth = e.growth; o.health = e.health; o.water = e.water; }
      if (e.kind === 'animal') { o.hunger = e.hunger; o.thirst = e.thirst; o.health = e.health; }
      return o;
    }
    return {
      v: 1, nextId: S.nextId, simDays: S.simDays, waterLevel: S.waterLevel,
      plants: S.plants.map(ser), animals: S.animals.map(ser), decors: S.decors.map(ser),
      events: S._events.slice(0, 20)
    };
  };

  S.deserialize = function (data, engine) {
    S.engine = engine; S.quality = (data && data.quality) || 'med';
    S.plants = []; S.animals = []; S.decors = [];
    S.nextId = (data && data.nextId) || 1;
    S.simDays = (data && data.simDays) || 0;
    S.waterLevel = (data && data.waterLevel !== undefined) ? data.waterLevel : 0.7;
    S._events = (data && data.events) || [];
    if (!data) return;
    function restore(e) {
      var ent = null;
      if (e.kind === 'plant') {
        ent = addPlant(e.type, e.x, e.z, e.growth);
        if (ent) { ent.health = e.health; ent.water = e.water; }
      } else if (e.kind === 'animal') {
        ent = addAnimal(e.species, e.x, e.z);
        if (ent) { ent.hunger = e.hunger; ent.thirst = e.thirst; ent.health = e.health; }
      } else if (e.kind === 'decor') {
        ent = addDecor(e.type, e.x, e.z);
      }
      if (ent) {
        // keep original id
        var old = ent.id;
        ent.id = e.id; ent.mesh.userData.eid = e.id;
      }
    }
    (data.plants || []).forEach(restore);
    (data.animals || []).forEach(restore);
    (data.decors || []).forEach(restore);
  };

  // place helpers used by UI
  S.placePlant = function (type, x, z) { return addPlant(type, x, z, 0.1); };
  S.placeAnimal = function (species, x, z) { return addAnimal(species, x, z); };
  S.placeDecor = function (type, x, z) { return addDecor(type, x, z); };
  S.removeEntity = removeEntity;
  S.getEntity = S.getEntity;
  S.canPlaceAt = canPlaceAt;
  S.buildGhost = function (cat, item) {
    var g = (cat === 'plants') ? buildPlantMesh(item)
          : (cat === 'animals') ? buildAnimalMesh(item)
          : buildDecorMesh(item);
    g.traverse(function (o) {
      if (o.isMesh) { o.material = ghostMat(0x4caf50); o.castShadow = false; }
    });
    return g;
  };

  window.RL = window.RL || {};
  RL.Sim = S;
})();
