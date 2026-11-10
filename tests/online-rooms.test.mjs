import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { roomCommand, ROOM_TTL } from '../app/room-service.mjs';
const host = '11111111-1111-4111-8111-111111111111';
const guest = '22222222-2222-4222-8222-222222222222';
const intruder = '33333333-3333-4333-8333-333333333333';
const offer = { type:'offer', sdp:'v=0\r\na=test-offer' };
const answer = { type:'answer', sdp:'v=0\r\na=test-answer' };
function database() {
 const raw = new DatabaseSync(':memory:');
 raw.exec(readFileSync(new URL('../drizzle/0004_complex_vertigo.sql',import.meta.url),'utf8'));
 return { prepare(sql) { return { bind(...args) { const stmt = raw.prepare(sql); return { async first() { return stmt.get(...args) ?? null; }, async run() { const result = stmt.run(...args); return { meta:{ changes:Number(result.changes) } }; } }; } }; } };
}
test('four-digit code preserves leading zeroes and create retries return same room', async () => {
 const db = database();
 assert.deepEqual(await roomCommand(db,{action:'create',token:host,offer},100,()=>7),{code:'0007',role:'host'});
 assert.equal((await roomCommand(db,{action:'create',token:host,offer},101,()=>99)).code,'0007');
});
test('simultaneous joins grant player two to exactly one token', async () => {
 const db = database(); await roomCommand(db,{action:'create',token:host,offer},100,()=>1234);
 const joined = await Promise.allSettled([guest,intruder].map(token=>roomCommand(db,{action:'join',token,code:'1234'},101)));
 assert.equal(joined.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(joined.find(r=>r.status==='rejected').reason.status,409);
 assert.deepEqual((await roomCommand(db,{action:'join',token:guest,code:'1234'},102)).offer,offer);
});
test('only members see signalling, only guest answers, and leave closes host room', async () => {
 const db=database(); await roomCommand(db,{action:'create',token:host,offer},100,()=>1234);
 await roomCommand(db,{action:'join',token:guest,code:'1234'},101);
 await assert.rejects(roomCommand(db,{action:'poll',token:intruder,code:'1234'},102),e=>e.status===404);
 await assert.rejects(roomCommand(db,{action:'answer',token:host,code:'1234',answer},102),e=>e.status===403);
 await roomCommand(db,{action:'answer',token:guest,code:'1234',answer},102);
 assert.deepEqual((await roomCommand(db,{action:'poll',token:host,code:'1234'},103)).answer,answer);
 assert.equal((await roomCommand(db,{action:'poll',token:guest,code:'1234'},103)).answer,null);
 await roomCommand(db,{action:'leave',token:host,code:'1234'},104);
 await assert.rejects(roomCommand(db,{action:'join',token:guest,code:'1234'},105),e=>e.status===404);
});
test('expired rooms and oversized descriptions are rejected; expired codes can be reused', async () => {
 const db=database(); await roomCommand(db,{action:'create',token:host,offer},100,()=>1234);
 await assert.rejects(roomCommand(db,{action:'join',token:guest,code:'1234'},101+ROOM_TTL),e=>e.status===404);
 await assert.rejects(roomCommand(db,{action:'create',token:guest,offer:{type:'offer',sdp:'v=0'+'x'.repeat(33000)}},200),e=>e.status===400);
 assert.equal((await roomCommand(db,{action:'create',token:guest,offer},101+ROOM_TTL,()=>1234)).code,'1234');
});
