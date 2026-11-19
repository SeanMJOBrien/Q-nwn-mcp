/**
 * Tools that keep a small model's work short and its facts fresh (docs/local-model-guide.md §9):
 *
 *   build_area   one spec -> size, features, layout, create, apply, tile doors, music: seven calls in one
 *   dress_area   props spread on open ground and a map pin at every exit, in one call
 *   get_area_card  a few hundred characters per area: size, exits, free transition points, pins, objects, open ground
 *   get_result   one part of a long result that was answered with an outline (util/result-store.ts)
 *
 * build_area and dress_area run the existing tools in-process (util/tool-registry.ts), so every check those tools
 * make (walkability, collisions, layout rules) still applies.
 */

import fs from "fs/promises";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";
import { adventurePath, ensureAdventureDir } from "../util/adventure-dir.js";
import { AREA_RECIPES, pickFeatures } from "../util/area-recipes.js";
import { isContainerPlaceable } from "../util/containers.js";
import { notFoundText } from "../util/blueprint-hint.js";
import { DM_AREA_RESREF } from "../util/dm-books.js";
import { layoutStyles, MIN_SINGLE_ROOM_AREA_SIZE } from "../util/layout-generator.js";
import { getKeptResult, keptIds, shapeLongText, valueAtPath } from "../util/result-store.js";
import { callTool } from "../util/tool-registry.js";
import { findOpenGround, loadAreaWalkGrid } from "../util/walkgrid.js";
import { buildAreaTransitions, buildTagToAreaMap } from "./tileset-tools.js";

type Point = { x: number; y: number };
const r1 = (n: number) => Math.round(n * 10) / 10;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function json(body: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 1) }], ...(isError ? { isError: true } : {}) };
}

// ─── the areas file: what build_area knows that the module does not keep (transition points of each layout) ───

interface BuiltArea {
  style: string;
  features: string[];
  transitionPoints: Array<{ x: number; y: number; direction?: string }>;
}

async function readBuiltAreas(index: ReturnType<typeof requireIndex>): Promise<Record<string, BuiltArea>> {
  try {
    const dir = await ensureAdventureDir(index);
    return (JSON.parse(await fs.readFile(adventurePath(dir, "areas"), "utf8")) as { areas?: Record<string, BuiltArea> }).areas ?? {};
  } catch {
    return {};
  }
}

async function saveBuiltArea(index: ReturnType<typeof requireIndex>, resref: string, built: BuiltArea): Promise<void> {
  const dir = await ensureAdventureDir(index);
  const all = await readBuiltAreas(index);
  all[resref] = built;
  await fs.writeFile(adventurePath(dir, "areas"), JSON.stringify({ areas: all }, null, 1), "utf8");
}

// ─── facts about one area ───

interface AreaFactsCard {
  resref: string;
  name: string;
  tileset: string;
  width: number;
  height: number;
  tileKinds: number;
  exits: Array<Point & { to: string; kind: string }>;
  doors: Array<Point & { tag: string; linked: boolean }>;
  pins: Array<Point & { text: string }>;
  props: number;
  propPoints: Point[];
  containers: Array<Point & { tag: string; items: number }>;
  friendly: Array<Point & { name: string }>;
  hostile: number;
  stores: string[];
  triggers: string[];
}

function areaFacts(index: ReturnType<typeof requireIndex>, resref: string): AreaFactsCard | null {
  const are = index.parsedGff.get(`${resref}.are`) as GffObj | undefined;
  const git = index.parsedGff.get(`${resref}.git`) as GffObj | undefined;
  if (!are || !git) return null;
  const tagToArea = buildTagToAreaMap(index);
  const exits = buildAreaTransitions(index, resref, tagToArea).map((t) => ({ x: r1(t.x), y: r1(t.y), to: t.targetArea, kind: "" }));
  const plcs = getFieldList(git, "Placeable List");
  const creatures = getFieldList(git, "Creature List");
  const name = (c: GffObj) => `${getFieldLocStr(c, "FirstName")} ${getFieldLocStr(c, "LastName")}`.trim();
  return {
    resref,
    name: getFieldLocStr(are, "Name") || resref,
    tileset: getFieldStr(are, "Tileset").toLowerCase(),
    width: getFieldNum(are, "Width"),
    height: getFieldNum(are, "Height"),
    tileKinds: new Set(getFieldList(are, "Tile_List").map((t) => getFieldNum(t, "Tile_ID"))).size,
    exits,
    doors: getFieldList(git, "Door List").map((d) => ({ x: r1(getFieldNum(d, "X")), y: r1(getFieldNum(d, "Y")), tag: getFieldStr(d, "Tag"), linked: !!getFieldStr(d, "LinkedTo") })),
    pins: getFieldList(git, "WaypointList")
      .filter((w) => getFieldNum(w, "HasMapNote") === 1)
      .map((w) => ({ x: r1(getFieldNum(w, "XPosition")), y: r1(getFieldNum(w, "YPosition")), text: getFieldLocStr(w, "MapNote") || getFieldStr(w, "Tag") })),
    props: plcs.length,
    propPoints: plcs.map((p) => ({ x: getFieldNum(p, "X"), y: getFieldNum(p, "Y") })),
    containers: plcs
      .filter((p) => isContainerPlaceable(p))
      .map((p) => ({ x: r1(getFieldNum(p, "X")), y: r1(getFieldNum(p, "Y")), tag: getFieldStr(p, "Tag"), items: getFieldList(p, "ItemList").length })),
    friendly: creatures
      .filter((c) => getFieldNum(c, "FactionID") !== 1)
      .map((c) => ({ x: r1(getFieldNum(c, "XPosition")), y: r1(getFieldNum(c, "YPosition")), name: name(c) || getFieldStr(c, "Tag") })),
    hostile: creatures.filter((c) => getFieldNum(c, "FactionID") === 1).length,
    stores: getFieldList(git, "StoreList").map((s) => getFieldStr(s, "Tag")),
    triggers: getFieldList(git, "TriggerList").map((t) => getFieldStr(t, "Tag")),
  };
}

const at = (p: Point) => `(${Math.round(p.x)}, ${Math.round(p.y)})`;
const list = <T>(items: T[], show: (t: T) => string, max: number) =>
  items.length ? `${items.slice(0, max).map(show).join("; ")}${items.length > max ? `; +${items.length - max} more` : ""}` : "none";

