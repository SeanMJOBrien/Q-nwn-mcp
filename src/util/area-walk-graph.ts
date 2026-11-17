/**
 * Module-level walking reachability on top of util/walk-graph.ts: loading an area's graph (with its walkmeshes),
 * finding objects and transitions, routing across areas, and which ground the player can reach from the module start.
 *
 * Used by `check_path` (tools/path-tools.ts) and by the `object_unreachable` / `area_unreachable` checks of
 * `verify_area` / `verify_all` (util/verify/area.ts).
 */

import type { ResmanOptions } from "../nim-tools.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { getVarTableEntries } from "./git-helpers.js";
import { getTilesetInfo } from "./tileset.js";
import { addBridges, buildWalkGraph, type LocatedPoint, locatePoint, type WalkGraph } from "./walk-graph.js";
import {
  ensureWokCacheDir,
  ensureWoksExtracted,
  getCachedWok,
  getWokForTile,
  readAreaTileGrid,
  tileHeightStep,
} from "./walkmesh.js";

/** Local int that marks an object as deliberately out of the player's reach (an archer on a wall-top). */
export const UNREACHABLE_OK_VAR = "PATH_UNREACHABLE_OK";

/** How far an object may stand from walkable ground and still count as reachable, by kind. */
export const SNAP_RADIUS: Record<string, number> = {
  creature: 1.5,
  placeable: 2.5,
  door: 3,
  waypoint: 1.5,
  trigger: 2,
  point: 1.5,
};

/** Ground within this distance of a placed door, on any side, is joined through it. */
export const DOOR_BRIDGE_RADIUS = 2.5;

const graphCache = new Map<string, { sig: string; graph: WalkGraph }>();

/** Drop cached graphs (load_module). */
export function clearWalkGraphCache(): void {
  graphCache.clear();
}

/** Build (or reuse) the walk graph of an area. Null when the area is not in the module. */
export async function loadAreaWalkGraph(
  areaResref: string,
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
): Promise<WalkGraph | null> {
  const area = areaResref.toLowerCase();
  const are = index.parsedGff.get(`${area}.are`) as GffObj | undefined;
  if (!are) return null;
  const grid = readAreaTileGrid(are);
  const tilesetResref = getFieldStr(are, "Tileset");
  // Placed doors bridge the ground on both sides (a tile's door opening has no walkmesh; the door supplies it in play).
  const doors = areaObjects(index, area).filter((o) => o.kind === "door");
  const sig = `${index.modPath}|${tilesetResref}|${grid.width}x${grid.height}|${grid.tiles.map((t) => `${t.id}.${t.orientation}.${t.height}`).join(",")}|${doors.map((d) => `${d.x.toFixed(2)},${d.y.toFixed(2)}`).join(";")}`;
  const hit = graphCache.get(area);
  if (hit && hit.sig === sig) return hit.graph;

  const tileset = await getTilesetInfo(tilesetResref, resmanOpts, index);
  const tileModels = tileset.tiles.map((t) => t.model);
  const cacheDir = await ensureWokCacheDir();
  const unique = new Set<string>();
  for (const t of grid.tiles) {
    const m = tileModels[t.id];
    if (m) unique.add(m.toLowerCase());
  }
  await ensureWoksExtracted(unique, resmanOpts, cacheDir);
  for (const m of unique) await getWokForTile(m, resmanOpts, cacheDir);
  const graph = buildWalkGraph(grid, tileModels, (m) => getCachedWok(m), index.twodaTables.get("surfacemat"), tileHeightStep(tileset));
  addBridges(graph, doors.map((d) => ({ x: d.x, y: d.y, z: d.z, radius: DOOR_BRIDGE_RADIUS })));
  graphCache.set(area, { sig, graph });
  return graph;
}

// ─── Objects ─────────────────────────────────────────────────────────────────

export interface PlacedObject {
  area: string;
  kind: "creature" | "placeable" | "door" | "waypoint" | "trigger" | "store" | "encounter" | "sound";
  tag: string;
  x: number;
  y: number;
  z: number;
  obj: GffObj;
  /** Trigger corners in world coordinates (triggers only). */
  corners?: Array<{ x: number; y: number }>;
}

