# PROJECT_STATE (kısa; ayrıntı: `docs/MIMARI.md`, tasarım: `docs/TASARIM.md`)

**Durum:** Aşama 0–5 bitti + görsel/arayüz yenilemesi (pencere sistemi, ayrıntılı köy ve bina modelleri) = **oynanabilir**. Sıradaki: ilk dakika düzeltmesi, aşama 6 (içerik/olay metinleri), 7 (denge).
Testler: 142 (141 geçer + 1 `todo` = denge hedefi). Tarayıcı testi: `npm run build && npm run e2e` (33 kontrol, `npm test`'e dahil değil).

## Oyun (özet)
Sıra tabanlı (tur = gün, mevsim 5 gün, yıl 20 gün), 5 çağ, Önder eylemi/tur, yenilgi yok, zafer sonrası serbest kip. 64×64 harita, keşif sisi.

## Katmanlar (bağımlılık yönü: ui/render → core/world/data; core DOM/three import ETMEZ, testle denetlenir)
- `src/data/` tablolar (`VERI` = `index.js`); `src/core/` saf mantık; `src/world/` harita/keşif/yerleşim/yol; `src/save/kayit.js` kayıt v2.
- `src/render/`: `sahne.js` (kamera/giriş/ışık/mevsim), `harita.js` (karo/yol/ağaç/su/sis), `binalar.js` (54 prosedürel model, durum+seviye görünümleri), `koy.js` (süs, işçi figürleri, kuşlar), `malzeme.js`+`dokular.js` (atlas doku), `onizleme.js` (`binaOnizleme(id, px)` dataURL). Palet/ilkeler: `docs/GORSEL.md`.
- `src/ui/`: `oyun.js` (denetçi), `arayuz.js` (kabuk, pencere sistemi, ana menü, yerleştirme), `paneller.js` (sekme içerikleri), `ogretici.js`, `arayuz.css`. Pencere durumu `localStorage` `ut_ui`, ayar `ut_ayar`.
- `src/main.js` bağlar; `window.__oyun` = { oyun, arayuz, sahne } (hata ayıklama/e2e). three ayrı chunk (~458 KB, gzip 116 KB); uygulama ~127 KB.

## Çekirdek API (UI'nın kullanacağı)
- `yeniOyun(tohum)`, `turIlerlet(durum)` → `{ durum, bildirimler, hata? }`, `mevsimSonunaIlerlet`.
- Komutlar (`src/core/komutlar.js`, `insa.js`): `isAta, insaEt, yukselt, onar, yik, ormanTemizle, yolYap, yolKaldir, arastirmaSec,
  onderEylemiSec, olayCoz, cagAtla, vergiAyarla, takasYap` → `{ durum, hata? }` (hata Türkçe, durum değişmez).
- Okuma: `src/world/` (`gorunurKaro`, `uygunYerler`, `yerUygunMu`, `kesifli`), `takvim(tur)`.
- Bekleyen olay varken `olayCoz` dışı komutlar kilitli.

## Kısıtlar / bilinenler
- Arayüz durumu doğrudan değiştirmez; `Oyun.komut(fn, ...)` çekirdek komutunu çağırır, her başarılı komut + tur sonu otomatik kayıt (`save/kayit.js`).
- Eksik (UI): takas arayüzü yok, Keşfet'te yön seçimi yok, kayıt tek yuva, ses yok; Ayarlar'daki grafik kalitesi yalnız kaydediliyor (`sahne.kaliteAyarla` yok); Önder/Araştırma sekmeleri eski düzende; açık tema denenmedi.
- Render: GPU'lu telefonda fps ölçülmedi (SwiftShader'da dolu köy 220–300 ms/kare; bütçe 70 çizim çağrısı, 155 bin üçgen); WebGL1 yedeği yok (`textureGrad`).
- Başlangıçta (10 odun-5, 0 deri) hiçbir bina kurulamaz: Çadır 5 odun + 2 deri; oyuncu önce Avlan/Oduncu ile toplamalı (denge notu, aşama 7).
- Bot (50 tohum): Göçebe 27/31/42 tur, 42/50 hedef aralıkta; denge ayarı aşama 7.
- `TODO(tasarim)` varsayımları: `grep -rn "TODO(tasarim)" src`. Aşama 2/3 varsayım listesi: `docs/MIMARI.md`.
- Köprü yok (su/dağ geçilmez). Keşfet yön seçmez (UI'da yön seçimi eklenebilir).

## Kayıt
Sürüm 2, alan beyaz listeli (`DURUM_SEMASI`), tipik ~2,5 KB, göç zinciri `GOCLER`.
