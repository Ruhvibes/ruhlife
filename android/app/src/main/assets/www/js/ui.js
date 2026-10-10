/* RuhLife UI — screens, HUD, build mode, dashboard, worlds, settings, tutorial */
(function () {
  'use strict';

  var U = {
    screen: 'home',
    worldId: null, worldMeta: null,
    dirty: false, autosaveT: null, dashT: null, goalT: null,
    buildCat: 'trees', buildItem: null, undoStack: [],
    selectedId: null, exitArm: 0,
    challenge: null, surviveT: 0
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    return d;
  }
  function t(k) { return RL.t(k); }

  // ---------- toast ----------
  function toast(msg, ms) {
    var w = $('toast-wrap');
    var d = el('div', 'toast', msg);
    w.appendChild(d);
    setTimeout(function () { d.classList.add('show'); }, 30);
    setTimeout(function () {
      d.classList.remove('show');
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 400);
    }, ms || 2200);
  }
  U.toast = toast;

  // ---------- modal ----------
  function confirmDlg(msg, onYes) {
    $('modal-msg').textContent = msg;
    $('modal-ok').textContent = t('yes');
    $('modal-cancel').textContent = t('no');
    $('modal').classList.add('show');
    $('modal-ok').onclick = function () { $('modal').classList.remove('show'); if (onYes) onYes(); };
    $('modal-cancel').onclick = function () { $('modal').classList.remove('show'); };
  }
  U.confirm = confirmDlg;

  // ---------- screens ----------
  var SCREENS = ['home', 'setup', 'worlds', 'help', 'settings', 'game'];
  function show(name) {
    U.screen = name;
    SCREENS.forEach(function (s) {
      var e = $('screen-' + s);
      if (e) e.classList.toggle('active', s === name);
    });
    if (name === 'home') renderHome();
    if (name === 'worlds') renderWorlds();
    if (name === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }
  U.show = show;

  // ---------- home ----------
  function renderHome() {
    var facts = RL.I18N[RL.getLang()].facts || RL.I18N.en.facts;
    var day = Math.floor(Date.now() / 86400000);
    $('fact-text').textContent = facts[day % facts.length];
    $('btn-lang').textContent = RL.getLang() === 'en' ? 'EN | हिंदी' : 'EN | हिंदी';
    // continue button state
    var last = RL.Save.getLast();
    $('btn-continue').classList.toggle('disabled', !last);
  }

  function wireHome() {
    $('btn-new').onclick = function () { RL.Audio.unlock(); RL.Audio.blip(660); show('setup'); };
    $('btn-continue').onclick = function () {
      RL.Audio.unlock();
      var id = RL.Save.getLast();
      if (!id) { toast(t('no_last_world')); return; }
      loadWorld(id);
    };
    $('btn-worlds').onclick = function () { RL.Audio.blip(660); show('worlds'); };
    $('btn-help').onclick = function () { RL.Audio.blip(660); show('help'); };
    $('btn-settings').onclick = function () { RL.Audio.blip(660); show('settings'); };
    $('btn-lang').onclick = function () {
      var nl = RL.getLang() === 'en' ? 'hi' : 'en';
      RL.setLang(nl);
      RL.settings.lang = nl; RL.Save.saveSettings(RL.settings);
      renderHome();
    };
    $('btn-exit').onclick = function () {
      var now = Date.now();
      if (now - U.exitArm < 2500) {
        if (typeof Android !== 'undefined' && Android.closeApp) { try { Android.closeApp(); } catch (e) {} }
        else toast(t('exit_msg'));
      } else { U.exitArm = now; toast(t('exit_msg')); }
    };
  }

  // ---------- setup ----------
  var setupState = { size: 'm', env: 'forest', mode: 'sandbox', quality: 'med' };
  function wireSetup() {
    $('btn-setup-back').onclick = function () { show('home'); };
    document.querySelectorAll('.size-opt').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.size-opt').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel'); setupState.size = b.dataset.v; RL.Audio.blip(520);
      };
    });
    document.querySelectorAll('.env-card').forEach(function (c) {
      c.onclick = function () {
        document.querySelectorAll('.env-card').forEach(function (x) { x.classList.remove('sel'); });
        c.classList.add('sel'); setupState.env = c.dataset.v; RL.Audio.blip(520);
      };
    });
    document.querySelectorAll('.mode-opt').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.mode-opt').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel'); setupState.mode = b.dataset.v; RL.Audio.blip(520);
      };
    });
    document.querySelectorAll('.q-opt').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.q-opt').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel'); setupState.quality = b.dataset.v; RL.Audio.blip(520);
      };
    });
    $('btn-start-world').onclick = function () {
      RL.Audio.unlock(); RL.Audio.blip(760);
      var name = $('setup-name').value.trim() || 'Green Valley';
      var meta = {
        name: name, size: setupState.size, env: setupState.env,
        mode: setupState.mode, quality: setupState.quality,
        starter: { trees: 6, bushes: 8, flowers: 10, grass: 20, aquatic: 4,
                   animals: { rabbit: 3, bird: 2, butterfly: 3 } }
      };
      var id = RL.Save.create(meta);
      if (!id) { toast(t('save_failed')); return; }
      startWorld(id, meta, null);
    };
  }

  // ---------- worlds ----------
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }
  function renderWorlds() {
    var list = $('worlds-list');
    list.innerHTML = '';
    var worlds = RL.Save.list();
    if (!worlds.length) {
      list.appendChild(el('div', 'empty', t('no_worlds')));
      return;
    }
    worlds.forEach(function (w) {
      var card = el('div', 'world-card');
      var img = el('img', 'world-thumb');
      img.src = w.thumb || 'assets/logo.png';
      card.appendChild(img);
      var info = el('div', 'world-info',
        '<b>' + escapeHtml(w.meta.name) + '</b><span>' + t('w_last') + ': ' + fmtDate(w.meta.lastPlayed) + '</span>');
      card.appendChild(info);
      var btns = el('div', 'world-btns');
      function mk(label, fn) { var b = el('button', 'btn small', label); b.onclick = function (e) { e.stopPropagation(); fn(); }; btns.appendChild(b); return b; }
      mk(t('w_load'), function () { loadWorld(w.id); });
      mk(t('w_rename'), function () {
        var nn = prompt(t('w_new_name'), w.meta.name);
        if (nn && nn.trim()) { RL.Save.updateMeta(w.id, { name: nn.trim() }); toast(t('world_renamed')); renderWorlds(); }
      });
      mk(t('w_dup'), function () {
        var nid = RL.Save.duplicate(w.id);
        toast(nid ? t('world_dup') : t('save_failed')); renderWorlds();
      });
      mk(t('w_del'), function () {
        confirmDlg(t('w_confirm_del'), function () {
          RL.Save.remove(w.id); toast(t('world_deleted')); renderWorlds();
        });
      });
      card.appendChild(btns);
      card.onclick = function () { loadWorld(w.id); };
      list.appendChild(card);
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadWorld(id) {
    var rec = RL.Save.get(id);
    if (!rec || !rec.data) { toast(t('load_failed')); return; }
    try {
      startWorld(id, rec.meta, rec.data);
    } catch (e) { toast(t('load_failed')); }
  }

  // ---------- game start / stop ----------
  function startWorld(id, meta, data) {
    $('loading').classList.add('show');
    setTimeout(function () {
      try {
        U.worldId = id; U.worldMeta = meta;
        U.undoStack = []; U.dirty = false; U.selectedId = null;
        U.challenge = null; U.surviveT = 0;
        RL.Save.setLast(id);
        var canvas = $('gl');
        RL.Engine.init(canvas, { size: meta.size, env: meta.env, quality: meta.quality });
        RL.Engine.setCamSens(RL.settings.camSens || 1);
        if (data && data.sim) {
          RL.Sim.deserialize(data.sim, RL.Engine);
          RL.Sim.quality = meta.quality;
          if (data.timeOfDay !== undefined) RL.Engine.setTimeOfDay(data.timeOfDay);
          if (data.weather) RL.Engine.setWeather(data.weather, true);
        } else {
          RL.Sim.init(RL.Engine, { quality: meta.quality, starter: meta.starter });
        }
        if (meta.mode === 'challenge') setupChallenge(meta);
        wireGame();
        RL.Engine.onTapSelect(onSelect);
        RL.Engine.start(function (dtH) { RL.Sim.tick(dtH); U.dirty = true; });
        RL.Audio.setScene({ weather: RL.Engine.weather, hour: RL.Engine.getTimeOfDay() });
        show('game');
        RL.Engine.resize();
        // autosave + dashboard + goals
        clearInterval(U.autosaveT); clearInterval(U.dashT); clearInterval(U.goalT);
        U.autosaveT = setInterval(function () {
          if (U.dirty && U.screen === 'game') { saveWorld(true); }
        }, 60000);
        U.dashT = setInterval(function () { if (U.screen === 'game') updateHUD(); }, 1000);
        U.goalT = setInterval(function () { if (U.screen === 'game') checkGoal(); }, 2000);
        updateHUD();
        $('loading').classList.remove('show');
        toast(t('world_loaded'));
        if (!RL.settings.tutorialSeen) startTutorial();
      } catch (e) {
        $('loading').classList.remove('show');
        toast(t('load_failed'));
      }
    }, 60);
  }

  function saveWorld(auto) {
    if (!U.worldId) return;
    try {
      var data = {
        sim: RL.Sim.serialize(),
        timeOfDay: RL.Engine.getTimeOfDay(),
        weather: RL.Engine.weather,
        quality: U.worldMeta.quality
      };
      var thumb = '';
      try { thumb = RL.Engine.snapshot(); } catch (e) {}
      var ok = RL.Save.update(U.worldId, data, thumb);
      if (ok) { U.dirty = false; toast(auto ? t('autosaved') : t('world_saved')); }
      else toast(t('save_failed'));
    } catch (e) { toast(t('save_failed')); }
  }

  function exitToHome() {
    function go() {
      clearInterval(U.autosaveT); clearInterval(U.dashT); clearInterval(U.goalT);
      RL.Engine.exitPlaceMode();
      RL.Engine.stop();
      hideAllPanels();
      show('home');
    }
    if (U.dirty) confirmDlg(t('unsaved_warn'), function () { saveWorld(false); go(); });
    else go();
  }

  // ---------- HUD ----------
  var WICON = { sunny: '☀️', cloudy: '☁️', rain: '🌧️', fog: '🌫️', wind: '💨', storm: '⛈️' };
  function fmtClock(h) {
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function updateHUD() {
    if (!RL.Engine.scene) return;
    $('hud-world').textContent = U.worldMeta ? U.worldMeta.name : '';
    $('hud-clock').textContent = fmtClock(RL.Engine.getTimeOfDay());
    $('hud-weather').textContent = WICON[RL.Engine.weather] || '☀️';
    $('btn-pause').textContent = RL.Engine.paused ? '▶️' : '⏸️';
    $('btn-speed').textContent = '⏩' + (RL.Engine.timeSpeed || 1) + 'x';
    if ($('panel-stats').classList.contains('show')) renderDashboard();
    if ($('panel-weather').classList.contains('show')) {
      $('time-slider').value = RL.Engine.getTimeOfDay();
      $('time-label').textContent = fmtClock(RL.Engine.getTimeOfDay());
    }
  }

  function wireGame() {
    $('btn-pause').onclick = function () {
      RL.Engine.setPaused(!RL.Engine.paused);
      RL.Audio.blip(RL.Engine.paused ? 330 : 520);
      updateHUD();
    };
    $('btn-speed').onclick = function () {
      var s = RL.Engine.timeSpeed >= 4 ? 1 : RL.Engine.timeSpeed * 2;
      RL.Engine.setTimeSpeed(s); RL.Audio.blip(600); updateHUD();
    };
    $('tb-collapse').onclick = function () { $('toolbar').classList.toggle('hidden'); };
    $('tb-build').onclick = function () { togglePanel('panel-build'); };
    $('tb-weather').onclick = function () { togglePanel('panel-weather'); };
    $('tb-stats').onclick = function () { togglePanel('panel-stats'); renderDashboard(); };
    $('tb-save').onclick = function () { saveWorld(false); };
    $('tb-help').onclick = function () { show('help'); U._fromGame = true; };
    $('tb-home').onclick = function () { exitToHome(); };
    wireBuildPanel(); wireWeatherPanel();
    $('btn-ec-close').onclick = function () { hideEntityCard(); };
    $('btn-ec-remove').onclick = function () {
      if (U.selectedId != null) {
        confirmDlg(t('confirm_delete'), function () {
          RL.Sim.removeEntity(U.selectedId);
          U.dirty = true; hideEntityCard();
          toast(t('removed_ok')); RL.Audio.vibrate(40);
        });
      }
    };
  }

  function togglePanel(id) {
    ['panel-build', 'panel-weather', 'panel-stats'].forEach(function (p) {
      if (p !== id) $(p).classList.remove('show');
    });
    $(id).classList.toggle('show');
    if (id === 'panel-build' && $(id).classList.contains('show')) renderBuildItems();
  }
  function hideAllPanels() {
    ['panel-build', 'panel-weather', 'panel-stats'].forEach(function (p) { $(p).classList.remove('show'); });
    hideEntityCard();
  }

  // ---------- build mode ----------
  var BUILD_CATS = {
    trees: ['tree', 'fruitTree', 'sapling'],
    plants: ['grass', 'bush', 'flower', 'aquatic'],
    animals: ['bird', 'butterfly', 'bee', 'rabbit', 'deer', 'fish', 'frog'],
    rocks: ['rock', 'bigrock', 'flowers'],
    water: ['pond', 'fountain']
  };
  function wireBuildPanel() {
    document.querySelectorAll('.btab').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.btab').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        U.buildCat = b.dataset.cat; U.buildItem = null;
        RL.Engine.exitPlaceMode();
        $('place-bar').classList.remove('show');
        renderBuildItems(); RL.Audio.blip(520);
      };
    });
    $('btn-place-ok').onclick = function () {
      var r = RL.Engine.confirmPlacement();
      if (!r) { return; }
      if (r.error) { toast(t(r.error)); return; }
      doPlace(r.x, r.z);
    };
    $('btn-place-cancel').onclick = function () {
      RL.Engine.exitPlaceMode();
      $('place-bar').classList.remove('show');
      U.buildItem = null; renderBuildItems();
    };
    $('btn-undo').onclick = function () {
      var id = U.undoStack.pop();
      if (id != null) { RL.Sim.removeEntity(id); U.dirty = true; toast(t('removed_ok')); }
    };
  }
  function renderBuildItems() {
    var w = $('build-items'); w.innerHTML = '';
    BUILD_CATS[U.buildCat].forEach(function (item) {
      var b = el('button', 'build-item' + (U.buildItem === item ? ' sel' : ''), itemIcon(item) + '<span>' + t('it_' + item) + '</span>');
      b.onclick = function () {
        U.buildItem = item;
        renderBuildItems();
        var ghost = RL.Sim.buildGhost(U.buildCat, item);
        var vcat = (U.buildCat === 'trees') ? 'plants' : U.buildCat;
        RL.Engine.enterPlaceMode(ghost, function (x, z) { return RL.Sim.canPlaceAt(vcat, item, x, z); });
        $('place-hint').textContent = t('tap_to_place');
        $('place-bar').classList.add('show');
        RL.Audio.blip(700);
      };
      w.appendChild(b);
    });
  }
  function itemIcon(item) {
    var m = { tree: '🌳', fruitTree: '🍎', sapling: '🌱', grass: '🌾', bush: '🌿', flower: '🌸',
      aquatic: '🪷', bird: '🐦', butterfly: '🦋', bee: '🐝', rabbit: '🐇', deer: '🦌',
      fish: '🐟', frog: '🐸', rock: '🪨', bigrock: '⛰️', flowers: '💐', pond: '🏞️', fountain: '⛲' };
    return '<i>' + (m[item] || '✨') + '</i>';
  }
  function doPlace(x, z) {
    var cat = U.buildCat, item = U.buildItem, e = null;
    if (cat === 'trees' || cat === 'plants') e = RL.Sim.placePlant(item, x, z);
    else if (cat === 'animals') e = RL.Sim.placeAnimal(item, x, z);
    else e = RL.Sim.placeDecor(item, x, z);
    if (e) {
      U.undoStack.push(e.id);
      U.dirty = true;
      toast(t('placed_ok'));
      RL.Audio.blip(880); RL.Audio.vibrate(30);
    } else toast(t('invalid_overlap'));
  }

  // ---------- selection ----------
  function onSelect(hit) {
    if (!hit) { hideEntityCard(); return; }
    var e = RL.Sim.getEntity(hit.id);
    if (!e) { hideEntityCard(); return; }
    U.selectedId = e.id;
    var name = e.kind === 'plant' ? t('it_' + e.type) :
               e.kind === 'animal' ? t('it_' + e.species) : t('it_' + e.type);
    $('ec-name').textContent = name;
    var bars = '';
    function bar(label, v) {
      var pct = Math.round(v * 100);
      var cls = pct > 60 ? 'good' : (pct > 30 ? 'mid' : 'bad');
      return '<div class="bar-row"><span>' + label + '</span><div class="bar"><div class="fill ' + cls + '" style="width:' + pct + '%"></div></div></div>';
    }
    if (e.kind === 'plant') {
      bars = bar(t('growth'), e.growth) + bar(t('health'), e.health) + bar(t('water'), e.water);
    } else if (e.kind === 'animal') {
      bars = bar(t('health'), e.health) + bar(t('growth'), 1 - e.hunger) + bar(t('water'), 1 - e.thirst);
    } else {
      bars = '<div class="bar-row"><span>' + t('sel_decor') + '</span></div>';
    }
    $('ec-bars').innerHTML = bars;
    $('entity-card').classList.add('show');
    RL.Audio.blip(600);
  }
  function hideEntityCard() { $('entity-card').classList.remove('show'); U.selectedId = null; }

  // ---------- weather/time panel ----------
  function wireWeatherPanel() {
    document.querySelectorAll('.wbtn').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.wbtn').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        if (b.dataset.w === 'auto') {
          // auto: pick by random every so often — just set sunny->cycle
          RL.Engine.setWeather('sunny');
          autoWeather(true);
        } else { autoWeather(false); RL.Engine.setWeather(b.dataset.w); }
        RL.Audio.blip(540); updateHUD();
      };
    });
    $('time-slider').oninput = function () {
      RL.Engine.setTimeOfDay(parseFloat($('time-slider').value));
      $('time-label').textContent = fmtClock(RL.Engine.getTimeOfDay());
    };
    document.querySelectorAll('.spd').forEach(function (b) {
      b.onclick = function () {
        var v = parseFloat(b.dataset.v);
        if (v === 0) RL.Engine.setPaused(true);
        else { RL.Engine.setPaused(false); RL.Engine.setTimeSpeed(v); }
        updateHUD(); RL.Audio.blip(600);
      };
    });
  }
  var autoWT = null;
  function autoWeather(on) {
    if (autoWT) { clearInterval(autoWT); autoWT = null; }
    if (!on) return;
    var opts = ['sunny', 'sunny', 'cloudy', 'rain', 'wind'];
    autoWT = setInterval(function () {
      if (U.screen !== 'game') return;
      var w = opts[(Math.random() * opts.length) | 0];
      RL.Engine.setWeather(w); updateHUD();
    }, 90000);
  }

  // ---------- dashboard ----------
  function renderDashboard() {
    var c = RL.Sim.counts(), h = RL.Sim.ecosystemHealth();
    var html = '';
    html += '<div class="dash-row"><span>' + t('d_plants') + '</span><b>' + c.plants + '</b></div>';
    html += '<div class="dash-row"><span>' + t('d_animals') + '</span><b>' + c.animals + '</b></div>';
    var spHtml = '';
    for (var s in c.animalsBySpecies) spHtml += t('it_' + s) + ': ' + c.animalsBySpecies[s] + ' &nbsp;';
    if (spHtml) html += '<div class="dash-sub">' + spHtml + '</div>';
    html += '<div class="dash-row"><span>' + t('d_water') + '</span><b>' + Math.round(c.waterLevel * 100) + '%</b></div>';
    var hc = h > 60 ? 'good' : (h > 35 ? 'mid' : 'bad');
    html += '<div class="dash-row"><span>' + t('d_health') + '</span><b>' + h + '/100</b></div>';
    html += '<div class="bar"><div class="fill ' + hc + '" style="width:' + h + '%"></div></div>';
    html += '<div class="dash-row"><span>' + t('d_weather') + '</span><b>' + (WICON[RL.Engine.weather] || '') + ' ' + t('w_' + RL.Engine.weather) + '</b></div>';
    html += '<div class="dash-row"><span>' + t('d_time') + '</span><b>' + fmtClock(RL.Engine.getTimeOfDay()) + '</b></div>';
    $('dash-stats').innerHTML = html;
    var sug = RL.Sim.suggestions();
    var sh = '<b>' + t('d_suggest') + '</b><ul>';
    sug.forEach(function (k) { sh += '<li>' + t(k) + '</li>'; });
    $('dash-sug').innerHTML = sh + '</ul>';
    var evs = RL.Sim.events();
    var eh = '<b>' + t('d_events') + '</b><ul>';
    evs.slice(0, 8).forEach(function (e) { eh += '<li>' + escapeHtml(e) + '</li>'; });
    $('dash-events').innerHTML = eh + '</ul>';
  }

  // ---------- challenge ----------
  var GOALS = {
    forest: { key: 'goal_forest', check: function () {
      var n = 0;
      RL.Sim.plants.forEach(function (p) { if ((p.type === 'tree' || p.type === 'fruitTree') && p.growth > 0.7 && p.health > 0.5) n++; });
      return { p: n, max: 10 };
    }},
    pond: { key: 'goal_pond', check: function () {
      var pond = RL.Sim.decors.some(function (d) { return d.type === 'pond' || d.type === 'fountain'; });
      var fish = 0;
      RL.Sim.animals.forEach(function (a) { if (a.species === 'fish' && a.health > 0.5) fish++; });
      var ok = (pond && fish >= 2 && RL.Sim.waterLevel > 0.5) ? 1 : 0;
      return { p: ok, max: 1 };
    }},
    pop: { key: 'goal_pop', check: function () {
      var n = 0;
      RL.Sim.animals.forEach(function (a) { if (a.health > 0.6) n++; });
      return { p: n, max: 12 };
    }},
    recover: { key: 'goal_recover', check: function () {
      var h = RL.Sim.ecosystemHealth();
      return { p: h, max: 70 };
    }},
    survive: { key: 'goal_survive', check: function () {
      var h = RL.Sim.ecosystemHealth();
      return { p: U.surviveT, max: 3, health: h };
    }}
  };
  function setupChallenge(meta) {
    var g = meta.env === 'forest' ? 'forest' : meta.env === 'lake' ? 'pond' :
            meta.env === 'island' ? 'pond' : meta.env === 'grassland' ? 'pop' : 'recover';
    U.challenge = { type: g, done: false };
    $('goal-card').classList.add('show');
    $('goal-text').textContent = t(GOALS[g].key);
  }
  function checkGoal() {
    if (!U.challenge || U.challenge.done) return;
    var g = GOALS[U.challenge.type];
    var r = g.check();
    if (U.challenge.type === 'survive') {
      if (r.health >= 50) U.surviveT += 2 / 86400; // 2s real ≈ fraction of sim-day
      else U.surviveT = 0;
      r.p = U.surviveT;
    }
    var pct = Math.min(100, Math.round(r.p / r.max * 100));
    $('goal-fill').style.width = pct + '%';
    $('goal-pct').textContent = t('goal_progress') + ': ' + pct + '%';
    if (r.p >= r.max) {
      U.challenge.done = true;
      $('goal-card').classList.add('done');
      toast(t('goal_done'), 3500);
      RL.Audio.blip(880); setTimeout(function () { RL.Audio.blip(1100); }, 250);
    }
  }

  // ---------- tutorial ----------
  var TUTS = ['tut_1', 'tut_2', 'tut_3', 'tut_4', 'tut_5'];
  var tutI = 0;
  function startTutorial() {
    tutI = 0;
    $('tutorial').classList.add('show');
    showTut();
    $('btn-tut-next').onclick = function () {
      tutI++;
      if (tutI >= TUTS.length) endTutorial();
      else showTut();
      RL.Audio.blip(600);
    };
    $('btn-tut-skip').onclick = endTutorial;
  }
  function showTut() {
    $('tut-text').textContent = (tutI + 1) + '/5 — ' + t(TUTS[tutI]);
    $('btn-tut-next').textContent = tutI === TUTS.length - 1 ? t('tut_done') : t('tut_next');
  }
  function endTutorial() {
    $('tutorial').classList.remove('show');
    RL.settings.tutorialSeen = true;
    RL.Save.saveSettings(RL.settings);
  }
  U.replayTutorial = startTutorial;

  // ---------- settings ----------
  function renderSettings() {
    var s = RL.settings;
    document.querySelectorAll('.sq-opt').forEach(function (b) {
      b.classList.toggle('sel', b.dataset.v === s.quality);
    });
    $('set-master').value = s.master; $('set-music').value = s.music; $('set-sfx').value = s.sfx;
    $('set-mute').checked = s.muted;
    $('set-cam').value = s.camSens;
    $('set-vibrate').checked = s.vibrate;
    $('set-lang-cur').textContent = s.lang === 'en' ? 'English' : 'हिंदी';
  }
  function wireSettings() {
    $('btn-settings-back').onclick = function () {
      show(U._fromGame ? 'game' : 'home'); U._fromGame = false;
    };
    document.querySelectorAll('.sq-opt').forEach(function (b) {
      b.onclick = function () {
        RL.settings.quality = b.dataset.v;
        RL.Save.saveSettings(RL.settings);
        if (RL.Engine.scene) RL.Engine.setQuality(b.dataset.v);
        renderSettings(); RL.Audio.blip(520);
      };
    });
    $('set-lang-toggle').onclick = function () {
      var nl = RL.settings.lang === 'en' ? 'hi' : 'en';
      RL.settings.lang = nl; RL.Save.saveSettings(RL.settings);
      RL.setLang(nl); renderSettings(); RL.Audio.blip(600);
    };
    function vol(id, key) {
      $(id).oninput = function () {
        RL.settings[key] = parseFloat($(id).value);
        RL.Save.saveSettings(RL.settings);
        RL.Audio.setVolumes(RL.settings);
      };
    }
    vol('set-master', 'master'); vol('set-music', 'music'); vol('set-sfx', 'sfx');
    $('set-mute').onchange = function () {
      RL.settings.muted = $('set-mute').checked;
      RL.Save.saveSettings(RL.settings);
      RL.Audio.setMuted(RL.settings.muted);
    };
    $('set-cam').oninput = function () {
      RL.settings.camSens = parseFloat($('set-cam').value);
      RL.Save.saveSettings(RL.settings);
      if (RL.Engine.scene) RL.Engine.setCamSens(RL.settings.camSens);
    };
    $('set-vibrate').onchange = function () {
      RL.settings.vibrate = $('set-vibrate').checked;
      RL.Save.saveSettings(RL.settings);
    };
    $('btn-tutorial-replay').onclick = function () {
      RL.settings.tutorialSeen = false;
      show('game'); U._fromGame = false;
      setTimeout(startTutorial, 400);
    };
    $('btn-reset-settings').onclick = function () {
      confirmDlg(t('s_reset_c'), function () {
        RL.Save.resetSettings();
        RL.settings = RL.Save.getSettings();
        RL.setLang(RL.settings.lang);
        RL.Audio.setVolumes(RL.settings);
        RL.Audio.setMuted(RL.settings.muted);
        renderSettings();
      });
    };
    $('btn-help-back').onclick = function () {
      show(U._fromGame ? 'game' : 'home'); U._fromGame = false;
    };
    $('btn-worlds-back').onclick = function () { show('home'); };
  }

  // ---------- boot wiring ----------
  U.init = function () {
    wireHome(); wireSetup(); wireSettings();
    window.addEventListener('resize', function () {
      if (U.screen === 'game' && RL.Engine.scene) RL.Engine.resize();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && U.screen === 'game') {
        // keep rendering cheap: pause sim advance handled by rAF throttle naturally
      }
    });
    show('home');
  };

  window.RL = window.RL || {};
  RL.UI = U;
  RL.toast = toast;
})();
