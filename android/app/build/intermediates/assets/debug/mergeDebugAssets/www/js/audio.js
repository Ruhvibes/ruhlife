/* RuhLife Audio — 100% procedural WebAudio ambience. No external files. */
(function () {
  'use strict';

  var ctx = null, master = null, musicBus = null, sfxBus = null;
  var started = false, muted = false;
  var vols = { master: 0.8, music: 0.5, sfx: 0.7 };
  var layers = {};       // active layer nodes: {birds, wind, rain, water}
  var musicTimer = null, birdTimer = null;
  var scene = { weather: 'sunny', hour: 10 };

  function ensureCtx() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = vols.master; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = vols.music; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = vols.sfx; sfxBus.connect(master);
      return true;
    } catch (e) { return false; }
  }

  function noiseBuffer() {
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  var _nb = null;
  function getNoise() { if (!_nb) _nb = noiseBuffer(); return _nb; }

  function stopLayer(name) {
    var L = layers[name];
    if (L) {
      try {
        if (L.gain) { L.gain.gain.cancelScheduledValues(ctx.currentTime); L.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3); }
        var nodes = L.nodes || [];
        setTimeout(function () { for (var i = 0; i < nodes.length; i++) { try { nodes[i].stop(); } catch (e) {} try { nodes[i].disconnect(); } catch (e2) {} } }, 900);
      } catch (e) {}
      layers[name] = null;
    }
  }

  // ---- wind: looping filtered noise ----
  function startWind(level) {
    stopLayer('wind');
    if (level <= 0.01) return;
    var src = ctx.createBufferSource(); src.buffer = getNoise(); src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400 + level * 600;
    var g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
    g.gain.setTargetAtTime(0.05 + level * 0.12, ctx.currentTime, 2);
    // slow LFO on filter for gusts
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    var lg = ctx.createGain(); lg.gain.value = 180;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    layers.wind = { gain: g, nodes: [src, lfo] };
  }

  // ---- rain: looping highpassed noise bursts ----
  function startRain(level) {
    stopLayer('rain');
    if (level <= 0.01) return;
    var src = ctx.createBufferSource(); src.buffer = getNoise(); src.loop = true;
    src.playbackRate.value = 0.7;
    var f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    var g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
    g.gain.setTargetAtTime(0.02 + level * 0.10, ctx.currentTime, 1.5);
    layers.rain = { gain: g, nodes: [src] };
  }

  // ---- water: gentle low babble ----
  function startWater(level) {
    stopLayer('water');
    if (level <= 0.01) return;
    var src = ctx.createBufferSource(); src.buffer = getNoise(); src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.8;
    var g = ctx.createGain(); g.gain.value = 0;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.7;
    var lg = ctx.createGain(); lg.gain.value = 0.012;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
    g.gain.setTargetAtTime(0.02 + level * 0.05, ctx.currentTime, 1.5);
    layers.water = { gain: g, nodes: [src, lfo] };
  }

  // ---- birds: scheduled chirp blips (daytime, good weather) ----
  function chirp() {
    if (!ctx || muted) return;
    var t0 = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    var f0 = 2200 + Math.random() * 1800;
    o.frequency.setValueAtTime(f0, t0);
    var n = 2 + (Math.random() * 3 | 0);
    for (var i = 0; i < n; i++) {
      var tt = t0 + i * 0.12;
      o.frequency.setValueAtTime(f0 + Math.random() * 800, tt);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.8, tt + 0.09);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n * 0.12 + 0.1);
    o.connect(g); g.connect(sfxBus);
    o.start(t0); o.stop(t0 + n * 0.12 + 0.25);
  }
  function scheduleBirds(on) {
    if (birdTimer) { clearTimeout(birdTimer); birdTimer = null; }
    if (!on) return;
    (function loop() {
      birdTimer = setTimeout(function () {
        if (on && !muted) { chirp(); if (Math.random() < 0.4) setTimeout(chirp, 300); }
        loop();
      }, 2500 + Math.random() * 6000);
    })();
  }

  // ---- music: soft pentatonic pad loop ----
  var PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
  function padNote() {
    if (!ctx || muted) return;
    var t0 = ctx.currentTime;
    var notes = [];
    for (var i = 0; i < 3; i++) notes.push(PENTA[(Math.random() * PENTA.length) | 0]);
    for (var j = 0; j < notes.length; j++) {
      (function (fr, off) {
        var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = fr;
        f.type = 'lowpass'; f.frequency.value = 1200;
        g.gain.setValueAtTime(0.0001, t0 + off);
        g.gain.exponentialRampToValueAtTime(0.05, t0 + off + 1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 5);
        o.connect(f); f.connect(g); g.connect(musicBus);
        o.start(t0 + off); o.stop(t0 + off + 5.5);
      })(notes[j], j * 0.5);
    }
  }
  function scheduleMusic(on) {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (!on) return;
    padNote();
    musicTimer = setInterval(function () { if (!muted && vols.music > 0.01) padNote(); }, 7000);
  }

  function applyScene() {
    if (!started || !ctx) return;
    var w = scene.weather, h = scene.hour;
    var isDay = h > 5.5 && h < 19;
    var rainL = (w === 'rain') ? 0.8 : (w === 'storm' ? 1 : 0);
    var windL = (w === 'wind') ? 0.7 : (w === 'storm' ? 1 : (w === 'cloudy' ? 0.3 : 0.15));
    var waterL = 0.5;
    startWind(windL); startRain(rainL); startWater(waterL);
    var birdsOn = isDay && (w === 'sunny' || w === 'cloudy' || w === 'wind') && vols.sfx > 0.01;
    scheduleBirds(birdsOn);
  }

  var Audio_ = {
    init: function () { ensureCtx(); },
    // must be called from a user gesture at least once
    unlock: function () {
      if (!ensureCtx()) return;
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      if (!started) {
        started = true;
        scheduleMusic(true);
        applyScene();
      }
    },
    setScene: function (s) {
      if (s.weather !== undefined) scene.weather = s.weather;
      if (s.hour !== undefined) scene.hour = s.hour;
      applyScene();
    },
    setVolumes: function (v) {
      if (v.master !== undefined) vols.master = v.master;
      if (v.music !== undefined) vols.music = v.music;
      if (v.sfx !== undefined) vols.sfx = v.sfx;
      if (!ctx) return;
      var t = ctx.currentTime;
      master.gain.setTargetAtTime(muted ? 0.0001 : vols.master, t, 0.1);
      musicBus.gain.setTargetAtTime(vols.music, t, 0.1);
      sfxBus.gain.setTargetAtTime(vols.sfx, t, 0.1);
      applyScene();
    },
    setMuted: function (m) {
      muted = !!m;
      if (!ctx) return;
      master.gain.setTargetAtTime(muted ? 0.0001 : vols.master, ctx.currentTime, 0.1);
      if (muted) { scheduleBirds(false); } else { applyScene(); }
    },
    isMuted: function () { return muted; },
    // one-shot UI blip
    blip: function (freq) {
      if (!ctx || muted) return;
      try {
        var t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq || 660;
        g.gain.setValueAtTime(0.08, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
        o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + 0.2);
      } catch (e) {}
    },
    vibrate: function (ms) {
      if (typeof Android !== 'undefined' && Android.vibrate) { try { Android.vibrate(ms || 30); } catch (e) {} }
      else if (navigator.vibrate) { try { navigator.vibrate(ms || 30); } catch (e2) {} }
    }
  };

  window.RL = window.RL || {};
  RL.Audio = Audio_;
})();
