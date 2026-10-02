import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMatchEnded, isEffectivelyLive } from '../app/match-lifecycle.ts';
import { findFixture, teamKey } from '../app/football-fixtures.ts';
const date = Date.UTC(2026,8,29,18,45);
const match = { date, live:true, apiSources:[{}] };
test('future matches never count as live',()=>assert.equal(isEffectivelyLive(match,date-1),false));
test('stale feed expires at two hours and leaves Live',()=>{assert.equal(isMatchEnded(match,date+120*60000),true);assert.equal(isEffectivelyLive(match,date+120*60000),false)});
test('confirmed final whistle overrides kickoff fallback',()=>assert.equal(isMatchEnded({...match,matchStatus:'FT'},date+100*60000),true));
test('stale second-half status cannot keep a finished match live indefinitely',()=>{assert.equal(isMatchEnded({...match,matchStatus:'2H'},date+136*60000),true);assert.equal(isEffectivelyLive({...match,matchStatus:'2H'},date+136*60000),false)});
test('confirmed extra time remains live past normal cutoff',()=>assert.equal(isEffectivelyLive({...match,matchStatus:'ET'},date+130*60000),true));
test('postponed games never count as live',()=>assert.equal(isEffectivelyLive({...match,matchStatus:'PST'},date+60000),false));
test('country aliases match while ambiguous fixtures are rejected',()=>{
 const fixture={fixture:{id:1,date:new Date(date).toISOString()},teams:{home:{name:'Czech Republic'},away:{name:'England'}}};
 assert.equal(findFixture([fixture],'Czechia','England',date)?.fixture.id,1);
 assert.equal(findFixture([fixture,fixture],'Czechia','England',date),undefined);
 assert.equal(findFixture([fixture],'Czechia','England',date+2*3600000),undefined);
 assert.equal(teamKey('United States'),teamKey('USA'));
});
