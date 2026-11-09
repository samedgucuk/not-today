# NOT TODAY — Kurulum ve yayına alma rehberi

Bu sürüm HTML, CSS ve JavaScript dosyalarıyla çalışır. **npm, build, terminal veya sunucu kurma zorunluluğu yoktur.** Kod GitHub'da, site Vercel'de, kullanıcı verileri Supabase'de bulunur.

**ÖNEMLİ:** Supabase ve SMTP bağlanmadan e-posta girişleri çalışmaz. Ekranda sadece demo modu çalışır. Prod yayını öncesinde aşağıdaki güvenlik ve gizlilik kontrolleri tamamlanmalıdır.

## 1) Supabase projesini oluştur

1. https://supabase.com/dashboard → **New project**.
2. İsim: `not-today`; güçlü database password seç ve güvenli yerde sakla.
3. Veritabanı bölgesi için kullanıcılara yakın bir AB bölgesi seçmeyi değerlendir (örneğin Frankfurt); konum seçimi yasal uygunluğu tek başına garanti etmez.
4. Proje kurulunca solda **SQL Editor** → **New query**.
5. Bu paketteki `supabase/001_initial.sql` dosyasının **tamamını** yapıştır → **Run**.
6. **Table Editor** altında şu tabloları doğrula: `profiles`, `game_states`, `shop_catalog`, `purchases`, `moment_events`, `jar_notes`, `lapse_events`.
7. `shop_catalog` tablosunda 22 ürün bulunduğunu doğrula. Diğer tablolar yeni projede boş olabilir.
8. **Önemli sıra:** SQL'i ilk kullanıcı kaydolmadan çalıştır: yeni kullanıcı oluşturulunca profil/cüzdan otomatik oluşur.

## 2) E-posta ile 6 haneli kod girişini aç

1. Supabase → **Authentication → Sign In / Providers → Email**: Email provider etkin olsun.
2. **Authentication → Email Templates → Magic Link** bölümüne gir.
3. `docs/EMAIL_OTP_TEMPLATE.html` dosyasının içeriğini şablona yapıştır; `{{ .Token }}` aynen korunmalı. Bu, link yerine **6 haneli kod** gönderimini sağlar.
4. Yeni hesaplarda ayrı onay e-postası devreye giriyorsa **Confirm signup** şablonunun da kod destekli olduğundan emin ol veya aynı tasarımı uygulayarak test et.
5. Kodun doğrulanması istemcide Supabase `verifyOtp({ email, token, type:'email' })` ile yapılır.
6. **Authentication → URL Configuration** içindeki **Site URL**'yi Vercel adresin belli olduktan sonra tamamla. Kullanıyorsan Redirect URLs listesine gerçek üretim adresini ekle.

> Supabase'in kendi varsayılan e-posta gönderimi gerçek halka açık kullanıcılar için yeterli değildir. Takım dışındaki e-posta adreslerine gönderim kısıtları ve saatlik limitler vardır. Kendi SMTP sağlayıcını bağla.

## 3) SMTP / Resend (gerçek e-posta gönderimi)

