const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');

const appRoot = path.resolve(__dirname, '..');
const profile = {
  studyId: 'LOCAL-A',
  enrollmentDate: '2026-05-27',
  followUpDate: '2026-11-27',
  followUpTime: '10:30'
};
const testTiming = {
  schedule_mode: 'test',
  test_interval: '3',
  test_started_at: '2026-09-08T15:00:00.000Z'
};

function activityQuery(overrides = {}) {
  return '?' + new URLSearchParams({
    activity: '20',
    study_id: profile.studyId,
    enrollment_date: profile.enrollmentDate,
    follow_up_date: profile.followUpDate,
    follow_up_time: profile.followUpTime,
    schedule_mode: 'production',
    ...overrides
  });
}

function element() {
  return {
    value: '', textContent: '', children: [], dataset: {}, listeners: {},
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener(name, listener) { this.listeners[name] = listener; },
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    removeAttribute() {},
    querySelector() { return element(); }
  };
}

async function boot({ variant, search = '', now = '2026-10-10T15:00:00Z', forbidPlan = true, renderParticipant = false, allowSetupRedirect = false }) {
  const clock = { now };
  const nodes = new Map();
  const windowListeners = {};
  const documentListeners = {};
  const observations = { replacedUrls: [] };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return new Date(clock.now).getTime(); }
  }
  const folder = variant === 'control' ? '2/' : '';
  const location = new URL(`https://example.test/hctk-refresher-pwa/${folder}${search}`);
  location.reload = () => { observations.reload = true; };
  const window = {
    location,
    addEventListener(name, listener) { windowListeners[name] = listener; },
    clearTimeout() {}, setTimeout() {},
    history: {
      replaceState(state, title, url) {
        if (!allowSetupRedirect) throw new Error('Participant URL was changed');
        if (state !== null || title !== '') throw new Error('Unexpected history state');
        observations.replacedUrls.push(url);
        location.href = new URL(url, location.href).href;
      }
    }
  };
  const document = {
    hidden: false,
    createElement() { return element(); },
    createTextNode(text) { return { textContent: text }; },
    addEventListener(name, listener) { documentListeners[name] = listener; },
    querySelectorAll() { return []; },
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, element());
      return nodes.get(selector);
    }
  };
  const context = vm.createContext({
    Date: Clock, URL, URLSearchParams, Intl, console, crypto: { randomUUID },
    observations, window, document, navigator: {}, setTimeout
  });
  for (const storage of ['indexedDB', 'localStorage', 'sessionStorage']) {
    for (const target of [context, window]) {
      Object.defineProperty(target, storage, {
        get() { throw new Error(`${storage} accessed`); }
      });
    }
  }
  const run = (code) => vm.runInContext(code, context);
  const json = (expression) => JSON.parse(run(`JSON.stringify(${expression})`));
  run(fs.readFileSync(path.join(appRoot, folder, 'app.js'), 'utf8'));
  run(fs.readFileSync(path.join(appRoot, 'shared/app-core.js'), 'utf8'));
  run(`
    if (!${renderParticipant}) renderLearningCard = () => { observations.visible = currentVisibleScheduleItem(); };
    renderSchedule = () => {};
    renderActivity = () => {};
    renderAdminReviewPicker = () => {};
    renderCards = () => {};
    renderAdminProfileSummary = () => {};
    setupServiceWorker = async () => {};
    openBlankCompletionFormWindow = () => ({ closed: false, location: observations });
  `);
  if (forbidPlan) {
    run(`
      generatePlan = () => { throw new Error('Full schedule generated on participant route'); };
      generateProductionPlan = generatePlan;
      generateTestPlan = generatePlan;
      const originalInitialize = initializeVisit;
      initializeVisit = () => {
        originalInitialize();
        state.plan = new Proxy([], { get() { throw new Error('Participant read the schedule'); } });
      };
    `);
  }
  await run('init()');
  return { run, json, nodes, clock, observations, windowListeners, documentListeners };
}

module.exports = { boot, activityQuery, profile, testTiming };
