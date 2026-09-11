import {build} from '../node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/lib/main.js';
const outfile='/tmp/signsprout-body-tracker-test.mjs';
await build({entryPoints:['scripts/body-tracker.test.ts'],bundle:true,platform:'node',format:'esm',outfile,plugins:[{name:'tracker-double',setup(b){b.onResolve({filter:/^\.\.\/tracker$/},()=>({path:'tracker',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export async function createTracker(){return {detector:globalThis.__testDetector}}',loader:'js'}));}}]});
await import(outfile);
