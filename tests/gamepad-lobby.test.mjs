import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=async name=>ts.transpileModule(await readFile(new URL(`../app/${name}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const manager=await compile('GamepadManager.tsx'),intent=await compile('lobby-input.ts');
test('actual GamepadManager routes two standard pads from cards to mode buttons',()=>{
 const effects=[],events=[];let raf,now=1000;
 const pads=[0,1].map(index=>({index,id:`DualShock ${index}`,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));
 const document={activeElement:null,hidden:false,addEventListener(){},removeEventListener(){},documentElement:{dataset:{},classList:{toggle(){},remove(){}}}};
 let clicks=0;
 const buttons=[0,1].map(()=>({getClientRects:()=>[1],focus(){document.activeElement=this;},scrollIntoView(){},click(){clicks++;}}));
 const lobby={dataset:{p1Locked:'false',p2Locked:'false',allReady:'false'},querySelectorAll:()=>buttons};
 document.querySelector=s=>s==='.phase-select .select-screen'?lobby:null;
 const react={useState:v=>[typeof v==='function'?v():v,()=>{}],useRef:v=>({current:v}),useEffect:fn=>effects.push(fn),useCallback:fn=>fn,useMemo:fn=>fn()};
 const context={exports:{},require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx:()=>null,jsxs:()=>null}:lobbyModule,document,navigator:{getGamepads:()=>pads},performance:{now:()=>now},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail;}},KeyboardEvent:class{},console};
 context.window={localStorage:{getItem:()=>null},addEventListener(){},removeEventListener(){},requestAnimationFrame:fn=>{raf=fn;return 1;},cancelAnimationFrame(){},dispatchEvent:e=>{
  events.push(e);
  if(e.type==='arcade:lobby'&&['confirm','back'].includes(e.detail.action)){
   lobby.dataset[e.detail.slot===0?'p1Locked':'p2Locked']=String(e.detail.action==='confirm');
   lobby.dataset.allReady=String(lobby.dataset.p1Locked==='true'&&lobby.dataset.p2Locked==='true');
  }
 }};
 const lobbyModule={};vm.runInNewContext(intent,{exports:lobbyModule});
 vm.runInNewContext(manager,context);context.exports.default();effects.forEach(fn=>fn());
 const tick=()=>{now+=20;raf();};tick();
 const press=(slot,index)=>{pads[slot].buttons[index].pressed=true;tick();};
 const release=(slot,index)=>{pads[slot].buttons[index].pressed=false;tick();};
 press(0,15);assert.equal(events.at(-1).detail.action,'move');assert.equal(events.at(-1).detail.slot,0);release(0,15);
 press(1,13);assert.equal(events.at(-1).detail.direction,2);assert.equal(events.at(-1).detail.slot,1);release(1,13);
 press(0,0);release(0,0);assert.equal(lobby.dataset.p1Locked,'true');assert.equal(clicks,0);
 press(1,0);tick();assert.equal(clicks,0,'held confirm must not start');release(1,0);
 press(0,15);release(0,15);assert.equal(document.activeElement,buttons[0]);
 press(1,15);release(1,15);assert.equal(document.activeElement,buttons[1]);
 press(1,0);assert.equal(clicks,1);release(1,0);
 press(0,1);release(0,1);assert.equal(lobby.dataset.p1Locked,'false');assert.equal(lobby.dataset.p2Locked,'true');
});
