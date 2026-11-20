/**
 * check_path: can a player walk from one point or object to another, in one area or across areas?
 *
 * Built on the walkmesh connectivity graph (util/walk-graph.ts): ground connects only where walkmesh triangles share
 * an edge, so a ramp or stair connects two heights and a wall-top next to a courtyard does not. Height numbers alone
 * (Tile_Height, .set corner heights, visualize_area zones) cannot answer this.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import {
  computeModuleReachability,
  findObjectsByTag,
  loadAreaWalkGraph,
  locateObject,
  type PlacedObject,
  type Transition,
} from "../util/area-walk-graph.js";
import { optNumParam, toF } from "../util/params.js";
import {
  closestApproach,
  describeComponent,
  findPath,
  type LocatedPoint,
  locatePoint,
  nearestInComponent,
  type PathResult,
  type WalkGraph,
} from "../util/walk-graph.js";

const NOT_MODELLED =
  "Not modelled: placeables that block ground with their own walkmesh, closed or locked doors, creature width. Confirm a doubtful route in the engine.";

interface Endpoint {
  area: string;
  x: number;
  y: number;
  z?: number;
  label: string;
  obj?: PlacedObject;
}

function err(text: string) {
  return { isError: true, content: [{ type: "text" as const, text }] };
}

function resolveEndpoint(
  which: "from" | "to",
  area: string | undefined,
  x: string | undefined,
  y: string | undefined,
  tag: string | undefined,
): Endpoint | string {
  const index = requireIndex();
  if (tag) {
    let hits = findObjectsByTag(index, tag);
    if (area) hits = hits.filter((h) => h.area === area.toLowerCase());
    if (hits.length === 0) return `${which}Tag "${tag}" matches no placed object${area ? ` in ${area}` : ""}`;
    const o = hits[0];
    return { area: o.area, x: o.x, y: o.y, z: o.z, label: `${o.kind} "${o.tag}"`, obj: o };
  }
  if (x === undefined || y === undefined) return `give ${which}Tag, or ${which}X and ${which}Y`;
  if (!area) return `${which}Area is needed with coordinates`;
  if (!index.parsedGff.has(`${area.toLowerCase()}.are`)) return `area "${area}" is not in the module`;
  return { area: area.toLowerCase(), x: toF(x), y: toF(y), label: `(${x}, ${y})` };
}

function locateEndpoint(g: WalkGraph, e: Endpoint, snap: number): LocatedPoint | null {
  if (e.obj) return locateObject(g, e.obj);
  return locatePoint(g, e.x, e.y, { zHint: e.z, snapRadius: snap });
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

function pointOut(e: Endpoint, hit: LocatedPoint, g: WalkGraph) {
  return {
    area: e.area,
    what: e.label,
    x: r1(e.x),
    y: r1(e.y),
    ground: r2(hit.z),
    ...(hit.snapped > 0 ? { snappedMetres: hit.snapped } : {}),
    ...describeComponent(g, hit.component),
  };
}

function hopSummary(area: string, p: PathResult, via?: Transition) {
  return {
    area,
    metres: p.length,
    heightRange: p.zMin === p.zMax ? p.zMin : `${p.zMin} to ${p.zMax}`,
    climb: p.climb,
    descent: p.descent,
    ...(via ? { thenTakes: `${via.kind} "${via.from.tag}" to ${via.target.area} ("${via.targetTag}")` } : {}),
  };
}

export function registerPathTools(server: McpServer): void {
  server.tool(
    "check_path",
    "Can a player walk from A to B? Answers from the walkmesh: ground connects only where walkmesh triangles share an " +
      "edge, so a ramp or stair joins two heights and a wall-top beside a courtyard does not (Tile_Height, corner heights " +
      "and visualize_area zones cannot tell). Give each end as a tag (fromTag/toTag: any placed object) or as area + x, y. " +
      "Across areas it follows doors, triggers and portals. Returns reachable, the route (metres, height range, climb, " +
      "doors taken) and, when not reachable, each end's ground region (height, size, extent), where the two regions come " +
      "closest and the height gap there, and the nearest reachable spot to the target. Use it before placing a " +
      "transition, NPC or quest object, and whenever a spot is raised (walls, towers, cliffs, bridges).",
    {
      fromTag: z.string().optional().describe("Start at this placed object (any kind)"),
      fromArea: z.string().optional().describe("Start area resref (with fromX/fromY, or to pick among objects sharing fromTag)"),
      fromX: optNumParam("Start X (metres)"),
      fromY: optNumParam("Start Y (metres)"),
      toTag: z.string().optional().describe("Destination object"),
      toArea: z.string().optional().describe("Destination area resref (default: the start area)"),
      toX: optNumParam("Destination X"),
      toY: optNumParam("Destination Y"),
      snap: optNumParam("How far a coordinate may be from walkable ground, metres (default 1.5)"),
      showPath: z.boolean().optional().describe("Include the path points (default false)"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ fromTag, fromArea, fromX, fromY, toTag, toArea, toX, toY, snap, showPath }) => {
      const index = requireIndex();
      const resmanOpts = await buildResmanOptions(index);
      const snapN = snap !== undefined ? toF(snap) : 1.5;

      const from = resolveEndpoint("from", fromArea, fromX, fromY, fromTag);
      if (typeof from === "string") return err(from);
      const to = resolveEndpoint("to", toArea ?? (toTag ? undefined : from.area), toX, toY, toTag);
      if (typeof to === "string") return err(to);

      const gFrom = await loadAreaWalkGraph(from.area, index, resmanOpts).catch(() => null);
      const gTo = to.area === from.area ? gFrom : await loadAreaWalkGraph(to.area, index, resmanOpts).catch(() => null);
      if (!gFrom || gFrom.faceCount === 0 || !gTo || gTo.faceCount === 0) {
        return err("No walkmesh data for this area (set NWN_FOLDER_DATA and NIM_FOLDER_NWTOOLS so the tile walkmeshes can be read).");
      }
      const a = locateEndpoint(gFrom, from, snapN);
      const b = locateEndpoint(gTo, to, snapN);
      const missing = [...new Set([...gFrom.missingModels, ...gTo.missingModels])];
      const extra = missing.length ? { missingWalkmeshes: missing } : {};
      if (!a || !b) {
        const which = !a ? from : to;
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              reachable: false,
              verdict: `${which.label} in ${which.area} has no walkable ground within ${snapN} m.`,
              hint: "probe_ground at the spot; move the object onto walkable ground (adventure_find_walkable) or raise snap",
              ...extra,
            }, null, 2),
          }],
        };
      }

      // Same area, same region: one path.
      if (from.area === to.area && a.component === b.component) {
        const p = findPath(gFrom, { x: from.x, y: from.y, z: a.z, face: a.face }, { x: to.x, y: to.y, z: b.z, face: b.face }) as PathResult;
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              reachable: true,
              verdict: `Walkable: ${p.length} m, ground ${p.zMin === p.zMax ? `at ${p.zMin}` : `from ${p.zMin} to ${p.zMax}`} (climb ${p.climb} m, descent ${p.descent} m).`,
              from: pointOut(from, a, gFrom),
              to: pointOut(to, b, gTo),
              route: [hopSummary(from.area, p)],
              ...(showPath ? { path: p.points } : {}),
              note: NOT_MODELLED,
              ...extra,
            }, null, 2),
          }],
        };
      }

      // Otherwise: walk the transitions from the start region.
      const reach = await computeModuleReachability(index, resmanOpts, { area: from.area, x: from.x, y: from.y, z: a.z });
      const targetKey = `${to.area}:${b.component}`;
      if (reach.reachable.get(to.area)?.has(b.component)) {
        const chain: Transition[] = [];
        let k = targetKey;
        while (reach.via.has(k)) {
          const step = reach.via.get(k) as { prev: string; transition: Transition };
          chain.unshift(step.transition);
          k = step.prev;
        }
        const route: Array<Record<string, unknown>> = [];
        const paths: Array<{ area: string; points: PathResult["points"] }> = [];
        let cur: { area: string; x: number; y: number; z: number; face: number } = { area: from.area, x: from.x, y: from.y, z: a.z, face: a.face };
        let total = 0;
        for (let i = 0; i <= chain.length; i++) {
          const g = reach.graphs.get(cur.area) as WalkGraph;
          let end: { x: number; y: number; z: number; face: number };
          if (i < chain.length) {
            const hit = locateObject(g, chain[i].from) as LocatedPoint;
            end = { x: chain[i].from.x, y: chain[i].from.y, z: hit.z, face: hit.face };
          } else {
            end = { x: to.x, y: to.y, z: b.z, face: b.face };
          }
          const p = findPath(g, cur, end);
          if (!p) break;
          total += p.length;
          route.push(hopSummary(cur.area, p, chain[i]));
          if (showPath) paths.push({ area: cur.area, points: p.points });
          if (i < chain.length) {
            const tgtObj = chain[i].target;
            const tg = reach.graphs.get(tgtObj.area) as WalkGraph;
            const land = locateObject(tg, tgtObj) as LocatedPoint;
            cur = { area: tgtObj.area, x: tgtObj.x, y: tgtObj.y, z: land.z, face: land.face };
          }
        }
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              reachable: true,
              verdict: `Walkable through ${chain.length} transition${chain.length === 1 ? "" : "s"}: ${r1(total)} m on foot.`,
              from: pointOut(from, a, gFrom),
              to: pointOut(to, b, gTo),
              route,
              ...(showPath ? { path: paths } : {}),
              note: `${NOT_MODELLED} A transition counts even when a script or dialog condition gates it.`,
              ...extra,
            }, null, 2),
          }],
        };
      }

      // Not reachable: explain.
      const out: Record<string, unknown> = {
        reachable: false,
        from: pointOut(from, a, gFrom),
        to: pointOut(to, b, gTo),
      };
      if (from.area === to.area) {
        const gap = closestApproach(gFrom, a.component, b.component);
        const near = nearestInComponent(gFrom, a.component, to.x, to.y);
        const ca = gFrom.components[a.component];
        const cb = gFrom.components[b.component];
        out.verdict =
          `No walkable route: the two points are on separate ground (region ${a.component} at ${r1(ca.zMin)}-${r1(ca.zMax)} m, ` +
          `region ${b.component} at ${r1(cb.zMin)}-${r1(cb.zMax)} m) with no ramp, stair or transition between them.`;
        if (gap) {
          out.closestApproach = {
            metresApart: gap.distance,
            fromSide: gap.a,
            toSide: gap.b,
            heightGap: r2(Math.abs(gap.a.z - gap.b.z)),
          };
        }
        if (near) out.nearestReachableToTarget = near;
      } else {
        out.verdict = `No walkable route from ${from.area} to that spot in ${to.area}: no chain of doors, triggers or portals that can be walked to reaches its ground region.`;
        out.areasReached = [...reach.reachable.keys()];
      }
      out.hint =
        "Move the object onto the reachable region (nearestReachableToTarget), add a transition, or paint a ramp/stair tile. A deliberately unreachable creature (an archer on a wall) can carry the local int PATH_UNREACHABLE_OK = 1.";
      out.note = NOT_MODELLED;
      Object.assign(out, extra);
      return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
    },
  );
}
