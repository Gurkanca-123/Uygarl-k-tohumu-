# Prosedürel mimari üretim katmanı (`src/render/mimari/`)

Durum: **varsayılan KAPALI** (`?mimari=yeni` ya da `localStorage ut_mimari=yeni`). Kayıtlı: `yari_ahsap_ev` (4 varyant), `katedral` (3), `degirmen` (3, su değirmeni); diğer 52 bina eski modelle çizilir.
Eski modeller (`binalar.js` `M.*`) ve `Kurucu` aynen durur; yeni katman `Kurucu.ekle` ile aynı birleştirme/önbellek hattını kullanır.

## Katmanlar
| Dosya | Görev |
|---|---|
| `geometri.js` | `Yerel` (konum+dönüş çerçevesi), dışbükey katı/prizma/kiriş/kemer üreticileri, `kutuGeo` (gizli yüz kırpma) |
| `cati.js` | `catiBesik` (kırık eğim, saçak, alın kirişi, mahya), `catiTek`, `kuleKulah`; kabuk + sıra kiremit/arduvaz dilimleri (dilim = 4 üçgen) |
| `parcalar.js` | pencere, kapı (kemer taşlı), kiriş kafesi, çıkma altı, baca, çatı penceresi, sundurma |
| `cag_stilleri.js` | altı çağ paleti/malzeme kuralı (yalnız `ortacag` tamam; diğerleri taslak) + oyun çağı → mimari çağ eşleşmesi |
| `varyasyon.js` | `varyantSec(uid, adet)` — uid'den sabit varyant |
| `kanat.js` | ORTAK bina gövdesi üreticisi: taş zemin + çıkma + kiriş kafesli üst kat + alın + kırık çatı + çatı penceresi + baca (ev, değirmen, sonraki konut/atölyeler) |
| `parcalar_anit.js` | gotik/anıt parçaları: sivri kemer, vitraylı lanset, gül pencere, kademeli portal, ayak, uçan payanda, kule gövdesi/külah, mahya süsü, sahanlık |
| `parcalar_su.js` | su çarkı (dönen ayrı ağ), kanal, havuz, savak, köprü, çuval yığını, araba, vinç |
| `tarifler/yari_ahsap_ev.js` | 4 varyant: klasik, L planlı, kuleli, atölyeli |
| `tarifler/katedral.js` | haç planlı gotik; 3 varyant: ikiz piramit, sekizgen külahlı, asimetrik |
| `tarifler/degirmen.js` | su değirmeni; 3 varyant: yan çark, üstten akışlı oluklu, ön çark + ambar |
| `index.js` | kayıt, varyant sayısı, açma anahtarı |

## Kurallar
- Önbellek anahtarı `id|seviye|durum|m<varyant>[u]`; varyant sayısı sınırlıdır (kontrolsüz benzersiz geometri yok). `u` = uzak ayrıntı (`lod`).
- `Yerel(k,x,y,z,ry,s)`: `s` tek biçimli ölçek (alt çerçeveler miras alır); kök çerçeve y'si kaide üstüne konup yerel yükseklikler 0'dan başlatılır (katedral).
- Dönen parça: tarif `k.pervane = { x, y, z, r, ry, geo }` verir (geo birim yarıçaplı, eksen yerel z; `suCarkiGeo`). `binalar.js` mesh'i oluşturur, `koy.js` mevcut döndürme döngüsü çevirir.
- Koordinat/yön: karo birimi; ön cephe +z, ikinci görünür cephe +x. Cephe çerçevesinde arka/alt yüz atılır (kamera yukarıdan bakar).
- Yeni bina eklemek: `tarifler/<id>.js` yaz (gövde için `kanat()` ya da parça modülleri) → `index.js` `KAYIT`'a ekle → `tests/mimari.test.js`'e üçgen/varyant/sınır kontrolü ekle. Yalnız +z/+x yüzleri ayrıntılandırılır (kamera sabit).
- LOD: `mimariLod(zoom, onceki)` (eşik 2.0, histerezis ±0.12); `sahne.js` `kameraGuncelle` eşik geçince bina modellerini önbellekteki geometrilerle yeniden kurar. Uzak: kiremit sıraları iri, küçük ayrıntı (çıta, konsol, çiçek, sarmaşık, demir bant) yok, dilim rengi sakin.
- Üçgen: konut 3,7–4,9 bin tam, ≈ %30 az uzak (eski 0,9 bin). Testler: üçgen ≤ 6000, uzak ≤ %85, model başına bellek < 1,2 MB, taşma, kurulum süresi, LOD histerezisi.
- Bellek notu: her (varyant × seviye × durum × LOD) ayrı geometridir (~0,8 MB); kullanım ihtiyaç anında dolar, boşaltma yok.

## Ölçüm (isteğe bağlı; kullanıcı kararıyla gerçek cihaz ölçümü yapılmıyor)
- `olcum.html` (build'e dahil): eski/yeni/yeni-uzak × 30/80/160 konut; fps, ort/p95 ms, çağrı, üçgen, kurulum süresi, GPU adı. Yazılım çizimi (SwiftShader) algılanırsa uyarır: telefon sayısı değildir.
- `karsilastir.html` (yalnız `npm run dev`): eski + varyantlar yan yana. `tests/e2e/mimari.mjs`: oyun sahnesinde eski/yeni köy ekran görüntüsü.
