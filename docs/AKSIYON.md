# Aksiyon ve Derinlik — Sefer, Kahraman, Komşu, Hedef (tasarım taslağı, 2026-10-26)

Durum: **TASLAK — kullanıcı onayı bekliyor (§10).** Bağlı belgeler: `TEHDIT.md` (§1 ilkeler, §5 kararlar, §7 komşu kancaları),
`TASARIM.md` §1 tur akışı, §4 çağlar, §7 denge. `ÖNERİ` = kullanıcı kararı bekleyen tasarımcı önerisi; uygulayıcı varsayılan
olarak bunu kullanır. Sayılar Normal zorluk içindir; kaynak ödülleri `× (1 + 0,5 × çağSırası)` ile ölçeklenir (önder eylemleriyle aynı).
Değişmeyen ilkeler: sıra tabanlı · hızlı tempo (hiçbir inşaat/bekleme süresi uzamaz) · dokunmatik yatay · yenilgi yok, `NUFUS_MIN 2`,
kayıp kilidi · tohumlu determinizm · çağ listesi açık uçlu (çağ **sırası** ile karşılaştırma).

---

## 1. Teşhis ve tasarım hedefleri

### 1.1 Neden düz akış? (1 saatlik oyun geri bildirimi)
1. **Tek amaç:** çağ geçiş şartları bir kontrol listesi; her karar "listeyi en hızlı nasıl doldururum" optimizasyonuna iniyor.
2. **Dış dünya yok:** harita yalnız kaynak karosu + sis; köyün dışında yapılacak, gidilecek, kaybedilecek bir şey yok.
3. **Kayıp/risk yok denecek kadar az:** olaylar kısa ve rastgele; tehdit motoru yeni ve tek boyutlu (savun/haraç/saklan).
4. **Tekrarlayan önder eylemi:** Avlan/Keşfet/Dinlen döngüsü; nüfus "isimsiz işçi" olduğu için bağ kurulmuyor.
5. **Ritim yok:** her mevsim aynı hissediyor; gerilim (kış, tehdit) ile ödül anı (ganimet, keşif) belirgin değil.

### 1.2 Hedefler
- **Her mevsim en az 2 ilginç karar:** (a) ekip gönder mi, köyü savunmasız mı bırak? (b) hangi hedef (av/define/kamp/komşu)?
  (c) kahramanı seferde mi, köyde usta/bekçi olarak mı kullan? (d) komşuya hediye mi, haraç mı, baskın mı?
- **Risk/ödül görünür:** sefer göndermeden önce beklenen sonuç yüzdelerle gösterilir (tehditteki "🛡/⚔" ilkesiyle aynı).
- **Ritim "hazırlık → olay → toparlanma":** mevsim döngüsüne bağlanır (§1.3); tehdit motoru zaten bu ritimde.
- **Aksiyon/sakin denge:** her ~10 turda 1 "yüksek an" (tehdit varışı, sefer dönüşü, komşu kararı), arada 3–5 sakin kurma turu.
- **Barışçıl yol da güçlü:** keşif, ticaret, kültür ile de aynı hızda ilerlenir; savaş bir seçenek, zorunluluk değil.

### 1.3 Mevsim ritmi (ÖNERİ; sayılar §2–§4'te)
| Mevsim | Aksiyon | Sefer çarpanı | Tehdit (TEHDIT §3.1) |
|---|---|---|---|
| Bahar | yeni işaretler (2), mevsim görevi seçimi, komşu niyeti | süre normal, ödül ×1 | gerginlik düşük |
| Yaz | sefer en verimli; ticaret | ödül ×1,2 | artış normal |
| Güz | hasat, kışa hazırlık; av ödülü ×1,25 | normal | gerginlik yükselir |
| Kış | iç işler + tehdit varışı | süre +1, erzak ×1,5, zorluk +1 | ilk tehdit çoğunlukla kışta |

---

## 2. SEFER SİSTEMİ

### 2.1 Kavram
Köyden bir **ekip** (kahraman(lar) + işçi + isteğe bağlı önder) haritadaki bir **hedefe** (işaret) 2–4 tur gönderilir. Ekip o süre
üretmez ve savunmaya katılmaz (köydeki asıl bedel). Dönüşte sonuç bildirimi + ödül; yolda %25 olasılıkla 1 **sefer olayı** (seçimli,
mevcut olay sistemi, `tur:'sefer'`, olay kotasına sayılır).

### 2.2 Ekip ve güç
```
ekipGuc = Σ işçi × 1 (Taş+: alet taşıyan işçi 1,5; ekip başına en çok 2 alet)
        + önder 2 (+1 Mızrak Ucu)
        + Σ kahraman (sınıfTaban + seviye) × sınıf/hedef çarpanı (§3.2)
        + Σ eşya bonusu
oran r  = ekipGuc / hedefZorluk ;  şanslı oran r' = r × (0,85 + 0,3 × u),  u = sefer.rng
```
| r' | Sonuç | Ödül | Yaralı | XP |
|---|---|---|---|---|
| ≥ 1,25 | Büyük başarı | ×1,5 + nadir eşya şansı ×2 | yok | ×1,5 |
| 1,0–1,25 | Başarı | ×1 | yok | ×1 |
| 0,6–1,0 | Kısmi | ×0,5 | 1 işçi (3 tur) | ×0,5 |
| < 0,6 | Başarısız | yok (erzak gider) | 1–2 işçi + kahraman (4 tur) | ×0,25 |
- Arayüz bu dört sonucun olasılığını u dağılımından **kesin** hesaplar ve çubukla gösterir ("Başarı %70 · Kısmi %30").
- **Erzak:** ekip kişi sayısı × süre × 1 yiyecek, gönderirken düşer (seferdeki kişi köyde yemek yemez → net maliyet ≈ 0, ama peşin).
- **Kurallar:** köyde en az 2 kişi kalmalı (`nufus − ekip ≥ 2`, hata: "Köyde en az iki kişi kalmalı"); en çok 1 aktif sefer
  (Bronz+ 2, Orta+ 3); bekleyen olay varken gönderilemez. İlk tur içinde `seferGeriCagir` → erzakın yarısı iade, sonuç yok.
