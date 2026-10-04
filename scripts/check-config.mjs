#!/usr/bin/env node
// The deploy gate. Exits 1 while any product's payment link or installer URL is
// unset or still a placeholder, so neither GitHub Pages nor the Cloudflare
// Worker can ship a store with dead buttons.
//
//   node scripts/check-config.mjs

import { loadStore, linkProblem } from "./lib/store.mjs";

const { config, products } = loadStore();
const problems = [];

for (const p of products) {
  for (const field of ["buyLinkKey", "installerKey"]) {
    const key = p[field];
    if (!key) {
      problems.push(`${p.slug}: ${field} is missing in data/products.json`);
      continue;
    }
    const why = linkProblem(config[key]);
    if (why) problems.push(`${p.slug}: ${key} in store.config.json ${why}`);
  }
}

if (problems.length) {
  console.error("Not ready to deploy:");
  for (const line of problems) console.error(`  - ${line}`);
  console.error("Fill these in store.config.json, then run this again.");
  process.exit(1);
}
console.log(`Ready to deploy: ${products.length} product(s), every payment link and installer URL set.`);
