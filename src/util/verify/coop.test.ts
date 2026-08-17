/**
 * Co-op / multiplayer rule tests.
 *
 * Every module is assumed to be playable in a party, so a reward handed to a
 * single PC is a defect. These checkers read .nss source, so the fixtures write
 * real script files to a temp dir and point a mock ModuleIndex at them.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ModuleIndex } from "../../types/module.js";
import { Report } from "./common.js";
import { verifyJournalPartyFlags, verifyPartyQuestState, verifyPartyRewards } from "./scripts.js";

let tempDir: string;
let index: ModuleIndex;

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-coop-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  index = {
    modPath: "/fake/mod.mod",
    tempDir,
    moduleName: "Test",
    resources: new Map(),
    tags: new Map(),
    scripts: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    items: [],
    parsedGff: new Map(),
    twodaTables: new Map(),
    customTlk: null,
    baseTlk: null,
    hakList: [],
    customTlkName: "",
    loadWarnings: [],
  };
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

/** Write an .nss into the fake module and register it. */
async function addScript(resref: string, source: string): Promise<void> {
  const filePath = path.join(tempDir, `${resref}.nss`);
  await fs.writeFile(filePath, source);
  index.resources.set(`${resref}.nss`, { resref, extension: "nss", filePath, sizeBytes: source.length });
}

