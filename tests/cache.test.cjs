const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { it } = require('node:test');

const appRoot = path.resolve(__dirname, '..');
const variants = [
  { name: 'intervention', folder: '', prefix: 'hctk-serverless-pwa-' },
  { name: 'control', folder: '2/', prefix: 'hctk-control-pwa-' }
].map((variant) => {
  const source = fs.readFileSync(path.join(appRoot, variant.folder, 'sw.js'), 'utf8');
  const cacheName = source.match(/const CACHE_NAME = '([^']+)'/)[1];
  const version = Number(cacheName.match(/-v(\d+)$/)[1]);
  return { ...variant, source, cacheName, version };
});

for (const variant of variants) {
  it(`${variant.name}: paired scripts, isolated cache updates and offline navigation`, async () => {
    const { folder, prefix, source, cacheName, version } = variant;
    const sibling = variants.find((entry) => entry !== variant);
    const handlers = {};
    const deleted = [];
    const opened = [];
    const entries = new Map();
    const puts = [];
    let precached;
    let online = false;
    const root = 'https://example.test/hctk-refresher-pwa/';
    const base = root + folder;
    const oldOwnCache = `${prefix}v${version - 1}`;
    const context = vm.createContext({
      URL, Promise,
      fetch: async () => {
        if (!online) throw new Error('Offline');
        return { ok: true, clone: () => 'PUBLIC RESPONSE' };
      },
      self: {
        location: new URL(base + 'sw.js'),
        clients: { claim() {} }, skipWaiting() {},
        addEventListener(name, handler) { handlers[name] = handler; }
      },
      caches: {
        keys: async () => [cacheName, oldOwnCache, sibling.cacheName, 'other-app-cache'],
        delete: async (key) => { deleted.push(key); },
        open: async (key) => {
          opened.push(key);
          return {
            match: async (request) => entries.get(typeof request === 'string' ? request : request.url),
            put: async (request, response) => { puts.push([request, response]); },
            addAll: async (items) => { precached = items; }
          };
        },
        match() { throw new Error('Cross-cache lookup'); }
      }
    });
    vm.runInContext(source, context);

    async function lifecycle(name) {
      let pending;
      handlers[name]({ waitUntil(promise) { pending = promise; } });
      await pending;
    }
    async function request(url, mode = 'cors', method = 'GET') {
      let response;
      handlers.fetch({
        request: { url, mode, method },
        respondWith(promise) { response = promise; }
      });
      return response ? { handled: true, result: await response } : { handled: false };
    }

    await lifecycle('install');
    const corePath = `${folder ? '../' : './'}shared/app-core.js?v=${version}`;
    assert(precached.includes(`./app.js?v=${version}`));
    assert(precached.includes(corePath));
    const html = fs.readFileSync(path.join(appRoot, folder, 'index.html'), 'utf8');
    assert(html.includes(`src="app.js?v=${version}"`));
    assert(html.includes(`src="${corePath.replace(/^\.\//, '')}"`));
    await lifecycle('activate');
    assert.deepEqual(deleted, [oldOwnCache]);

    entries.set('./index.html', 'PUBLIC SHELL');
    assert.equal((await request(base + '?activity=20&study_id=LOCAL-A', 'navigate')).result, 'PUBLIC SHELL');
    entries.set(root + `shared/app-core.js?v=${version}`, 'CURRENT CORE');
    assert.equal((await request(root + `shared/app-core.js?v=${version}`)).result, 'CURRENT CORE');

    for (const [url, mode, method] of [
      [root + sibling.folder, 'navigate', 'GET'],
      [root + sibling.folder + 'app.js', 'cors', 'GET'],
      [base + 'private?study_id=LOCAL-A', 'cors', 'GET'],
      [base + 'assets/a.png?study_id=LOCAL-A', 'cors', 'GET'],
      ['https://forms.office.com/response', 'navigate', 'GET'],
      ['https://vcom.qualtrics.com/jfe/form/SV_4Orwv8tDt1AWIsu?study_id=LOCAL-A', 'navigate', 'GET'],
      [base, 'cors', 'POST']
    ]) {
      assert.equal((await request(url, mode, method)).handled, false, url);
    }
    assert.equal(puts.length, 0);

    online = true;
    await request(base + '?activity=20&study_id=LOCAL-A', 'navigate');
    assert.deepEqual(puts, [['./index.html', 'PUBLIC RESPONSE']]);
    assert(opened.every((key) => key === cacheName));
  });

  it(`${variant.name}: failed navigations preserve and serve the last working offline copy`, async () => {
    const handlers = {};
    const base = `https://example.test/hctk-refresher-pwa/${variant.folder}`;
    let cached = new Response('WORKING APP', { headers: { 'Content-Type': 'text/html' } });
    let networkStatus = 200;
    let storageFailure = '';
    let writes = 0;
    const offlineError = new Error('Network unavailable');
    vm.runInNewContext(variant.source, {
      URL, Promise,
      self: {
        location: new URL(base + 'sw.js'),
        addEventListener(name, handler) { handlers[name] = handler; }
      },
      fetch: async () => {
        if (networkStatus === null) throw offlineError;
        return new Response(networkStatus === 200 ? 'UPDATED APP' : 'HOST ERROR', { status: networkStatus });
      },
      caches: {
        open: async (name) => {
          assert.equal(name, variant.cacheName);
          if (storageFailure === 'open') throw new Error('Storage unavailable');
          return {
            match: async (key) => {
              assert.equal(key, './index.html');
              return cached?.clone();
            },
            put: async (key, response) => {
              assert.equal(key, './index.html');
              if (storageFailure === 'put') throw new Error('Storage quota exceeded');
              assert.equal(response.ok, true);
              cached = response.clone();
              writes++;
            }
          };
        }
      }
    });
    function navigate() {
      let pending;
      handlers.fetch({
        request: { method: 'GET', mode: 'navigate', url: base + '?activity=20&study_id=LOCAL-CACHE' },
        respondWith(promise) { pending = promise; }
      });
      assert(pending);
      return pending;
    }

    for (const status of [404, 429, 500, 503]) {
      networkStatus = status;
      assert.equal(await (await navigate()).text(), 'WORKING APP');
      networkStatus = null;
      assert.equal(await (await navigate()).text(), 'WORKING APP');
      assert.equal(writes, 0);
    }

    networkStatus = 200;
    assert.equal(await (await navigate()).text(), 'UPDATED APP');
    assert.equal(writes, 1);
    networkStatus = null;
    assert.equal(await (await navigate()).text(), 'UPDATED APP');

    for (const failure of ['open', 'put']) {
      storageFailure = failure;
      networkStatus = 200;
      assert.equal(await (await navigate()).text(), 'UPDATED APP');
      assert.equal(writes, 1);
    }

    storageFailure = '';
    cached = undefined;
    networkStatus = 503;
    const uncachedError = await navigate();
    assert.equal(uncachedError.status, 503);
    assert.equal(await uncachedError.text(), 'HOST ERROR');
    assert.equal(cached, undefined);
    networkStatus = null;
    await assert.rejects(navigate(), (error) => error === offlineError);
    storageFailure = 'open';
    await assert.rejects(navigate(), (error) => error === offlineError);
  });
}
