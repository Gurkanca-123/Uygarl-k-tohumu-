# CHANGELOG_DEV (yalnız son kayıtlar; eskiler `docs/CHANGELOG_ARSIV.md`)

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
