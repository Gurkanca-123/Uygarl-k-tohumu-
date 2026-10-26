# PROJECT_STATE (kısa; ayrıntı: `docs/MIMARI.md`, tasarım: `docs/TASARIM.md`)

**Durum:** Aşama 0–3 bitti (tasarım, veri, çekirdek, 64×64 harita + keşif). Sıradaki: **aşama 4+5 (çizim + arayüz birlikte, Sonnet)**.
Testler: 142 (141 geçer + 1 `todo` = denge hedefi, aşama 7). Çekirdek henüz `src/main.js`'e bağlı değil.

## Oyun (özet)
Sıra tabanlı (tur = gün, mevsim 5 gün, yıl 20 gün), 5 çağ, Önder eylemi/tur, yenilgi yok, zafer sonrası serbest kip. 64×64 harita, keşif sisi.

## Katmanlar (bağımlılık yönü: ui/render → core/world/data; core DOM/three import ETMEZ, testle denetlenir)
- `src/data/` tablolar (`VERI` = `index.js`); `src/core/` saf mantık; `src/world/` harita/keşif/yerleşim/yol; `src/save/kayit.js` kayıt v2.
- `src/render/sahne.js` yer tutucu; `src/ui/` boş; `src/main.js` yalnız sahneyi başlatır.

## Çekirdek API (UI'nın kullanacağı)
- `yeniOyun(tohum)`, `turIlerlet(durum)` → `{ durum, bildirimler, hata? }`, `mevsimSonunaIlerlet`.
- Komutlar (`src/core/komutlar.js`, `insa.js`): `isAta, insaEt, yukselt, onar, yik, ormanTemizle, yolYap, yolKaldir, arastirmaSec,
  onderEylemiSec, olayCoz, cagAtla, vergiAyarla, takasYap` → `{ durum, hata? }` (hata Türkçe, durum değişmez).
- Okuma: `src/world/` (`gorunurKaro`, `uygunYerler`, `yerUygunMu`, `kesifli`), `takvim(tur)`.
- Bekleyen olay varken `olayCoz` dışı komutlar kilitli.

## Kısıtlar / bilinenler
- Bot (50 tohum): Göçebe 27/31/42 tur, 42/50 hedef aralıkta; denge ayarı aşama 7.
- `TODO(tasarim)` varsayımları: `grep -rn "TODO(tasarim)" src`. Aşama 2/3 varsayım listesi: `docs/MIMARI.md`.
- Köprü yok (su/dağ geçilmez). Keşfet yön seçmez (UI'da yön seçimi eklenebilir).

## Kayıt
Sürüm 2, alan beyaz listeli (`DURUM_SEMASI`), tipik ~2,5 KB, göç zinciri `GOCLER`.
