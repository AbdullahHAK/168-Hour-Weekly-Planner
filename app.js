/* ==========================================================
   168 Hours Planner
   A faithful web port of the "⏳ 168 Hours Template" spreadsheet,
   plus a paintable 7 × 24 week grid.
   Vanilla JS, no dependencies, state saved in localStorage.
   ========================================================== */
(() => {
  'use strict';

  const STORAGE_KEY = '168h-planner:v1';
  const HOURS = 168;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WEEKS = ['current', 'ideal'];

  /* ---------- Life areas (order = spreadsheet order) ---------- */
  const BUILTINS = [
    { id: 'sleep', emoji: '😴', name: 'Sleep', color: '#7c83db' },
    { id: 'work', emoji: '💻', name: 'Work', color: '#3e8ed0' },
    { id: 'food', emoji: '🍕', name: 'Food', color: '#e0904a' },
    { id: 'chores', emoji: '🧹', name: 'Chores', color: '#b08d57' },
    { id: 'childcare', emoji: '👶', name: 'Childcare', color: '#de7a9c' },
    { id: 'fitness', emoji: '🏋️', name: 'Fitness', color: '#4fae7b' },
    { id: 'entertainment', emoji: '📺', name: 'Entertainment', color: '#9b6fd0' },
    { id: 'relationships', emoji: '🥰', name: 'Relationships', color: '#e06a5f' },
  ];
  const BUILTIN_IDS = BUILTINS.map((b) => b.id);
  const CUSTOM_COLORS = ['#3bb0a8', '#c9a93a', '#6e8ca0', '#c2577a', '#5a9e3e', '#8c7ae6', '#d0743c'];

  /*
   * Each section mirrors one block of the sheet.
   *   inputs: the yellow/blue input cells (column C / M)
   *   calc(v): returns derived lines (column F / P) and the section total
   * Spreadsheet references are noted next to each formula.
   */
  const SECTIONS = {
    sleep: {
      inputs: [
        { k: 'sleepHours', pre: 'I sleep for around', post: 'hours per night.', unit: 'h', max: 24, step: 0.5 },
        { k: 'windDown', pre: 'I wind down', post: 'minutes before sleeping.', unit: 'min', max: 1440, step: 5 },
      ],
      calc(v) {
        const sleeping = v.sleepHours * 7; // F19 = C19*7
        const prep = (v.windDown * 7) / 60; // F20 = C20*7/60
        return {
          lines: [
            ['hours per week sleeping', sleeping],
            ['hours per week preparing to sleep', prep],
          ],
          total: sleeping + prep, // F21 = F19+F20
        };
      },
      totalLabel: 'hours per week on sleep-related things.',
    },
    work: {
      inputs: [
        { k: 'workHours', pre: 'I work for around', post: 'hours per day (excluding lunch break).', unit: 'h', max: 24, step: 0.5 },
        { k: 'workDays', pre: 'I work', post: 'days per week.', unit: 'days', max: 7, step: 1 },
        { k: 'lunchBreak', pre: 'My lunch break is', post: 'minutes per working day.', unit: 'min', max: 1440, step: 5 },
        { k: 'commute', pre: 'My commute is', post: 'minutes each way.', unit: 'min', max: 720, step: 5 },
        { k: 'getReady', pre: 'I spend', post: 'minutes per day getting ready for work.', unit: 'min', max: 1440, step: 5 },
        { k: 'changeAfter', pre: 'I spend', post: 'minutes per day getting changed after work.', unit: 'min', max: 1440, step: 5 },
      ],
      calc(v) {
        const d = v.workDays;
        const lines = [
          ['hours per week officially working', d * v.workHours], // F26 = C26*C25
          ['hours per week on my lunch break', (v.lunchBreak * d) / 60], // F27 = C27*C26/60
          ['hours per week commuting', (v.commute * 2 * d) / 60], // F28 = C28*2*C26/60
          ['hours per week getting ready for work', (v.getReady * d) / 60], // F29 = C29*C26/60
          ['hours per week getting changed after work', (v.changeAfter * d) / 60], // F30 = C30*C26/60
        ];
        return { lines, total: sum(lines.map((l) => l[1])) }; // F31 = SUM(F26:F30)
      },
      totalLabel: 'hours per week working.',
    },
    food: {
      inputs: [
        { k: 'bfastEat', pre: 'Each day, I spend around', post: 'minutes eating breakfast.', unit: 'min', max: 1440, step: 5 },
        { k: 'bfastPrep', pre: 'And another', post: 'minutes preparing / cooking / ordering it.', unit: 'min', max: 1440, step: 5 },
        { k: 'lunchEat', pre: 'Each non-work day, I spend', post: 'minutes eating lunch.', unit: 'min', max: 1440, step: 5 },
        { k: 'lunchPrep', pre: 'And another', post: 'minutes preparing / cooking / ordering it.', unit: 'min', max: 1440, step: 5 },
        { k: 'dinnerEat', pre: 'Each day, I spend around', post: 'minutes eating dinner.', unit: 'min', max: 1440, step: 5 },
        { k: 'dinnerPrep', pre: 'And another', post: 'minutes preparing / cooking / ordering it.', unit: 'min', max: 1440, step: 5 },
      ],
      calc(v) {
        const b = v.bfastEat + v.bfastPrep; // F36 = C35+C36
        const l = v.lunchEat + v.lunchPrep; // F39 = C38+C39
        const dn = v.dinnerEat + v.dinnerPrep; // F42 = C41+C42
        const bH = (b * 7) / 60; // F37 = F36*7/60
        const lH = (l * (7 - v.workDays)) / 60; // F40 = F39*(7-C26)/60
        const dH = (dn * 7) / 60; // F43 = F42*7/60
        return {
          lines: [
            ['minutes per day on breakfast', b, 'min'],
            ['hours per week on breakfast', bH],
            ['minutes per non-work day on lunch', l, 'min'],
            ['hours per week on lunch (excluding work days)', lH],
            ['minutes per day on dinner', dn, 'min'],
            ['hours per week on dinner', dH],
          ],
          total: bH + lH + dH, // F44 = F37+F40+F43
        };
      },
      totalLabel: 'hours per week on cooking +/- eating food.',
    },
    chores: {
      inputs: [
        { k: 'groceryTimes', pre: 'I do the groceries', post: 'times per week.', unit: '×', max: 100, step: 1 },
        { k: 'groceryMins', pre: 'Each grocery session takes', post: 'minutes (including travel, loading, unloading etc).', unit: 'min', max: 1440, step: 5 },
        { k: 'cleanTimes', pre: 'I clean the house approx.', post: 'times per week.', unit: '×', max: 100, step: 1 },
        { k: 'cleanMins', pre: 'Each cleaning session takes', post: 'minutes.', unit: 'min', max: 1440, step: 5 },
        { k: 'laundryTimes', pre: 'I do laundry', post: 'times per week.', unit: '×', max: 100, step: 1 },
        { k: 'laundryMins', pre: 'Each laundry session takes me', post: 'minutes.', unit: 'min', max: 1440, step: 5 },
        { k: 'miscChores', pre: 'I do other misc. chores', post: 'hour(s) per week.', unit: 'h', max: 168, step: 0.5 },
      ],
      calc(v) {
        const lines = [
          ['hours per week on groceries', (v.groceryMins * v.groceryTimes) / 60], // F49 = C49*C48/60
          ['hours per week on cleaning', (v.cleanTimes * v.cleanMins) / 60], // F51 = C50*C51/60
          ['hours per week on laundry', (v.laundryMins * v.laundryTimes) / 60], // F53 = C53*C52/60
        ];
        return { lines, total: sum(lines.map((l) => l[1])) + v.miscChores }; // F55 = F49+F51+F53+C54
      },
      totalLabel: 'hours per week on chores.',
    },
    childcare: {
      inputs: [
        { k: 'weekdayCare', pre: 'Each weekday, I spend', post: 'hours actively taking care of my child(ren).', unit: 'h', max: 24, step: 0.5 },
        { k: 'weekendCare', pre: 'Each weekend day, I spend', post: 'hours actively taking care of my child(ren).', unit: 'h', max: 24, step: 0.5 },
        { k: 'childAdmin', pre: 'Each week, I spend', post: 'hours on child admin & logistics etc.', unit: 'h', max: 168, step: 0.5 },
        { k: 'childOther', pre: 'Each week, I spend', post: 'hours on other child-themed stuff.', unit: 'h', max: 168, step: 0.5 },
      ],
      calc(v) {
        const wd = 5 * v.weekdayCare; // F59 = 5*C59
        const we = 2 * v.weekendCare; // F60 = 2*C60
        return {
          lines: [
            ['hours on weekdays on childcare', wd],
            ['hours on weekends on childcare', we],
          ],
          total: wd + we + v.childAdmin + v.childOther, // F63 = F59+F60+C61+C62
        };
      },
      totalLabel: 'hours per week on childcare.',
    },
    fitness: {
      inputs: [
        { k: 'exercise', pre: 'Each week, I spend', post: 'hours exercising (including commute time).', unit: 'h', max: 168, step: 0.5 },
        { k: 'fitnessOther', pre: 'Each week, I spend', post: 'hours on other fitness-related things.', unit: 'h', max: 168, step: 0.5 },
      ],
      calc: (v) => ({ lines: [], total: v.exercise + v.fitnessOther }), // F69 = C67+C68
      totalLabel: 'hours per week on fitness-related stuff.',
    },
    entertainment: {
      inputs: [
        { k: 'tv', pre: 'Each week, I spend', post: 'hours watching TV shows / movies.', unit: 'h', max: 168, step: 0.5 },
        { k: 'socialMedia', pre: 'Each week, I spend', post: 'hours on social media apps.', unit: 'h', max: 168, step: 0.5 },
        { k: 'reading', pre: 'Each week, I spend', post: 'hours reading.', unit: 'h', max: 168, step: 0.5 },
        { k: 'gaming', pre: 'Each week, I spend', post: 'hours gaming.', unit: 'h', max: 168, step: 0.5 },
        { k: 'entOther', pre: 'Each week, I spend', post: 'hours on other “entertainment” stuff.', unit: 'h', max: 168, step: 0.5 },
      ],
      calc: (v) => ({ lines: [], total: v.tv + v.socialMedia + v.reading + v.gaming + v.entOther }), // F78 = SUM(C73:C77)
      totalLabel: 'hours per week on entertainment.',
    },
    relationships: {
      inputs: [
        { k: 'familyTime', pre: 'Each week, I spend', post: 'hours on quality family / partner time.', unit: 'h', max: 168, step: 0.5 },
        { k: 'socialising', pre: 'Each week, I spend', post: 'hours on other socialising time.', unit: 'h', max: 168, step: 0.5 },
      ],
      calc: (v) => ({ lines: [], total: v.familyTime + v.socialising }), // F84 = C82+C83
      totalLabel: 'hours per week on relationships.',
    },
  };

  const INPUT_DEFS = {};
  for (const id of BUILTIN_IDS) for (const inp of SECTIONS[id].inputs) INPUT_DEFS[inp.k] = { ...inp, section: id };
  const INPUT_KEYS = Object.keys(INPUT_DEFS);

  /* Example answers exactly as found in the "⏳ 168 Hours Template" tab. */
  const EXAMPLE = {
    current: {
      sleepHours: 8, windDown: 1,
      workHours: 1, workDays: 7, lunchBreak: 0, commute: 20, getReady: 40, changeAfter: 30,
      bfastEat: 50, bfastPrep: 0, lunchEat: 0, lunchPrep: 0, dinnerEat: 80, dinnerPrep: 0,
      groceryTimes: 0, groceryMins: 0, cleanTimes: 0, cleanMins: 0, laundryTimes: 0, laundryMins: 0, miscChores: 0,
      weekdayCare: 0, weekendCare: 0, childAdmin: 0, childOther: 0,
      exercise: 0, fitnessOther: 0,
      tv: 3, socialMedia: 50, reading: 1, gaming: 0, entOther: 10,
      familyTime: 0, socialising: 20,
    },
    ideal: {
      sleepHours: 7, windDown: 1,
      workHours: 6, workDays: 7, lunchBreak: 0, commute: 20, getReady: 30, changeAfter: 15,
      bfastEat: 30, bfastPrep: 0, lunchEat: 0, lunchPrep: 0, dinnerEat: 30, dinnerPrep: 0,
      groceryTimes: 0, groceryMins: 0, cleanTimes: 0, cleanMins: 0, laundryTimes: 0, laundryMins: 0, miscChores: 0,
      weekdayCare: 0, weekendCare: 0, childAdmin: 0, childOther: 0,
      exercise: 3, fitnessOther: 1,
      tv: 0, socialMedia: 7, reading: 7, gaming: 0, entOther: 0,
      familyTime: 0, socialising: 7,
    },
  };
  const blankWeek = () => Object.fromEntries(INPUT_KEYS.map((k) => [k, 0]));

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
  function deltaClass(n) { const r = round1(n); return r > 0 ? 'up' : r < 0 ? 'down' : ''; }
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
  const uid = () => 'c_' + Math.random().toString(36).slice(2, 9);

  /* ---------- State ---------- */
  function defaultState() {
    return {
      v: 1,
      theme: null,
      view: 'calc',
      cats: BUILTINS.map((b) => ({ ...b, builtin: true })),
      current: { ...EXAMPLE.current },
      ideal: { ...EXAMPLE.ideal },
      grid: Array(HOURS).fill(null),
      brush: 'sleep',
      target: 'ideal',
    };
  }

  function sanitize(raw) {
    const s = defaultState();
    if (!raw || typeof raw !== 'object') return s;
    if (raw.theme === 'light' || raw.theme === 'dark') s.theme = raw.theme;
    if (raw.view === 'grid' || raw.view === 'calc') s.view = raw.view;
    if (raw.target === 'current' || raw.target === 'ideal') s.target = raw.target;

    // categories: keep built-ins (allow rename/recolor), keep valid customs
    if (Array.isArray(raw.cats)) {
      const byId = Object.fromEntries(raw.cats.filter((c) => c && c.id).map((c) => [c.id, c]));
      s.cats = BUILTINS.map((b) => {
        const c = byId[b.id] || {};
        return {
          ...b,
          builtin: true,
          name: typeof c.name === 'string' && c.name.trim() ? c.name.slice(0, 40) : b.name,
          emoji: typeof c.emoji === 'string' ? c.emoji.slice(0, 8) : b.emoji,
          color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : b.color,
        };
      });
      for (const c of raw.cats) {
        if (!c || !c.id || BUILTIN_IDS.includes(c.id) || c.id === 'free') continue;
        s.cats.push({
          id: String(c.id).slice(0, 20),
          builtin: false,
          name: typeof c.name === 'string' && c.name.trim() ? c.name.slice(0, 40) : 'New area',
          emoji: typeof c.emoji === 'string' ? c.emoji.slice(0, 8) : '✨',
          color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : CUSTOM_COLORS[0],
          current: Math.max(0, num(c.current)),
          ideal: Math.max(0, num(c.ideal)),
        });
      }
    }
    for (const w of WEEKS) {
      if (raw[w] && typeof raw[w] === 'object') {
        for (const k of INPUT_KEYS) {
          if (k in raw[w]) s[w][k] = clamp(num(raw[w][k]), 0, INPUT_DEFS[k].max);
        }
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
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
    }, 150);
  }

  const cat = (id) => state.cats.find((c) => c.id === id);
  const customs = () => state.cats.filter((c) => !c.builtin);

  /* ---------- Calculation (the spreadsheet engine) ---------- */
  function computeWeek(w) {
    const v = state[w];
    const areas = {};
    let running = HOURS; // "That leaves me with…" chain: F22, F32, F45, F56, F64, F70, F79, F85
    for (const id of BUILTIN_IDS) {
      const r = SECTIONS[id].calc(v);
      running -= r.total;
      areas[id] = { ...r, left: running };
    }
    for (const c of customs()) {
      const t = num(c[w]);
      running -= t;
      areas[c.id] = { lines: [], total: t, left: running };
    }
    const used = sum(Object.values(areas).map((a) => a.total)); // H16 = SUM(H7:H14)
    const free = HOURS - used; // H15 = 168 - H16
    return {
      areas,
      used,
      free,
      monthly: { used: used * 4, free: free * 4 }, // G3 = F3*4
      annual: { used: used * 52, free: free * 52 }, // H3 = F3*52
    };
  }
  let R = { current: computeWeek('current'), ideal: computeWeek('ideal') };

  /* ---------- Rendering: calculator ---------- */
  const outputs = []; // [{node, fn}] refreshed on every input

  function bindOut(node, fn) { outputs.push({ node, fn }); }

  function renderSections() {
    const root = $('#sections');
    root.innerHTML = '';
    outputs.length = 0;

    const colHead = () =>
      el('div', { class: 'row colhead' }, '<span></span><span class="cur">Current</span><span class="ide">Ideal</span>');

    const allIds = [...BUILTIN_IDS, ...customs().map((c) => c.id)];
    const lastId = allIds[allIds.length - 1];

    for (const id of BUILTIN_IDS) {
      const c = cat(id);
      const sec = SECTIONS[id];
      const card = el('article', { class: 'card section', style: `--c:${c.color}`, id: 'sec-' + id });
      const head = el('header', { class: 'sec-head' },
        `<span class="sec-emoji">${esc(c.emoji)}</span><h3>${esc(c.name)}</h3>`);
      const tot = el('div', { class: 'sec-tot' });
      const d = el('span', { class: 'delta', title: 'Ideal vs current (hours / week)' });
      bindOut(d, () => {
        const n = R.ideal.areas[id].total - R.current.areas[id].total;
        d.className = 'delta ' + deltaClass(n);
        return fmtDelta(n) + ' h';
      });
      tot.append(d);
      head.append(tot);
      card.append(head);

      const body = el('div', { class: 'q-grid' });
      body.append(colHead());
      for (const inp of sec.inputs) {
        const row = el('div', { class: 'row' });
        const label = el('label', { class: 'q-label', for: `in-current-${inp.k}` },
          `${esc(inp.pre)} <span class="gap">…</span> ${esc(inp.post)}`);
        row.append(label, makeField('current', inp), makeField('ideal', inp));
        body.append(row);
      }
      // derived lines
      const sample = sec.calc(state.current).lines;
      sample.forEach((ln, i) => {
        const unit = ln[2] === 'min' ? ' min' : '';
        const row = el('div', { class: 'row derived' });
        row.append(el('span', { class: 'q-label' }, esc(ln[0])));
        for (const w of WEEKS) {
          const o = el('span', { class: 'out' });
          bindOut(o, () => fmt(R[w].areas[id].lines[i][1]) + unit);
          row.append(o);
        }
        body.append(row);
      });
      card.append(body);
      card.append(sectionFoot(id, c, sec.totalLabel, id === lastId));
      root.append(card);
    }

    // Custom life areas
    const card = el('article', { class: 'card section', style: '--c:#8c8a84', id: 'sec-custom' });
    card.append(el('header', { class: 'sec-head' }, '<span class="sec-emoji">✨</span><h3>Your own life areas</h3>'));
    const body = el('div', { class: 'q-grid' });
    const list = customs();
    if (!list.length) {
      body.append(el('p', { class: 'empty-note' }, 'Track anything the questions above don’t cover — study, commuting to the gym, side projects, prayer, volunteering…'));
    } else {
      body.append(colHead());
      for (const c of list) {
        const row = el('div', { class: 'row custom-row' });
        row.append(el('label', { class: 'q-label', for: `in-current-${c.id}` },
          `<span class="swatch" style="background:${c.color}"></span><span>${esc(c.emoji)} ${esc(c.name)} <span class="gap">·</span> <span class="muted">hours per week</span></span>`));
        for (const w of WEEKS) row.append(makeCustomField(w, c));
        body.append(row);
      }
    }
    const add = el('button', { class: 'btn small add-area', type: 'button' }, '+ Add a life area');
    add.addEventListener('click', () => { addCategory(); openCategories(); });
    body.append(add);
    card.append(body);
    if (list.length) {
      const foot = el('div', { class: 'sec-foot' });
      const tRow = el('div', { class: 'row total' });
      tRow.append(el('span', { class: 'q-label' }, '✨ In total, that’s <span class="muted" style="font-weight:400">hours per week on your own areas.</span>'));
      for (const w of WEEKS) {
        const o = el('span', { class: 'out' });
        bindOut(o, () => fmt(sum(list.map((c) => R[w].areas[c.id].total))));
        tRow.append(o);
      }
      const lRow = leftRow(list[list.length - 1].id, true);
      foot.append(tRow, lRow);
      card.append(foot);
    }
    root.append(card);
  }

  function sectionFoot(id, c, totalLabel, isLast) {
    const foot = el('div', { class: 'sec-foot' });
    const tRow = el('div', { class: 'row total' });
    tRow.append(el('span', { class: 'q-label' },
      `${esc(c.emoji)} In total, I spend <span class="muted" style="font-weight:400">${esc(totalLabel)}</span>`));
    for (const w of WEEKS) {
      const o = el('span', { class: 'out' });
      bindOut(o, () => fmt(R[w].areas[id].total));
      tRow.append(o);
    }
    foot.append(tRow, leftRow(id, isLast));
    return foot;
  }

  function leftRow(id, isLast) {
    const row = el('div', { class: 'row left' });
    row.append(el('span', { class: 'q-label' },
      `✅ That leaves me with … ${isLast ? 'hours per week of free time.' : 'hours per week for everything else.'}`));
    for (const w of WEEKS) {
      const o = el('span', { class: 'out' });
      bindOut(o, () => {
        const n = R[w].areas[id].left;
        o.classList.toggle('neg', round1(n) < 0);
        return fmt(n);
      });
      row.append(o);
    }
    return row;
  }

  function makeField(w, inp) {
    const f = el('div', { class: 'field ' + (w === 'current' ? 'cur' : 'ide') });
    const i = el('input', {
      type: 'number', inputmode: 'decimal', min: '0', max: String(inp.max), step: String(inp.step),
      id: `in-${w}-${inp.k}`, 'aria-label': `${w === 'current' ? 'Current' : 'Ideal'}: ${inp.pre} … ${inp.post}`,
    });
    i.value = state[w][inp.k];
    i.addEventListener('input', () => {
      state[w][inp.k] = clamp(num(i.value), 0, inp.max);
      recalc();
    });
    i.addEventListener('blur', () => { i.value = state[w][inp.k]; });
    i.addEventListener('focus', () => i.select());
    f.append(i, el('span', { class: 'unit' }, esc(inp.unit)));
    return f;
  }

  function makeCustomField(w, c) {
    const f = el('div', { class: 'field ' + (w === 'current' ? 'cur' : 'ide') });
    const i = el('input', {
      type: 'number', inputmode: 'decimal', min: '0', max: '168', step: '0.5', id: `in-${w}-${c.id}`,
      'aria-label': `${w === 'current' ? 'Current' : 'Ideal'}: ${c.name} hours per week`,
    });
    i.value = num(c[w]);
    i.addEventListener('input', () => { c[w] = clamp(num(i.value), 0, 168); recalc(); });
    i.addEventListener('blur', () => { i.value = num(c[w]); });
    i.addEventListener('focus', () => i.select());
    f.append(i, el('span', { class: 'unit' }, 'h'));
    return f;
  }

  function renderSummary() {
    const card = (w) => {
      const r = R[w];
      const isCur = w === 'current';
      const neg = (n) => (round1(n) < 0 ? ' neg' : '');
      return `
      <div class="card sum-card ${isCur ? 'cur' : 'ide'}">
        <div class="sum-top">
          <span class="sum-title">${isCur ? '👉 Current week' : '🌈 Ideal week'}</span>
          <span class="sum-sub">${isCur ? 'How I spend my 168 hours now' : 'How I’d ideally spend them'}</span>
        </div>
        <div class="stat-row">
          <div><div class="stat-big${neg(r.free)}">${fmt(r.free)}<small>h</small></div><div class="stat-label">⏳ hours free / week</div></div>
          <div><div class="stat-big">${fmt(r.used)}<small>h</small></div><div class="stat-label">⌛️ hours used / week</div></div>
        </div>
        <table class="mini">
          <thead><tr><th></th><th>💭 Weekly</th><th>🗓️ Monthly</th><th>🎊 Annually</th></tr></thead>
          <tbody>
            <tr><td>⌛️ Hours used</td><td>${fmt(r.used)}</td><td>${fmt(r.monthly.used)}</td><td>${fmt(r.annual.used)}</td></tr>
            <tr><td>⏳ Hours free</td><td class="${neg(r.free)}">${fmt(r.free)}</td><td class="${neg(r.free)}">${fmt(r.monthly.free)}</td><td class="${neg(r.free)}">${fmt(r.annual.free)}</td></tr>
          </tbody>
        </table>
      </div>`;
    };
    $('#summary').innerHTML = card('current') + card('ideal');

    // warnings
    const warns = WEEKS.filter((w) => round1(R[w].free) < 0).map((w) =>
      `<div class="warn"><span>⚠️</span><span>Your <strong>${w === 'current' ? 'current' : 'ideal'} week</strong> adds up to ${fmt(R[w].used)} hours — that’s ${fmt(-R[w].free)} more than the 168 a week has.</span></div>`);
    $('#warnings').innerHTML = warns.join('');

    // bars
    const allCats = state.cats;
    $('#bars').innerHTML = WEEKS.map((w) => {
      const r = R[w];
      const denom = Math.max(HOURS, r.used);
      const segs = allCats.map((c) => {
        const t = Math.max(0, r.areas[c.id].total);
        return t > 0 ? `<span style="width:${(t / denom) * 100}%;background:${c.color}" title="${esc(c.name)}: ${fmt(t)} h"></span>` : '';
      }).join('');
      return `<div class="bar-row"><span class="bar-name">${w === 'current' ? 'Current' : 'Ideal'}</span><div class="bar${r.used > HOURS + 0.05 ? ' over' : ''}" role="img" aria-label="${w} week: ${fmt(r.used)} of 168 hours allocated">${segs}</div></div>`;
    }).join('') +
      `<div class="bar-row ticks-row"><span></span><div class="ticks">${[0, 24, 48, 72, 96, 120, 144, 168].map((t) => `<span style="left:${(t / HOURS) * 100}%">${t}h</span>`).join('')}</div></div>`;

    renderDots();
    $('#bars-legend').innerHTML = allCats.map((c) => `<span><i style="background:${c.color}"></i>${esc(c.name)}</span>`).join('') +
      '<span><i style="background:var(--surface-2);outline:1px solid var(--border-strong)"></i>Free</span>';

    // comparison table (mirrors G6:H16 / P6:R16)
    const rows = allCats.map((c) => {
      const a = R.current.areas[c.id].total;
      const b = R.ideal.areas[c.id].total;
      return `<tr><td><span class="dot" style="background:${c.color}"></span>${esc(c.emoji)} ${esc(c.name)}</td><td>${fmt(a)}</td><td>${fmt(b)}</td><td><span class="delta ${deltaClass(b - a)}">${fmtDelta(b - a)}</span></td></tr>`;
    }).join('');
    const fc = R.current.free;
    const fi = R.ideal.free;
    const negc = (n) => (round1(n) < 0 ? 'neg' : '');
    $('#cmp').innerHTML = `
      <thead><tr><th>Life area</th><th class="cur">Current h</th><th class="ide">Ideal h</th><th>vs current</th></tr></thead>
      <tbody>${rows}
        <tr class="free"><td>✅ Free Time</td><td class="${negc(fc)}">${fmt(fc)}</td><td class="${negc(fi)}">${fmt(fi)}</td><td><span class="delta ${deltaClass(fi - fc)}">${fmtDelta(fi - fc)}</span></td></tr>
        <tr class="total"><td>❌ Total Non-Free Time</td><td>${fmt(R.current.used)}</td><td>${fmt(R.ideal.used)}</td><td><span class="delta ${deltaClass(R.ideal.used - R.current.used)}">${fmtDelta(R.ideal.used - R.current.used)}</span></td></tr>
      </tbody>`;
  }

  /* Hero: the week as 168 dots, filled in life-area order. */
  let dotsWeek = 'ideal';
  function renderDots() {
    const r = R[dotsWeek];
    // Largest-remainder rounding so whole dots never exceed 168.
    const scale = r.used > HOURS ? HOURS / r.used : 1;
    const raw = state.cats.map((c) => ({ c, v: Math.max(0, r.areas[c.id].total) * scale }));
    const counts = raw.map((x) => Math.floor(x.v));
    let left = Math.min(HOURS, Math.round(sum(raw.map((x) => x.v)))) - sum(counts);
    raw.map((x, i) => [x.v - Math.floor(x.v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { counts[i]++; left--; } });
    const seq = [];
    raw.forEach((x, i) => { for (let k = 0; k < counts[i]; k++) seq.push(x.c); });
    let html = '';
    for (let d = 0; d < 7; d++) {
      html += `<span class="dl">${DAYS[d][0]}</span>`;
      for (let h = 0; h < 24; h++) {
        const c = seq[d * 24 + h];
        html += c ? `<i style="--c:${c.color}" title="${esc(c.name)}"></i>` : '<i class="f"></i>';
      }
    }
    const dots = $('#dots');
    dots.innerHTML = html;
    dots.setAttribute('aria-label', `${dotsWeek} week: ${fmt(r.used)} hours allocated, ${fmt(r.free)} free`);
    dots.classList.toggle('over', round1(r.free) < 0);
    $('#dots-foot').innerHTML = round1(r.free) < 0
      ? `<strong class="neg">${fmt(-r.free)} h over</strong> — this week doesn’t fit in 168 hours`
      : `<strong>${fmt(r.free)} h</strong> left over each week · each dot is one hour`;
    document.querySelectorAll('#dots-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.week === dotsWeek)));
  }

  function recalc() {
    R = { current: computeWeek('current'), ideal: computeWeek('ideal') };
    for (const o of outputs) o.node.textContent = o.fn();
    renderSummary();
    renderTally();
    save();
  }

  /* ---------- Rendering: week grid ---------- */
  const cells = [];
  let painting = false;
  let paintMode = 'paint'; // or 'erase'
  let lastPainted = -1;

  function buildWeek() {
    const week = $('#week');
    week.innerHTML = '';
    cells.length = 0;
    week.append(el('span'));
    DAYS.forEach((d, di) => {
      const b = el('button', { class: 'wk-head', type: 'button', title: `Fill all of ${d} with the current brush` }, d);
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
      if (c) applyCell(+c.dataset.i);
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
      const nextH = (h + 1) % 24;
      c.title = `${DAYS[d]} ${hourLabel(h)}–${hourLabel(nextH)} · ${k ? k.name : 'Free'}`;
      // Calendar-style label at the start of each block.
      const starts = !!k && !(h > 0 && state.grid[i - 1] === id);
      c.textContent = starts ? (k.emoji ? k.emoji + ' ' : '') + k.name : '';
    }
    markNow();
  }

  /* Highlight today's column and the current hour. */
  function markNow() {
    const now = new Date();
    const d = (now.getDay() + 6) % 7; // Mon = 0
    const i = d * 24 + now.getHours();
    cells.forEach((c, n) => c && c.classList.toggle('now', n === i));
    document.querySelectorAll('.wk-head').forEach((b, n) => b.classList.toggle('today', n === d));
  }
  setInterval(() => { if (cells.length) markNow(); }, 60000);

  function renderPalette() {
    const p = $('#palette');
    p.innerHTML = '';
    state.cats.forEach((c, n) => {
      const b = el('button', { class: 'chip', type: 'button', role: 'radio', style: `--c:${c.color}`, 'aria-checked': String(state.brush === c.id) },
        `<span class="sw"></span>${esc(c.emoji)} ${esc(c.name)}${n < 9 ? `<span class="k">${n + 1}</span>` : ''}`);
      b.addEventListener('click', () => setBrush(c.id));
      p.append(b);
    });
    const er = el('button', { class: 'chip eraser', type: 'button', role: 'radio', 'aria-checked': String(state.brush === null) },
      '<span class="sw"></span>Eraser<span class="k">E</span>');
    er.addEventListener('click', () => setBrush(null));
    p.append(er);
  }

  function setBrush(id) {
    state.brush = id;
    renderPalette();
    save();
  }

  function renderTally() {
    const counts = {};
    for (const g of state.grid) if (g) counts[g] = (counts[g] || 0) + 1;
    const allocated = sum(Object.values(counts));
    const remaining = HOURS - allocated;
    const T = R[state.target];

    $('#alloc').innerHTML = `
      <div class="box"><div class="v">${allocated}<small> / 168</small></div><div class="l">hours allocated</div></div>
      <div class="box"><div class="v">${remaining}<small> h</small></div><div class="l">hours remaining (free)</div></div>
      <div class="meter">${state.cats.map((c) => (counts[c.id] ? `<span style="width:${(counts[c.id] / HOURS) * 100}%;background:${c.color}"></span>` : '')).join('')}</div>`;

    document.querySelectorAll('#target-seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.target === state.target)));

    const item = (color, name, have, want) => {
      const pct = want > 0 ? Math.min(100, (have / want) * 100) : have > 0 ? 100 : 0;
      const diff = round1(have - want);
      let note = '';
      let cls = '';
      if (diff > 0) { note = `${fmt(diff)} h over target`; cls = 'over'; }
      else if (diff < 0) note = `${fmt(-diff)} h left to place`;
      else if (want > 0) { note = 'On target'; cls = 'done'; }
      else note = 'No target';
      return `<li style="--c:${color}"><div class="t-top"><span class="sw"></span><span class="n">${name}</span><span class="v">${have}<small> / ${fmt(want)} h</small></span></div>
        <div class="t-bar"><span style="width:${pct}%"></span></div><div class="t-note ${cls}">${note}</div></li>`;
    };
    $('#tally').innerHTML = state.cats.map((c) => item(c.color, `${esc(c.emoji)} ${esc(c.name)}`, counts[c.id] || 0, T.areas[c.id].total)).join('') +
      item('var(--border-strong)', '✅ Free time', remaining, Math.max(0, T.free));
  }

  /* ---------- Views ---------- */
  function setView(v) {
    state.view = v;
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.view === v)));
    $('#view-calc').hidden = v !== 'calc';
    $('#view-grid').hidden = v !== 'grid';
    save();
  }

  /* ---------- Theme ---------- */
  function effectiveTheme() {
    if (state.theme) return state.theme;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme() {
    if (state.theme) document.documentElement.dataset.theme = state.theme;
    else delete document.documentElement.dataset.theme;
  }

  /* ---------- Categories dialog ---------- */
  function addCategory() {
    const used = new Set(state.cats.map((c) => c.color));
    const color = CUSTOM_COLORS.find((c) => !used.has(c)) || CUSTOM_COLORS[customs().length % CUSTOM_COLORS.length];
    state.cats.push({ id: uid(), builtin: false, name: 'New area', emoji: '✨', color, current: 0, ideal: 0 });
    renderAll();
  }

  function renderCatList(focusLast = false) {
    const ul = $('#cat-list');
    ul.innerHTML = '';
    for (const c of state.cats) {
      const li = el('li');
      const col = el('input', { type: 'color', value: c.color, 'aria-label': `${c.name} colour` });
      col.addEventListener('input', () => { c.color = col.value; renderAll(false); });
      const emo = el('input', { type: 'text', class: 'emoji', value: c.emoji, maxlength: '8', 'aria-label': `${c.name} emoji` });
      emo.addEventListener('input', () => { c.emoji = emo.value; renderAll(false); });
      const name = el('input', { type: 'text', value: c.name, maxlength: '40', 'aria-label': 'Category name' });
      name.addEventListener('input', () => { c.name = name.value || (c.builtin ? BUILTINS.find((b) => b.id === c.id).name : 'Untitled'); renderAll(false); });
      li.append(col, emo, name);
      if (c.builtin) {
        li.append(el('span', { class: 'lock', title: 'Built-in areas are driven by the spreadsheet formulas and can’t be deleted' }, '🔒'));
      } else {
        const del = el('button', { class: 'btn icon', type: 'button', 'aria-label': `Delete ${c.name}`, title: 'Delete' }, '🗑');
        del.addEventListener('click', () => {
          state.cats = state.cats.filter((x) => x !== c);
          state.grid = state.grid.map((g) => (g === c.id ? null : g));
          if (state.brush === c.id) state.brush = 'sleep';
          renderAll();
        });
        li.append(del);
      }
      ul.append(li);
    }
    if (focusLast) {
      const inputs = ul.querySelectorAll('input[type="text"]:not(.emoji)');
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
    const q = (v) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const line = (...xs) => xs.map(q).join(',');
    const n = (x) => round1(x);
    const out = [];
    out.push(line('168 Hours Planner export', stamp()));
    out.push('');
    out.push(line('SUMMARY'));
    out.push(line('Life area', 'Current week (h)', 'Ideal week (h)', 'Ideal vs current (h)'));
    for (const c of state.cats) {
      const a = R.current.areas[c.id].total;
      const b = R.ideal.areas[c.id].total;
      out.push(line(c.name, n(a), n(b), n(b - a)));
    }
    out.push(line('Free Time', n(R.current.free), n(R.ideal.free), n(R.ideal.free - R.current.free)));
    out.push(line('Total Non-Free Time', n(R.current.used), n(R.ideal.used), n(R.ideal.used - R.current.used)));
    out.push('');
    out.push(line('', 'Current weekly', 'Current monthly', 'Current annually', 'Ideal weekly', 'Ideal monthly', 'Ideal annually'));
    out.push(line('Hours used', n(R.current.used), n(R.current.monthly.used), n(R.current.annual.used), n(R.ideal.used), n(R.ideal.monthly.used), n(R.ideal.annual.used)));
    out.push(line('Hours free', n(R.current.free), n(R.current.monthly.free), n(R.current.annual.free), n(R.ideal.free), n(R.ideal.monthly.free), n(R.ideal.annual.free)));
    out.push('');
    out.push(line('ANSWERS'));
    out.push(line('Life area', 'Question', 'Unit', 'Current', 'Ideal'));
    for (const id of BUILTIN_IDS) {
      for (const inp of SECTIONS[id].inputs) {
        out.push(line(cat(id).name, `${inp.pre} … ${inp.post}`, inp.unit, state.current[inp.k], state.ideal[inp.k]));
      }
    }
    for (const c of customs()) out.push(line(c.name, 'Hours per week', 'h', num(c.current), num(c.ideal)));
    out.push('');
    out.push(line('WEEK GRID'));
    out.push(line('Hour', ...DAYS));
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
        const keep = { theme: state.theme, view: state.view };
        state = sanitize({ ...raw, ...keep });
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
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- Wiring ---------- */
  function renderAll(rebuildCatList = true) {
    renderSections();
    renderPalette();
    paintCells();
    recalc();
    if (rebuildCatList && $('#dlg-categories').open) renderCatList(true);
  }

  function init() {
    applyTheme();
    buildWeek();
    renderAll();
    setView(state.view);

    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setView(t.dataset.view)));

    $('#btn-theme').addEventListener('click', () => {
      state.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
      applyTheme();
      save();
    });

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
    $('#file-import').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) importJSON(f);
      e.target.value = '';
    });

    // reset
    const dlgReset = $('#dlg-reset');
    $('#btn-reset').addEventListener('click', () => dlgReset.showModal());
    dlgReset.addEventListener('close', () => {
      const mode = dlgReset.returnValue;
      if (mode !== 'blank' && mode !== 'example') return;
      const parts = [];
      for (const w of WEEKS) {
        if ($('#rs-' + w).checked) {
          state[w] = mode === 'blank' ? blankWeek() : { ...EXAMPLE[w] };
          for (const c of customs()) c[w] = 0;
          parts.push(w);
        }
      }
      if ($('#rs-grid').checked) { state.grid = Array(HOURS).fill(null); parts.push('grid'); }
      if (!parts.length) return;
      renderAll();
      save();
      toast(mode === 'blank' ? 'Reset to a blank week' : 'Example loaded');
    });

    $('#dots-seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-week]');
      if (!b) return;
      dotsWeek = b.dataset.week;
      renderDots();
    });

    // categories
    $('#btn-categories').addEventListener('click', openCategories);
    $('#btn-add-cat').addEventListener('click', () => addCategory());

    // grid
    $('#btn-clear-grid').addEventListener('click', () => {
      if (!state.grid.some(Boolean)) return;
      if (!confirm('Clear every painted hour in the week grid?')) return;
      state.grid = Array(HOURS).fill(null);
      paintCells();
      renderTally();
      save();
    });
    $('#target-seg').addEventListener('click', (e) => {
      const t = e.target.closest('[data-target]');
      if (!t) return;
      state.target = t.dataset.target;
      renderTally();
      save();
    });

    // keyboard brushes (grid view only, not while typing)
    document.addEventListener('keydown', (e) => {
      if (state.view !== 'grid' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest('input, textarea, dialog')) return;
      if (/^[1-9]$/.test(e.key)) {
        const c = state.cats[+e.key - 1];
        if (c) setBrush(c.id);
      } else if (e.key === 'e' || e.key === 'E' || e.key === '0') {
        setBrush(null);
      }
    });

    // cross-tab sync
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      state = load();
      applyTheme();
      renderAll();
      setView(state.view);
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  // Expose the pure calculation for tests / curious users.
  window.Planner168 = { SECTIONS, EXAMPLE, computeWeek: () => R };
})();
