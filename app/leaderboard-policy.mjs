export const rankingNameKey = (name) => String(name).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
// Excess entries are deferred, never discarded. Only positions 1–20 are capped.
export function rankScores(entries, limit = 100) {
  const ordered = [...entries].sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
  const first = [], rest = [], counts = new Map();
  for (const entry of ordered) {
    const key = rankingNameKey(entry.playerName);
    if (first.length < 20 && (counts.get(key) || 0) < 3) {
      first.push(entry); counts.set(key, (counts.get(key) || 0) + 1);
    } else rest.push(entry);
  }
  // Empty slots preserve the cap even if fewer than seven names have played.
  return [...first.map((entry, i) => ({ ...entry, position: i + 1 })),
    ...rest.map((entry, i) => ({ ...entry, position: 21 + i }))].filter(entry => entry.position <= limit);
}