- **Önder katılırsa** sefer süresince önder eylemi "Seferde" (otomatik), yorgunluk +1/tur; köy savunmasından önder çıkar.

### 2.3 Haritada hedefler (işaretler)
- `isaretler: [{ uid, tur, x, y, kalan, zorluk, gizli }]`, en çok 3 (Bronz+ 4). Yalnız keşifli karoda; render karo üstünde simge
  (🐾 iz, 🐻 ayı, 🐑 sürü, 🏚 harabe, ⛺ yabancı ateş, 🌲 uzak orman/ocak). Dokununca **Sefer penceresi**.
- **Doğuş:** her Bahar ve Güz başında 1 (Kaşif varsa 2); Keşfet eyleminde %30 (Kaşif ile %55) ek işaret; tehdit işaretleri (§7).
- **Süre (mesafeden):** merkezden Manhattan ≤ 8 → 2 tur · ≤ 16 → 3 · > 16 → 4 (Kaşif "Yol Bilgisi" −1, en az 2; kış +1).
- **Kaybolma:** `kalan` 8 tur (ayı 6). Kaybolan ayı işareti → `ayi` tehdidinin doğma ağırlığı ×3 ve gerginlik +15 (§7).

### 2.4 Sefer türleri
Zorluk değerleri çağ sırasına göre (Göç · Taş · Bronz · Antik · Orta). Ödül tabanı × ölçek × sonuç çarpanı.
| id | Ad | Açılış | Zorluk | Taban ödül | Özel |
|---|---|---|---|---|---|
| `kesif` ✱ | Keşif Seferi | Göçebe | 2 · 3 · 5 · 8 · 12 | sis yarıçap 8 açılır, +3 BP, %40 yeni işaret, %20 kaynak (6 odun/4 taş) | başarısızlıkta yalnız yaralı yok, ödül yok; komşu bulma (Taş+) |
| `ayi_avi` ✱ | Ayı Avı | Göçebe (🐻 işaret) | 4 · 6 · 9 · — · — | 12 yiyecek, 4 deri; büyük başarıda **Ayı Postu** eşyası | Avcı çarpanı ×1,5; başarıda `ayi` tehdidi iptal |
| `kurt_avi` | Kurt Avı | Göçebe (🐾, kurt tehdidi uyarısı) | 3 · 5 · — · — · — | 6 yiyecek, 2 deri, gerginlik −20 | aktif `kurt_surusu` uyarısında hedef = tehdit: başarı → tehdit biter + ganimet |
| `harabe` ✱ | Eski Harabe (define) | Göçebe | 3 · 5 · 8 · 12 · 18 | 4 BP + rastgele: %40 eşya, %30 kaynak paketi (Taş: 4 alet), %15 **gezgin katılır** (+1 nüfus kahraman), %15 tuzak (yaralı) | tek seferlik; ilk harabe tuzaksız |
| `koyun` | Sürü Evcilleştirme | Taş (Evcilleştirme; 🐑) | — · 4 · 6 · — · — | `suru +1` (Ağıl başına üretim +0,5 yiyecek +0,25 deri, en çok Ağıl × 2 sürü) | Avcı ×1,25; başarısızlıkta sürü kaçar, yaralı yok |
| `uzak_kamp` | Uzak Kaynak Kampı | Taş | — · 4 · 7 · 10 · 15 | süre boyunca her tur 4 odun ya da 3 taş (Bronz+: 2 cevher, Antik: 2 mermer), dönüşte toplanır | süre 3–4 sabit; ekip ≥2 işçi; kış kapalı |
| `ticaret` | Ticaret Kervanı | Taş (komşu bulunduysa) | — · 3 · 5 · 8 · 12 | götürülen 10–20 birim → ilişki oranıyla geri: dost ×1,3, nötr ×1,0, soğuk ×0,7 başka kaynak; ilişki +5 | haydut riski Bronz+ (`yagma` tehdidine bağlı) |
| `elci` | Elçi Heyeti | Taş (komşu) | komşu soğukluğu | hediye `guc × 2` yiyecek (Antik+: sikke); başarı ilişki +15 | TEHDIT §5.1 Elçi Gönder'in sefer biçimi (aktif tehdidi bitirebilir) |
| `baskin_seferi` | Baskın Seferi | Bronz (komşu; §5 karar) | komşu gücü | ganimet = komşu stoku %20 (`guc × 3` tavan), ilişki −30 | karşı saldırı = bu sefer; Barışçıl'da kapalı |
| `kahraman_arayisi` | Usta Arayışı | Bronz | 6 · 9 · 14 (çağa göre) | yeni sınıf kahramanı (§3.4) | çağ başına 1 |

✱ = MVP. Sanayi/Modern: `kesif` → "Bilim Gezisi", `uzak_kamp` → "Maden Ruhsatı", `ticaret` → "Demiryolu Seferi" (yalnız veri satırı).

### 2.5 Sefer olayları (yolda, %25, örnekler)
"Nehir taştı" (bekle +1 tur / geç: %30 yaralı) · "Yaralı yabancı" (yardım et: −3 yiyecek, %50 gezgin katılır / geç) ·
"Ayı yavruları" (bırak: huzur +3 / götür: Ağıl varsa sürü +1, yoksa +4 yiyecek) · "İkinci iz" (devam: süre +1, ödül ×1,3 / dön).
Seçimin sonucu `sefer.aktif.olayEtki`'ye yazılır, dönüşte uygulanır (köyde anlık etki yok).

