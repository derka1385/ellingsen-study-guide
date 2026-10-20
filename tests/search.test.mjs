import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const items = JSON.parse(await readFile(new URL('authoring/concepts.json', root),'utf8'));
const context = vm.createContext({});
vm.runInContext(await readFile(new URL('authoring/smart_search.js',root),'utf8') + `
this.find = (query, items) => smartSearch(query, items.map(item => makeSearchDocument(
  item, Object.values(item.title).join(' '), (CONCEPT_ALIASES[item.id] || []).join(' '),
  ['idea','question','answer','pitfall'].flatMap(key => Object.values(item[key])).join(' ')
))).map(item => item.id);`,context);
const find = (query, source = items) => Array.from(context.find(query, source));
test('concept search ranks terms, everyday ideas and typos across three languages',()=>{
 for (const [query,expected] of [
  ['Nash','nash'],['Nahs','nash'],['équlibre Nash','nash'],['equilibruim','nash'],
  ['promesse non tenue','hold-up'],['holdup','hold-up'],['невиконана обіцянка','hold-up'],
  ['pourquoi personne ne contribue','social-dilemma'],['coopertaion','cooperation'],
  ['best reply','best-response'],['повторювана гра','repeated-game'],
 ]) assert.equal(find(query)[0],expected,query);
});
test('search respects the supplied chapter subset and returns no fabricated results',()=>{
 assert.deepEqual(find('Nash',items.filter(item=>item.ch===2)),[]);
 assert.deepEqual(find('xxxxxxxxxxxxxxxxxx'),[]);
 assert.deepEqual(find('what is the'),[]);
 assert.deepEqual(find(''),[]);
 assert.ok(find('<script>alert(1)</script>').every(id=>items.some(item=>item.id===id)));
});
test('search is deterministic and leaves the source data unchanged',()=>{
 const before=JSON.stringify(items);
 assert.deepEqual(find('promesse non tenue'),find('PROMESSE NON TENUE'));
 assert.equal(JSON.stringify(items),before);
});
