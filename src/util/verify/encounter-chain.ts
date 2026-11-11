/**
 * verify_encounter_chain (TODO #21): the static half of multi-part encounters. A spawn (a stage's `questK_spawn*` variables, a dialog
 * line's `spawn=` parameters, a check's `pass_spawn`/`fail_spawn`) must have a waypoint to spawn at, a blueprint to create, and a stage
 * that actually advances to trigger it; two spawns sharing a key mean the second never happens; a spawned group that advances no stage
 * is a fight with no story consequence.
 */

import type { GffObj } from "../../types/gff.js";
import { getFieldStr } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { getVarTableEntries } from "../git-helpers.js";
import type { Report } from "./common.js";
import { listOf } from "./common.js";
import { dialogUses, gitObjects } from "./story-consequences.js";

interface Spawn {
  /** Where it is declared, for messages. */
  source: string;
  resref: string;
  at: string;
  key: string;
  tag: string;
  /** Variable-form spawns hang on a stage: the owner's `questK` variable must exist. */
  stageVar?: { owner: GffObj; slot: string };
}

function wantedWaypoints(index: ModuleIndex): Set<string> {
  const tags = new Set<string>();
  for (const area of index.areas.keys()) {
    const git = index.parsedGff.get(`${area}.git`) as GffObj | undefined;
    if (git) for (const w of listOf(git, "WaypointList")) tags.add(getFieldStr(w, "Tag").toLowerCase());
  }
  return tags;
}

function varSpawns(obj: GffObj, label: string): Spawn[] {
  const vars = new Map(getVarTableEntries(obj).map((v) => [v.name.toLowerCase(), v.value]));
  const out: Spawn[] = [];
  for (const [name, value] of vars) {
    const m = /^quest(\d{1,2})_spawn$/.exec(name);
    if (!m || typeof value !== "string" || !value) continue;
    const slot = m[1];
    out.push({
      source: label,
      resref: value.toLowerCase(),
      at: String(vars.get(`quest${slot}_spawn_at`) ?? "").toLowerCase(),
      key: String(vars.get(`quest${slot}_spawn_key`) ?? ""),
      tag: String(vars.get(`quest${slot}_spawn_tag`) ?? "").toLowerCase(),
      stageVar: { owner: obj, slot },
    });
  }
  return out;
}

function collect(index: ModuleIndex): Spawn[] {
  const out: Spawn[] = [];
  for (const { area, list, obj } of gitObjects(index)) out.push(...varSpawns(obj, `${area}:${getFieldStr(obj, "Tag")} (${list})`));
  for (const [key, entry] of index.resources) {
    if (!["utc", "utp", "utt", "are"].includes(entry.extension)) continue;
    const doc = index.parsedGff.get(key) as GffObj | undefined;
    if (doc) out.push(...varSpawns(doc, key));
  }
  for (const u of dialogUses(index)) {
    for (const p of u.actionParams) {
      for (const prefix of ["", "pass_", "fail_"]) {
        const resref = p[`${prefix}spawn`];
        if (resref) out.push({ source: `dialog ${u.dialog}`, resref: resref.toLowerCase(), at: (p[`${prefix}at`] ?? p.at ?? "").toLowerCase(), key: p.spawn_key ?? "", tag: (p.spawn_tag ?? "").toLowerCase() });
      }
    }
  }
  return out;
}

export function verifyEncounterChain(report: Report, index: ModuleIndex): void {
  const spawns = collect(index);
  const waypoints = wantedWaypoints(index);
  const keys = new Map<string, string>();
  for (const s of spawns) {
    if (!s.at) {
      report.error("chain_spawn_no_waypoint", `${s.source}: spawn of "${s.resref}" names no waypoint, so nothing can spawn`, s.source, "give the spawn an `at` waypoint tag (build_quest places one when the stage names an area)");
    } else if (!waypoints.has(s.at)) {
      report.error("chain_spawn_no_waypoint", `${s.source}: spawn of "${s.resref}" at waypoint "${s.at}", but no area has a waypoint with that tag; it logs [QUEST_WARN] and spawns nothing`, s.source, "place_waypoint with that tag on walkable ground");
    }
    if (!index.resources.has(`${s.resref}.utc`)) {
      report.warn("chain_spawn_no_blueprint", `${s.source}: spawn of "${s.resref}", which is not a creature blueprint in the module (fine if it is a base-game palette creature; check the resref)`, s.source);
    }
    if (s.stageVar && !getVarTableEntries(s.stageVar.owner).some((v) => v.name.toLowerCase() === `quest${s.stageVar?.slot}`)) {
      report.error("chain_spawn_no_stage", `${s.source}: has spawn variables for slot ${s.stageVar.slot} but no quest${s.stageVar.slot} variable, so the stage never advances and the group never spawns`, s.source, "rebuild the quest with build_quest");
    }
    if (s.key) {
      const other = keys.get(s.key);
      if (other && other !== s.source) report.warn("chain_spawn_duplicate_key", `${s.source} and ${other} share spawn key "${s.key}"; a key spawns once, so the second never happens`, s.source, "give each spawn its own spawn_key");
      keys.set(s.key, s.source);
    }
    const bp = index.parsedGff.get(`${s.resref}.utc`) as GffObj | undefined;
    if (bp && !getVarTableEntries(bp).some((v) => /^quest\d{1,2}$/i.test(v.name))) {
      report.warn("chain_spawn_advances_nothing", `${s.source}: the spawned "${s.resref}" carries no quest variable, so beating it advances no stage. A fight that changes nothing in the story is easy to skip`, s.source, "make it a kill stage of the quest (build_quest kill target) or give it a consequence");
    }
  }
}