---

## 3. KAHRAMANLAR

### 3.1 Temel kurallar
- Kahraman, nüfustan **adı ve portresi olan** bir kişidir: nüfusa sayılır, yiyecek yer, konut kullanır, işçi yuvasına girmez.
- Köydeyken bir **görev yeri** seçilir (ücretsiz değiştirme): `usta` (bir binaya: üretim +%25, en çok 1 kahraman/bina) · `bekci`
  (savunma = sınıfSavunma + seviye) · `danisman` (sınıf yeteneği; ör. Şaman +0,5 BP). Seferdeyse hiçbiri işlemez.
- Tavan: Göçebe 1 · Taş 2 · Bronz 3 · Antik 4 · Orta 5 (Sanayi 6). Ad havuzu Türkçe (Tuna, Alp, Ece, Bilge, Kaya, Aybars, Umay, Toygar…);
  portre = sınıf rengi + 6 yüz/saç parçasından prosedürel (`onizleme.js` benzeri dataURL; ileride Tripo/görsel).
- **Seviye 1–5**, XP eşikleri 0 / 10 / 25 / 45 / 70. XP: sefer `zorluk × 2 × sonuç çarpanı`; tehdit püskürtmede köydeki bekçi
  kahraman `guc`; mevsim görevi +5. Her seviye: güç +1 (tabloya dahil), Sv3 ve Sv5'te yetenek açılır.

### 3.2 Sınıflar
| Sınıf | Çağ | Taban güç / köy savunması | Sv1 (pasif) | Sv3 | Sv5 (ustalık) |
|---|---|---|---|---|---|
| **Avcı** ✱ | Göçebe | 2 / 1 | İz Sürme: av/sürü seferinde ×1,5 | Pusu: av seferinde yaralanma yok | Usta Avcı: av ödülü +%50, ayı işareti ×2 doğar |
| **Kaşif** ✱ | Göçebe | 1 / 0 | Yol Bilgisi: sefer süresi −1 (en az 2) | Keskin Göz: işaret doğuşu +1, keşif yarıçapı +3; köyde danışman → tehdit gücü kesin | Haritacı: harabe tuzağı yok, her keşifte işaret |
| **Şaman** | Taş | 1 / 1 | Şifa: köydeki yaralı süreleri −2 | Ruh Danışma: mevsimde 1 kez olay seçeneklerinin sonucunu açık gösterir | Ata Ruhu: huzur +5, kötü olay ağırlığı ×0,8 |
| **Savaşçı** | Taş | 3 / 3 | Kalkan: bekçi iken savunma ×1,5 | Öncü: kurt/baskın/elçi-dışı seferde ekip ×1,2 | Nara: püskürtme ganimeti +%50, gerginlik −10 |
| **Zanaatkâr** | Bronz | 1 / 1 | Usta Eli: usta olduğu atölyede +%50 (diğerleri +%25) | Eşya Yap: 3 tur, tarif tüketir (§3.3) | Onarımcı: onarım bedava, hasar süresi 0 |
| **Tüccar** | Bronz | 1 / 0 | Pazarlık: takas/kervan oranı +%20 | Kervan Başı: kervan yağma riski yarıya, 2 kervan | Elçi Dili: tüm komşularla ilişki +2/mevsim |
| **Komutan** | Orta | 4 / 5 | Düzen: ekip gücü +%20 | Kuşatma Bilgisi: `kusatma` tehdit gücü −%15 | Sancak: 2 kahramanlı seferde +%30 |
| *Mühendis / Bilim İnsanı* | Sanayi / Modern | — | açık uçlu (yalnız veri satırı) | | |

### 3.3 Eşya (ilk kez "eşya" terimi; "item" kullanılmaz)
- Kahraman başına 3 yuva: **silah**, **giysi**, **tılsım**. Köy sandığı en çok 8 eşya. Eşya tak/çıkar ücretsiz (seferde değilken).
- Eşya yaralanma ya da başarısız seferde **kaybolmaz** (hayal kırıklığı sarmalı yok).
| id | Ad | Yuva | Etki | Kaynak |
|---|---|---|---|---|
| `tas_mizrak` | Taş Mızrak | silah | güç +1 | tarif (Taş): 2 alet + 1 deri, Alet Yapımcısı |
| `ayi_postu` | Ayı Postu | giysi | güç +1, kış sefer cezası yok | Ayı Avı büyük başarı / Ayı zinciri |
| `kurt_disi` | Kurt Dişi Kolye | tılsım | XP +%25 | Kurt Avı başarı %30 |
| `eski_harita` | Eski Harita | tılsım | sefer süresi −1 | harabe |
| `sifali_ot` | Şifalı Ot Kesesi | tılsım | ekipte yaralı yok (1 kez, sonra tükenir) | harabe / Şaman |
| `bronz_kilic` | Bronz Kılıç | silah | güç +3 | tarif (Bronz): 3 metal, Zanaatkâr |
| `deri_zirh` / `zincir_zirh` | Deri Zırh / Zincir Zırh | giysi | güç +1 / +3, yaralı süresi −1 / −2 | tarif Taş / Orta |
| `ata_totemi` | Ata Totemi | tılsım | köyde danışmanken huzur +3 | olay zinciri ödülü |

### 3.4 Kahraman edinme
1. **İlk kahraman (MVP):** gün 6 (`ILK_OLAY_TUR`) garanti olay "Ateş Başında Bir Ses": bir kişi öne çıkar → **Avcı** ya da **Kaşif** seç.
2. **Ateş Yemini** (komut `kahramanCagir`, merkez binada): seçilen çağ sınıfından, bir kişi kahramana terfi; maliyet Göçebe
   10 yiyecek + 3 deri · Taş 15 yiyecek + 4 alet · Bronz 10 metal · Antik 30 sikke · Orta 40 sikke + 5 kumaş; çağ başına 1 kez.
