import { describe, expect, it } from "vitest";
import { z } from "zod";
import { shortenText, slimDescription, slimLimitsFromEnv, slimShape, withSlimDescriptions } from "./slim-descriptions.js";

describe("shortenText", () => {
  it("keeps short text and cuts long text at a word, marked with ...", () => {
    expect(shortenText("short", 300)).toBe("short");
    const long = "Adds a node to an existing dialog. If parentType is 'entry', adds a PC reply linked from that entry. More text follows here.";
    const out = shortenText(long, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("...")).toBe(true);
    expect(long.startsWith(out.slice(0, -3))).toBe(true);
  });

  it("keeps everything when the limit is 0", () => {
    expect(shortenText("x".repeat(1000), 0)).toHaveLength(1000);
  });
});

describe("slimDescription", () => {
  const intro = "Build one area from a short spec, in one call: it picks the size and the feature groups when they are not given, then creates it.";
  const spec = 'spec: {"resref":"millroad","tileset":"ttr01"} plus optional style, purpose (inn, shop, home... for interiors), width.';
  const tail = " On a failure it names the step and field. Call it again with the field fixed.";

  it("keeps the sentence with the call format when the cut falls inside or before it", () => {
    const out = slimDescription(`${intro} ${spec}${tail}`, 150);
    expect(out).toContain('{"resref":"millroad","tileset":"ttr01"}');
    expect(out).toContain("width.");
    expect(out).not.toContain("On a failure");
  });

  it("does not end the sentence at an ellipsis or e.g.", () => {
    const out = slimDescription(`${intro} Give props, e.g. ["plc_barrel"] or home... for more. Then stop here. ${"x ".repeat(80)}`, 150);
    expect(out).toContain('e.g. ["plc_barrel"] or home... for more.');
  });

  it("cuts as before when there is no example, or the example is fully kept, or too long", () => {
    const plain = `${intro} ${"word ".repeat(60)}`;
    expect(slimDescription(plain, 100)).toBe(shortenText(plain, 100));
    const early = `Takes {"a":1}. ${"word ".repeat(60)}`;
    expect(slimDescription(early, 100)).toBe(shortenText(early, 100));
    const huge = `${intro} spec: {"a":"${"y".repeat(400)}"}.`;
    expect(slimDescription(huge, 100)).toBe(shortenText(huge, 100));
  });
});

describe("slimLimitsFromEnv", () => {
  it("is off without a profile and on (300/140) with one", () => {
    expect(slimLimitsFromEnv(false, {})).toEqual({ tool: 0, param: 0 });
    expect(slimLimitsFromEnv(true, {})).toEqual({ tool: 300, param: 140 });
  });

  it("takes MCP_DESCRIPTION_LIMIT, and 0 turns it off", () => {
    expect(slimLimitsFromEnv(true, { MCP_DESCRIPTION_LIMIT: "0" })).toEqual({ tool: 0, param: 0 });
    expect(slimLimitsFromEnv(false, { MCP_DESCRIPTION_LIMIT: "200" })).toEqual({ tool: 200, param: 140 });
  });
});

describe("withSlimDescriptions", () => {
  it("shortens the tool and parameter descriptions it registers", () => {
    const seen: unknown[][] = [];
    const fake = { tool: (...args: unknown[]) => seen.push(args) } as unknown as { tool: (...a: any[]) => unknown };
    const wrapped = withSlimDescriptions(fake, { tool: 80, param: 30 }) as unknown as { tool: (...a: unknown[]) => void };
    const long = "A very long description that goes on past the limit and says much more than a small model needs to read.";
    wrapped.tool("t", long, { name: z.string().describe("the name of the thing you want to change in the module") }, async () => ({ content: [] }));
    const [name, desc, shape] = seen[0] as [string, string, Record<string, z.ZodType>];
    expect(name).toBe("t");
    expect(desc.length).toBeLessThanOrEqual(80);
    expect((shape.name as { description?: string }).description?.length).toBeLessThanOrEqual(30);
    expect(seen[0]).toHaveLength(4);
  });

  it("passes everything through when off", () => {
    const seen: unknown[][] = [];
    const fake = { tool: (...args: unknown[]) => seen.push(args) } as unknown as { tool: (...a: any[]) => unknown };
    const same = withSlimDescriptions(fake, { tool: 0, param: 0 });
    expect(same).toBe(fake);
  });

  it("leaves short parameter descriptions and schemas without one alone", () => {
    const shape = { a: z.string().describe("short"), b: z.string() };
    const slim = slimShape(shape, 140);
    expect(slim.a).toBe(shape.a);
    expect(slim.b).toBe(shape.b);
  });
});