/** The card as a few short lines. */
export function renderCard(f: AreaFactsCard, built: BuiltArea | undefined, open: Point[] | null): string {
  const free = (built?.transitionPoints ?? []).filter((t) => !f.exits.some((e) => dist(e, t) < 8));
  const lines = [
    `${f.resref} "${f.name}" ${f.tileset} ${f.width}x${f.height} (${f.width * 10}x${f.height * 10} m), ${f.tileKinds > 1 ? `laid out${built ? ` as ${built.style}` : ""}` : "NOT laid out yet (one tile kind)"}`,
    `exits: ${list(f.exits, (e) => `to ${e.to} at ${at(e)}`, 6)}`,
  ];
  if (built) lines.push(`free transition points (for adventure_create_transition): ${list(free, (t) => `${at(t)}${t.direction ? ` ${t.direction}` : ""}`, 6)}`);
  if (f.doors.length) lines.push(`doors: ${list(f.doors, (d) => `${d.tag} ${at(d)}${d.linked ? " linked" : ""}`, 6)}`);
  lines.push(`map pins: ${list(f.pins, (p) => `"${p.text}" ${at(p)}`, 6)}`);
  lines.push(
    `objects: ${f.props} placeables; containers ${list(f.containers, (c) => `${c.tag} ${at(c)} ${c.items} items`, 4)}; ` +
      `people ${list(f.friendly, (c) => `${c.name} ${at(c)}`, 5)}; ${f.hostile} hostile; stores ${list(f.stores, (s) => s, 3)}; triggers ${list(f.triggers, (t) => t, 5)}`,
  );
  if (open) lines.push(`open ground: ${open.length ? open.map(at).join(", ") : "none found"}`);
  return lines.join("\n");
}

async function openSpots(index: ReturnType<typeof requireIndex>, resref: string, radius: number, max: number, minSeparation?: number): Promise<Point[] | null> {
  try {
    const loaded = await loadAreaWalkGrid(resref, index, await buildResmanOptions(index));
    if (!loaded) return null;
    const are = index.parsedGff.get(`${resref}.are`) as GffObj;
    const w = getFieldNum(are, "Width") * 10;
    const h = getFieldNum(are, "Height") * 10;
    return findOpenGround(loaded.walk, { radius, near: { x: w / 2, y: h / 2 }, bounds: { x1: 5, y1: 5, x2: w - 5, y2: h - 5 }, maxResults: max, ...(minSeparation ? { minSeparation } : {}) }).map((s) => ({ x: s.x, y: s.y }));
  } catch {
    return null;
  }
}

/** Greedy spread: each next point is the candidate farthest from those already chosen (and from `avoid`). */
export function spreadPoints(candidates: Point[], count: number, avoid: Point[], minGap: number): Point[] {
  const pool = candidates.filter((c) => avoid.every((a) => dist(a, c) >= minGap));
  const chosen: Point[] = [];
  while (chosen.length < count && pool.length) {
    let best = 0;
    let bestD = -1;
    pool.forEach((c, i) => {
      const d = Math.min(...[...chosen, ...avoid].map((o) => dist(o, c)), Number.POSITIVE_INFINITY);
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    });
    chosen.push(pool.splice(best, 1)[0]);
  }
  return chosen;
}

/** Each point moved to the nearest spot with `radius` m of walkable ground around it (within 20 m). */
async function snapToGround(index: ReturnType<typeof requireIndex>, resref: string, points: Array<{ x: number; y: number; direction?: string }>, radius = 2) {
  let moved = 0;
  let unsafe = 0;
  try {
    const loaded = await loadAreaWalkGrid(resref, index, await buildResmanOptions(index));
    if (!loaded) return { points, moved, unsafe };
    const out = points.map((p) => {
      const [spot] = findOpenGround(loaded.walk, { radius, near: p, bounds: { x1: p.x - 20, y1: p.y - 20, x2: p.x + 20, y2: p.y + 20 }, maxResults: 1 });
      if (!spot) {
        unsafe++;
        return p;
      }
      if (dist(spot, p) < 0.5) return p;
      moved++;
      return { ...p, x: r1(spot.x), y: r1(spot.y) };
    });
    return { points: out, moved, unsafe };
  } catch {
    return { points, moved, unsafe };
  }
}

// ─── build_area ───

interface AreaSpec {
  resref: string;
  name: string;
  tileset: string;
  style?: string;
  biome?: string;
  purpose?: string;
  events?: number;
  travel?: boolean;
  width?: number;
  height?: number;
  rooms?: number;
  features?: string[];
  connections?: number;
  safeMode?: boolean;
  seed?: number | string;
  genericDoor?: string;
  /** What checkAreaSpec changed in the given spec (aliases, a string for a list, a size word, a clamped size). */
  adjusted?: string[];
}

/** Names that make an area a settlement (at least 12x12 tiles). */
const SETTLEMENT = /\b(village|town|hamlet|city|settlement|market)\b/i;

/** Size words small models use instead of width/height, in tiles. */
const SIZE_WORDS: Record<string, number> = { tiny: 9, small: 9, medium: 12, large: 16, huge: 20 };
/** Field names small models use for a spec field. */
const SPEC_ALIASES: Record<string, string> = { preferredFeatures: "features", feature: "features", featureGroups: "features", type: "style" };

/**
 * Turn what a small model writes into the spec's shape before checking it: a field alias, a string where a list goes,
 * size: "medium" for width and height, a width outside 9-32 brought into range. Each change is reported back.
 */
