#!/usr/bin/env node
// Checks every internal href and src in a built target resolves to a file in
// that build, and that no page links outside its base path.
//
//   node scripts/check-links.mjs            (both targets; build first)

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/store.mjs";

const TARGETS = [
  { name: "www", base: "/", dir: "dist/www" },
  { name: "audio", base: "/audio/", dir: "dist/bom-best/audio" },
  // The bom.best home page (dist/bom-best/index.html) links into /audio/.
  { name: "bom.best", base: "/", dir: "dist/bom-best" },
];

let bad = 0;
for (const t of TARGETS) {
  const dir = path.join(ROOT, t.dir);
  if (!fs.existsSync(dir)) {
    console.error(`${t.name}: ${t.dir} is missing; run node scripts/build.mjs first`);
    process.exit(1);
  }
  const pages = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".html"));
  let checked = 0;
  for (const page of pages) {
    const html = fs.readFileSync(path.join(dir, page), "utf8");
    const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    const srcsets = [...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0]));
    for (const ref of [...refs, ...srcsets]) {
      if (/^(https?:|mailto:|#)/.test(ref)) continue;
      checked++;
      if (!ref.startsWith(t.base)) {
        console.error(`${t.name}: ${page} links ${ref}, outside base ${t.base}`);
        bad++;
        continue;
      }
      let rel = ref.slice(t.base.length).split("#")[0].split("?")[0];
      if (rel === "" || rel.endsWith("/")) rel += "index.html";
      if (!fs.existsSync(path.join(dir, rel))) {
        console.error(`${t.name}: ${page} links ${ref}, which is not in the build`);
        bad++;
      }
    }
  }
  console.log(`${t.name}: ${pages.length} pages, ${checked} internal links checked`);
}
if (bad) {
  console.error(`${bad} broken link(s)`);
  process.exit(1);
}
console.log("all internal links resolve");
