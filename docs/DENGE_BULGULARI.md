# Denge bulguları (2026-10-30) — YALNIZ ÖLÇÜM; hiçbir sayı değiştirilmedi

Kaynak: `src/data/*.js` okuması + `tests/yardimci/uzun_sim.js` (tüm çağlar botu) + `turIlerlet` mikro ölçümü. Kullanıcı onayı olmadan denge değişmez.

## Ölçümler
- **Kararlılık:** yeni oyun 4 tohum × 1000 gün, her çağ başlangıç köyü 3 tohum × 500 gün (barışçıl) ve kısa normal-zorluk koşuları: **0 değişmez ihlali**
  (negatif/NaN stok, depo tavanı aşımı, atama>nüfus, kopuk kuyruk, yetim evrim kaydı yok). Nüfus çökmedi (min nüfus her koşuda başlangıcın altına inmedi).
- **Süre (Node, masaüstü):** `turIlerlet` Göçebe 3,3 ms · Bronz 3,5 · Antik 5,1 · Orta Çağ (90 kişi, 40 bina) 5,4 ms/tur. Telefonda 3–5× yavaş varsayılsa
  tur başına <30 ms: sıra tabanlı oyun için sorun yok. Bellek: 1000 günde yığın ≈ 10–50 MB, artan eğilim yok.
- Bot ilerleme için OPTİMİZE edilmedi: Göçebe'de çoğu tohum kalabalık/ısınma yüzünden takılıyor. Aşağıdaki "bot" kaynaklı gözlemler oyun hatası sayılmaz.

## Bulgular (öncelik sırasıyla)
1. **Seviye yükseltmesi işçi başına verim vermiyor.** `SEVIYE_ISCI_EK [0,1,2]` ile `SEVIYE_CARPAN [1,1.5,2]`: 2 işçili binada Sv2 = 3 işçi × … = aynı kişi başı verim;
   1 işçili binada (Ağıl) kişi başı verim DÜŞER. Maliyet kümülatif 4× taban. Nüfus darboğaz olduğundan yükseltme zayıf; yalnız arsa kazandırır. → Evrim (%70) bunu dengeledi
   ama Sv yükseltmesi hâlâ zayıf. Öneri: Sv2/Sv3 maliyetini düşür **ya da** Sv işçi eki yerine doğrudan verim çarpanı ver.
2. **Taş Ocağı serbest Taşçı'dan üstün değil** (1,5/işçi, bitişiklik bonusu yok; Taş Yontma ile serbest taşçı da 1,5). Öneri: Taş Ocağı'na `karo:tasli` bitişiklik bonusu (+%25, max 2).
3. **Alet Yapımcısı Bronz'dan sonra fazlalık:** 2 taş + 1 odun → 1 alet; Demirci 1 metal + 1 odun → 2 alet. → Evrim zincirine alındı (`alet_yapimcisi → demirci`).
4. **Çadır kışlık ısınması pahalı:** kişi başı 0,33 odun/tur (Kulübe 0,125, Kerpiç 0,10, Taş Ev 0,083, Yarı Ahşap 0,125). 17 Çadırlı köy kışta 17 odun/tur yakar;
   serbest Oduncu 1/işçi → odun birikmiyor, çağ geçişi (25 odun) takılıyor. Evrim bunu hafifletir; denge değişikliği gerekmez, ama öğreticide anlatılmalı.
5. **Yiyecek bozulması (%4/tur) geçiş maliyetini kilitleyebilir:** denge noktası = fazla/0,04. Bronz geçişi 120 yiyecek ister; günlük fazla +3,4 ise stok 84'te sabitlenir
   (botta gözlendi). Oyuncu ≥ +4,8/tur fazla ya da bozulma azaltan depo (Kurutma Rafı/Erzak/Ambar) kurmalı. Öneri: geçiş ekranında "birikmesi imkânsız" uyarısı ya da geçiş maliyetinden yiyeceği kaldırmak.
6. **Konut maliyeti üstel:** n'inci aynı tür konut taban × 1,10^(n−1). 15. Taş Ev ≈ 3,8× (≈57 taş). Çağ geçişi 15 Taş Ev ister → son evler çok pahalı; yeni tür konuta evrim bunu aşar.
7. **Çağ geçiş nüfusu doğum hızına bağlı** (<30 kişide tek doğum / 3–4 tur): Göçebe→Taş en az 20 tur, Taş→Bronz ≈ 64 tur (hedef 40/60). Geç çağlarda darboğaz kaynak (Katedral 300 taş…).
8. **BP kullanılmayabiliyor:** mevcut çağın tüm buluşları bitince bilgi havuzu birikir (Orta Çağ botunda ≈4300 BP). Oyuncu için çağ ilerleyince sorun olmaz; serbest kipte BP kullanım alanı yok.
9. **Kalabalık cezası:** nüfus kalabalık eşiğini (Göçebe 10, Taş 22) aştıkça huzur −1/kişi. Konutu çağ geçişinden fazla büyüten oyuncu huzur tuzağına düşer (bot gözlemi: huzur ≈ 6, üretim ×0,7, göç).

## Bu görevde bilinçli yapılmayanlar (onay gerekli)
- Çiftlik → "Gelişmiş Çiftlik": tabloda böyle bir bina yok → uydurulmadı. Bunun yerine veriye dayalı **Sulanan Tarla → Çiftlik** (2×2 → 3×3, yer uygunsa) eklendi.
- Bireysel vatandaş / hane / yaş sistemi: `nufus` tek sayı, `atama` sayaç; kökten model değişikliği → ayrı onaylı tasarım.
- Gerçek zamanlı akış: kullanıcı kararıyla sıra tabanlı kalıyor.
