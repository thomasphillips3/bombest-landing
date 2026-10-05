#!/usr/bin/env node
// The deploy gate.
//
// While STORE_OPEN is false in store.config.json the store ships as "coming
// soon": no buy or download buttons, so placeholder links are allowed, but any
// link that is filled in must still be a real https URL.
//
// Once STORE_OPEN is true, every product's payment link and installer URL must
// be set, so neither GitHub Pages nor the Cloudflare Worker can ship a store
// with dead buttons.
//
//   node scripts/check-config.mjs

import { loadStore, linkProblem } from "./lib/store.mjs";

const { config, products } = loadStore();
const open = config.STORE_OPEN === true;
const problems = [];

if (typeof config.STORE_OPEN !== "boolean") problems.push("STORE_OPEN in store.config.json must be true or false");

for (const p of products) {
  for (const field of ["buyLinkKey", "installerKey"]) {
    const key = p[field];
    if (!key) {
      problems.push(`${p.slug}: ${field} is missing in data/products.json`);
      continue;
    }
    const value = config[key];
    const why = linkProblem(value);
    const placeholder = typeof value === "string" && /REPLACE_ME/i.test(value);
    if (why && (open || !placeholder)) problems.push(`${p.slug}: ${key} in store.config.json ${why}`);
  }
}

if (problems.length) {
  console.error("Not ready to deploy:");
  for (const line of problems) console.error(`  - ${line}`);
  console.error("Fix these in store.config.json, then run this again.");
  process.exit(1);
}
console.log(
  open
    ? `Ready to deploy: store open, ${products.length} product(s), every payment link and installer URL set.`
    : `Ready to deploy: store closed (STORE_OPEN is false), so buy and download buttons are hidden.`
);
