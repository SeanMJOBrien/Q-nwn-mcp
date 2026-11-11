import { describe, expect, it } from "vitest";
import type { GffObj } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { Report } from "./common.js";
import { verifyEncounterChain } from "./encounter-chain.js";

const str = (v: string) => ({ type: "cexostring", value: v });
const list = (v: unknown[]) => ({ type: "list", value: v });
const vars = (o: Record<string, string>) => list(Object.entries(o).map(([k, v], i) => ({ __struct_id: i, Name: str(k), Type: { type: "dword", value: 3 }, Value: str(v) })));

function build(opts: { waypoint?: boolean; stage?: boolean; blueprintQuest?: boolean; dupKey?: boolean }): ModuleIndex {
  const lookout = { Tag: str("lookout"), VarTable: vars({ ...(opts.stage === false ? {} : { quest1: "2_q_a" }), quest1_spawn: "main_force", quest1_spawn_at: "wp_force", quest1_spawn_key: "q_a_2", quest1_spawn_tag: "force" }) };
  const second = opts.dupKey ? { Tag: str("scout"), VarTable: vars({ quest1: "3_q_a", quest1_spawn: "main_force", quest1_spawn_at: "wp_force", quest1_spawn_key: "q_a_2" }) } : undefined;
  const git = { "Creature List": list([lookout, ...(second ? [second] : [])]), WaypointList: list(opts.waypoint === false ? [] : [{ Tag: str("wp_force") }]) } as unknown as GffObj;
  const blueprint = { VarTable: vars(opts.blueprintQuest === false ? {} : { quest1: "3_q_a" }) } as unknown as GffObj;
  return {
    areas: new Map([["a1", {}]]),
    parsedGff: new Map<string, GffObj>([["a1.git", git], ["main_force.utc", blueprint]]),
    resources: new Map([["main_force.utc", { resref: "main_force", extension: "utc", filePath: "", sizeBytes: 1 }]]),
  } as unknown as ModuleIndex;
}
const codes = (idx: ModuleIndex) => {
  const r = new Report("t", "chain");
  verifyEncounterChain(r, idx);
  return [...r.errors, ...r.warnings].map((f) => f.code);
};

describe("verifyEncounterChain", () => {
  it("a complete chain is quiet", () => expect(codes(build({}))).toEqual([]));
  it("a missing waypoint is an error", () => expect(codes(build({ waypoint: false }))).toContain("chain_spawn_no_waypoint"));
  it("spawn variables without a stage variable never fire", () => expect(codes(build({ stage: false }))).toContain("chain_spawn_no_stage"));
  it("a spawned group that advances nothing, and a shared key, are warned", () => {
    expect(codes(build({ blueprintQuest: false }))).toContain("chain_spawn_advances_nothing");
    expect(codes(build({ dupKey: true }))).toContain("chain_spawn_duplicate_key");
  });
});
