# PROJECT_STATE

**Durum:** İskelet kuruldu (aşama 1 başlangıcı). Tasarım belgesi (aşama 0) henüz yazılmadı.

## Teknik
- Vite 5 + Three.js 0.158, tek sayfa, GitHub Pages (`.github/workflows/deploy.yml`, `main`'e push).
- Sıra tabanlı simülasyon. Çekirdek (`src/core`) saf mantık.

## Harita
- `src/core/oyun_durumu.js`: `yeniOyun`, `turIlerlet` (yer tutucu)
- `src/data/caglar.js`: 5 çağ tablosu (yer tutucu)
- `src/render/sahne.js`: izometrik ortografik sahne, yer tutucu zemin
- `src/ui`, `src/world`, `src/save`: boş
- `tests/cekirdek.test.js`: 2 test

## Bilinen eksikler
- Kaynak, bina, olay, kayıt, arayüz henüz yok.
