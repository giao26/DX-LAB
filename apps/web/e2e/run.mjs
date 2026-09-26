import { spawn } from 'node:child_process';
import { cpSync } from 'node:fs';
const env={...process.env,DX_E2E_MANAGED_RUNNER:'true',HOSTNAME:'localhost',PORT:'3100',DX_PUBLIC_ORIGIN:'http://localhost:3100',WEB_OIDC_ISSUER:'http://localhost:3101/realms/test',WEB_OIDC_BACKCHANNEL_ISSUER:'http://localhost:3101/realms/test',WEB_SESSION_SECRET:'isolated-e2e-signing-secret-at-least-32-characters',P_PROCESS_BASE_URL:'http://localhost:3101'};
const run = (args) => spawn(process.execPath,args,{stdio:'inherit',env,windowsHide:true});
const exited = child => child.exitCode !== null || child.signalCode !== null ? Promise.resolve(child.exitCode ?? 1) : new Promise(resolve => child.once('exit',code => resolve(code ?? 1)));
const build=run(['node_modules/next/dist/bin/next','build']);
if (await exited(build)) process.exit(1);
cpSync('.next/static','.next/standalone/.next/static',{recursive:true});
const fake=run(['e2e/fake-services.mjs']);
const web=run(['.next/standalone/server.js']);
let tests;
async function ready(url) {
  for(let attempt=0;attempt<100;attempt++) {
    try { const response=await fetch(url,{signal:AbortSignal.timeout(500)}); if(response.ok) return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error(`Isolated service did not start: ${url}`);
}
const stop=()=>{ tests?.kill(); web.kill(); fake.kill(); };
process.on('SIGINT',stop); process.on('SIGTERM',stop);
let status=1;
try {
  await Promise.all([ready('http://localhost:3100'),ready('http://localhost:3101')]);
  tests=run(['node_modules/playwright/cli.js','test',...process.argv.slice(2)]);
  status=await exited(tests);
} finally {
  const closed=Promise.all([exited(web),exited(fake)]);
  web.kill(); fake.kill(); await closed;
}
process.exit(status);
