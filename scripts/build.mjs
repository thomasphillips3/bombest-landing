#!/usr/bin/env node
// Builds the Bombest Audio site and store from data/products.json and
// store.config.json. No dependencies.
//
//   node scripts/build.mjs --target www     -> dist/www/            (www.bombestaudio.com, base /)
//   node scripts/build.mjs --target audio   -> dist/bom-best/audio/ (bom.best/audio, base /audio/)
//                                              and dist/bom-best/index.html (the bom.best home page)
//   node scripts/build.mjs                  -> both
//
// Every internal link is written from the target's base path, so the same store
// pages work at the root of bombestaudio.com and under /audio/ on bom.best,
// including the 404 page, which can be served at any depth.
//
// Buy and Download buttons appear only when STORE_OPEN is true in
// store.config.json and the product's link is set. While the store is closed,
// every product page says the beta opens soon instead.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ROOT, loadStore, linkFor } from "./lib/store.mjs";

const SITE_URL = "https://www.bombestaudio.com/";
const HOME_URL = "https://bom.best/";
const MIXING_URL = "https://engineears.com/bombestmusic";
const SUPPORT_EMAIL = "thomas@bom.best";
const FONTS =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@400;500&display=swap";

const TARGETS = {
  www: { base: "/", out: "dist/www", extra: "site/www-only", home: false },
  audio: { base: "/audio/", out: "dist/bom-best/audio", extra: null, home: true },
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const money = (p) => (p.currency === "USD" ? `$${p.price}` : `${p.price} ${p.currency}`);
const stageLabel = (p) => (p.stage ? `${p.stage} ${p.version}` : "");

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

function write(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const asset = (ctx, rel) => `${ctx.base}${ctx.assets[rel]}`;

// --- shared pieces -----------------------------------------------------------

function layout({ ctx, title, description, canonical, image, header, body, noindex }) {
  const ogImage = image ? `${SITE_URL}${image}` : null;
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
${canonical ? `  <meta property="og:url" content="${esc(canonical)}" />\n` : ""}${ogImage ? `  <meta property="og:image" content="${esc(ogImage)}" />\n` : ""}  <meta name="theme-color" content="#141414" />
  <link rel="icon" type="image/svg+xml" href="${ctx.base}favicon.svg" />
  <link rel="icon" type="image/png" href="${ctx.base}favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONTS}" rel="stylesheet" />
  <link href="${asset(ctx, "styles.css")}" rel="stylesheet" />
</head>
<body>
${header}
${body}
  <footer class="foot">
    <div class="wrap">
      <span>&copy; ${new Date().getFullYear()} Bombest LLC. Designed by Thomas da Bombest.</span>
      <span class="links"><a href="${HOME_URL}">bom.best</a><a href="${ctx.storeBase}">Store</a><a href="${MIXING_URL}" rel="noopener">EngineEars</a><a href="mailto:${SUPPORT_EMAIL}">Email</a></span>
    </div>
  </footer>
</body>
</html>
`;
}

function header(ctx, { homeHref, links }) {
  const nav = links
    .map(([label, href, cls]) => `      <a${cls ? ` class="${cls}"` : ""} href="${href}">${label}</a>`)
    .join("\n");
  return `  <header class="top">
    <div class="wrap">
      <a href="${homeHref}" aria-label="Bombest Audio home"><img class="lockup" src="${asset(ctx, "images/bombest-lockup-horizontal-dark.svg")}" alt="Bombest Audio" width="188" height="46" /></a>
      <nav class="nav" aria-label="Main">
${nav}
      </nav>
    </div>
  </header>`;
}

const storeHeader = (ctx) =>
  header(ctx, {
    homeHref: ctx.base,
    links: [
      ["Plugins", `${ctx.base}#plugins`, "hide-sm"],
      ["Mixing", `${HOME_URL}#mixing`, "hide-sm"],
      ["Contact", `mailto:${SUPPORT_EMAIL}`, "hide-sm"],
      ["bom.best", HOME_URL, "store"],
    ],
  });

function unit(num, label, inner, extra = "") {
  return `      <div class="unit">
        <h2 class="unit-label"><span class="num">${num}</span><span>${esc(label)}</span><span class="grow"></span>${extra}</h2>
${inner}
      </div>`;
}

