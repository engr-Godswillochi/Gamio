import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
// Vite treats '?' and '#' as URL delimiters even in filesystem paths.
// Build from an isolated copy on such mounts, then copy back only the output.
const root=process.cwd();
let temp;
try {
  const buildRoot=/[?#%]/.test(root)?join(temp=mkdtempSync(join(tmpdir(),'gamio-build-')),'frontend'):root;
  if(temp)cpSync(root,buildRoot,{recursive:true,filter:p=>!p.startsWith(join(root,'dist'))});
  const result=spawnSync(process.execPath,[join(buildRoot,'node_modules/vite/bin/vite.js'),'build'],{cwd:buildRoot,stdio:'inherit'});
  if(result.status!==0)process.exitCode=result.status||1;
  else if(temp)cpSync(join(buildRoot,'dist'),join(root,'dist'),{recursive:true});
} finally { if(temp)rmSync(temp,{recursive:true,force:true}); }
