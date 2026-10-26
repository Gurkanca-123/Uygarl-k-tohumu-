# CHANGELOG_DEV (yalnız son kayıtlar; eskiler `docs/CHANGELOG_ARSIV.md`)

## 2026-10-26 — Boştakileri otomatik ata (Sonnet 5.5)
- `isOtoAta` (src/core/nufus.js): boştaki kişileri inşa sırasıyla kurulu, hasarsız binaların boş yuvalarına doldurur; serbest işlere dokunmaz. İş sekmesinde "⚡ Boştakileri otomatik ata" düğmesi. Test eklendi (174). `npm run build` denenmedi.
- Sağ panel genişliği min(38vw,320px), iş satırları kompakt: kişi kartları haritanın ortasını daha az kaplıyor. 844x390 ekran görüntüsüyle bakıldı; gerçek cihaz denenmedi.

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