function productImage(ctx, p, sizes) {
  const im = p.image;
  const a1 = asset(ctx, im.src);
  const a2 = asset(ctx, im.src2x);
  return `<img src="${a1}" srcset="${a1} 1x, ${a2} 2x" width="${im.width}" height="${im.height}" alt="${esc(im.alt)}" sizes="${sizes}" />`;
}

function productCard(ctx, p) {
  const page = `${ctx.storeBase}${p.slug}/`;
  const specs = (p.cardSpecs || [])
    .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join("");
  return `        <div class="product">
          <figure class="shot">${productImage(ctx, p, "(max-width: 900px) 100vw, 600px")}</figure>
          <div class="info">
            <div>
              <p class="kicker">${esc(p.kind)}</p>
              <h3 class="h2 card-title">${esc(p.name)}</h3>
              <p class="tag">${esc(p.tagline)}</p>
            </div>
            <p class="copy">${esc(p.cardSummary || p.summary)}</p>
            ${specs ? `<dl class="specs-grid">${specs}</dl>` : ""}
            <p class="price-row"><span class="price">${money(p)}</span>${stageLabel(p) ? `<span class="badge">${esc(stageLabel(p))}</span>` : ""}<span class="fine">Free trial in the plugin</span></p>
            <div class="actions">
              <a class="btn" href="${page}">Get ${esc(p.name)}</a>
              <a class="btn btn-ghost" href="${page}#controls">See the controls</a>
            </div>
          </div>
        </div>`;
}

// --- bom.best home -----------------------------------------------------------

function bomBestHome(ctx, products) {
  const first = products[0];
  const beta = ctx.open ? `<b>${esc(first.name)}, my first, is out now in beta.</b>` : `<b>${esc(first.name)}, my first, opens in beta soon.</b>`;
  const head = header(ctx, {
    homeHref: HOME_URL,
    links: [
      ["Plugins", "#plugins", "hide-sm"],
      ["Mixing", "#mixing", "hide-sm"],
      ["Contact", "#contact", "hide-sm"],
      ["Store", ctx.storeBase, "store"],
    ],
  });
  const body = `  <main>
  <section class="hero">
    <div class="wrap">
      <div>
        <p class="eyebrow rise">Bombest Audio</p>
        <h1 class="h1 rise d1"><span>Professional mixing.</span><span>Boutique plugins.</span><span class="dim">Sonic experiments.</span></h1>
        <p class="lede rise d2">Detroit grit, hustle, and muscle. I mix funk, hip hop, rap and R&amp;B, and I build the plugins I want on those mixes. ${beta}</p>
        <div class="actions rise d3">
          <a class="btn" href="${ctx.storeBase}">Shop plugins</a>
          <a class="btn btn-ghost" href="${MIXING_URL}" rel="noopener">Book a mix</a>
        </div>
      </div>
      <div class="mark-wrap spin-in"><img src="${asset(ctx, "images/bombest-mark-dark.svg")}" alt="" width="380" height="380" /></div>
    </div>
  </section>

  <section class="section" id="plugins">
    <div class="wrap">
${unit("01", "Plugins", products.map((p) => productCard(ctx, p)).join("\n"), `<a href="${ctx.storeBase}">All plugins</a>`)}
    </div>
  </section>

  <section class="section" id="mixing">
    <div class="wrap">
${unit(
  "02",
  "Mixing",
  `        <div class="split">
          <div class="stack">
            <h3 class="h2">Mixes that hit.</h3>
            <div class="rule"></div>
            <p class="copy">I mix the same music I build these tools for: funk, hip hop, rap and R&amp;B. Energy, punch and character first, then everything sits where it should.</p>
            <div class="actions"><a class="btn" href="${MIXING_URL}" rel="noopener">Book me on EngineEars</a></div>
          </div>
          <ol class="steps-list">
            <li><strong>Book on EngineEars</strong>Pick a service on my page and tell me about the song.</li>
            <li><strong>Send the stems</strong>Consolidated from bar one, dry, with any processing you want kept printed. Add a reference or two.</li>
            <li><strong>Get the mix</strong>A first pass, then revisions until it feels right.</li>
          </ol>
        </div>`,
  `<a href="${MIXING_URL}" rel="noopener">EngineEars</a>`
)}
    </div>
  </section>

  <section class="section last" id="contact">
    <div class="wrap">
${unit(
  "03",
  "Contact",
  `        <div class="contact">
          <div class="stack tight">
            <p class="copy">Plugin support, collaborations, anything else.</p>
            <a class="email" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
          </div>
          <a class="btn btn-ghost" href="${ctx.storeBase}">Shop plugins</a>
        </div>`
)}
    </div>
  </section>
  </main>`;

  return layout({
    ctx,
    title: "Bombest Audio",
    description: "Bombest Audio: professional mixing, boutique plugins and sonic experiments from Thomas Phillips.",
    canonical: HOME_URL,
    image: ctx.assets[first?.image.src2x],
    header: head,
    body,
  });
}

