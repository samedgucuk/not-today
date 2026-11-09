import {initBackend,isDemo,currentUser,publicConfig,sendOtp,verifyOtp,logout,loadData,getDemo,resetDemo,updateProfile,finishMoment,buyItem,addNote,removeNote,logLapse,deleteAccount} from './api.js';
import {catalog as fallbackCatalog,zones,triggers,modes,getLevel,currency} from './catalog.js';
import {playAmbient,stopAmbient} from './audio.js';

const root=document.getElementById('app');
const $=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDT=s=>{const d=new Date(s);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`:'';};
const fmtTime=(ms,short=false)=>{let m=Math.floor(Math.max(0,ms)/60000);const d=Math.floor(m/1440),h=Math.floor(m%1440/60),min=m%60;return short?`${d?d+'g ':''}${h}s ${min}dk`:`${d?d+' gün ':''}${String(h).padStart(2,'0')}s ${String(min).padStart(2,'0')}dk`;};
const todayKey=(date=new Date())=>date.toLocaleDateString('sv-SE');
const fmtDate=s=>new Date(s).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});
const icon=(key,sz=20)=>{
 const paths={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',world:'<path d="M3 14c3-4 5-5 9-5s6 1 9 5M2 18c4-2 6-2 10-2s7 0 10 2"/><circle cx="12" cy="7" r="3"/>',journey:'<path d="M3 3v18h18"/><path d="m6 16 4-5 4 2 5-8"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',back:'<path d="m15 18-6-6 6-6"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',store:'<path d="M4 9h16l-1 12H5zM3 9l2-6h14l2 6M9 13v4m6-4v4"/>',close:'<path d="M5 5l14 14M19 5 5 19"/>',plus:'<path d="M12 5v14M5 12h14"/>',music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19m0-14-1.5 1.5M5 19l1.5-1.5"/>',check:'<path d="m4 12 5 5 11-11"/>',edit:'<path d="M4 20h5l11-11-5-5L4 15zM13 6l5 5"/>',gift:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-8 0-8-7-4-7 3 0 4 7 4 7zm0 0c8 0 8-7 4-7-3 0-4 7-4 7z"/>',jar:'<path d="M7 3h10M7 6h10M8 6c-1 4-4 4-4 8v4c0 3 3 4 8 4s8-1 8-4v-4c0-4-3-4-4-8"/>',logout:'<path d="M10 3H4v18h6M14 7l5 5-5 5m-8-5h13"/>',volume:'<path d="M4 10v4h4l5 4V6l-5 4zM17 9c2 2 2 4 0 6"/>',moon:'<path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11z"/>',delete:'<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/>'};
 return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[key]||paths.heart}</svg>`;
};
const state={captchaToken:'',screen:'boot',data:null,authStep:'email',email:'',otp:'',resendAt:0,busy:false,toast:'',demoWelcome:true,zone:'room',shopFilter:'all',editMode:false,selectedItem:null,trigger:'habit',before:3,mode:null,momentStarted:0,seconds:0,memory:[],flipped:[],matched:[],memoryMoves:0,musicPlaying:false,jarIndex:0,pendingResult:null,showAccountDelete:false,confirmLapse:false};
let activityInterval=null,animationFrame=null,canvasCleanup=null,toastTimer=null,bubbleObjects=[],audioStart=false;
function haltActivity(){if(activityInterval)clearInterval(activityInterval);activityInterval=null;if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=null;if(canvasCleanup)canvasCleanup();canvasCleanup=null;stopAmbient();state.musicPlaying=false;}
function currentLevel(){return getLevel(state.data?.owned||[]);}
function remaining(){return Math.max(0,Date.now()-new Date(state.data?.profile.quit_at).getTime());}
function momentsToday(){return(state.data?.moments||[]).filter(x=>todayKey(new Date(x.ended_at))===todayKey());}
function passedCount(){return(state.data?.moments||[]).filter(x=>x.result==='passed').length;}
function notify(s){clearTimeout(toastTimer);state.toast=s;const t=$('toast');if(t){t.textContent=s;t.hidden=false;toastTimer=setTimeout(()=>{const k=$('toast');if(k)k.hidden=true;state.toast='';},2900);}}
function setScreen(s){if(state.screen==='moment-play'&&s!=='moment-play')haltActivity();state.screen=s;state.editMode=false;state.selectedItem=null;render();window.scrollTo({top:0,behavior:'instant'});}
function header(eyebrow='BUGÜN'){
 return `<header class="topbar"><div><div class="eyebrow">${eyebrow}</div><div class="brand">not today<span>.</span></div></div><button class="icon-circle" data-action="nav" data-to="settings" aria-label="Ayarlar">${icon('user',20)}</button></header>`;
}
function buddy(extra=''){
 const owned=state.data?.owned||[];
 return `<div class="buddy-wrap ${extra}"><div class="buddy-shape"><div class="buddy-arm left"></div><div class="buddy-arm right"></div><div class="buddy-foot left"></div><div class="buddy-foot right"></div><div class="buddy-eye left"></div><div class="buddy-eye right"></div><div class="buddy-cheek left"></div><div class="buddy-cheek right"></div><div class="buddy-smile"></div>${owned.includes('cap')?'<span class="buddy-hat">🧢</span>':''}${owned.includes('bow')?'<span class="buddy-bow">🎀</span>':''}${owned.includes('star')?'<span class="buddy-badge">⭐</span>':''}${owned.includes('scarf')?'<span class="buddy-scarf">🧣</span>':''}</div></div>`;
}
function itemData(it){return state.data?.catalog.find(x=>x.item_id===it) || fallbackCatalog.find(x=>x.id===it);}
function slotItems(zone){
 let own=state.data?.owned||[];
 const relevant=own.filter(id=>{const item=itemData(id);return item?.zone===zone && item?.category!=='places' && item?.category!=='buddy';});
 const existing=Array.isArray(state.data?.profile?.layout?.[zone])?state.data.profile.layout[zone]:[];
 const slots=Array.from({length:5},(_,i)=>relevant.includes(existing[i])?existing[i]:null);
 relevant.filter(id=>!slots.includes(id)).slice(0,5).forEach(id=>{const empty=slots.findIndex(x=>!x);if(empty>=0)slots[empty]=id;});
 return slots;
}
function scene(zone='room',small=false){
 const isRoom=zone==='room',items=slotItems(zone);
 return `<div class="world-scene ${zone} ${small?'small':''} ${state.editMode?'edit':''}">
   <div class="scene-sun">${zone==='terrace'?'☾':'✳'}</div>
   ${isRoom?'<div class="room-window"><div class="window-sun"></div><div class="window-hill"></div></div>':zone==='garden'?'<div class="hill hill-1"></div><div class="hill hill-2"></div>':'<div class="stars-sky">✦ &nbsp; ✧ &nbsp; ⋆ &nbsp; ✦</div>'}
   <div class="world-shelf"></div><div class="scene-ground"></div>
   ${items.map((id,i)=>`<${state.editMode?'button':'div'} class="scene-slot pos-${i} ${id?'':'empty'}" ${state.editMode?`data-action="place-slot" data-slot="${i}" aria-label="Konum ${i+1}"`:''}>${id?`<span aria-label="${safe(itemData(id)?.title)}">${safe(itemData(id)?.emoji)}</span>`:state.editMode?'+':''}</${state.editMode?'button':'div'}>`).join('')}
   <button class="pet-target" data-action="pet" title="${safe(state.data?.profile.buddy_name||'Dostum')} ile selamlaş" aria-label="Dostuna dokun">${buddy(small?'tiny':'')}</button>
   <div class="scene-floor-note">${zone==='room'?'Küçük dünyamız':zone==='garden'?'Biraz temiz hava':'Gökyüzüne daha yakın'}</div>
 </div>`;
}
function nav(){return `<nav class="bottom-nav" aria-label="Ana menü">
 ${[['home','home','Bugün'],['world','world','Dünyam'],['shop','store','Mağaza'],['journey','journey','Yolculuk']].map(([page,ico,label])=>`<button class="nav-item ${state.screen===page?'active':''}" data-action="nav" data-to="${page}" aria-label="${label}">${icon(ico,21)}<span>${label}</span></button>`).join('')}
 </nav>`;}
