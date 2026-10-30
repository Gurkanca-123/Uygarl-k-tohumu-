# CHANGELOG_DEV (yalnız son kayıtlar; eskiler `docs/CHANGELOG_ARSIV.md`)

## 2026-10-30 — Çocuklar çalışmaz + halk defteri (kullanıcı kararı) (Sonnet 5.5)
- `denge.js`: `COCUK_SURE = 5` (1 mevsim), `YETISKIN_YAS`. `yardimci.js`: `halkEkle/halkCikar/cocukSayisi/calismaGucu`; `kisiEkle(d, n, cocuk)`; işçi hesapları (`yaraliSayisi`, `etkinAtama`, `issizSayisi`, `atamaDuzelt`) ve `isAta` çalışma gücüne bağlandı.
- Doğum: çocuk doğar, atanmaz, işsiz sayılmaz, yiyecek tüketir. Kayıp: önce çocuklar. Göçmen/başlangıç: yetişkin. Şema: `halk[{id,dogum}]`, `halkSayac` (kayıt sürümü 3 AYNI; eski kayıt açılır, herkes yetişkin).
- UI: İş panelinde "👶 N çocuk" satırı, nüfus çipinde çocuk sayısı, "N/çalışma gücü çalışıyor".
- Denge etkisi: Göçebe bot ortanca 28→33 tur; test bandı 20–32 → 20–36 (43/50). Ayrıntı `docs/DENGE_BULGULARI.md`. Testler: `tests/cocuk.test.js` (7) + 3 eski test güncellendi; toplam 236 (235 geçer + 1 todo). Uzun sim değişmezlerine halk denetimi eklendi (0 ihlal).

## 2026-10-30 — Denge düzeltmeleri (kullanıcı onaylı) (Sonnet 5.5)
- Taş Ocağı: `karo:tasli` bitişiklik bonusu (+%25/karo, max 2). Çağ penceresi: yiyecek bozulması yüzünden ulaşılamayan geçiş maliyeti için 💡 ipucu (`cagSartlari().ipuclari`; şartı değiştirmez).
- `tests/denge_ipuclari.test.js` (2); toplam 229 (228 geçer + 1 todo). `docs/VATANDAS.md`: bireysel vatandaş "defter" tasarım önerisi (UYGULANMADI, onay bekliyor).

## 2026-10-30 — Bina evrimi + uzun simülasyon altyapısı (Sonnet 5.5)
- **Evrim (yerinde dönüşüm):** `binalar.js` `evrim:` alanı (çadır→kulübe→kerpiç→taş ev→yarı ahşap; tahıl bahçesi→sulanan tarla→çiftlik; alet yapımcısı→demirci; çit→sur; kurutma rafı→erzak çukuru).
  `denge.js` `EVRIM_MALIYET = 0.70`. `core/insa.js`: `evrimMaliyeti/evrimEdilebilirMi/evrimYap/evrimCok/evrimAdaylari`; kuyruk girdisi `evrim:<uid>` (eşzamanlı sınıra sayılmaz, eski bina çalışmaya devam eder),
  ödenen+hedef `d.istatistik.evrim[uid]` (KAYIT ŞEMASI/SÜRÜMÜ DEĞİŞMEDİ, eski kayıtlar açılır). Seviye = min(max(1, eski−1), hedef sınırı). Evrim sırasında hedefin 3×3 alanı `izgara()` ile ayrılır; bitişte sığmazsa iptal + iade.
  `cag.js`: çağ atlayınca `evrim_hazir` bildirimi (otomatik dönüşüm yok). UI: bina kartında "🔄 Evrim → X" (maliyet çipleri, eksik şart, iki dokunuş onay) + "Tüm … → X" toplu seçim.
- `dogrula.js`: evrim hedefi doğrulaması. `render/binalar.js`: evrim sürerken yükseltme görünümü. `isdagit.js`: evrimdeki bina işçi alabilir.
- Testler: `tests/evrim.test.js` (23), `tests/uzun_sim.test.js` (7); toplam 227 (226 geçer + 1 todo). `tests/yardimci/uzun_sim.js`: tüm çağlar botu + değişmez denetimi; `node tests/yardimci/uzun_sim.js <tohum> <gün> <zorluk> [çağ]`.
- `docs/DENGE_BULGULARI.md`: ölçüm + 9 denge bulgusu (HİÇBİR SAYI DEĞİŞMEDİ).
## 2026-10-30 — Kalan tüm binalar yeni mimari motorda: 55/55 (Sonnet 5.5)
- Eklenen aileler: tarım (çiftlik, ambar, ağıl, tahıl bahçesi, erzak çukuru, sulanan tarla, bağ-bahçe, kurutma rafı), lonca binası, darüşşifa, savunma (sur parçası, çit, nöbet çiti, gözcü direği, muhafız kulesi, kışla), ilkel çağ (10), bronz (6), antik (7), merkezler (5). Hepsi 3 varyant; çevre parçaları (cit, sur_parcasi) komşu maskesiyle uyumlu.
- Yeni parça modülleri: `parcalar_tarim/lonca/ilkel.js`. `tests/mimari.test.js` kayıtlı tüm binaları otomatik denetler. `tests/e2e/oyna.mjs`: `MIMARI=yeni npm run e2e` ile tam oyun yeni motor açıkken.
- Oyun verisi/mekanik değişmedi; yeni motor hâlâ varsayılan KAPALI. Şehir geneli bütünlük (çatı rengi, ışık, LOD) bir sonraki ortak aşama.

