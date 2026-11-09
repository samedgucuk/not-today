import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {catalog,zones,modes} from '../src/catalog.js';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
for(const p of ['index.html','src/app.js','src/api.js','src/audio.js','src/styles.css','supabase/001_initial.sql','api/config.js','privacy.html','docs/DEPLOY_TR.md']){
 assert(existsSync(new URL(`../${p}`,import.meta.url)),`${p} missing`);
}
const ids=new Set(catalog.map(i=>i.id));assert.equal(ids.size,catalog.length,'duplicate catalog IDs');
assert.equal(catalog.length,22);assert.deepEqual(zones.map(x=>x.id),['room','garden','terrace']);assert.equal(modes.length,5);
const sql=read('supabase/001_initial.sql');
for(const id of ids)assert(sql.includes(`'${id}'`),`SQL catalog missing ${id}`);
for(const table of ['profiles','game_states','shop_catalog','purchases','moment_events','jar_notes','lapse_events'])assert(sql.includes(`alter table public.${table} enable row level security;`),`Missing RLS ${table}`);
assert(sql.includes('revoke all on public.profiles'));
assert(sql.includes('security definer set search_path ='), 'RPC functions must be secured');
assert(!read('api/config.js').includes('process.env.SUPABASE_SECRET_KEY'));
console.log(`OK: ${catalog.length} items, ${zones.length} world zones, ${modes.length} moments, RLS, required files`);
