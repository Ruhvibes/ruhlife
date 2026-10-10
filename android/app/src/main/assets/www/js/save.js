/* RuhLife Save — worlds CRUD in localStorage */
(function () {
  'use strict';

  var WKEY = 'ruhlife_worlds_v1';
  var SKEY = 'ruhlife_settings_v1';
  var LKEY = 'ruhlife_last_world';

  function readW() {
    try {
      var raw = localStorage.getItem(WKEY);
      if (!raw) return {};
      var o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : {};
    } catch (e) { return {}; }
  }
  function writeW(o) {
    try { localStorage.setItem(WKEY, JSON.stringify(o)); return true; }
    catch (e) { return false; }
  }
  function uid() { return 'w' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  var Save = {
    list: function () {
      var o = readW(), arr = [];
      for (var id in o) {
        if (o.hasOwnProperty(id)) {
          arr.push({ id: id, meta: o[id].meta || {}, thumb: o[id].thumb || '' });
        }
      }
      arr.sort(function (a, b) { return (b.meta.lastPlayed || 0) - (a.meta.lastPlayed || 0); });
      return arr;
    },
    create: function (meta) {
      var o = readW();
      var id = uid();
      o[id] = { meta: Object.assign({ name: 'World', created: Date.now(), lastPlayed: Date.now() }, meta || {}), data: null, thumb: '' };
      if (!writeW(o)) return null;
      return id;
    },
    update: function (id, data, thumb) {
      var o = readW();
      if (!o[id]) return false;
      o[id].data = data;
      o[id].meta.lastPlayed = Date.now();
      if (thumb !== undefined) o[id].thumb = thumb;
      return writeW(o);
    },
    updateMeta: function (id, meta) {
      var o = readW();
      if (!o[id]) return false;
      for (var k in meta) o[id].meta[k] = meta[k];
      return writeW(o);
    },
    remove: function (id) {
      var o = readW();
      if (!o[id]) return false;
      delete o[id];
      var ok = writeW(o);
      try { if (localStorage.getItem(LKEY) === id) localStorage.removeItem(LKEY); } catch (e) {}
      return ok;
    },
    get: function (id) {
      var o = readW();
      return o[id] || null;
    },
    duplicate: function (id) {
      var o = readW();
      if (!o[id]) return null;
      var nid = uid();
      var copy = JSON.parse(JSON.stringify(o[id]));
      copy.meta.name = (copy.meta.name || 'World') + ' (2)';
      copy.meta.created = Date.now(); copy.meta.lastPlayed = Date.now();
      o[nid] = copy;
      return writeW(o) ? nid : null;
    },
    setLast: function (id) { try { localStorage.setItem(LKEY, id); } catch (e) {} },
    getLast: function () { try { return localStorage.getItem(LKEY); } catch (e) { return null; } },

    // settings
    getSettings: function () {
      var d = { lang: 'en', quality: 'med', master: 0.8, music: 0.5, sfx: 0.7,
                muted: false, camSens: 1.0, vibrate: true, tutorialSeen: false };
      try {
        var raw = localStorage.getItem(SKEY);
        if (raw) { var o = JSON.parse(raw); for (var k in o) d[k] = o[k]; }
      } catch (e) {}
      return d;
    },
    saveSettings: function (s) {
      try { localStorage.setItem(SKEY, JSON.stringify(s)); return true; }
      catch (e) { return false; }
    },
    resetSettings: function () {
      try { localStorage.removeItem(SKEY); } catch (e) {}
    }
  };

  window.RL = window.RL || {};
  RL.Save = Save;
})();
