/* RuhLife app.js — boot */
(function () {
  'use strict';

  function detectQuality() {
    // simple heuristic: device memory / cores
    try {
      var mem = navigator.deviceMemory || 4;
      var cores = navigator.hardwareConcurrency || 4;
      if (mem <= 2 || cores <= 2) return 'low';
      if (mem <= 4 || cores <= 4) return 'med';
      return 'high';
    } catch (e) { return 'med'; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.RL = window.RL || {};
    // settings
    RL.settings = RL.Save.getSettings();
    if (!RL.settings.quality || RL.settings.quality === 'med') {
      // keep saved choice; only auto-detect on very first run
      try {
        if (!localStorage.getItem('ruhlife_settings_v1')) RL.settings.quality = detectQuality();
      } catch (e) {}
    }
    RL.setLang(RL.settings.lang || 'en');
    RL.Audio.init();
    RL.Audio.setVolumes(RL.settings);
    RL.Audio.setMuted(!!RL.settings.muted);
    // unlock audio on first touch anywhere
    function unlock() { RL.Audio.unlock(); document.removeEventListener('touchstart', unlock); document.removeEventListener('mousedown', unlock); }
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('mousedown', unlock);
    // default setup selections
    RL.UI.init();
    // mark default selected options in setup
    setTimeout(function () {
      var q = document.querySelector('.q-opt[data-v="' + RL.settings.quality + '"]');
      document.querySelectorAll('.q-opt').forEach(function (x) { x.classList.remove('sel'); });
      if (q) q.classList.add('sel');
    }, 100);
  });
})();
