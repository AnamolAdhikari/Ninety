import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync(new URL('../app/account-storage.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function runtime(storage,server){const listeners={};const sandbox={exports:{},AbortSignal,Event,CustomEvent,fetch:async(path,options={})=>{
  if(path==='/api/account')return {ok:true,json:async()=>({role:'friend',storageId:'friend:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',sync:true})};
  if(!server.online)throw new Error('Offline');
  if(options.method==='POST'){const body=JSON.parse(options.body);if(!body.onlyIfMissing||server.values[body.key]===undefined)server.values[body.key]=body.value;}
  return {ok:true,json:async()=>({values:{...server.values}})};
},document:{hidden:false},window:{localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},dispatchEvent(){},addEventListener:(name,fn)=>listeners[name]=fn,setInterval:()=>0}};vm.runInNewContext(source,sandbox);return {...sandbox.exports,listeners};}
const settle=()=>new Promise(resolve=>setTimeout(resolve,20));
test('offline saves survive reload and sync when connectivity returns',async()=>{
  const storage=new Map(),server={online:false,values:{}};
  const first=runtime(storage,server);await first.initializeAccountStorage();first.accountStorage.setItem('ninety-favorites','["saved-offline"]');await settle();
  assert.equal(first.accountStorage.getItem('ninety-favorites'),'["saved-offline"]');assert.equal(server.values['ninety-favorites'],undefined);
  const second=runtime(storage,server);await second.initializeAccountStorage();assert.equal(second.accountStorage.getItem('ninety-favorites'),'["saved-offline"]');
  server.online=true;second.listeners.online();await settle();assert.equal(server.values['ninety-favorites'],'["saved-offline"]');
  assert.equal([...storage.entries()].find(([key])=>key.endsWith(':sync-outbox'))[1],'[]');
});
test('cloud data wins over stale local cache when no offline change is queued',async()=>{
  const storage=new Map([['ninety-account:friend:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:ninety-favorites','["stale"]']]),server={online:true,values:{'ninety-favorites':'["cloud-match"]'}};
  const app=runtime(storage,server);await app.initializeAccountStorage();assert.equal(app.accountStorage.getItem('ninety-favorites'),'["cloud-match"]');
});