function normaliseAreaSpec(o: Record<string, unknown>): { o: Record<string, unknown>; adjusted: string[] } {
  const out: Record<string, unknown> = { ...o };
  const adjusted: string[] = [];
  for (const [alias, field] of Object.entries(SPEC_ALIASES)) {
    if (out[alias] === undefined) continue;
    if (out[field] === undefined) {
      out[field] = out[alias];
      adjusted.push(`${alias} read as ${field}`);
    } else adjusted.push(`${alias} ignored (${field} is given)`);
    delete out[alias];
  }
  if (typeof out.features === "string") {
    out.features = out.features.split(",").map((f) => f.trim()).filter(Boolean);
    adjusted.push("features given as text, read as a list");
  }
  if (out.size !== undefined) {
    const word = String(out.size).toLowerCase().trim();
    const m = /^(\d+)\s*x\s*(\d+)$/.exec(word);
    const n = SIZE_WORDS[word] ?? (/^\d+$/.test(word) ? Number(word) : undefined);
    if (m || n !== undefined) {
      if (out.width === undefined) out.width = m ? Number(m[1]) : n;
      if (out.height === undefined) out.height = m ? Number(m[2]) : n;
      adjusted.push(`size "${out.size}" read as ${out.width}x${out.height} tiles`);
      delete out.size;
    }
  }
  for (const k of ["width", "height"]) {
    const v = out[k] === undefined ? undefined : Number(out[k]);
    if (v === undefined || !Number.isInteger(v)) continue;
    const c = Math.min(32, Math.max(MIN_SINGLE_ROOM_AREA_SIZE, v));
    if (c !== v) {
      out[k] = c;
      adjusted.push(`${k} ${v} raised or lowered to ${c} (areas are ${MIN_SINGLE_ROOM_AREA_SIZE}-32 tiles)`);
    }
  }
  return { o: out, adjusted };
}

const SPEC_FIELDS = ["resref", "name", "tileset", "style", "biome", "purpose", "events", "travel", "width", "height", "rooms", "features", "connections", "safeMode", "seed", "genericDoor"];

export function checkAreaSpec(raw: unknown): { spec: AreaSpec } | { errors: Array<{ field: string; message: string }> } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { errors: [{ field: "spec", message: "must be a JSON object" }] };
  const { o, adjusted } = normaliseAreaSpec(raw as Record<string, unknown>);
  const errors: Array<{ field: string; message: string }> = [];
  for (const k of Object.keys(o)) if (!SPEC_FIELDS.includes(k)) errors.push({ field: k, message: `is not a field; fields: ${SPEC_FIELDS.join(", ")}` });
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : undefined);
  const num = (k: string) => (o[k] === undefined ? undefined : Number(o[k]));
  if (!str("resref") || !/^[a-z0-9_]{1,16}$/.test(str("resref") as string)) errors.push({ field: "resref", message: "lower case letters, digits and _, at most 16 characters" });
  if (!str("name")) errors.push({ field: "name", message: "the area's display name is required" });
  if (!str("tileset")) errors.push({ field: "tileset", message: "required, e.g. ttr01 (see the style table in get_phase_prompt(phase: \"areas\"))" });
  const tileset = (str("tileset") ?? "").toLowerCase();
  if (tileset && !AREA_RECIPES[tileset] && (!str("style") || !str("biome")))
    errors.push({ field: "style", message: `tileset ${tileset} has no recipe: give style and biome too (recipes: ${Object.keys(AREA_RECIPES).join(", ")})` });
  const styles = layoutStyles();
  if (str("style") && !styles.includes((str("style") as string).toLowerCase())) errors.push({ field: "style", message: `one of ${styles.join(", ")}` });
  for (const k of ["events", "width", "height", "rooms", "connections"]) {
    const v = num(k);
    if (v !== undefined && (!Number.isInteger(v) || v < 0)) errors.push({ field: k, message: "a whole number" });
  }
  for (const k of ["width", "height"]) {
    const v = num(k);
    if (v !== undefined && (v < MIN_SINGLE_ROOM_AREA_SIZE || v > 32)) errors.push({ field: k, message: `${MIN_SINGLE_ROOM_AREA_SIZE}-32 tiles` });
  }
  if (o.features !== undefined && !(Array.isArray(o.features) && o.features.every((f) => typeof f === "string"))) errors.push({ field: "features", message: "a list of feature group names" });
  if (errors.length) return { errors };
  return {
    spec: {
      resref: str("resref") as string,
      name: str("name") as string,
      tileset,
      ...(str("style") ? { style: str("style") } : {}),
      ...(str("biome") ? { biome: str("biome") } : {}),
      ...(str("purpose") ? { purpose: str("purpose") } : {}),
      ...(o.events !== undefined ? { events: num("events") } : {}),
      ...(o.travel !== undefined ? { travel: o.travel === true || o.travel === "true" } : {}),
      ...(o.width !== undefined ? { width: num("width") } : {}),
      ...(o.height !== undefined ? { height: num("height") } : {}),
      ...(o.rooms !== undefined ? { rooms: num("rooms") } : {}),
      ...(o.features ? { features: o.features as string[] } : {}),
      ...(o.connections !== undefined ? { connections: num("connections") } : {}),
      ...(o.safeMode !== undefined ? { safeMode: o.safeMode === true || o.safeMode === "true" } : {}),
      ...(o.seed !== undefined ? { seed: o.seed as number | string } : {}),
      ...(str("genericDoor") ? { genericDoor: str("genericDoor") } : {}),
      ...(adjusted.length ? { adjusted } : {}),
    },
  };
}

