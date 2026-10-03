/**
 * Batch extraction that survives missing resources.
 *
 * `nwn_resman_extract a.wok missing.wok b.wok` does not extract what it can: it crashes
 * ("Can't obtain a value from a `none`", exit 1) and extracts NOTHING, not even `a.wok`. Tilesets do have tiles
 * without a walkmesh (tcm02 and trs02 have several), so a single all-in-one call over a whole tileset or area
 * silently yields no walkmeshes at all. This helper bisects a failed batch so every resource that exists still
 * gets extracted, in O(missing x log n) calls instead of n single calls.
 */

/** Give up (the tool is probably missing or broken, not just short of a resource) after this many calls without any success. */
const MAX_CALLS_WITHOUT_SUCCESS = 6;

export interface SalvageResult {
  /** Names whose extraction succeeded. */
  extracted: string[];
  /** Names that could not be extracted (missing resources, or everything when the tool is unusable). */
  failed: string[];
  /** How many `extract` calls were made (for diagnostics and tests). */
  calls: number;
}

/**
 * Run `extract` on `names`; when it throws, split the batch in halves and retry each, down to single names.
 * `extract` must throw when the batch could not be (fully) extracted and must leave successful batches extracted.
 */
export async function extractSalvaging(
  names: readonly string[],
  extract: (batch: string[]) => Promise<void>,
): Promise<SalvageResult> {
  const extracted: string[] = [];
  const failed: string[] = [];
  let calls = 0;
  let succeeded = false;

  async function run(batch: string[]): Promise<void> {
    if (batch.length === 0) return;
    if (!succeeded && calls >= MAX_CALLS_WITHOUT_SUCCESS) {
      failed.push(...batch);
      return;
    }
    calls++;
    try {
      await extract(batch);
      succeeded = true;
      extracted.push(...batch);
      return;
    } catch {
      // fall through to bisect
    }
    if (batch.length === 1) {
      failed.push(batch[0]);
      return;
    }
    const mid = Math.ceil(batch.length / 2);
    await run(batch.slice(0, mid));
    await run(batch.slice(mid));
  }

  await run([...new Set(names)]);
  return { extracted, failed, calls };
}
