import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function run(payload, hosts='player.example.com') {
  const dir=mkdtempSync(join(tmpdir(),'ninety-catalogue-'));
  try {
    const input=join(dir,'input.json'),output=join(dir,'output.json');
    writeFileSync(input,JSON.stringify(payload));
    const result=spawnSync(process.execPath,['scripts/normalize-broadcast-catalogue.mjs',input,output],{
      encoding:'utf8',env:{...process.env,ALLOWED_HOSTS:hosts}
    });
    return { status:result.status, error:result.stderr, data:result.status===0?JSON.parse(readFileSync(output,'utf8')):null };
  } finally { rmSync(dir,{recursive:true,force:true}); }
}

test('normalizes authorized events',()=>{
  const r=run({events:[{id:'match-1',name:'Alpha vs Beta',iframe:'https://player.example.com/watch/1'}]});
  assert.equal(r.status,0,r.error);
  assert.equal(r.data.events[0].substreams[0].iframe,'https://player.example.com/watch/1');
});
test('accepts grouped streams with explicit event embeds',()=>{
  const r=run({streams:[{events:[{id:'match-2',title:'Gamma vs Delta',streams:[{embed_url:'https://player.example.com/watch/2'}]}]}]});
  assert.equal(r.status,0,r.error);
  assert.equal(r.data.events.length,1);
});
test('rejects blocked and deceptive embed hosts',()=>{
  for(const url of ['https://evil.example/watch','https://player.example.com.evil.example/watch','http://player.example.com/watch']){
    assert.notEqual(run({events:[{id:'match-1',name:'Alpha vs Beta',iframe:url}]}).status,0);
  }
});
test('rejects upstream errors and empty catalogues',()=>{
  assert.notEqual(run({success:false,error:'blocked',streams:[]}).status,0);
  assert.notEqual(run({events:[]}).status,0);
});
test('rejects duplicate IDs',()=>{
  const item={id:'same',name:'Alpha vs Beta',iframe:'https://player.example.com/watch'};
  assert.notEqual(run({events:[item,item]}).status,0);
});

test('flattens nested football groups and excludes other sports',()=>{
  const r=run({streams:[
    {category:'Football',streams:[{id:42,name:'Alpha vs Beta',substreams:[{iframe:'https://player.example.com/watch/42'}]}]},
    {category:'Basketball',streams:[{id:43,name:'Other game',iframe:'https://player.example.com/watch/43'}]}
  ]});
  assert.equal(r.status,0,r.error);
  assert.equal(r.data.events.length,1);
  assert.equal(r.data.events[0].id,'42');
});