async function buildArea(spec: AreaSpec) {
  const index = requireIndex();
  const recipe = AREA_RECIPES[spec.tileset];
  const style = spec.style ?? recipe?.style ?? "rural";
  const biome = spec.biome ?? recipe?.biome ?? "rural";
  const done: string[] = [];
  const notes: string[] = [...(spec.adjusted ?? [])];
  const fail = (step: string, error: string) =>
    json({ ok: false, failedAt: step, error, done, next: done.includes("create_area") ? "Fix the field the error names and call build_area again: it reuses the empty area it created." : "Fix the field the error names and call build_area again." }, true);

  const existing = index.parsedGff.get(`${spec.resref}.are`) as GffObj | undefined;
  let width = spec.width;
  let height = spec.height;
  if (existing) {
    const kinds = new Set(getFieldList(existing, "Tile_List").map((t) => getFieldNum(t, "Tile_ID"))).size;
    if (kinds > 1) return json({ ok: false, field: "resref", error: `Area ${spec.resref} is already built (laid out). To build it again, delete_area(area: "${spec.resref}") first; to see it, get_area_card(area: "${spec.resref}").` }, true);
    if (getFieldStr(existing, "Tileset").toLowerCase() !== spec.tileset)
      return json({ ok: false, field: "tileset", error: `The empty area ${spec.resref} has tileset ${getFieldStr(existing, "Tileset")}; use it, or delete_area first.` }, true);
    width = getFieldNum(existing, "Width");
    height = getFieldNum(existing, "Height");
    notes.push(`reused the empty area ${spec.resref} (${width}x${height})`);
  }

  // 1. size
  let rooms = spec.rooms;
  if (!width || !height) {
    const size = await callTool("suggest_area_size", {
      biome,
      events: String(spec.events ?? 2),
      ...(biome === "interior" ? { purpose: spec.purpose ?? "home" } : {}),
      ...(spec.travel ? { shape: "linear" } : {}),
    });
    if (size.isError || !size.json) return fail("suggest_area_size", size.text);
    width = width ?? Number(size.json.width);
    height = height ?? Number(size.json.height);
    rooms = rooms ?? (size.json.rooms as number | undefined);
    done.push("suggest_area_size");
  }
  if (width < MIN_SINGLE_ROOM_AREA_SIZE || height < MIN_SINGLE_ROOM_AREA_SIZE) {
    if (existing) return fail("size", `the empty area is ${width}x${height}, smaller than the ${MIN_SINGLE_ROOM_AREA_SIZE}x${MIN_SINGLE_ROOM_AREA_SIZE} the layout needs: delete_area and build again`);
    notes.push(`raised ${width}x${height} to at least ${MIN_SINGLE_ROOM_AREA_SIZE}x${MIN_SINGLE_ROOM_AREA_SIZE}, the smallest area the layout generator builds`);
    width = Math.max(width, MIN_SINGLE_ROOM_AREA_SIZE);
    height = Math.max(height, MIN_SINGLE_ROOM_AREA_SIZE);
  }

  // A settlement needs room for its houses: suggest_area_size gave a village 8x7 (The Mill on Blackwater).
  if (!existing && spec.width === undefined && spec.height === undefined && SETTLEMENT.test(`${spec.name} ${spec.purpose ?? ""}`) && (width < 12 || height < 12)) {
    notes.push(`raised ${width}x${height} to 12x12: a village or town needs room for its buildings`);
    width = Math.max(width, 12);
    height = Math.max(height, 12);
  }

  // 2. feature groups
  let features = spec.features;
  if (!spec.safeMode) {
    const listed = await callTool("adventure_list_features", { tileset: spec.tileset, style });
    const groups = (listed.json?.features as Array<{ name: string; columns?: number; rows?: number }> | undefined) ?? [];
    done.push("adventure_list_features");
    // A name that is no feature group of the tileset (a model's "village", "forest") becomes a word for choosing groups.
    const byLower = new Map(groups.map((g) => [g.name.toLowerCase(), g.name]));
    const known = (features ?? []).map((f) => byLower.get(f.toLowerCase())).filter((f): f is string => !!f);
    const words = (features ?? []).filter((f) => !byLower.has(f.toLowerCase()));
    if (groups.length && words.length) notes.push(`${words.join(", ")}: no feature group of ${spec.tileset} by that name; used as words for choosing groups`);
    features = known.length ? known : groups.length ? pickFeatures(groups, `${spec.name} ${spec.purpose ?? ""} ${words.join(" ")}`, 4) : features;
  }

  // 3. layout
  const styleObj = { type: style, ...(rooms ? { rooms } : {}), preferredFeatures: features ?? [], ...(spec.safeMode ? { safeMode: true } : {}), ...(spec.seed !== undefined ? { seed: spec.seed } : {}) };
  const gen = await callTool("adventure_generate_layout", { tileset: spec.tileset, width: String(width), height: String(height), style: JSON.stringify(styleObj), transitionCount: String(Math.max(1, spec.connections ?? 1)) });
  if (gen.isError || !gen.json?.layoutId) return fail("adventure_generate_layout", gen.text.slice(0, 600));
  done.push("adventure_generate_layout");
  const layoutId = String(gen.json.layoutId);
  const transitionPoints: Array<{ x: number; y: number; direction?: string }> = ((gen.json.transitionPoints as Array<{ x: number; y: number; direction?: string }>) ?? []).map((t) => ({ x: r1(t.x), y: r1(t.y), direction: t.direction }));

  // 4. the area
  if (!existing) {
    const made = await callTool("create_area", { resref: spec.resref, name: spec.name, width: String(width), height: String(height), tileset: spec.tileset });
    if (made.isError || !index.parsedGff.get(`${spec.resref}.are`)) return fail("create_area", made.text.slice(0, 400));
    done.push("create_area");
  }

  // 5. terrain
  const applied = await callTool("adventure_apply_layout", { area: spec.resref, layoutId });
  if (applied.isError || applied.json?.success !== true) return fail("adventure_apply_layout", applied.text.slice(0, 600));
  done.push("adventure_apply_layout");
  const solverWarnings = (applied.json.solverWarnings as string[] | undefined) ?? [];
  // A layout's transition point can fall on rock or a wall; move each to the nearest ground with 2 m clear around it
  // (what adventure_create_transition asks for), so the points the card shows work as they are.
  const snapped = await snapToGround(index, spec.resref, transitionPoints);
  if (snapped.moved) notes.push(`${snapped.moved} transition point(s) moved to the nearest open ground`);
  if (snapped.unsafe) notes.push(`${snapped.unsafe} transition point(s) have no open ground near them: pick another with adventure_find_walkable`);
  transitionPoints.splice(0, transitionPoints.length, ...snapped.points);
  if (solverWarnings.length) notes.push(`${solverWarnings.length} solver warnings: if the area looks wrong, delete_area and build again with fewer rooms or "safeMode": true`);

  // 6. doors of the tiles, 7. music, sound, sky
  const doors = await callTool("place_tile_doors", { area: spec.resref, ...(spec.genericDoor ? { genericDoor: spec.genericDoor } : {}) });
  if (!doors.isError) done.push("place_tile_doors");
  else notes.push(`place_tile_doors: ${doors.text.slice(0, 200)}`);
  const music = recipe?.music;
  if (music) {
    const props = await callTool("set_area_properties", {
      area: spec.resref,
      musicDay: String(music.musicDay),
      musicNight: String(music.musicNight),
      musicBattle: String(music.musicBattle),
      ...(music.ambientSndDay !== undefined ? { ambientSndDay: String(music.ambientSndDay), ambientSndNight: String(music.ambientSndDay) } : {}),
      skyBox: String(music.skyBox),
      dayNightCycle: music.dayNightCycle,
    });
    if (!props.isError) done.push("set_area_properties");
  }

  const placedFeatures = (applied.json.featureGroups as string[] | undefined) ?? [];
  await saveBuiltArea(index, spec.resref, { style, features: placedFeatures, transitionPoints });
  const doorCount = doors.json?.placed as number | undefined;
  return json({
    ok: true,
    area: spec.resref,
    name: spec.name,
    size: `${width}x${height}`,
    tileset: spec.tileset,
    style,
    features: placedFeatures,
    ...(doorCount !== undefined ? { tileDoors: doorCount } : {}),
    transitionPoints,
    done,
    ...(notes.length ? { notes } : {}),
    next:
      transitionPoints.length > 0
        ? `Connect it: adventure_create_transition(areaA: "${spec.resref}", aX: "${Math.round(transitionPoints[0].x)}", aY: "${Math.round(transitionPoints[0].y)}", areaB: "<other area>", bX: "<x>", bY: "<y>", tag: "<tag>") with a free point of the other area (get_area_card shows them)`
        : "get_progress() for the next step",
  });
}

