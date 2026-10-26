# Uygarlık Tohumu — Claude çalışma protokolü (kalıcı)

Çadırdan Orta Çağ'a, sıra tabanlı (gerçek zamanlı DEĞİL) şehir kurma simülasyonu. Three.js, yatay telefon, 5 çağ.
Kısa teknik hafıza: `PROJECT_STATE.md` · ayrıntılı harita (isteğe bağlı): `docs/MIMARI.md` · kayıtlar: `CHANGELOG_DEV.md` · tasarım: `docs/TASARIM.md` · model planı: `docs/MODEL_PLANI.md`.

## Her görevde iş akışı
1. `PROJECT_STATE.md`'yi oku. Yalnız görev gerektirirse `docs/TASARIM.md`'nin ilgili bölümünü oku.
2. Görevi daralt: hangi katman etkileniyor? (core / data / world / render / ui / save)
3. `grep -n` ile ilgili sembolleri bul; yalnız gereken aralığı oku.
4. Küçük, hedefli değişiklik yap. Mimariyi koru.
5. Yalnız etkilenen davranışı doğrula (`npm test`, gerekirse `npm run build`).
6. `CHANGELOG_DEV.md`'ye kısa kayıt ekle (hangi model ne yaptı dahil); mimari/kısıt değiştiyse `PROJECT_STATE.md`'yi güncelle.

## Mimari kuralları
- `src/core/` simülasyon çekirdeğidir: saf mantık, **DOM ve Three.js import etmez**. Durum değişmez (immutable) güncellenir; testlenebilir olmalı.
- `src/data/` tablolar (çağlar, binalar, kaynaklar, olaylar). Denge/içerik değişikliği burada yapılır, kodda değil.
- `src/render/` ve `src/ui/` çekirdeği yalnız okur; durumu değiştirmek için çekirdek fonksiyonlarını çağırır.
- `src/save/` kayıt: sürüm numaralı, alan beyaz listeli; mevcut alanları silme, yeni alanda doğrula.
- Her çekirdek özelliği `tests/` altında test ister.

## Kurallar
- Tüm oyun metinleri Türkçe ("item" değil "eşya"). Kullanıcıya Türkçe yanıt ver.
- Dokunmatik, yatay ekran öncelikli arayüz. Oyun sıra tabanlı: tur = gün/mevsim.
- Three.js 0.158 sabit; yeni harici kütüphane eklemeden önce kullanıcıya haber ver.
- Görev kapsamı dışını okuma; gereksiz refaktör yapma.
- Gerçekleştirilmemiş işlemi (test, push, doğrulama) yapılmış gibi bildirme; denenmeyeni "denenmedi" yaz.
- Model seçimi `docs/MODEL_PLANI.md`'ye göre; alt görev başlatırken model orada yazana göre verilir.
- `main` doğrudan değişirse önce yedek dal: `yedek/<iş>-oncesi`.

## Komutlar
`npm install` · `npm run dev` · `npm test` · `npm run build`

## Token / verimlilik kuralları (kalıcı)
- Okuma sırası: `CLAUDE.md` → `PROJECT_STATE.md`. `docs/MIMARI.md` ve `docs/TASARIM.md`'yi **baştan sona okuma**: önce
  `grep -n "^## " docs/TASARIM.md` ile bölüm satırlarını bul, yalnız gereken bölümü `sed -n 'A,Bp'` ile oku.
  Bölümler: §1 tur akışı · §2 kaynak/nüfus · §3 ızgara/bina · §4 çağlar · §5 buluşlar · §6 olaylar · §7 denge · §8 kayıt · §9 MVP · §10 şema.
- `src/data/*.js` tablolarını bütün okuma; `grep -n "id: 'x'"` ile ilgili girdiyi bul. `src/core` modüllerinden yalnız görevle ilgili olanı aç
  (modül haritası `PROJECT_STATE.md` / `docs/MIMARI.md`).
- Çıktıyı kıs: testler `npm test 2>&1 | grep -E "^# (tests|pass|fail|todo)|not ok"`; derleme `| tail -2`.
- Alt görev (Agent) isteminde: yalnız ilgili dosyaları ve bölümleri adıyla say; "tüm projeyi oku" deme; rapor istenen uzunlukta (≤25 satır) olsun.
- Aynı doğrulamayı tekrarlama: ajan testleri geçtiğini bildirdiyse koordinatör yalnız bir kez özet doğrulama yapar.
- Her görev sonunda `PROJECT_STATE.md`'yi **kısa** tut (≤ ~45 satır); ayrıntıyı `docs/MIMARI.md`'ye taşı; `CHANGELOG_DEV.md`'de son ~5 kayıt kalsın, eskiler arşive.
- Model seçimi: büyük kod/tasarım kararı Opus; arayüz/çizim/içerik Sonnet; toplu metin Haiku (`docs/MODEL_PLANI.md`).
- Tasarım/görsel işlerde alt ajana ROL ver: "kıdemli oyun tasarımcısı / sanat yönetmeni"; kendi çıktısını eleştirip en az 3 tur iyileştirsin. Kullanıcı kodla (Three.js) çok yüksek kalite bekliyor; "yeterince iyi"yle yetinme.
