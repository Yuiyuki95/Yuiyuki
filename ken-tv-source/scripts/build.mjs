import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,relative,join} from 'node:path';
import {cpSync,mkdirSync,readdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=resolve(source,'..'),out=join(source,'.build');
await build({configFile:false,root:source,resolve:{alias:{'@':source}},build:{outDir:join(out,'client'),emptyOutDir:true,target:'es2022'}});
await build({configFile:false,root:source,publicDir:false,resolve:{alias:{'@':source}},build:{outDir:join(out,'server'),emptyOutDir:true,target:'es2022',lib:{entry:join(source,'worker.ts'),formats:['es'],fileName:()=> '_worker.js'},minify:true}});
const manifest=join(root,'ken-tv-build.json');if(existsSync(manifest)){for(const entry of JSON.parse(readFileSync(manifest,'utf8')).files||[]){if(typeof entry==='string'&&!entry.includes('..')&&!entry.startsWith('/')&&(entry.startsWith('assets/')||!entry.includes('/')))rmSync(join(root,entry),{force:true});}}
const files=[];function copy(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const current=join(dir,entry.name);if(entry.isDirectory())copy(current);else{const path=relative(join(out,'client'),current);mkdirSync(dirname(join(root,path)),{recursive:true});cpSync(current,join(root,path));files.push(path);}}}copy(join(out,'client'));
cpSync(join(out,'server','_worker.js'),join(root,'_worker.js'));files.push('_worker.js');
writeFileSync(join(root,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]},null,2)+'\n');files.push('_routes.json');
writeFileSync(manifest,JSON.stringify({app:'KEN TV',version:'6.0.0',files},null,2)+'\n');
console.log(`Pages package ready: ${files.length} files at ${root}`);
