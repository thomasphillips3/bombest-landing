// Shared by build.mjs and check-config.mjs: reads the product data and the store
// config, and decides whether a link is real or still a placeholder.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

export function loadStore() {
  const config = readJson("store.config.json");
  const { products } = readJson("data/products.json");
  return { config, products };
}

// A link counts as set only when it is an https URL with no placeholder in it.
// Anything else means the button stays hidden and deploys are refused.
export function linkProblem(value) {
  if (typeof value !== "string" || value.trim() === "") return "is empty";
  if (/REPLACE_ME/i.test(value)) return "is still the placeholder";
  let url;
  try {
    url = new URL(value);
  } catch {
    return "is not a valid URL";
  }
  if (url.protocol !== "https:") return "is not https";
  return null;
}

export function linkFor(config, key) {
  const value = config[key];
  return linkProblem(value) ? null : value;
}