// --- store pages -------------------------------------------------------------

function storeHome(ctx, products) {
  const body = `  <main>
  <section class="hero">
    <div class="wrap">
      <div>
        <p class="eyebrow rise">Bombest Audio plugins</p>
        <h1 class="h1 rise d1"><span>Boutique plugins</span><span>that look good</span><span class="dim">and put in work.</span></h1>
        <p class="lede rise d2">Plugins I build for funk, hip hop, rap and R&amp;B. Every one has a free trial, so put it on your own mix before you buy.</p>
        <div class="actions rise d3">
          <a class="btn" href="#plugins">See the plugins</a>
          <a class="btn btn-ghost" href="${HOME_URL}">Bombest Audio</a>
        </div>
      </div>
      <div class="mark-wrap spin-in"><img src="${asset(ctx, "images/bombest-mark-dark.svg")}" alt="" width="380" height="380" /></div>
    </div>
  </section>

  <section class="section last" id="plugins">
    <div class="wrap">
${unit("01", "Plugins", products.map((p) => productCard(ctx, p)).join("\n"))}
    </div>
  </section>
  </main>`;

  return layout({
    ctx,
    title: "Plugins | Bombest Audio",
    description: "Boutique audio plugins from Bombest Audio. Every one has a free trial.",
    canonical: SITE_URL,
    image: ctx.assets[products[0]?.image.src2x],
    header: storeHeader(ctx),
    body,
  });
}

function buyBox(ctx, p) {
  const buy = ctx.open ? linkFor(ctx.config, p.buyLinkKey) : null;
  const trial = ctx.open ? linkFor(ctx.config, p.installerKey) : null;
  const buttons = [];
  if (buy) buttons.push(`<a class="btn" href="${esc(buy)}" rel="noopener">Buy for ${money(p)}</a>`);
  if (trial) buttons.push(`<a class="btn btn-ghost" href="${esc(trial)}">Download free trial</a>`);
  const codeNote = buy && p.stage ? `<p class="fine">Beta tester? Click "Add code" at checkout and enter the code I sent you.</p>` : "";

  let soon = "";
  if (!buy && !trial) {
    soon = `The ${esc(stageLabel(p) || "store")} download and checkout open soon. Want to know when? Email me at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.`;
  } else if (!buy) {
    soon = "Checkout opens soon. Grab the free trial in the meantime.";
  } else if (!trial) {
    soon = "The free trial download is coming soon.";
  }

  return [buttons.length ? `<div class="actions">${buttons.join("")}</div>` : "", codeNote, soon ? `<p class="soon">${soon}</p>` : ""]
    .filter(Boolean)
    .join("\n          ");
}

