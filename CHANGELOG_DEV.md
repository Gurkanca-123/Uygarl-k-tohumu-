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

## 2026-10-26 — Aşama 2: simülasyon çekirdeği
- `src/core/`: `turIlerlet` §1.2 a–o (tur.js birleştirici; eylem, insa, uretim, tuketim, nufus, huzur, arastirma, olay, cag, sonuc,
  savunma, yardimci). Saf, tohumlu RNG; dönüş `{ durum, bildirimler, hata? }`. Adım p çekirdek dışında: `kayit.js` `turIlerletVeKaydet`.
- Komutlar (`komutlar.js`): isAta, insaEt, yukselt, onar, yik, arastirmaSec, onderEylemiSec, olayCoz, cagAtla, vergiAyarla, takasYap,
  mevsimSonunaIlerlet. Geçersiz komut durumu değiştirmez, Türkçe hata. Bekleyen olay diğer komutları kilitler.
- Kullanıcı kararları belgeye işlendi: doğum huzur eşiği 40 (§7.3.7), `ILK_OLAY_TUR` = 6 net tanımı (§6.2: gösterim günü, gün 1–5
  olaysız). §1.2 p notu. `denge.js`: `ATOLYE_GURULTU_CAG`, `YOL_CAG`, `KESIF_BONUS_TOPLANIR`. Şema: `onder.secim`.
- Testler: 118 (117 geçti + 1 `todo` = §9 kabul ölçütü, denge aşama 7). `npm run build` geçti.
- Bot (50 tohum): 50/50 bitirir, tur 30/33/46 (min/ortanca/max), 20–32 aralığında 24/50, en düşük nüfus 3. Sayı değiştirilmedi.
- Yapan: Opus 5.5.
