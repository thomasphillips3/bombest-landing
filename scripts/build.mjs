#!/usr/bin/env node
// Builds the Bombest Audio site and store from data/products.json and
// store.config.json. No dependencies.
//
//   node scripts/build.mjs --target www     -> dist/www/            (www.bombestaudio.com, base /)
//   node scripts/build.mjs --target audio   -> dist/bom-best/audio/ (bom.best/audio, base /audio/)
//   node scripts/build.mjs                  -> both
//
// Every internal link is written from the target's base path, so the same pages
// work at the root of bombestaudio.com and under /audio/ on bom.best, including
// the 404 page, which can be served at any depth.
//
// A Buy or Download button is only written when its link is set. While either is
// still a placeholder the page says the store opens soon instead, and
// scripts/check-config.mjs refuses every deploy.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadStore, linkFor } from "./lib/store.mjs";

const SITE_URL = "https://www.bombestaudio.com/";
const SUPPORT_EMAIL = "thomas@bom.best";
const FONTS = "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;800&display=swap";

const TARGETS = {
  www: { base: "/", out: "dist/www", extra: "site/www-only" },
  audio: { base: "/audio/", out: "dist/bom-best/audio", extra: null },
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const money = (p) => (p.currency === "USD" ? `$${p.price}` : `${p.price} ${p.currency}`);

function hashName(file) {
  const body = fs.readFileSync(file);
  const h = crypto.createHash("sha256").update(body).digest("hex").slice(0, 10);
  const ext = path.extname(file);
  return { body, name: `${path.basename(file, ext)}.${h}${ext}` };
}

function copyDir(from, to) {
  if (!from || !fs.existsSync(path.join(ROOT, from))) return;
  fs.cpSync(path.join(ROOT, from), to, { recursive: true });
}

function write(out, rel, html) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

// --- templates ---------------------------------------------------------------

function layout({ ctx, title, description, canonical, image, body, noindex }) {
  const ogImage = image ? `${SITE_URL}${image.replace(/^\//, "")}` : null;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
${canonical ? `  <link rel="canonical" href="${esc(canonical)}" />\n` : ""}${noindex ? `  <meta name="robots" content="noindex" />\n` : ""}  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
${canonical ? `  <meta property="og:url" content="${esc(canonical)}" />\n` : ""}${ogImage ? `  <meta property="og:image" content="${esc(ogImage)}" />\n` : ""}  <link rel="icon" type="image/png" href="${ctx.base}favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONTS}" rel="stylesheet" />
  <link href="${ctx.base}${ctx.assets["styles.css"]}" rel="stylesheet" />
</head>
<body>
${body}
  <footer>
    &copy; ${new Date().getFullYear()} Bombest LLC. Designed by Thomas da Bombest. <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
  </footer>
</body>
</html>
`;
}

function topbar(ctx) {
  return `  <nav class="topbar">
    <div class="wrap">
      <a class="brand" href="${ctx.base}"><img src="${ctx.base}${ctx.assets["images/bombest-logo-400.png"]}" alt="" width="36" height="36" />Bombest Audio</a>
      <a class="back" href="${ctx.base}#plugins"><span class="long">All </span>plugins</a>
    </div>
  </nav>`;
}

function productImage(ctx, p, sizes) {
  const im = p.image;
  const a1 = `${ctx.base}${ctx.assets[im.src]}`;
  const a2 = `${ctx.base}${ctx.assets[im.src2x]}`;
  return `<img src="${a1}" srcset="${a1} 1x, ${a2} 2x" width="${im.width}" height="${im.height}" alt="${esc(im.alt)}" sizes="${sizes}" />`;
}

function homePage(ctx, products) {
  const cards = products
    .map(
      (p) => `      <a class="card" href="${ctx.base}${p.slug}/">
        ${productImage(ctx, p, "(max-width: 900px) 100vw, 520px")}
        <div class="card-body">
          <p class="kicker">${esc(p.kind)}</p>
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.summary)}</p>
          <div class="card-foot"><span class="price">${money(p)}</span><span class="more">Details</span></div>
        </div>
      </a>`
    )
    .join("\n");

  const body = `  <main>
  <section class="hero">
    <div class="logo-container">
      <img src="${ctx.base}${ctx.assets["images/bombest-logo-400.png"]}" alt="Bombest Audio Logo" width="200" height="200" />
    </div>
    <h1>Bombest Audio</h1>
    <p class="tagline">
      Professional Mixing. Boutique Plugins. Sonic Experiments.<br>
      Detroit soul meets next-gen tech. Welcome to the future of sound.
    </p>
    <div class="actions">
      <a class="btn" href="#plugins">Plugins</a>
      <a class="btn btn-ghost" href="mailto:${SUPPORT_EMAIL}">Contact</a>
    </div>
  </section>

  <section class="plugins" id="plugins">
    <div class="wrap">
      <h2 class="section-title">Plugins</h2>
      <p class="section-lede">Plugins I build in Detroit. Every one has a free trial, so put it on your own mix before you buy.</p>
      <div class="cards">
