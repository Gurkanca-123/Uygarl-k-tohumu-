# PROJECT_STATE

**Durum:** Aşama 1 bitti (veri katmanı + durum nesnesi iskeleti + kayıt). Tasarım `docs/TASARIM.md`; §11 açık sorular cevaplandı.
Sıradaki: aşama 2 (simülasyon çekirdeği: `turIlerlet` §1.2 a–n, p).

## Tasarım özeti
- 1 tur = 1 gün, mevsim = 5 gün, yıl = 20 gün. Önder soyut eylem menüsü (1/tur), yorgunluk 0–6. Yenilgi yok (nüfus ≥2).
- 12 kaynak + BP, 25 buluş, çağ süreleri hedefi ~25/40/60/80/100 tur. Çevrimdışı birikim yok ("Mevsim sonuna ilerlet").
- Orta Çağ konutu Yarı Ahşap Ev; "Surlu şehir" çağ kimliği. Zafer (Katedral + 150 nüfus) sonrası serbest kip.
- MVP: Göçebe→Taş Devri (5 kaynak, 10 bina, 5 buluş, 5 eylem, 10 olay) — tablolarda `mvp: true`.

## Teknik
- Vite 5 + Three.js 0.158, tek sayfa, GitHub Pages (`.github/workflows/deploy.yml`, `main`'e push).
- Sıra tabanlı simülasyon. Çekirdek (`src/core`) ve veri (`src/data`) saf; DOM/three içe aktarmaz (testle denetlenir).
- `tur` = tamamlanan gün (yeni oyun 0 = Bahar 1. gün); mevsim/yıl durumda saklanmaz, `takvim(tur)` ile türetilir.
- RNG: mulberry32, durumu tek uint32 (`durum.rng`), fonksiyonlar `{ deger, rng }` döner.

## Harita
- `src/data/`: `caglar` (5 çağ tam; konut/merkez = bina id, gecis/zafer), `kaynaklar` (12 + `BILGI`), `karolar` (7, `kod` = harita karakteri),
  `binalar` (5 merkez + 49 bina, `bina()` varsayılanlarıyla), `buluslar` (25), `olaylar` (21: §6.5 15 + Alüvyon + §9 4 ek + kurtarma),
  `eylemler` (8), `mevsimler`, `denge` (§7.5 + metindeki tüm sabitler, SERBEST_ISLER, HUZUR_CARPAN, VERGI), `index.js` (`VERI`),
  `dogrula.js` (`dogrula(VERI)` → hata listesi; `bulusDongusu`, `bulusKapanisi`).
- `src/core/`: `oyun_durumu.js` (`yeniOyun(tohum)`, `turIlerlet` = yalnız takvim), `durum.js` (`DURUM_SEMASI` beyaz liste, `suz`),
  `rng.js`, `takvim.js`.
- `src/save/kayit.js`: `serialize`, `yukle(metin, gocler, hedefSurum)`, `kaydet/oku(depo, anahtar)` (depo enjekte), `GOCLER`, `:bozuk` yedeği.
- `src/render/sahne.js`: izometrik ortografik sahne, yer tutucu zemin. `src/ui`, `src/world`: boş.
- `tests/`: `cekirdek` (2), `veri` (15), `durum` (10), `kayit` (9) = 36 test.

## Şemaya eklenen alanlar (§10'da yoktu)
- Bina: `kesifIyiSonuc, hastalikKayipCarpani, takas, olayAgirlik, kuresel, hastalikKapasitesiIscisiz, savunmaKenar, etkiIsciGerekir,
  anit, zafer, mvp`; `bitisiklik[].hedef` dizi olabilir, `mesafe` (Sulanan Tarla).
- Buluş etki türleri: `kesifIyiSonuc, isciSavunmaCarpani, seviyeAc`; `acar.ozellikler` (vergi).
- Sonuç: `onderYarali, kervan, kosullu, bos, kayipOrani, kayipKilidiKadar, puskurtme, vergi, bekleme, cagOlcek, hasar.binaId`;
  değiştirici `sure: null` = kalıcı, `uretim.etiket '*'`, `uretim.suMesafe`, `uretim.bonus`, `bakim`. Gereksinim: `isciTuruMin`.
- Karo: `kod`, `yalnizBina`. Çağ: `kimlik`. Olay: `cagBasinaBir`.

## Bilinen eksikler
- `turIlerlet` çözümlemesi (aşama 2), tohumlu harita üretimi (şimdilik tümü çimen; aşama 3), arayüz yok.
- Belgede belirsiz sayılar `TODO(tasarim)` yorumlarıyla işaretli (`grep -rn "TODO(tasarim)" src/data`).
- Antik Çağ geçişi Kütüphane'yi (Felsefe, 70 BP) gerektirir; §5'teki "zorunlu yol 265" bunu saymaz (gerçek 335; beklenen ~480 içinde).