## 2026-10-30 — Kale, manastır, han ve atölyeler (Sonnet 5.5)
- Yeni tarifler (her biri 3 varyant): `kale`, `manastir`, `han`, `demirci`, `eritme_firini`, `dokuma_atolyesi`, `darphane`, `alet_yapimcisi`. Ortak parça modülleri: `parcalar_kale/avlu/han/atolye.js`. `antik` ve `ilkel` stil paketleri kullanıma alındı.
- `tests/mimari.test.js`: kayıtlı tüm binalar için ortak denetim (≥3 varyant, üçgen/bellek/taşma, LOD, durumlar). Denetim `yari_ahsap_ev` atölyeli varyantının karo dışına taştığını yakaladı; küçültüldü (görsel karakter korundu).
- Oyun verisi/mekanik değişmedi; yeni motor varsayılan kapalı.

## 2026-10-30 — Katedral + su değirmeni + ortak üretim sistemi (Sonnet 5.5)
- `tarifler/katedral.js` (3 varyant, ~13 bin üçgen, vitray/gül pencere/uçan payanda/ikiz kule) ve `tarifler/degirmen.js` (3 varyant, dönen su çarkı ayrı geometri + kanal/savak/köprü). Ortak: `kanat.js` (evden çıkarıldı), `parcalar_anit.js`, `parcalar_su.js`, `Yerel` ölçeği.
- `binalar.js`: pervane mesh'i `v.pervane.geo/ry` destekler (eski rüzgâr değirmeni aynen). Oyun mekaniği/veri dokunulmadı. Yeni motor yine varsayılan KAPALI.
- KARAR/RAPOR: 'Değirmen' görseli rüzgâr değirmeninden SU değirmenine döndü (araştırma `su_degirmeni`; işlev aynı). Katedral tekil olduğundan varyant oyun başına tek. Sol/arka yüzler ayrıntısız (kamera sabit).

## 2026-10-30 — Ev prototipi 2. görsel geçiş + kamera LOD'u (Sonnet 5.5)
- Ev: toprak tonlu çatı paleti (ocra/kahve karışımı, yosunlu dilim, yaşlı dilim), kapı feneri, taş taban kuşağı, baca çömleği, alçak bahçe çitleri, varyanta özgü iskelet deseni (carpraz/x/v/ince). Kullanıcı kararı: gerçek cihaz ölçümü yok; görsel kalite öncelikli.
- LOD: `mimariLod` (zoom 2.0 eşiği, histerezis) + `sahne.js` bağlantısı (yalnız mimari motorlu binalar etkilenir). Testler 9 → 11 (kaynak sınırları, LOD).

