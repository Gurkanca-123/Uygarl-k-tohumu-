# Görsel yön — "sıcak diyorama"

Hedef: masa üstü maket / diyorama. Yumuşak low-poly, el yapımı hissi, sıcak ışık, okunur siluetler. Kod: `src/render/`.

## İlkeler
1. **Siluet önce:** her bina karanlıkta bile tanınmalı (çatı biçimi, baca, direk, kubbe, kule). Çağ = biçim + malzeme.
2. **Paylaşılan malzeme:** tüm binalar tek atlas dokulu malzeme + tek ışıltı malzemesi; renk köşe rengiyle. Parçalar birleştirilir
   (bina başına 1–2 çizim çağrısı), geometri `id|seviye|durum` anahtarıyla önbellekte.
3. **Dünya ölçekli doku:** atlas hücreleri (saman, deri, kütük, tahta, kerpiç, taş blok, moloz, kiremit, arduvaz, yarı ahşap,
   mermer, kumaş, toprak, ekin) dünya biriminde tekrarlar; kerpiç her duvarda aynı boyda görünür.
4. **Hafif eğim ve kusur:** çatılar taşkın, direkler hafif eğik, taşlar rastgele döner; tam simetri yok.
5. **Hayat:** baca dumanı, ateş/kıvılcım, işçi figürleri, rüzgârda ağaç, dalgalı su, kuşlar. Hepsi GPU'da (gölgelendirici) ya da
   havuzlu InstancedMesh; durağan sahnede ~30 fps sınırı.
6. **Durum okunur:** inşaat = iskele + yarı saydam taslak; hasarlı = isli/koyu + döküntü + is dumanı; kapalı = soluk, dumansız;
   Sv2 = ek yapı + süs, Sv3 = daha yüksek + bayrak.
7. **Işık:** sıcak anahtar güneş + gök/yer yarımküre dolgusu, ACES ton eşleme, yumuşak PCF gölge, hafif derinlik sisi,
   keşfedilmemiş alan = yumuşak kenarlı sürüklenen bulut örtüsü.

## Palet (sRGB)
| Rol | Renk |
|---|---|
| Çimen bahar / yaz / güz / kış | `#6fae4a` / `#8fb24a` / `#b58a3a` / `#e6edf3` (kar tozu: yukarı bakan yüzeyler) |
| Toprak / yol | `#8a6a3e` / `#b8955c` (tekerlek izi `#8d6f45`) |
| Su | derin `#2f6f9a`, sığ `#4fa3b8`, köpük `#e8f4f0` |
| Göçebe | deri `#c9a57a`, koyu deri `#8a6a48`, direk `#6b4a2c`, kumaş `#a8432f` |
| Taş Devri | saman `#c8a85a`, kütük `#7a5634`, taş `#8f8a80`, aşı boyası `#b5532e` |
| Bronz/Demir | kerpiç `#c79262`, sıva `#d8b68a`, erken kiremit `#b0603a`, bronz `#b57a3a` |
| Antik | kireçtaşı `#e3d8c0`, mermer `#efeae0`, kiremit `#c0603a`, lacivert kumaş `#3f6ea8` |
| Orta Çağ | sıva `#ece3cf`, kiriş `#4a3222`, arduvaz `#56606e`, sur taşı `#9a9488`, sancak `#b03a2e` |
| Işıltı | ateş `#ffb347`→`#ff6a1a`, pencere `#ffd27a` |
| Seçim / uygun / uygunsuz | altın `#ffd34d`, yeşil `#4cd964`, kırmızı `#e0443a` |

## Mevsim
Bahar yeşil-serin ışık, yaz sarı-sıcak ışık, güz turuncu yaprak + alçak güneş, kış mavi-beyaz ışık + kar tozu + kar yağışı.
