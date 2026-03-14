/**
 * Line-based 3-way merge.
 * Returns the merged string, or null if a conflict is detected.
 *
 * base   – the common ancestor (content at last load/save)
 * ours   – current editor content
 * theirs – new content from disk
 */
export function merge3(
  base: string,
  ours: string,
  theirs: string,
): string | null {
  // No divergence
  if (ours === theirs) return ours;
  // Only remote changed
  if (base === ours) return theirs;
  // Only local changed
  if (base === theirs) return ours;

  // Both sides changed — attempt line-level merge
  const baseLines = base.split("\n");
  const oursLines = ours.split("\n");
  const theirLines = theirs.split("\n");

  // Compute the set of line-index ranges changed in "ours" vs base
  const oursChanged = changedRanges(baseLines, oursLines);

  // Apply theirs-vs-base hunks to ours, checking for overlaps
  const theirHunks = diffHunks(baseLines, theirLines);

  // Walk through hunks and build the result
  const result: string[] = [];
  // We'll rebuild from oursLines, applying their hunks where ours didn't touch
  let oursIdx = 0;

  for (const hunk of theirHunks) {
    // Copy ours lines up to the start of this hunk (offset-adjusted)
    const baseStart = hunk.baseStart;
    const baseEnd = hunk.baseEnd; // exclusive

    // Map baseStart/baseEnd to our-line indices
    // (base and ours may differ in length, but we only need to know if ours
    //  also changed in this region)
    if (overlaps(oursChanged, baseStart, baseEnd)) {
      return null; // conflict
    }

    // Copy ours lines that correspond to base lines [oursIdx..baseStart)
    // We need to figure out the ours-line offset for baseStart
    const oursStart = baseToOurs(baseLines, oursLines, baseStart);
    if (oursStart === null) return null; // can't map — conflict

    result.push(...oursLines.slice(oursIdx, oursStart));
    oursIdx = oursStart + (baseEnd - baseStart);
    // Apply their replacement
    result.push(...hunk.replacement);
  }

  // Append remaining ours lines
  result.push(...oursLines.slice(oursIdx));

  return result.join("\n");
}

// ---- helpers ----------------------------------------------------------------

interface Hunk {
  baseStart: number; // first changed line in base (inclusive)
  baseEnd: number;   // last changed line in base (exclusive)
  replacement: string[];
}

/** Compute minimal diff hunks: regions where theirs differs from base */
function diffHunks(baseLines: string[], theirLines: string[]): Hunk[] {
  const hunks: Hunk[] = [];
  let i = 0;
  let j = 0;

  while (i < baseLines.length || j < theirLines.length) {
    if (i < baseLines.length && j < theirLines.length && baseLines[i] === theirLines[j]) {
      i++;
      j++;
    } else {
      // Find the end of this changed region (simple greedy approach)
      const baseStart = i;
      const theirStart = j;

      // Advance until we find a line that matches in both
      let found = false;
      for (let lookahead = 1; lookahead <= Math.max(baseLines.length - i, theirLines.length - j) + 1; lookahead++) {
        for (let bi = i; bi <= Math.min(i + lookahead, baseLines.length); bi++) {
          for (let ti = j; ti <= Math.min(j + lookahead, theirLines.length); ti++) {
            if (bi === baseLines.length && ti === theirLines.length) {
              // Both exhausted — rest is the hunk
              hunks.push({
                baseStart,
                baseEnd: baseLines.length,
                replacement: theirLines.slice(theirStart),
              });
              i = baseLines.length;
              j = theirLines.length;
              found = true;
              break;
            }
            if (bi < baseLines.length && ti < theirLines.length && baseLines[bi] === theirLines[ti] && bi > baseStart) {
              hunks.push({
                baseStart,
                baseEnd: bi,
                replacement: theirLines.slice(theirStart, ti),
              });
              i = bi;
              j = ti;
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      if (!found) {
        // Rest of both is one big hunk
        hunks.push({
          baseStart,
          baseEnd: baseLines.length,
          replacement: theirLines.slice(theirStart),
        });
        break;
      }
    }
  }

  return hunks;
}

/** Returns the set of [start,end) ranges in base that were changed in ours */
function changedRanges(
  baseLines: string[],
  oursLines: string[],
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;
  let j = 0;

  while (i < baseLines.length || j < oursLines.length) {
    if (i < baseLines.length && j < oursLines.length && baseLines[i] === oursLines[j]) {
      i++;
      j++;
    } else {
      const start = i;
      // Greedy: advance until match
      let found = false;
      for (let lookahead = 1; lookahead <= Math.max(baseLines.length - i, oursLines.length - j) + 1; lookahead++) {
        for (let bi = i; bi <= Math.min(i + lookahead, baseLines.length); bi++) {
          for (let oi = j; oi <= Math.min(j + lookahead, oursLines.length); oi++) {
            if (bi === baseLines.length && oi === oursLines.length) {
              ranges.push([start, baseLines.length]);
              i = baseLines.length;
              j = oursLines.length;
              found = true;
              break;
            }
            if (bi < baseLines.length && oi < oursLines.length && baseLines[bi] === oursLines[oi] && bi > start) {
              ranges.push([start, bi]);
              i = bi;
              j = oi;
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (found) break;
      }

      if (!found) {
        ranges.push([start, baseLines.length]);
        break;
      }
    }
  }

  return ranges;
}

/** Check if [start,end) overlaps any of the changed ranges */
function overlaps(
  ranges: Array<[number, number]>,
  start: number,
  end: number,
): boolean {
  return ranges.some(([rs, re]) => rs < end && re > start);
}

/**
 * Map a base-line index to the corresponding ours-line index.
 * Returns null if the region was changed in ours (so mapping is ambiguous).
 */
function baseToOurs(
  baseLines: string[],
  oursLines: string[],
  baseIdx: number,
): number | null {
  let i = 0;
  let j = 0;

  while (i < baseIdx) {
    if (i >= baseLines.length) return null;
    if (j >= oursLines.length) return null;
    if (baseLines[i] === oursLines[j]) {
      i++;
      j++;
    } else {
      // ours diverged here — skip ours lines until we resync
      // For simplicity: if we hit a divergence before reaching baseIdx, return null
      return null;
    }
  }

  return j;
}
