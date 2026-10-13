import {build} from 'esbuild';
await build({entryPoints:['supabase/functions/daily-digest/source.ts'],bundle:true,format:'esm',platform:'neutral',external:['npm:*'],target:'es2022',outfile:'supabase/functions/daily-digest/index.ts',legalComments:'none'});