3. **Gezgin katılır** (harabe %15, sefer olayı, Yabancı Aile olayına yeni seçenek): +1 nüfus, rastgele açık sınıf, Sv1–2.
4. **Usta Arayışı** seferi (Bronz+): bir sonraki çağın sınıfını erken getirir.
5. Tavan doluyken yeni kahraman gelirse: biri "emekli" edilir (sıradan işçiye döner, eşyaları sandığa).

### 3.5 Yaralanma (ölüm yok)
- Kahraman ölmez. Yaralı: 4 tur (başarısız sefer), ağır yaralı: 8 tur (tehdit yenilgisinde bekçi kahraman). Yaralıyken görev yeri
  ve sefer yok. Şifacı Çadırı ×0,5, Şaman −2 tur (birlikte en az 1 tur).
- Ekipteki **işçiler** yalnız yaralanır (TEHDIT'teki `yarali` mekanizması, 3 tur); seferde ölüm yok — tüm zorluklarda (ÖNERİ).
  Böylece sefer kayıp kilidine hiç girmez; ölüm yalnız tehdit sisteminde (Taş+, kilitli) kalır.

---

## 4. KOMŞU KÖY/ÜLKELER

### 4.1 Seçenekler
| | İçerik | Tempo | UI işi | Denge riski |
|---|---|---|---|---|
| **A** (bugün) | soyut tehdit kaynağı + ilişki puanı | en hızlı | yok | düşük; ama "yüzsüz" |
| **B** | keşifle bulunan 1–3 komşu yerleşim (harita karosu), ilişki, mevsimlik niyet, ticaret/elçi/haraç/baskın = sefer türü | hızlı (karar mevsimde 1) | komşu paneli + karo simgesi | orta |
| **C** | birden çok ülke, antlaşmalar, ordu hareketi, toprak/sınır, savaş ilanı | yavaş (her tur hamle) | harita katmanı + diplomasi ekranı | yüksek |

**ÖNERİ: B.** Komşu seferlere doğal hedef, tehdide yüz/neden verir, kararlar mevsim başına toplanır (hızlı tempo). A'nın alanları
(`tehdit.iliski`) göçsüz taşınır. C yalnız Sanayi/Modern kararıyla ve B oynandıktan sonra değerlendirilir.

### 4.2 B'nin kuralları
- **Bulunma:** Taş Devri'nde ilk `kesif` seferi başarısında ya da keşifli alan ≥ %25 olunca 1. komşu (garanti, MVP); Bronz'da 2., Antik'te 3.
  Konum: merkezden 14–22 karo, keşif sisi altında üretilmiş karo (`komsuYerlestir`, tohumlu); haritada ⛺/🏘 simgesi.
- **Komşu kartı:** ad (Kuzey Kurt Boyu, Irmak Halkı, Kızıl Kaya Beyliği…), `mizac` (`baris` · `tuccar` · `saldirgan`, tohumlu),
  `cag` (oyuncu çağına `gecikme` 12 tur arkadan yetişir; "Irmak Halkı Bronz Çağı'na geçti" bildirimi), `guc`, `iliski` −100…+100, `durum`.
- **Güç:** `komsuGuc = ceil(cag(komsu).saldiriTaban × mizac.guc × (1 + 0,02 × komşuÇağİçiTur))`; mizaç.guc baris 0,8 · tuccar 0,9 · saldirgan 1,2.
- **İlişki değişimi:** hediye/elçi +10…15 · ticaret seferi +5 · haraç ödeme +3 · tehdit püskürtme −5 · baskın seferi −30 ·
  doğal kayma her mevsim 0'a doğru 2 · Tüccar Sv5 +2/mevsim. Etiketler: Düşman ≤−50 · Soğuk ≤−20 · Nötr · Dost ≥30 · Müttefik (ittifak).
- **Durumlar:** `bagimsiz` · `ittifak` (Bronz+, ilişki ≥60, karşılıklı: tehdit varışında komşudan savunma +`ceil(guc × 0,3)`;
  komşuya baskın gelirse yardım isteği olayı) · `haracci` (komşu oyuncuya öder; baskın seferi 2 büyük başarı ya da ilişki ≤ −50
  iken üstün güçle "boyun eğdir"; her mevsim `guc` yiyecek/sikke, ilişki −2/mevsim; ilişki ≤ −70 → isyan = baskın tehdidi) ·
  `efendi` (oyuncu komşuya haraç öder: haraç seçeneği art arda 2 kez → her mevsim %8 stok; ittifak ya da 1 püskürtme ile biter).

### 4.3 AI davranışı (mevsim başında 1 kez, saf fonksiyon `komsuNiyeti(d, k)`; tohumlu `komsu.rng`)
```
gucOran = komsuGuc / max(1, savunmaHesapla(d))      doluluk = TEHDIT §3.1
1) iliski ≥ 60 ve çağ ≥ Bronz ve ittifak yok      → "ittifak teklifi" (bildirim + panel düğmesi, 2 mevsim geçerli)
2) iliski ≥ 20                                    → "ticaret teklifi": 1 takas satırı (mizac tuccar ×1,2 oran), bu mevsim geçerli
3) mizac saldirgan ve gucOran ≥ 1,2 ve iliski < 20 → "haraç talebi": öde (%10 stok, ilişki +3) / reddet (ilişki −10, gerginlik +20)
4) iliski ≤ −20                                   → tehdit katkısı: `komsu_baskini` ağırlığı ×2, gerginlik artışı ×1,3
5) iliski ≤ −50 ve gucOran ≥ 0,8                  → sonraki tehdit doğumu bu komşudan `komsu_baskini` (kesin)
6) aksi                                           → sessiz (bildirim yok)
```
- Kural sırası sabit; ilk tutan uygulanır; rng yalnız teklif içeriğini (kaynak türü) seçer. Talepler oyunu durdurmaz (çip + panel).
- Komşu tehditleri **yine tehdit motorundan** gelir (tek ağır kriz kuralı, uyarı ≥2 tur); komşu kendi başına saldırı başlatmaz.
- Barışçıl zorlukta 3–5 kapalı (komşular yalnız tüccar/dost davranışı).

---

## 5. SAVAŞ MODELİ

| | (a) Yalnız savunma | (b) Sefer olarak saldırı (hesaplamalı) | (c) Sıra tabanlı mini savaş ekranı |
|---|---|---|---|
| Ne | TEHDIT sistemi; karşı adım yok | `baskin_seferi`: ekip gücü × birlik karşıtlığı ↔ komşu gücü, sonuç tablosu §2.2 | ayrı ekran, 3×5 ızgara, birlikler (mızrak/okçu/süvari/kuşatma) tur tur hareket |
| Karmaşıklık | yok (var) | düşük: tek formül + 1 tablo | yüksek: ayrı oyun modu, AI, animasyon |
| UI | var | sefer penceresine 1 "birlik dağılımı" satırı | yeni ekran, dokunmatik sürükleme, 3D/2D birlik modelleri |
| Denge riski | düşük | orta (ganimet ekonomiyi şişirebilir → tavan) | yüksek (ayrı denge, süre uzar) |
| Tempo | hızlı | hızlı (2–3 tur, arka planda) | yavaş (savaş başına 2–5 dk) |

**ÖNERİ: (b)**, Bronz'dan itibaren hafif **birlik karşıtlığı** ile:
- Ekip işçileri gönderirken tür seçilir (Bronz+): **mızrakçı** (1 alet) · **okçu** (1 odun + 1 deri) · **süvari** (Antik+, Ahır gerekir, 2 yiyecek) · **kuşatma** (Orta, 10 odun; yalnız surlu hedef).
- Komşunun görünür profili (`profil: 'piyade'|'okcu'|'atli'|'surlu'`) mizaçtan; karşıtlık: mızrak > atlı, okçu > piyade, süvari > okçu,
  kuşatma > surlu: uygun birlik ×1,25, ters birlik ×0,8 (ekip ortalaması). Pencere ipucu: "Irmak Halkı okçu; süvari etkili".
- Ganimet tavanı: tek baskında hedef kaynak başına `guc × 3`; aynı komşuya baskın beklemesi 15 tur.
- (c) yalnız kullanıcı isterse ve Orta Çağ+ "Büyük Muharebe" olarak (Kuşatma tehdidinin durduran penceresi) değerlendirilir.

**Barışçıl yol (zafer yolları, ÖNERİ):** zafer sonrası serbest kip aynen; üç eşdeğer zafer:
- **Kültür** (bugünkü): Katedral + nüfus ≥150.
- **Ticaret:** Orta Çağ'da tüm bulunan komşularla ilişki ≥ 60 (ya da ittifak) + toplam 40 ticaret seferi + 500 sikke birikimi.
- **Hâkimiyet:** tüm bulunan komşular `haracci` ya da `ittifak` + Kale.
Barışçıl oyuncu ticaret/elçi seferleriyle aynı XP ve kaynağı kazanır (hedef: bot farkı ≤ %10, §9).

---

## 6. HEDEFLER ve DERİNLİK — 8 somut mekanik

1. **Çağ Destanı** (çağ başına 1 olay zinciri, isteğe bağlı, 3–4 adım, ödül eşsiz eşya + kalıcı küçük bonus + başarım):
   - Göçebe ✱ **"Ayının İzinde":** (1) Keşfet/keşif seferiyle 🐻 işareti bul → (2) Ayı Avı başarı → (3) postu Totem'e sun (komut,
     Totem gerekir) → ödül `ayi_postu` (yoksa), huzur +3 kalıcı, unvan "Ayı Boyu". Kaçırılırsa (işaret kaybolur) zincir 1. adıma döner.
   - Taş **"Kayıp Kabile":** harabe → yabancı ateş → komşu bul → elçi başarı. Bronz **"Bakır Dağı":** uzak kamp ×2 → ilk metal 20.
   - Antik **"Kâhinin Sözü":** 3 farklı sefer türü bir yılda. Orta **"Kara Şövalye":** Komutan Sv3 + baskın/elçi ile tehdit kaynağını sustur.