// ─── dress_area ───

async function dressArea(area: string, props: Array<string | { blueprint: string; x?: number; y?: number; bearing?: number }>, pins: boolean, extraPins: Array<{ text: string; x: number; y: number }>, near?: Point) {
  const index = requireIndex();
  const facts = areaFacts(index, area);
  if (!facts) return json({ ok: false, field: "area", error: `No area ${area}. Areas: ${[...index.areas.keys()].join(", ")}` }, true);
  const placedProps: Array<{ blueprint: string; x: number; y: number }> = [];
  const placedPins: Array<{ text: string; x: number; y: number }> = [];
  const failed: string[] = [];
  const center = { x: facts.width * 5, y: facts.height * 5 };

  // Map pins at each exit, on the walkable side toward the middle of the area.
  const pinAt = async (text: string, origin: Point, toward: Point, n: number) => {
    const dx = toward.x - origin.x;
    const dy = toward.y - origin.y;
    const len = Math.hypot(dx, dy) || 1;
    const tag = `mp_${area}_${n}`.slice(0, 32);
    for (const d of [2, 3, 4, 6, 8]) {
      for (const turn of [0, 0.6, -0.6]) {
        const ux = (dx / len) * Math.cos(turn) - (dy / len) * Math.sin(turn);
        const uy = (dx / len) * Math.sin(turn) + (dy / len) * Math.cos(turn);
        const p = { x: r1(origin.x + ux * d), y: r1(origin.y + uy * d) };
        const r = await callTool("place_waypoint", { area, tag, name: text, x: String(p.x), y: String(p.y), mapNote: text });
        if (!r.isError && r.json?.success === true) return p;
      }
    }
    // Rock or wall all around: the nearest open ground within 10 m.
    const near = (await snapToGround(index, area, [origin], 1)).points[0];
    if (dist(near, origin) <= 10) {
      const r = await callTool("place_waypoint", { area, tag, name: text, x: String(near.x), y: String(near.y), mapNote: text });
      if (!r.isError && r.json?.success === true) return { x: near.x, y: near.y };
    }
    return null;
  };
  let pinNo = facts.pins.length;
  if (pins) {
    for (const e of facts.exits) {
      if (facts.pins.some((p) => dist(p, e) < 6)) continue;
      const target = areaFacts(index, e.to);
      const text = `To ${target?.name ?? e.to}`;
      const p = await pinAt(text, e, center, ++pinNo);
      if (p) placedPins.push({ text, ...p });
      else failed.push(`pin "${text}" near ${at(e)}: no walkable spot within 10 m`);
    }
  }
  for (const ep of extraPins) {
    const p = await pinAt(ep.text, { x: ep.x, y: ep.y }, center, ++pinNo);
    if (p) placedPins.push({ text: ep.text, ...p });
    else failed.push(`pin "${ep.text}" at ${at(ep)}: no walkable spot within 10 m`);
  }

  // Props: given positions as they are; the others spread over open ground, away from exits, doors and people.
  if (props.length) {
    const auto = props.filter((p) => typeof p === "string" || p.x === undefined || p.y === undefined);
    let spots: Point[] = [];
    if (auto.length) {
      const candidates = (await openSpots(index, area, 1, 400, 3)) ?? [];
      const avoid: Point[] = [...facts.exits, ...facts.doors, ...facts.friendly, ...facts.containers, ...placedPins];
      spots = near
        ? candidates.filter((c) => avoid.every((a) => dist(a, c) >= 3)).sort((a, b) => dist(a, near) - dist(b, near)).slice(0, auto.length * 3)
        : spreadPoints(candidates, auto.length * 3, avoid, 4);
    }
    for (const p of props) {
      const blueprint = typeof p === "string" ? p : p.blueprint;
      const fixed = typeof p !== "string" && p.x !== undefined && p.y !== undefined ? [{ x: p.x, y: p.y }] : [];
      const tries = fixed.length ? fixed : spots.splice(0, 3);
      let ok = false;
      let lastError = "no open ground left";
      for (const s of tries) {
        const r = await callTool("place_placeable", { area, blueprint, x: String(s.x), y: String(s.y), ...(typeof p !== "string" && p.bearing !== undefined ? { bearing: String(p.bearing) } : {}) });
        if (!r.isError && r.json?.success === true) {
          placedProps.push({ blueprint, x: s.x, y: s.y });
          ok = true;
          break;
        }
        lastError = (r.json?.error as string | undefined) ?? r.text.slice(0, 160);
        if (/not found|no blueprint|unknown blueprint/i.test(r.text)) break; // another spot will not help
      }
      if (!ok) failed.push(`${blueprint}: ${/not found/i.test(lastError) ? await notFoundText("utp", blueprint) : lastError}`);
    }
  }
  return json({
    ok: failed.length === 0,
    area,
    pins: placedPins,
    props: placedProps,
    ...(failed.length ? { failed } : {}),
    next: failed.length ? "Place the failed ones by hand (place_placeable / place_waypoint at a point from get_area_card's open ground), or leave them out." : "get_progress() for the next step",
  });
}

