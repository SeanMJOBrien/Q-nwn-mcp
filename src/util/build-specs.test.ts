import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { registerAll } from "../register-all.js";
import { SPEC_KINDS, loadSpecSchema, specToToolCalls, validateSpec } from "./spec-validate.js";

/** Parameter shapes of every registered tool: name -> zod shape. */
function toolShapes(): Map<string, Record<string, { safeParse: (v: unknown) => { success: boolean } }>> {
  const shapes = new Map();
  registerAll({ tool: (name: string, _d: string, shape: unknown) => void shapes.set(name, shape) } as never);
  return shapes;
}

const companion = {
  resref: "cmp_mira",
  name: "Mira Vell",
  area: "saltmerehbr",
  x: 45.5,
  y: 62,
  race: 6,
  classId: 2,
  level: 5,
  gender: 1,
  domains: [8, 13],
  introduction: "I am Mira, a healer of the harbour shrine.",
  backstory: "I came here after the fever took my village.",
};
const keyNpc = { resref: "boss_harl", name: "Captain Harl", area: "saltgate", x: 80, y: 120, race: 6, classId: 4, level: 7, gender: 0, powerLevel: "tougher" };
const dialog = {
  resref: "dlg_innkeep",
  nodes: [
    {
      speaker: "npc",
      text: "Welcome to the Gull.",
      children: [
        { speaker: "pc", text: "Any news?", children: [{ speaker: "npc", text: "The gate is shut since dawn." }] },
        { speaker: "pc", text: "Goodbye." },
      ],
    },
  ],
};
const journal = {
  tag: "q_gate",
  name: "The Shut Gate",
  xp: 300,
  entries: [
    { id: 10, text: "The gate is shut. Find out why." },
    { id: 20, text: "The gate is open again.", end: true },
  ],
};
const areaLayout = { tileset: "ttf01", width: 16, height: 16, style: { type: "forest", rooms: 3 }, transitionDirections: ["south"] };
const plot = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "..", "docs", "specs", "plot.example.json"), "utf8"));
const examples: Record<string, unknown> = { companion, "key-npc": keyNpc, dialog, journal, "area-layout": areaLayout, plot };

describe("build specs", () => {
  const shapes = toolShapes();

  it("has a schema file and a passing example for every kind", () => {
    for (const kind of Object.keys(SPEC_KINDS)) {
      const schema = loadSpecSchema(kind) as { $ref: string };
      expect(schema.$ref).toBe(`#/definitions/${SPEC_KINDS[kind].type}`);
      expect(validateSpec(kind, examples[kind]), kind).toEqual({ ok: true, errors: [] });
    }
  });

  it("every generated call names a real tool, uses only its parameters and supplies the required ones", () => {
    for (const kind of Object.keys(SPEC_KINDS)) {
      for (const call of specToToolCalls(kind, examples[kind])) {
        const shape = shapes.get(call.tool);
        expect(shape, `${kind}: tool ${call.tool}`).toBeDefined();
        for (const [key, value] of Object.entries(call.args)) {
          expect(shape?.[key], `${call.tool} has no parameter "${key}"`).toBeDefined();
          expect(shape?.[key].safeParse(value).success, `${call.tool}.${key} rejects ${JSON.stringify(value)}`).toBe(true);
        }
        for (const [key, zodType] of Object.entries(shape ?? {})) {
          if (!zodType.safeParse(undefined).success) expect(call.args, `${call.tool} needs "${key}"`).toHaveProperty(key);
        }
      }
    }
  });

  it("every schema property is a parameter of the tool it maps to", () => {
    const single: Record<string, string> = { companion: "build_companion", "key-npc": "build_key_npc", dialog: "create_dialog", "area-layout": "adventure_generate_layout" };
    for (const [kind, tool] of Object.entries(single)) {
      const schema = loadSpecSchema(kind) as { definitions: Record<string, { properties: Record<string, unknown> }> };
      for (const prop of Object.keys(schema.definitions[SPEC_KINDS[kind].type].properties)) {
        expect(shapes.get(tool)?.[prop], `${kind}.${prop} is not a parameter of ${tool}`).toBeDefined();
      }
    }
  });

  it("converts numbers to strings and lists to JSON strings", () => {
    const [call] = specToToolCalls("companion", companion);
    expect(call.tool).toBe("build_companion");
    expect(call.args.x).toBe("45.5");
    expect(call.args.domains).toBe("[8,13]");
    const calls = specToToolCalls("journal", journal);
    expect(calls.map((c) => c.tool)).toEqual(["create_journal", "add_journal_quest", "add_journal_entry", "add_journal_entry"]);
    expect(calls[3].args).toEqual({ questTag: "q_gate", id: "20", text: "The gate is open again.", end: true });
  });

  it("names the failing field", () => {
    const fields = (kind: string, spec: unknown) => validateSpec(kind, spec).errors.map((e) => e.field);
    expect(fields("companion", { ...companion, backstory: undefined })).toEqual(["backstory"]);
    expect(fields("companion", { ...companion, resref: "Way_Too_Long_A_Resref_Name" })).toEqual(["resref"]);
    expect(fields("key-npc", { ...keyNpc, classId: 11 })).toEqual(["classId"]);
    expect(fields("key-npc", { ...keyNpc, hitpoints: 50 })).toEqual(["hitpoints"]);
    expect(fields("key-npc", { ...keyNpc, level: "7" })).toEqual(["level"]);
    expect(fields("key-npc", { ...keyNpc, domains: [1, 2] })).toEqual(["domains"]);
    expect(fields("area-layout", { ...areaLayout, style: { type: "swamp" } })).toEqual(["style.type"]);
    expect(fields("journal", { ...journal, entries: [journal.entries[1], journal.entries[0]] })).toEqual(["entries[1].id", "entries[0].end"]);
  });

  it("checks that dialog lines alternate, with the path of the wrong line", () => {
    const bad = structuredClone(dialog);
    bad.nodes[0].children[0].children = [{ speaker: "pc", text: "And then?" }] as never;
    const { ok, errors } = validateSpec("dialog", bad);
    expect(ok).toBe(false);
    expect(errors).toEqual([{ field: "nodes[0].children[0].children[0].speaker", message: expect.stringContaining('"npc"') }]);
    expect(validateSpec("dialog", { resref: "d", nodes: [{ speaker: "pc", text: "Hi" }] }).errors[0].field).toBe("nodes[0].speaker");
  });
});
