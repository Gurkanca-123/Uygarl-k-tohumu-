# PROJECT_STATE

**Durum:** İskelet kuruldu. Tasarım belgesi (aşama 0) `docs/TASARIM.md` yazıldı (taslak; 5 açık soru kullanıcıda, bkz. §11). Sıradaki: aşama 1 (veri şeması + durum nesnesi, §10).

## Tasarım özeti
- 1 tur = 1 gün, mevsim = 5 gün, yıl = 20 gün. Önder eylemi (1/tur), yorgunluk 0–6.
- 12 kaynak + BP, 25 buluş, çağ süreleri hedefi ~25/40/60/80/100 tur. Çevrimdışı birikim yok ("Mevsim sonuna ilerlet").
- MVP: Göçebe→Taş Devri (5 kaynak, 10 bina, 5 buluş, 10 olay).

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
