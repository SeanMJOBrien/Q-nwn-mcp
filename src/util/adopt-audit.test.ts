import { listNotRecorded } from "./adopt.js";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { adventureBase, ensureAdventureDir, slugTitle } from "./adventure-dir.js";
import { buildAdoptedAdventure, hasStoryContent } from "./adopt.js";
import { buildAudit, gapList } from "./audit.js";
import { FOCUS, FOCUS_GUIDE, defaultFocus } from "./focus.js";
import type { AreaSnap, ModuleSnapshot } from "./module-snapshot.js";
import { parseSections, requiredFor } from "./phase-check.js";

function area(over: Partial<AreaSnap> = {}): AreaSnap {
  return {
    resref: "gate",
    name: "The Gate",
    tileset: "tcn01",
    width: 8,
    height: 8,
    isInterior: false,
    creatures: [],
    placeables: 0,
    sounds: 0,
    waypoints: 0,
    doors: 0,
    triggers: 0,
    events: { fights: 0, usables: 0, triggers: 0, talkers: 0, total: 0 },
    stores: 0,
    transitionsTo: [],
    ...over,
  };
}
function snap(over: Partial<ModuleSnapshot> = {}): ModuleSnapshot {
  return {
    title: "The Salt Gate Conspiracy",
    description: "",
    entryArea: "gate",
    areas: [area()],
    unreachableAreas: [],
    quests: [],
    dialogCount: 0,
    itemBlueprints: 0,
    storeBlueprints: 0,
    scripts: 0,
    uncompiledScripts: [],
    hasRewardSystem: false,
    hasQuestSystem: false,
    ...over,
  };
}
const orc = { tag: "orc", name: "Orc", level: 3, hostile: true, conversation: "", area: "gate", x: 0, y: 0 };
const mira = { tag: "mira", name: "Mira", level: 1, hostile: false, conversation: "mira_dlg", area: "gate", x: 0, y: 0 };

describe("slugTitle", () => {
  it("dashes the title", () => {
    expect(slugTitle("The Salt Gate Conspiracy")).toBe("The-Salt-Gate-Conspiracy");
    expect(slugTitle("  Harvest of Bones!! ")).toBe("Harvest-of-Bones");
    expect(slugTitle("../../etc")).toBe("etc");
    expect(slugTitle("???")).toBe("Untitled-Module");
  });
});

describe("ensureAdventureDir", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    delete process.env.MCP_FOLDER_ADVENTURES;
    for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true });
  });
  it("creates the titled folder and moves legacy files out of the temp dir", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "adv-"));
    dirs.push(root);
    process.env.MCP_FOLDER_ADVENTURES = path.join(root, "adventures");
    const tempDir = path.join(root, "temp");
    await fs.mkdir(tempDir);
    await fs.writeFile(path.join(tempDir, "adventure.md"), "# Adventure: X\n");
    await fs.writeFile(path.join(tempDir, "dm-guide.md"), "guide");
    const dir = await ensureAdventureDir({ moduleName: "The Salt Gate Conspiracy", tempDir });
    expect(dir).toBe(path.join(root, "adventures", "The-Salt-Gate-Conspiracy"));
    expect(await fs.readFile(path.join(dir, "The-Salt-Gate-Conspiracy.md"), "utf8")).toBe("# Adventure: X\n");
    await expect(fs.access(path.join(tempDir, "adventure.md"))).rejects.toThrow();
    // A second call leaves an existing copy alone.
    await fs.writeFile(path.join(tempDir, "adventure.md"), "newer legacy");
    await ensureAdventureDir({ moduleName: "The Salt Gate Conspiracy", tempDir });
    expect(await fs.readFile(path.join(dir, "The-Salt-Gate-Conspiracy.md"), "utf8")).toBe("# Adventure: X\n");
  });
  it("renames the untitled files an older run left in the adventure folder to the title-based names", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "adv-"));
    dirs.push(root);
    process.env.MCP_FOLDER_ADVENTURES = path.join(root, "adventures");
    const tempDir = path.join(root, "temp");
    await fs.mkdir(tempDir);
    const dir = path.join(root, "adventures", "Two-Words");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "adventure.md"), "story");
    await fs.writeFile(path.join(dir, "dm-guide.md"), "guide");
    await fs.writeFile(path.join(dir, "adventure-status.json"), "{}");
    await ensureAdventureDir({ moduleName: "Two Words", tempDir });
    expect(await fs.readFile(path.join(dir, "Two-Words.md"), "utf8")).toBe("story");
    expect(await fs.readFile(path.join(dir, "Two-Words-dm-guide.md"), "utf8")).toBe("guide");
    expect(await fs.readFile(path.join(dir, "Two-Words-status.json"), "utf8")).toBe("{}");
    await expect(fs.access(path.join(dir, "adventure.md"))).rejects.toThrow();
  });
  it("defaults to a git-ignored adventures folder in the repo", () => {
    expect(adventureBase().endsWith(`${path.sep}adventures`)).toBe(true);
  });
});

