/**
 * NPC feat-package tools (packages.2da FeatPref2DA tables). See util/weapon-packages.ts.
 *
 *   generate_weapon_packages  one package per weapon from a melee and a ranged template
 *   sanitize_feat_package     drop feats a class can never take; add a missing weapon proficiency
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { toI } from "../util/params.js";
import {
  buildWeaponPackage,
  detectTemplateWeapon,
  ensureProficiency,
  formatPackage2DA,
  formatPackagesRows,
  listWeapons,
  type PackagesRowSpec,
  packageFileName,
  parsePackage2DA,
  sanitizePackage,
} from "../util/weapon-packages.js";

function titleCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function registerPackageTools(server: McpServer): void {
  server.tool(
    "generate_weapon_packages",
    "Generate one NPC feat package (packages.2da FeatPref2DA table) per weapon from a template, so an NPC or henchman " +
      "levelled with LevelUpHenchman takes Weapon Focus/Specialization/Improved Critical and the four epic weapon feats " +
      "for its own weapon. Swaps the template weapon's seven baseitems.2da weapon feats for each target's; ranged weapons " +
      "use `rangedTemplate` with Focus/Spec/ImpCrit restored and Rapid Reload added for crossbows; a weapon the class " +
      "isn't automatically proficient with gets that proficiency first (Exotic Weapon Proficiency for bastard sword, " +
      "katana, double weapons...), since the engine refuses to equip it otherwise; feats the class can never take are " +
      "dropped. Writes `<prefix><weapon>.2da` files plus a packages.2da row file to `outDir`. Uses the loaded module's 2DAs.",
    {
      meleeTemplate: z.string().describe("Path to the melee template package 2DA (e.g. gackftfighta.2da)"),
      rangedTemplate: z.string().optional().describe("Path to the ranged template package 2DA (default: melee template)"),
      classId: z.string().describe("classes.2da row the packages are for (4 = Fighter)"),
      outDir: z.string().describe("Directory to write the package files into"),
      prefix: z.string().optional().describe("File name prefix (default 'gackft_'); names are cut to 16 characters"),
      weapons: z.string().optional().describe("JSON array of baseitems.2da rows (default: every weapon)"),
      skillPref: z.string().optional().describe("SkillPref2DA for the packages.2da rows (default GackSKFightA)"),
      startRow: z.string().optional().describe("First packages.2da row number (default 183)"),
      labelPrefix: z.string().optional().describe("packages.2da Label prefix (default GvE_Fighter_)"),
      descriptionStrref: z.string().optional().describe("packages.2da Description strref (default 6933)"),
    },
    { destructiveHint: true },
    async (args) => {
      const index = requireIndex();
      const classId = toI(args.classId);
      const melee = parsePackage2DA(await fs.readFile(path.resolve(args.meleeTemplate), "utf8"));
      const ranged = args.rangedTemplate ? parsePackage2DA(await fs.readFile(path.resolve(args.rangedTemplate), "utf8")) : melee;
      const meleeWeapon = detectTemplateWeapon(index, melee);
      const rangedWeapon = detectTemplateWeapon(index, ranged);
      if (!meleeWeapon || !rangedWeapon) {
        return { content: [{ type: "text", text: "Couldn't find a weapon's feats in a template (is baseitems.2da loaded?)" }], isError: true };
      }
      const wanted = args.weapons ? new Set(JSON.parse(args.weapons) as number[]) : undefined;
      const prefix = args.prefix ?? "gackft_";
      const outDir = path.resolve(args.outDir);
      await fs.mkdir(outDir, { recursive: true });
      const startRow = args.startRow !== undefined ? toI(args.startRow) : 183;
      const results: unknown[] = [];
      const pkgRows: PackagesRowSpec[] = [];
      for (const weapon of listWeapons(index).filter((w) => !wanted || wanted.has(w.baseItem))) {
        const isRanged = weapon.ranged;
        const built = buildWeaponPackage(index, isRanged ? ranged : melee, isRanged ? rangedWeapon : meleeWeapon, weapon, classId);
        const file = packageFileName(prefix, weapon);
        await fs.writeFile(path.join(outDir, `${file}.2da`), formatPackage2DA(built.rows));
        pkgRows.push({
          row: startRow + pkgRows.length,
          label: `${args.labelPrefix ?? "GvE_Fighter_"}${titleCase(weapon.label)}`,
          nameStrref: weapon.nameStrref ?? "****",
          descriptionStrref: args.descriptionStrref ?? 6933,
          classId,
          attribute: isRanged ? "DEX" : "STR",
          gold: 20,
          featPref: file,
          skillPref: args.skillPref ?? "GackSKFightA",
        });
        results.push({
          weapon: weapon.label,
          baseItem: weapon.baseItem,
          file: `${file}.2da`,
          template: isRanged ? "ranged" : "melee",
          feats: built.rows.length,
          added: built.added,
          dropped: built.dropped,
        });
      }
      const rowsFile = `packages_class${classId}_weapons.2da`;
      await fs.writeFile(path.join(outDir, rowsFile), formatPackagesRows(pkgRows));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, outDir, templates: { melee: meleeWeapon.label, ranged: rangedWeapon.label }, packagesRows: rowsFile, packages: results },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "sanitize_feat_package",
    "Clean an NPC feat package 2DA for a class: drop every feat the class can never take (not ALLCLASSESCANUSE and not " +
      "on its cls_feat list, tied to another class by MinLevelClass, or behind a prerequisite that is never available — " +
      "e.g. Weapon Specialization in a Barbarian package), and put the package weapon's proficiency first if the class " +
      "doesn't get one automatically. Writes the file back (or to `outFile`).",
    {
      file: z.string().describe("Path to the package 2DA"),
      classId: z.string().describe("classes.2da row the package is for"),
      outFile: z.string().optional().describe("Write here instead of overwriting `file`"),
    },
    { destructiveHint: true },
    async ({ file, classId, outFile }) => {
      const index = requireIndex();
      const cls = toI(classId);
      const rows = parsePackage2DA(await fs.readFile(path.resolve(file), "utf8"));
      const weapon = detectTemplateWeapon(index, rows);
      const { rows: kept, dropped } = sanitizePackage(index, rows, cls);
      const added = weapon ? ensureProficiency(index, kept, weapon, cls) : [];
      const target = path.resolve(outFile ?? file);
      await fs.writeFile(target, formatPackage2DA(kept));
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: true, file: target, weapon: weapon?.label, feats: kept.length, dropped, added }, null, 2) },
        ],
      };
    },
  );
}
