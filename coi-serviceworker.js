/**
 * Cross-Origin Isolation Service Worker
 *
 * This service worker adds COOP and COEP headers to enable SharedArrayBuffer
 * on hosting platforms that don't allow setting response headers (like GitHub Pages).
 *
 * SharedArrayBuffer is required by sql.js WASM for optimal performance.
 *
 * Based on: https://github.com/nicobrinkkemper/coi-serviceworker
 * License: MIT
 */

// Replaced by CopyEmbeddedAssets with hashes of the actual exported files.
const OFFLINE_ASSETS = [{"path":"beads.sqlite3","sha256":"1e7c6f2f402fddf44802d2149b10de00b93302ebab9c165cca5880fce2c1c2f6"},{"path":"beads.sqlite3.config.json","sha256":"4d9022cc124449eefb39e661047a2bff1df0d9ac92eda19b028e868157d0ca6a"},{"path":"charts.js","sha256":"ecfec4656efbaa5e6647c09c9915d8d8855f0447e76ba96514a14dc29b85bbe6"},{"path":"data/forecast.json","sha256":"6cd8301b7e86ef12b0bd8da148ef46e73ede74bac02eb34d95d22a1177846266"},{"path":"data/graph_layout.json","sha256":"b4663fc60eb4a85a8d02600dd0a82e7c940f41b02cb5523c240cc106a7e7e789"},{"path":"data/labels.json","sha256":"9b6cfe378189caa6e54a5b3f7c193d885d6c353bb5cf1bf05f04b5d86a9247f9"},{"path":"data/meta.json","sha256":"7d93d02009b34cc7341bf9b1bf3b1b795f75baed02736d8bae5a8f89fb22a56f"},{"path":"data/project_health.json","sha256":"5d170c1b8b0383dff17e045fcfc6f247a88afd48b550dc6460c95e5ef815e06c"},{"path":"data/suggestions.json","sha256":"420d3a7d41eafc14be1058b54689ec4e37f085907dc574ea156575a39d54accb"},{"path":"data/triage.json","sha256":"acb09404e66dc1f88f83a0d0f780a6d7c3fab3d0156f9c6bf44d42c7dfe0f607"},{"path":"graph.js","sha256":"efcff0735e3b4f4e7ad054fac7de0b1b634c6409e0e82463d08944cc40b35ca6"},{"path":"head_init.js","sha256":"73cc63cc8b81f6dfd20408410b19a5b88f067d2ba6548f79982bb0640b12c01b"},{"path":"hybrid_scorer.js","sha256":"aad97a989b952db1c478007293d7c4640a692093887f5d9c6e1c58a6ca6a3e83"},{"path":"index.html","sha256":"7e8933b69ee2a73c30ecd8054558bbabab072c7d5e2c19319fd0974ef081c1fe"},{"path":"styles.css","sha256":"f85cce6e6c06cf4aba5ea306e4279c536011e3d0231003a5d3140aaba8bffda6"},{"path":"vendor/MANIFEST.json","sha256":"69067b448f0e68e82644cf6b50c7f5882201c48645f0f30a34df981535bf3a50"},{"path":"vendor/alpine-collapse.min.js","sha256":"c7661d4e2cf0465e3cd693190debb5f592ac72dcc4cfe650581273767558b27b"},{"path":"vendor/alpine.min.js","sha256":"689f513978d11d69f4d33794f7296c9a586a2e55de79bb447cddbc3f474f9f07"},{"path":"vendor/bv_graph.js","sha256":"ea350f3f11f97a76d96ff0d20cca66a576462da1b15e47c76b94871cc1b3b2c5"},{"path":"vendor/bv_graph_bg.wasm","sha256":"bc9ef6787d4621bf088e7f392e2c3231fbdbf508b7ecd0ae91d6e6765fbd201d"},{"path":"vendor/chart.umd.min.js","sha256":"d2af8974e95271638772e9e9524db5b9a6f58d6ec2d5d781400447b4a31c681e"},{"path":"vendor/d3.v7.min.js","sha256":"f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539"},{"path":"vendor/dompurify.min.js","sha256":"ea4b09082ca4ba0ae71be6431a097678751d0453b9c52a4d2c7c39a2166ed9fc"},{"path":"vendor/force-graph.min.js","sha256":"af9324ce63bb87f330643c04a9062ca17b3be32826234012197ced595eb0f83a"},{"path":"vendor/inter-variable.woff2","sha256":"4bfb027b313b0487d4e2f1c3d2781d4011f8155b46744ad5799077dc103e8f0b"},{"path":"vendor/jetbrains-mono-regular.woff2","sha256":"f1a7a03672cdd494ce0d5543fac6e4360fe22403c6de297fdc2e55a815f7baff"},{"path":"vendor/marked.min.js","sha256":"0a0fbf5ea62f007e7ede02d6f75b4eb142ee8acb310cd957ed566af3304c0bcc"},{"path":"vendor/mermaid.min.js","sha256":"14ea436bbe9bd7a5d52a69bd7ae256c9eb1b25963c1f2f30b700a3a491a4fda9"},{"path":"vendor/sql-wasm.js","sha256":"558a72c3ab3415d0e6d243cfd23f9d61543600d59054b4b7b8da3cd65f6b9fd4"},{"path":"vendor/sql-wasm.wasm","sha256":"d7e61b828523001f26ce0b3f88dabcf6c12e5e6edf80eb4f08b26ac7b946ff88"},{"path":"vendor/tailwindcss.js","sha256":"176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15"},{"path":"viewer.js","sha256":"ca3eeab1f3bf3cad049cc727155ac0558eaf1bbd65d4eba9af076216ae4e99c9"},{"path":"wasm_loader.js","sha256":"9ec6041062228b2580f0a66c3d57ee0169a80e38f18024db70dcf643776dcd74"}];
const CACHE_REVISION = '27521d4abc09f26d3f552550534f841ff8cff14eb36248af84bd14ec2dfb28bc';
const CACHE_PREFIX = `beads-viewer-${self.registration.scope}-`;
const CACHE_NAME = CACHE_PREFIX + CACHE_REVISION;

