// One-file build of the quest CLI: `npm run quest:bundle` writes bundle/quest-cli.mjs (schema inside).
// Needs only Node 20.11+ to run: node quest-cli.mjs build|remove|verify|normalize|schema ... (docs/quest-cli.md).
// The Q-nwn-manager vendors this file (nwn-tools/quest-cli.mjs there); refresh it with this script.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(root, "docs", "quest-spec.schema.json"), "utf8"));
const outfile = path.join(root, "bundle", "quest-cli.mjs");

await build({
  entryPoints: [path.join(root, "src", "cli", "quest.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  define: { __QUEST_SCHEMA__: JSON.stringify(schema), __QUEST_VERSION__: JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version) },
  // CommonJS dependencies inside an ES module bundle need require().
  banner: { js: "import { createRequire as __cr } from 'node:module';\nconst require = __cr(import.meta.url);" },
  legalComments: "none",
  logLevel: "warning",
});
fs.chmodSync(outfile, 0o755);
console.log(`${outfile} (${Math.round(fs.statSync(outfile).size / 1024)} KB)`);