function chrome(body,showNav=true){return `<main class="shell">${isDemo?'<div class="demo-banner">ÖNİZLEME MODU · Veriler yalnızca bu tarayıcıda</div>':''}${body}${showNav?nav():''}<div class="toast" id="toast" role="status" aria-live="polite" hidden></div></main>`;}
function heroHome(){
 const p=state.data.profile;
 const hour=new Date().getHours();
 const line=hour<11?'Günaydın, ben buradayım.':hour<18?'Biraz mola verelim mi?':'Akşam da beraberiz.';
 return `${header('SENİN KÜÇÜK DÜNYAN')}
 <section class="elapsed"><span class="overline">Nikotin olmadan</span><strong class="running-time" data-elapsed>${fmtTime(remaining())}</strong><div class="soft-copy">Her dakika senin. <span>♡</span></div></section>
 <div class="home-scene">${scene('room',true)}<div class="speech">${safe(line)}</div></div>
 <button class="hero-action" data-action="start-urge"><span class="heart-emoji">♡</span><span><strong>Şu an canım istiyor</strong><small>Birlikte bu anı geçirelim</small></span>${icon('arrow',22)}</button>
 <div class="stat-grid"><div class="stat-card"><strong>${passedCount()}</strong><span>Geçen istek</span></div><div class="stat-card"><strong>${currency(state.data.game.coins)} <i>✦</i></strong><span>Yıldızların</span></div><div class="stat-card"><strong>${Math.floor(remaining()/86400000)}</strong><span>Tam gün</span></div></div>
 <div class="section-head"><h3>Senin dünyan</h3><button class="text-link" data-action="nav" data-to="world">Keşfet ${icon('arrow',15)}</button></div>
 <button class="explore-card" data-action="nav" data-to="world"><span class="explore-visual">🏡</span><span><strong>Birlikte büyüyen bir yer</strong><small>${currentLevel()===1?'İlk bahçeni açmak için yıldız biriktir.':currentLevel()===2?'Bahçen açıldı! Sıradaki durak teras.':'Terasın bile oldu. Ne güzel!'}</small></span>${icon('arrow',18)}</button>
 <div class="gentle-tip">${icon('heart',18)}<p>İstekler dalga gibidir. Her dalgayı geçmek zorunda değilsin; yanında bir yol arkadaşın var.</p></div>`;
}
function home(){return chrome(heroHome());}
function back(title,sub='',to='home'){return `<div class="page-head"><button class="back-btn" data-action="nav" data-to="${to}">${icon('back')} Geri</button><div class="eyebrow">${sub}</div><h1>${title}</h1></div>`;}
function world(){
 const selected=state.zone,level=currentLevel(),items=slotItems(selected),invent=state.data.owned.map(id=>itemData(id)).filter(x=>x&&x.category!=='places'&&x.category!=='buddy'&&x.zone===selected);
 return chrome(`${header('KÜÇÜK DÜNYAN')}<div class="page-title-row"><div><h1>Dostunun dünyası<span>.</span></h1><p>Açtığın her alan sizden bir parça.</p></div><span class="coin">✦ ${currency(state.data.game.coins)}</span></div>
 <div class="zone-tabs">${zones.map(z=>`<button data-action="zone" data-zone="${z.id}" class="zone-tab ${selected===z.id?'active':''}">${z.icon} ${z.label}${level<z.level?' 🔒':''}</button>`).join('')}</div>
 ${scene(selected)}
 <div class="world-tools"><div><strong>${selected==='room'?'Sıcacık evimiz':selected==='garden'?'Minik bahçemiz':'Bulutların üstünde'}</strong><p>${invent.length} eşya · ${level}. seviye dünya</p></div><button class="secondary-pill" data-action="toggle-edit">${icon('edit',17)} ${state.editMode?'Bitir':'Düzenle'}</button></div>
 ${state.editMode?`<div class="edit-help">Önce bir eşya seç, sonra odada yerleştirmek istediğin konuma dokun.</div><div class="inventory-strip">${invent.map(it=>`<button data-action="select-item" data-id="${it.item_id}" class="inventory-chip ${state.selectedItem===it.item_id?'active':''}" title="${safe(it.title)}">${safe(it.emoji)}</button>`).join('')||'<span>Henüz dekorasyonun yok.</span>'}</div>`:''}
 <div class="section-head"><h3>Yeni bir şey ekle</h3><button class="text-link" data-action="nav" data-to="shop">Mağazaya git ${icon('arrow',15)}</button></div>
 <div class="world-note">${icon('gift',19)} <span>Birlikte geçirdiğiniz küçük anlar yeni yerlere dönüşür. Hiçbir ilerleme kaybolmaz.</span></div>`);
}
function shop(){
 const level=currentLevel(),owned=state.data.owned,filtered=state.data.catalog.filter(it=>state.shopFilter==='all'||it.category===state.shopFilter);
 return chrome(`${header('BİRLİKTE BÜYÜYORUZ')}<div class="page-title-row"><div><h1>Minik mağaza<span>.</span></h1><p>Yeni köşeler, yeni hikâyeler.</p></div><span class="coin">✦ ${currency(state.data.game.coins)}</span></div>
 <div class="shop-categories">${[['all','Hepsi'],['room','Ev'],['nature','Doğa'],['buddy','Dostum'],['places','Alanlar']].map(([id,t])=>`<button data-action="filter-shop" data-filter="${id}" class="chip ${state.shopFilter===id?'selected':''}">${t}</button>`).join('')}</div>
 <div class="shop-grid">${filtered.map(it=>{const isOwned=owned.includes(it.item_id);const gated=it.level>level;const afford=state.data.game.coins>=it.price;
 return `<div class="shop-item ${isOwned?'owned':''}"><div class="shop-visual"><span>${safe(it.emoji)}</span></div><div class="shop-detail"><strong>${safe(it.title)}</strong><p>${safe(it.description)}</p></div><button class="shop-buy ${isOwned?'is-owned':''}" data-action="buy" data-id="${safe(it.item_id)}" ${isOwned?'disabled':''}>${isOwned?'✓ Sende':gated?'🔒 Önce alanı aç':afford?'✦ '+it.price:'✦ '+it.price}</button></div>`}).join('')}</div>
 <div class="shop-footer">Tüm eşyalar oyun içi yıldızlarla alınır. Gerçek para veya uygulama içi ödeme yok.</div>`);
}
function journey(){
 const p=state.data.profile,ev=state.data.moments,passed=passedCount(),today=momentsToday();
 const countByDay=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);const k=todayKey(d);return {date:d,day:d.toLocaleDateString('tr-TR',{weekday:'short'}),count:ev.filter(x=>todayKey(new Date(x.ended_at))===k&&x.result==='passed').length};});
 const max=Math.max(2,...countByDay.map(x=>x.count));
 const approx=(remaining()/86400000)*(Number(p.daily_count)||0)/20*(Number(p.pack_price)||0);
 const popular=triggers.map(t=>({...t,count:ev.filter(x=>x.trigger_name===t.id).length})).sort((a,b)=>b.count-a.count)[0];
 return chrome(`${header('YOLCULUĞUN')}<div class="page-title-row"><div><h1>Küçük adımlar<span>.</span></h1><p>Her deneyimin bir yeri var.</p></div><span class="mini-emoji">✧</span></div>
 <div class="journey-hero"><span class="eyebrow">SİGARASIZ GEÇEN SÜRE</span><strong class="running-time" data-elapsed>${fmtTime(remaining())}</strong><p>${fmtDate(p.quit_at)} tarihinden beri</p><div class="milestone-progress"><div style="width:${Math.min(100,remaining()/604800000*100)}%"></div></div><small>İlk haftaya doğru · %${Math.min(100,Math.floor(remaining()/604800000*100))}</small></div>
 <div class="stat-grid journey-stats"><div class="stat-card"><strong>${passed}</strong><span>Geçen istek</span></div><div class="stat-card"><strong>${ev.length}</strong><span>Mini mola</span></div><div class="stat-card"><strong>${state.data.notes.length}</strong><span>Fanus notu</span></div></div>
 <div class="surface-card"><div class="section-head flush"><h3>Son 7 gün</h3><span class="muted">Geçen istekler</span></div><div class="week-bars">${countByDay.map(x=>`<div class="bar-col"><div class="bar-track"><div class="bar-fill" style="height:${Math.max(x.count?8:3,Math.round(x.count/max*100))}%"></div></div><strong>${x.count||'·'}</strong><small>${safe(x.day)}</small></div>`).join('')}</div></div>
 ${p.pack_price>0?`<div class="surface-card savings"><span>Yaklaşık harcamadığın para</span><strong>₺${currency(Math.floor(approx))}</strong><small>Günlük ${p.daily_count} adet ve 20'lik paket fiyatına göre tahmin.</small></div>`:''}
 <button class="jar-feature" data-action="nav" data-to="jar"><span class="jar-icon">✉</span><span><strong>Benim fanusum</strong><small>Sigarayı neden bıraktığını hatırlatan küçük notlar</small></span>${icon('arrow',18)}</button>
 ${ev.length?`<div class="surface-card"><div class="section-head flush"><h3>Kendin hakkında öğrendiklerin</h3></div><p class="insight">En çok kaydettiğin tetikleyici: <strong>${safe(popular.label)}</strong>. ${today.length?`Bugün ${today.length} kez kendine zaman ayırdın.`:'Bugün henüz bir mini mola kaydetmedin.'}</p></div>`:''}
 <p class="journey-foot">Bir kez tütün kullanman yolculuğunu veya küçük dostunun dünyasını silmez.</p>`);
}
function jar(){
 const notes=state.data.notes;
 return chrome(`${back('Benim fanusum','HATIRLAMAK İSTEDİĞİNDE','journey')}<p class="intro-copy">Bırakma nedenlerin, zor anların, kendine verdiğin küçük sözler. Sadece sana ait.</p>
 <div class="jar-scene"><div class="jar-shape"><div class="jar-neck"></div><div class="jar-glass">${notes.slice(0,10).map((_,i)=>`<span class="jar-slip" style="--i:${i};--rot:${(i%2?1:-1)*(5+i*3)}deg"></span>`).join('')}</div></div><div class="jar-caption">${notes.length} küçük hatıra</div></div>
 <button class="primary-btn" data-action="nav" data-to="jar-add">${icon('plus')} Fanusa bir not bırak</button>
 <div class="section-head"><h3>Fanusundakiler</h3></div>${notes.length?notes.map(n=>`<div class="note-card"><span>${n.category==='memory'?'🌫️':n.category==='promise'?'💌':'🌷'}</span><div><p>${safe(n.body)}</p><small>${fmtDate(n.created_at)}</small></div><button data-action="delete-note" data-id="${safe(n.id)}" aria-label="Notu sil" class="note-delete">${icon('delete',17)}</button></div>`).join(''):'<div class="empty-message">Henüz bir not yok. İlk nedenini yazarak başlayabilirsin.</div>'}`);
}
function jarAdd(){return chrome(`${back('Bir not bırak','KENDİNE KÜÇÜK BİR HATIRLATMA','jar')}<div class="surface-card note-form"><label for="note-category">Ne tür bir hatıra?</label><select id="note-category"><option value="reason">Neden bırakıyorum?</option><option value="memory">İçerken hoşuma gitmeyen bir an</option><option value="promise">Kendime sözüm</option></select><label for="note-body">Kelimelerinle anlat</label><textarea id="note-body" maxlength="800" rows="7" placeholder="Örneğin: Akşamları çayla beraber otomatik içiyordum. Artık çayımı daha özgür içmek istiyorum..."></textarea><button class="primary-btn" data-action="save-note">Fanusa bırak ${icon('heart',18)}</button></div><p class="hint">Notunu yalnızca sen görebilirsin; istediğin zaman silebilirsin.</p>`,false);}
function momentChoice(){
 const selected=triggers.find(t=>t.id===state.trigger)||triggers[0];
 const recommended=modes.find(m=>m.id===selected.mode);
 return chrome(`${back('Buradayım.','BİRLİKTE BİRKAÇ DAKİKA','home')}<div class="moment-intro">${buddy('small-buddy')}<h2>Bu his gelip geçebilir.</h2><p>Şu an sana en iyi ne gelir, birlikte bakalım.</p></div>
 <div class="label-row"><h3>Bu isteği ne tetikledi?</h3><span>Birini seç</span></div><div class="trigger-grid">${triggers.map(t=>`<button class="trigger-chip ${state.trigger===t.id?'selected':''}" data-action="trigger" data-id="${t.id}"><span>${t.icon}</span>${t.label}</button>`).join('')}</div>
 <div class="intensity-row"><strong>İstek ne kadar güçlü?</strong><div class="intensity-chips">${[1,2,3,4,5].map(n=>`<button class="intensity-dot ${state.before===n?'selected':''}" data-action="intensity" data-value="${n}" aria-label="${n} / 5">${n}</button>`).join('')}</div></div>
 <div class="label-row"><h3>Biraz oyalanalım mı?</h3><span>Birini seç</span></div><div class="mode-list">${modes.map(m=>`<button class="mode-card" data-action="start-mode" data-mode="${m.id}"><span class="mode-symbol" style="background:${m.tint}">${m.icon}</span><span class="mode-label"><strong>${m.label} ${m.id===recommended.id?'<i>Öneri</i>':''}</strong><small>${m.subtitle}</small></span><span class="mode-time">${m.time}</span>${icon('arrow',17)}</button>`).join('')}</div><p class="moment-footer">İstersen sadece durup bekleyebilirsin. Hiçbir şey yapmak zorunda değilsin.</p>`,false);
}
function seededCards(){const pool=['🪴','☕','🌻','📚','🧶','⭐','🦋','🌙'];const picks=pool.sort(()=>Math.random()-.5).slice(0,4);return [...picks.map((icon,i)=>({id:i,icon,key:i})),...picks.map((icon,i)=>({id:i+4,icon,key:i}))].sort(()=>Math.random()-.5);}
function momentPlay(){
 const mode=modes.find(m=>m.id===state.mode)||modes[0];
 let stage='';
 if(state.mode==='breathe')stage=`<div class="breathe-stage"><div class="breathe-glow"></div>${buddy('breath-buddy')}<div class="breath-word" id="breath-word">Yavaşça nefes al</div><p>Rahat bir ritimde, zorlamadan.</p></div>`;
 if(state.mode==='music')stage=`<div class="music-stage"><div class="moon-glow"></div><div class="floating-moon">☾</div><div class="small-stars">✧ &nbsp; ✦ &nbsp; ✧ &nbsp; ⋆</div>${buddy('music-buddy')}<p>İstersen gözlerini kapat.<br>Bir dakika sadece kendine ayır.</p><button class="sound-control" data-action="toggle-sound">${icon(state.musicPlaying?'volume':'music',18)} ${state.musicPlaying?'Müziği kapat':'Özgün melodiyi çal'}</button></div>`;
 if(state.mode==='memory')stage=`<div class="memory-stage"><p>Küçük dostunun eşyalarının eşlerini bul.</p><div class="memory-grid">${state.memory.map((card,i)=>{const open=state.flipped.includes(i)||state.matched.includes(card.key);return `<button class="memory-card ${open?'flipped':''} ${state.matched.includes(card.key)?'matched':''}" data-action="flip-card" data-index="${i}" aria-label="Hafıza kartı ${i+1}"><span class="memory-card-inner"><span class="memory-front">✳</span><span class="memory-back">${card.icon}</span></span></button>`}).join('')}</div><div class="game-meta">${state.matched.length}/4 çift · ${state.memoryMoves} deneme</div>${state.matched.length===4?'<div class="game-success">Harika, hepsini buldun! ♡</div>':''}</div>`;
 if(state.mode==='bubbles')stage=`<div class="bubble-stage"><canvas id="bubble-canvas" aria-label="Hareketli yumuşak balonlara dokun"></canvas><div class="bubble-hint">Yumuşak balonlara dokun. Acele etme.</div></div>`;
 if(state.mode==='jar'){
 const note=state.data.notes.length?state.data.notes[state.jarIndex%state.data.notes.length]:null;
 stage=`<div class="reflect-stage"><div class="reflect-symbol">✉</div><span>FANUSUNDAN BİR NOT</span><blockquote>${note?safe(note.body):'Bırakmayı neden seçtin? İlk küçük nedenini fanusuna ekleyebilirsin.'}</blockquote><button class="secondary-pill" data-action="another-note" ${state.data.notes.length<2?'disabled':''}>Başka bir hatıra ${icon('arrow',16)}</button></div>`;
 }
 return chrome(`${back(mode.label,'LITTLE MOMENTS','moment-choice')}<div class="session-header"><span>Bu an sana ait</span><span id="session-time">${fmtTime(0,true)}</span></div>${stage}<div class="session-progress"><div id="session-progress-fill"></div></div>
 <div class="moment-bottom"><p>${state.mode==='memory'?'Biraz zihnini meşgul etmek iyi gelebilir.':state.mode==='jar'?'Bu neden, geçmişinden sana küçük bir mesaj.':'Birkaç dakika boyunca burada kalabilirsin. İstek hemen geçmezse de sorun değil.'}</p><button class="primary-btn" data-action="done-mode">Şimdi nasıl hissediyorum? ${icon('arrow',18)}</button></div>`,false);
}
function momentResult(){
 return chrome(`${back('Küçük bir an.','BİRLİKTE GEÇİRDİK','home')}<div class="result-center">${buddy('result-buddy')}<h2>Nasıl hissediyorsun?</h2><p>Bu anı fark etmiş olman bile değerli. İstek hâlâ varsa başka bir şey deneyebiliriz.</p></div>
 <div class="result-actions"><button class="result-card positive" data-action="record-result" data-result="passed"><span>♡</span><strong>İstek azaldı, devam edebilirim</strong>${icon('arrow')}</button><button class="result-card" data-action="record-result" data-result="ongoing"><span>◌</span><strong>Biraz daha desteğe ihtiyacım var</strong>${icon('arrow')}</button></div><p class="moment-footer">Kaydın yalnızca sana ait. Dilersen sonra yeniden deneyebilirsin.</p>`,false);
}
function afterMoment(){return chrome(`${header('KÜÇÜK BİR BAŞARI')}<div class="result-center celebrate">${buddy('result-buddy')}<h2>${state.pendingResult==='passed'?'Bu anı geçtin. ♡':'Kendine zaman ayırdın. ♡'}</h2><p>${state.pendingResult==='passed'?'Bir sonraki istek geldiğinde yine buradayız.':'Hâlâ zor olabilir. Başka bir kısa deneyim de deneyebiliriz.'}</p><div class="reward-petal">✦ ${state.earned??0} yıldız</div></div><button class="primary-btn" data-action="nav" data-to="home">Dostumun yanına dön ${icon('arrow')}</button>${state.pendingResult==='ongoing'?'<button class="secondary-btn" data-action="nav" data-to="moment-choice">Başka bir şey deneyelim</button>':''}`,false);}
function auth(){
 return chrome(`<div class="auth-top"><div class="brand">not today<span>.</span></div><span class="tiny-leaf">♡</span></div>
 <div class="auth-mascot"><div class="glow-cloud"></div>${buddy('auth-buddy')}<div class="auth-speech">${state.authStep==='email'?'Beraber daha kolay.':'Birazdan görüşürüz! ♡'}</div></div>
 <div class="auth-copy"><span class="eyebrow">HOŞ GELDİN</span><h1>${state.authStep==='email'?'Küçük dünyan burada.':'Kodun geldi mi?'}</h1><p>${state.authStep==='email'?'Şifre yok. E-postana bir kod gönderelim, küçük dostunla buluş.':`<strong>${safe(state.email)}</strong> adresine gelen 6 haneli kodu yaz.`}</p></div>
 ${state.authStep==='email'?`<label class="input-label" for="auth-email">E-posta adresin</label><input id="auth-email" class="input" type="email" autocomplete="email" placeholder="ornek@eposta.com" value="${safe(state.email)}">${publicConfig.turnstileSiteKey?'<div id="captcha-holder" class="captcha-holder"></div>':''}<button class="primary-btn" data-action="send-otp" ${state.busy?'disabled':''}>${state.busy?'Gönderiliyor…':'Kod gönder'} ${icon('arrow')}</button>`:`<label class="input-label" for="auth-code">Doğrulama kodu</label><input id="auth-code" class="input otp-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="• • • • • •" value="${safe(state.otp)}"><button class="primary-btn" data-action="verify-otp" ${state.busy?'disabled':''}>${state.busy?'Kontrol ediliyor…':'Giriş yap'} ${icon('arrow')}</button><div class="auth-links"><button data-action="auth-back">E-postayı değiştir</button><button data-action="resend-otp">${Date.now()<state.resendAt?'Tekrar gönder (60 sn)':'Kodu tekrar gönder'}</button></div>`}
 <div class="auth-foot">Giriş yaparak <a href="/privacy.html" target="_blank" rel="noopener">Gizlilik ve Veri İşleme Bilgilendirmesi</a>'ni okuyabilirsin.</div>`,false);
}
function demoWelcome(){return chrome(`<div class="auth-top"><div class="brand">not today<span>.</span></div><span class="tiny-leaf">✳</span></div><div class="auth-mascot">${buddy('auth-buddy')}<div class="auth-speech">Seninle tanışmak ne güzel.</div></div><div class="auth-copy"><span class="eyebrow">TASARIM ÖNİZLEMESİ</span><h1>Küçük bir dünya.<br>Kocaman bir başlangıç.</h1><p>Henüz Supabase bağlı değil. Demoda karakteri, mağazayı, oyunları ve dünyayı deneyebilirsin.</p></div><button class="primary-btn" data-action="start-demo">Dünyama gir ${icon('arrow')}</button><p class="hint">Canlı giriş için Supabase ve Vercel ayarlarını kurulum rehberinden tamamla.</p>`,false);}
function onboarding(){const p=state.data.profile;return chrome(`<div class="onboard-title"><div class="brand">not today<span>.</span></div><div class="eyebrow">BİRLİKTE BAŞLIYORUZ</div><h1>Küçük dostunla tanış.</h1><p>Bu bilgiler yolculuğunu sana göre düzenlemek için. Hepsini daha sonra değiştirebilirsin.</p></div><div class="onboard-buddy">${buddy('onboard-buddy-size')}</div><div class="form-panel">
 <label class="input-label" for="setup-name">Sana nasıl seslenelim? <small>(isteğe bağlı)</small></label><input id="setup-name" class="input" maxlength="60" placeholder="Adın" value="${safe(p.display_name)}">
 <label class="input-label" for="setup-buddy">Küçük dostunun adı</label><input id="setup-buddy" class="input" maxlength="40" placeholder="Mimo" value="${safe(p.buddy_name)}">
 <label class="input-label" for="setup-date">Son tütün / nikotin kullanımın</label><input id="setup-date" class="input" type="datetime-local" value="${safe(localDT(p.quit_at))}">
 <label class="input-label" for="setup-type">Daha önce ne kullanıyordun?</label><select id="setup-type" class="input">${[['heated','IQOS / ısıtılmış tütün'],['cigarette','Sigara'],['both','İkisi de'],['other','Diğer nikotin ürünleri']].map(([v,t])=>`<option value="${v}" ${p.source_type===v?'selected':''}>${t}</option>`).join('')}</select>
 <label class="input-label" for="setup-count">Yaklaşık günlük adet</label><input id="setup-count" class="input" type="number" min="0" max="100" value="${p.daily_count}">
 <label class="consent-row"><input type="checkbox" id="setup-consent" /> <span>Tütün bırakma geçmişim, istek kayıtlarım ve fanus notlarımın uygulamanın çalışması için hesabımda saklanmasına <strong>açık rıza veriyorum</strong>. <a href="/privacy.html" target="_blank">Bilgilendirme</a></span></label><button class="primary-btn" data-action="complete-onboard">Küçük dünyamı aç ${icon('arrow')}</button></div><p class="hint">Bu bir tıbbi tedavi yerine geçmez. Sigara bırakma desteğini profesyonellerden de alabilirsin.</p>`,false);}
