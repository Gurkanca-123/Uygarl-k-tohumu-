# CHANGELOG_DEV (yalnız son kayıtlar; eskiler `docs/CHANGELOG_ARSIV.md`)

## 2026-10-29 — Kalan yapıların ayrıntı geçişi (Sonnet 5.5)
- `binalar.js` ekleri: kil ocağı (çömlek rafı, çanak istifi, çömlekçi çarkı), maden (lamba, renkli cevher, vinç), mermer ocağı (yatan sütun, yarı heykel, altın damar), bağ bahçe (asma çardağı, üzüm, fıçı), kulübe, nöbet çiti (meşale, sancak), mağara resmi (meşale, el izleri), kışla (mankenler, silah rafı, sancaklar), manastır (kuyu, rahipler), darüşşifa (şifalı ot bahçesi, çeşme), lonca (sancak, sandıklar), ağıl. Böylece 54 yapının tamamı bu seanstaki görsel turdan geçti. Telefonda/oyun içinde denenmedi (kullanıcı deneyecek).

## 2026-10-29 — Göçebe/Taş Devri küçük yapılar zenginleştirildi (Sonnet 5.5)
- `binalar.js`: çadır (kafatası direği, ateş, süs flamaları), avcı kulübesi (boynuz, et şeritleri, yay), toplayıcı (ot demetleri, havan, çalı), oduncu (testere tezgâhı, talaş), kurutma rafı (balık/et, ateş), gözcü direği (taş yığını, uyarı ateşi), şifacı (havan, kökler, şifa taşları), taş ocağı (kazmalar, moloz), alet yapımcısı (çakmaktaşı, bileme taşı), erzak çukuru (çuvallar, sepetler), balıkçı (kayık, ağ çerçevesi). Önizleme ile kontrol edildi; oyun içi/telefon denenmedi.

## 2026-10-29 — Tarım/üretim yapıları yeniden tasarlandı (Sonnet 5.5)
- `binalar.js`: `tarla` yardımcısına başaklar (tüm tarlalar), `koyun`/`tavuk` figürleri; `ciftlik` (koyun sürüsü, kümes, silo), `sulanan_tarla` (şaduf+havuz, korkuluk, hayvanlar), `ambar` (samanlı çatı, havalandırma, rampa, çuvallar), `demirci` (açık demirhane: ocak, örs, körük, su teknesi, alet rafı), `eritme_firini` (taş bantlı konik fırın, yükleme platformu, kalıplar, cüruf), `pazar_yeri` (orta çeşme, flama ipleri, sepetler), `kuyu` (makara, kova, yalak, çiçekler). Önizleme ile kontrol edildi; oyun içi/telefon denenmedi.

## 2026-10-28 — Üretim/ekonomi yapıları yeniden tasarlandı (Sonnet 5.5)
- `binalar.js`: `degirmen` (halkalı konik kule, galeri, saman külah, çuval istifi, kulübe), `han` (çıkmalı iskelet, balkon, tabela, fener, ahır, araba), `hamam` (iki kubbe + ışık delikleri, altın alem, üç kemerli revak, çini şerit, havlu ipi), `dokuma_atolyesi` (boya küpleri, yün balyası, çatı penceresi), `su_kemeri` (üst sıra kemer, payandalar), `liman` (vinç, sandıklar, fener, ağ). Önizlemeyle kontrol edildi; oyun içi/telefon denenmedi.

## 2026-10-28 — Anıt yapılar yeniden tasarlandı (Sonnet 5.5)
- `binalar.js`: `mabet` (boyalı kuşaklı 4 katlı zigurat, köşe mangalları, altın piramit çatılı tepe tapınağı, geniş merdiven), `kutuphane` (başlıklı sütun cephesi, mavi friz, alınlık+sikke, kemerli ışıklı pencereler, heykel/defne), `tiyatro` (ışınsal merdivenli cavea, üst galeri sütunları, mozaik orkestra, iki katlı skene, meşaleler), `katedral` (uçan payandalar, sivri çıkıntılar, haçlar, çok katlı portal, kandiller), `kale` (sürgülü kapı + köprü, kule bayrakları, okçu delikleri). Önizleme ile kontrol edildi; oyun içi/telefon denenmedi.

## 2026-10-28 — Çağ merkezleri yeniden tasarlandı (Sonnet 5.5)
- `binalar.js`: ortak `kutukOturak/kazan/kurutma`; `kamp_atesi` (büyük ateş, iki boyalı çadır, totem, kazan, kurutma), `ocak_meydani` (saman ev, kemik kapı, ayakta taş halkası, mağara resmi levhası), `koy_meydani` (boyalı frisli yönetim evi, merlon, kuyu, bronz başlıklı dikili taş), `agora` (sütun başlıklı tapınak cephesi, alınlık/akroter, heykel, defne, çeşme), `sehir_meydani` (sivri kemerli galeri, çıkmalı iskelet kat, çatı pencereleri, saat kulesi, çeşme, tezgâh, kandiller). Önizleme ile kontrol edildi; oyun içi/telefon denenmedi.

