# Prosedürel mimari üretim katmanı (`src/render/mimari/`)

Durum: **prototip, varsayılan KAPALI** (`?mimari=yeni` ya da `localStorage ut_mimari=yeni`). Yalnız `yari_ahsap_ev` kayıtlı; diğer 54 bina eski modelle çizilir.
Eski modeller (`binalar.js` `M.*`) ve `Kurucu` aynen durur; yeni katman `Kurucu.ekle` ile aynı birleştirme/önbellek hattını kullanır.

## Katmanlar
| Dosya | Görev |
|---|---|
| `geometri.js` | `Yerel` (konum+dönüş çerçevesi), dışbükey katı/prizma/kiriş/kemer üreticileri, `kutuGeo` (gizli yüz kırpma) |
| `cati.js` | `catiBesik` (kırık eğim, saçak, alın kirişi, mahya), `catiTek`, `kuleKulah`; kabuk + sıra kiremit/arduvaz dilimleri (dilim = 4 üçgen) |
| `parcalar.js` | pencere, kapı (kemer taşlı), kiriş kafesi, çıkma altı, baca, çatı penceresi, sundurma |
| `cag_stilleri.js` | altı çağ paleti/malzeme kuralı (yalnız `ortacag` tamam; diğerleri taslak) + oyun çağı → mimari çağ eşleşmesi |
| `varyasyon.js` | `varyantSec(uid, adet)` — uid'den sabit varyant |
| `tarifler/yari_ahsap_ev.js` | `kanat()` üreticisi + 4 varyant: klasik, L planlı, kuleli, atölyeli |
| `index.js` | kayıt, varyant sayısı, açma anahtarı |

## Kurallar
- Önbellek anahtarı `id|seviye|durum|m<varyant>[u]`; varyant sayısı sınırlıdır (kontrolsüz benzersiz geometri yok). `u` = uzak ayrıntı (`lod`).
- Koordinat/yön: karo birimi; ön cephe +z, ikinci görünür cephe +x. Cephe çerçevesinde arka/alt yüz atılır (kamera yukarıdan bakar).
- Yeni bina eklemek: `tarifler/<id>.js` yaz → `index.js` `KAYIT`'a ekle → `tests/mimari.test.js`'e üçgen/varyant kontrolü ekle.
- LOD: `mimariLod(zoom, onceki)` (eşik 2.0, histerezis ±0.12); `sahne.js` `kameraGuncelle` eşik geçince bina modellerini önbellekteki geometrilerle yeniden kurar. Uzak: kiremit sıraları iri, küçük ayrıntı (çıta, konsol, çiçek, sarmaşık, demir bant) yok, dilim rengi sakin.
- Üçgen: konut 3,7–4,9 bin tam, ≈ %30 az uzak (eski 0,9 bin). Testler: üçgen ≤ 6000, uzak ≤ %85, model başına bellek < 1,2 MB, taşma, kurulum süresi, LOD histerezisi.
- Bellek notu: her (varyant × seviye × durum × LOD) ayrı geometridir (~0,8 MB); kullanım ihtiyaç anında dolar, boşaltma yok.

## Ölçüm (isteğe bağlı; kullanıcı kararıyla gerçek cihaz ölçümü yapılmıyor)
- `olcum.html` (build'e dahil): eski/yeni/yeni-uzak × 30/80/160 konut; fps, ort/p95 ms, çağrı, üçgen, kurulum süresi, GPU adı. Yazılım çizimi (SwiftShader) algılanırsa uyarır: telefon sayısı değildir.
- `karsilastir.html` (yalnız `npm run dev`): eski + varyantlar yan yana. `tests/e2e/mimari.mjs`: oyun sahnesinde eski/yeni köy ekran görüntüsü.