function settings(){const p=state.data.profile;
 return chrome(`${back('Benim alanım','AYARLAR','home')}<div class="settings-intro">${buddy('settings-buddy')}<div><strong>${safe(p.display_name||'Merhaba')} ♡</strong><p>${safe(p.buddy_name)} hep burada.</p></div></div>
 <div class="surface-card settings-form">
 <h3>Yolculuk bilgilerin</h3><label for="pref-name">Adın</label><input id="pref-name" class="input" maxlength="60" value="${safe(p.display_name)}">
 <label for="pref-buddy">Dostunun adı</label><input id="pref-buddy" class="input" maxlength="40" value="${safe(p.buddy_name)}">
 <label for="pref-date">Sigarasız başlangıç</label><input id="pref-date" class="input" type="datetime-local" value="${safe(localDT(p.quit_at))}">
 <label for="pref-count">Günlük önceki tüketim (adet)</label><input id="pref-count" class="input" type="number" min="0" max="100" value="${p.daily_count}">
 <label for="pref-price">20'lik paketin fiyatı (₺) · İsteğe bağlı</label><input id="pref-price" class="input" type="number" min="0" max="100000" step="0.01" value="${p.pack_price}">
 <button class="primary-btn" data-action="save-settings">Bilgileri kaydet ${icon('check',18)}</button></div>
 <div class="surface-card settings-other"><h3>Veriler ve hesabın</h3><button data-action="export-data">${icon('gift')} Verilerimi JSON olarak indir ${icon('arrow',17)}</button>${!isDemo?`<button data-action="logout">${icon('logout')} Hesaptan çık ${icon('arrow',17)}</button>`:`<button data-action="reset-demo">${icon('delete')} Demo verilerini sıfırla ${icon('arrow',17)}</button>`}<a href="/privacy.html" target="_blank">${icon('jar')} Gizlilik bilgileri ${icon('arrow',17)}</a></div>
 <div class="surface-card soft-danger"><h3>Bugün zor geçtiyse</h3><p>Bir kez tütün kullanmak tüm ilerlemeni silmez. Dünyan, eşyaların ve anıların hep kalır.</p><button class="secondary-btn" data-action="ask-lapse">Tütün kullandım, bunu kaydet</button>
 ${state.confirmLapse?'<div class="inline-confirm"><p>Mevcut sigarasızlık sayacın şimdi yeniden başlayacak. Bütün diğer ilerlemen korunacak.</p><button data-action="confirm-lapse" class="small-danger">Evet, kaydet</button><button data-action="cancel-lapse" class="small-neutral">Vazgeç</button></div>':''}</div>
 ${!isDemo?`<button class="account-delete" data-action="ask-delete">Hesabımı ve tüm verilerimi sil</button>${state.showAccountDelete?'<div class="inline-confirm"><p>Bu işlem geri alınamaz. Kullanıcı hesabın, fanusun, oyun ilerlemen ve kayıtların silinecek.</p><button data-action="confirm-delete" class="small-danger">Kalıcı olarak sil</button><button data-action="cancel-delete" class="small-neutral">Vazgeç</button></div>':''}`:''}
 <p class="settings-disclaimer">Bu uygulama tıbbi teşhis veya tedavi sağlamaz. Şiddetli yoksunluk veya başka bir sağlık sorunun varsa sağlık uzmanına danış.</p>`,false);
}
function fatal(message){root.innerHTML=`<main class="shell"><div class="fatal"><div class="brand">not today<span>.</span></div><h2>Bir şey yolunda gitmedi.</h2><p>${safe(message)}</p><button class="primary-btn" data-action="reload">Yeniden dene</button></div></main>`;}
function render(){
 let content;
 if(state.screen==='boot')return;
 if(state.screen==='welcome')content=demoWelcome();
 else if(state.screen==='login')content=auth();
 else if(state.screen==='onboarding')content=onboarding();
 else if(!state.data)content='<main class="shell"><div class="boot">Yükleniyor...</div></main>';
 else content=({home,world,shop,journey,jar,'jar-add':jarAdd,'moment-choice':momentChoice,'moment-play':momentPlay,'moment-result':momentResult,'moment-finished':afterMoment,settings})[state.screen]?.()||home();
 root.innerHTML=content;
 if(state.toast)notify(state.toast);
 if(state.screen==='moment-play')beginActivityUI();
 if(state.screen==='login'&&state.authStep==='email')initCaptcha();
 updateClock();
}
let captchaScriptPromise=null;
function initCaptcha(){
 const target=$('captcha-holder');if(!target||!publicConfig.turnstileSiteKey)return;
 state.captchaToken='';
 if(!captchaScriptPromise){
  captchaScriptPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
   script.onload=resolve;script.onerror=()=>reject(Error('Güvenlik doğrulaması yüklenemedi.'));document.head.appendChild(script);
  });
 }
 captchaScriptPromise.then(()=>{
  if(!target.isConnected||!window.turnstile)return;
  window.turnstile.render(target,{sitekey:publicConfig.turnstileSiteKey,
    callback:token=>{state.captchaToken=token;},
    'expired-callback':()=>{state.captchaToken='';},
    'error-callback':()=>{state.captchaToken='';}
  });
 }).catch(err=>notify(err.message));
}
function updateClock(){document.querySelectorAll('[data-elapsed]').forEach(el=>el.textContent=fmtTime(remaining()));}
function parseDateInput(id){const v=$(id)?.value;if(!v)throw Error('Başlangıç tarihini gir.');const d=new Date(v);if(!Number.isFinite(d.getTime())||d.getTime()>Date.now()+60000)throw Error('Geçerli, gelecekte olmayan bir tarih seç.');return d.toISOString();}
async function refresh(){state.data=await loadData();}
async function guarded(operation,success){if(state.busy)return;state.busy=true;try{await operation();if(success)notify(success);}catch(err){console.error(err);notify(err.message||'Bir sorun oluştu.');}finally{state.busy=false;}}
function startMoment(mode){haltActivity();state.mode=mode;state.momentStarted=Date.now();state.seconds=0;state.musicPlaying=false;
 if(mode==='memory'){state.memory=seededCards();state.flipped=[];state.matched=[];state.memoryMoves=0;}
 setScreen('moment-play');
}
function beginActivityUI(){
 if(activityInterval)clearInterval(activityInterval);
 activityInterval=setInterval(()=>{
  if(state.screen!=='moment-play')return;
  state.seconds=Math.floor((Date.now()-state.momentStarted)/1000);
  const text=$('session-time');if(text)text.textContent=`${Math.floor(state.seconds/60)}:${String(state.seconds%60).padStart(2,'0')}`;
  const fill=$('session-progress-fill');if(fill)fill.style.width=Math.min(100,state.seconds/75*100)+'%';
  const breath=$('breath-word');if(breath){const phase=state.seconds%10;breath.textContent=phase<4?'Yavaşça nefes al':phase<5?'Bir an dur':'Yavaşça nefes ver';}
 },250);
 if(state.mode==='bubbles')beginBubbleCanvas();
}
function beginBubbleCanvas(){
 const canvas=$('bubble-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 let width=1,height=1,scale=1;
 const rng=(a,b)=>a+Math.random()*(b-a);
 const create=(initial=false)=>({x:rng(0,width),y:initial?rng(0,height):height+rng(20,120),r:rng(19,55),vx:rng(-.38,.38),vy:rng(.28,.8),wobble:rng(0,Math.PI*2),hue:rng(185,335),alpha:rng(.52,.88),life:1});
 const resize=()=>{const box=canvas.getBoundingClientRect();scale=Math.min(window.devicePixelRatio||1,2);width=box.width;height=box.height;canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);};
 resize();bubbleObjects=Array.from({length:15},()=>create(true));
 const draw=()=>{ctx.clearRect(0,0,width,height);const time=performance.now()*.001;
  // layered translucent circles create a soft 3D gel look without image assets.
  bubbleObjects.forEach((b,i)=>{
   b.y-=b.vy;b.x+=b.vx+Math.sin(time*1.7+b.wobble)*.23;
   if(b.y< -b.r*2 || b.x<-b.r*2||b.x>width+b.r*2)bubbleObjects[i]=create();
   const g=ctx.createRadialGradient(b.x-b.r*.32,b.y-b.r*.42,b.r*.03,b.x,b.y,b.r);
   g.addColorStop(0,'rgba(255,255,255,.97)');g.addColorStop(.24,`hsla(${b.hue},75%,89%,.7)`);g.addColorStop(.68,`hsla(${b.hue+28},76%,77%,.28)`);g.addColorStop(1,`hsla(${b.hue},76%,72%,.72)`);
   ctx.globalAlpha=b.alpha;ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(b.x,b.y,b.r-1,Math.PI*1.07,Math.PI*1.72);ctx.stroke();
   ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.ellipse(b.x-b.r*.33,b.y-b.r*.42,b.r*.22,b.r*.09,-.7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  });
  animationFrame=requestAnimationFrame(draw);
 };
 draw();
 const pop=(ev)=>{const rect=canvas.getBoundingClientRect(),x=ev.clientX-rect.left,y=ev.clientY-rect.top;
  let best=-1,dist=Infinity;bubbleObjects.forEach((b,i)=>{const d=Math.hypot(b.x-x,b.y-y);if(d<b.r+15&&d<dist){best=i;dist=d;}});
  if(best>=0){const b=bubbleObjects[best];bubbleObjects[best]=create();for(let i=0;i<3;i++)bubbleObjects.push({...create(true),x:b.x+rng(-10,10),y:b.y+rng(-10,10),r:rng(8,15),vy:rng(.8,1.7)});if(bubbleObjects.length>22)bubbleObjects.splice(0,bubbleObjects.length-22);}
 };
 canvas.addEventListener('pointerdown',pop);window.addEventListener('resize',resize);
 canvasCleanup=()=>{canvas.removeEventListener('pointerdown',pop);window.removeEventListener('resize',resize);};
}
async function savePlacement(slot){
 if(!state.editMode||!state.selectedItem)return;
 const zone=state.zone,slots=slotItems(zone),id=state.selectedItem;
 const old=slots.indexOf(id);if(old>=0)slots[old]=null;
 slots[slot]=id;
 const layout={...(state.data.profile.layout||{}),[zone]:slots};
 await guarded(async()=>{state.data.profile=await updateProfile({layout});render();notify('Eşyanı yerleştirdin ♡');});
}
async function routeAction(action,el){
 switch(action){
 case 'reload':location.reload();break;
 case 'start-demo':state.demoWelcome=false;state.data=getDemo();setScreen('home');break;
 case 'nav':setScreen(el.dataset.to);break;
 case 'pet':el.querySelector('.buddy-wrap')?.classList.add('petting');setTimeout(()=>el.querySelector('.buddy-wrap')?.classList.remove('petting'),1200);notify('Bir minik selam! ♡');break;
 case 'start-urge':state.trigger='habit';state.before=3;setScreen('moment-choice');break;
 case 'zone':{const z=zones.find(x=>x.id===el.dataset.zone);if(z.level>currentLevel()){state.shopFilter='places';setScreen('shop');notify('Bu alanı mağazadan açabilirsin.');}else{state.zone=z.id;setScreen('world');}break;}
 case 'filter-shop':state.shopFilter=el.dataset.filter;render();break;
 case 'buy':{
  const item=itemData(el.dataset.id);
  if(item.level>currentLevel()){notify('Önce mağazadan o alanın kapısını aç.');return;}
  if(state.data.game.coins<item.price){notify('Biraz daha yıldız biriktirebilirsin.');return;}
  await guarded(async()=>{await buyItem(item.item_id);await refresh();render();notify(`${item.title} dünyana eklendi! ♡`);});break;}
 case 'toggle-edit':state.editMode=!state.editMode;state.selectedItem=null;render();break;
 case 'select-item':state.selectedItem=el.dataset.id;render();break;
 case 'place-slot':await savePlacement(Number(el.dataset.slot));break;
 case 'trigger':state.trigger=el.dataset.id;render();break;
 case 'intensity':state.before=Number(el.dataset.value);render();break;
 case 'start-mode':startMoment(el.dataset.mode);break;
 case 'toggle-sound':{
   if(state.musicPlaying){stopAmbient();state.musicPlaying=false;}else{state.musicPlaying=await playAmbient();}
   const b=$('app').querySelector('[data-action="toggle-sound"]');if(b)b.innerHTML=`${icon(state.musicPlaying?'volume':'music',18)} ${state.musicPlaying?'Müziği kapat':'Özgün melodiyi çal'}`;break;}
 case 'flip-card':{
   const index=Number(el.dataset.index),card=state.memory[index];
   if(state.flipped.includes(index)||state.matched.includes(card.key)||state.flipped.length>=2)return;
   state.flipped.push(index);if(state.flipped.length===2){state.memoryMoves++;const [a,b]=state.flipped;
     if(state.memory[a].key===state.memory[b].key){state.matched.push(card.key);state.flipped=[];render();}
     else{render();setTimeout(()=>{if(state.mode==='memory'&&state.screen==='moment-play'){state.flipped=[];render();}},780);}
   }else render();break;}
 case 'another-note':state.jarIndex++;render();break;
 case 'done-mode':state.seconds=Math.floor((Date.now()-state.momentStarted)/1000);setScreen('moment-result');break;
 case 'record-result':{
   const result=el.dataset.result;state.pendingResult=result;
   await guarded(async()=>{
     const r=await finishMoment({kind:state.mode,trigger:state.trigger,before:state.before,after:result==='passed'?1:state.before,seconds:Math.min(state.seconds,3600),result});
     state.earned=r.earned||0;await refresh();setScreen('moment-finished');
   });break;}
 case 'save-note':{
   const body=$('note-body')?.value.trim();const category=$('note-category')?.value||'reason';
   if(!body){notify('Önce küçük bir not yaz.');return;}
   await guarded(async()=>{await addNote(body,category);await refresh();setScreen('jar');notify('Fanusuna bir hatıra ekledin.');});break;}
 case 'delete-note':{
   if(!confirm('Bu notu fanusundan kaldırmak istiyor musun?'))return;
   await guarded(async()=>{await removeNote(el.dataset.id);await refresh();render();notify('Not silindi.');});break;}
 case 'send-otp':{
   const email=$('auth-email')?.value.trim().toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){notify('Geçerli bir e-posta yaz.');return;}
   await guarded(async()=>{state.email=email;if(publicConfig.turnstileSiteKey&&!state.captchaToken)throw Error('Önce güvenlik doğrulamasını tamamla.');await sendOtp(email,state.captchaToken);state.authStep='code';state.resendAt=Date.now()+60000;state.otp='';render();notify('Doğrulama kodunu e-postana gönderdik.');});break;}
 case 'verify-otp':{
   const code=$('auth-code')?.value.replace(/\D/g,'')||'';
   if(code.length!==6){notify('6 haneli kodu yaz.');return;}
   await guarded(async()=>{await verifyOtp(state.email,code);await refresh();setScreen(state.data.profile.onboarding_done?'home':'onboarding');});break;}
 case 'auth-back':state.authStep='email';render();break;
 case 'resend-otp':{
   if(publicConfig.turnstileSiteKey){state.authStep='email';state.captchaToken='';render();notify('Tekrar kod için güvenlik doğrulamasını tamamla.');return;}
   if(Date.now()<state.resendAt){notify('Bir dakika sonra yeniden deneyebilirsin.');return;}
   await guarded(async()=>{await sendOtp(state.email);state.resendAt=Date.now()+60000;render();notify('Yeni kod gönderildi.');});break;}
 case 'complete-onboard':{
   try{if(!$('setup-consent')?.checked)throw Error('Devam etmek için veri işleme onayını seçmelisin.');const patch={display_name:$('setup-name').value.trim().slice(0,60),buddy_name:$('setup-buddy').value.trim().slice(0,40)||'Mimo',quit_at:parseDateInput('setup-date'),source_type:$('setup-type').value,daily_count:Math.max(0,Math.min(100,Number($('setup-count').value)||0)),onboarding_done:true,consent_at:new Date().toISOString(),consent_version:'2026-11-v1'};
   await guarded(async()=>{state.data.profile=await updateProfile(patch);setScreen('home');notify('Küçük dostun seni bekliyor ♡');});}catch(err){notify(err.message);}break;}
 case 'save-settings':{
   try{const patch={display_name:$('pref-name').value.trim().slice(0,60),buddy_name:$('pref-buddy').value.trim().slice(0,40)||'Mimo',quit_at:parseDateInput('pref-date'),daily_count:Math.max(0,Math.min(100,Number($('pref-count').value)||0)),pack_price:Math.max(0,Math.min(100000,Number($('pref-price').value)||0))};
   await guarded(async()=>{state.data.profile=await updateProfile(patch);render();notify('Bilgilerin kaydedildi.');});}catch(err){notify(err.message);}break;}
 case 'logout':await guarded(async()=>{await logout();state.data=null;state.authStep='email';setScreen('login');});break;
 case 'export-data':{
   const blob=new Blob([JSON.stringify(state.data,null,2)],{type:'application/json'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='not-today-verilerim.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);notify('Verilerin indirildi.');break;}
 case 'ask-lapse':state.confirmLapse=true;render();break;
 case 'cancel-lapse':state.confirmLapse=false;render();break;
 case 'confirm-lapse':await guarded(async()=>{await logLapse();state.confirmLapse=false;await refresh();setScreen('home');notify('Kaydettik. Küçük dünyan burada, devam edebilirsin.');});break;
 case 'ask-delete':state.showAccountDelete=true;render();break;
 case 'cancel-delete':state.showAccountDelete=false;render();break;
 case 'confirm-delete':{
   if(!confirm('Hesabın ve bütün verilerin kalıcı olarak silinecek. Emin misin?'))return;
   await guarded(async()=>{await deleteAccount();state.data=null;state.showAccountDelete=false;setScreen('login');notify('Hesabın ve uygulama verilerin silindi.');});break;}
 case 'reset-demo':if(confirm('Önizlemenin tüm verilerini sıfırlamak istiyor musun?')){state.data=resetDemo();setScreen('home');notify('Demo sıfırlandı.');}break;
 default:break;
 }
}
root.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled)return;e.preventDefault();routeAction(el.dataset.action,el).catch(err=>{console.error(err);notify(err.message||'İşlem yapılamadı.');});});
root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='auth-email'){e.preventDefault();root.querySelector('[data-action="send-otp"]')?.click();}if(e.key==='Enter'&&e.target.id==='auth-code'){e.preventDefault();root.querySelector('[data-action="verify-otp"]')?.click();}});

async function boot(){try{const info=await initBackend();if(info.isDemo){state.data=getDemo();state.screen='welcome';}else if(info.loggedIn){await refresh();state.screen=state.data.profile.onboarding_done?'home':'onboarding';}else{state.screen='login';}render();setInterval(updateClock,10000);}catch(err){console.error(err);fatal(err.message);}}
boot();
