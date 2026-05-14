/**
 * Fuzzy matching utility for "did you mean?" suggestions.
 *
 * Uses Levenshtein distance to find the closest match from a list of candidates.
 */

/**
 * Computes the Levenshtein edit distance between two strings.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns The minimum number of single-character edits to transform `a` into `b`.
 */
export function levenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  // Quick bailouts
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;
  if (a === b) return 0;

  // Single row of previous values
  const prev = Array.from({ length: bLen + 1 }, (_, i) => i);

  for (let i = 1; i <= aLen; i++) {
    let prevDiag = i - 1;
    prev[0] = i;

    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const current = Math.min(
        (prev[j] ?? 0) + 1, // deletion
        (prev[j - 1] ?? 0) + 1, // insertion
        prevDiag + cost, // substitution
      );
      prevDiag = prev[j] ?? 0;
      prev[j] = current;
    }
  }

  return prev[bLen] ?? bLen;
}

/** A suggestion result with the candidate and its edit distance. */
export interface FuzzyMatch {
  /** The matching candidate string. */
  candidate: string;
  /** The Levenshtein distance from the input. */
  distance: number;
}

/** Default maximum distance threshold for suggestions. */
const DEFAULT_MAX_DISTANCE = 3;

/**
 * Finds the closest matches to `input` from a list of `candidates`.
 *
 * @param input - The unknown string to match against.
 * @param candidates - The list of valid strings to compare.
 * @param maxDistance - Maximum edit distance to consider (default: 3).
 * @returns Sorted array of matches within the distance threshold. Empty if none found.
 */
export function fuzzyMatch(
  input: string,
  candidates: readonly string[],
  maxDistance: number = DEFAULT_MAX_DISTANCE,
): FuzzyMatch[] {
  const matches: FuzzyMatch[] = [];

  for (const candidate of candidates) {
    const distance = levenshtein(input.toLowerCase(), candidate.toLowerCase());
    if (distance <= maxDistance) {
      matches.push({ candidate, distance });
    }
  }

  // Sort by distance (closest first), then alphabetically for ties
  matches.sort((a, b) => a.distance - b.distance || a.candidate.localeCompare(b.candidate));

  return matches;
}

/**
 * Returns a "Did you mean?" suggestion string, or undefined if no good match.
 *
 * @param input - The unknown string.
 * @param candidates - Valid candidates to match against.
 * @returns A formatted suggestion like `Did you mean "mc-text"?`, or undefined.
 */
export function suggest(input: string, candidates: readonly string[]): string | undefined {
  const matches = fuzzyMatch(input, candidates, DEFAULT_MAX_DISTANCE);
  const best = matches[0];

  if (!best) return undefined;

  return `Did you mean "${best.candidate}"?`;
}
