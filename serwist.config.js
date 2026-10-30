// @ts-check

import { serwist } from "@serwist/next/config";

export default serwist({
  additionalPrecacheEntries: [
    { revision: null, url: "/offline" },
    { revision: null, url: "/manifest.webmanifest" },
  ],
  precachePrerendered: true,
  swDest: "public/sw.js",
  swSrc: "app/sw.ts",
});