function parseList<T>(raw: string | undefined, field: string): T[] | { error: string } {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as T[]) : { error: `${field} must be a JSON list` };
  } catch {
    // A plain comma list of blueprints is fine too.
    if (field === "props") return raw.split(",").map((s) => s.trim()).filter(Boolean) as T[];
    return { error: `${field} is not valid JSON` };
  }
}

export function registerAreaBuildTools(server: McpServer): void {
  server.tool(
    "build_area",
    'Build one area from a short spec, in one call: picks the size (suggest_area_size) and feature groups (adventure_list_features) when not given, generates the layout, creates the area, applies the terrain, places the tile doors and sets music, sound and sky for the tileset. spec: {"resref":"millroad","name":"The Mill Road","tileset":"ttr01","connections":2} plus optional style, biome, purpose (inn, shop, home... for interiors), events (number of encounters/conversations, default 2), travel (true = long road), width, height (9-32 tiles; or size: small, medium, large), rooms, features (group names from adventure_list_features; other words only steer the choice), safeMode, seed, genericDoor. Answers with the transition points for connecting it (also kept for get_area_card). On a failure it names the step and field; call it again: an empty area it created is reused.',
    {
      spec: z.string().describe('The area as a JSON object, e.g. {"resref":"millroad","name":"The Mill Road","tileset":"ttr01","connections":2}'),
    },
    { destructiveHint: true },
    async ({ spec }) => {
      let raw: unknown;
      try {
        raw = JSON.parse(spec);
      } catch (e) {
        return json({ ok: false, field: "spec", error: `not valid JSON: ${(e as Error).message}` }, true);
      }
      const checked = checkAreaSpec(raw);
      if ("errors" in checked) return json({ ok: false, error: "Fix these fields and call build_area again.", fields: checked.errors }, true);
      return buildArea(checked.spec);
    },
  );

  server.tool(
    "dress_area",
    'Dress one area in one call: a map pin at every exit that has none ("To <area name>", on the walkable side), extra pins you name, and props spread over open ground away from exits, doors and people (or at the positions you give). Leave props out to get the props that suit the tileset of the area (only while it has fewer than 5) (a well, hay and a fence in a village; rocks, logs and mushrooms in a forest; rocks, bones and rubble in a cave; furniture indoors), or give real resrefs: ["plc_barrel","x2_easy_crate1",...] or [{"blueprint":"plc_chest1","x":40,"y":52}]; "[]" places none. near: "x,y" gathers the props around that point instead of spreading them. Each placement is checked like place_placeable / place_waypoint; failures are listed, the rest stay.',
    {
      area: z.string().describe("Area resref"),
      props: z.string().optional().describe('JSON list of placeable blueprints, or of {"blueprint","x","y","bearing"}'),
      pins: z.string().optional().describe('"auto" (default): a pin at every exit; "none": no exit pins'),
      extraPins: z.string().optional().describe('JSON list of {"text":"<the place\'s name>","x":<x>,"y":<y>}: a pin near each point, only for a shop or quest giver that is really there'),
      near: z.string().optional().describe('"x,y": place the props around this point'),
    },
    { destructiveHint: false },
    async ({ area, props, pins, extraPins, near }) => {
      // No props given and the area still bare (under 5 placeables): the kit that suits its tileset
      // (util/area-recipes.ts), so a second call for pins does not add a second kit; props: "[]" places none.
      const idx = requireIndex();
      const tileset = getFieldStr((idx.parsedGff.get(`${area.toLowerCase()}.are`) ?? {}) as GffObj, "Tileset").toLowerCase();
      const placed = getFieldList((idx.parsedGff.get(`${area.toLowerCase()}.git`) ?? {}) as GffObj, "Placeable List").length;
      const kit = props === undefined ? (placed < 5 ? (AREA_RECIPES[tileset]?.props ?? []) : []) : undefined;
      const p = kit ? [...kit] : parseList<string | { blueprint: string; x?: number; y?: number; bearing?: number }>(props, "props");
      if ("error" in p) return json({ ok: false, field: "props", error: p.error }, true);
      const e = parseList<{ text: string; x: number; y: number }>(extraPins, "extraPins");
      if ("error" in e) return json({ ok: false, field: "extraPins", error: e.error }, true);
      const bad = e.findIndex((x) => !x || typeof x.text !== "string" || !Number.isFinite(Number(x.x)) || !Number.isFinite(Number(x.y)));
      if (bad >= 0) return json({ ok: false, field: `extraPins[${bad}]`, error: 'each pin needs "text", "x" and "y"' }, true);
      let nearPt: Point | undefined;
      if (near) {
        const [x, y] = near.split(",").map((s) => Number(s.trim()));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return json({ ok: false, field: "near", error: 'give "x,y", e.g. "40,52"' }, true);
        nearPt = { x, y };
      }
      return dressArea(area.toLowerCase(), p, (pins ?? "auto").toLowerCase() !== "none", e.map((x) => ({ text: x.text, x: Number(x.x), y: Number(x.y) })), nearPt);
    },
  );

  server.tool(
    "get_area_card",
    "A short card of one area (or one line per area when no area is given): name, tileset and size, exits and where they lead, the free transition points build_area left, doors, map pins, containers, people, stores, triggers and a few spots of open ground. Read it instead of visualize_area when you need the facts of an area for a step.",
    {
      area: z.string().optional().describe("Area resref; omit for one line per area"),
      spots: z.boolean().optional().describe("Include open-ground spots (default true for one area)"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ area, spots }) => {
      const index = requireIndex();
      const built = await readBuiltAreas(index);
      if (!area) {
        const lines = [...index.areas.keys()].map((r) => {
          const f = areaFacts(index, r);
          if (!f) return r;
          return `${r} "${f.name}" ${f.tileset} ${f.width}x${f.height}${f.tileKinds > 1 ? "" : " (not laid out)"} · exits: ${f.exits.map((e) => e.to).join(", ") || "none"} · ${f.props} props, ${f.pins.length} pins, ${f.friendly.length} people, ${f.hostile} hostile`;
        });
        return { content: [{ type: "text" as const, text: lines.join("\n") || "No areas yet." }] };
      }
      const r = area.toLowerCase();
      const f = areaFacts(index, r);
      if (!f) return json({ ok: false, field: "area", error: `No area ${area}. Areas: ${[...index.areas.keys()].join(", ")}` }, true);
      const taken: Point[] = [...f.propPoints, ...f.friendly, ...f.exits, ...f.doors, ...f.pins];
      const open = spots === false || f.tileKinds <= 1 ? null : ((await openSpots(index, r, 2, 12, 10))?.filter((o) => taken.every((t) => dist(t, o) >= 3)).slice(0, 5) ?? null);
      return { content: [{ type: "text" as const, text: renderCard(f, built[r], open) }] };
    },
  );

  server.tool(
    "get_result",
    "One part of a long tool result that was answered with an outline and a resultId (r1, r2, ...). path picks a part (\"objects.creatures\", \"zones.2\"); offset continues a long text. Results are kept for the last 40 long answers.",
    {
      id: z.string().describe('The resultId, e.g. "r3"'),
      path: z.string().optional().describe('Dot path into the result, e.g. "transitionPoints" or "tiles.0"'),
      offset: z.string().optional().describe("Character offset into a plain-text result"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ id, path, offset }) => {
      const text = getKeptResult(id);
      const limit = Number(process.env.MCP_RESULT_LIMIT) || 6000;
      if (text === undefined) return json({ ok: false, field: "id", error: `No kept result "${id}". Kept: ${keptIds().join(", ") || "none"}. Call the tool again.` }, true);
      if (path) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return json({ ok: false, field: "path", error: "This result is plain text; use offset instead of path." }, true);
        }
        const v = valueAtPath(parsed, path);
        if (!v.ok) return json({ ok: false, field: "path", error: v.error }, true);
        return { content: [{ type: "text" as const, text: shapeLongText(JSON.stringify(v.value, null, 1), limit, id, path) }] };
      }
      const from = Math.max(0, Number(offset) || 0);
      if (!offset) return { content: [{ type: "text" as const, text: shapeLongText(text, limit, id) }] };
      const part = text.slice(from, from + limit);
      const rest = text.length - from - part.length;
      return { content: [{ type: "text" as const, text: `${part}${rest > 0 ? `\n[... ${rest} more characters: get_result(id: "${id}", offset: ${from + part.length})]` : ""}` }] };
    },
  );
}

