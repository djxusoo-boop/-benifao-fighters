/** Keep saved choices in order, without hiding newly added characters or modes.
 * @template {string} T
 * @param {readonly T[]} base
 * @param {unknown} saved
 * @returns {T[]}
 */
export function arrangedOrder(base, saved) {
  const allowed = new Set(base);
  const seen = new Set();
  const result = [];
  if (Array.isArray(saved)) {
    for (const item of saved) {
      if (typeof item === "string" && allowed.has(/** @type {T} */ (item)) && !seen.has(item)) {
        seen.add(item);
        result.push(/** @type {T} */ (item));
      }
    }
  }
  for (const item of base) if (!seen.has(item)) result.push(item);
  return result;
}
