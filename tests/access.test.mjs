import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccessServer} from '../server.mjs';
const tokens = new Map([['valid.token.signature',{uid:'learner',exp:Math.floor(Date.now()/1000)+3500}],['expired.token.signature',{uid:'learner',exp:1}]]);
test('server denies the study guide and catalogs until a verified account session exists',async()=>{
 const server=createAccessServer({origin:'http://localhost:8000',verifyToken:async token=>{if(!tokens.has(token))throw new Error('invalid signature');return tokens.get(token);}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(url,options={})=>fetch(base+url,{redirect:'manual',...options});
 try {
  for(const url of ['/','/ellingsen.html','#ch1']){const r=await request(url==='#ch1'?'/ellingsen.html#ch1':url);assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/login.html');assert.ok(!(await r.text()).includes('data-i='));}
  for(const url of ['/i18n/en.js','/i18n/uk.js']) assert.equal((await request(url)).status,401);
  for(const url of ['/i18n/blocks.json','/i18n/tagged.html','/.git/config','/server.mjs','/README.md','/package.json','/%2e%2e/server.mjs'])assert.equal((await request(url)).status,404);
  const login=await request('/login.html');assert.equal(login.status,200);assert.ok(!(await login.text()).includes('data-i='));
  assert.equal((await request('/firebase-config.js')).status,200);
  const post=body=>({method:'POST',headers:{origin:'http://localhost:8000','Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await request('/session',{...post({token:'valid.token.signature'}),headers:{origin:'https://attacker.invalid','Content-Type':'application/json'}})).status,403);
  assert.equal((await request('/session',post({token:'forged.token.signature'}))).status,401);
  assert.equal((await request('/session',post({token:'expired.token.signature'}))).status,401);
  assert.equal((await request('/session',post({token:'unsafe; cookie'}))).status,400);
  assert.equal((await request('/session',post({token:'x'.repeat(17000)}))).status,413);
  const session=await request('/session',post({token:'valid.token.signature'}));assert.equal(session.status,204);
  const cookie=session.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Max-Age=/);
  const headers={cookie:cookie.split(';')[0]};
  const study=await request('/ellingsen.html',{headers});assert.equal(study.status,200);assert.match(study.headers.get('cache-control'),/no-store/);assert.match(await study.text(),/IOE_PROTECTED_HOST=true/);
  assert.equal((await request('/i18n/uk.js',{headers})).status,200);
  assert.equal((await request('/ellingsen.html',{headers:{cookie:'ioe_session=forged.token.signature'}})).status,302);
  const out=await request('/session',{method:'DELETE',headers:{origin:'http://localhost:8000'}});assert.equal(out.status,204);assert.match(out.headers.get('set-cookie'),/Max-Age=0/);
  assert.throws(()=>createAccessServer({origin:'http://example.com',verifyToken:()=>{}}),/HTTPS/);
  assert.throws(()=>createAccessServer({origin:'https://example.com/path',verifyToken:()=>{}}),/plain/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