// ─── story sections drafted from the module (a small model invents them otherwise) ───

const fmtAt = (x: number, y: number) => `(${Math.round(x)}, ${Math.round(y)})`;

/** The story areas: every area but the DM area and the empty _start stub. */
function storyAreas(index: ReturnType<typeof requireIndex>): string[] {
  return [...index.areas.keys()].filter((r) => r !== DM_AREA_RESREF && r !== "_start");
}

/**
 * The `## Areas` or `## Environment` section in the format of docs/phase-prompts/areas.md / environment.md, read
 * from the module: what is really there, so later phases and the DM guide read facts.
 */
export async function draftStorySection(index: ReturnType<typeof requireIndex>, section: "Areas" | "Environment" | "Actors" | "Challenges" | "Affordances"): Promise<string> {
  const built = await readBuiltAreas(index);
  const out: string[] = [];
  if (section === "Affordances") return affordanceLines(index);
  for (const r of storyAreas(index)) {
    const f = areaFacts(index, r);
    if (!f) continue;
    if (section === "Actors" || section === "Challenges") {
      const lines = section === "Actors" ? actorLines(index, r) : challengeLines(index, r);
      if (lines.length) out.push(`### ${f.name} (\`${r}\`)`, ...lines, "");
      continue;
    }
    out.push(`### ${f.name} (\`${r}\`)`);
    if (section === "Areas") {
      const b = built[r];
      out.push(`- **Tileset:** ${f.tileset}, ${f.width}x${f.height}${b ? `, style ${b.style}` : ""}`);
      out.push(`- **Features:** ${b?.features.length ? b.features.join(", ") : "none"}`);
      out.push(`- **Transitions:** ${f.exits.length ? f.exits.map((e) => `to \`${e.to}\` at ${fmtAt(e.x, e.y)}`).join("; ") : "none"}`);
    } else {
      const git = index.parsedGff.get(`${r}.git`) as GffObj;
      const plcs = getFieldList(git, "Placeable List");
      const show = (p: GffObj) => `${getFieldStr(p, "TemplateResRef") || "?"} (${getFieldStr(p, "Tag")}) at ${fmtAt(getFieldNum(p, "X"), getFieldNum(p, "Y"))}`;
      const plain = plcs.filter((p) => !isContainerPlaceable(p));
      const boxes = plcs.filter((p) => isContainerPlaceable(p));
      const sounds = getFieldList(git, "SoundList");
      const pins = getFieldList(git, "WaypointList").filter((w) => getFieldNum(w, "HasMapNote") === 1);
      out.push(`**Placeables:** ${plain.length ? plain.map(show).join("; ") : "none"}`);
      out.push(`**Containers:** ${boxes.length ? boxes.map(show).join("; ") : "none"}`);
      out.push(
        `**Sounds:** ${sounds.length ? sounds.map((s) => `${getFieldStr(s, "TemplateResRef") || getFieldStr(s, "Tag")} at ${fmtAt(getFieldNum(s, "XPosition"), getFieldNum(s, "YPosition"))}`).join("; ") : "none"}`,
      );
      out.push(
        `**Waypoints:** ${pins.length ? pins.map((w) => `${getFieldStr(w, "Tag")} "${getFieldLocStr(w, "MapNote") || getFieldStr(w, "Tag")}" at ${fmtAt(getFieldNum(w, "XPosition"), getFieldNum(w, "YPosition"))}`).join("; ") : "none"}`,
      );
    }
    out.push("");
  }
  return out.join("\n").trim();
}

/** The Actors section lines of one area (docs/phase-prompts/actors.md format) from its placed creatures. */
function actorLines(index: ReturnType<typeof requireIndex>, area: string): string[] {
  const git = index.parsedGff.get(`${area}.git`) as GffObj | undefined;
  if (!git) return [];
  const key: string[] = [];
  const companions: string[] = [];
  const ambient = new Map<string, number>();
  for (const c of getFieldList(git, "Creature List")) {
    const name = `${getFieldLocStr(c, "FirstName")} ${getFieldLocStr(c, "LastName")}`.trim() || getFieldStr(c, "Tag");
    const tag = getFieldStr(c, "Tag");
    const dlg = getFieldStr(c, "Conversation");
    const hostile = getFieldNum(c, "FactionID") === 1;
    const where = fmtAt(getFieldNum(c, "XPosition"), getFieldNum(c, "YPosition"));
    if (getFieldStr(c, "ScriptHeartbeat").toLowerCase().startsWith("x0_ch_hen")) {
      const cls = getFieldList(c, "ClassList").map((k) => `class ${getFieldNum(k, "Class")} ${getFieldNum(k, "ClassLevel")}`).join(", ");
      companions.push(`${name} (\`${tag}\`)${cls ? `, ${cls}` : ""}${dlg ? `, dialog \`${dlg}\`` : ""}, at ${where}`);
    } else if (dlg || hostile) {
      if (hostile && !dlg) continue; // plain enemies belong to the Challenges section
      key.push(`${name} (\`${tag}\`)${dlg ? `, dialog \`${dlg}\`` : ""}, at ${where}${hostile ? ", hostile" : ""}`);
    } else {
      const r = getFieldStr(c, "TemplateResRef") || tag;
      ambient.set(r, (ambient.get(r) ?? 0) + 1);
    }
  }
  const out: string[] = [];
  if (key.length) out.push(`**Key NPCs:** ${key.join("; ")}`);
  if (companions.length) out.push(`**Companions:** ${companions.join("; ")}`);
  if (ambient.size) out.push(`**Ambient:** ${[...ambient].map(([r, n]) => `${r} x${n}`).join(", ")}`);
  return out;
}

/** The Challenges section lines of one area (docs/phase-prompts/challenges.md format) from its hostile creatures and traps. */
function challengeLines(index: ReturnType<typeof requireIndex>, area: string): string[] {
  const git = index.parsedGff.get(`${area}.git`) as GffObj | undefined;
  if (!git) return [];
  const groups = new Map<string, { n: number; at: string }>();
  const bosses: string[] = [];
  for (const c of getFieldList(git, "Creature List")) {
    if (getFieldNum(c, "FactionID") !== 1) continue;
    const where = fmtAt(getFieldNum(c, "XPosition"), getFieldNum(c, "YPosition"));
    if (getFieldStr(c, "Conversation")) {
      const name = `${getFieldLocStr(c, "FirstName")} ${getFieldLocStr(c, "LastName")}`.trim() || getFieldStr(c, "Tag");
      bosses.push(`**Boss:** ${name} (\`${getFieldStr(c, "Tag").toLowerCase()}\`), at ${where}`);
      continue;
    }
    const r = getFieldStr(c, "TemplateResRef") || getFieldStr(c, "Tag");
    const g = groups.get(r);
    if (g) g.n++;
    else groups.set(r, { n: 1, at: where });
  }
  const traps = getFieldList(git, "TriggerList")
    .filter((t) => getFieldNum(t, "TrapFlag") === 1 || getFieldStr(t, "ScriptOnEnter") === "q_check_evt")
    .map((t) => {
      const pt = getFieldList(t, "Geometry")[0];
      const x = getFieldNum(t, "XPosition") + (pt ? getFieldNum(pt, "PointX") : 0);
      const y = getFieldNum(t, "YPosition") + (pt ? getFieldNum(pt, "PointY") : 0);
      return `${getFieldStr(t, "Tag").toLowerCase()} at ${fmtAt(x, y)}`;
    });
  const out: string[] = [];
  let n = 0;
  for (const [r, g] of groups) out.push(`**Group ${++n}:** ${r} x${g.n} at ${g.at}`);
  out.push(...bosses);
  if (traps.length) out.push(`**Traps:** ${traps.join("; ")}`);
  return out;
}

