/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute, matchPrecache } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const networkFirst = (cacheName: string) => new NetworkFirst({ cacheName, networkTimeoutSeconds: 4 });

registerRoute(({ request }) => request.mode === 'navigate', networkFirst('pages-cache'));
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  networkFirst('assets-cache')
);

setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    return (await matchPrecache('index.html')) ?? Response.error();
  }
  return Response.error();
});