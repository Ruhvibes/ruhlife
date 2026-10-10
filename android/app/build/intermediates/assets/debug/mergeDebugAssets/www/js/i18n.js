/* RuhLife i18n — English + formal Hindi (Devanagari) */
(function () {
  'use strict';

  var STR = {
    en: {
      app_tagline: 'Your living 3D nature world',
      btn_new_world: 'Create New World',
      btn_continue: 'Continue',
      btn_my_worlds: 'My Worlds',
      btn_how_to: 'How to Play',
      btn_settings: 'Settings',
      fact_title: "Today's Nature Fact",
      exit_msg: 'Press back again to exit',
      no_last_world: 'No saved world yet — create one first!',
      // Setup
      setup_title: 'Create New World',
      world_name: 'World name',
      world_name_ph: 'e.g. Green Valley',
      size: 'World size',
      size_s: 'Small', size_m: 'Medium', size_l: 'Large',
      env: 'Environment',
      env_forest: 'Forest', env_grassland: 'Grassland', env_island: 'Island', env_lake: 'Lake',
      mode: 'Game mode',
      mode_sandbox: 'Peaceful Sandbox', mode_challenge: 'Ecosystem Challenge',
      mode_sandbox_d: 'Relax, build and grow freely',
      mode_challenge_d: 'Complete goals, keep nature balanced',
      quality: 'Graphics quality',
      q_low: 'Low', q_med: 'Medium', q_high: 'High',
      starters: 'Starting life',
      start_world: 'Start World',
      back: 'Back',
      // HUD
      pause: 'Pause', resume: 'Resume',
      speed: 'Speed',
      hud_build: 'Build', hud_weather: 'Weather', hud_stats: 'Stats',
      hud_save: 'Save', hud_help: 'Help', hud_home: 'Home',
      confirm_place: 'Place', cancel_place: 'Cancel',
      invalid_water: 'Needs water — place near a lake or river',
      invalid_land: 'Needs land — not on water',
      invalid_overlap: 'Too close to another object',
      invalid_bounds: 'Outside the world',
      placed_ok: 'Placed!',
      removed_ok: 'Removed',
      entity_remove: 'Remove',
      growth: 'Growth', health: 'Health', water: 'Water',
      sel_plant: 'Plant', sel_animal: 'Animal', sel_decor: 'Decoration',
      // Build
      build_title: 'Build Mode',
      tab_trees: 'Trees', tab_plants: 'Plants', tab_animals: 'Animals',
      tab_rocks: 'Rocks', tab_water: 'Water',
      undo: 'Undo', confirm_delete: 'Delete this?',
      yes: 'Yes', no: 'No',
      tap_to_place: 'Tap the land to place',
      // Items
      it_grass: 'Grass', it_bush: 'Bush', it_flower: 'Flower',
      it_sapling: 'Sapling', it_tree: 'Tree', it_fruitTree: 'Fruit Tree',
      it_aquatic: 'Water Lily',
      it_bird: 'Bird', it_butterfly: 'Butterfly', it_bee: 'Bee',
      it_rabbit: 'Rabbit', it_deer: 'Deer', it_fish: 'Fish', it_frog: 'Frog',
      it_rock: 'Rock', it_bigrock: 'Big Rock', it_flowers: 'Flower Bed',
      it_pond: 'Pond', it_fountain: 'Fountain',
      // Weather/time
      weather: 'Weather', w_sunny: 'Sunny', w_cloudy: 'Cloudy',
      w_rain: 'Rain', w_fog: 'Fog', w_wind: 'Windy', w_storm: 'Storm',
      w_auto: 'Automatic',
      time_of_day: 'Time of day', time_speed: 'Time speed',
      paused: 'Paused',
      // Dashboard
      dash_title: 'Ecosystem Dashboard',
      d_plants: 'Plants', d_animals: 'Animals', d_water: 'Water level',
      d_health: 'Ecosystem health', d_weather: 'Weather', d_time: 'Time',
      d_events: 'Recent events', d_suggest: 'Suggestions',
      sug_more_plants: 'Add more plants for food and shelter',
      sug_more_water: 'Increase water — add a pond or choose rain',
      sug_balance: 'Too many animals — add plants or reduce animals',
      sug_healthy: 'Ecosystem looks healthy. Keep it up!',
      sug_sick_plants: 'Some plants are unhealthy — give them water and light',
      // Worlds
      worlds_title: 'My Worlds',
      w_load: 'Load', w_rename: 'Rename', w_dup: 'Duplicate', w_del: 'Delete',
      w_confirm_del: 'Delete this world forever?',
      w_last: 'Last played', w_new_name: 'New name',
      no_worlds: 'No worlds yet. Create your first world!',
      world_saved: 'World saved', world_loaded: 'World loaded',
      world_deleted: 'World deleted', world_renamed: 'Renamed',
      world_dup: 'Duplicated', autosaved: 'Autosaved',
      save_failed: 'Save failed — storage may be full',
      load_failed: 'Could not load this world (data damaged)',
      unsaved_warn: 'Unsaved changes will be lost. Leave anyway?',
      // Settings
      set_title: 'Settings',
      s_lang: 'Language', s_quality: 'Graphics quality',
      s_master: 'Master volume', s_music: 'Music', s_sfx: 'Sounds',
      s_mute: 'Mute all', s_cam: 'Camera sensitivity',
      s_vibrate: 'Vibration', s_tutorial: 'Replay tutorial',
      s_reset: 'Reset all settings', s_reset_c: 'Reset settings to defaults?',
      s_privacy: 'Privacy', s_version: 'Version',
      s_privacy_t: 'RuhLife works fully offline. Your worlds are stored only on this device. No account, no tracking, no data leaves your phone.',
      // Tutorial
      tut_skip: 'Skip', tut_next: 'Next', tut_done: 'Start!',
      tut_1: 'Drag with one finger to look around. Pinch to zoom.',
      tut_2: 'Open Build mode and tap the land to place trees and animals.',
      tut_3: 'Plants grow over time. Keep them watered with rain or ponds.',
      tut_4: 'Watch ecosystem health in Stats. Happy nature = happy animals!',
      tut_5: 'Your world autosaves. Have fun, nature keeper!',
      // Challenge
      goal_title: 'Challenge Goal',
      goal_forest: 'Grow a forest: 10 healthy trees',
      goal_pond: 'Keep a healthy pond with fish',
      goal_pop: 'Support 12 healthy animals',
      goal_recover: 'Raise ecosystem health above 70',
      goal_survive: 'Keep health above 50 for 3 days',
      goal_done: 'Goal complete! Amazing work!',
      goal_progress: 'Progress',
      // Facts
      facts: [
        'A single large tree can absorb about 20 kg of carbon dioxide per year.',
        'Bees pollinate nearly 75% of the world\u2019s flowering plants.',
        'A frog drinks water through its skin instead of its mouth.',
        'Forests cover about 31% of the Earth\u2019s land surface.',
        'Butterflies taste with their feet.',
        'A deer\u2019s antlers are the fastest growing tissue in mammals.',
        'Rainforests produce about 6% of the world\u2019s oxygen.',
        'Fish can feel pain and have memories lasting months.'
      ],
      ok: 'OK', cancel: 'Cancel', close: 'Close',
      loading: 'Growing your world...',
      tap_select: 'Tap a plant or animal to see details'
    },

    hi: {
      app_tagline: 'आपकी जीवंत 3D प्रकृति दुनिया',
      btn_new_world: 'नई दुनिया बनाएँ',
      btn_continue: 'जारी रखें',
      btn_my_worlds: 'मेरी दुनियाएँ',
      btn_how_to: 'कैसे खेलें',
      btn_settings: 'सेटिंग्स',
      fact_title: 'आज का प्रकृति तथ्य',
      exit_msg: 'बाहर निकलने के लिए फिर से बैक दबाएँ',
      no_last_world: 'अभी कोई सहेजी हुई दुनिया नहीं है — पहले एक बनाएँ!',
      setup_title: 'नई दुनिया बनाएँ',
      world_name: 'दुनिया का नाम',
      world_name_ph: 'जैसे — हरित घाटी',
      size: 'दुनिया का आकार',
      size_s: 'छोटा', size_m: 'मध्यम', size_l: 'बड़ा',
      env: 'पर्यावरण',
      env_forest: 'वन', env_grassland: 'घास का मैदान', env_island: 'द्वीप', env_lake: 'झील',
      mode: 'खेल का प्रकार',
      mode_sandbox: 'शांतिपूर्ण सैंडबॉक्स', mode_challenge: 'पारिस्थितिकी चुनौती',
      mode_sandbox_d: 'आराम से बनाएँ और विकसित करें',
      mode_challenge_d: 'लक्ष्य पूरे करें, प्रकृति का संतुलन रखें',
      quality: 'ग्राफ़िक्स गुणवत्ता',
      q_low: 'निम्न', q_med: 'मध्यम', q_high: 'उच्च',
      starters: 'प्रारंभिक जीवन',
      start_world: 'दुनिया शुरू करें',
      back: 'वापस',
      pause: 'रोकें', resume: 'जारी रखें',
      speed: 'गति',
      hud_build: 'निर्माण', hud_weather: 'मौसम', hud_stats: 'आँकड़े',
      hud_save: 'सहेजें', hud_help: 'सहायता', hud_home: 'होम',
      confirm_place: 'रखें', cancel_place: 'रद्द करें',
      invalid_water: 'पानी आवश्यक है — झील या नदी के पास रखें',
      invalid_land: 'ज़मीन आवश्यक है — पानी पर नहीं',
      invalid_overlap: 'किसी अन्य वस्तु के बहुत पास है',
      invalid_bounds: 'दुनिया के बाहर है',
      placed_ok: 'रख दिया गया!',
      removed_ok: 'हटा दिया गया',
      entity_remove: 'हटाएँ',
      growth: 'विकास', health: 'स्वास्थ्य', water: 'जल',
      sel_plant: 'पौधा', sel_animal: 'पशु', sel_decor: 'सजावट',
      build_title: 'निर्माण मोड',
      tab_trees: 'पेड़', tab_plants: 'पौधे', tab_animals: 'पशु',
      tab_rocks: 'चट्टानें', tab_water: 'जल',
      undo: 'पूर्ववत करें', confirm_delete: 'क्या इसे हटाएँ?',
      yes: 'हाँ', no: 'नहीं',
      tap_to_place: 'रखने के लिए ज़मीन पर टैप करें',
      it_grass: 'घास', it_bush: 'झाड़ी', it_flower: 'फूल',
      it_sapling: 'पौधा (छोटा)', it_tree: 'पेड़', it_fruitTree: 'फलदार पेड़',
      it_aquatic: 'जल कुमुदिनी',
      it_bird: 'पक्षी', it_butterfly: 'तितली', it_bee: 'मधुमक्खी',
      it_rabbit: 'खरगोश', it_deer: 'हिरण', it_fish: 'मछली', it_frog: 'मेंढक',
      it_rock: 'चट्टान', it_bigrock: 'बड़ी चट्टान', it_flowers: 'फूलों की क्यारी',
      it_pond: 'तालाब', it_fountain: 'फव्वारा',
      weather: 'मौसम', w_sunny: 'धूप', w_cloudy: 'बादल',
      w_rain: 'वर्षा', w_fog: 'कोहरा', w_wind: 'हवादार', w_storm: 'तूफ़ान',
      w_auto: 'स्वचालित',
      time_of_day: 'दिन का समय', time_speed: 'समय की गति',
      paused: 'रुका हुआ',
      dash_title: 'पारिस्थितिकी डैशबोर्ड',
      d_plants: 'पौधे', d_animals: 'पशु', d_water: 'जल स्तर',
      d_health: 'पारिस्थितिकी स्वास्थ्य', d_weather: 'मौसम', d_time: 'समय',
      d_events: 'हाल की घटनाएँ', d_suggest: 'सुझाव',
      sug_more_plants: 'भोजन और आश्रय के लिए और पौधे लगाएँ',
      sug_more_water: 'जल बढ़ाएँ — तालाब बनाएँ या वर्षा चुनें',
      sug_balance: 'पशु अधिक हैं — पौधे बढ़ाएँ या पशु कम करें',
      sug_healthy: 'पारिस्थितिकी स्वस्थ दिख रही है। ऐसे ही जारी रखें!',
      sug_sick_plants: 'कुछ पौधे अस्वस्थ हैं — उन्हें पानी और प्रकाश दें',
      worlds_title: 'मेरी दुनियाएँ',
      w_load: 'खोलें', w_rename: 'नाम बदलें', w_dup: 'प्रतिलिपि', w_del: 'हटाएँ',
      w_confirm_del: 'क्या इस दुनिया को हमेशा के लिए हटाएँ?',
      w_last: 'अंतिम बार खेला', w_new_name: 'नया नाम',
      no_worlds: 'अभी कोई दुनिया नहीं है। अपनी पहली दुनिया बनाएँ!',
      world_saved: 'दुनिया सहेज ली गई', world_loaded: 'दुनिया खुल गई',
      world_deleted: 'दुनिया हटा दी गई', world_renamed: 'नाम बदल दिया गया',
      world_dup: 'प्रतिलिपि बन गई', autosaved: 'स्वतः सहेजा गया',
      save_failed: 'सहेजना विफल — स्टोरेज भर सकता है',
      load_failed: 'यह दुनिया खुल नहीं सकी (डेटा क्षतिग्रस्त)',
      unsaved_warn: 'बिना सहेजे परिवर्तन खो जाएँगे। फिर भी जाएँ?',
      set_title: 'सेटिंग्स',
      s_lang: 'भाषा', s_quality: 'ग्राफ़िक्स गुणवत्ता',
      s_master: 'मुख्य आवाज़', s_music: 'संगीत', s_sfx: 'ध्वनियाँ',
      s_mute: 'सभी म्यूट करें', s_cam: 'कैमरा संवेदनशीलता',
      s_vibrate: 'कंपन', s_tutorial: 'ट्यूटोरियल फिर से देखें',
      s_reset: 'सभी सेटिंग्स रीसेट करें', s_reset_c: 'क्या सेटिंग्स डिफ़ॉल्ट पर करें?',
      s_privacy: 'गोपनीयता', s_version: 'संस्करण',
      s_privacy_t: 'RuhLife पूरी तरह ऑफ़लाइन काम करता है। आपकी दुनियाएँ केवल इसी डिवाइस में सहेजी जाती हैं। कोई खाता नहीं, कोई ट्रैकिंग नहीं, कोई डेटा फ़ोन से बाहर नहीं जाता।',
      tut_skip: 'छोड़ें', tut_next: 'आगे', tut_done: 'शुरू करें!',
      tut_1: 'देखने के लिए एक उँगली से ड्रैग करें। ज़ूम के लिए पिंच करें।',
      tut_2: 'निर्माण मोड खोलें और पेड़-पशु रखने के लिए ज़मीन पर टैप करें।',
      tut_3: 'पौधे समय के साथ बढ़ते हैं। वर्षा या तालाब से उन्हें पानी देते रहें।',
      tut_4: 'आँकड़ों में पारिस्थितिकी स्वास्थ्य देखें। खुश प्रकृति = खुश पशु!',
      tut_5: 'आपकी दुनिया स्वतः सहेजी जाती है। शुभकामनाएँ, प्रकृति रक्षक!',
      goal_title: 'चुनौती लक्ष्य',
      goal_forest: 'वन उगाएँ: 10 स्वस्थ पेड़',
      goal_pond: 'मछलियों वाला स्वस्थ तालाब रखें',
      goal_pop: '12 स्वस्थ पशुओं का पालन करें',
      goal_recover: 'पारिस्थितिकी स्वास्थ्य 70 से ऊपर लाएँ',
      goal_survive: '3 दिनों तक स्वास्थ्य 50 से ऊपर रखें',
      goal_done: 'लक्ष्य पूर्ण! बहुत बढ़िया!',
      goal_progress: 'प्रगति',
      facts: [
        'एक बड़ा पेड़ प्रति वर्ष लगभग 20 किलोग्राम कार्बन डाइऑक्साइड अवशोषित कर सकता है।',
        'मधुमक्खियाँ दुनिया के लगभग 75% फूल वाले पौधों का परागण करती हैं।',
        'मेंढक मुँह के बजाय त्वचा से पानी पीता है।',
        'वन पृथ्वी के लगभग 31% भूभाग पर फैले हैं।',
        'तितलियाँ अपने पैरों से स्वाद लेती हैं।',
        'हिरण के सींग स्तनधारियों में सबसे तेज़ी से बढ़ने वाला ऊतक है।',
        'वर्षावन दुनिया की लगभग 6% ऑक्सीजन उत्पन्न करते हैं।',
        'मछलियाँ दर्द महसूस कर सकती हैं और महीनों तक याद रख सकती हैं।'
      ],
      ok: 'ठीक है', cancel: 'रद्द करें', close: 'बंद करें',
      loading: 'आपकी दुनिया विकसित हो रही है...',
      tap_select: 'विवरण देखने के लिए किसी पौधे या पशु पर टैप करें'
    }
  };

  var lang = 'en';

  function t(k) {
    var d = STR[lang] || STR.en;
    if (d[k] !== undefined) return d[k];
    return (STR.en[k] !== undefined) ? STR.en[k] : k;
  }
  function setLang(l) {
    if (STR[l]) lang = l;
    // re-render static labels
    if (typeof document !== 'undefined') {
      var els = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < els.length; i++) {
        var key = els[i].getAttribute('data-i18n');
        els[i].textContent = t(key);
      }
      var phs = document.querySelectorAll('[data-i18n-ph]');
      for (var j = 0; j < phs.length; j++) {
        phs[j].setAttribute('placeholder', t(phs[j].getAttribute('data-i18n-ph')));
      }
    }
  }
  function getLang() { return lang; }

  window.RL = window.RL || {};
  RL.I18N = STR;
  RL.t = t;
  RL.setLang = setLang;
  RL.getLang = getLang;
})();
