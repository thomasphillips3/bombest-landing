# Bombest Audio site and store

The Bombest Audio home page and plugin store. One build, two places:

| Where | How it's served | Base path |
|---|---|---|
| https://www.bombestaudio.com | GitHub Pages, deployed by `.github/workflows/pages.yml` | `/` |
| https://bom.best/audio | A Cloudflare Worker on the route `bom.best/audio*` (`cloudflare/`) | `/audio/` |

bom.best itself stays on S3/CloudFront behind Cloudflare. The Worker only answers `/audio` paths.

## Layout

| Path | What it is |
|---|---|
| `data/products.json` | Every product in the store. Add an entry here to add a product: the home page lists it and it gets its own page at `/<slug>/` |
| `store.config.json` | The live links: `STRIPE_PAYMENT_LINK` and `INSTALLER_URL`. A product names which keys it uses (`buyLinkKey`, `installerKey`) |
| `site/styles.css`, `site/images/` | Styles and images. The build fingerprints them into `assets/` so they can be cached forever |
| `site/static/` | Copied as-is to both builds (favicon) |
| `site/www-only/` | Copied only to the GitHub Pages build (CNAME, .nojekyll, the original logo URL) |
| `scripts/build.mjs` | Builds `dist/www` and `dist/bom-best/audio`. No dependencies |
| `scripts/check-config.mjs` | The deploy gate. Fails while any link is empty, not https, or still `REPLACE_ME` |
| `scripts/check-links.mjs` | Checks every internal link in both builds resolves |
| `cloudflare/` | The Worker, `wrangler.jsonc` and its own `package.json` |

## Links that aren't set yet

While a product's payment link or installer URL is a placeholder:

- the build leaves that button off the page and says the store opens soon, so nobody clicks a dead link;
- `scripts/check-config.mjs` exits 1, which stops the Pages workflow and the Worker deploy script.

Fill both in `store.config.json`, run `node scripts/check-config.mjs`, and it says "Ready to deploy".

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

That runs the config check, builds the `/audio/` target and runs `wrangler deploy`.

## Contact

thomas@bom.best

© Bombest LLC
