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

## Stil adayları (deneme, `?stil=a|b|c|d`; parametresiz görünüm aynen)
Kod: `src/render/stil.js` (sahne.js'te 4 satır kanca). Ekran: `docs/ekran/stil-{a,b,c}-{orta,yakin}.png` (844×390, aynı Bronz köyü, zoom 1.9 / 3.4),
üretici `node tests/e2e/stil.mjs` (build sonrası). Ortak yol: sahne → 4× MSAA HalfFloat hedef + derinlik dokusu → tek tam ekran geçiş
(ton eşleme + sRGB burada). Üç stilde de yakın zoom hilesi: bina malzemesinde kaba-mip parlaklığından + hücreye göre prosedürel
tuğla/kiremit/tahta deseninden ekran türevli tümsek ve kontrast; `kamera.zoom` ve piksel yoğunluğuyla açılır (uzakta sıfır, kumlanmaz).
Telefon maliyeti (tümü): +1 tam ekran geçiş; dpr 2'de (1,3 Mpx) ek bellek ≈ 40 MB 4× MSAA RGBA16F + ≈ 15 MB çözümleme/derinlik (2× MSAA ya da dpr 1,5 ile yarıya).

**A — Minyatür maket** (12 örnekli disk tilt-shift + 8 derinlik örnekli AO + sıcak ton + vinyet; gölge PCF yarıçap 4)
+ "masa üstü oyuncak" hissi en güçlü; mevcut sıcak diyorama yönünün doğal devamı; yakında derinlik okunuyor.
− Üst/alt şerit bulanık: arayüz altında ayrıntı kaybı, kaydırırken odak ekranda sabit; AO hafif kirli kenar yapabilir.
Maliyet: ~21 doku okuması/piksel → orta sınıf telefonda ≈ +1,5–3 ms (yarı çözünürlüklü bulanıklıkla ≈ yarıya iner).

**B — Çizgi film** (Lambert ışığı malzemede 3 bant + keskin gölge; derinlik + log-parlaklık kenarı; doygun palet)
+ En okunur siluetler, küçük ekranda en net; bina/işçi/eşya ayrımı güçlü; kenar kalınlığı zoom'la artar.
− Atlas dokusunun incelikleri kenar çizgisiyle yarışır (çimen sapları uzakta hafif kumlu); "maket" sıcaklığı azalır.
Maliyet: 9 doku okuması/piksel + ışık bantlama bedava → ≈ +1–1,5 ms; üç adayın en ucuzu.

**C — Boyalı illüstrasyon** (fırça sapmalı 4 çeyrek × 4 örnek Kuwahara + pigment kenarı + kâğıt/fırça gürültüsü, sıcak-soluk palet)
+ En "sanatsal" ve kendine özgü; low-poly sertliğini ve doku tekrarını gizler; kış/güz paletleriyle iyi uyum beklenir.
− Yakında küçük ayrıntılar (pencere, eşya, işçi) eriyor; metin/işaret okunurluğu düşük; hareketle kâğıt dokusu ekrana sabit kalır.
Maliyet: 19 doku okuması + 16 ACES/piksel → ≈ +2–4 ms; en pahalısı (yarı çözünürlükte Kuwahara ile ≈ +1–1,5 ms).
Not: ms değerleri tahmindir; GPU'lu telefonda ölçülmedi (SwiftShader yalnız görüntü için kullanıldı).

**D — Konsept diyorama** (kullanıcının 6 çağlı konsept görseli havası; `src/render/stil_d.js` + stil.js'te `d` geçişi)
Ekran: `docs/ekran/stil-d-{genis,orta,yakin}.png` (aynı köy, yalnız düzenekte keşif yarıçapı 28; `STIL_LISTE=d node tests/e2e/stil.mjs`).
İçerik: kutu karolar gizli → tek yükseklik alanı (dağ = basamaklı falez + kaya kuleleri, su çukur + kumsal, karo sınırı gürültülü
renk karışımıyla görünmez), derinlik dokulu su (turkuaz sığ, kıyı köpüğü, parıltı), yoğun ağaç/çalı/ot/çiçek/kaya, otlayan inek/koyun,
iskele + tekne (yalpa), binadan merkeze toprak patika, kaide üstü toprak avlu; altın saat alçak güneş + sıcak kenar ışığı, PCF yumuşak
gölge, iki ölçekli derinlik AO, sıcak parlama, serin gölge/sıcak ışık ton ayrımı, binada dünya uzayı boya lekesi. Seçim yüksekliğe
ışın yürütür (inşa edilebilir karolar 0,30'da düz → yerleştirme aynı; düz zeminde 612 noktada fark 0).
+ Konsepte en yakın aday: arazi derinliği, ızgarasız zemin, canlı su ve bitki yoğunluğu; tüm çağlarda çalışır, model değişmez.
− Binalar hâlâ mevcut 54 model (konseptin iri çatılı, benzersiz el boyaması binaları yok); şelale/nehir akışı yok (göl karo biçimli);
  dağlar alçak (≤1,6 birim) ve dağ yüzü kaba (R=3–6 köşe/karo); kaide kenarları hâlâ kare; kenar ışığı izometride zayıf.
Maliyet: tam keşifli (r=28) haritada ≈100 çizim çağrısı, ≈300 bin üçgen (ağaçlar ≈150 bin; ot/çiçek uzakta gizli, 20×20 öbek budama);
son geçiş 8+8 AO + 12 parlama ≈ 30 doku okuması/piksel → orta sınıf telefonda ≈ +2–3 ms; arazi yeniden kurulumu (bina/keşif
değişince) ≈ 50–150 ms takılma. Ölçülmedi (SwiftShader yalnız görüntü); ağaçlar için mesafe LOD'u sonraki adım.
