# CHANGELOG_DEV (yalnız son kayıtlar; eskiler `docs/CHANGELOG_ARSIV.md`)

## 2026-10-28 — Aksiyon MVP: sefer, kahraman, komşu, hedef (Opus 5.5 çekirdek, Sonnet 5.5 UI+denge)
- Çekirdek: `seferler|kahramanlar|komsular|hedefler.js`, `core/sefer|kahraman|komsu|hedef.js`, kayıt v4 (`goc3to4`), ayrı RNG akışları. Avcı/Kaşif, Keşif/Ayı Avı/Harabe, 1 komşu, Ayı destanı + 4 görev kartı. Seferde ölüm yok.
- UI: `src/ui/aksiyon.js` (Seferler penceresi: Sefer/Yolda/Kahraman/Komşu/Hedef), harita işaretleri, 6. gün kahraman teklifi, 🎯 hedef rozeti.
- Denge: `SEFER_SANS` [0,3;1,4], eşikler/ödül çarpanı, zorluklar yükseltildi; r=1 → büyük %35/başarı %30/kısmi %17/başarısız %18. Bot ölçümünde (kahramanlar hep ekipte) büyük başarı ~%49: telefonda gerçek oynanışla ayarlanacak. Seferli bot Göçebe 41/50 hedefte, ayı destanı 43/50.
- Testler 233 (232+1 todo), e2e 292/292. Gerçek cihaz denenmedi.

## 2026-10-27 — Tehditler 5 çağda + arayüz bağlantısı (Opus 5.5 çekirdek, Sonnet 5.5 UI) + aksiyon tasarımı
- Çekirdek: 10 tehdit tanımı, çağ başına 2–6 aday, gerginlik/darbe artışı, kuşatma evresi (3 tur, surla aşınma), `silahDagit`, `kusatmaKarar`, Önder eylemleri `nobet_tut`/`elci_gonder`. Pasif oyun ölçümü: çağ başına 1/2/3/4,85/5,65 tehdit, kayıp ~%9–15; nüfus ≥2 korunur. Kayıt sürümü 3 aynı.
- UI: tehdit penceresi tüm seçenekler (elçi hatası düzeldi), kuşatma karar penceresi, çip. e2e 163/163, testler 196 (195+1 todo). Gerçek cihaz denenmedi.
- `docs/AKSIYON.md` yazıldı (sefer/kahraman/komşu/savaş/hedefler; onay bekliyor).

## 2026-10-26 — Pencereleri küçültme (Sonnet 5.5)
- Kök yazı `clamp(11px,2.6vh,15px)`, rem tabanlı; sekme penceresi ≤%38×%62, bina/karo kartı sol altta ≤%30×%50, −/+ ≤44px; sağ sekmeler etiketsiz ikon; İş sekmesi tek satır durum + daraltılabilir listeler. e2e 103/103 (viewport içinde/örtmeme kontrolleri). Gerçek cihaz denenmedi. Kalan: kartta "Yükseltme:" satırı alt kenarda hafif kesik; kart seçilen yapıya yakın konumlanmıyor.

## 2026-10-26 — İş sekmesi "Kadro" + otomatik iş dağıtımı (Sonnet 5.5)
- Çekirdek `src/core/isdagit.js`: `dagitimOnerisi` (kaynak ihtiyacı ağırlığı: depo doluluğu, açlıkta yiyecek ×3, öncelik ×3; savunma/bilgi yuvaları), komutlar `isDagit`, `isDagitimAyarla({oto, oncelik})`, tur adımı `b2` (oto açıksa). Durum alanı `isDagitim { oto:false, oncelik:'dengeli' }` (varsayılan KAPALI; eski kayıt eksikse varsayılan). `ISDAGIT_ONCELIKLER` denge.js.
- UI (`paneller.js isSekmesi`): özet, öncelik çipleri, ⚡ Boştakileri dağıt, Otomatik anahtarı; üretim türüne göre gruplu kartlar (eksik yuvalar önce, ●●○ noktalar, 'üretmiyor' etiketi, ada dokununca haritada odak). `tur.test.js` adım listesi b2'yi içerir. Testler 182 (181+1 todo). Gerçek cihaz/e2e denenmedi.

## 2026-10-26 — Arayüz sadeleştirme (Sonnet 5.5)
- İşçi rozeti artık yalnız seçili binada (haritadaki rozet kalabalığı kalktı); boşta işçi varsa 👥 çipine dokunmak İş sekmesini açar. Dar ekranda (≤960px) üst çubuk çipleri sıkıştırıldı (ek ayrıntılar gizli). e2e'deki rozet kontrolleri (seçimsiz rozet bekleyenler) güncellenmedi/yeniden koşulmadı.