2. **Mevsim görevleri:** her Bahar/Yaz/Güz başında 3 kart, 1 seçilir (ya da hiçbiri), 5 tur süre. Örnek: "Kışa 25 yiyecek biriktir"
   (ödül 4 deri) · "1 sefer başarıyla tamamla" (+5 XP, 3 BP) · "Tehdidi Haraçsız atlat" (+5 huzur) · "Komşuya hediye götür" (ilişki +5 ek).
   Ödüller küçük (çağ geliri %5–8); amaç yön vermek.
3. **Çağ başı Gelenek** (geri dönülmez, 3'ten 1, çağ atlayınca pencere; hemen seçilmezse 5 tur içinde):
   - Taş: **Avcı Boyu** (av seferi ×1,25, Avcı çağırma bedava) · **Toprak Boyu** (tarım +%10, gerginlik artışı ×0,9) · **Ruh Boyu** (BP +%10, Şaman tavan +1).
   - Bronz: **Savaş Ocağı** (ekip gücü +%10, baskın açılır erken) · **Kervan Yolu** (ticaret oranı +%15) · **Usta Loncası** (eşya tarifleri −%25).
   - Antik: Krallık / Cumhuriyet / Tapınak · Orta: Şövalyelik / Lonca / Manastır (ayrıntı faz 4).
4. **Uzmanlaşma unvanı:** son 20 turda en çok yapılan faaliyet (av, keşif, ticaret, savunma, inşa) → köy unvanı (+%5 o faaliyete); oynanışı ödüllendirir.
5. **Haritada zamanlı hedefler:** işaretlerin `kalan` süresi (8 tur) — "şimdi mi, sonra mı" baskısı.
6. **Kahraman gelişimi + eşya:** isim, seviye, yuvalar; kayıp yok ama yaralı süre gerçek bedel.
7. **Komşu niyeti ve talepler:** mevsim başında 1 karar (teklif/talep), ilişki uzun vadeli strateji.
8. **Başarımlar** (~20, `hedefler.js`, ödülsüz rozet + istatistik): "İlk Kan" (ilk av), "Hiç Haraç Vermedim" (bir çağ), "Beş Sefer", "Kervan Ustası",
   "Ayı Boyu", "Barış Elçisi" (3 dost komşu), "Kışı Kayıpsız Atlattım"…

---

## 7. Etkileşim (TEHDIT ile birleşme; çakışmasız kurallar)

| Bağ | Kural |
|---|---|
| Sefer ↔ savunma | Seferdeki işçi, önder ve kahraman `savunmaHesapla`'ya girmez. Tehdit uyarısı varken sefer penceresi uyarır: "Ekip dönmeden tehdit gelir (2 gün)". Engellemez. |
| `kahramanSavunma` kancası | Köyde `bekci` görevli kahramanların `sınıfSavunma + seviye` (Savaşçı ×1,5) toplamı; `savunmaDokum`'a "Kahraman Alp" kalemi. |
| `onleyiciGorev` | `ayi` tehdidi → `ayi_avi`; `kurt_surusu` → `kurt_avi` (uyarıdayken hedef = tehdit, başarı = tehdit iptal + ganimet; başarısız = tehdit sürer, güç değişmez). |
| `kaynakKonum` | Aktif tehdidin kaynağı komşuysa haritada ⚔ işareti; `elci`/`baskin_seferi` hedefi olur. |
| `karsi` seçeneği | TEHDIT §5.1 karşı saldırı = `baskin_seferi` (aktif tehdidin kaynağına); başarı → tehdit biter, ganimet ×1, ilişki −30. |
| Gerginlik | kurt avı −20; ayı işareti kaybolursa +15; haraç talebini reddetmek +20; baskın seferi başarı −40 (o komşudan). |
| Tek ağır kriz | Sefer dönüşü bir **bildirim**dir (kriz değil). Sefer olayı olay kotasına sayılır; tehdit varış turunda sefer olayı çıkmaz. |
| Ölüm sarmalı | `acTur > 0` ya da huzur < 30 iken sefer gönderilebilir ama işaret doğmaz; toparlanma (TEHDIT §5.3.5) süresince sefer ödülü ×1,2 (geri dönüş yolu). |
| Barışçıl | yırtıcı tehdit + av/keşif/harabe/ticaret/elçi açık; baskın seferi ve haraç talebi kapalı. |
| Kayıp kilidi | Sefer ölüm üretmez (yalnız yaralı) → kilide dokunmaz. Yaralı işçi nüfusta kalır, üretmez. |

---

## 8. Veri şeması, durum, çekirdek, arayüz (yalnız liste)

### 8.1 Veri dosyaları
- `src/data/seferler.js`: `{ id, ad, metin, cagMin, cagMax, isaret: 'ayi'|'iz'|'harabe'|'suru'|'ates'|'kaynak'|'komsu'|null, zorluk: {gocebe:4,…}|'komsu',
  sure: 'mesafe'|n, ekipMin, ekipMax, gerekir: { bulus?, bina?, komsu? }, kisKapali, sinifCarpan: { avci: 1.5 }, odul: { kaynak:{}, bp, xp, esya:[{id,olasilik}], ozel },
  basarisiz: { yarali: [1,2], kahramanYarali: 4 }, tehditBag: 'ayi'|null, gerginlik: n, iliski: n, birlikKarsitlik: bool, bekleme, mvp }`.
- `src/data/kahramanlar.js`: `SINIFLAR [{ id, ad, cagMin, taban, savunma, renk, yetenekler: [{ sv, id, ad, metin, etki }], cagirmaMaliyet: {cag: {}} }]`,
  `ESYALAR [{ id, ad, yuva: 'silah'|'giysi'|'tilsim', etki: { guc, xp, sure, yaraliSure, kisCeza, huzur, tukenir }, tarif?: { kaynak, bina, sinif } }]`,
  `ADLAR [..]`, `XP_ESIK [0,10,25,45,70]`, `KAHRAMAN_TAVAN { gocebe:1, … }`.
- `src/data/komsular.js`: `{ id, ad, mizac, profil, guc: {baris:0.8,…}, cagGecikme: 12, mesafe: [14,22], cagBul: 'tasdevri', ilkMesaj }` + `NIYET_KURALLARI` (§4.3 eşikleri).
- `src/data/hedefler.js`: `DESTANLAR [{ id, cag, adimlar: [{ id, metin, kosul: { sefer?, isaret?, komut?, kaynak? } }], odul }]`,
  `MEVSIM_GOREVLERI [{ id, cagMin, metin, kosul, sure: 5, odul }]`, `GELENEKLER [{ cag, secenekler: [{ id, ad, etki }] }]`, `BASARIMLAR [{ id, ad, kosul }]`.
- `denge.js`: `SEFER_ERZAK 1`, `SEFER_OLAY 0.25`, `SANS [0.85, 0.3]`, `ESIK [1.25, 1.0, 0.6]`, `ISARET_MAX`, `ISARET_SURE 8`, `SANDIK_MAX 8`,
  `KAHRAMAN_USTA 0.25`, `YARALI_KAHRAMAN [4, 8]`, `KOMSU_KAYMA 2`, `BASKIN_TAVAN 3`, `BIRLIK [1.25, 0.8]`.
- `dogrula.js`: id benzersizliği, `cagMin ≤ cagMax`, eşya yuvası geçerli, sefer `odul` kaynakları tanımlı, destan adımı koşulları tanınan anahtarlar.

### 8.2 Durum alanları (kayıt sürüm 4)
```
kahramanlar: [{ uid, ad, sinif, seviye, xp, gorev: {tur:'usta'|'bekci'|'danisman', hedef}|null, yarali: 0, esya: {silah, giysi, tilsim}, portre }]
sandik: [esyaId]   sefer: { rng, aktif: [{ uid, tur, hedef, kalan, ekip: {kahraman:[uid], isci, birlik:{}, onder}, guc, olayEtki }], sayac, bekleme:{} }
isaretler: [{ uid, tur, x, y, kalan, zorluk }]   komsular: [{ id, x, y, cag, iliski, durum, niyet, rng, bekleme }]
hedef: { destan: { id, adim }, mevsimGorevi: { id, kalan, ilerleme } | null, kartlar: [id], gelenekler: { [cag]: id }, unvan, basarimlar: [id], faaliyet: {} }
istatistik.sefer: { gonderilen, basari, yarali }
```
- **Göç `GOCLER[3] = goc3to4`:** `kahramanlar: []`, `sandik: []`, `sefer: { rng: rngBaslat('sefer:'+tohum), aktif: [] … }`, `isaretler: []`,
  `komsular: []` (yüklenen Taş+ oyunda ilk keşif seferinde bulunur), `hedef` varsayılanı; `tehdit.iliski.komsu` değeri bulunacak ilk komşunun
  `iliski`'sine aktarılır. Yüklenen oyunda "Ateş Başında Bir Ses" olayı bir sonraki tura kuyruklanır. `DURUM_SEMASI` genişler; alan silinmez.
- Ayrı RNG akışları: `sefer.rng`, `komsu.rng` (tehdit gibi; `durum.rng` sırası ve mevcut testler değişmez).

### 8.3 Çekirdek modüller / komutlar
- `core/sefer.js`: `ekipGucu`, `seferOlasiliklari` (UI, saf), `adimSefer` (tur adımı `m3`, tehditten sonra: kalan−1, kamp toplama, dönüş, sonuç), `isaretDogur`.
- `core/kahraman.js`: `xpEkle`, `seviyeKontrol`, `kahramanEtkileri` (usta/bekçi/danışman → üretim/savunma/BP çarpanları), `yaraliIlerlet`.
- `core/komsu.js`: `komsuYerlestir`, `komsuNiyeti`, `adimKomsu` (mevsim başı), `iliskiDegistir`, `komsuGucu`.
- `core/hedef.js`: `destanKontrol`, `gorevKartlari`, `gorevKontrol`, `basarimKontrol`, `unvanHesapla` (adım `o2`, takvimden sonra).
- Komutlar (`{ durum, hata? }`, Türkçe hata): `seferGonder(d, seferId, hedefUid, ekip)`, `seferGeriCagir(d, uid)`, `kahramanGorev(d, uid, gorev)`,
  `kahramanCagir(d, sinif, kisi?)`, `kahramanEmekli(d, uid)`, `esyaTak(d, uid, esyaId)`, `esyaCikar(d, uid, yuva)`, `esyaYap(d, tarifId)`,
  `komsuYanit(d, komsuId, 'kabul'|'red')`, `komsuHediye(d, komsuId)`, `gorevSec(d, kartId)`, `gelenekSec(d, id)`, `destanAdim(d)` (ör. postu sun).
- Değişen: `savunma.js` (`kahramanSavunma`, seferdekiler hariç), `uretim.js` (usta çarpanı, sürü), `tehdit.js` (`onleyiciGorev`, komşu kaynağı, ittifak savunması),
  `eylem.js` (Keşfet → işaret, önder "Seferde"), `olay.js` (`tur:'sefer'`, Yabancı Aile'ye gezgin seçeneği), `cag.js` (gelenek penceresi, tavan).

### 8.4 Arayüz gereksinimleri
1. **Harita işaretleri** (karo simgesi + kalan gün halkası; dokun → Sefer penceresi) ve yoldaki ekip figürü (isteğe bağlı).
2. **Sefer penceresi:** hedef kartı (ad, süre, zorluk, ödül), ekip seçici (kahraman kartları dokun-seç, işçi −/+ sayacı, önder anahtarı, Bronz+ birlik türü),
   olasılık çubuğu (4 renk), erzak, köy savunması "önce → sonra" satırı, Gönder.
3. **Seferler çipi** (üst çubuk: "🧭 2 · 1 gün") + dönüş sonuç kartı (bildirim; ödül simgeleri, XP çubuğu, seviye atlama).
4. **Kahraman paneli** (yeni sekme "Kahramanlar"): portre kartları (ad, sınıf, Sv, XP, yaralı süresi), görev yeri seçici, 3 eşya yuvası + sandık ızgarası, yetenek listesi, Ateş Yemini düğmesi.
5. **Komşu paneli:** komşu kartları (ad, mizaç, çağ, güç kademesi, ilişki çubuğu + etiket, durum), mevsim teklifi/talebi düğmeleri, ticaret/elçi/baskın kısayolu.
6. **Hedefler paneli:** destan adımları, aktif mevsim görevi + kart seçimi, gelenekler, unvan, başarımlar. Gelenek seçim penceresi (çağ atlayınca).

---

## 9. Denge hedefleri, bot ölçütleri, MVP ve fazlama

### 9.1 Denge hedefleri
- Çağ hedef süreleri (`TASARIM` §7.1) **değişmez**: seferli bot ±%10 içinde; seferler çağı en çok %15 kısaltabilir (ödül tavanı ile).
- Sefer ödülleri toplam kaynak gelirinin %10–20'si (bir çağ boyunca); sefer başına ödül ≈ aynı süre o işçilerin üretiminin 1,5–2 katı (risk primi).
- Sefer sıklığı: çağ başına 4–8 (Göçebe 2–4); başarı oranı (kısmi hariç) %55–75; büyük başarı %15–25.
- Kahraman seviyesi çağ sonunda: Göçebe Sv2, Taş Sv3, Bronz Sv4, Orta Sv5 (ilk kahraman).
- Tehdit ile birlikte: sefer ekibinin yokluğu yüzünden yenilgi ≤ tehditlerin %15'i (uyarı çalışıyorsa).
- Barışçıl/ticaret botu ile baskıncı bot arasında çağ süresi farkı ≤ %10; komşu ilişki ortalaması barışçıl botta ≥ 30.

### 9.2 Bot test ölçütleri (`tests/` + mevcut 50 tohum botu genişler)
1. Determinizm: aynı tohum + aynı komutlar → aynı `sefer/komsu/isaretler` (3 RNG akışı bağımsız; `durum.rng` sırası değişmez → eski testler aynen geçer).
2. Sarmal: hiçbir tohumda nüfus < 2; seferde ölüm 0; yaralı işçi oranı ortalama ≤ nüfusun %10'u.
3. Bot stratejileri: `pasif` (sefer yok), `dengeli` (her işarete r ≥ 1 ise gönder), `agresif` (baskın), `barisci` (ticaret/elçi) → §9.1 aralıkları.
4. Olasılık doğruluğu: `seferOlasiliklari` ile 10 000 simülasyonun dağılımı ±%2.
5. Kayıt: v3 → v4 göçü, gidiş-dönüş eşitliği, bilinmeyen alan reddi.
6. `ayi` iptali, `kurt_avi` tehdit bitirme, komşu niyet kural sırası (birim test tablosu).

### 9.3 MVP dilimi (Göçebe + Taş Devri)
- Kahraman: **Avcı + Kaşif** (2 sınıf), ilk kahraman olayı gün 6, Ateş Yemini (Göçebe/Taş), seviye 1–5, 3 yuva, eşyalar: `tas_mizrak`, `ayi_postu`, `kurt_disi`, `eski_harita`, `sifali_ot`.
- Sefer: **Keşif Seferi, Ayı Avı, Eski Harabe** (+ `kurt_avi` yalnız tehdit bağı olarak, isteğe bağlı) · işaretler (🐻 🏚 🐾) · sefer olayı 2 adet.
- Komşu: **1 komşu** (Taş'ta bulunur): ilişki, hediye (komut), ticaret teklifi niyeti (kural 2), soğuk ilişkide baskın ağırlığı (kural 4). Haraç talebi/ittifak yok.
- Hedef: **"Ayının İzinde"** destanı + 4 mevsim görevi kartı. Gelenek ve başarım yok.
- Arayüz: harita işaretleri, Sefer penceresi, Seferler çipi + sonuç kartı, Kahraman paneli (temel), komşu kartı (Önder/Tehdit penceresinin altında tek kart yeterli).
- Kayıt v4 göçü; bot `dengeli` stratejisi.

### 9.4 Fazlama (ÖNERİ sırası)
1. **F1 = MVP** (yukarıda) → oynanış onayı.
2. **F2 Taş derinliği:** Şaman + Savaşçı, `koyun`, `uzak_kamp`, `elci` seferi (TEHDIT'teki Elçi Gönder'i karşılar), Taş Gelenek, başarımlar, "Kayıp Kabile".
3. **F3 Bronz:** Zanaatkâr + Tüccar, eşya tarifleri, `ticaret` + `baskin_seferi` + birlik karşıtlığı (mızrak/okçu), 2. komşu, haraç talebi, ittifak, Usta Arayışı.
4. **F4 Antik/Orta:** süvari/kuşatma, haraççı/efendi durumları, 3. komşu, Komutan, Ticaret/Hâkimiyet zaferleri, Orta Çağ Kuşatma penceresi.
5. **F5 Sanayi/Modern** (çağ kararı verilirse): yeni sınıf/sefer satırları; komşu C seçeneği burada değerlendirilir.

---

## 10. Açık sorular (kullanıcıya) — her birinde ÖNERİ

1. **Komşu modeli A / B / C?** — ÖNERİ: **B** (keşifle bulunan 1–3 komşu, mevsimlik niyet, seferle etkileşim). C yalnız Sanayi/Modern'de.
2. **Savaş modeli (a) / (b) / (c)?** — ÖNERİ: **(b)** hesaplamalı baskın seferi + Bronz'dan hafif birlik karşıtlığı; (c) mini savaş ekranı şimdilik yok.
3. **Seferde ölüm olsun mu?** — ÖNERİ: **hayır**, yalnız yaralı (işçi 3 tur, kahraman 4/8 tur); ölüm yalnız tehdit sisteminde kalır.
4. **Kahraman nüfustan mı çıksın (terfi) yoksa ek kişi mi?** — ÖNERİ: **nüfustan terfi** (yiyecek yer, konut kullanır, işçi yuvasına girmez); gezgin olarak gelen +1 nüfus olur.
5. **İlk kahraman ne zaman?** — ÖNERİ: **gün 6** garanti olay ("Ateş Başında Bir Ses"), Avcı ya da Kaşif seçimi; ilk ayı işareti gün 8–12 arası garanti.
6. **Ek zafer yolları (Ticaret, Hâkimiyet) ve çağ başı Gelenek (geri dönülmez) eklensin mi?** — ÖNERİ: **evet**, ama F2–F4'te; MVP'de yalnız Ayı destanı + mevsim görevleri.
