import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../ellingsen.html',import.meta.url),'utf8');
const runtime=await readFile(new URL('../authoring/concepts_runtime.js',import.meta.url),'utf8');
const slice=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
function harness({blocked=false}={}){
 const cache=new Map([['ioe-cards',JSON.stringify({'v:sacrifice':2})]]),writes=[];
 const context=vm.createContext({
  localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return cache.get(k)??null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');cache.set(k,v);}},
  capture:(...args)=>writes.push(args),
 });
 const source=`
 const clone=value=>JSON.parse(JSON.stringify(value));
 let language='fr',authUser={uid:'test-reader'},authEpoch=0,writePromise=Promise.resolve(),accountMessage='';
 const firebaseServices={db:{},fs:{doc:(db,collection,uid)=>({collection,uid}),serverTimestamp:()=>0,setDoc:async(...args)=>capture(...args)}};
 function paintAccount(){}
 ${slice('const cloudState =','const esc =')}
 ${slice('function normalizeProgress','function localRead')}
 ${slice('function queueCloudWrite','async function receiveUser')}
 const fc={ratings:{}};
 ${runtime.slice(runtime.indexOf('function conceptIsChecked'),runtime.indexOf('function paintConceptChecklist'))}
 this.api={store,normalizeProgress,cloudState,flushCloud,fc,conceptIsChecked};`;
 vm.runInContext(source,context);
 return {api:context.api,writes,cache};
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('checklist persists locally alongside existing card ratings',()=>{
 const {api}=harness();
 const cards=api.store.get('ioe-cards',{});cards['concept:nash']=2;api.store.set('ioe-cards',cards);
 const restored=api.normalizeProgress({cards:api.store.get('ioe-cards',{})});
 api.fc.ratings=restored.cards;
 assert.equal(api.conceptIsChecked('nash'),true);
 assert.equal(restored.cards['v:sacrifice'],2);
});
test('account checklist writes only its delta through the existing Firestore path',async()=>{
 const {api,writes,cache}=harness();const originalLocal=cache.get('ioe-cards');
 api.cloudState.active=true;api.cloudState.data.cards={'v:sacrifice':2};
 api.store.set('ioe-cards',{'v:sacrifice':2,'concept:nash':2});await api.flushCloud();
 assert.deepEqual(plain(writes[0]),[{collection:'users',uid:'test-reader'},{cards:{'concept:nash':2},updatedAt:0},{merge:true}]);
 api.fc.ratings=api.normalizeProgress({cards:api.store.get('ioe-cards',{})}).cards;
 assert.equal(api.conceptIsChecked('nash'),true);
 api.store.set('ioe-cards',{'v:sacrifice':2,'concept:nash':1});await api.flushCloud();
 assert.equal(writes[1][1].cards['concept:nash'],1);
 assert.equal(api.store.get('ioe-cards',{})['v:sacrifice'],2);
 assert.equal(cache.get('ioe-cards'),originalLocal);
});
test('blocked local storage does not break checklist interaction',()=>{
 const {api}=harness({blocked:true});
 assert.deepEqual(plain(api.store.get('ioe-cards',{})),{});
 assert.doesNotThrow(()=>api.store.set('ioe-cards',{'concept:nash':2}));
});