function productPage(ctx, p) {
  const name = esc(p.name);
  const controls = p.controls
    .map(
      (c) =>
        `          <div class="control"><dt><span class="name">${esc(c.name)}</span><span class="range">${esc(c.range)}</span></dt><dd>${esc(c.text)}</dd></div>`
    )
    .join("\n");
  const presets = p.presets
    .map((g) => `          <div><h3>${esc(g.category)}</h3><ul>${g.names.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>`)
    .join("\n");
  const specs = p.specs.map(([k, v]) => `          <tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("\n");
  const formats = p.specs.find(([k]) => k === "Formats")?.[1] ?? "";
  const section = (id, num, label, inner, cls = "") =>
    `  <section class="section${cls}" id="${id}">
    <div class="wrap">
${unit(num, label, `        <div class="unit-body">\n${inner}\n        </div>`)}
    </div>
  </section>`;

  const body = `  <main>
  <section class="product-hero">
    <div class="wrap">
      <figure class="panel">${productImage(ctx, p, "(max-width: 900px) 100vw, 640px")}</figure>
      <div class="product-head">
        <p class="kicker">${esc(p.kind)}</p>
        <h1>${name}</h1>
        <p class="tag flush">${esc(p.tagline)}</p>
        <p class="price-row"><span class="price">${money(p)}<small>${esc(p.currency)}</small></span>${stageLabel(p) ? `<span class="badge">${esc(stageLabel(p))}</span>` : ""}</p>
          ${buyBox(ctx, p)}
        <p class="fine">${esc(formats.replace(/, (?=[^,]*$)/, " and "))} for macOS, Apple Silicon and Intel. One license covers ${p.seats} computers.</p>
      </div>
    </div>
  </section>

${section("about", "01", "What it is", `          <div class="prose">\n${p.intro.map((t) => `            <p>${esc(t)}</p>`).join("\n")}\n          </div>`)}

${section("controls", "02", "Controls", `          <p class="section-lede">Everything is on the face. No menus.</p>\n          <dl class="controls">\n${controls}\n          </dl>`)}

${section("presets", "03", "Presets", `          <p class="section-lede">${esc(p.presetsIntro)}</p>\n          <div class="presets">\n${presets}\n          </div>`)}

${section(
  "license",
  "04",
  "How the license works",
  `          <p class="section-lede">No serial keys to copy and paste.</p>
          <ol class="steps">
            <li><strong>Try it.</strong>Download the free trial and install it. ${name} runs as a demo: every control works, but the audio drops out for about a second every 30 seconds.</li>
            <li><strong>Buy it and it unlocks.</strong>Buy from the Unlock button inside the plugin and it unlocks by itself. Buy here, then open ${name}, click Unlock and sign in with the email you paid with.</li>
            <li><strong>Use it on ${p.seats} computers.</strong>One license covers ${p.seats} computers. On another computer, open ${name}, click Unlock and sign in with your purchase email. Getting a new machine? Open Manage in the plugin and deactivate the old one first.</li>
          </ol>`
)}

${section("specs", "05", "Specs", `          <table class="specs">\n${specs}\n          </table>`)}

${section(
  "support",
  "06",
  "Support",
  `          <div class="prose">
            <p>Questions, or something not working right? Email me at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and I'll get back to you.</p>
          </div>
          <div class="buy-again">
          ${buyBox(ctx, p)}
          </div>`,
  " last"
)}
  </main>`;

  return layout({
    ctx,
    title: `${p.name} - ${p.kind} | Bombest Audio`,
    description: p.description,
    canonical: `${SITE_URL}${p.slug}/`,
    image: ctx.assets[p.image.src2x],
    header: storeHeader(ctx),
    body,
  });
}

function notFoundPage(ctx) {
  const body = `  <main class="lost">
    <h1>Nothing here</h1>
    <p>That page doesn't exist. The plugins are this way.</p>
    <a class="btn" href="${ctx.base}#plugins">See the plugins</a>
  </main>`;
  return layout({ ctx, title: "Not found | Bombest Audio", description: "Page not found.", header: storeHeader(ctx), body, noindex: true });
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

  const open = config.STORE_OPEN === true;
  const ctx = { base: target.base, storeBase: target.base, assets, config, open };
  write(path.join(out, "index.html"), storeHome(ctx, products));
  for (const p of products) write(path.join(out, p.slug, "index.html"), productPage(ctx, p));
  write(path.join(out, "404.html"), notFoundPage(ctx));

  // The bom.best home page sits one level up, at dist/bom-best/index.html, and
  // borrows the store's fingerprinted assets under /audio/assets/.
  if (target.home) write(path.join(out, "..", "index.html"), bomBestHome(ctx, products));

  console.log(`built ${targetName} -> ${path.relative(ROOT, out)} (base ${target.base}, ${products.length} product(s)${target.home ? ", plus the bom.best home page" : ""})`);
  if (!open) console.log("  note: STORE_OPEN is false; buy and download buttons are hidden");
}

const i = process.argv.indexOf("--target");
const which = i > 0 ? [process.argv[i + 1]] : Object.keys(TARGETS);
for (const t of which) build(t);
