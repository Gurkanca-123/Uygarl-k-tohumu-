# CHANGELOG_DEV (yalnız son kayıtlar; eskiler `docs/CHANGELOG_ARSIV.md`)

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