${cards}
      </div>
    </div>
  </section>
  </main>`;

  return layout({
    ctx,
    title: "Bombest Audio",
    description: "Bombest Audio - Professional Mixing, Boutique Plugins, Sonic Experiments. Detroit soul meets next-gen tech.",
    canonical: SITE_URL,
    image: ctx.assets[products[0]?.image.src2x],
    body,
  });
}

function buyBox(ctx, p) {
  const buy = linkFor(ctx.config, p.buyLinkKey);
  const trial = linkFor(ctx.config, p.installerKey);
  const buttons = [];
  if (buy) buttons.push(`<a class="btn" href="${esc(buy)}" rel="noopener">Buy for ${money(p)}</a>`);
  if (trial) buttons.push(`<a class="btn btn-ghost" href="${esc(trial)}">Download free trial</a>`);

  let soon = "";
  if (!buy && !trial) {
    soon = `The free trial and checkout open soon. Want to know when? Email me at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.`;
  } else if (!buy) {
    soon = "Checkout opens soon. Grab the free trial in the meantime.";
  } else if (!trial) {
    soon = "The free trial download is coming soon.";
  }

  return [
    buttons.length ? `<div class="actions">${buttons.join("")}</div>` : "",
    soon ? `<p class="soon">${soon}</p>` : "",
  ]
    .filter(Boolean)
    .join("\n          ");
}

function productPage(ctx, p) {
  const name = esc(p.name);
  const controls = p.controls
    .map(
      (c) => `        <div class="control"><dt><span class="name">${esc(c.name)}</span><span class="range">${esc(c.range)}</span></dt><dd>${esc(c.text)}</dd></div>`
    )
    .join("\n");
  const presets = p.presets
    .map((g) => `        <div><h3>${esc(g.category)}</h3><ul>${g.names.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>`)
    .join("\n");
  const specs = p.specs.map(([k, v]) => `        <tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("\n");
  const formats = p.specs.find(([k]) => k === "Formats")?.[1] ?? "";

  const body = `${topbar(ctx)}
  <main>
  <section class="product-hero">
    <div class="wrap">
      <figure class="panel">${productImage(ctx, p, "(max-width: 860px) 100vw, 600px")}</figure>
      <div class="product-head">
        <p class="kicker">${esc(p.kind)}</p>
        <h1>${name}</h1>
        <p class="tag">${esc(p.tagline)}</p>
        <p class="price">${money(p)}<small>${esc(p.currency)}</small></p>
          ${buyBox(ctx, p)}
        <p class="fine">${esc(formats.replace(/, (?=[^,]*$)/, " and "))} for macOS, Apple Silicon and Intel. One license covers ${p.seats} computers.</p>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap"><div class="prose">
      <h2 class="section-title">What it is</h2>
${p.intro.map((t) => `      <p>${esc(t)}</p>`).join("\n")}
    </div></div>
  </section>

  <section class="section" id="controls">
    <div class="wrap">
      <h2 class="section-title">Controls</h2>
      <p class="section-lede">Everything is on the face. No menus.</p>
      <dl class="controls">
${controls}
      </dl>
    </div>
  </section>

  <section class="section" id="presets">
    <div class="wrap">
      <h2 class="section-title">Presets</h2>
      <p class="section-lede">${esc(p.presetsIntro)}</p>
      <div class="presets">
${presets}
      </div>
    </div>
  </section>

  <section class="section" id="license">
    <div class="wrap">
      <h2 class="section-title">How the license works</h2>
      <p class="section-lede">No iLok. No serial keys to copy and paste.</p>
      <ol class="steps">
        <li><strong>Try it.</strong> Download the free trial and install it. ${name} runs as a demo: every control works, but the audio drops out for about a second every 30 seconds.</li>
        <li><strong>Buy it and it unlocks.</strong> Buy from the Unlock button inside the plugin and it unlocks by itself. Buy here, then open ${name}, click Unlock and sign in with the email you paid with.</li>
        <li><strong>Use it on ${p.seats} computers.</strong> One license covers ${p.seats} computers. On another computer, open ${name}, click Unlock and sign in with your purchase email. Getting a new machine? Open Manage in the plugin and deactivate the old one first.</li>
      </ol>
    </div>
  </section>

  <section class="section" id="specs">
    <div class="wrap">
      <h2 class="section-title">Specs</h2>
      <table class="specs">
${specs}
      </table>
    </div>
  </section>

  <section class="section" id="support">
    <div class="wrap"><div class="prose">
      <h2 class="section-title">Support</h2>
      <p>Questions, or something not working right? Email me at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and I'll get back to you.</p>
      <div class="buy-again">
          ${buyBox(ctx, p)}
      </div>
    </div></div>
  </section>
  </main>`;

  return layout({
    ctx,
    title: `${p.name} - ${p.kind} | Bombest Audio`,
    description: p.description,
    canonical: `${SITE_URL}${p.slug}/`,
    image: ctx.assets[p.image.src2x],
    body,
  });
}