## 2026-10-26 — Çit çizme + çit modeli + tehdit arayüzü (Sonnet 5.5)
- Çit/sur: İnşa'dan Çit/Sur Parçası seçince çizim kipi (`arayuz.js cizimBaslat/cizimOlay`, sahne `cizimKipi/cizimOnizleme/onCizim`): tek parmak sürükleyerek çizer (hızlı harekette 4 yönlü doldurur, aynı hücreden başlayınca siler), iki parmak kaydırır, ✋/✏ ile kaydırma kipi, ↶ geri al, yeşil işaretler = halkadaki boşluk, `Kur (N)` → `insaEtCok`. Önizleme komşu bağlantılıdır.
- Model: `M.cit` / `M.sur_parcasi` komşu maskesine (`baglantiMaskeleri`, world/cevre.js) göre kollu; çevre parçaları döndürülmez, iskelesiz. Tamamlanan çit/sur bildirimi tek satırda toplanır (`insa.js`).
- Tehdit arayüzü (`src/ui/tehdit.js`): üst çubuk çipi (Sakin/Tedirgin/Gergin, aktifken ⚔ + kalan gün, yeni uyarıda pencere kendiliğinden açılır, oyunu durdurmaz); pencere: metin, varış/güç/savunma, renkli bar, tavır (Savun/Saklan/Haraç), Acil Tahkimat, savunma dökümü, çevre durumu + Çit/Sur çiz düğmeleri, zorluk düşürme. Nöbet/Elçi/Silah yok.
- Testler 174 (173+1 todo). Tarayıcıda (SwiftShader) çizim/kurulum/pencere elle denendi; dokunmatik gerçek cihazda ve e2e senaryosu denenmedi.

## 2026-10-26 — Tehdit MVP + çit/sur (Opus 5.5) + bina kartında iş atama (Sonnet 5.5)
- Tehdit: Göçebe+Taş Devri 3 tehdit, gerginlik/uyarı/tavır/haraç/tahkimat/bekçi, zorluk (Barışçıl/Rahat/Normal/Zor), kayıt v3. Bot 50 tohum: 50/50 hedefte, tur 25/28/32, nüfus ≥3.
- Çit/sur: `cit` binası, kapalı halka bonusu, `insaEtCok`. UI: bina kartı −/+/doldur/boşalt + 👷 rozeti.
- Testler 173 (172+1 todo), e2e 70/70. Gerçek cihaz denenmedi.

## 2026-10-26 — BD varsayılan + ilk dakika (Sonnet 5.5) + tehdit tasarımı (Opus 5.5)
- Varsayılan görünüm bd; `?stil=eski|0` eski render; WebGL2 yoksa/hata olursa eski görünüme düşer. Ayarlar kalitesi uygulanıyor.
- `BASLANGIC_KAYNAK` odun 6, deri 2 (ilk Çadır ilk gün); öğretici 5 adımlı ve duruma tepkili. Bot: 24/28/34, 47/50 hedefte. Testler 143 (142+1 todo), e2e 46/46.
- `docs/TEHDIT.md` (dış tehditler tasarımı, taslak).

## 2026-10-26 — BD turu 2: köy odağı, dağ, çim/ağaç (Opus 5.5)
- `stil_bd.js`/`stil.js` (yalnız bd dalı): köy avlusu/patika 1/8 karo uzaklık dokusu, sıcak ışık havuzu + köy dışı doygunluk düşüşü, ağaç açıklığı, seçili bina çerçevesi; dağ faset/sırt/kar; çim ton lekeleri; 4 ağaç türü, koru/yaşlı ağaç. Yüksek: 74–106 çağrı, 194–215 bin üçgen. Kalan: ağaç tacı halı gibi, avlu içi malzeme ayrımı yok, uzak çakıl gürültüsü. Bina modelleri bilerek değişmedi (oynanış onayından sonra).