function cacheKey(request) {
  const url = new URL(request.url || request, self.registration.scope);
  // These parameters only defeat intermediary caches; file identity is bound
  // above. Preserve other query parameters and separate Pages project scopes.
  url.searchParams.delete('_t');
  url.searchParams.delete('v');
  if (url.pathname.endsWith('/')) url.pathname += 'index.html';
  return url.href;
}

// Headers needed for cross-origin isolation.
// All static viewer assets are self-contained on the same origin, so 'require-corp'
// + 'same-origin' enables SharedArrayBuffer across Safari/WebKit, Chrome, and Firefox.
const COI_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Check if the request should have COI headers added
 */
function shouldAddHeaders(request) {
  // Only add headers to same-origin requests
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  // Add headers to HTML and JS files
  const pathname = url.pathname;
  if (
    pathname.endsWith('.html') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('/') ||
    pathname === ''
  ) {
    return true;
  }

  // Check accept header for HTML requests
  const accept = request.headers.get('Accept') || '';
  if (accept.includes('text/html')) {
    return true;
  }

  return false;
}

/**
 * Add COI headers to a response
 */
function addCOIHeaders(response) {
  // Clone the response and add headers
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(COI_HEADERS)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Install event
self.addEventListener('install', (event) => {
  console.log('[COI-SW] Installing service worker');
  event.waitUntil((async () => {
    if (!OFFLINE_ASSETS.length) throw new Error('Offline asset manifest missing');
    const cache = await caches.open(CACHE_NAME);
    for (const asset of OFFLINE_ASSETS) {
      const url = new URL(asset.path, self.registration.scope);
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'X-BV-SW-PreCache': '1' },
      });
      if (!response.ok) throw new Error(`Offline asset unavailable: ${asset.path}`);
      const bytes = await response.clone().arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
      if (hash !== asset.sha256) throw new Error(`Offline asset changed: ${asset.path}`);
      await cache.put(cacheKey(url.href), response);
    }
    console.log('[COI-SW] Complete offline bundle cached:', CACHE_REVISION);
    await self.skipWaiting();
  })());
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[COI-SW] Activating service worker');
  event.waitUntil((async () => {
    // Activation is only reached after every required asset was verified.
    // Retire this scope's obsolete bundles, preserving unrelated application
    // caches and the previous working bundle whenever installation fails.
    for (const name of await caches.keys()) {
      if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

// Fetch event - intercept requests and add COI headers
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only process GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith('/__preview__/')) {
    return;
  }
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const key = cacheKey(request);
        // The active worker only serves its complete, hash-checked bundle.
        // A new export installs separately and switches clients after priming.
        let response = await cache.match(key);
        if (!response) {
          try {
            response = await fetch(request);
          } catch (error) {
            // An uncached optional resource may be unavailable offline. Return
            // a failed network response, without an unhandled worker promise
            // or invented success content. Other errors still surface below.
            if (!(error instanceof TypeError)) throw error;
            console.warn('[COI-SW] Resource unavailable:', request.url);
            return Response.error();
          }
          // Optional late-written data (history) remains available offline
          // after use. Failed/opaque responses never replace cached content.
          if (response.ok && response.type !== 'opaque') await cache.put(key, response.clone());
        }

        // Check if response is ok and we can modify it
        if (!response.ok || response.type === 'opaque') {
          return response;
        }

        // Add COI headers
        return shouldAddHeaders(request) ? addCOIHeaders(response) : response;
      } catch (error) {
        console.error('[COI-SW] Fetch error:', error);
        throw error;
      }
    })()
  );
});

// Message handler for control messages
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'checkCOI') {
    event.ports[0].postMessage({
      crossOriginIsolated: self.crossOriginIsolated,
      coepHeader: COI_HEADERS['Cross-Origin-Embedder-Policy'],
      coopHeader: COI_HEADERS['Cross-Origin-Opener-Policy'],
    });
  }
});

console.log('[COI-SW] Service worker loaded');
