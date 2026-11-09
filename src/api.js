import {catalog} from './catalog.js';

const DEMO_KEY='not-today-demo-v3';
export let client=null;
export let isDemo=true;
export let currentUser=null;
export let publicConfig={url:'',publishableKey:'',turnstileSiteKey:''};

const demoStart='2026-11-09T00:00:00+03:00';
const demoId=()=>globalThis.crypto?.randomUUID?.() || `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const freshDemo=()=>({
  profile:{user_id:'demo',display_name:'',buddy_name:'Mimo',quit_at:demoStart,source_type:'heated',daily_count:24,pack_price:0,onboarding_done:true,layout:{room:[],garden:[],terrace:[]}},
  game:{user_id:'demo',coins:66,total_earned:66},
  catalog:catalog.map((it,i)=>({...it,item_id:it.id,sort_order:i})),
  owned:['plant','rug'],moments:[],notes:[{id:'sample',category:'reason',body:'Çay içerken otomatik olarak tütün kullanmayı bırakmak istiyorum.',created_at:new Date().toISOString()}],lapses:[]
});
let demo=freshDemo();
function readDemo(){try{const s=JSON.parse(localStorage.getItem(DEMO_KEY));if(s&&s.profile&&s.game)return s;}catch{} return freshDemo();}
function saveDemo(){localStorage.setItem(DEMO_KEY,JSON.stringify(demo));}
function ensure(res, label){if(res.error)throw new Error(label ? `${label}: ${res.error.message}` : res.error.message);return res.data;}

export async function initBackend(){
  try {
    const r=await fetch('/api/config',{cache:'no-store'});
    if(r.ok){publicConfig=await r.json();}
  } catch {/* static/local design preview */}
  if(publicConfig.url && publicConfig.publishableKey){
    if(!window.supabase?.createClient){throw new Error('Supabase istemci kütüphanesi yüklenemedi. İnternet bağlantını veya CDN erişimini kontrol et.');}
    client=window.supabase.createClient(publicConfig.url,publicConfig.publishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
    isDemo=false;
    const r=await client.auth.getSession();
    ensure(r,'Oturum');
    currentUser=r.data.session?.user||null;
  } else {
    isDemo=true;
    demo=readDemo();
  }
  return {isDemo,loggedIn:!!currentUser};
}
export function getDemo(){return structuredClone(demo);}
export function resetDemo(){demo=freshDemo();saveDemo();return getDemo();}

export async function sendOtp(email,captchaToken){
  if(!client)throw new Error('Supabase kurulumu yapılmamış.');
  ensure(await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,...(captchaToken?{captchaToken}:{})}}),'Kod gönderme');
}
export async function verifyOtp(email,code){
  if(!client)throw new Error('Supabase kurulumu yapılmamış.');
  const data=ensure(await client.auth.verifyOtp({email,token:code,type:'email'}),'Doğrulama');
  currentUser=data.user;
  return currentUser;
}
export async function logout(){
  if(isDemo)return;
  ensure(await client.auth.signOut(),'Çıkış');
  currentUser=null;
}
export async function loadData(){
  if(isDemo)return getDemo();
  if(!currentUser)throw new Error('Önce giriş yapmalısın.');
  const uid=currentUser.id;
  const requests=await Promise.all([
    client.from('profiles').select('*').eq('user_id',uid).single(),
    client.from('game_states').select('*').eq('user_id',uid).single(),
    client.from('shop_catalog').select('*').order('sort_order'),
    client.from('purchases').select('item_id').eq('user_id',uid),
    client.from('moment_events').select('*').eq('user_id',uid).order('ended_at',{ascending:false}).limit(150),
    client.from('jar_notes').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(100),
    client.from('lapse_events').select('*').eq('user_id',uid).order('recorded_at',{ascending:false}).limit(50)
  ]);
  requests.forEach((r,i)=>ensure(r,['Profil','Cüzdan','Mağaza','Envanter','Anılar','Fanus','Kaymalar'][i]));
  return {
    profile:requests[0].data,game:requests[1].data,
    catalog:requests[2].data,owned:requests[3].data.map(x=>x.item_id),
    moments:requests[4].data,notes:requests[5].data,lapses:requests[6].data
  };
}
export async function updateProfile(patch){
  if(isDemo){demo.profile={...demo.profile,...patch};saveDemo();return demo.profile;}
  const result=await client.from('profiles').update({...patch,updated_at:new Date().toISOString()}).eq('user_id',currentUser.id).select().single();
  return ensure(result,'Profil kaydetme');
}
export async function finishMoment(payload){
  if(isDemo){
    const last=demo.moments[0]?.ended_at;
    const earned=!last||Date.now()-new Date(last).getTime()>90e3?(payload.result==='passed'?12:6):0;
    demo.moments.unshift({id:demoId(),user_id:'demo',kind:payload.kind,trigger_name:payload.trigger,intensity_before:payload.before,intensity_after:payload.after,result:payload.result,seconds_spent:payload.seconds,reward:earned,ended_at:new Date().toISOString()});
    demo.game.coins+=earned;demo.game.total_earned+=earned;saveDemo();return {earned,coins:demo.game.coins};
  }
  const data=ensure(await client.rpc('complete_moment',{
    p_kind:payload.kind,p_trigger:payload.trigger,p_before:payload.before,
    p_after:payload.after,p_seconds:payload.seconds,p_result:payload.result
  }),'Moment kaydetme');
  return data;
}
export async function buyItem(id){
  if(isDemo){
    const item=demo.catalog.find(x=>x.item_id===id);if(!item)throw Error('Eşya bulunamadı.');
    if(demo.owned.includes(id))throw Error('Bu eşya zaten sende.');
    const level=demo.owned.includes('terrace_key')?3:demo.owned.includes('garden_key')?2:1;
    if(item.level>level)throw Error('Önce yeni alanı açmalısın.');
    if(demo.game.coins<item.price)throw Error('Yeterli yıldızın yok.');
    demo.game.coins-=item.price;demo.owned.push(id);saveDemo();return {coins:demo.game.coins};
  }
  return ensure(await client.rpc('buy_item',{p_item_id:id}),'Satın alma');
}
export async function addNote(body,category){
  if(isDemo){const note={id:demoId(),category,body,created_at:new Date().toISOString()};demo.notes.unshift(note);saveDemo();return note;}
  const data=ensure(await client.from('jar_notes').insert({user_id:currentUser.id,body,category}).select().single(),'Fanusa ekleme');
  return data;
}
export async function removeNote(id){
  if(isDemo){demo.notes=demo.notes.filter(x=>x.id!==id);saveDemo();return;}
  ensure(await client.from('jar_notes').delete().eq('id',id).eq('user_id',currentUser.id),'Not silme');
}
export async function logLapse(){
  if(isDemo){const prev=demo.profile.quit_at;demo.lapses.unshift({id:demoId(),previous_quit_at:prev,recorded_at:new Date().toISOString()});demo.profile.quit_at=new Date().toISOString();saveDemo();return;}
  ensure(await client.rpc('record_lapse'),'Kayma kaydı');
}
export async function deleteAccount(){
  if(isDemo){resetDemo();return;}
  ensure(await client.rpc('delete_my_account'),'Hesap silme');
  await client.auth.signOut({scope:'local'});
  currentUser=null;
}
