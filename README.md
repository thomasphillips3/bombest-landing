# Bombest Audio site and store

The Bombest Audio home page and plugin store:

| Where | What | How it's served | Base path |
|---|---|---|---|
| https://bom.best | The Bombest Audio home page | The Cloudflare Worker, on the route `bom.best/` (the root alone) | `/` |
| https://bom.best/audio | The store | The same Worker, on the route `bom.best/audio*` (`cloudflare/`) | `/audio/` |
| https://www.bombestaudio.com | The store | GitHub Pages, deployed by `.github/workflows/pages.yml` | `/` |

The rest of bom.best, `/beats` included, stays on S3/CloudFront behind Cloudflare. The Worker answers only the root and `/audio` paths and passes everything else through.

## Layout

| Path | What it is |
|---|---|
| `data/products.json` | Every product in the store. Add an entry here to add a product: the home page lists it and it gets its own page at `/<slug>/` |
| `store.config.json` | `STORE_OPEN` and the live links: `STRIPE_PAYMENT_LINK` and `INSTALLER_URL`. A product names which keys it uses (`buyLinkKey`, `installerKey`) |
| `site/styles.css`, `site/images/` | Styles and images. The build fingerprints them into `assets/` so they can be cached forever |
| `site/static/` | Copied as-is to both builds (favicon) |
| `site/www-only/` | Copied only to the GitHub Pages build (CNAME, .nojekyll, the original logo URL) |
| `scripts/build.mjs` | Builds `dist/www`, `dist/bom-best/audio` and the bom.best home page at `dist/bom-best/index.html`. No dependencies |
| `scripts/check-config.mjs` | The deploy gate. With the store open it fails while any link is empty, not https, or still `REPLACE_ME`; with the store closed it only fails on a filled-in link that isn't a real https URL |
| `scripts/check-links.mjs` | Checks every internal link in both builds resolves |
| `cloudflare/` | The Worker, `wrangler.jsonc` and its own `package.json` |

## Opening the store

`STORE_OPEN` in `store.config.json` is the switch.

- **`false`** (now): the store ships as "coming soon". No product page shows a Buy or Download button; each says the beta opens soon and gives the email address. Placeholder links are allowed.
- **`true`**: Buy and Download buttons appear, and `scripts/check-config.mjs` refuses every deploy until each product's payment link and installer URL is a real https URL.

To open it: put the notarized installer's URL in `INSTALLER_URL`, set `STORE_OPEN` to `true`, run `node scripts/check-config.mjs` until it says "Ready to deploy", then deploy both places.

## Local

```bash
node scripts/build.mjs && node scripts/check-links.mjs
python3 -m http.server 8080 --directory dist/www          # http://127.0.0.1:8080/
cd cloudflare && npm install && npm run dev               # http://127.0.0.1:8787/audio/
```

## Deploying

**GitHub Pages:** Settings > Pages > Source has to be "GitHub Actions" (it used to deploy straight from the root of `main`). After that, every push to `main` runs the config check, builds and deploys. If the check fails, the live site stays as it was.

**Cloudflare Worker**, from the repo root, logged in to the Cloudflare account that has the bom.best zone:

```bash
cd cloudflare && npm install && cd .. && npm run deploy:worker
```

That runs the config check, builds the `/audio/` target and the bom.best home page, and runs `wrangler deploy`.

## Contact

thomas@bom.best

© Bombest LLC
