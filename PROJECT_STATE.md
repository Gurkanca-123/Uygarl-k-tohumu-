# PROJECT_STATE

**Durum:** Aşama 2 bitti (simülasyon çekirdeği: `turIlerlet` §1.2 a–o + oyuncu komutları + test botu).
Sıradaki: aşama 3 (ızgara/yerleşim, tohumlu harita, yol). Denge ayarı aşama 7 (bot sonucu aşağıda).

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
- `src/core/` (saf, adımlar `(durum, bildirimler) → yeni durum`; komutlar `(durum, …) → { durum, hata? }`):
  `oyun_durumu.js` (`yeniOyun`, `turIlerlet` yeniden dışa aktarım), `durum.js` (şema), `rng.js`, `takvim.js`,
  `yardimci.js` (tablo aramaları, bina durumu, etkin atama/yaralı, depo, `kaynakUygula`, buluş etkileri, `zar`),
  `tur.js` (`turIlerlet` → `{ durum, bildirimler, hata? }`, `ADIMLAR` a–o, adım m, `mevsimSonunaIlerlet`),
  `eylem.js` (a), `insa.js` (b, c; insaEt/yukselt/onar/yik, maliyet, yerleşim), `uretim.js` (d, e, f; `hesaplaBitisiklik`, çarpanlar),
  `tuketim.js` (g, h), `nufus.js` (i, k; kayıp kilidi, doğum, göç, `isAta`), `huzur.js` (j), `arastirma.js` (l), `olay.js` (n; `olayCoz`),
  `cag.js` (o; `cagSartlari`, `cagAtla`, zafer/serbest kip), `sonuc.js` (ortak §6.1 sonuç uygulayıcı), `savunma.js` (§6.3–6.4),
  `komutlar.js` (tüm komutlar + `vergiAyarla`, `takasYap`).
- Bu turun geçici kayıtları `durum.istatistik.sonTur` (kapalı binalar, açlık, ısınma, üretim/tüketim özeti) — kayda girer.
- `insaatSirasi` girdileri: `'<uid>'` · `'yukselt:<uid>'` · `'onar:<uid>'`. Yaralı işçi = değiştirici `{ id:'yarali', etki:{ yaraliIsci } }`.
- `src/save/kayit.js`: `serialize`, `yukle(metin, gocler, hedefSurum)`, `kaydet/oku(depo, anahtar)` (depo enjekte), `GOCLER`, `:bozuk` yedeği,
  `turIlerletVeKaydet(depo, durum)` (§1.2 p, çekirdek dışında).
- `src/render/sahne.js`: izometrik ortografik sahne, yer tutucu zemin. `src/ui`, `src/world`: boş.
- `tests/`: 118 test (117 geçer + 1 `todo`): eski 36 + `uretim` 14, `tuketim` 4, `nufus` 8, `huzur` 5, `eylem` 9, `olay` 9,
  `arastirma` 5, `insa` 7, `cag` 7, `tur` 11 (bütünleşik a–g), `bot` 3. Yardımcılar: `tests/yardimci/durum.js`, `tests/yardimci/bot.js`
  (`node tests/yardimci/bot.js 50` özet yazar).

## Aşama 2 motor kararları (TODO(tasarim) varsayımları; `grep -rn "TODO(tasarim)" src`)
- Olay zamanı: `ILK_OLAY_TUR` = gösterim GÜNÜ (1'den); gün 1–5 olaysız, ilk olay 6. gün (tur 5). `turMin` de gün. Zincir sınırı bekler.
- Doğum huzur eşiği 40 (§2.5 = §7.3.7, kullanıcı kararı). Doğum `(tur+1) % aralık`; kayıp penceresi kayan 3 tur.
- Onarım eşzamanlı sınıra sayılmaz · hasarlı konut barınak vermez/yakmaz · sabit BP seviyeyle artmaz · araştırma değiştirmek cezasız
  (ilerleme havuza) · kitap tamamlanmada düşülür · Keşfet bonusları toplanır · Liman tek başına takas açar · Şifacı kayıp ×0,5 olasılıksal.
- İnşaattaki binaya işçi önceden atanabilir (bitince aynı tur üretir). Çağ atlama komutla hemen olur.
- Yol çarpanı ve Sur Parçası kenar bonusu aşama 3'e kadar etkisiz (`yolBagli` = true).

## Şemaya eklenen alanlar (§10'da yoktu)
- Bina: `kesifIyiSonuc, hastalikKayipCarpani, takas, olayAgirlik, kuresel, hastalikKapasitesiIscisiz, savunmaKenar, etkiIsciGerekir,
  anit, zafer, mvp`; `bitisiklik[].hedef` dizi olabilir, `mesafe` (Sulanan Tarla).
- Buluş etki türleri: `kesifIyiSonuc, isciSavunmaCarpani, seviyeAc`; `acar.ozellikler` (vergi).
- Sonuç: `onderYarali, kervan, kosullu, bos, kayipOrani, kayipKilidiKadar, puskurtme, vergi, bekleme, cagOlcek, hasar.binaId`;
  değiştirici `sure: null` = kalıcı, `uretim.etiket '*'`, `uretim.suMesafe`, `uretim.bonus`, `bakim`. Gereksinim: `isciTuruMin`.
- Karo: `kod`, `yalnizBina`. Çağ: `kimlik`. Olay: `cagBasinaBir`.
- Durum: `onder.secim` (sözlük|null; Kervan Gönder `{ ver, al }`; eski kayıtta yoksa null, sürüm değişmedi).

## Bot sonucu (aşama 2, 50 tohum, `tests/yardimci/bot.js`)
- 50/50 Göçebe'yi bitirir; tur min/ortanca/max 30/33/46; 20–32 aralığında 24/50; en düşük nüfus 3 (2'ye düşmedi).
- Ortalama: 3 Çadır+Totem tur 14, Yerleşik Hayat 16, nüfus 8 tur 19, Kurutma Rafı 25, çağ atlama 33 → darboğaz geçiş maliyeti birikimi.
- Neden: Göçebe depo 30 = geçiş yiyeceği 30, ama tur sonu yiyecek ≤ (30 − nüfus) × 0,96 → Kurutma Rafı fiilen zorunlu; 25 odun kış
  ısınmasıyla yarışıyor. Aday ayarlar (aşama 7, değiştirilmedi): `CAGLAR.gocebe.gecis.maliyet` (yiyecek 30 / odun 25) ya da `depoTavani 30`.

## Bilinen eksikler
- Tohumlu harita üretimi (şimdilik tümü çimen → Taş Ocağı/Balıkçı vb. karo şartlı binalar kurulamaz; aşama 3), yol, arayüz yok.
- Çekirdek henüz `src/main.js`'e bağlı değil (derlemeye girmiyor; arayüz aşama 5).
- Belgede belirsiz sayılar `TODO(tasarim)` yorumlarıyla işaretli (`grep -rn "TODO(tasarim)" src/data`).
- Antik Çağ geçişi Kütüphane'yi (Felsefe, 70 BP) gerektirir; §5'teki "zorunlu yol 265" bunu saymaz (gerçek 335; beklenen ~480 içinde).