## 2026-10-30 — Prosedürel mimari motor temeli + yarı ahşap ev prototipi (Sonnet 5.5)
- Yeni `src/render/mimari/` (geometri, çatı, parçalar, çağ stilleri, varyasyon, `yari_ahsap_ev` 4 varyant); ayrıntı: `docs/MIMARI_URETIM.md`. Varsayılan KAPALI (`?mimari=yeni`). `binalar.js`'e yalnız kanca eklendi (`modelVerisi` dışa açık + `vr/yeni/lod` parametreleri); eski modeller değişmedi. Geri dönüş: dal `yedek/mimari-oncesi`.
- Ölçüm/karşılaştırma: `olcum.html` (build'e dahil, `vite.config.js` iki girişli), `karsilastir.html` (dev), `tests/e2e/mimari.mjs`, `tests/mimari.test.js` (7 test). `npm test` 203/204 (+1 todo), e2e 111/111.
- Konut üçgeni 3,5–4,7 bin (eski 0,87 bin) — gerçek telefonda ölçülmedi (yalnız SwiftShader). Çağ verisi (5 çağ) değişmedi; altı çağ stil paketi taslak.

## 2026-10-29 — Ekran bildirimleri azaltıldı (Sonnet 5.5)
- `arayuz.js`: toast yalnız önemli kodlar için (`ONEMLI_KOD`/`KRITIK_KOD`); inşaat bitti, iş dağıtımı, keşif, doğum, göçmen vb. yalnız Günlük'e düşer. En çok 2 toast, 3 satır, 4 sn. Ayarlar → "Ekran bildirimleri" (Önemli / Hepsi / Yalnız kritik), `ut_ayar.bildirim`. Testler geçti, build tamam; telefonda denenmedi.

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

## 2026-10-28 — Aksiyon/savaş yan dala alındı (kullanıcı kararı)
- `src/` ve `tests/` `8a51198` durumuna döndürüldü (tehdit 5 çağda + çit/sur + iş dağıtımı kalır; sefer/kahraman/komşu/hedef/savaş/görev sıklığı ayarı çıkar). Hepsi `yan/savas-aksiyon` dalında (HEAD `1a7ca0c`). Kayıt sürümü 3'e döndü. Testler 196 (195+1 todo).

## 2026-10-28 — Savaş F1: Ayı Avı görsel otomatik savaş (Opus 5.5 çekirdek+sahne, Sonnet 5.5 UI+düzeltme)
- Çekirdek `core/savas.js`, veri `birimler|rutbeler|savas.js`, kayıt v5; savaş sonucu tek `sefer.rng` çekimiyle tutarlı (1000 girdide sahne=çekirdek %100), ölüm yok, nüfus ≥2. Savaş Kapalı = eski hesaplamalı yol (Göçebe 40/50 birebir). `turIlerlet(d,{siklik,savasSahnesi})`.
- Sahne `render/savas.js` (~38 çağrı, 9,7 bin üçgen, 7,5–22 sn, atla/1×/2×). UI `ui/savas.js`: Ayarlar'da Savaş sahnesi, 'Savaş hazır' kartı, 3×3 yerleşim (öneri/otomatik/sürükle, canlı yüzdeler), sonuç kartı, ordu −/+, Lider rütbesi. `mevsimSonunaIlerlet` savaş hazırken durur (`neden:'savas'`). Shader hatası (objectNormal) düzeltildi.
- Testler 252 (251+1 todo); e2e 292 + savas_ui 129. Gerçek cihaz denenmedi. Kalan: ayı/figür ayrıntısı, ufuk, F2–F5.

## 2026-10-28 — Görev sıklığı azaltma (Sonnet 5.5) + savaş tasarımı `docs/SAVAS.md` (Opus 5.5)
- Karar isteyen öğe oyun başına 7,2→3,6 (≈ her 8 turda bir); mevsim kartı çağda en çok 2 set, isteğe bağlı, 4 tur sonra kapanır; aynı anda 1 bekleyen karar; işaret ≤2; toast birleştirme (`src/ui/toast.js`); destan ara adımları sessiz; Ayarlar'da Görev sıklığı Az/Normal/Çok (`ut_ayar.siklik` → `turIlerlet(durum,{siklik})`, çekirdek saf). Göçebe 40/50 hedefte, ortanca ~26, ayı destanı %90. Testler 242 (241+1 todo), e2e 292/292.
- Yedek: `yedek/savas-oncesi` dalı (savaş fazı öncesi sağlam sürüm).

## 2026-10-28 — Aksiyon MVP: sefer, kahraman, komşu, hedef (Opus 5.5 çekirdek, Sonnet 5.5 UI+denge)
- Çekirdek: `seferler|kahramanlar|komsular|hedefler.js`, `core/sefer|kahraman|komsu|hedef.js`, kayıt v4 (`goc3to4`), ayrı RNG akışları. Avcı/Kaşif, Keşif/Ayı Avı/Harabe, 1 komşu, Ayı destanı + 4 görev kartı. Seferde ölüm yok.
- UI: `src/ui/aksiyon.js` (Seferler penceresi: Sefer/Yolda/Kahraman/Komşu/Hedef), harita işaretleri, 6. gün kahraman teklifi, 🎯 hedef rozeti.
- Denge: `SEFER_SANS` [0,3;1,4], eşikler/ödül çarpanı, zorluklar yükseltildi; r=1 → büyük %35/başarı %30/kısmi %17/başarısız %18. Bot ölçümünde (kahramanlar hep ekipte) büyük başarı ~%49: telefonda gerçek oynanışla ayarlanacak. Seferli bot Göçebe 41/50 hedefte, ayı destanı 43/50.
- Testler 233 (232+1 todo), e2e 292/292. Gerçek cihaz denenmedi.
## 2026-10-28 — Doğum ipucu (Sonnet 5.5)
- Orta Çağ'da nüfus durması: yiyecek şartı (nüfus×2) depo tavanını (300) aşıyordu; ek depo/ambar gerekiyor. `dogumSartlari` yiyecek mesajı tavanı da söyler; İş sekmesi özetine "👶 Doğum yok: …" satırı eklendi. Testler 196 (195+1 todo); derleme/e2e bu ortamda denenmedi (vite yok).

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