describe("focus guide", () => {
  it("has a guide for every focus, naming real skills", async () => {
    // nwn-logic-debug is a user-level skill (~/.claude/skills), not part of this repo.
    const skills = new Set([...(await fs.readdir(path.join(__dirname, "..", "..", ".claude", "skills"))), "nwn-logic-debug"]);
    for (const f of FOCUS) {
      const g = FOCUS_GUIDE[f];
      expect(g.explain.length).toBeGreaterThan(20);
      expect(g.firstCalls.length).toBeGreaterThan(0);
      for (const s of g.skills) expect(skills.has(s), `${f}: skill ${s}`).toBe(true);
    }
  });
  it("nwscript_only implies scripting", () => {
    expect(defaultFocus("nwscript_only")).toBe("scripting");
    expect(defaultFocus("whole_adventure")).toBeUndefined();
  });
});

describe("buildAdoptedAdventure", () => {
  it("writes only the sections the module has content for and lists the gaps", () => {
    const r = buildAdoptedAdventure(snap({ areas: [area({ creatures: [orc, mira], placeables: 4 })], quests: [{ tag: "q", name: "Q", entries: 2, hasEnd: true }] }), null);
    const sections = parseSections(r.markdown);
    for (const name of ["Module", "Plot", "Areas", "Environment", "Actors", "Quests", "Challenges"]) expect(sections.get(name), name).toBeTruthy();
    expect(sections.has("Affordances")).toBe(false);
    expect(r.gaps).toEqual(["affordances", "polish", "rewards"]);
    expect(r.markdown).toContain("- **Target Level:** 3");
    expect(r.markdown).toContain("(not recorded)");
    expect(r.notRecorded).toContain("Premise");
  });
  it("a phase's start check names the missing section, which is how a gap shows up", () => {
    const r = buildAdoptedAdventure(snap({ areas: [area({ creatures: [orc] })] }), null);
    const missing = requiredFor("quests", []).filter((n) => !parseSections(r.markdown).get(n));
    expect(missing).toEqual(["Environment", "Actors"]);
  });
  it("uses the module description as the premise and keeps recorded scope lines", () => {
    const existing = "# Adventure: X\n\n## Module\n- **Scope:** only quests\n- **Skip phases:** areas\n";
    const r = buildAdoptedAdventure(snap({ description: "Salt smugglers hold the gate." }), existing);
    expect(r.markdown).toContain("Salt smugglers hold the gate.");
    expect(r.notRecorded).not.toContain("Premise");
    expect(r.markdown).toContain("- **Scope:** only quests");
    expect(r.markdown).toContain("- **Skip phases:** areas");
  });
  it("hasStoryContent ignores an adventure.md that only has the Module section", () => {
    expect(hasStoryContent(null)).toBe(false);
    expect(hasStoryContent("# A\n\n## Module\n- **Scope:** x\n")).toBe(false);
    expect(hasStoryContent("# A\n\n## Module\nm\n\n## Plot\np\n")).toBe(true);
  });
});

