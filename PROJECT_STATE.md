# PROJECT_STATE (kısa; ayrıntı: `docs/MIMARI.md`, tasarım: `docs/TASARIM.md`)

**Durum (2026-10-28):** Ana oyun = ŞEHİR KURMA odaklı (tehdit/çit/iş dağıtımı dahil). Sefer, kahraman, komşu, ayı/tapınak (harabe) görevleri, mevsim görev kartları ve görsel savaş **ana daldan çıkarıldı**, `yan/savas-aksiyon` dalında duruyor (kullanıcı kararı: şehir kurmaya odaklan, bitince tekrar düşünülecek). Sıradaki: şehir kurma derinliği (bina/çağ içeriği, denge, bina modelleri).
Testler: 196 (195 geçer + 1 `todo`). Tarayıcı testi: `npm run build && npm run e2e` (163 kontrol, `npm test`'e dahil değil). Varsayılan görünüm = stil BD (`?stil=eski` eski render; `?stil=a|b|c|d`).

## Oyun (özet)
Sıra tabanlı (tur = gün, mevsim 5 gün, yıl 20 gün), 5 çağ, Önder eylemi/tur, yenilgi yok, zafer sonrası serbest kip. 64×64 harita, keşif sisi.

## Katmanlar (bağımlılık yönü: ui/render → core/world/data; core DOM/three import ETMEZ, testle denetlenir)
- `src/data/` tablolar (`VERI` = `index.js`); `src/core/` saf mantık; `src/world/` harita/keşif/yerleşim/yol; `src/save/kayit.js` kayıt v2.
- `src/render/`: `sahne.js` (kamera/giriş/ışık/mevsim), `harita.js` (karo/yol/ağaç/su/sis), `binalar.js` (54 prosedürel model, durum+seviye görünümleri), `koy.js` (süs, işçi figürleri, kuşlar), `malzeme.js`+`dokular.js` (atlas doku), `onizleme.js` (`binaOnizleme(id, px)` dataURL). Palet/ilkeler: `docs/GORSEL.md`.
- `src/ui/`: `oyun.js` (denetçi), `arayuz.js` (kabuk, pencere sistemi, ana menü, yerleştirme), `paneller.js` (sekme içerikleri), `ogretici.js`, `arayuz.css`. Pencere durumu `localStorage` `ut_ui`, ayar `ut_ayar`.
- `src/main.js` bağlar; `window.__oyun` = { oyun, arayuz, sahne } (hata ayıklama/e2e). three ayrı chunk (~458 KB, gzip 116 KB); uygulama ~127 KB.

## Çekirdek API (UI'nın kullanacağı)
- `yeniOyun(tohum)`, `turIlerlet(durum)` → `{ durum, bildirimler, hata? }`, `mevsimSonunaIlerlet`.
- Komutlar (`src/core/komutlar.js`, `insa.js`): `isAta, insaEt, yukselt, onar, yik, tasi, ormanTemizle, yolYap, yolKaldir, arastirmaSec,
  onderEylemiSec, olayCoz, cagAtla, vergiAyarla, takasYap` → `{ durum, hata? }` (hata Türkçe, durum değişmez).
- Okuma: `src/world/` (`gorunurKaro`, `uygunYerler`, `yerUygunMu`, `kesifli`), `takvim(tur)`.
- Bekleyen olay varken `olayCoz` dışı komutlar kilitli.

## Kısıtlar / bilinenler
- Arayüz durumu doğrudan değiştirmez; `Oyun.komut(fn, ...)` çekirdek komutunu çağırır, her başarılı komut + tur sonu otomatik kayıt (`save/kayit.js`).
- Eksik (UI): takas arayüzü yok, Keşfet'te yön seçimi yok, kayıt tek yuva, ses yok; Ayarlar'daki grafik kalitesi (Yüksek/Standart/Performans) `sahne.kaliteAyarla`'ya bağlı; Önder/Araştırma sekmeleri eski düzende; açık tema denenmedi.
- Render: GPU'lu telefonda fps ölçülmedi (SwiftShader'da dolu köy 220–300 ms/kare; bütçe 70 çizim çağrısı, 155 bin üçgen); WebGL1 yedeği yok (`textureGrad`).
- Başlangıç kaynağı `BASLANGIC_KAYNAK` (yiyecek 10, odun 6, deri 2): ilk Çadır ilk günde kurulur; öğretici ilk 5 günü anlatır.
- Bot (50 tohum): Göçebe 24/28/34 tur, 47/50 hedef aralıkta (20–32); denge ayarı aşama 7.
- `TODO(tasarim)` varsayımları: `grep -rn "TODO(tasarim)" src`. Aşama 2/3 varsayım listesi: `docs/MIMARI.md`.
- Köprü yok (su/dağ geçilmez). Keşfet yön seçmez (UI'da yön seçimi eklenebilir).
- Yönelim/tam ekran: `dom.js` (`donusPerdesiKur`, `tamEkranAcKapa`); dikeyde örtü, ⛶ düğmeleri, `ut_tam` öneri bayrağı; `public/manifest.webmanifest` (display fullscreen). Gerçek cihazda denenmedi.

- **Mimari motor (2026-10-30, prototip):** `src/render/mimari/` + `docs/MIMARI_URETIM.md`; `?mimari=yeni` ile `yari_ahsap_ev`(4), `katedral`(3), `degirmen`(3 su değirmeni). Kullanıcı kararı: sırayla devam, gerçek cihaz ölçümü yok, görsel kalite öncelikli; büyük kararlar raporlanır.

## Yol haritası (kullanıcı sırası, 2026-10-26)
1) görsel stil: BD seçildi ve varsayılan (bina modelleri oynanış onayından sonra) · 2) dış tehditler: 5 çağın hepsinde çalışıyor + arayüz bağlı (`docs/TEHDIT.md` §12–14) · 3) aksiyon: `docs/AKSIYON.md` (sefer/kahraman/komşu/savaş/hedefler) taslak, 6 karar kullanıcıda · 4) çağ genişletme (kullanıcı düşünüyor): Sanayi ve Modern çağlar eklenebilir (7 çağ?); veri tabloları + çekirdek varsayımları önce tasarım belgesinde ele alınacak, şimdi uygulanmaz. Stil adayı D = referans konsept sanat (`?stil=d`).

