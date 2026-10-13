import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
// Only these resources can ever be served. Sources, backups and config files stay private.
const publicFiles = new Map([['/login.html','text/html; charset=utf-8'],['/firebase-config.js','text/javascript; charset=utf-8']]);
const privateFiles = new Map([['/ellingsen.html','text/html; charset=utf-8'],['/i18n/en.js','text/javascript; charset=utf-8'],['/i18n/uk.js','text/javascript; charset=utf-8']]);
const cookieName = 'ioe_session';
const clearCookie = secure => `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;

// The verifier is injected only by tests. The executable always uses Firebase Admin.
export function createAccessServer({verifyToken, origin, directory = root}) {
  const canonical = new URL(origin);
  if (!['http:', 'https:'].includes(canonical.protocol) || canonical.pathname !== '/' || canonical.search || canonical.hash || canonical.username || canonical.password) throw new Error('APP_ORIGIN must be a plain HTTP(S) origin');
  const local = ['localhost','127.0.0.1','[::1]'].includes(canonical.hostname);
  if (canonical.protocol !== 'https:' && !local) throw new Error('HTTPS is required outside localhost');
  const secure = canonical.protocol === 'https:';
  return http.createServer(async (req,res) => {
    res.setHeader('Cache-Control','no-store, private');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('X-Frame-Options','DENY');
    if (secure) res.setHeader('Strict-Transport-Security','max-age=31536000');
    const reply = (status, body = '') => {res.writeHead(status, {'Content-Type':'text/plain; charset=utf-8'});res.end(body);};
    try {
      const url = new URL(req.url, canonical);
      if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      if (url.pathname === '/session') {
        if (req.headers.origin !== canonical.origin) return reply(403,'Origin refused');
        if (req.method === 'DELETE') {res.setHeader('Set-Cookie', clearCookie(secure));return reply(204);}
        if (req.method !== 'POST') return reply(405);
        if (!req.headers['content-type']?.startsWith('application/json')) return reply(415);
        let body = '', size = 0;
        for await (const chunk of req) {size += chunk.length;if (size > 16384) return reply(413);body += chunk;}
        let token; try {token = JSON.parse(body).token;} catch {return reply(400);}
        if (typeof token !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(token)) return reply(400);
        let claims; try {claims = await verifyToken(token);} catch {res.setHeader('Set-Cookie',clearCookie(secure));return reply(401,'Sign in again');}
        const ttl = Math.floor(claims.exp - Date.now()/1000);
        if (!claims.uid || ttl <= 0 || ttl > 3600) return reply(401);
        res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttl}${secure ? '; Secure' : ''}`);
        return reply(204);
      }
      if (!['GET','HEAD'].includes(req.method)) return reply(405);
      const pathname = url.pathname === '/' ? '/ellingsen.html' : url.pathname;
      const type = publicFiles.get(pathname) || privateFiles.get(pathname);
      if (!type) return reply(404);
      if (privateFiles.has(pathname)) {
        const token = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
        let claims;try {if (token) claims = await verifyToken(token);} catch {}
        if (!claims?.uid || !(claims.exp > Date.now()/1000)) {
          res.setHeader('Set-Cookie',clearCookie(secure));
          if (pathname === '/ellingsen.html') {res.writeHead(302,{'Location':'/login.html'});res.end();return;}
          return reply(401,'Sign in required');
        }
      }
      let content = await readFile(path.join(directory,pathname.slice(1)));
      if (pathname === '/ellingsen.html') content = Buffer.from(content.toString().replace('<script src="firebase-config.js">','<script>window.IOE_PROTECTED_HOST=true;</script><script src="firebase-config.js">'));
      res.writeHead(200,{'Content-Type':type});res.end(req.method === 'HEAD' ? undefined : content);
    } catch {if (!res.headersSent) reply(500,'Request failed');else res.end();}
  });
}

async function main() {
  const context = {window:{}};
  vm.runInNewContext(await readFile(path.join(root,'firebase-config.js'),'utf8'),context,{timeout:1000});
  const projectId = context.window.IOE_FIREBASE_CONFIG?.projectId;
  if (!projectId) throw new Error('Fill in firebase-config.js before starting the server.');
  // Only public signing certificates are used. No service account or admin key is needed.
  const {initializeApp} = await import('firebase-admin/app');
  const {getAuth} = await import('firebase-admin/auth');
  const auth = getAuth(initializeApp({projectId}));
  const port = Number(process.env.PORT || 8000), host = process.env.HOST || '127.0.0.1';
  const origin = process.env.APP_ORIGIN || `http://localhost:${port}`;
  const server = createAccessServer({verifyToken: token => auth.verifyIdToken(token), origin});
  server.listen(port,host,()=>process.stdout.write(`Study guide: ${origin}/\n`));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
