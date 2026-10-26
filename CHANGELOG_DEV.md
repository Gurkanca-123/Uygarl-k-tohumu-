# CHANGELOG_DEV

## 2026-10-26 — İskelet
- Depo yapısı, Vite+Three.js kurulumu, Pages iş akışı, `CLAUDE.md`, `docs/MODEL_PLANI.md`, yer tutucu çekirdek ve test.
- Yapan: Sonnet 5.5 (koordinasyon).

## 2026-10-26 — Tasarım belgesi (aşama 0)
- `docs/TASARIM.md` yazıldı (tur akışı, kaynaklar, binalar, 5 çağ, buluşlar, olaylar, denge, kayıt, MVP, veri şeması).
- Yapan: Opus 5.5 (Fable kullanım kredisi yetersiz olduğu için Fable yerine). Sayılar elle kontrol edildi, simülasyonla doğrulanmadı.

## 2026-10-26 — Aşama 1: veri katmanı ve durum nesnesi iskeleti
- `src/data/`: kaynaklar, karolar, binalar (5 merkez + 49), buluslar (25), olaylar (21), eylemler (8), mevsimler, denge, caglar (5 çağ tam,
  konut = bina id), `index.js`, `dogrula.js` (çapraz başvuru, döngü, çağ sırası, olay seçenek kuralları). Sayılar TASARIM §4–§7'den birebir;
  belirsizler `TODO(tasarim)`.
- `src/core/`: `durum.js` (şema = beyaz liste, `suz`), `rng.js` (saf mulberry32), `takvim.js`; `yeniOyun(tohum)` §7.4 alanlarıyla;
  `turIlerlet` yalnız `tur + 1` (mevsim/yıl `takvim`dan türetilir).
- `src/save/kayit.js`: sürüm numaralı, beyaz listeli serialize/yukle, göç zinciri, enjekte depo, `:bozuk` yedeği; RNG durumu kayıtta.
- `docs/TASARIM.md` §11: 5 açık soru cevaplandı (kullanıcı varsayılanları onayladı).
- Testler: 36/36 geçti (`npm test`); `npm run build` geçti.
- Yapan: Opus 5.5.
