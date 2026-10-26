# PROJECT_STATE

**Durum:** Aşama 3 bitti (64×64 tohumlu harita, keşif sisi, yerleşim sınırı, bina yerleştirme, orman temizleme, yol, kayıt v2).
Sıradaki: aşama 4 (MODEL_PLANI'na göre). Denge ayarı aşama 7 (bot sonucu aşağıda).

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
  `komutlar.js` (tüm komutlar + `vergiAyarla`, `takasYap`; aşama 3: `ormanTemizle`, `yolYap`, `yolKaldir` insa.js'de).
- Bu turun geçici kayıtları `durum.istatistik.sonTur` (kapalı binalar, açlık, ısınma, üretim/tüketim özeti) — kayda girer.
- `insaatSirasi` girdileri: `'<uid>'` · `'yukselt:<uid>'` · `'onar:<uid>'` · `'temizle:<y*n+x>:<kalan>'` (orman temizleme; sınıra sayılır). Yaralı işçi = değiştirici `{ id:'yarali', etki:{ yaraliIsci } }`.
- `src/save/kayit.js`: `serialize`, `yukle(metin, gocler, hedefSurum)`, `kaydet/oku(depo, anahtar)` (depo enjekte), `GOCLER`, `:bozuk` yedeği,
  `turIlerletVeKaydet(depo, durum)` (§1.2 p, çekirdek dışında).
- `src/world/` (saf, DOM/three yok; çekirdek bunları kullanır): `izgara.js` (geometri, `izgara`, `kenarKomsulari`, `mesafeHucreleri`,
  `binaUzakligi`, genel `yerDenetle(baglam, binaId, x, y)`), `harita.js` (üretim `haritaUret`/önbellekli `zemin`, `haritaDenetle`
  garantileri, `karoAt`/`karoKodu` ham okuma, `karoDegistir` kalıcı değişim, `merkezNokta`, `sinirIcinde`, `haritaIstatistik`),
  `kesif.js` (bit kümesi base64, `kesifli`, `gorunurKaro` = sis + çağ görünürlüğü, `kesfet`/`kesifUygula`, `kesifHedefi`,
  `haritaKesfiUygula`, `kesifYaricapi`, `yonAdi`), `yerlestir.js` (`yerUygunMu`, `uygunYerler`, `sinirKenarinda`),
  `yol.js` (`yolAgi` BFS önbellekli, `yolBagli`).
- `src/render/sahne.js`: izometrik ortografik sahne, yer tutucu zemin (haritayı henüz çizmiyor). `src/ui`: boş.
- Harita durumu (kayıt v2): `harita = { tohum (alt-tohum), boyut, kesif (base64 bit kümesi), degisim {'<y*n+x>': kod} }`;
  zemin her açılışta tohumdan üretilir (≈6 ms, önbellekli). Merkez bina ortada (31,31); yerleşim sınırı `YERLESIM_YARICAP` (Öklid,
  merkez binanın ortasından). Bitişiklik/yerleşim oyuncunun GÖRDÜĞÜ karoyu kullanır (`gorunurKaro`).
- `tests/`: 142 test (141 geçer + 1 `todo`; aşama 3: `harita` 13, `yerlestir` 11, veri +1). Önceki: eski 36 + `uretim` 14, `tuketim` 4, `nufus` 8, `huzur` 5, `eylem` 9, `olay` 9,
  `arastirma` 5, `insa` 7, `cag` 7, `tur` 11 (bütünleşik a–g), `bot` 3. Yardımcılar: `tests/yardimci/durum.js`, `tests/yardimci/bot.js`
  (`node tests/yardimci/bot.js 50` özet yazar). `durum()` yardımcısı formül testleri için "düz test zemini" kurar (merkez r≤12
  kalıcı değişimle çimen + açık; eski koordinatlar `K + x`); harita/yerleştirme testleri gerçek haritayı kullanır.

## Aşama 2 motor kararları (TODO(tasarim) varsayımları; `grep -rn "TODO(tasarim)" src`)
- Olay zamanı: `ILK_OLAY_TUR` = gösterim GÜNÜ (1'den); gün 1–5 olaysız, ilk olay 6. gün (tur 5). `turMin` de gün. Zincir sınırı bekler.
- Doğum huzur eşiği 40 (§2.5 = §7.3.7, kullanıcı kararı). Doğum `(tur+1) % aralık`; kayıp penceresi kayan 3 tur.
- Onarım eşzamanlı sınıra sayılmaz · hasarlı konut barınak vermez/yakmaz · sabit BP seviyeyle artmaz · araştırma değiştirmek cezasız
  (ilerleme havuza) · kitap tamamlanmada düşülür · Keşfet bonusları toplanır · Liman tek başına takas açar · Şifacı kayıp ×0,5 olasılıksal.
- İnşaattaki binaya işçi önceden atanabilir (bitince aynı tur üretir). Çağ atlama komutla hemen olur.
- Aşama 3: Keşfet harita keşfi RNG kullanmaz (eşitlikte yön `tur × altın açı`); orman temizleme inşaat sırasında 1 tur ve
  eşzamanlı sınıra sayılır; Kil Ocağı artık `kil` karosuna bitişik (eskiden su; kil su kenarında üretilir); `gorus`/`kesifYaricap`
  sayıları varsayım (Gözcü 8/+1, Muhafız Kulesi 9, Kale 10, Hayvan İzleri +1).

## Şemaya eklenen alanlar (§10'da yoktu)
- Bina: `kesifIyiSonuc, hastalikKayipCarpani, takas, olayAgirlik, kuresel, hastalikKapasitesiIscisiz, savunmaKenar, etkiIsciGerekir,
  anit, zafer, mvp`; `bitisiklik[].hedef` dizi olabilir, `mesafe` (Sulanan Tarla).
- Buluş etki türleri: `kesifIyiSonuc, isciSavunmaCarpani, seviyeAc`; `acar.ozellikler` (vergi).
- Sonuç: `onderYarali, kervan, kosullu, bos, kayipOrani, kayipKilidiKadar, puskurtme, vergi, bekleme, cagOlcek, hasar.binaId`;
  değiştirici `sure: null` = kalıcı, `uretim.etiket '*'`, `uretim.suMesafe`, `uretim.bonus`, `bakim`. Gereksinim: `isciTuruMin`.
- Karo: `kod`, `yalnizBina`, `gecilir`, `gizliGorunum`, `kesifBildir`, `yapay`; yeni karolar `kil`, `kayalik`, `dag`, `yol`.
  Çağ: `kimlik` (`acikAlan` kaldırıldı → `denge.js` `YERLESIM_YARICAP`). Olay: `cagBasinaBir`. Eylem: `haritaKesfi`.
  Bina: `gorus`, `kesifYaricap`. Buluş etkisi: `kesifYaricap`.
- Durum: `onder.secim` (sözlük|null; Kervan Gönder `{ ver, al }`; eski kayıtta yoksa null, sürüm değişmedi).

## Bot sonucu (aşama 3, gerçek harita, 50 tohum, `tests/yardimci/bot.js`)
- 50/50 Göçebe'yi bitirir; tur min/ortanca/max 27/31/42; 20–32 aralığında 42/50; en düşük nüfus 3. (Aşama 2, düz çimen: 30/33/46, 24/50.)
- Fark: bot artık gerçek orman bitişikliğini kullanıyor (Oduncu/Toplayıcı +%25–50). Bot Keşfet kullanmıyor (Göçebe binaları
  başlangıç görüşüne sığıyor). Sayı ayarı yapılmadı (aşama 7). Eski darboğaz notu (aşama 2): Göçebe depo 30 = geçiş yiyeceği 30 →
  Kurutma Rafı fiilen zorunlu; aday ayarlar `CAGLAR.gocebe.gecis.maliyet` ya da `depoTavani 30`.
- Harita (200 tohum ort.): çimen %54 · orman %20 · dağ %12 · kayalık %7 · su %2,3 · verimli %2,1 · taşlık %0,8 · kil %0,6 · cevher %0,4
  · mermer %0,3. Merkeze en yakın (ort/min/max): orman 3,6 · taşlık 5,0/4,3/6,0 · su 6,3 · kil 7,2/6,0/10,1 · cevher 11,1/8,7/12,6
  · mermer 16,1/14,3/17,7. Yeniden deneme ort. 0,2. Tipik kayıt ~2,5 KB.

## Bilinen eksikler
- Arayüz yok; sahne haritayı/sisi henüz çizmiyor (render aşaması). Harita 4 yön BFS ile su/dağ geçilmez — köprü yok.
- Çekirdek henüz `src/main.js`'e bağlı değil (derlemeye girmiyor; arayüz aşama 5).
- Belgede belirsiz sayılar `TODO(tasarim)` yorumlarıyla işaretli (`grep -rn "TODO(tasarim)" src/data`).
- Antik Çağ geçişi Kütüphane'yi (Felsefe, 70 BP) gerektirir; §5'teki "zorunlu yol 265" bunu saymaz (gerçek 335; beklenen ~480 içinde).