/** The Affordances section (docs/phase-prompts/affordances.md format): the stores and the containers that hold items. */
function affordanceLines(index: ReturnType<typeof requireIndex>): string {
  const stores: string[] = [];
  const loot: string[] = [];
  for (const r of storyAreas(index)) {
    const git = index.parsedGff.get(`${r}.git`) as GffObj | undefined;
    if (!git) continue;
    for (const st of getFieldList(git, "StoreList")) {
      const name = getFieldLocStr(st, "LocName") || getFieldStr(st, "Tag");
      stores.push(`- ${name} (\`${getFieldStr(st, "Tag").toLowerCase()}\`) in \`${r}\` at ${fmtAt(getFieldNum(st, "XPosition"), getFieldNum(st, "YPosition"))}`);
    }
    for (const p of getFieldList(git, "Placeable List")) {
      const items = getFieldList(p, "ItemList");
      if (!items.length) continue;
      const counts = new Map<string, number>();
      for (const it of items) {
        const k = getFieldStr(it, "InventoryRes") || getFieldStr(it, "TemplateResRef") || "item";
        counts.set(k, (counts.get(k) ?? 0) + Math.max(1, getFieldNum(it, "StackSize")));
      }
      loot.push(`- \`${r}\` ${getFieldStr(p, "Tag").replace(/[^A-Za-z0-9_]/g, "_")}: ${[...counts].map(([k, n]) => `${n}x ${k}`).join(", ")}`);
    }
  }
  const out: string[] = [];
  if (stores.length) out.push("### Stores", ...stores);
  if (loot.length) out.push("### Container Loot", ...loot);
  return out.join("\n");
}

/** The transition points build_area left in an area that no exit uses yet (for adventure_create_transition). */
export async function freeTransitionPoints(index: ReturnType<typeof requireIndex>, area: string): Promise<Point[]> {
  const built = (await readBuiltAreas(index))[area.toLowerCase()];
  const facts = areaFacts(index, area.toLowerCase());
  if (!built || !facts) return [];
  const taken: Point[] = [...facts.exits, ...facts.doors];
  return built.transitionPoints.filter((t) => taken.every((e) => dist(e, t) >= 8)).map((t) => ({ x: t.x, y: t.y }));
}