## 2026-10-26 — Stil BD: B (cel) + D (arazi) birleşimi (Opus 5.5)
- `src/render/stil_bd.js` (`?stil=bd`, D alt sınıfı), `stil.js` bd geçişi, `sahne.kaliteAyarla(Yüksek|Standart|Performans)` (ilk kez render'a bağlı), ağaç/süs LOD, yalnız etkilenen arazi öbeklerinin yeniden boyanması. Ölçüm (SwiftShader): Yüksek 81–116 çağrı / 195–220 bin üçgen; bina eklerken ~30–50 ms. Kalan: dağ faset, benzersiz çağa özgü bina silüetleri (binalar.js), düz çim alanları. Telefonda ölçülmedi.

## 2026-10-26 — Stil D: referans konsepte yakın (Opus 5.5)
- `src/render/stil_d.js` (`?stil=d`): yükseklik alanı arazi (falez, çukur su, kumsal), yoğun bitki, otlayan hayvan, iskele/tekne, patikalar; `stil.js` d kipi (altın saat ışığı, AO, parlama). Yalnız görsel; seçim/yerleştirme aynı. Tam keşifli haritada ~100 çizim çağrısı, 297–314 bin üçgen (bütçe sınırında). Bina/keşif değişince arazi yeniden kuruluyor (~50–150 ms tahmin). Eksik: benzersiz el boyaması binalar, şelale/nehir, yüksek dağ, ağaç LOD. Ekran: `docs/ekran/stil-d-*.png`.

## 2026-10-26 — Stil adayları (Opus 5.5)
- `src/render/stil.js`: `?stil=a|b|c` (A maket/tilt-shift, B çizgi film, C boyalı); parametresiz görünüm değişmez. `tests/e2e/stil.mjs`, `docs/ekran/stil-*.png`, `docs/GORSEL.md` "Stil adayları". Kullanıcı seçecek. Tahmini ek maliyet 1–4 ms/kare (GPU'lu telefonda ölçülmedi).

## 2026-10-26 — Dikey örtü + tam ekran + manifest (Yapan: Sonnet 5.5)
- `dom.js`: `donusPerdesiKur` (dikeyde "Telefonu yan çevirin" örtüsü, matchMedia+resize), tam ekran yardımcıları (webkit yedekli, `screen.orientation.lock('landscape')` try/catch). `arayuz.js`: üst çubukta ⛶ düğmesi, ana menüde "⛶ Tam ekran", Devam/Yeni oyun sonrası bir kez kapatılabilir öneri (`ut_tam` localStorage). `arayuz.css`: örtü + animasyonlu telefon.
- `index.html`: theme-color, apple/mobile-web-app-capable, manifest + ikon; `public/manifest.webmanifest` (fullscreen, landscape) + `public/ikon.svg`. Service worker yok. e2e'ye örtü kontrolü eklendi.
- Gerçek cihazda denenmedi (tam ekran/kilit API'si Playwright'ta sınırlı).

## 2026-10-26 — Görsel yenileme: köy/bina (Opus 5.5) + arayüz pencereleri (Sonnet 5.5)
- Render: 54 binanın tamamı çağa özgü prosedürel model (inşaat/hasar/kapalı/Sv görünümleri), süs, işçi figürleri, dokulu karo/yol, ağaç/su/kar/mevsim ışığı, gerçek model yerleştirme önizlemesi, `onizleme.js`.
- UI: sağ sekmeler → açılır-kapanır pencere sistemi, ana menü (Devam/Yeni/Ayarlar/Hakkında), inşa kategorileri, görsel cila.
- npm test 141+1 todo, build ve e2e 33/33 geçti. Ekran: `docs/ekran/koy-*.png`, `ui-*.png`. Gerçek cihaz denenmedi.

## 2026-10-26 — Aşama 4+5: sahne + arayüz (Yapan: Sonnet 5.5)
- Eklendi: `src/render/{sahne,harita,binalar}.js`, `src/ui/{oyun,arayuz,paneller,ogretici,dom}.js` + `arayuz.css`, `src/main.js`, `tests/e2e/oyna.mjs` (`npm run e2e`).
- Çekirdek/veri/world/save DEĞİŞMEDİ. `vite.config.js`: three ayrı chunk. `index.html`: `#arayuz` kökü.
- npm test 141+1 todo; build geçti; e2e 33/33 (telefon 844×390 dokunmatik + masaüstü, Playwright/SwiftShader). Ekran: `docs/ekran/`.

## 2026-10-26 — Aşama 0–3 özeti
- 0 tasarım (Opus*), 1 veri+durum+kayıt, 2 simülasyon çekirdeği, 3 harita/keşif/yerleşim (hepsi Opus 5.5; *Fable kredisi yok).
- Testler 142 (141 + 1 todo), derleme geçti. Ayrıntı: arşiv.

## 2026-10-26 — Token verimliliği
- `PROJECT_STATE.md` küçüldü (ayrıntı `docs/MIMARI.md`), changelog arşivlendi, `CLAUDE.md`'ye token kuralları (Sonnet 5.5, koordinasyon).
