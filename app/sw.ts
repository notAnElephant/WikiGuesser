/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope &
  SerwistGlobalConfig & {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  };

const serwist = new Serwist({
  clientsClaim: true,
  disableDevLogs: true,
  fallbacks: {
    entries: [
      {
        matcher: ({ request }) => request.destination === "document",
        url: "/offline",
      },
    ],
  },
  navigationPreload: true,
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true,
  },
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin &&
        url.pathname.startsWith("/api/offline/countries/packs/") &&
        url.pathname.includes("/flags/"),
      method: "GET",
      handler: async ({ request }) => {
        const cached = await caches.match(request);
        return cached ?? fetch(request);
      },
    },
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "wikiguesser-pages",
        networkTimeoutSeconds: 4,
      }),
    },
    {
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({ cacheName: "wikiguesser-next-static" }),
    },
    {
      matcher: ({ sameOrigin, request }) =>
        sameOrigin &&
        (request.destination === "font" ||
          request.destination === "image" ||
          request.destination === "style" ||
          request.destination === "script"),
      handler: new CacheFirst({ cacheName: "wikiguesser-static" }),
    },
    {
      matcher: /.*/,
      handler: new NetworkOnly(),
    },
  ],
  skipWaiting: true,
});

serwist.addEventListeners();