function notFoundPage(ctx) {
  const body = `${topbar(ctx)}
  <main class="lost">
    <h1>Nothing here</h1>
    <p>That page doesn't exist. The plugins are this way.</p>
    <a class="btn" href="${ctx.base}#plugins">See the plugins</a>
  </main>`;
  return layout({ ctx, title: "Not found | Bombest Audio", description: "Page not found.", body, noindex: true });
}

// --- build -------------------------------------------------------------------

function build(targetName) {
  const target = TARGETS[targetName];
  if (!target) throw new Error(`unknown target ${targetName}; use www or audio`);
  const { config, products } = loadStore();
  const out = path.join(ROOT, target.out);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, "assets"), { recursive: true });

  // Fingerprinted assets: styles and every image under site/images.
  const assets = {};
  const sources = ["styles.css", ...fs.readdirSync(path.join(ROOT, "site/images")).map((f) => `images/${f}`)];
  for (const rel of sources) {
    const { body, name } = hashName(path.join(ROOT, "site", rel));
    fs.writeFileSync(path.join(out, "assets", name), body);
    assets[rel] = `assets/${name}`;
  }
  for (const p of products) {
    for (const k of ["src", "src2x"]) if (!assets[p.image[k]]) throw new Error(`${p.slug}: image ${p.image[k]} is not in site/images`);
  }

  copyDir("site/static", out);
  copyDir(target.extra, out);

  const ctx = { base: target.base, assets, config };
  write(out, "index.html", homePage(ctx, products));
  for (const p of products) write(out, `${p.slug}/index.html`, productPage(ctx, p));
  write(out, "404.html", notFoundPage(ctx));

  const unset = products.flatMap((p) => [p.buyLinkKey, p.installerKey]).filter((k) => !linkFor(config, k));
  console.log(`built ${targetName} -> ${path.relative(ROOT, out)} (base ${target.base}, ${products.length} product(s))`);
  if (unset.length) console.log(`  note: ${[...new Set(unset)].join(", ")} not set; those buttons are hidden and deploys are refused`);
}

const i = process.argv.indexOf("--target");
const which = i > 0 ? [process.argv[i + 1]] : Object.keys(TARGETS);
for (const t of which) build(t);
