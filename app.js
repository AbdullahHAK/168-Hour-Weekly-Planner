/* ==========================================================
   168 Hours Planner
   Design your week as short stories with draggable numbers,
   see it as a live ring and a weekly receipt, then auto-fill
   and paint an hour-by-hour schedule.
   Vanilla JS, no dependencies, state saved in localStorage.
   ========================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = '168h-planner:v1';
  const HOURS = 168;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WEEKS = ['current', 'ideal'];
  const WEEK_NAME = { current: 'My week now', ideal: 'My ideal week' };
  const WEEK_SHORT = { current: 'Now', ideal: 'Ideal' };

  /* ---------- Life areas (order = spreadsheet order) ---------- */
  const BUILTINS = [
    { id: 'sleep', name: 'Sleep', color: '#a9b4f2' },
    { id: 'work', name: 'Work', color: '#93c3e6' },
    { id: 'food', name: 'Food', color: '#f4c48f' },
    { id: 'chores', name: 'Chores', color: '#a6d6c4' },
    { id: 'childcare', name: 'Childcare', color: '#f1b3c8' },
    { id: 'fitness', name: 'Fitness', color: '#b6d89e' },
    { id: 'entertainment', name: 'Entertainment', color: '#c8b4ea' },
    { id: 'relationships', name: 'Relationships', color: '#f0a99c' },
  ];
  const BUILTIN_IDS = BUILTINS.map((b) => b.id);
  const CUSTOM_COLORS = ['#e6d38c', '#9fd2d8', '#d8b8a0', '#b9c5d8', '#e2b5de', '#c4d98f', '#f2bfa0'];
  // Earlier default colours, upgraded automatically to the soft palette.
  const OLD_DEFAULTS = { sleep: '#7c83db', work: '#3e8ed0', food: '#e0904a', chores: '#b08d57', childcare: '#de7a9c', fitness: '#4fae7b', entertainment: '#9b6fd0', relationships: '#e06a5f' };

  /*
   * Each section mirrors one block of the original spreadsheet.
   *   inputs: the questions (k = key, unit, max = hard limit, smax = slider range)
   *   story:  the same questions as one short paragraph; {key} becomes a draggable number
   *   calc:   the spreadsheet formulas, returning derived lines and the section total
   */
  const SECTIONS = {
    sleep: {
      icon: 'moon',
      story: 'I sleep {sleepHours} a night, and wind down for {windDown} before bed.',
      inputs: [
        { k: 'sleepHours', pre: 'I sleep for around', post: 'hours per night.', unit: 'h', max: 24, smax: 12, step: 0.5 },
        { k: 'windDown', pre: 'I wind down', post: 'minutes before sleeping.', unit: 'min', max: 1440, smax: 120, step: 5 },
      ],
      calc(v) {
        const sleeping = v.sleepHours * 7; // C19*7
        const prep = (v.windDown * 7) / 60; // C20*7/60
        return { lines: [['hours per week sleeping', sleeping], ['hours per week preparing to sleep', prep]], total: sleeping + prep };
      },
    },
    work: {
      icon: 'briefcase',
      story: 'I work {workHours} a day, {workDays} a week. Lunch break is {lunchBreak}, my commute is {commute} each way, getting ready takes {getReady} and changing after work {changeAfter}.',
      inputs: [
        { k: 'workHours', pre: 'I work for around', post: 'hours per day (excluding lunch break).', unit: 'h', max: 24, smax: 14, step: 0.5 },
        { k: 'workDays', pre: 'I work', post: 'days per week.', unit: 'days', max: 7, smax: 7, step: 1 },
        { k: 'lunchBreak', pre: 'My lunch break is', post: 'minutes per working day.', unit: 'min', max: 1440, smax: 120, step: 5 },
        { k: 'commute', pre: 'My commute is', post: 'minutes each way.', unit: 'min', max: 720, smax: 120, step: 5 },
        { k: 'getReady', pre: 'I spend', post: 'minutes per day getting ready for work.', unit: 'min', max: 1440, smax: 90, step: 5 },
        { k: 'changeAfter', pre: 'I spend', post: 'minutes per day getting changed after work.', unit: 'min', max: 1440, smax: 60, step: 5 },
      ],
      calc(v) {
        const d = v.workDays;
        const lines = [
          ['hours per week officially working', d * v.workHours], // C26*C25
          ['hours per week on my lunch break', (v.lunchBreak * d) / 60], // C27*C26/60
          ['hours per week commuting', (v.commute * 2 * d) / 60], // C28*2*C26/60
          ['hours per week getting ready for work', (v.getReady * d) / 60], // C29*C26/60
          ['hours per week getting changed after work', (v.changeAfter * d) / 60], // C30*C26/60
        ];
        return { lines, total: sum(lines.map((l) => l[1])) };
      },
    },
    food: {
      icon: 'cup',
      story: 'Breakfast takes {bfastEat}, plus {bfastPrep} to make. On days off, lunch takes {lunchEat}, plus {lunchPrep} to make. Dinner takes {dinnerEat}, plus {dinnerPrep} to make.',
      inputs: [
        { k: 'bfastEat', pre: 'Each day, I spend around', post: 'minutes eating breakfast.', unit: 'min', max: 1440, smax: 90, step: 5 },
        { k: 'bfastPrep', pre: 'And another', post: 'minutes preparing / cooking / ordering it.', unit: 'min', max: 1440, smax: 90, step: 5 },
        { k: 'lunchEat', pre: 'Each non-work day, I spend', post: 'minutes eating lunch.', unit: 'min', max: 1440, smax: 90, step: 5 },
        { k: 'lunchPrep', pre: 'And another', post: 'minutes preparing / cooking / ordering it.', unit: 'min', max: 1440, smax: 90, step: 5 },
        { k: 'dinnerEat', pre: 'Each day, I spend around', post: 'minutes eating dinner.', unit: 'min', max: 1440, smax: 120, step: 5 },
        { k: 'dinnerPrep', pre: 'And another', post: 'minutes preparing / cooking / ordering it.', unit: 'min', max: 1440, smax: 120, step: 5 },
      ],
      calc(v) {
        const b = v.bfastEat + v.bfastPrep;
        const l = v.lunchEat + v.lunchPrep;
        const dn = v.dinnerEat + v.dinnerPrep;
        const bH = (b * 7) / 60; // F36*7/60
        const lH = (l * (7 - v.workDays)) / 60; // F39*(7-C26)/60
        const dH = (dn * 7) / 60; // F42*7/60
        return {
          lines: [['hours per week on breakfast', bH], ['hours per week on lunch (excluding work days)', lH], ['hours per week on dinner', dH]],
          total: bH + lH + dH,
        };
      },
    },
    chores: {
      icon: 'home',
      story: 'I shop for groceries {groceryTimes} a week, {groceryMins} a trip. I clean {cleanTimes} a week, {cleanMins} each time, and do laundry {laundryTimes} a week, {laundryMins} a load. Other chores take {miscChores} a week.',
      inputs: [
        { k: 'groceryTimes', pre: 'I do the groceries', post: 'times per week.', unit: '×', max: 100, smax: 14, step: 1 },
        { k: 'groceryMins', pre: 'Each grocery session takes', post: 'minutes (including travel, loading, unloading etc).', unit: 'min', max: 1440, smax: 180, step: 5 },
        { k: 'cleanTimes', pre: 'I clean the house approx.', post: 'times per week.', unit: '×', max: 100, smax: 14, step: 1 },
        { k: 'cleanMins', pre: 'Each cleaning session takes', post: 'minutes.', unit: 'min', max: 1440, smax: 180, step: 5 },
        { k: 'laundryTimes', pre: 'I do laundry', post: 'times per week.', unit: '×', max: 100, smax: 14, step: 1 },
        { k: 'laundryMins', pre: 'Each laundry session takes me', post: 'minutes.', unit: 'min', max: 1440, smax: 120, step: 5 },
        { k: 'miscChores', pre: 'I do other misc. chores', post: 'hour(s) per week.', unit: 'h', max: 168, smax: 20, step: 0.5 },
      ],
      calc(v) {
        const lines = [
          ['hours per week on groceries', (v.groceryMins * v.groceryTimes) / 60],
          ['hours per week on cleaning', (v.cleanTimes * v.cleanMins) / 60],
          ['hours per week on laundry', (v.laundryMins * v.laundryTimes) / 60],
        ];
        return { lines, total: sum(lines.map((l) => l[1])) + v.miscChores }; // F49+F51+F53+C54
      },
    },
    childcare: {
      icon: 'heart',
      story: 'On weekdays I spend {weekdayCare} a day caring for my kids, and {weekendCare} a day at weekends. Kid admin and logistics take {childAdmin} a week, other kid things {childOther}.',
      inputs: [
        { k: 'weekdayCare', pre: 'Each weekday, I spend', post: 'hours actively taking care of my child(ren).', unit: 'h', max: 24, smax: 16, step: 0.5 },
        { k: 'weekendCare', pre: 'Each weekend day, I spend', post: 'hours actively taking care of my child(ren).', unit: 'h', max: 24, smax: 16, step: 0.5 },
        { k: 'childAdmin', pre: 'Each week, I spend', post: 'hours on child admin & logistics etc.', unit: 'h', max: 168, smax: 20, step: 0.5 },
        { k: 'childOther', pre: 'Each week, I spend', post: 'hours on other child-themed stuff.', unit: 'h', max: 168, smax: 20, step: 0.5 },
      ],
      calc(v) {
        const wd = 5 * v.weekdayCare; // 5*C59
        const we = 2 * v.weekendCare; // 2*C60
        return { lines: [['hours on weekdays on childcare', wd], ['hours on weekends on childcare', we]], total: wd + we + v.childAdmin + v.childOther };
      },
    },
    fitness: {
      icon: 'bolt',
      story: 'I exercise {exercise} a week, and spend {fitnessOther} on other fitness things.',
      inputs: [
        { k: 'exercise', pre: 'Each week, I spend', post: 'hours exercising (including commute time).', unit: 'h', max: 168, smax: 20, step: 0.5 },
        { k: 'fitnessOther', pre: 'Each week, I spend', post: 'hours on other fitness-related things.', unit: 'h', max: 168, smax: 20, step: 0.5 },
      ],
      calc: (v) => ({ lines: [], total: v.exercise + v.fitnessOther }),
    },
    entertainment: {
      icon: 'play',
      story: 'Each week I spend {tv} on TV and movies, {socialMedia} on social media, {reading} reading, {gaming} gaming and {entOther} on other fun.',
      inputs: [
        { k: 'tv', pre: 'Each week, I spend', post: 'hours watching TV shows / movies.', unit: 'h', max: 168, smax: 40, step: 0.5 },
        { k: 'socialMedia', pre: 'Each week, I spend', post: 'hours on social media apps.', unit: 'h', max: 168, smax: 60, step: 0.5 },
        { k: 'reading', pre: 'Each week, I spend', post: 'hours reading.', unit: 'h', max: 168, smax: 30, step: 0.5 },
        { k: 'gaming', pre: 'Each week, I spend', post: 'hours gaming.', unit: 'h', max: 168, smax: 40, step: 0.5 },
        { k: 'entOther', pre: 'Each week, I spend', post: 'hours on other “entertainment” stuff.', unit: 'h', max: 168, smax: 30, step: 0.5 },
      ],
      calc: (v) => ({ lines: [], total: v.tv + v.socialMedia + v.reading + v.gaming + v.entOther }),
    },
    relationships: {
      icon: 'people',
      story: 'I spend {familyTime} a week of quality time with family or my partner, and {socialising} socialising.',
      inputs: [
        { k: 'familyTime', pre: 'Each week, I spend', post: 'hours on quality family / partner time.', unit: 'h', max: 168, smax: 40, step: 0.5 },
        { k: 'socialising', pre: 'Each week, I spend', post: 'hours on other socialising time.', unit: 'h', max: 168, smax: 40, step: 0.5 },
      ],
      calc: (v) => ({ lines: [], total: v.familyTime + v.socialising }),
    },
  };

  const INPUT_DEFS = {};
  for (const id of BUILTIN_IDS) for (const inp of SECTIONS[id].inputs) INPUT_DEFS[inp.k] = { ...inp, section: id };
  const INPUT_KEYS = Object.keys(INPUT_DEFS);

  /* ---------- Starting points ---------- */
  const W = (o) => ({ ...blankWeek(), ...o });
  function blankWeek() { return Object.fromEntries(INPUT_KEYS.map((k) => [k, 0])); }
  const PRESETS = {
    office: {
      label: 'Office 9–5',
      v: W({ sleepHours: 7.5, windDown: 30, workHours: 8, workDays: 5, lunchBreak: 45, commute: 30, getReady: 30, changeAfter: 15,
        bfastEat: 15, bfastPrep: 10, lunchEat: 30, lunchPrep: 20, dinnerEat: 30, dinnerPrep: 30,
        groceryTimes: 1, groceryMins: 60, cleanTimes: 1, cleanMins: 90, laundryTimes: 2, laundryMins: 30, miscChores: 1,
        exercise: 3, tv: 7, socialMedia: 7, reading: 2, entOther: 2, familyTime: 6, socialising: 4 }),
    },
    student: {
      label: 'Student',
      v: W({ sleepHours: 8, windDown: 20, workHours: 6, workDays: 5, lunchBreak: 45, commute: 25, getReady: 20,
        bfastEat: 15, bfastPrep: 5, lunchEat: 30, lunchPrep: 15, dinnerEat: 30, dinnerPrep: 20,
        groceryTimes: 1, groceryMins: 45, cleanTimes: 1, cleanMins: 60, laundryTimes: 1, laundryMins: 30, miscChores: 1,
        exercise: 3, tv: 6, socialMedia: 12, reading: 3, gaming: 5, entOther: 2, familyTime: 3, socialising: 8 }),
    },
    parent: {
      label: 'Parent',
      v: W({ sleepHours: 7, windDown: 20, workHours: 7.5, workDays: 5, lunchBreak: 30, commute: 25, getReady: 30, changeAfter: 10,
        bfastEat: 15, bfastPrep: 15, lunchEat: 30, lunchPrep: 30, dinnerEat: 30, dinnerPrep: 40,
        groceryTimes: 2, groceryMins: 60, cleanTimes: 2, cleanMins: 60, laundryTimes: 3, laundryMins: 40, miscChores: 2,
        weekdayCare: 3, weekendCare: 8, childAdmin: 2, childOther: 1,
        exercise: 2, tv: 5, socialMedia: 5, reading: 1, familyTime: 6, socialising: 2 }),
    },
    freelancer: {
      label: 'Freelancer',
      v: W({ sleepHours: 7.5, windDown: 30, workHours: 6, workDays: 5, lunchBreak: 45, getReady: 15,
        bfastEat: 15, bfastPrep: 10, lunchEat: 30, lunchPrep: 20, dinnerEat: 40, dinnerPrep: 30,
        groceryTimes: 1, groceryMins: 60, cleanTimes: 1, cleanMins: 60, laundryTimes: 2, laundryMins: 30, miscChores: 1,
        exercise: 4, fitnessOther: 1, tv: 6, socialMedia: 8, reading: 4, gaming: 2, entOther: 3, familyTime: 8, socialising: 5 }),
    },
  };

  /* Example answers from the original spreadsheet (used by "Load example"). */
  const EXAMPLE = {
    current: W({ sleepHours: 8, windDown: 1, workHours: 1, workDays: 7, commute: 20, getReady: 40, changeAfter: 30,
      bfastEat: 50, dinnerEat: 80, tv: 3, socialMedia: 50, reading: 1, entOther: 10, socialising: 20 }),
    ideal: W({ sleepHours: 7, windDown: 1, workHours: 6, workDays: 7, commute: 20, getReady: 30, changeAfter: 15,
      bfastEat: 30, dinnerEat: 30, exercise: 3, fitnessOther: 1, socialMedia: 7, reading: 7, socialising: 7 }),
  };

  /* ---------- Helpers ---------- */
  function sum(a) { return a.reduce((s, x) => s + x, 0); }
  function num(x) { const n = Number(x); return Number.isFinite(n) ? n : 0; }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function round1(n) { return Math.round(n * 10) / 10; }
  function fmt(n) {
    const r = round1(n);
    return (Object.is(r, -0) ? 0 : r).toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  function fmtDelta(n) { const r = round1(n); return r > 0 ? '+' + fmt(r) : r < 0 ? '−' + fmt(-r) : '±0'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function el(tag, attrs = {}, html = '') {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else e.setAttribute(k, v);
    }
    if (html) e.innerHTML = html;
    return e;
  }
  const $ = (s, r = document) => r.querySelector(s);
  // Null-safe listener: a missing element never stops the rest of the app from working.
  const on = (sel, ev, fn) => { const n = $(sel); if (n) n.addEventListener(ev, fn); };
  const uid = () => 'c_' + Math.random().toString(36).slice(2, 9);
  function unitLabel(unit, v) {
    if (unit === 'h') return `${fmt(v)} h`;
    if (unit === 'min') return `${fmt(v)} min`;
    if (unit === 'days') return `${fmt(v)} ${v === 1 ? 'day' : 'days'}`;
    if (unit === '×') return `${fmt(v)}×`;
    return fmt(v);
  }

  const ICONS = {
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    cup: '<path d="M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V9ZM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3m4-3v3"/>',
    home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3V9Z"/>',
    people: '<circle cx="9" cy="9" r="3.5"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 15.2c.6-.1 1.3-.2 2-.2 2.8 0 4 1.8 4 4"/>',
    crescent: '<path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 16 7 7 0 0 1 15.5 3.5Z"/><path d="m18 6 .5 1.2 1.2.5-1.2.5L18 9.4l-.5-1.2-1.2-.5 1.2-.5L18 6Z"/>',
    star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3Z"/>',
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;

  /* ---------- State ---------- */
  function defaultState() {
    return {
      v: 2,
      theme: null,
      view: 'calc',
      mode: 'current',
      cats: BUILTINS.map((b) => ({ ...b, builtin: true })),
      current: { ...PRESETS.office.v },
      ideal: W({ ...PRESETS.office.v, sleepHours: 8, commute: 20, socialMedia: 3, reading: 5, exercise: 4, familyTime: 8 }),
      grid: Array(HOURS).fill(null),
      brush: 'sleep',
      target: 'ideal',
      cmpId: 'musk',
      cmpMode: 'current',
      lbMetric: 'balance',
      profile: { name: '', photo: '' },
      hidden: [],
      salah: { place: 'makkah', lat: 21.4225, lng: 39.8262, zone: 'Asia/Riyadh', method: 'Makkah', asr: 'standard', sync: false, markers: false,
        adj: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
        current: { prayers: 5, prayerMins: 10, quranMins: 5, dhikrMins: 5, jumuahMins: 60, learnHours: 0, tahajjudNights: 0, tahajjudMins: 0 },
        ideal: { prayers: 5, prayerMins: 15, quranMins: 20, dhikrMins: 10, jumuahMins: 90, learnHours: 2, tahajjudNights: 2, tahajjudMins: 20 } },
    };
  }

  function sanitize(raw) {
    const s = defaultState();
    if (!raw || typeof raw !== 'object') return s;
    if (raw.theme === 'light' || raw.theme === 'dark') s.theme = raw.theme;
    if (raw.view === 'grid' || raw.view === 'calc') s.view = raw.view;
    if (raw.mode === 'current' || raw.mode === 'ideal') s.mode = raw.mode;
    if (raw.target === 'current' || raw.target === 'ideal') s.target = raw.target;
    if (raw.view === 'compare' || raw.view === 'salah') s.view = raw.view;
    if (Array.isArray(raw.hidden)) s.hidden = raw.hidden.filter((id) => BUILTIN_IDS.includes(id));
    if (raw.profile && typeof raw.profile === 'object') {
      if (typeof raw.profile.name === 'string') s.profile.name = raw.profile.name.replace(/[\u0000-\u001f]/g, '').slice(0, 40);
      const ph = raw.profile.photo;
      if (typeof ph === 'string' && ph.length < 400000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(ph)) s.profile.photo = ph;
    }
    if (raw.salah && typeof raw.salah === 'object') {
      const r = raw.salah;
      const S = s.salah;
      if (typeof r.place === 'string') S.place = r.place.slice(0, 20);
      if (Number.isFinite(r.lat) && Math.abs(r.lat) <= 90) S.lat = r.lat;
      if (Number.isFinite(r.lng) && Math.abs(r.lng) <= 180) S.lng = r.lng;
      if (typeof r.zone === 'string' && /^[\w/+-]{1,40}$/.test(r.zone)) S.zone = r.zone;
      if (['MWL', 'ISNA', 'Egypt', 'Makkah', 'Karachi'].includes(r.method)) S.method = r.method;
      if (r.asr === 'hanafi' || r.asr === 'standard') S.asr = r.asr;
      S.sync = !!r.sync;
      if (r.adj && typeof r.adj === 'object') for (const k in S.adj) S.adj[k] = clamp(Math.round(num(r.adj[k])), -60, 60);
      S.markers = !!r.markers;
      const lim = { prayers: 5, prayerMins: 120, quranMins: 600, dhikrMins: 600, jumuahMins: 300, learnHours: 40, tahajjudNights: 7, tahajjudMins: 180 };
      for (const w of WEEKS) if (r[w] && typeof r[w] === 'object') for (const k in lim) if (k in r[w]) S[w][k] = clamp(num(r[w][k]), 0, lim[k]);
    }
    if (raw.cmpMode === 'current' || raw.cmpMode === 'ideal') s.cmpMode = raw.cmpMode;
    if (typeof raw.cmpId === 'string') s.cmpId = raw.cmpId;
    if (typeof raw.lbMetric === 'string') s.lbMetric = raw.lbMetric;
    if (Array.isArray(raw.cats)) {
      const byId = Object.fromEntries(raw.cats.filter((c) => c && c.id).map((c) => [c.id, c]));
      s.cats = BUILTINS.map((b) => {
        const c = byId[b.id] || {};
        return {
          ...b,
          builtin: true,
          name: typeof c.name === 'string' && c.name.trim() ? c.name.slice(0, 40) : b.name,
          color: /^#[0-9a-f]{6}$/i.test(c.color) && c.color.toLowerCase() !== OLD_DEFAULTS[b.id] ? c.color : b.color,
        };
      });
      for (const c of raw.cats) {
        if (!c || !c.id || BUILTIN_IDS.includes(c.id) || c.id === 'free') continue;
        s.cats.push({
          id: String(c.id).slice(0, 20),
          builtin: false,
          name: typeof c.name === 'string' && c.name.trim() ? c.name.slice(0, 40) : 'New area',
          color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : CUSTOM_COLORS[0],
          linked: c.linked === 'salah' ? 'salah' : undefined,
          current: Math.max(0, num(c.current)),
          ideal: Math.max(0, num(c.ideal)),
        });
      }
    }
    for (const w of WEEKS) {
      if (raw[w] && typeof raw[w] === 'object') {
        for (const k of INPUT_KEYS) if (k in raw[w]) s[w][k] = clamp(num(raw[w][k]), 0, INPUT_DEFS[k].max);
      }
    }
    const ids = new Set(s.cats.map((c) => c.id));
    if (Array.isArray(raw.grid) && raw.grid.length === HOURS) s.grid = raw.grid.map((g) => (ids.has(g) ? g : null));
    if (raw.brush === null || ids.has(raw.brush)) s.brush = raw.brush;
    return s;
  }

  function load() {
    try {
      const txt = localStorage.getItem(STORAGE_KEY);
      return txt ? sanitize(JSON.parse(txt)) : defaultState();
    } catch (e) {
      return defaultState();
    }
  }

  let state = load();
  let saveTimer = null;
  let saveWarned = false;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        saveWarned = false;
      } catch (e) {
        if (!saveWarned) {
          saveWarned = true;
          toast('Couldn’t save in this browser (storage full or blocked). Try a smaller profile photo, or export a backup.');
        }
      }
    }, 150);
  }

  const cat = (id) => state.cats.find((c) => c.id === id);
  const customs = () => state.cats.filter((c) => !c.builtin);
  const isHidden = (id) => (state.hidden || []).includes(id);
  const shown = () => state.cats.filter((c) => !isHidden(c.id)); // areas the user hasn't removed

  /* ---------- Calculation (the spreadsheet engine) ---------- */
  function computeWeek(w) {
    const v = state[w];
    const areas = {};
    let running = HOURS;
    for (const id of BUILTIN_IDS) {
      const r = isHidden(id) ? { lines: [], total: 0 } : SECTIONS[id].calc(v);
      running -= r.total;
      areas[id] = { ...r, left: running };
    }
    for (const c of customs()) {
      const t = num(c[w]);
      running -= t;
      areas[c.id] = { lines: [], total: t, left: running };
    }
    const used = sum(Object.values(areas).map((a) => a.total)); // SUM of life areas
    const free = HOURS - used; // 168 − used
    return { areas, used, free, monthly: { used: used * 4, free: free * 4 }, annual: { used: used * 52, free: free * 52 } };
  }
  let R = { current: computeWeek('current'), ideal: computeWeek('ideal') };

  /* ==========================================================
     BALANCE VIEW
     ========================================================== */

  /* ---------- Ring ---------- */
  function ringSVG(w, size, stroke) {
    return ringFrom((id) => R[w].areas[id].total, size, stroke);
  }
  function ringFrom(get, size, stroke) {
    const used = sum(state.cats.map((c) => Math.max(0, get(c.id))));
    const r = { used, free: HOURS - used };
    const rad = (size - stroke) / 2;
    const C = 2 * Math.PI * rad;
    const denom = Math.max(HOURS, r.used);
    let off = 0;
    let segs = '';
    for (const c of state.cats) {
      const t = Math.max(0, get(c.id));
      if (t <= 0) continue;
      const len = (t / denom) * C;
      const gap = len > 4 ? 2 : 0;
      segs += `<circle cx="${size / 2}" cy="${size / 2}" r="${rad}" fill="none" stroke="${c.color}" stroke-width="${stroke}"
        stroke-dasharray="${Math.max(0.1, len - gap)} ${C}" stroke-dashoffset="${-off}" class="seg-arc" data-id="${c.id}"><title>${esc(c.name)}: ${fmt(t)} h</title></circle>`;
      off += len;
    }
    return `<svg viewBox="0 0 ${size} ${size}" class="ring-svg${r.free < -0.05 ? ' over' : ''}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${rad}" fill="none" class="ring-track" stroke-width="${stroke}"/>
      <g transform="rotate(-90 ${size / 2} ${size / 2})">${segs}</g></svg>`;
  }

  function renderRing() {
    const w = state.mode;
    const r = R[w];
    const over = round1(r.free) < 0;
    $('#ring').innerHTML = ringSVG(w, 240, 26) + `
      <div class="ring-center">
        <div class="ring-num${over ? ' neg' : ''}">${fmt(over ? -r.free : r.free)}</div>
        <div class="ring-lbl">${over ? 'hours over' : 'hours free'}</div>
        <div class="ring-sub">${fmt(r.used)} of 168 h planned</div>
      </div>`;
    $('#ring').setAttribute('aria-label', `${WEEK_NAME[w]}: ${fmt(r.free)} hours free, ${fmt(r.used)} planned`);
    $('#pill').innerHTML = `${ringSVG(w, 36, 6)}<span><strong class="${over ? 'neg' : ''}">${fmt(r.free)} h</strong> free</span><span class="pill-mode">${WEEK_SHORT[w]}</span>`;
  }

  /* ---------- Insight line ---------- */
  function renderInsight() {
    const c = R.current;
    const i = R.ideal;
    let html;
    if (state.mode === 'ideal') {
      const gain = i.free - c.free;
      const days = Math.round((Math.abs(gain) * 52) / 24);
      const biggest = state.cats
        .map((k) => ({ k, d: i.areas[k.id].total - c.areas[k.id].total }))
        .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
      if (round1(gain) > 0) {
        html = `Your ideal week frees up <b>${fmt(gain)} hours</b> a week. That's <b>${days} full days</b> a year back.`;
      } else if (round1(gain) < 0) {
        html = `Your ideal week asks for <b>${fmt(-gain)} more hours</b> than now. Something else will need to give.`;
      } else {
        html = 'Your ideal week has the same free time as now. Try moving hours between areas.';
      }
      if (biggest && Math.abs(round1(biggest.d)) > 0) {
        html += ` Biggest shift: <span class="chip-inline" style="--c:${biggest.k.color}">${esc(biggest.k.name)} ${fmtDelta(biggest.d)} h</span>`;
      }
    } else {
      const pct = Math.round((Math.max(0, c.free) / HOURS) * 100);
      html = round1(c.free) < 0
        ? `Right now your week needs <b>${fmt(-c.free)} hours</b> more than exist. That's why it feels tight.`
        : `Right now <b>${pct}%</b> of your week is truly free. That's <b>${fmt(c.free * 52)} hours</b> a year.`;
    }
    $('#insight').innerHTML = html;
  }

  /* ---------- Mode switch ---------- */
  function renderMode() {
    document.querySelectorAll('#mode-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === state.mode)));
    document.body.dataset.mode = state.mode;
    $('#copy-now').hidden = state.mode !== 'ideal';
  }

  function setMode(m) {
    state.mode = m;
    renderMode();
    refreshChips();
    recalc();
  }

  /* ---------- Story cards ---------- */
  const chips = []; // {node, w?, k?, custom?}

  function renderCards() {
    const root = $('#cards');
    root.innerHTML = '';
    chips.length = 0;
    for (const id of BUILTIN_IDS) {
      if (isHidden(id)) continue;
      const c = cat(id);
      const sec = SECTIONS[id];
      const card = el('article', { class: 'story', style: `--c:${c.color}`, 'data-id': id });
      card.innerHTML = `
        <header class="story-head">
          <span class="story-icon">${icon(sec.icon)}</span>
          <h3>${esc(c.name)}</h3>
          <div class="story-total"><span class="t-num" data-total="${id}"></span><span class="t-delta" data-delta="${id}"></span></div>
          <button class="story-del" type="button" data-del="${id}" aria-label="Remove ${esc(c.name)}" title="Remove"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </header>`;
      const p = el('p', { class: 'story-text' });
      const parts = sec.story.split(/(\{\w+\})/);
      for (const part of parts) {
        const m = part.match(/^\{(\w+)\}$/);
        if (m) p.append(makeChip(INPUT_DEFS[m[1]]));
        else if (part) p.append(document.createTextNode(part));
      }
      card.append(p);
      card.append(el('div', { class: 'story-bar' }, '<span></span>'));
      root.append(card);
    }
    for (const c of customs()) {
      const card = el('article', { class: 'story custom', style: `--c:${c.color}`, 'data-id': c.id });
      card.innerHTML = `
        <header class="story-head">
          <span class="story-icon">${icon('star')}</span>
          <h3>${esc(c.name)}</h3>
          <div class="story-total"><span class="t-num" data-total="${c.id}"></span><span class="t-delta" data-delta="${c.id}"></span></div>
          <button class="story-del" type="button" data-del="${c.id}" aria-label="Remove ${esc(c.name)}" title="Remove"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </header>`;
      if (c.linked === 'salah') {
        card.querySelector('.story-icon').innerHTML = icon('crescent');
        const p = el('p', { class: 'story-text' }, 'Prayers, Quran, dhikr, Jumu’ah and learning, planned on the Salah page. ');
        const go = el('button', { class: 'linkish', type: 'button' }, 'Edit on the Salah page →');
        go.addEventListener('click', () => { setView('salah'); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        p.append(go);
        card.append(p, el('div', { class: 'story-bar' }, '<span></span>'));
        root.append(card);
        continue;
      }
      const p = el('p', { class: 'story-text' });
      p.append(document.createTextNode('I spend '));
      p.append(makeChip({ k: c.id, custom: c, pre: `${c.name}:`, post: 'hours per week.', unit: 'h', max: 168, smax: 40, step: 0.5 }));
      p.append(document.createTextNode(' a week on this.'));
      card.append(p, el('div', { class: 'story-bar' }, '<span></span>'));
      root.append(card);
    }
    const add = el('button', { class: 'story add', type: 'button' }, `<span class="add-plus">+</span><span><b>Add your own area</b><br><span class="muted">Study, side project, faith, volunteering…</span></span>`);
    add.addEventListener('click', () => { addCategory(); openCategories(); });
    root.append(add);
    if (state.hidden.length) {
      const row = el('div', { class: 'hidden-areas' }, `<span class="muted">Removed areas</span>` +
        state.hidden.map((id) => `<button type="button" data-restore="${id}" style="--c:${cat(id).color}"><span class="sw"></span>${esc(cat(id).name)}<b>+</b></button>`).join(''));
      root.append(row);
    }
    refreshChips();
  }

  function getVal(def, w = state.mode) { return def.faith ? state.salah[w][def.k] : def.custom ? num(def.custom[w]) : state[w][def.k]; }
  function setVal(def, v, w = state.mode) {
    v = clamp(Math.round(v / def.step) * def.step, 0, def.max);
    v = Math.round(v * 100) / 100;
    if (def.faith) state.salah[w][def.k] = v; else if (def.custom) def.custom[w] = v; else state[w][def.k] = v;
    return v;
  }

  function makeChip(def) {
    const b = el('button', { class: 'num', type: 'button' });
    b.dataset.k = def.k;
    chips.push({ node: b, def });
    let startX = 0;
    let startV = 0;
    let suppressClick = 0;
    let moved = false;
    let down = false;
    b.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      suppressClick = 0; // a fresh press is never part of an earlier drag
      startX = e.clientX;
      startV = getVal(def);
      b.setPointerCapture(e.pointerId);
    });
    b.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 5) return;
      if (!moved) { moved = true; b.classList.add('scrubbing'); document.body.classList.add('is-scrubbing'); closePop(); }
      const span = def.smax / def.step;
      const pxPerStep = clamp(260 / span, 3, 18);
      setVal(def, startV + Math.round(dx / pxPerStep) * def.step);
      refreshChip(b, def);
      recalc();
    });
    const end = () => {
      if (!down) return;
      down = false;
      b.classList.remove('scrubbing');
      document.body.classList.remove('is-scrubbing');
      // A tap opens the editor from the 'click' that follows (see below), so the
      // phone's follow-up click can't land on the editor's backdrop and close it.
      if (moved) suppressClick = Date.now();
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', () => { down = false; b.classList.remove('scrubbing'); document.body.classList.remove('is-scrubbing'); });
    b.addEventListener('keydown', (e) => {
      const dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
      if (dir) {
        e.preventDefault();
        setVal(def, getVal(def) + dir * def.step * (e.shiftKey ? 5 : 1));
        refreshChip(b, def);
        recalc();
      }
    });
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (Date.now() - suppressClick < 500) return; // that was a drag, not a tap
      openPop(b, def); // taps, mouse clicks and keyboard Enter/Space
    });
    return b;
  }

  function refreshChip(node, def) {
    const v = getVal(def);
    node.textContent = unitLabel(def.unit, v);
    const other = getVal(def, state.mode === 'ideal' ? 'current' : 'ideal');
    const changed = state.mode === 'ideal' && Math.abs(other - v) > 1e-9;
    node.classList.toggle('changed', changed);
    node.classList.toggle('zero', v === 0);
    node.title = changed ? `Now: ${unitLabel(def.unit, other)}` : 'Drag sideways or tap to change';
    node.setAttribute('aria-label', `${def.pre} ${unitLabel(def.unit, v)} ${def.post}`);
  }
  function refreshChips() { for (const c of chips) refreshChip(c.node, c.def); }

  function renderCardTotals() {
    const w = state.mode;
    const max = Math.max(...state.cats.map((c) => R[w].areas[c.id].total), 1);
    for (const c of state.cats) {
      const t = R[w].areas[c.id].total;
      const n = document.querySelector(`[data-total="${c.id}"]`);
      if (n) n.innerHTML = `${fmt(t)}<small> h/wk</small>`;
      const d = document.querySelector(`[data-delta="${c.id}"]`);
      if (d) {
        const diff = t - R.current.areas[c.id].total;
        d.textContent = w === 'ideal' && round1(diff) !== 0 ? `${fmtDelta(diff)} vs now` : '';
      }
      const bar = document.querySelector(`.story[data-id="${c.id}"] .story-bar span`);
      if (bar) bar.style.width = `${(t / max) * 100}%`;
    }
  }

  /* ---------- Popover editor ---------- */
  let popFor = null;
  let popOpenedAt = 0;
  function openPop(node, def) {
    popOpenedAt = Date.now();
    const pop = $('#pop');
    popFor = { node, def };
    const v = getVal(def);
    const presets = def.unit === 'min' ? [0, 15, 30, 45, 60, 90] : def.unit === 'days' ? [0, 3, 4, 5, 6, 7] : def.unit === '×' ? [0, 1, 2, 3, 5, 7] : def.smax <= 12 ? [0, 6, 7, 7.5, 8, 9] : [0, 1, 2, 5, 10, 20];
    pop.innerHTML = `
      <div class="pop-q">${esc(def.pre)} <span class="muted">…</span> ${esc(def.post)}</div>
      <div class="pop-val">
        <button class="pop-step" type="button" data-step="-1" aria-label="Decrease">−</button>
        <label class="pop-input"><input type="number" inputmode="decimal" min="0" max="${def.max}" step="${def.step}" value="${v}" aria-label="Value" /><span>${def.unit === '×' ? 'times' : esc(def.unit)}</span></label>
        <button class="pop-step" type="button" data-step="1" aria-label="Increase">+</button>
      </div>
      <input class="pop-range" type="range" min="0" max="${Math.max(def.smax, v)}" step="${def.step}" value="${v}" aria-label="Slider" style="--c:${def.faith ? FAITH_COLOR : cat(def.custom ? def.custom.id : def.section).color}" />
      <div class="pop-quick">${presets.map((p) => `<button type="button" data-v="${p}">${unitLabel(def.unit, p)}</button>`).join('')}</div>
      <div class="pop-foot"><span class="muted">${state.mode === 'ideal' ? `Now: ${unitLabel(def.unit, getVal(def, 'current'))}` : 'Tip: drag numbers sideways'}</span><button class="btn small primary" type="button" data-done>Done</button></div>`;
    pop.hidden = false;
    const input = pop.querySelector('input[type=number]');
    const range = pop.querySelector('.pop-range');
    const apply = (val, from) => {
      const nv = setVal(def, val);
      if (from !== 'input') input.value = nv;
      if (from !== 'range') range.value = nv;
      paintRange(range);
      refreshChip(node, def);
      recalc();
    };
    pop.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => apply(getVal(def) + +b.dataset.step * def.step)));
    pop.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => apply(+b.dataset.v)));
    input.addEventListener('input', () => apply(num(input.value), 'input'));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') closePop(true); });
    range.addEventListener('input', () => apply(+range.value, 'range'));
    pop.querySelector('[data-done]').addEventListener('click', () => closePop(true));
    paintRange(range);
    positionPop(node);
    node.classList.add('editing');
    if (window.matchMedia('(pointer: fine)').matches) { input.focus(); input.select(); }
  }
  function paintRange(r) {
    const p = (r.value / r.max) * 100 || 0;
    r.style.setProperty('--p', p + '%');
  }
  const isSheet = () => window.innerWidth < 600;
  function positionPop(node) {
    const pop = $('#pop');
    const bd = $('#pop-backdrop');
    if (isSheet()) {
      pop.classList.add('sheet');
      pop.style.left = pop.style.top = '';
      if (bd) bd.hidden = false;
      liftSheet();
      return;
    }
    if (bd) bd.hidden = true;
    pop.classList.remove('sheet');
    const r = node.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    let left = r.left + r.width / 2 - pw / 2 + window.scrollX;
    left = clamp(left, window.scrollX + 12, window.scrollX + document.documentElement.clientWidth - pw - 12);
    let top = r.bottom + 10 + window.scrollY;
    if (r.bottom + ph + 20 > window.innerHeight && r.top - ph - 10 > 0) top = r.top - ph - 10 + window.scrollY;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  // Keep the bottom sheet above the on-screen keyboard (iOS / Android).
  function liftSheet() {
    const pop = $('#pop');
    if (!pop || pop.hidden || !pop.classList.contains('sheet')) return;
    const vv = window.visualViewport;
    const gap = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    pop.style.bottom = gap + 'px';
  }
  function closePop(refocus) {
    const pop = $('#pop');
    if (pop.hidden) return;
    pop.hidden = true;
    pop.style.bottom = '';
    const bd = $('#pop-backdrop');
    if (bd) bd.hidden = true;
    if (popFor) {
      popFor.node.classList.remove('editing');
      if (refocus) popFor.node.focus();
    }
    popFor = null;
  }

  /* ---------- Receipt ---------- */
  function renderReceipt() {
    const w = state.mode;
    const r = R[w];
    const c = R.current;
    const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const lines = shown().map((k) => {
      const t = r.areas[k.id].total;
      return `<li class="${t === 0 ? 'z' : ''}"><span class="r-name"><i style="background:${k.color}"></i>${esc(k.name)}</span><span class="r-dots"></span><span class="r-val">${fmt(t)}</span></li>`;
    }).join('');
    const over = round1(r.free) < 0;
    const gain = r.free - c.free;
    const bars = shown().map((k) => {
      const t = Math.max(0, r.areas[k.id].total);
      return t > 0 ? `<span style="flex:${t};background:${k.color}"></span>` : '';
    }).join('') + (r.free > 0 ? `<span class="free" style="flex:${r.free}"></span>` : '');
    $('#receipt').innerHTML = `
      <div class="r-top">
        <div class="r-brand">168 HOURS</div>
        <div class="r-meta">${state.profile.name.trim() ? esc(state.profile.name.trim().toUpperCase()) + ' · ' : ''}${WEEK_NAME[w].toUpperCase()} · ${date}</div>
      </div>
      <ul class="r-lines">${lines}</ul>
      <div class="r-rule"></div>
      <div class="r-row"><span>Planned</span><span>${fmt(r.used)} h</span></div>
      <div class="r-row big${over ? ' neg' : ''}"><span>${over ? 'Over budget' : 'Free time'}</span><span>${fmt(over ? -r.free : r.free)} h</span></div>
      <div class="r-rule"></div>
      <div class="r-row small"><span>Per month</span><span>${fmt(r.monthly.free)} h free</span></div>
      <div class="r-row small"><span>Per year</span><span>${fmt(r.annual.free)} h free</span></div>
      ${w === 'ideal' ? `<div class="r-row small accent"><span>Vs. now</span><span>${fmtDelta(gain)} h free / wk</span></div>` : ''}
      <div class="r-code" aria-hidden="true">${bars}</div>
      <div class="r-thanks">Thank you for spending your time wisely</div>`;
  }

  /* ---------- Recalc ---------- */
  function recalc() {
    syncFaith();
    R = { current: computeWeek('current'), ideal: computeWeek('ideal') };
    renderRing();
    renderInsight();
    renderCardTotals();
    renderReceipt();
    renderTally();
    renderCompare();
    renderSalah();
    if (popFor && !$('#pop').hidden && !$('#pop').classList.contains('sheet')) positionPop(popFor.node);
    save();
  }

  /* ---------- Presets ---------- */
  let undoSnap = null;
  function applyPreset(key) {
    const w = state.mode;
    undoSnap = { w, v: { ...state[w] } };
    if (key === 'copy') state.ideal = { ...state.current };
    else if (key === 'blank') state[w] = blankWeek();
    else state[w] = { ...PRESETS[key].v };
    refreshChips();
    recalc();
    const label = key === 'copy' ? 'Copied your week now into your ideal week' : key === 'blank' ? `Cleared ${WEEK_NAME[w].toLowerCase()}` : `Loaded “${PRESETS[key].label}” into ${WEEK_NAME[w].toLowerCase()}`;
    toast(label, 'Undo', () => {
      if (!undoSnap) return;
      state[undoSnap.w] = undoSnap.v;
      undoSnap = null;
      refreshChips();
      recalc();
    });
  }

  /* ==========================================================
     SCHEDULE VIEW (week grid)
     ========================================================== */
  const cells = [];
  let painting = false;
  let paintMode = 'paint';
  let lastPainted = -1;

  function buildWeek() {
    const week = $('#week');
    week.innerHTML = '';
    cells.length = 0;
    week.append(el('span'));
    DAYS.forEach((d, di) => {
      const b = el('button', { class: 'wk-head', type: 'button', title: `Fill all of ${d} with the selected category` }, d);
      b.addEventListener('click', () => fillSet(Array.from({ length: 24 }, (_, h) => di * 24 + h)));
      week.append(b);
    });
    for (let h = 0; h < 24; h++) {
      const hb = el('button', { class: 'wk-hour', type: 'button', title: `Fill ${hourLabel(h)} on every day` }, hourLabel(h));
      hb.addEventListener('click', () => fillSet(DAYS.map((_, di) => di * 24 + h)));
      week.append(hb);
      for (let d = 0; d < 7; d++) {
        const i = d * 24 + h;
        const c = el('div', { class: 'cell', 'data-i': String(i), role: 'gridcell' });
        cells[i] = c;
        week.append(c);
      }
    }
    week.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.cell');
      if (!c) return;
      if (e.pointerType === 'touch' && document.body.classList.contains('grid-scroll')) return; // let the page scroll
      e.preventDefault();
      const i = +c.dataset.i;
      painting = true;
      paintMode = state.brush === null || state.grid[i] === state.brush ? 'erase' : 'paint';
      lastPainted = -1;
      applyCell(i);
    });
    window.addEventListener('pointermove', (e) => {
      if (!painting) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const c = t && t.closest && t.closest('.cell');
      if (!c) return;
      const to = +c.dataset.i;
      const from = lastPainted;
      if (from >= 0 && from !== to) {
        const [d0, h0, d1, h1] = [Math.floor(from / 24), from % 24, Math.floor(to / 24), to % 24];
        const steps = Math.max(Math.abs(d1 - d0), Math.abs(h1 - h0));
        for (let s = 1; s < steps; s++) {
          lastPainted = -1;
          applyCell(Math.round(d0 + ((d1 - d0) * s) / steps) * 24 + Math.round(h0 + ((h1 - h0) * s) / steps));
        }
      }
      applyCell(to);
    });
    const stop = () => { if (painting) { painting = false; save(); } };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  }

  function hourLabel(h) {
    if (h === 0) return '12a';
    if (h === 12) return '12p';
    return h < 12 ? `${h}a` : `${h - 12}p`;
  }

  function applyCell(i) {
    if (i === lastPainted) return;
    lastPainted = i;
    const next = paintMode === 'erase' ? null : state.brush;
    if (state.grid[i] === next) return;
    state.grid[i] = next;
    paintCells();
    renderTally();
  }

  function fillSet(idx) {
    const allSame = state.brush !== null && idx.every((i) => state.grid[i] === state.brush);
    const v = allSame ? null : state.brush;
    for (const i of idx) state.grid[i] = v;
    paintCells();
    renderTally();
    save();
  }

  function paintCells() {
    for (let i = 0; i < HOURS; i++) {
      const id = state.grid[i];
      const c = cells[i];
      if (!c) continue;
      const k = id && cat(id);
      const h = i % 24;
      const d = Math.floor(i / 24);
      c.classList.toggle('on', !!k);
      c.classList.toggle('join-up', !!k && h > 0 && state.grid[i - 1] === id);
      c.classList.toggle('join-down', !!k && h < 23 && state.grid[i + 1] === id);
      if (k) c.style.setProperty('--cc', k.color); else c.style.removeProperty('--cc');
      c.title = `${DAYS[d]} ${hourLabel(h)}–${hourLabel((h + 1) % 24)} · ${k ? k.name : 'Free'}`;
      c.textContent = k && !(h > 0 && state.grid[i - 1] === id) ? k.name : '';
      c.classList.remove('pr');
      delete c.dataset.pr;
    }
    if (state.salah && state.salah.markers) {
      weekTimes().forEach((w, d) => {
        for (const k of FARD) {
          const t = w.times[k];
          if (!Number.isFinite(t)) continue;
          const c = cells[d * 24 + Math.floor(t)];
          if (!c) continue;
          const label = k === 'dhuhr' && d === 4 ? 'Jumu’ah' : PRAYERS.find((p) => p[0] === k)[1];
          c.classList.add('pr');
          c.dataset.pr = c.dataset.pr ? c.dataset.pr + ' · ' + label : label;
          c.style.setProperty('--pm', `${Math.round((t % 1) * 100)}%`);
          c.title += ` · ${label} ${fmtTime(t)}`;
        }
      });
    }
    markNow();
  }

  function markNow() {
    const now = new Date();
    const d = (now.getDay() + 6) % 7;
    const i = d * 24 + now.getHours();
    cells.forEach((c, n) => c && c.classList.toggle('now', n === i));
    document.querySelectorAll('.wk-head').forEach((b, n) => b.classList.toggle('today', n === d));
  }
  setInterval(() => { if (cells.length) markNow(); }, 60000);

  /*
   * Auto-fill: turn a week's totals into a believable schedule.
   * Sleep at night, work from 9 on work days, meals at mealtimes,
   * then everything else spread across evenings and weekends.
   */
  function autoFill(w) {
    const r = R[w];
    const v = state[w];
    // whole hours per area, never more than 168 in total
    const raw = state.cats.map((c) => ({ id: c.id, v: Math.max(0, r.areas[c.id].total) }));
    const scale = sum(raw.map((x) => x.v)) > HOURS ? HOURS / sum(raw.map((x) => x.v)) : 1;
    const want = {};
    let pool = [];
    raw.forEach((x) => { const s = x.v * scale; want[x.id] = Math.floor(s); pool.push([s - Math.floor(s), x.id]); });
    let rest = Math.min(HOURS, Math.round(sum(raw.map((x) => x.v * scale)))) - sum(Object.values(want));
    pool.sort((a, b) => b[0] - a[0]).forEach(([, id]) => { if (rest > 0) { want[id]++; rest--; } });

    const g = Array(HOURS).fill(null);
    const free = (d, h) => g[d * 24 + h] === null;
    const put = (id, d, h) => { if (h >= 0 && h < 24 && free(d, h)) { g[d * 24 + h] = id; want[id]--; return true; } return false; };
    const spread = (total, days) => days.map((_, n) => Math.floor(total / days.length) + (n < total % days.length ? 1 : 0));
    const all = [0, 1, 2, 3, 4, 5, 6];

    // Sleep: ends at 7:00 (8:00 at weekends); overflow goes to the late evening.
    const PH = prayerHoursByDay();
    spread(want.sleep, all).forEach((s, d) => {
      const wake = PH ? PH[d][0] : d >= 5 ? 8 : 7;
      for (let n = 0; n < s; n++) {
        const h = wake - 1 - n;
        if (h >= 0) put('sleep', d, h); else put('sleep', d, 24 + h);
      }
    });
    // Work: first N days, starting at 9.
    const wd = Math.round(v.workDays);
    const workDays = all.slice(0, wd);
    if (workDays.length) {
      spread(want.work, workDays).forEach((n, i) => {
        let h = 9;
        while (n > 0 && h < 24) { if (put('work', workDays[i], h)) n--; h++; }
      });
    }
    // Food: breakfast after waking, lunch at noon, dinner at 19:00.
    const mealSlots = [19, 12, 8, 13, 18, 20, 7];
    spread(want.food, all).forEach((n, d) => {
      for (const h of mealSlots) { if (n <= 0) break; if (put('food', d, h)) n--; }
    });
    // Everything else: round-robin through the days, preferring evenings then weekend daytime.
    const prefs = {
      fitness: [7, 18, 17, 10, 11], chores: [10, 11, 14, 15, 18], childcare: [17, 18, 16, 15, 8, 10],
      relationships: [20, 19, 15, 16, 14], entertainment: [21, 22, 20, 15, 16],
    };
    const rest2 = state.cats.filter((c) => !['sleep', 'work', 'food'].includes(c.id))
      .sort((a, b) => (b.id === 'faith') - (a.id === 'faith')); // faith first, at prayer times
    for (const c of rest2) {
      const slots = (prefs[c.id] || [18, 19, 20, 14, 15]).concat([...Array(24).keys()].filter((h) => h >= 8));
      let guard = 0;
      let d = rest2.indexOf(c) % 7;
      while (want[c.id] > 0 && guard < 7 * 40) {
        const s = c.id === 'faith' && PH ? PH[d].concat(slots) : slots;
        for (const h of s) { if (put(c.id, d, h)) break; }
        d = (d + 1) % 7;
        guard++;
      }
    }
    state.grid = g;
    paintCells();
    renderTally();
    save();
  }

  function renderPalette() {
    const p = $('#palette');
    p.innerHTML = '';
    shown().forEach((c, n) => {
      const b = el('button', { class: 'chip', type: 'button', role: 'radio', style: `--c:${c.color}`, 'aria-checked': String(state.brush === c.id) },
        `<span class="sw"></span>${esc(c.name)}${n < 9 ? `<span class="k">${n + 1}</span>` : ''}`);
      b.addEventListener('click', () => setBrush(c.id));
      p.append(b);
    });
    const er = el('button', { class: 'chip eraser', type: 'button', role: 'radio', 'aria-checked': String(state.brush === null) },
      '<span class="sw"></span>Eraser<span class="k">E</span>');
    er.addEventListener('click', () => setBrush(null));
    p.append(er);
  }

  function setBrush(id) { state.brush = id; renderPalette(); save(); }

  function renderTally() {
    if (!$('#tally')) return;
    const counts = {};
    for (const g of state.grid) if (g) counts[g] = (counts[g] || 0) + 1;
    const allocated = sum(Object.values(counts));
    const remaining = HOURS - allocated;
    const T = R[state.target];
    $('#alloc').innerHTML = `
      <div class="box"><div class="v">${allocated}<small> / 168</small></div><div class="l">hours placed</div></div>
      <div class="box"><div class="v">${remaining}<small> h</small></div><div class="l">still free</div></div>
      <div class="meter">${shown().map((c) => (counts[c.id] ? `<span style="width:${(counts[c.id] / HOURS) * 100}%;background:${c.color}"></span>` : '')).join('')}</div>`;
    document.querySelectorAll('#target-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.target === state.target)));
    $('#autofill-label').textContent = `Auto-fill from ${state.target === 'ideal' ? 'my ideal week' : 'my week now'}`;
    const item = (color, name, have, want) => {
      const pct = want > 0 ? Math.min(100, (have / want) * 100) : have > 0 ? 100 : 0;
      const diff = round1(have - want);
      let note = '';
      let cls = '';
      if (diff > 0) { note = `${fmt(diff)} h over`; cls = 'over'; }
      else if (diff < 0) note = `${fmt(-diff)} h to place`;
      else if (want > 0) { note = 'On target'; cls = 'done'; }
      else note = 'No target';
      return `<li style="--c:${color}"><div class="t-top"><span class="sw"></span><span class="n">${name}</span><span class="v">${have}<small> / ${fmt(want)}</small></span></div>
        <div class="t-bar"><span style="width:${pct}%"></span></div><div class="t-note ${cls}">${note}</div></li>`;
    };
    $('#tally').innerHTML = shown().map((c) => item(c.color, esc(c.name), counts[c.id] || 0, T.areas[c.id].total)).join('') +
      item('var(--border-strong)', 'Free time', remaining, Math.max(0, T.free));
  }


  /* ==========================================================
     COMPARE VIEW — you vs. famous high-achievers + leaderboard
     ========================================================== */
  const PEOPLE = (Array.isArray(window.PEOPLE) ? window.PEOPLE : []).filter((p) => p && p.id && p.name && p.hours);
  const AREA_KEYS = [...BUILTIN_IDS, 'free'];

  // Normalised week: hours for every built-in area + free time.
  function personWeek(p) {
    const w = {};
    for (const id of BUILTIN_IDS) w[id] = Math.max(0, num(p.hours[id]));
    w.free = HOURS - sum(BUILTIN_IDS.map((id) => w[id]));
    return w;
  }
  function youWeek(mode) {
    const w = {};
    for (const id of BUILTIN_IDS) w[id] = R[mode].areas[id].total;
    w.free = R[mode].free;
    return w;
  }

  /* Balance score (0–100), deliberately simple and transparent. */
  function balanceScore(w) {
    const night = w.sleep / 7;
    const sleepPts = clamp(25 - 5 * Math.max(0, 7 - night, night - 9), 0, 25);
    const fitPts = 20 * Math.min(1, w.fitness / 2.5);
    const peoplePts = 20 * Math.min(1, w.relationships / 7);
    const freePts = 20 * Math.min(1, Math.max(0, w.free) / 14);
    const workPts = w.work <= 50 ? 15 : Math.max(0, 15 - (w.work - 50) * 0.5);
    return Math.round(sleepPts + fitPts + peoplePts + freePts + workPts);
  }

  const METRICS = {
    balance: { label: 'Balance', unit: '', get: balanceScore,
      desc: 'Score out of 100: 7–9 h of sleep a night, 2.5+ h of exercise, 7+ h with people, 14+ h free and under 50 h of work.' },
    sleep: { label: 'Sleep', unit: ' h', get: (w) => w.sleep, desc: 'Hours of sleep per week.' },
    work: { label: 'Hustle', unit: ' h', get: (w) => w.work, desc: 'Hours of work per week (including commute and getting ready).' },
    fitness: { label: 'Fitness', unit: ' h', get: (w) => w.fitness, desc: 'Hours of exercise and fitness per week.' },
    relationships: { label: 'People', unit: ' h', get: (w) => w.relationships, desc: 'Hours with family, partner and friends per week.' },
    free: { label: 'Free time', unit: ' h', get: (w) => w.free, desc: 'Unplanned hours left in the week.' },
  };

  const FACT = {
    sleep: ['You sleep', ' a week'],
    work: ['You work', ' a week'],
    food: ['You spend', ' on food each week'],
    chores: ['You spend', ' on chores each week'],
    childcare: ['You spend', ' on childcare each week'],
    fitness: ['You exercise', ' a week'],
    entertainment: ['You spend', ' on fun each week'],
    relationships: ['You spend', ' with people each week'],
    free: ['You have', ' of free time a week'],
  };

  const firstName = (p) => p.name.split(' ')[0];
  function initials(name) { return name.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase(); }
  function avatar(p, cls = '') {
    const safe = p.photo && /^(https:\/\/|\.?\/?[\w-]+\/)/.test(p.photo);
    const inner = safe
      ? `<img src="${esc(p.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
      : `<span>${esc(initials(p.name))}</span>`;
    return `<span class="av ${cls}" style="--c:${esc(p.color || '#b9c5d8')}">${inner}</span>`;
  }
  const YOU = { id: 'you', name: 'You', color: 'var(--ide)' };
  const myName = () => (state.profile && state.profile.name.trim()) || 'You';
  function youAvatar(cls = '') {
    const pr = state.profile || {};
    if (pr.photo) return `<span class="av you photo ${cls}"><img src="${pr.photo}" alt="" /></span>`;
    const label = pr.name.trim() ? initials(pr.name.trim()) : 'You';
    return `<span class="av you ${cls}"><span>${esc(label)}</span></span>`;
  }

  function currentPerson() {
    return PEOPLE.find((p) => p.id === state.cmpId) || PEOPLE[0];
  }

  function renderPeople() {
    const root = $('#people');
    if (!root) return;
    root.innerHTML = PEOPLE.map((p) => `
      <button type="button" class="person" role="radio" data-id="${esc(p.id)}" aria-checked="${p.id === (currentPerson() || {}).id}" title="${esc(p.name)}">
        ${avatar(p)}<span class="p-name">${esc(firstName(p))}</span>
      </button>`).join('');
  }

  function renderCompare() {
    if (!$('#fly') || !PEOPLE.length) return;
    const p = currentPerson();
    const me = youWeek(state.cmpMode);
    const them = personWeek(p);
    document.querySelectorAll('#people .person').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.id === p.id)));
    document.querySelectorAll('#vs-mode button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === state.cmpMode)));

    const center = (w, label) => `<div class="vs-center"><b>${fmt(w.free)}</b><span>${label}</span></div>`;
    $('#vs-ring-you').innerHTML = ringSVG(state.cmpMode, 150, 16) + center(me, 'h free') + youAvatar('mini');
    $('#vs-ring-them').innerHTML = ringFrom((id) => them[id] || 0, 150, 16) + center(them, 'h free') + avatar(p, 'mini');
    $('#vs-name').textContent = p.name;
    const yn = document.querySelector('.vs-side.you .vs-name');
    if (yn) yn.textContent = myName();
    $('#vs-role').textContent = p.role || '';

    // Top three differences, in plain words.
    const diffs = AREA_KEYS.map((k) => ({ k, d: me[k] - them[k] })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3);
    $('#facts').innerHTML = diffs.map(({ k, d }) => {
      const [lead, tail] = FACT[k];
      const color = k === 'free' ? 'var(--border-strong)' : cat(k).color;
      if (Math.abs(round1(d)) < 0.5) return `<li style="--c:${color}"><span>You and ${esc(firstName(p))} are about even on ${k === 'free' ? 'free time' : esc(cat(k).name.toLowerCase())}.</span></li>`;
      return `<li style="--c:${color}"><span>${lead} <b>${fmt(Math.abs(d))} h ${d > 0 ? 'more' : 'less'}</b>${tail} than ${esc(firstName(p))}.</span></li>`;
    }).join('');

    // Butterfly chart: you on the left, them on the right.
    const max = Math.max(1, ...AREA_KEYS.map((k) => Math.max(Math.abs(me[k]), Math.abs(them[k]))));
    $('#fly').innerHTML = `<div class="fly-row fly-head"><span>You</span><span></span><span>${esc(firstName(p))}</span></div>` +
      AREA_KEYS.map((k) => {
        const color = k === 'free' ? 'var(--faint)' : cat(k).color;
        const name = k === 'free' ? 'Free time' : cat(k).name;
        const a = Math.max(0, me[k]);
        const b = Math.max(0, them[k]);
        return `<div class="fly-row" style="--c:${color}">
          <div class="fly-bar l"><span class="v">${fmt(me[k])}</span><i style="width:${(a / max) * 100}%"></i></div>
          <div class="fly-label">${esc(name)}</div>
          <div class="fly-bar r"><i style="width:${(b / max) * 100}%"></i><span class="v">${fmt(them[k])}</span></div>
        </div>`;
      }).join('');
    const credit = p.credit
      ? `<span class="credit">Photo: ${p.creditUrl && /^https:\/\//.test(p.creditUrl) ? `<a href="${esc(p.creditUrl)}" target="_blank" rel="noopener">${esc(p.credit)}</a>` : esc(p.credit)}</span>`
      : '';
    $('#vs-note').innerHTML = `${esc(p.note || '')}${credit}`;
    const cl = $('#credits');
    if (cl && !cl.dataset.done) {
      cl.dataset.done = '1';
      cl.innerHTML = PEOPLE.filter((x) => x.photo && x.credit).map((x) =>
        `<li><b>${esc(x.name)}</b>: ${x.creditUrl && /^https:\/\//.test(x.creditUrl) ? `<a href="${esc(x.creditUrl)}" target="_blank" rel="noopener">${esc(x.credit)}</a>` : esc(x.credit)}</li>`).join('');
    }
    renderLeaderboard();
  }

  function renderLeaderboard() {
    const metric = METRICS[state.lbMetric] ? state.lbMetric : 'balance';
    const M = METRICS[metric];
    $('#lb-tabs').innerHTML = Object.entries(METRICS).map(([k, m]) =>
      `<button type="button" role="tab" data-metric="${k}" aria-selected="${k === metric}">${m.label}</button>`).join('');
    $('#lb-desc').textContent = M.desc;
    const rows = PEOPLE.map((p) => ({ p, v: M.get(personWeek(p)), me: false }));
    rows.push({ p: { ...YOU, name: `${myName()} · now`, role: 'My week now' }, v: M.get(youWeek('current')), me: 'current' });
    rows.push({ p: { ...YOU, name: `${myName()} · ideal`, role: 'My ideal week' }, v: M.get(youWeek('ideal')), me: 'ideal' });
    rows.sort((a, b) => b.v - a.v);
    const max = Math.max(1, ...rows.map((r) => r.v));
    $('#lb').innerHTML = rows.map((r, i) => `
      <li class="${r.me ? 'me' : ''}${i < 3 ? ' top top' + (i + 1) : ''}">
        <span class="rank">${i + 1}</span>
        ${r.me ? youAvatar() : avatar(r.p)}
        <span class="who"><b>${esc(r.p.name)}</b><span>${esc(r.p.role || '')}</span></span>
        <span class="lb-bar"><i style="width:${(Math.max(0, r.v) / max) * 100}%"></i></span>
        <span class="score">${fmt(r.v)}<small>${M.unit}</small></span>
      </li>`).join('');

    // Headline: best "you" position.
    const mine = rows.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => r.me).sort((a, b) => a.rank - b.rank)[0];
    const beaten = rows.slice(mine.rank).filter((r) => !r.me).map((r) => firstName(r.p));
    const medal = mine.rank === 1 ? 'gold' : mine.rank === 2 ? 'silver' : mine.rank === 3 ? 'bronze' : '';
    $('#lb-you').innerHTML = `
      <span class="lb-rank ${medal}">#${mine.rank}</span>
      <span>Your ${mine.me === 'ideal' ? '<b>ideal week</b>' : '<b>week now</b>'} ranks <b>#${mine.rank} of ${rows.length}</b> for ${M.label.toLowerCase()}${
        beaten.length ? `, ahead of ${esc(beaten.slice(0, 3).join(', '))}${beaten.length > 3 ? ` and ${beaten.length - 3} more` : ''}.` : '. Room to climb!'}</span>`;
  }


  /* ==========================================================
     SALAH VIEW — a week planned around the five daily prayers
     Prayer times are calculated on-device with standard
     astronomical formulas (sun declination + equation of time).
     ========================================================== */
  const PT_METHODS = {
    MWL: { name: 'Muslim World League', fajr: 18, isha: 17 },
    ISNA: { name: 'ISNA (North America)', fajr: 15, isha: 15 },
    Egypt: { name: 'Egyptian General Authority', fajr: 19.5, isha: 17.5 },
    Makkah: { name: 'Umm al-Qura, Makkah', fajr: 18.5, ishaMin: 90 },
    Karachi: { name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
  };
  const CITIES = [
    ['makkah', 'Makkah', 21.4225, 39.8262, 'Asia/Riyadh', 'Makkah'],
    ['madinah', 'Madinah', 24.4672, 39.6111, 'Asia/Riyadh', 'Makkah'],
    ['riyadh', 'Riyadh', 24.7136, 46.6753, 'Asia/Riyadh', 'Makkah'],
    ['dubai', 'Dubai', 25.2048, 55.2708, 'Asia/Dubai', 'Makkah'],
    ['doha', 'Doha', 25.2854, 51.531, 'Asia/Qatar', 'Makkah'],
    ['istanbul', 'Istanbul', 41.0082, 28.9784, 'Europe/Istanbul', 'MWL'],
    ['cairo', 'Cairo', 30.0444, 31.2357, 'Africa/Cairo', 'Egypt'],
    ['karachi', 'Karachi', 24.8607, 67.0011, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['lahore', 'Lahore', 31.5204, 74.3587, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['islamabad', 'Islamabad', 33.6844, 73.0479, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['dhaka', 'Dhaka', 23.8103, 90.4125, 'Asia/Dhaka', 'Karachi', 'hanafi'],
    ['delhi', 'Delhi', 28.6139, 77.209, 'Asia/Kolkata', 'Karachi', 'hanafi'],
    ['jakarta', 'Jakarta', -6.2088, 106.8456, 'Asia/Jakarta', 'MWL'],
    ['kualalumpur', 'Kuala Lumpur', 3.139, 101.6869, 'Asia/Kuala_Lumpur', 'MWL'],
    ['lagos', 'Lagos', 6.5244, 3.3792, 'Africa/Lagos', 'MWL'],
    ['london', 'London', 51.5074, -0.1278, 'Europe/London', 'MWL'],
    ['paris', 'Paris', 48.8566, 2.3522, 'Europe/Paris', 'MWL'],
    ['newyork', 'New York', 40.7128, -74.006, 'America/New_York', 'ISNA'],
    ['chicago', 'Chicago', 41.8781, -87.6298, 'America/Chicago', 'ISNA'],
    ['toronto', 'Toronto', 43.6532, -79.3832, 'America/Toronto', 'ISNA'],
    ['losangeles', 'Los Angeles', 34.0522, -118.2437, 'America/Los_Angeles', 'ISNA'],
    ['sydney', 'Sydney', -33.8688, 151.2093, 'Australia/Sydney', 'MWL'],
    ['jeddah', 'Jeddah', 21.4858, 39.1925, 'Asia/Riyadh', 'Makkah'],
    ['kuwait', 'Kuwait City', 29.3759, 47.9774, 'Asia/Kuwait', 'Makkah'],
    ['manama', 'Manama', 26.2285, 50.586, 'Asia/Bahrain', 'Makkah'],
    ['muscat', 'Muscat', 23.588, 58.3829, 'Asia/Muscat', 'Makkah'],
    ['abudhabi', 'Abu Dhabi', 24.4539, 54.3773, 'Asia/Dubai', 'Makkah'],
    ['amman', 'Amman', 31.9454, 35.9284, 'Asia/Amman', 'MWL'],
    ['jerusalem', 'Al-Quds (Jerusalem)', 31.7767, 35.2345, 'Asia/Jerusalem', 'MWL'],
    ['beirut', 'Beirut', 33.8938, 35.5018, 'Asia/Beirut', 'MWL'],
    ['damascus', 'Damascus', 33.5138, 36.2765, 'Asia/Damascus', 'MWL'],
    ['baghdad', 'Baghdad', 33.3152, 44.3661, 'Asia/Baghdad', 'MWL'],
    ['tehran', 'Tehran', 35.6892, 51.389, 'Asia/Tehran', 'MWL'],
    ['ankara', 'Ankara', 39.9334, 32.8597, 'Europe/Istanbul', 'MWL'],
    ['alexandria', 'Alexandria', 31.2001, 29.9187, 'Africa/Cairo', 'Egypt'],
    ['casablanca', 'Casablanca', 33.5731, -7.5898, 'Africa/Casablanca', 'MWL'],
    ['algiers', 'Algiers', 36.7538, 3.0588, 'Africa/Algiers', 'MWL'],
    ['tunis', 'Tunis', 36.8065, 10.1815, 'Africa/Tunis', 'MWL'],
    ['khartoum', 'Khartoum', 15.5007, 32.5599, 'Africa/Khartoum', 'Egypt'],
    ['nairobi', 'Nairobi', -1.2921, 36.8219, 'Africa/Nairobi', 'MWL'],
    ['kano', 'Kano', 12.0022, 8.592, 'Africa/Lagos', 'MWL'],
    ['dakar', 'Dakar', 14.7167, -17.4677, 'Africa/Dakar', 'MWL'],
    ['mogadishu', 'Mogadishu', 2.0469, 45.3182, 'Africa/Mogadishu', 'MWL'],
    ['rawalpindi', 'Rawalpindi', 33.5651, 73.0169, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['faisalabad', 'Faisalabad', 31.418, 73.0791, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['peshawar', 'Peshawar', 34.0151, 71.5249, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['multan', 'Multan', 30.1575, 71.5249, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['quetta', 'Quetta', 30.1798, 66.975, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['hyderabadpk', 'Hyderabad (PK)', 25.396, 68.3578, 'Asia/Karachi', 'Karachi', 'hanafi'],
    ['kabul', 'Kabul', 34.5553, 69.2075, 'Asia/Kabul', 'Karachi', 'hanafi'],
    ['mumbai', 'Mumbai', 19.076, 72.8777, 'Asia/Kolkata', 'Karachi', 'hanafi'],
    ['hyderabadin', 'Hyderabad (IN)', 17.385, 78.4867, 'Asia/Kolkata', 'Karachi', 'hanafi'],
    ['chittagong', 'Chittagong', 22.3569, 91.7832, 'Asia/Dhaka', 'Karachi', 'hanafi'],
    ['tashkent', 'Tashkent', 41.2995, 69.2401, 'Asia/Tashkent', 'MWL', 'hanafi'],
    ['baku', 'Baku', 40.4093, 49.8671, 'Asia/Baku', 'MWL'],
    ['almaty', 'Almaty', 43.222, 76.8512, 'Asia/Almaty', 'MWL', 'hanafi'],
    ['surabaya', 'Surabaya', -7.2575, 112.7521, 'Asia/Jakarta', 'MWL'],
    ['singapore', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore', 'MWL'],
    ['manchester', 'Manchester', 53.4808, -2.2426, 'Europe/London', 'MWL'],
    ['birmingham', 'Birmingham', 52.4862, -1.8904, 'Europe/London', 'MWL'],
    ['berlin', 'Berlin', 52.52, 13.405, 'Europe/Berlin', 'MWL'],
    ['amsterdam', 'Amsterdam', 52.3676, 4.9041, 'Europe/Amsterdam', 'MWL'],
    ['brussels', 'Brussels', 50.8503, 4.3517, 'Europe/Brussels', 'MWL'],
    ['stockholm', 'Stockholm', 59.3293, 18.0686, 'Europe/Stockholm', 'MWL'],
    ['moscow', 'Moscow', 55.7558, 37.6173, 'Europe/Moscow', 'MWL'],
    ['houston', 'Houston', 29.7604, -95.3698, 'America/Chicago', 'ISNA'],
    ['dearborn', 'Dearborn', 42.3223, -83.1763, 'America/Detroit', 'ISNA'],
    ['washington', 'Washington, DC', 38.9072, -77.0369, 'America/New_York', 'ISNA'],
    ['vancouver', 'Vancouver', 49.2827, -123.1207, 'America/Vancouver', 'ISNA'],
    ['melbourne', 'Melbourne', -37.8136, 144.9631, 'Australia/Melbourne', 'MWL'],
    ['johannesburg', 'Johannesburg', -26.2041, 28.0473, 'Africa/Johannesburg', 'MWL'],
    ['capetown', 'Cape Town', -33.9249, 18.4241, 'Africa/Johannesburg', 'MWL'],
  ];
  CITIES.sort((a, b) => a[1].localeCompare(b[1]));
  const PRAYERS = [['fajr', 'Fajr'], ['sunrise', 'Sunrise'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']];
  const FARD = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  const FAITH_INPUTS = [
    { k: 'prayers', pre: 'I pray', post: 'times a day.', unit: '×', max: 5, smax: 5, step: 1 },
    { k: 'prayerMins', pre: 'Each prayer, including wudu, takes about', post: 'minutes.', unit: 'min', max: 120, smax: 45, step: 1 },
    { k: 'quranMins', pre: 'Each day I read Quran for', post: 'minutes.', unit: 'min', max: 600, smax: 90, step: 5 },
    { k: 'dhikrMins', pre: 'Each day I do dhikr and du’a for', post: 'minutes.', unit: 'min', max: 600, smax: 60, step: 5 },
    { k: 'jumuahMins', pre: 'Jumu’ah, with travel, takes', post: 'minutes.', unit: 'min', max: 300, smax: 150, step: 5 },
    { k: 'learnHours', pre: 'Each week I spend', post: 'hours learning about Islam.', unit: 'h', max: 40, smax: 10, step: 0.5 },
    { k: 'tahajjudNights', pre: 'I pray Tahajjud', post: 'nights a week.', unit: '×', max: 7, smax: 7, step: 1 },
    { k: 'tahajjudMins', pre: 'Tahajjud takes about', post: 'minutes.', unit: 'min', max: 180, smax: 60, step: 5 },
  ];
  const FAITH_STORY = 'I pray {prayers} a day, about {prayerMins} each including wudu. I read Quran for {quranMins} and do dhikr for {dhikrMins} daily. Jumu’ah takes {jumuahMins} with travel. I learn about Islam {learnHours} a week, and pray Tahajjud {tahajjudNights} a week for {tahajjudMins}.';
  const FAITH_NOW = { prayers: 5, prayerMins: 10, quranMins: 5, dhikrMins: 5, jumuahMins: 60, learnHours: 0, tahajjudNights: 0, tahajjudMins: 0 };
  const FAITH_IDEAL = { prayers: 5, prayerMins: 15, quranMins: 20, dhikrMins: 10, jumuahMins: 90, learnHours: 2, tahajjudNights: 2, tahajjudMins: 20 };
  const FAITH_COLOR = '#dcc488';

  // Weekly faith hours. On Fridays Jumu'ah replaces Dhuhr, so one prayer slot is not double-counted.
  function faithHours(f) {
    const slots = f.prayers * 7 - (f.jumuahMins > 0 && f.prayers >= 2 ? 1 : 0);
    return (slots * f.prayerMins + (f.quranMins + f.dhikrMins) * 7 + f.jumuahMins + f.tahajjudNights * f.tahajjudMins) / 60 + f.learnHours;
  }

  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  const dsin = (d) => Math.sin(rad(d));
  const dcos = (d) => Math.cos(rad(d));
  const dtan = (d) => Math.tan(rad(d));
  const fixA = (a) => ((a % 360) + 360) % 360;
  const fixH = (h) => ((h % 24) + 24) % 24;

  function sunPos(jd) {
    const D = jd - 2451545.0;
    const g = fixA(357.529 + 0.98560028 * D);
    const q = fixA(280.459 + 0.98564736 * D);
    const L = fixA(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = fixH(deg(Math.atan2(dcos(e) * dsin(L), dcos(L))) / 15);
    return { decl: deg(Math.asin(dsin(e) * dsin(L))), eqt: q / 15 - RA };
  }
  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  // Time-zone offset (hours) of an IANA zone on a given date.
  function tzOffset(zone, date) {
    try {
      const f = new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
      const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
      const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
      return Math.round((asUTC - date.getTime()) / 60000) / 60;
    } catch (e) {
      return -date.getTimezoneOffset() / 60;
    }
  }
  // "Now" as a date + fractional hour in the chosen zone.
  function zonedNow(zone) {
    const now = new Date();
    const off = tzOffset(zone, now);
    const z = new Date(now.getTime() + off * 3600000);
    return { y: z.getUTCFullYear(), m: z.getUTCMonth() + 1, d: z.getUTCDate(), h: z.getUTCHours() + z.getUTCMinutes() / 60 + z.getUTCSeconds() / 3600, dow: (z.getUTCDay() + 6) % 7 };
  }

  function prayerTimes(y, m, d, cfg) {
    const { lat, lng, zone } = cfg;
    const M = PT_METHODS[cfg.method] || PT_METHODS.MWL;
    const tz = tzOffset(zone, new Date(Date.UTC(y, m - 1, d, 12)));
    const jd = julian(y, m, d) - lng / (15 * 24);
    const mid = (t) => fixH(12 - sunPos(jd + t).eqt);
    const hourAngle = (angle, t, before) => {
      const dec = sunPos(jd + t).decl;
      const v = (-dsin(angle) - dsin(dec) * dsin(lat)) / (dcos(dec) * dcos(lat));
      const a = deg(Math.acos(Math.max(-1, Math.min(1, v)))) / 15;
      const res = mid(t) + (before ? -a : a);
      return Math.abs(v) > 1 ? NaN : res;
    };
    const asrAngle = (t) => {
      const dec = sunPos(jd + t).decl;
      const factor = cfg.asr === 'hanafi' ? 2 : 1;
      return -deg(Math.atan(1 / (factor + dtan(Math.abs(lat - dec)))));
    };
    const t0 = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
    const T = {};
    T.fajr = hourAngle(M.fajr, t0.fajr / 24, true);
    T.sunrise = hourAngle(0.833, t0.sunrise / 24, true);
    T.dhuhr = mid(t0.dhuhr / 24);
    T.asr = hourAngle(asrAngle(t0.asr / 24), t0.asr / 24, false);
    T.maghrib = hourAngle(0.833, t0.maghrib / 24, false);
    T.isha = M.ishaMin ? T.maghrib + M.ishaMin / 60 : hourAngle(M.isha, t0.isha / 24, false);
    // High latitudes: fall back to a portion of the night (angle-based rule).
    const night = fixH(T.sunrise - T.maghrib);
    const fp = (M.fajr / 60) * night;
    if (isNaN(T.fajr) || fixH(T.sunrise - T.fajr) > fp) T.fajr = T.sunrise - fp;
    if (!M.ishaMin) {
      const ip = (M.isha / 60) * night;
      if (isNaN(T.isha) || fixH(T.isha - T.maghrib) > ip) T.isha = T.maghrib + ip;
    }
    const adj = tz - lng / 15;
    for (const k in T) T[k] = fixH(T[k] + adj);
    return T;
  }

  function fmtTime(h) {
    if (!Number.isFinite(h)) return '—';
    let mins = Math.round(h * 60) % 1440;
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    const ap = hh < 12 ? 'AM' : 'PM';
    return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`;
  }
  // Same, with the AM/PM in a span so small screens can hide it.
  const fmtTimeH = (h) => fmtTime(h).replace(/ (AM|PM)$/, '<span class="ap"> $1</span>');
  function fmtDur(h) {
    const m = Math.max(0, Math.round(h * 60));
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  }

  // This week's (Mon–Sun) prayer times in the chosen place.
  // Prayer times with the user's per-prayer minute adjustments applied.
  function timesFor(y, m, d) {
    const s = state.salah;
    const T = prayerTimes(y, m, d, s);
    const adj = s.adj || {};
    for (const k in T) if (adj[k]) T[k] = fixH(T[k] + adj[k] / 60);
    return T;
  }
  function weekTimes() {
    const s = state.salah;
    const n = zonedNow(s.zone);
    const base = Date.UTC(n.y, n.m - 1, n.d) - n.dow * 86400000;
    return DAYS.map((_, i) => {
      const dt = new Date(base + i * 86400000);
      return { date: dt, times: timesFor(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()) };
    });
  }
  function prayerHoursByDay() {
    if (!state.salah.markers) return null;
    return weekTimes().map((w) => FARD.map((k) => Math.floor(w.times[k])));
  }

  function syncFaith() {
    const s = state.salah;
    let c = state.cats.find((x) => x.id === 'faith');
    if (s.sync) {
      if (!c) {
        c = { id: 'faith', builtin: false, linked: 'salah', name: 'Faith & prayer', color: FAITH_COLOR, current: 0, ideal: 0 };
        state.cats.push(c);
        renderCards();
        renderSalahCard();
        renderPalette();
      }
      c.linked = 'salah';
      c.current = round1(faithHours(s.current) * 100) / 100;
      c.ideal = round1(faithHours(s.ideal) * 100) / 100;
    } else if (c && c.linked === 'salah') {
      state.cats = state.cats.filter((x) => x !== c);
      state.grid = state.grid.map((g) => (g === 'faith' ? null : g));
      if (state.brush === 'faith') state.brush = 'sleep';
      renderCards();
      renderSalahCard();
      renderPalette();
      paintCells();
    }
  }

  function renderSalahControls() {
    const s = state.salah;
    const sel = $('#salah-city');
    if (!sel) return;
    if (!sel.options.length) {
      sel.innerHTML = CITIES.map((c) => `<option value="${c[0]}">${esc(c[1])}</option>`).join('') + '<option value="custom">My location</option>';
      $('#salah-method').innerHTML = Object.entries(PT_METHODS).map(([k, m]) => `<option value="${k}">${esc(m.name)}</option>`).join('');
    }
    if (s.place === 'custom' && !sel.querySelector('option[value="custom"]')) sel.insertAdjacentHTML('beforeend', '<option value="custom">My location</option>');
    sel.value = s.place;
    $('#salah-method').value = s.method;
    $('#salah-asr').value = s.asr;
    $('#salah-sync').checked = s.sync;
    $('#salah-markers').checked = s.markers;
    const adjBox = $('#salah-adj');
    if (adjBox) {
      adjBox.innerHTML = PRAYERS.map(([k, l]) => {
        const v = (s.adj && s.adj[k]) || 0;
        return `<div class="adj"><span>${l}</span><button type="button" data-adj="${k}" data-d="-1" aria-label="${l} one minute earlier">−</button><b class="${v ? 'on' : ''}">${v > 0 ? '+' : ''}${v} min</b><button type="button" data-adj="${k}" data-d="1" aria-label="${l} one minute later">+</button></div>`;
      }).join('');
      const any = PRAYERS.some(([k]) => s.adj && s.adj[k]);
      const sum = $('#salah-adj-sum');
      if (sum) sum.textContent = any ? 'Adjusted' : '';
    }
    const la = $('#salah-lat');
    if (la && document.activeElement !== la && document.activeElement !== $('#salah-lng')) { la.value = s.lat; $('#salah-lng').value = s.lng; }
    document.querySelectorAll('#faith-mode button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === state.mode)));
  }

  function renderSalahCard() {
    const root = $('#faith-card');
    if (!root) return;
    root.style.setProperty('--c', FAITH_COLOR);
    root.innerHTML = `
      <header class="story-head">
        <span class="story-icon">${icon('crescent')}</span>
        <h3>Faith & prayer</h3>
        <div class="story-total"><span class="t-num" id="faith-total"></span><span class="t-delta" id="faith-delta"></span></div>
      </header>`;
    const p = el('p', { class: 'story-text' });
    for (const part of FAITH_STORY.split(/(\{\w+\})/)) {
      const m = part.match(/^\{(\w+)\}$/);
      if (m) p.append(makeChip({ ...FAITH_INPUTS.find((x) => x.k === m[1]), faith: true, section: 'faith' }));
      else if (part) p.append(document.createTextNode(part));
    }
    root.append(p);
    refreshChips();
  }

  function renderSalah() {
    if (!$('#view-salah')) return;
    const s = state.salah;
    const week = weekTimes();
    const n = zonedNow(s.zone);
    const today = week[n.dow].times;
    // next prayer
    let next = null;
    for (const k of FARD) if (today[k] > n.h) { next = { k, t: today[k], wait: today[k] - n.h }; break; }
    if (!next) {
      const tmr = (week[n.dow + 1] || { times: timesFor(n.y, n.m, n.d + 1) }).times;
      next = { k: 'fajr', t: tmr.fajr, wait: 24 - n.h + tmr.fajr };
    }
    const name = (k) => (k === 'dhuhr' && n.dow === 4 && next.k === 'dhuhr' ? 'Jumu’ah' : PRAYERS.find((p) => p[0] === k)[1]);
    const place = placeLabel();
    let hijri = '';
    try { hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric', timeZone: s.zone }).format(new Date()); } catch (e) { /* calendar unsupported */ }
    $('#next-prayer').innerHTML = `
      <div class="np-label">Next prayer ${s.place === 'custom' ? '' : 'in '}${esc(place)}${hijri ? ` <span class="np-hijri">· ${esc(hijri)}</span>` : ''}</div>
      <div class="np-name">${name(next.k)}</div>
      <div class="np-time">${fmtTime(next.t)} <span>· in ${fmtDur(next.wait)}</span></div>
      <ol class="np-day">${PRAYERS.map(([k, label]) => `<li class="${k === next.k ? 'on' : ''}${k === 'sunrise' ? ' sr' : ''}${today[k] < n.h && k !== next.k ? ' past' : ''}"><span>${k === 'dhuhr' && n.dow === 4 ? 'Jumu’ah' : label}</span><b>${fmtTime(today[k])}</b></li>`).join('')}</ol>`;
    // week table
    const head = `<tr><th></th>${PRAYERS.map(([k, l]) => `<th class="${k === 'sunrise' ? 'sr' : ''}">${l}</th>`).join('')}</tr>`;
    const rows = week.map((w, i) => `<tr class="${i === n.dow ? 'today' : ''}"><th>${DAYS[i]} <span>${w.date.getUTCDate()}</span></th>${PRAYERS.map(([k]) => `<td class="${k === 'sunrise' ? 'sr' : ''}">${i === 4 && k === 'dhuhr' ? '<i>J</i> ' : ''}${fmtTimeH(w.times[k])}</td>`).join('')}</tr>`).join('');
    $('#prayer-week').innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;
    $('#salah-meta').textContent = `${s.place === 'custom' ? fmtCoord(s.lat, s.lng) + ' · ' : ''}${PT_METHODS[s.method].name} · Asr ${s.asr === 'hanafi' ? 'Hanafi' : 'standard (Shafi‘i, Maliki, Hanbali)'} · times in ${s.zone.replace(/_/g, ' ')}`;
    // faith totals
    const w = state.mode;
    const t = faithHours(s[w]);
    const tn = $('#faith-total');
    if (tn) tn.innerHTML = `${fmt(t)}<small> h/wk</small>`;
    const td = $('#faith-delta');
    if (td) { const diff = t - faithHours(s.current); td.textContent = w === 'ideal' && round1(diff) !== 0 ? `${fmtDelta(diff)} vs now` : ''; }
    $('#faith-summary').innerHTML = `That’s <b>${fmt(t)} hours</b> a week, about <b>${Math.round((t / 7) * 60)} minutes</b> a day, or <b>${fmt((t / HOURS) * 100)}%</b> of your 168 hours.`;
    renderSalahControls();
  }

  function setPlace(id) {
    const c = CITIES.find((x) => x[0] === id);
    if (!c) return;
    Object.assign(state.salah, { place: c[0], lat: c[2], lng: c[3], zone: c[4], method: c[5], asr: c[6] || 'standard' });
    renderSalah();
    paintCells();
    save();
  }

  // Distance in km between two coordinates.
  function km(a1, o1, a2, o2) {
    const dA = rad(a2 - a1);
    const dO = rad(o2 - o1);
    const h = Math.sin(dA / 2) ** 2 + Math.cos(rad(a1)) * Math.cos(rad(a2)) * Math.sin(dO / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function nearestCity(lat, lng) {
    let best = null;
    for (const c of CITIES) { const d = km(lat, lng, c[2], c[3]); if (!best || d < best.d) best = { c, d }; }
    return best;
  }
  const fmtCoord = (lat, lng) => `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(3)}°${lng >= 0 ? 'E' : 'W'}`;
  function placeLabel() {
    const s = state.salah;
    if (s.place !== 'custom') return (CITIES.find((c) => c[0] === s.place) || [, 'Makkah'])[1];
    const n = nearestCity(s.lat, s.lng);
    return n && n.d < 60 ? `near ${n.c[1]}` : fmtCoord(s.lat, s.lng);
  }
  function setCustomPlace(lat, lng, how) {
    const n = nearestCity(lat, lng);
    Object.assign(state.salah, {
      place: 'custom',
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      // GPS: you are there, so your device's time zone is right. Typed coordinates:
      // use the time zone of the nearest known city (within ~600 km).
      zone: how === 'manual' && n && n.d < 600 ? n.c[4] : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    // Suggest the usual method for the region, the first time only.
    if (n && n.d < 400) { state.salah.method = n.c[5]; state.salah.asr = n.c[6] || state.salah.asr; }
    renderSalah();
    paintCells();
    save();
  }
  function useMyLocation() {
    const sel = $('#salah-city');
    const revert = () => { if (sel) sel.value = state.salah.place; };
    if (!window.isSecureContext) { toast('Location needs a secure (https) page. Pick a city instead.'); revert(); return; }
    if (!navigator.geolocation) { toast('Location isn’t available in this browser. Pick a city instead.'); revert(); return; }
    const btn = $('#salah-locate');
    if (btn) { btn.disabled = true; btn.classList.add('busy'); }
    const done = () => { if (btn) { btn.disabled = false; btn.classList.remove('busy'); } };
    toast('Finding your location…');
    const ok = (pos) => {
      done();
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      setCustomPlace(lat, lng, 'gps');
      const near = nearestCity(lat, lng);
      toast(`Location set: ${near && near.d < 60 ? `near ${near.c[1]}` : fmtCoord(lat, lng)}${accuracy ? ` (±${accuracy < 1000 ? Math.round(accuracy) + ' m' : Math.round(accuracy / 1000) + ' km'})` : ''}`);
    };
    const fail = (err, triedPrecise) => {
      if (err && err.code === 3 && triedPrecise) { // timed out: retry with a quicker, coarse fix
        navigator.geolocation.getCurrentPosition(ok, (e2) => fail(e2, false), { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 });
        return;
      }
      done();
      revert();
      const msg = err && err.code === 1
        ? 'Location is blocked for this site. Allow it in your browser’s site settings, or pick a city / enter coordinates.'
        : err && err.code === 3 ? 'Finding your location took too long. Try again outdoors, or pick a city.' : 'Couldn’t get your location. Pick a city or enter coordinates.';
      toast(msg);
    };
    navigator.geolocation.getCurrentPosition(ok, (e) => fail(e, true), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  function loadIdealMuslimWeek() {
    const snap = JSON.stringify({ salah: state.salah, ideal: state.ideal });
    state.salah.ideal = { ...FAITH_IDEAL };
    state.salah.sync = true;
    state.ideal.sleepHours = Math.max(7, state.ideal.sleepHours || 0);
    state.ideal.windDown = 15;
    setMode('ideal');
    renderAll();
    toast('Loaded an ideal Muslim week', 'Undo', () => {
      const o = JSON.parse(snap);
      state.salah = o.salah;
      state.ideal = o.ideal;
      renderAll();
    });
  }

  function buildPrayerSchedule() {
    const snap = state.grid.slice();
    state.salah.sync = true;
    state.salah.markers = true;
    state.target = 'ideal';
    recalc();
    autoFill('ideal');
    setView('grid');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Built around your prayers. Paint to fine-tune.', 'Undo', () => { state.grid = snap; paintCells(); renderTally(); save(); });
  }


  /* ==========================================================
     PROFILE — name + photo, stored only in this browser
     ========================================================== */
  function greeting() {
    const h = new Date().getHours();
    return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }
  function renderProfile() {
    const pr = state.profile;
    const btn = $('#btn-profile');
    if (btn) {
      btn.innerHTML = youAvatar('tiny');
      btn.title = pr.name.trim() ? `${pr.name.trim()} · your profile` : 'Set up your profile';
    }
    const hello = $('#hello');
    if (hello) hello.textContent = pr.name.trim() ? `${greeting()}, ${pr.name.trim().split(/\s+/)[0]}. Your week is a budget of time` : 'Your week is a budget of time';
    const av = $('#pf-av');
    if (av) av.innerHTML = youAvatar('big');
    const rm = $('#pf-remove');
    if (rm) rm.hidden = !pr.photo;
  }
  function openProfile() {
    $('#pf-name').value = state.profile.name;
    renderProfile();
    const d = $('#dlg-profile');
    if (!d.open) d.showModal();
    if (!state.profile.name) setTimeout(() => $('#pf-name').focus(), 50);
  }
  // Read an image file, centre-crop it to a square and shrink it to 256 px JPEG.
  function processPhoto(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Please choose an image file'); return; }
    if (file.size > 15 * 1024 * 1024) { toast('That image is too large (max 15 MB)'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - s) / 2;
      const sy = Math.max(0, (img.naturalHeight - s) * 0.3); // portraits: favour the top (faces)
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      let data = cv.toDataURL('image/jpeg', 0.85);
      if (data.length > 380000) data = cv.toDataURL('image/jpeg', 0.6);
      state.profile.photo = data;
      renderProfile();
      renderCompare();
      renderReceipt();
      save();
      toast('Photo saved on this device');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Couldn’t read that image'); };
    img.src = url;
  }

  /* ---------- Views & theme ---------- */
  function setView(v) {
    state.view = v;
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === v)));
    $('#view-calc').hidden = v !== 'calc';
    $('#view-compare').hidden = v !== 'compare';
    $('#view-grid').hidden = v !== 'grid';
    if ($('#view-salah')) $('#view-salah').hidden = v !== 'salah';
    document.body.dataset.view = v;
    closePop();
    save();
  }
  function effectiveTheme() {
    if (state.theme) return state.theme;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme() {
    if (state.theme) document.documentElement.dataset.theme = state.theme;
    else delete document.documentElement.dataset.theme;
  }


  /* ---------- Remove / restore areas (with undo) ---------- */
  function removeArea(id) {
    const c = cat(id);
    if (!c) return;
    const snap = JSON.stringify({ cats: state.cats, hidden: state.hidden, grid: state.grid, sync: state.salah.sync, brush: state.brush });
    if (c.builtin) {
      if (!state.hidden.includes(id)) state.hidden.push(id);
    } else if (c.linked === 'salah') {
      state.salah.sync = false; // syncFaith() removes the area
    } else {
      state.cats = state.cats.filter((x) => x !== c);
    }
    state.grid = state.grid.map((g) => (g === id ? null : g));
    if (state.brush === id) state.brush = (shown()[0] || {}).id || null;
    closePop();
    renderAll(false);
    if ($('#dlg-categories').open) renderCatList();
    toast(`Removed ${c.name}`, 'Undo', () => {
      const o = JSON.parse(snap);
      state.cats = o.cats; state.hidden = o.hidden; state.grid = o.grid; state.salah.sync = o.sync; state.brush = o.brush;
      renderAll(false);
      if ($('#dlg-categories').open) renderCatList();
    });
  }
  function restoreArea(id) {
    state.hidden = state.hidden.filter((x) => x !== id);
    renderAll(false);
    if ($('#dlg-categories').open) renderCatList();
    toast(`${cat(id).name} is back`);
  }

  /* ---------- Categories dialog ---------- */
  function addCategory() {
    const used = new Set(state.cats.map((c) => c.color));
    const color = CUSTOM_COLORS.find((c) => !used.has(c)) || CUSTOM_COLORS[customs().length % CUSTOM_COLORS.length];
    state.cats.push({ id: uid(), builtin: false, name: 'New area', color, current: 0, ideal: 0 });
    renderAll();
  }
  function renderCatList(focusLast = false) {
    const ul = $('#cat-list');
    ul.innerHTML = '';
    for (const c of state.cats) {
      const li = el('li');
      const col = el('input', { type: 'color', value: c.color, 'aria-label': `${c.name} colour` });
      col.addEventListener('input', () => { c.color = col.value; renderAll(false); });
      const name = el('input', { type: 'text', value: c.name, maxlength: '40', 'aria-label': 'Category name' });
      name.addEventListener('input', () => { c.name = name.value || (c.builtin ? BUILTINS.find((b) => b.id === c.id).name : 'Untitled'); renderAll(false); });
      li.append(col, name);
      if (c.builtin) {
        const hid = isHidden(c.id);
        const tg = el('button', { class: 'btn small ghost vis', type: 'button', title: hid ? 'Show this area again' : 'Remove this area (your numbers are kept)' }, hid ? 'Show' : 'Hide');
        tg.addEventListener('click', () => (hid ? restoreArea(c.id) : removeArea(c.id)));
        if (hid) li.classList.add('is-hidden');
        li.append(tg);
      } else {
        const del = el('button', { class: 'btn icon', type: 'button', 'aria-label': `Delete ${c.name}`, title: 'Delete' },
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6m4-6v6M6 7l1 12h10l1-12M9 7V4h6v3"/></svg>');
        del.addEventListener('click', () => removeArea(c.id));
        li.append(del);
      }
      ul.append(li);
    }
    if (focusLast) {
      const inputs = ul.querySelectorAll('input[type="text"]');
      const last = inputs[inputs.length - 1];
      if (last) { last.focus(); last.select(); }
    }
  }
  function openCategories() {
    renderCatList();
    const d = $('#dlg-categories');
    if (!d.open) d.showModal();
  }

  /* ---------- Export / import ---------- */
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);

  function toCSV() {
    const q = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const line = (...xs) => xs.map(q).join(',');
    const n = (x) => round1(x);
    const out = [line('168 Hours Planner export', stamp()), '', line('SUMMARY'), line('Life area', 'Current week (h)', 'Ideal week (h)', 'Ideal vs current (h)')];
    for (const c of state.cats) {
      const a = R.current.areas[c.id].total;
      const b = R.ideal.areas[c.id].total;
      out.push(line(c.name, n(a), n(b), n(b - a)));
    }
    out.push(line('Free Time', n(R.current.free), n(R.ideal.free), n(R.ideal.free - R.current.free)));
    out.push(line('Total Non-Free Time', n(R.current.used), n(R.ideal.used), n(R.ideal.used - R.current.used)));
    out.push('', line('', 'Current weekly', 'Current monthly', 'Current annually', 'Ideal weekly', 'Ideal monthly', 'Ideal annually'));
    out.push(line('Hours used', n(R.current.used), n(R.current.monthly.used), n(R.current.annual.used), n(R.ideal.used), n(R.ideal.monthly.used), n(R.ideal.annual.used)));
    out.push(line('Hours free', n(R.current.free), n(R.current.monthly.free), n(R.current.annual.free), n(R.ideal.free), n(R.ideal.monthly.free), n(R.ideal.annual.free)));
    out.push('', line('ANSWERS'), line('Life area', 'Question', 'Unit', 'Current', 'Ideal'));
    for (const id of BUILTIN_IDS) {
      for (const inp of SECTIONS[id].inputs) out.push(line(cat(id).name, `${inp.pre} … ${inp.post}`, inp.unit, state.current[inp.k], state.ideal[inp.k]));
    }
    for (const c of customs()) out.push(line(c.name, 'Hours per week', 'h', num(c.current), num(c.ideal)));
    out.push('', line('WEEK SCHEDULE'), line('Hour', ...DAYS));
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, '0')}:00–${String((h + 1) % 24).padStart(2, '0')}:00`;
      out.push(line(label, ...DAYS.map((_, d) => { const g = state.grid[d * 24 + h]; return g ? cat(g).name : ''; })));
    }
    return '﻿' + out.join('\r\n');
  }
  function toJSON() {
    const { theme, view, ...data } = state;
    return JSON.stringify({ app: '168-hours-planner', exported: new Date().toISOString(), ...data, results: {
      current: { used: round1(R.current.used), free: round1(R.current.free) },
      ideal: { used: round1(R.ideal.used), free: round1(R.ideal.free) },
    } }, null, 2);
  }
  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result);
        if (!raw || typeof raw !== 'object' || (!raw.current && !raw.ideal && !raw.grid)) throw new Error('bad');
        state = sanitize({ ...raw, theme: state.theme, view: state.view });
        renderAll();
        save();
        toast('Plan imported');
      } catch (e) {
        toast('That file isn’t a valid 168 Hours export');
      }
    };
    reader.readAsText(file);
  }

  let toastTimer;
  function toast(msg, actionLabel, action) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>`;
    if (actionLabel) {
      const b = el('button', { type: 'button' }, esc(actionLabel));
      b.addEventListener('click', () => { action(); t.classList.remove('show'); });
      t.append(b);
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), actionLabel ? 5000 : 2200);
  }

  /* ---------- Wiring ---------- */
  function renderAll(rebuildCatList = true) {
    renderProfile();
    renderPeople();
    renderCards();
    renderSalahCard();
    renderPalette();
    paintCells();
    renderMode();
    recalc();
    if (rebuildCatList && $('#dlg-categories').open) renderCatList(true);
  }

  function init() {
    applyTheme();
    buildWeek();
    renderAll();
    setView(state.view);

    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));
    on('#go-schedule', 'click', () => { setView('grid'); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    on('#mode-seg', 'click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
    on('#copy-now', 'click', () => applyPreset('copy'));
    on('#presets', 'click', (e) => { const b = e.target.closest('[data-preset]'); if (b) applyPreset(b.dataset.preset); });
    on('#people', 'click', (e) => {
      const b = e.target.closest('.person');
      if (!b) return;
      state.cmpId = b.dataset.id;
      renderCompare();
      save();
    });
    on('#vs-mode', 'click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      state.cmpMode = b.dataset.mode;
      renderCompare();
      save();
    });
    on('#lb-tabs', 'click', (e) => {
      const b = e.target.closest('[data-metric]');
      if (!b) return;
      state.lbMetric = b.dataset.metric;
      renderLeaderboard();
      save();
    });
    on('#cards', 'click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { removeArea(del.dataset.del); return; }
      const rs = e.target.closest('[data-restore]');
      if (rs) restoreArea(rs.dataset.restore);
    });
    on('#btn-profile', 'click', openProfile);
    on('#pf-upload', 'click', () => $('#pf-file').click());
    on('#pf-file', 'change', (e) => { processPhoto(e.target.files[0]); e.target.value = ''; });
    on('#pf-remove', 'click', () => { state.profile.photo = ''; renderProfile(); renderCompare(); save(); toast('Photo removed'); });
    on('#pf-name', 'input', (e) => { state.profile.name = e.target.value.slice(0, 40); renderProfile(); renderCompare(); renderReceipt(); save(); });
    on('#profile-form', 'submit', () => { state.profile.name = state.profile.name.trim(); renderProfile(); save(); });
    on('#pf-drop', 'dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag'); });
    on('#pf-drop', 'dragleave', (e) => e.currentTarget.classList.remove('drag'));
    on('#pf-drop', 'drop', (e) => { e.preventDefault(); e.currentTarget.classList.remove('drag'); processPhoto(e.dataTransfer.files[0]); });
    on('#salah-city', 'change', (e) => { if (e.target.value === 'custom') useMyLocation(); else setPlace(e.target.value); });
    on('#salah-locate', 'click', useMyLocation);
    on('#salah-adj', 'click', (e) => {
      const b = e.target.closest('[data-adj]');
      if (!b) return;
      const k = b.dataset.adj;
      state.salah.adj[k] = clamp((state.salah.adj[k] || 0) + +b.dataset.d, -60, 60);
      renderSalah();
      paintCells();
      save();
    });
    on('#salah-adj-reset', 'click', () => { for (const k in state.salah.adj) state.salah.adj[k] = 0; renderSalah(); paintCells(); save(); });
    on('#salah-coords', 'submit', (e) => {
      e.preventDefault();
      const lat = parseFloat(String($('#salah-lat').value).replace(',', '.'));
      const lng = parseFloat(String($('#salah-lng').value).replace(',', '.'));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        toast('Enter a latitude (−90 to 90) and longitude (−180 to 180)');
        return;
      }
      setCustomPlace(lat, lng, 'manual');
      toast(`Location set: ${placeLabel()}`);
    });
    on('#btn-scrollmode', 'click', (e) => {
      const on2 = document.body.classList.toggle('grid-scroll');
      e.currentTarget.setAttribute('aria-pressed', String(on2));
      e.currentTarget.querySelector('span').textContent = on2 ? 'Scrolling' : 'Painting';
      toast(on2 ? 'Scroll mode: swipe to move around. Tap again to paint.' : 'Paint mode: drag to paint hours.');
    });
    on('#salah-method', 'change', (e) => { state.salah.method = e.target.value; renderSalah(); paintCells(); save(); });
    on('#salah-asr', 'change', (e) => { state.salah.asr = e.target.value; renderSalah(); paintCells(); save(); });
    on('#salah-sync', 'change', (e) => { state.salah.sync = e.target.checked; recalc(); renderTally(); });
    on('#salah-markers', 'change', (e) => { state.salah.markers = e.target.checked; paintCells(); save(); });
    on('#faith-mode', 'click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
    on('#btn-muslim-week', 'click', loadIdealMuslimWeek);
    on('#btn-prayer-schedule', 'click', buildPrayerSchedule);
    setInterval(() => { if (state.view === 'salah') renderSalah(); }, 30000);
    on('#pill', 'click', () => $('#ring').scrollIntoView({ behavior: 'smooth', block: 'center' }));

    // Show the floating pill once the big ring scrolls away.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => document.body.classList.toggle('ring-away', !e.isIntersecting), { threshold: 0.15 }).observe($('#ring'));
    }

    on('#btn-theme', 'click', () => {
      state.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme();
      save();
    });

    // popover: close on outside click / escape / resize
    document.addEventListener('pointerdown', (e) => {
      if (!$('#pop').hidden && !e.target.closest('#pop') && !e.target.closest('.num')) closePop();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(true); });
    // Only close the editor on real layout changes (rotation / window resize),
    // never when a phone keyboard opens or the address bar slides away.
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      if (Math.abs(w - lastW) > 60) { lastW = w; closePop(); return; }
      if (popFor && !$('#pop').hidden) (isSheet() ? liftSheet() : positionPop(popFor.node));
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', liftSheet);
      window.visualViewport.addEventListener('scroll', liftSheet);
    }
    // Ignore stray clicks right after the sheet opens (belt and braces for mobile).
    on('#pop-backdrop', 'click', () => { if (Date.now() - popOpenedAt > 400) closePop(); });

    // export menu
    const menuBtn = $('#btn-export');
    const pop = $('#menu-export .menu-pop');
    const closeMenu = () => { pop.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      menuBtn.setAttribute('aria-expanded', String(!pop.hidden));
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#menu-export')) closeMenu(); });
    pop.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'csv') { download(`168-hours-${stamp()}.csv`, toCSV(), 'text/csv;charset=utf-8'); toast('CSV exported'); }
      if (act === 'json') { download(`168-hours-${stamp()}.json`, toJSON(), 'application/json'); toast('JSON exported'); }
      if (act === 'import') $('#file-import').click();
      closeMenu();
    });
    on('#file-import', 'change', (e) => {
      const f = e.target.files[0];
      if (f) importJSON(f);
      e.target.value = '';
    });

    // reset
    const dlgReset = $('#dlg-reset');
    on('#btn-reset', 'click', () => dlgReset.showModal());
    dlgReset.addEventListener('close', () => {
      const mode = dlgReset.returnValue;
      if (mode !== 'blank' && mode !== 'example') return;
      let any = false;
      for (const w of WEEKS) {
        if ($('#rs-' + w).checked) {
          state[w] = mode === 'blank' ? blankWeek() : { ...EXAMPLE[w] };
          for (const c of customs()) c[w] = 0;
          any = true;
        }
      }
      if ($('#rs-grid').checked) { state.grid = Array(HOURS).fill(null); any = true; }
      if (!any) return;
      renderAll();
      save();
      toast(mode === 'blank' ? 'Reset to a blank week' : 'Example loaded');
    });

    // categories
    on('#btn-categories', 'click', openCategories);
    on('#btn-add-cat', 'click', () => addCategory());

    // schedule
    on('#btn-clear-grid', 'click', () => {
      if (!state.grid.some(Boolean)) return;
      const snap = state.grid.slice();
      state.grid = Array(HOURS).fill(null);
      paintCells();
      renderTally();
      save();
      toast('Schedule cleared', 'Undo', () => { state.grid = snap; paintCells(); renderTally(); save(); });
    });
    on('#btn-autofill', 'click', () => {
      const snap = state.grid.slice();
      autoFill(state.target);
      toast(`Filled from ${state.target === 'ideal' ? 'your ideal week' : 'your week now'}. Paint to fine-tune.`, 'Undo', () => {
        state.grid = snap; paintCells(); renderTally(); save();
      });
    });
    on('#target-seg', 'click', (e) => {
      const t = e.target.closest('[data-target]');
      if (!t) return;
      state.target = t.dataset.target;
      renderTally();
      save();
    });
    document.addEventListener('keydown', (e) => {
      if (state.view !== 'grid' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest('input, textarea, dialog')) return;
      if (/^[1-9]$/.test(e.key)) { const c = shown()[+e.key - 1]; if (c) setBrush(c.id); }
      else if (e.key === 'e' || e.key === 'E' || e.key === '0') setBrush(null);
    });

    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      state = load();
      applyTheme();
      renderAll();
      setView(state.view);
    });
  }

  function boot() {
    try {
      init();
    } catch (err) {
      console.error(err);
      showReloadBar();
    }
  }
  // If the page and script ever get out of sync (e.g. a stale cached file), offer a clean reload.
  function showReloadBar() {
    if (document.getElementById('reload-bar')) return;
    const bar = el('div', { id: 'reload-bar', class: 'reload-bar', role: 'alert' },
      '<span>Something didn’t load properly.</span><button type="button">Reload</button>');
    bar.querySelector('button').addEventListener('click', () => location.reload());
    document.body.append(bar);
  }
  window.addEventListener('error', () => { if (!document.querySelector('.story')) showReloadBar(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Expose the calculation for tests / curious users.
  window.Planner168 = { SECTIONS, EXAMPLE, PRESETS, computeWeek: () => R };
})();