const LISTS: Array<{ list: string; kind: PlacedObject["kind"]; pos: "XYZ" | "Position" }> = [
  { list: "Creature List", kind: "creature", pos: "Position" },
  { list: "Placeable List", kind: "placeable", pos: "XYZ" },
  { list: "Door List", kind: "door", pos: "XYZ" },
  { list: "WaypointList", kind: "waypoint", pos: "Position" },
  { list: "TriggerList", kind: "trigger", pos: "Position" },
  { list: "StoreList", kind: "store", pos: "Position" },
  { list: "Encounter List", kind: "encounter", pos: "Position" },
  { list: "SoundList", kind: "sound", pos: "Position" },
];

/** Every placed object of an area with its world position. */
export function areaObjects(index: ModuleIndex, areaResref: string): PlacedObject[] {
  const area = areaResref.toLowerCase();
  const git = index.parsedGff.get(`${area}.git`) as GffObj | undefined;
  if (!git) return [];
  const out: PlacedObject[] = [];
  for (const { list, kind, pos } of LISTS) {
    for (const obj of getFieldList(git, list)) {
      const x = getFieldNum(obj, pos === "XYZ" ? "X" : "XPosition");
      const y = getFieldNum(obj, pos === "XYZ" ? "Y" : "YPosition");
      const z = getFieldNum(obj, pos === "XYZ" ? "Z" : "ZPosition");
      const po: PlacedObject = { area, kind, tag: getFieldStr(obj, "Tag"), x, y, z, obj };
      if (kind === "trigger") {
        const corners = getFieldList(obj, "Geometry").map((v) => ({ x: x + getFieldNum(v, "PointX"), y: y + getFieldNum(v, "PointY") }));
        if (corners.length) {
          po.corners = corners;
          po.x = corners.reduce((s, c) => s + c.x, 0) / corners.length;
          po.y = corners.reduce((s, c) => s + c.y, 0) / corners.length;
        }
      }
      out.push(po);
    }
  }
  return out;
}

/** All placed objects with this tag (case-insensitive), in any area. */
export function findObjectsByTag(index: ModuleIndex, tag: string): PlacedObject[] {
  const want = tag.toLowerCase();
  const out: PlacedObject[] = [];
  for (const area of index.areas.keys()) {
    for (const o of areaObjects(index, area)) if (o.tag.toLowerCase() === want) out.push(o);
  }
  return out;
}

export function isMarkedUnreachableOk(obj: GffObj): boolean {
  return getVarTableEntries(obj).some((v) => v.name.toUpperCase() === UNREACHABLE_OK_VAR && Number(v.value) !== 0);
}

/**
 * Locate an object on the walk graph, using its stored Z as the height hint (so a prop on a wall-top is not taken for
 * the ground below). A trigger is a 2D area that fires at any height: its centre and corners are tried at every level,
 * and a hit in `prefer` (the reachable regions) wins.
 */
export function locateObject(
  g: WalkGraph,
  o: Pick<PlacedObject, "kind" | "x" | "y" | "z" | "corners">,
  prefer?: Set<number>,
): LocatedPoint | null {
  const snapRadius = SNAP_RADIUS[o.kind] ?? SNAP_RADIUS.point;
  if (o.kind !== "trigger") return locatePoint(g, o.x, o.y, { zHint: o.z, snapRadius });
  let first: LocatedPoint | null = null;
  for (const p of [{ x: o.x, y: o.y }, ...(o.corners ?? [])]) {
    for (const zHint of [undefined, -1e4, o.z]) {
      const h = locatePoint(g, p.x, p.y, { zHint, snapRadius });
      if (!h) continue;
      if (!prefer || prefer.has(h.component)) return h;
      first ??= h;
    }
  }
  return first;
}

// ─── Transitions ─────────────────────────────────────────────────────────────

export interface Transition {
  from: PlacedObject;
  targetTag: string;
  target: PlacedObject;
  kind: "door" | "trigger" | "portal";
}

/** Doors, triggers and portal placeables of an area that lead to another place (LinkedTo resolves to an object). */
export function areaTransitions(index: ModuleIndex, areaResref: string, tagIndex?: Map<string, PlacedObject>): Transition[] {
  const tags = tagIndex ?? buildTagIndex(index);
  const out: Transition[] = [];
  for (const o of areaObjects(index, areaResref)) {
    if (o.kind !== "door" && o.kind !== "trigger" && o.kind !== "placeable") continue;
    const linked = getFieldStr(o.obj, "LinkedTo");
    if (!linked) continue;
    if (o.kind !== "placeable" && getFieldNum(o.obj, "LinkedToFlags") === 0) continue;
    const target = tags.get(linked.toLowerCase());
    if (!target) continue;
    out.push({ from: o, targetTag: linked, target, kind: o.kind === "placeable" ? "portal" : o.kind });
  }
  return out;
}