1. https://resend.com adresinde hesap aç.
2. Gerçek bir gönderici alan adı ekle ve istenen DNS kayıtları (SPF/DKIM vb.) ile doğrula. Kendi domainin olmadan üretim gönderimine güvenme.
3. Resend SMTP bilgilerini elde et (host/port/kullanıcı/SMTP API anahtarı).
4. Supabase → **Authentication → SMTP Settings** → **Enable Custom SMTP**.
5. Resend SMTP bilgilerini Supabase ekranına gir; gönderici adı `not today.` gibi olabilir. SMTP anahtarını **GitHub'a, site koduna veya Vercel'in PUBLIC değişkenlerine koyma.**
6. İlk kayıt, yeni kod, yanlış kod ve kod tekrar isteme senaryolarını test et.
7. Supabase **Authentication → Rate Limits** üzerinden e-posta limitlerini ihtiyacına göre düzenle. Varsayılan aynı adrese yeni OTP gönderme aralığı genelde 60 saniyedir.
8. Geniş kullanıma çıkmadan Cloudflare Turnstile kur: Cloudflare Turnstile panelinden Site Key + Secret Key oluştur. Supabase **Authentication → Bot and Abuse Protection** bölümüne Turnstile **Secret Key**'i ekleyip etkinleştir. Vercel Environment Variables altında **`TURNSTILE_SITE_KEY`** adında yalnızca **Site Key** tanımla ve redeploy yap. Uygulama giriş formu site key varsa CAPTCHA widget'ını otomatik gösterir. Secret Key yalnızca Supabase içinde kalır. Yeni kod istediğinde kullanıcı yeniden güvenlik doğrulaması yapar.
9. CAPTCHA'yı gerçekten etkinleştirdiysen eksik token ile OTP isteği gönderilemediğini test et. Site key/secret uyumsuzsa kullanıcı girişi çalışmaz.

## 4) GitHub'a kodu ekle

1. https://github.com/new → **Repository name:** `not-today`.
2. Private repo seçebilirsin (Vercel erişim izniyle kullanabilir).
3. Oluştur; **Add file → Upload files**.
4. ZIP'in **içindeki dosya ve klasörleri** (index.html, api/, src/, supabase/, docs/, assets/, manifest.webmanifest, vercel.json, privacy.html vb.) deponun köküne yükle. `index.html` doğrudan kökte bulunmalı; üstte ekstra `not-today-launch/` klasörü kalmamalı.
5. `Commit changes` düğmesiyle kaydet.

## 5) Vercel'e bağla ve yayınla

1. https://vercel.com/new → GitHub ile bağlan → `not-today` deposunu seç → **Import**.
2. Framework Preset: **Other**. Root Directory: `./`. **Build Command** ve **Output Directory** için özel bir değer girme; statik dosyalar olduğu gibi sunulur.
3. Vercel → **Environment Variables** alanında iki değişken tanımla (**Production**, gerekirse Preview):

   | Değişken adı | Değer |
   |---|---|
   | `SUPABASE_URL` | `https://PROJE-REFERANSI.supabase.co` |
   | `SUPABASE_PUBLISHABLE_KEY` | Supabase **Publishable key** (`sb_publishable_...`) |

4. Supabase → **Project Settings / API Keys** ya da **Connect** ekranından değerleri al.
5. **Kesinlikle** `service_role`, `sb_secret_...`, database password, SMTP anahtarını istemciye ekleme.
6. **Deploy**. Vercel sana `https://...vercel.app` adresi verir.
7. Ortam değişkenlerini deploy sonrasında değiştirdiysen Vercel'de **Redeploy** yap; eski deploy yeni değişkenleri almaz.
8. Tarayıcıda `https://SENIN-VERCEL-ADRESIN/api/config` adresini aç. `{ "url": "...", "publishableKey": "..." }` görmelisin. Bu iki değer **herkese açık kullanılmak üzere tasarlanmıştır**; gizli değerler bulunmamalı.
9. Supabase **Authentication → URL Configuration**'da Site URL'yi canlı adresin yap.

## 6) Gerçek test planı (yayın öncesi zorunlu)