## DEVAM NOTU (yeni oturum için, 2026-10-28)
- **Yan dal:** `yan/savas-aksiyon` (uzak depoda) = sefer/kahraman/komşu/hedef + görsel savaş F1 + görev sıklığı ayarı; kayıt v5. Tasarım belgeleri ana dalda arşiv: `docs/AKSIYON.md`, `docs/SAVAS.md`. Geri almak için: o dalı `main`'e birleştir (kayıt sürümü 5; ana dal kayıt v3 → ana dal eski kayıtları `:bozuk` yedekleyip yeni oyun açar).
- Yedek: `yedek/savas-oncesi` (aksiyon MVP + sıklık işi, savaş öncesi).
- Kullanıcı kararları: BD stil varsayılan; tehdit belgesi `docs/TEHDIT.md` önerileriyle ONAYLANDI; ana oyun şehir kurma; savaş/sefer yan dalda.
- Tehdit API: `tehditGorunumu(d)`, komutlar `tehditTavir`, `haracOde`, `tahkimatYap`, `bekciAta`, `silahDagit`, `kusatmaKarar`, `zorlukAyarla`, `insaEtCok`; `yeniOyun(tohum,{zorluk})`. Detay `docs/TEHDIT.md` §12–14.
- Sıradaki öneri: şehir kurma derinliği — aşama 6 içerik (Haiku metin), aşama 7 denge (bot ölçümüyle), çağ genişletme kararı (Sanayi/Modern), bina modelleri (Tripo: PC'den `TRIPO_API_KEY` ortam sırrı + `api.tripo3d.ai` izni), takas arayüzü, Önder/Araştırma sekmeleri cilası.
- Rol kuralı: tasarım/görsel ajanlarına "kıdemli oyun tasarımcısı/sanat yönetmeni" rolü ver. Fable yok → Opus tasarım/çekirdek, Sonnet UI/test, Haiku metin.

## Kayıt
Sürüm 3 (tehdit alanları; v2 `GOCLER[2]` ile açılır), alan beyaz listeli (`DURUM_SEMASI`), tipik ~2,5 KB, göç zinciri `GOCLER`.
