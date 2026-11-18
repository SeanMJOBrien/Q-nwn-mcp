import { describe, expect, it } from "vitest";
import { requireIndex } from "../module-loader.js";
import { CORE_TOOLS } from "../tool-profiles.js";
import { noModuleMessage, SERVER_INSTRUCTIONS } from "./no-module-guide.js";

describe("no module loaded: guidance for weak models", () => {
  it("names both ways in and tells the model not to retry", () => {
    const msg = noModuleMessage();
    expect(msg).toContain("create_module(");
    expect(msg).toContain("load_module(");
    expect(msg).toContain("Do not call this tool again");
  });

  it("requireIndex throws the guidance, not a bare error", () => {
    expect(() => requireIndex()).toThrow(/create_module/);
  });

  it("the server instructions and the always-on tools include the way to start a new module", () => {
    expect(SERVER_INSTRUCTIONS).toContain("create_module");
    expect(CORE_TOOLS).toContain("create_module");
    expect(CORE_TOOLS).toContain("load_module");
  });
});