describe("verifyPartyRewards", () => {
  it("flags XP given only to the speaking PC", async () => {
    await addScript(
      "q_reward",
      `void main()
{
    object oPC = GetPCSpeaker();
    GiveXPToCreature(oPC, 500);
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors.map((e) => e.code)).toContain("reward_not_party_wide");
  });

  it("flags gold given only to the speaking PC", async () => {
    await addScript(
      "q_gold",
      `void main()
{
    GiveGoldToCreature(GetPCSpeaker(), 100);
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors).toHaveLength(1);
  });

  it("accepts a reward fanned out across the party", async () => {
    await addScript(
      "q_reward_party",
      `void main()
{
    object oPC = GetPCSpeaker();
    object oMember = GetFirstFactionMember(oPC, TRUE);
    while (GetIsObjectValid(oMember))
    {
        GiveXPToCreature(oMember, 500);
        GiveGoldToCreature(oMember, 100);
        oMember = GetNextFactionMember(oPC, TRUE);
    }
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors).toHaveLength(0);
  });

  it("accepts the RewardParty* helpers", async () => {
    await addScript(
      "q_reward_helper",
      `void main()
{
    RewardPartyXP(500, GetPCSpeaker());
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors).toHaveLength(0);
  });

  it("ignores scripts that hand out nothing", async () => {
    await addScript(
      "c_check",
      `int StartingConditional()
{
    return GetIsObjectValid(GetPCSpeaker());
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors).toHaveLength(0);
  });

  it("does not fire on reward names inside comments or dialogue strings", async () => {
    await addScript(
      "q_flavour",
      `void main()
{
    // GiveXPToCreature(GetPCSpeaker(), 100);  <- old version
    SpeakString("I would GiveGoldToCreature if I could, " + GetName(GetPCSpeaker()));
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors).toHaveLength(0);
  });
});

describe("verifyJournalPartyFlags", () => {
  it("flags an explicit bAllPartyMembers=FALSE", async () => {
    await addScript(
      "q_journal",
      `void main()
{
    AddJournalQuestEntry("q_amulet", 2, GetPCSpeaker(), FALSE);
}`,
    );

    const report = new Report("module", "coop");
    await verifyJournalPartyFlags(report, index);
    const finding = report.errors.find((e) => e.code === "journal_not_party_wide");
    expect(finding).toBeDefined();
    expect(finding?.message).toContain("q_amulet");
  });

  it("accepts the default (party-wide) form", async () => {
    await addScript(
      "q_journal_ok",
      `void main()
{
    AddJournalQuestEntry("q_amulet", 2, GetPCSpeaker());
}`,
    );

    const report = new Report("module", "coop");
    await verifyJournalPartyFlags(report, index);
    expect(report.errors).toHaveLength(0);
  });

  it("accepts an explicit TRUE", async () => {
    await addScript(
      "q_journal_true",
      `void main()
{
    AddJournalQuestEntry("q_amulet", 2, GetPCSpeaker(), TRUE);
}`,
    );

    const report = new Report("module", "coop");
    await verifyJournalPartyFlags(report, index);
    expect(report.errors).toHaveLength(0);
  });
});

describe("verifyPartyQuestState", () => {
  it("warns when quest state is stored on a single PC", async () => {
    await addScript(
      "q_state",
      `void main()
{
    SetLocalInt(GetPCSpeaker(), "AMULET_STAGE", 2);
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyQuestState(report, index);
    expect(report.warnings.map((w) => w.code)).toContain("quest_state_on_single_pc");
  });

  it("accepts module-scoped quest state", async () => {
    await addScript(
      "q_state_module",
      `void main()
{
    SetLocalInt(GetModule(), "AMULET_STAGE", 2);
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyQuestState(report, index);
    expect(report.warnings).toHaveLength(0);
  });
});

describe("inc_reward helpers", () => {
  it("accepts a script that rewards through CoopRewardQuest", async () => {
    await addScript(
      "q_done",
      `#include "inc_reward"
void main()
{
    CoopRewardQuest(GetPCSpeaker(), 250, 100, "boss");
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors).toHaveLength(0);
  });

  it("accepts CoopRewardItem alongside a raw CreateItemOnObject call", async () => {
    // The helper owns the fan-out decision, so a script that also creates an
    // item directly is still party-safe.
    await addScript(
      "q_loot",
      `#include "inc_reward"
void main()
{
    object oPC = GetPCSpeaker();
    CoopRewardItem(oPC, "it_relic");
    CreateItemOnObject("it_note", oPC);
}`,
    );

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors).toHaveLength(0);
  });
});

describe("per-player script exemption", () => {
  const stipend = `void main()
{
    object oPC = GetEnteringObject();
    GiveGoldToCreature(oPC, 2700);
}`;

  it("flags a single-PC gold grant by default", async () => {
    await addScript("a_mod_enter", stipend);

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index);
    expect(report.errors.map((e) => e.code)).toContain("reward_not_party_wide");
  });

  it("exempts the module's OnClientEnter handler", async () => {
    // OnClientEnter runs once per connecting player, so GetEnteringObject there
    // already reaches everybody — one at a time. Fanning it out would pay the
    // whole party again on every connect, which is the real bug.
    await addScript("a_mod_enter", stipend);

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index, { perPlayerScripts: new Set(["a_mod_enter"]) });
    expect(report.errors).toHaveLength(0);
  });

  it("does not exempt other scripts that happen to use GetEnteringObject", async () => {
    // An area OnEnter fires for whoever crosses first and genuinely must fan out.
    await addScript("a_area_enter", stipend.replace("a_mod_enter", "a_area_enter"));

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index, { perPlayerScripts: new Set(["a_mod_enter"]) });
    expect(report.errors.map((e) => e.code)).toContain("reward_not_party_wide");
  });
});

describe("co-op enforcement opt-out", () => {
  const soloReward = `void main()
{
    GiveXPToCreature(GetPCSpeaker(), 500);
    AddJournalQuestEntry("q_amulet", 2, GetPCSpeaker(), FALSE);
}`;

  it("reports errors by default", async () => {
    await addScript("q_solo", soloReward);

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index, { enforce: true });
    await verifyJournalPartyFlags(report, index, { enforce: true });
    expect(report.errors.map((e) => e.code)).toEqual(["reward_not_party_wide", "journal_not_party_wide"]);
    expect(report.warnings).toHaveLength(0);
  });

  it("downgrades to warnings for a deliberately single-player module", async () => {
    await addScript("q_solo", soloReward);

    const report = new Report("module", "coop");
    await verifyPartyRewards(report, index, { enforce: false });
    await verifyJournalPartyFlags(report, index, { enforce: false });
    expect(report.errors).toHaveLength(0);
    expect(report.warnings.map((w) => w.code)).toEqual(["reward_not_party_wide", "journal_not_party_wide"]);
  });
});
