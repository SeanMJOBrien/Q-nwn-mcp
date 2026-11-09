/** A resref is at most 16 characters (the GFF resref field and the toolset both cut longer ones). Returns a tool error result, or null when fine. */
export function resrefError(resref: string): { content: Array<{ type: "text"; text: string }>; isError: true } | null {
  if (resref.length > 0 && resref.length <= 16 && /^[A-Za-z0-9_]+$/.test(resref)) return null;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          success: false,
          error: `Invalid resref '${resref}': it must be 1-16 characters of letters, digits and underscores (got ${resref.length}).`,
          fix: "Shorten the resref (the tag and name can stay long), then call again.",
        }),
      },
    ],
    isError: true,
  };
}