- [ ] Yeni e-posta kodunu alıyor mu? (SMTP + doğrulanmış gönderen)
- [ ] Kod doğru girildiğinde giriş oluyor mu? Yanlış / eski kod reddediliyor mu?
- [ ] Girişten sonra onboarding açılıyor, açık rıza kaydı alınıyor mu?
- [ ] Karakterin adını düzenleyip başka cihazda aynı hesapla görünmesini kontrol et.
- [ ] İstek anında hafıza oyunu, nefes, müzik, balon, fanus açılıyor mu?
- [ ] Seansı tamamladığında `moment_events` tablosuna yeni kayıt geliyor mu?
- [ ] Mağazadan eşya al: yıldız azalıyor, envantere geliyor, dünya içinde görünüyor mu?
- [ ] Bahçe kapısını satın alıp bahçeyi açabiliyor musun? Terası bahçe olmadan açamıyor musun?
- [ ] Oda düzenleme ile eşyaları konumlandır, cihaz değiştir, konumlar korunuyor mu?
- [ ] Fanusa not ekle, sil ve ikinci cihazda senkronize olduğunu kontrol et.
- [ ] Farklı iki hesapla test et: A kullanıcısı B kullanıcısının notlarını/ödüllerini göremiyor mu? Supabase RLS açık mı?
- [ ] Bağlantı kesildiğinde uygulamanın davranışını test et: bu sürüm tam çevrimdışı senkronizasyon vaat etmez.
- [ ] Kullanıcı çıkış ve tekrar giriş yapabiliyor mu?
- [ ] Hesap silme testi: test hesabını sil, bağlı tablolar boşalıyor mu? (**Gerçek kullanıcının hesabında deneme yapma.**)
- [ ] iPhone Safari ve Android Chrome'da gerçek cihazla kontrol et.
- [ ] https://SENIN-ADRESIN/privacy.html içindeki **tüm yer tutucuları** doldur, yasal kontrol yap.

## Mevcut eski prototip hakkında

Bu proje önceki `not-today-v1` / `not-today-demo` tarayıcı kayıtlarını otomatik olarak yeni Supabase hesabına taşımaz. Önceden kullandığın prototipte gerçek veri varsa yayına almadan önce yedekleyip ayrı bir içe aktarma adımı tasarlamalıyız. Yeni uygulamanın demo ilerlemesi de canlı hesaba kendiliğinden aktarılmaz.

## 7) Sonra neleri geliştirebiliriz?

Bu sürüm; CAPTCHA site key ile koşullu güvenlik doğrulaması, giriş, kalıcı veri, sunucu tarafında denetlenen yıldız ekonomisi, oda/bahçe/teras, mağaza, kişisel fanus ve beş Moment deneyimini içerir. Uygulama canlı kullanıma hazırlık temelidir, **tam üretim güvenliği ve hukuki denetim testlerden sonra tamamlanmalıdır**.

Bir sonraki teknik işler: otomatik RLS/CAPTCHA güvenlik testleri, eşzamanlı cihaz senkronizasyonunun canlı güncellenmesi, offline action queue, gerçek kullanıcı bildirimleri (izinli, opt-in), daha zengin karakter hareketleri/sahne varlıkları, RLS otomatik testleri ve erişilebilirlik/performance denetimleri.

## Sorun giderme

**Sadece demo görünüyor:** `/api/config` boş dönüyor. Vercel environment variables yanlış veya redeploy eksik.

**Kod e-postası gelmiyor:** Supabase SMTP doğrulanmamış, sağlayıcı domaini eksik ya da rate limit.

**Kod doğrulandı ama profil bulunamadı:** SQL migration'ı ilk kayıt öncesinde çalıştırmadın; yeni test hesabı ile dene. Var olan kullanıcılar için veritabanında profile/game_state kaydı oluşturmak gerekir.

**permission denied / new row violates row-level security:** SQL migration eksik; RLS ayarlarını ve fonksiyon izinlerini kontrol et.

**Login oluyor ama sayfa boş:** Tarayıcı konsolunda (F12) hata mesajına bak; `/api/config`, Supabase URL ve publishable key doğru mu kontrol et.

**Müzik çalmıyor:** Mobil tarayıcıların ses politikası nedeniyle kullanıcı düğmeye basmalıdır. Sessiz mod ve cihaz sesini kontrol et.

## Kaynaklar

- Supabase: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Environment Variables: https://vercel.com/docs/environment-variables/managing-environment-variables
