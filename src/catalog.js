export const catalog = [
  {id:'plant',title:'Mutlu saksı',description:'Pencere önünde minik bir dost.',price:12,emoji:'🪴',category:'room',zone:'room',level:1},
  {id:'lamp',title:'Akşam lambası',description:'Odanı sıcak bir ışıkla doldurur.',price:18,emoji:'🛋️',category:'room',zone:'room',level:1},
  {id:'books',title:'Kitap köşesi',description:'Dostun bazen burada okur.',price:22,emoji:'📚',category:'room',zone:'room',level:1},
  {id:'rug',title:'Yumuşak halı',description:'Minik patiler için.',price:16,emoji:'🧶',category:'room',zone:'room',level:1},
  {id:'teacup',title:'Çay köşesi',description:'Çay artık yeni bir ritüel.',price:20,emoji:'🍵',category:'room',zone:'room',level:1},
  {id:'window',title:'Güneşli pencere',description:'Yeni sabahlar için.',price:30,emoji:'🪟',category:'room',zone:'room',level:1},
  {id:'radio',title:'Minik radyo',description:'Evin kendi melodisi.',price:27,emoji:'📻',category:'room',zone:'room',level:1},
  {id:'pillow',title:'Bulut minder',description:'Biraz dinlenme vakti.',price:14,emoji:'☁️',category:'room',zone:'room',level:1},
  {id:'garden_key',title:'Bahçe kapısı',description:'Dışarıda yeni bir dünya açılır.',price:55,emoji:'🌿',category:'places',zone:'garden',level:1},
  {id:'sunflower',title:'Ayçiçeği',description:'Güneşe dönen bir çiçek.',price:17,emoji:'🌻',category:'nature',zone:'garden',level:2},
  {id:'tree',title:'Minik ağaç',description:'Bahçenin gölgeli köşesi.',price:26,emoji:'🌳',category:'nature',zone:'garden',level:2},
  {id:'bench',title:'Bahçe bankı',description:'Beraber oturmalık.',price:21,emoji:'🪑',category:'nature',zone:'garden',level:2},
  {id:'pond',title:'Küçük gölet',description:'Su sesi, sakin bir dünya.',price:38,emoji:'🪷',category:'nature',zone:'garden',level:2},
  {id:'butterflies',title:'Kelebekler',description:'Bahçeye hayat geliyor.',price:24,emoji:'🦋',category:'nature',zone:'garden',level:2},
  {id:'terrace_key',title:'Teras kapısı',description:'Biraz daha gökyüzü.',price:100,emoji:'🌤️',category:'places',zone:'terrace',level:2},
  {id:'telescope',title:'Teleskop',description:'Yıldızları izleme zamanı.',price:44,emoji:'🔭',category:'nature',zone:'terrace',level:3},
  {id:'lantern',title:'Fenerler',description:'Akşam ışıkları.',price:31,emoji:'🏮',category:'nature',zone:'terrace',level:3},
  {id:'cloud',title:'Bulut salıncak',description:'Hayal kurma köşesi.',price:48,emoji:'🌥️',category:'nature',zone:'terrace',level:3},
  {id:'scarf',title:'Mercan atkı',description:'Dostuna minik bir dokunuş.',price:20,emoji:'🧣',category:'buddy',zone:'room',level:1},
  {id:'cap',title:'Küçük bere',description:'Birlikte sıcacık.',price:23,emoji:'🧢',category:'buddy',zone:'room',level:1},
  {id:'bow',title:'Pembe kurdele',description:'Neşeli bir aksesuar.',price:18,emoji:'🎀',category:'buddy',zone:'room',level:1},
  {id:'star',title:'Yıldız rozeti',description:'Küçük bir kutlama.',price:30,emoji:'⭐',category:'buddy',zone:'room',level:1}
];
export const zones = [
  {id:'room',label:'Evim',icon:'⌂',level:1},
  {id:'garden',label:'Bahçe',icon:'❀',level:2,key:'garden_key'},
  {id:'terrace',label:'Teras',icon:'☀',level:3,key:'terrace_key'}
];
export const triggers = [
  {id:'habit',label:'Alışkanlıktan',icon:'↺',mode:'memory'},
  {id:'tea',label:'Çay / kahve',icon:'☕',mode:'memory'},
  {id:'stress',label:'Stres',icon:'♡',mode:'breathe'},
  {id:'restless',label:'Bir şey eksik',icon:'◌',mode:'bubbles'},
  {id:'bored',label:'Sıkıldım',icon:'✳',mode:'memory'},
  {id:'other',label:'Bilmiyorum',icon:'⋯',mode:'music'}
];
export const modes = [
  {id:'breathe',label:'Beraber nefes',time:'60 sn',subtitle:'Yavaşla, omuzlarını gevşet.',icon:'〰',tint:'#f2d9cd'},
  {id:'music',label:'Küçük bir mola',time:'75 sn',subtitle:'Gözlerini kapat, dinlen.',icon:'♫',tint:'#e8dded'},
  {id:'memory',label:'Hafıza oyunu',time:'1–2 dk',subtitle:'Dostunun eşyalarını eşleştir.',icon:'▦',tint:'#deece0'},
  {id:'bubbles',label:'Yumuşak balonlar',time:'Serbest',subtitle:'Dokun, izle, gevşe.',icon:'◉',tint:'#dce7ee'},
  {id:'jar',label:'Neden başladım?',time:'Bir an',subtitle:'Fanusundaki bir nedeni hatırla.',icon:'✦',tint:'#f2e5d8'}
];
export function getLevel(owned) {return owned.includes('terrace_key')?3:owned.includes('garden_key')?2:1;}
export function currency(n) {return new Intl.NumberFormat('tr-TR').format(Math.max(0,Number(n)||0));}