/** Tag -> object for doors and waypoints (the things LinkedTo names). */
export function buildTagIndex(index: ModuleIndex): Map<string, PlacedObject> {
  const tags = new Map<string, PlacedObject>();
  for (const area of index.areas.keys()) {
    for (const o of areaObjects(index, area)) {
      if (o.kind === "door" || o.kind === "waypoint") {
        const k = o.tag.toLowerCase();
        if (k && !tags.has(k)) tags.set(k, o);
      }
    }
  }
  return tags;
}

// ─── Module reachability ─────────────────────────────────────────────────────

export interface ReachState {
  area: string;
  component: number;
}

export interface ModuleReachability {
  start: { area: string; x: number; y: number; z: number } | null;
  /** Reachable components per area. */
  reachable: Map<string, Set<number>>;
  graphs: Map<string, WalkGraph>;
  /** Areas whose graph could not be built (no tileset or walkmesh data). */
  unavailable: string[];
  /** How each state was first reached: the transition used (absent for the start). */
  via: Map<string, { prev: string; transition: Transition }>;
}

const stateKey = (area: string, comp: number) => `${area}:${comp}`;

/**
 * Walk the module from the start location: every ground region reachable on foot, following doors, triggers and
 * portals whose source can be walked to. A transition counts even when a script or a condition gates it.
 */
export async function computeModuleReachability(
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
  start?: { area: string; x: number; y: number; z: number },
): Promise<ModuleReachability> {
  const ifo = index.parsedGff.get("module.ifo") as GffObj | undefined;
  const entry =
    start ??
    (ifo && getFieldStr(ifo, "Mod_Entry_Area")
      ? {
          area: getFieldStr(ifo, "Mod_Entry_Area").toLowerCase(),
          x: getFieldNum(ifo, "Mod_Entry_X"),
          y: getFieldNum(ifo, "Mod_Entry_Y"),
          z: getFieldNum(ifo, "Mod_Entry_Z"),
        }
      : null);
  const result: ModuleReachability = { start: entry, reachable: new Map(), graphs: new Map(), unavailable: [], via: new Map() };
  if (!entry) return result;

  const graphOf = async (area: string): Promise<WalkGraph | null> => {
    if (result.graphs.has(area)) return result.graphs.get(area) ?? null;
    if (result.unavailable.includes(area)) return null;
    try {
      const g = await loadAreaWalkGraph(area, index, resmanOpts);
      if (g && g.faceCount > 0) {
        result.graphs.set(area, g);
        return g;
      }
    } catch {
      // no game data for this tileset
    }
    result.unavailable.push(area);
    return null;
  };

  const tagIndex = buildTagIndex(index);
  const startGraph = await graphOf(entry.area);
  if (!startGraph) return result;
  const startHit = locatePoint(startGraph, entry.x, entry.y, { zHint: entry.z, snapRadius: 3 });
  if (!startHit) return result;

  const queue: ReachState[] = [{ area: entry.area, component: startHit.component }];
  const seen = new Set<string>([stateKey(entry.area, startHit.component)]);
  while (queue.length) {
    const st = queue.shift() as ReachState;
    let set = result.reachable.get(st.area);
    if (!set) result.reachable.set(st.area, (set = new Set()));
    set.add(st.component);
    const g = await graphOf(st.area);
    if (!g) continue;
    for (const tr of areaTransitions(index, st.area, tagIndex)) {
      const src = locateObject(g, tr.from);
      if (!src || src.component !== st.component) continue;
      const tg = await graphOf(tr.target.area);
      if (!tg) continue;
      const land = locateObject(tg, tr.target);
      if (!land) continue;
      const k = stateKey(tr.target.area, land.component);
      if (seen.has(k)) continue;
      seen.add(k);
      result.via.set(k, { prev: stateKey(st.area, st.component), transition: tr });
      queue.push({ area: tr.target.area, component: land.component });
    }
  }
  return result;
}