## 2026-10-28 — Ev grubu yeniden tasarlandı (Sonnet 5.5)
- `binalar.js`: `M.kerpic_ev` (kirişli düz dam, kemerli kapı, biber şeritleri, tente, Sv2 üst oda, Sv3 çatı bahçesi), `M.tas_ev` (tek katman saçaklı kırma çatı, sütunlu sundurma+alınlık, zeytin ağacı; eski çift çatı katmanı kaldırıldı), `M.yari_ahsap_ev` (çıkmalı ahşap iskelet üst kat, çapraz payandalar, çatı penceresi, fener, fıçı). Önizlemeyle kontrol edildi; oyun içi/telefon denenmedi.

## 2026-10-28 — Buğulu görüntü düzeltmesi (Sonnet 5.5)
- Neden: (1) büyütülen binalarda derz/tümsek ayrıntısı (`stil.js` `net`) devreye girip duvarları benekli gösteriyordu, (2) geniş parlama + AO + köy dışı doygunluk düşüşü + yakın sis görüntüyü soluklaştırıyordu.
- `stil.js` bd: `net` ×0,3, parlama eşiği/şiddeti düşürüldü (0,5→0,28), AO daha hafif, kontrast 1,07→1,14, köy dışı doygunluk 0,68→0,86, kenar logaritmik ağırlığı azaltıldı; `sahne.js` sis 72–125 → 95–150. `binalar.js`: bina ölçeği grup yerine geometriye pişirildi (tekdüze 1,24; merkez 1,30; +0,04/seviye; zemin ZEMIN_Y sabit). Ekran: `docs/ekran/koy-net-yakin.png`. Telefonda denenmedi.

## 2026-10-28 — Temiz low-poly görünüm (Sonnet 5.5)
- `malzeme.js`: `yamala` seçeneği `atlasK` (doku etkisi; 1 = tam). `binaMat` 0,28: duvar/çatı dokusu gürültüsü azaldı, köşeli yüzeyler ve vertex renkleri öne çıktı. Bilinen: kiremitli çatılarda üst üste binen katmanlardan z-fight benzeri benek (ev modellerinde çatı geometrisi sadeleştirilecek).

## 2026-10-28 — Ana vitrin yapıları: Totem + Darphane yeniden tasarlandı (Sonnet 5.5)
- `binalar.js`: `parca()` yardımcısı (yerel çerçeve + yaw), `M.totem` (ayı/kurt/kartal katları, boyalı kanat, tüy tacı, adak çanağı), `M.darphane` (kemerli portal, demir parmaklıklı pencereler, altın sikke madalyonu, ocak ışıklı pencere, örs/sikke/külçe, bayrak). Önizleme ile 2 tur eleştirildi; oyun içi/telefon denenmedi. Sıradaki: aynı yöntemle diğer yapılar.

## 2026-10-28 — Bina ayrıntı geçişi 1 (Sonnet 5.5)
- `binalar.js` ortak parçalar: pencere (çıta, denizlik, lento, rastgele renkli panjur), kapı (lento, eşik taşı, kol); `birlestir`: konuma bağlı el boyaması değer değişimi + üst solma/taban kiri. Tüm 54 bina etkilenir. Fark ince; asıl sıçrama için çağ çağ yeniden modelleme gerekir. Denenmedi: telefon.

## 2026-10-28 — Yapılar büyütüldü (Sonnet 5.5)
- `binalar.js` `binaModeli`: yatay ×1,14 (merkez ×1,20), dikey ×1,35; her seviye +0,04 yatay / +0,05 dikey (yükseltme gözle görülür). Çit/sur ve önizleme değişmedi. Ekran: `docs/ekran/koy-buyuk-orta.png`. Telefonda denenmedi.

## 2026-10-28 — Bina taşıma (Sonnet 5.5)
- `insa.js` `tasi(durum, uid, x, y)` (+ `tasimaMaliyeti`, `tasimaEdilebilirMi`, `tasimaZemini`), `denge.js` `TASIMA_MALIYET` 0,20. Seviye/hasar/işçi korunur; merkez, çit/sur ve işi süren bina taşınmaz. Bina kartında "↔ Taşı" (yerleştirme akışı yeniden kullanıldı). Test eklendi (197). e2e/telefon denenmedi.

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
