import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../app/lobby-input.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {lobbyIntent}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const input=(locked,allReady,button=-1,horizontal=0,vertical=0)=>lobbyIntent({locked,allReady,button,horizontal,vertical});
test('two pads independently choose, lock, navigate modes and launch',()=>{
 const locked=[false,false];
 for(const slot of [0,1]){
  assert.equal(input(locked[slot],false,-1,1).action,'move');
  assert.equal(input(locked[slot],false,0).action,'confirm');locked[slot]=true;
  if(slot===0) assert.equal(input(true,false,0).action,'start','a locked pad can start without waiting for the other');
 }
 for(const slot of [0,1]){
  assert.equal(input(locked[slot],true,-1,1).action,'mode');
  assert.equal(input(locked[slot],true,0).action,'start');
  assert.equal(input(locked[slot],true,1).action,'back');
 }
});
test('one pad can confirm then launch; release does not repeat an action',()=>{
 assert.equal(input(false,false,0).action,'confirm');
 assert.equal(input(true,true).action,'none');
 assert.equal(input(true,true,9).action,'start');
 assert.equal(input(false,false,-1,0,1).direction,2);
 assert.equal(input(true,true,-1,0,1).direction,1);
 for(const button of [2,3,4,5]) assert.equal(input(true,true,button).action,'none');
});
test('up/down follow the real grid columns',()=>{
 assert.equal(lobbyIntent({locked:false,allReady:false,button:-1,horizontal:0,vertical:1,columns:7}).direction,7);
 assert.equal(lobbyIntent({locked:true,allReady:true,button:-1,horizontal:0,vertical:-1,modeColumns:4}).direction,-4);
});
