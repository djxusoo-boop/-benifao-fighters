import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { rankScores, rankingNameKey } from '../app/leaderboard-policy.mjs';
const route = readFileSync(new URL('../app/api/leaderboard/route.ts', import.meta.url), 'utf8');
const query = route.match(/`(WITH numbered[\s\S]*?)`/)[1];
const make = (id, playerName, score) => ({ id, playerName, score, createdAt: '2026-11-10 12:00:00' });
function database(entries) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_world_leaderboard.sql', import.meta.url), 'utf8'));
  db.exec('ALTER TABLE leaderboard_scores ADD COLUMN name_key TEXT; ALTER TABLE leaderboard_scores ADD COLUMN submission_id TEXT; CREATE UNIQUE INDEX leaderboard_submission_idx ON leaderboard_scores(submission_id)');
  const stmt = db.prepare('INSERT INTO leaderboard_scores (id, player_name, name_key, mode, score, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  for (const e of entries) stmt.run(e.id, e.playerName, rankingNameKey(e.playerName), 'fight', e.score, e.createdAt);
  return db;
}
test('100 positions; maximum three per name in first twenty; deferred scores return from 21', () => {
  const entries = Array.from({ length: 150 }, (_, i) => make(i + 1, i < 30 ? 'Xuso' : `Jugador ${i % 15}`, 10000 - i));
  const db = database(entries);
  const results = db.prepare(query).all('fight');
  assert.equal(results.length, 100);
  assert.deepEqual(results.map(e => e.id), rankScores(entries).map(e => e.id));
  assert.equal(results.filter(e => e.position <= 20 && e.playerName === 'Xuso').length, 3);
  assert.equal(results[20].id, 4);
  assert.equal(results.at(-1).position, 100);
  db.close();
});
test('few distinct players never put a fourth same name inside first twenty', () => {
  const entries = Array.from({ length: 10 }, (_, i) => make(i + 1, ['Xuso', ' XUSO ', 'xuso'][i % 3], 100 - i));
  const db = database(entries);
  const result = db.prepare(query).all('fight');
  assert.deepEqual(result.map(e => e.position), [1, 2, 3, 21, 22, 23, 24, 25, 26, 27]);
  assert.deepEqual(result.map(e => e.position), rankScores(entries).map(e => e.position));
  assert.equal(db.prepare(query).all('orbs').length, 0);
  db.close();
});
test('names normalize Unicode, spaces and casing; tied scores remain stable', () => {
  assert.equal(rankingNameKey('  ÁNGEL  López '), rankingNameKey('ángel López'));
  const entries = [make(3, 'A', 10), make(1, 'B', 10), make(2, 'C', 10)];
  assert.deepEqual(rankScores(entries).map(e => e.id), [1, 2, 3]);
});
test('retrying one submission never creates two scores', () => {
  const db = database([]);
  const query = route.match(/"(INSERT INTO leaderboard_scores[^"\n]+)"/)[1];
  const stmt = db.prepare(query);
  for (let i = 0; i < 3; i++) stmt.run('XUSO', 'xuso', 'abcdefgh', 'slug', 500, 'xuso');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM leaderboard_scores').get().n, 1);
  db.close();
});
test('anonymous presence renews, deduplicates browsers and expires disconnected sessions', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE live_sessions(token TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)');
  const beat = db.prepare('INSERT INTO live_sessions VALUES (?, ?) ON CONFLICT(token) DO UPDATE SET expires_at=excluded.expires_at');
  beat.run('browser-1', 65000); beat.run('browser-1', 80000); beat.run('browser-2', 65000);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM live_sessions').get().n, 2);
  db.prepare('DELETE FROM live_sessions WHERE expires_at < ?').run(70000);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM live_sessions').get().n, 1);
  db.close();
});