describe("buildAudit", () => {
  const verify = { all: { errors: 0, warnings: 0, top: [] } };
  const story = { exists: true, notRecorded: 0, errors: 0, warnings: 0 };
  const state = (rows: ReturnType<typeof buildAudit>, phase: string) => rows.find((r) => r.phase === phase)?.state;

  it("an empty module is missing everything but has nothing to compile", () => {
    const rows = buildAudit({ snapshot: snap({ areas: [] }), verify, story: { ...story, exists: false }, dmGuideExists: false });
    expect(state(rows, "plot")).toBe("missing");
    expect(state(rows, "areas")).toBe("missing");
    expect(state(rows, "quests")).toBe("missing");
    expect(rows.find((r) => r.focus === "scripting")?.state).toBe("not_applicable");
  });
  it("reports partial work with evidence, in pipeline order", () => {
    const rows = buildAudit({
      snapshot: snap({
        areas: [area({ creatures: [orc], placeables: 3, sounds: 1 }), area({ resref: "cave", name: "Cave" })],
        unreachableAreas: ["cave"],
        quests: [{ tag: "q", name: "Salt", entries: 2, hasEnd: false }],
        uncompiledScripts: ["a_x"],
        scripts: 3,
      }),
      verify: { all: { errors: 2, warnings: 1, top: ["empty_featlist x2"] }, actors: { errors: 0, warnings: 0, top: [] } },
      story: { exists: true, notRecorded: 4, errors: 0, warnings: 0 },
      dmGuideExists: false,
    });
    expect(rows.map((r) => r.phase).filter(Boolean)).toEqual(["plot", "areas", "environment", "actors", "quests", "challenges", "affordances", "polish", "rewards"]);
    expect(state(rows, "plot")).toBe("partial");
    expect(state(rows, "areas")).toBe("partial");
    expect(rows.find((r) => r.phase === "areas")?.findings.join(" ")).toContain("cave");
    expect(state(rows, "quests")).toBe("partial");
    expect(state(rows, "polish")).toBe("partial");
    expect(rows.find((r) => r.focus === "scripting")?.state).toBe("partial");
    const gaps = gapList(rows);
    expect(gaps.some((g) => g.startsWith("Quests"))).toBe(true);
    expect(gaps.every((g) => g.includes("focus"))).toBe(true);
  });
  it("a finished module is done", () => {
    const rows = buildAudit({
      snapshot: snap({
        areas: [area({ creatures: [orc, mira], placeables: 3, sounds: 1, stores: 1 })],
        quests: [{ tag: "q", name: "Q", entries: 2, hasEnd: true }],
        dialogCount: 2,
        description: "A story.",
        hasRewardSystem: true,
        itemBlueprints: 2,
        dmArea: { resref: "dm_area", disconnected: true, hasWaypoint: true, chest: true, storyBook: true, guideBook: true },
      }),
      verify,
      story,
      dmGuideExists: true,
    });
    for (const r of rows) expect(["done", "not_applicable"], r.category).toContain(r.state);
  });
  it("the DM area rule: missing, then partial with each defect named, then done", () => {
    const dm = (over = {}) => buildAudit({ snapshot: snap({ dmArea: { resref: "dm_area", disconnected: true, hasWaypoint: true, chest: true, storyBook: true, guideBook: true, ...over } }), verify, story, dmGuideExists: true }).find((r) => r.category === "DM area and books");
    const none = buildAudit({ snapshot: snap({}), verify, story, dmGuideExists: true }).find((r) => r.category === "DM area and books");
    expect(none?.state).toBe("missing");
    expect(dm()?.state).toBe("done");
    const bad = dm({ disconnected: false, guideBook: false });
    expect(bad?.state).toBe("partial");
    expect(bad?.findings.join(" ")).toMatch(/reachable by players/);
    expect(bad?.findings.join(" ")).toMatch(/DM guide book/);
  });
});

describe("countFights", () => {
  it("groups hostiles standing together into one fight", async () => {
    const { countFights } = await import("./module-snapshot.js");
    expect(countFights([])).toBe(0);
    expect(countFights([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 5 }])).toBe(1);
    expect(countFights([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toBe(2);
  });
});

describe("listNotRecorded", () => {
  it("names the heading and field of every (not recorded)", () => {
    const md = "## Plot\n\n### Premise\n(not recorded) The module has no description.\n\n#### Chief Gorrukh\n- **Role:** (not recorded)\n- **Motivation:** (not recorded)\n- **Dialog:** dlg_g\n";
    expect(listNotRecorded(md)).toEqual([
      { where: "Premise", field: "(text)" },
      { where: "Chief Gorrukh", field: "Role" },
      { where: "Chief Gorrukh", field: "Motivation" },
    ]);
  });
});

