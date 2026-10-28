# SAVAŞ — Görsel otomatik savaş, birlikler, komuta kademesi (tasarım, 2026-10-28)

Kaynak geri bildirim (kullanıcı, yeni oyun): "Ekip ayıya ulaşınca bildirim gelsin, *versus* sahnesi açılsın; okçular arkada,
mızrakçılar önde, ana kahraman ortada; yerleşimi ben yapayım, saldırtayım (Whiteout Survival gibi). Kışlada mızrakçı/okçu
geliştirmeye devam edeyim; görevlerden kahraman kartı ve eşya toplayayım. Çağ atladıkça askeri yapı **komuta kademesi** versin
(lider → komutan → şövalye → general…). Hedefe varınca savaş animasyonunu görmek, sonra köy savaşlarını görmek istiyorum."

Bu belge `docs/AKSIYON.md` §5'teki **(b) hesaplanan sefer** kararını **genişletir** (geri almaz): yeni yön = **(c′) görsel otomatik
savaş** — oyuncu yalnız yerleşimi seçer, sonucu çekirdek hesaplar, sahne olay listesinden oynatır. AKSIYON §5'teki "(c) tur tur
mini savaş ekranı (2–5 dk)" hâlâ YOK; (c′) 10–25 sn'lik, atlanabilir bir izlemedir. Köy savaşları ikinci faz (§8).
Sayılar başlangıç değeridir (denge aşama 7); kod sabitleri `src/data/denge.js` ve yeni tablolarda tutulur. ÖNERİ = karar bekler.

---

## 1. Hedefler ve ilkeler

1. **Hızlı tempo:** bir savaş sahnesi 10–25 sn (1×), `2×` ve **Atla** her an; atlanınca sonuç kartı anında. Yerleşim ekranı ≤ 20 sn
   (Öneri düğmesiyle 1 dokunuş).
2. **Sıra tabanlı uyum:** savaş bir **tur içinde** olur; turu kilitlemez (mevcut "durdurmayan teklif" ilkesi, AKSIYON §11). Oyuncu
   varış turunda saldırtmazsa sonraki `turIlerlet`'te **otomatik yerleşim + otomatik savaş** (bildirim + "İzle" düğmesi).
3. **Sonuç tutarlılığı:** savaşın sonuç kademesi (büyük/başarı/kısmi/başarısız) **mevcut sefer formülüyle aynı tek `sefer.rng`
   çekiminden** gelir (`r' = r × (SEFER_SANS[0] + SEFER_SANS[1] × u)`, eşikler `SEFER_ESIK`). Yerleşim yalnız `r`'yi çarpanla
   değiştirir (§5.3). Arayüzdeki olasılık çubuğu (`seferOlasiliklari`) bu yüzden **kesin** kalır. Aynı tohum + aynı yerleşim → aynı
   kademe ve **aynı olay listesi** (bit düzeyinde).
4. **Ölüm yok:** seferde ve savaş sahnesinde kimse ölmez; 0 cana inen birim **çöker** (diz çöker → geri çekilir). Yaralı sayısı
   mevcut `SEFER_SONUC[*].yarali` kuralıdır; yaralılar çökenlerin ilk N'idir. `nüfus − ekip ≥ 2` kuralı aynen.
5. **Çağ listesi açık uçlu:** birlik kademesi T1–T5 = 5 çağ; Sanayi T6, Modern T7 yalnız veri satırı. Kod çağ sırası (`sira`) ile
   çalışır, çağ adı sabitlemez.
6. **Performans:** sahnede en çok **60 figür** (oyuncu ≤ 36, düşman ≤ 24), ≤ 25 çizim çağrısı, ≤ 45 bin üçgen; birlikler
   InstancedMesh; simülasyon < 5 ms (SwiftShader'da < 20 ms).
7. **Çekirdek saf:** simülasyon `src/core/savas.js`'te DOM/three'siz; render olay listesini yalnız **okur** ve oynatır.

## 2. BİRLİKLER

### 2.1 Türler (taban T1 değerleri; `src/data/birimler.js`)
| id | Ad | Açılış | Can | Saldırı | Zırh | Menzil (hücre) | Vuruş aralığı (tick) | Hız | Sefer gücü | Rol |
|---|---|---|---|---|---|---|---|---|---|---|
| `mizrakci` ✱ | Mızrakçı | Göçebe | 30 | 5 | 3 | 1 | 2 | 1 | 1 | ön hat, canavar/atlı karşıtı |
| `okcu` ✱ | Okçu (Göçebe: Sapancı görünümü T1) | Göçebe | 18 | 6 | 1 | 4 | 3 | 1 | 1 | arka hat, piyade karşıtı |
| `kalkanli` | Kalkanlı | Bronz (Demirci) | 42 | 3 | 7 | 1 | 3 | 0,8 | 1,2 | tank; ok hasarı ×0,6 |
| `suvari` | Süvari | Antik (Ahır) | 34 | 7 | 4 | 1 | 2 | 2 | 1,5 | kanat, ilk hamlede arka sıraya dalar |
| `kusatma` | Kuşatma (Mancınık) | Orta (Kuşatma Atölyesi) | 20 | 12 | 2 | 6 | 6 | 0 | 2 | yapı ×3 hasar; yalnız surlu hedef/savunma |
| *`tufekci` / `topcu`* | Tüfekçi / Topçu | Sanayi / Modern | — | | | | | | | yalnız veri satırı |

Düşman özel birimleri aynı şemayla (`birimler.js` `DUSMANLAR`): `ayi` (canavar; can 140, saldırı 9, zırh 4, aralık 3; **Pençe
Savuruşu**: her 4 tick'te ön sıradaki 3 hücreye ×0,7; **Hamle**: tick 10'da orta sıraya atlar), `ayi_yavrusu` (can 30, saldırı 4),
`kurt` (can 22, saldırı 5, hız 2, kanattan dolanır), `akinci`, `haydut`, `komsu_piyade` vb. (çağ çarpanıyla, F3–F4).

### 2.2 Karşıtlık üçgeni (hasar çarpanı `K`; AKSIYON §5 sayıları korunur: uygun ×1,25, ters ×0,8)
| saldıran ↓ / hedef → | piyade (mızrak, kalkan) | okçu | atlı | canavar | yapı/sur |
|---|---|---|---|---|---|
| mızrakçı | 1 | 1 | **1,25** | **1,25** | 0,5 |
| okçu | **1,25** | 1 | 0,8 | 1 | 0,3 |
| kalkanlı | 1 | 1,25 (yaklaşırsa) | 1 | 1 | 0,5 |
| süvari | 0,8 (mızrak) / 1 (kalkan) | **1,25** | 1 | 0,8 (at ürker) | 0,3 |
| kuşatma | 0,8 | 0,8 | 0,5 | 0,5 | **×3** |
Döngü okunuşu (arayüz ipucu): **Mızrak > Atlı/Canavar · Okçu > Piyade · Atlı > Okçu · Kuşatma > Sur**. Kalkanlı okçuya dayanıklı (ok ×0,6).

### 2.3 Birlik kademesi (T1–T5, çağa bağlı)
- Kademe = köy çapında **tür başına** talim düzeyi (`ordu.kademe.mizrakci = 2` gibi); tavan = çağ sırası + 1 (Göçebe T1 … Orta T5;
  Sanayi T6, Modern T7). Çağ atlamak tavanı açar, kademeyi kendisi yükseltmez → "geliştirmeye devam" döngüsü.
- Çarpan: can/saldırı × `1 + 0,25 × (T − 1)` (T5 = ×2); sefer gücü × `1 + 0,15 × (T − 1)`; görünüm her kademede değişir (§7.2).
- **Talim (kademe yükseltme)** komutu `birlikTalim(d, tur)`: eğitim yapısında, süre `2 + T` tur, kuyrukta yapı başına 1 talim.
  Maliyet (T→T+1): T2 8 odun + 4 alet · T3 6 metal + 10 yiyecek · T4 10 metal + 15 sikke · T5 15 metal + 30 sikke (+ tür ek: okçu
  +2 deri/odun, süvari +10 yiyecek, kuşatma +20 odun). Talimde birlik savaşa ve savunmaya katılır (engellemez).

### 2.4 Ordu = nüfustan terfi (asker)
- **F1:** ordu yok. Seferdeki her işçiye yerleşim ekranında rol verilir (mızrakçı varsayılan; okçu sefer başına 1 odun ek erzak).
  T1, eğitimsiz. Sefer gücü bugünkü gibi işçi başına 1 (Taş+ alet taşıyan 1,5).
- **F2+:** `askerEgit(d, tur, adet)` boştaki bir işçiyi **asker** yapar (nüfusa sayılır, yer, konut kullanır, işçi yuvasına girmez —
  kahraman gibi). `askerTerhis(d, tur, adet)` anında, bedelsiz geri döner (kademe korunur, köy çapında).
- **Tavanlar:** `asker ≤ min(Σ eğitim yapısı asker yuvası, rütbe.kalici, floor(nüfus × 0,3))` ve her zaman `nüfus − asker − seferdeki ≥ 2`.
- **Eğitim (işçi → asker):** mızrakçı 3 yiyecek + 1 odun, 1 tur · okçu 2 odun + 1 deri, 2 tur · kalkanlı 2 metal, 2 tur · süvari
  8 yiyecek + 1 metal, 3 tur · kuşatma 15 odun + 2 metal, 3 tur. Eğitim kuyruğu yapı başına 2 kişi.
- **Bakım (ekonomiye ağır yük olmasın):** asker zaten 1 yiyecek yer, üretmez (asıl bedel ≈ 2 yiyecek/tur fırsat). Ek bakım yalnız
  Antik+: 5 asker başına 1 sikke/tur (mevcut Kışla bakımına dahil, çift sayılmaz). Bakım ödenmezse askerler savunmaya ×0,5 katılır,
  terhis edilmez. Hedef: tipik orduda asker oranı nüfusun %10–20'si, üretim kaybı ≤ %12.
- **Köy savunması:** köydeki asker başına `ASKER_SAVUNMA[T]` = 0,75 · 1 · 1,5 · 2,5 · 3,5 (bekçi 0,5 ile karşılaştır) — döküm kalemi
  "Ordu". Seferdeki asker savunmadan düşer (mevcut seferdeki işçi/önder/kahraman kuralı).

### 2.5 Eğitim yapıları (mevcut binalar korunur)
| Yapı | Çağ | Durum | Asker yuvası (×Sv) | Eğitir | Not |
|---|---|---|---|---|---|
| **Talim Yeri** | Taş | YENİ (1×2, 10 odun + 4 taş, 2 gün, Sv1–3) | 4 | mızrakçı, okçu | savunma 1; Göçebe'de yapı yok (F1 rolleri) |
| Muhafız Kulesi | Bronz | mevcut (değişmez) | — | — | nöbetçi savunması aynen |
| **Demirci** | Bronz | mevcut + kalkanlı açma şartı | — | (kalkanlı şartı) | |
| Kışla | Antik | mevcut (`isciTuru 'asker'`, isci 4, isciSavunma 3): yuvaya **yalnız asker** atanır | 4 (mevcut) +4 | tüm piyade | kayıt v5 göçünde mevcut atanmış askerler → mızrakçı T3 |
| **Ahır** | Antik | YENİ (2×2, 30 odun + 10 taş + 20 yiyecek) | 3 | süvari | AKSIYON §5'teki "Ahır gerekir" |
| Kale | Orta | mevcut (şövalye yuvası) | 4 | süvari T5 görünümü "Şövalye" | |
| **Kuşatma Atölyesi** | Orta | YENİ (2×2, 40 odun + 10 metal) | 2 | kuşatma | |

## 3. KOMUTA KADEMESİ (rütbe)

### 3.1 Sıralama (`src/data/rutbeler.js`) — kullanıcının "lider → komutan → şövalye → general" önerisi çağlara yayıldı (ÖNERİ)
| # | Rütbe | Çağ | Sahada asker (kapasite) | Izgara | Açık hücre (+kahraman) | Bölük boyu (hücre başına) | Kalıcı asker tavanı | Savaştaki kahraman | Komuta yeteneği |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Lider** | Göçebe | 4 | 3×3 | 4 (+1) | 1 | — (F1 rol) | 1 | **Birlikte Vur:** ilk saldırı +%15 |
| 2 | **Yiğitbaşı** | Taş | 6 | 3×3 | 6 (+1) | 1 | 6 | 1 | **Kalkan Sırası:** ön sıra tick 0–6 hasar −%20 |
| 3 | **Komutan** | Bronz | 12 | 3×4 | 8 (+1) | 2 | 12 | 2 (2. orta sırada) | **Hücum Borusu:** tick 8'de herkes hız ×1,5, saldırı +%10 (4 tick) |
| 4 | **Serdar** | Antik | 20 | 3×5 | 10 (+1) | 2 | 20 | 2 | **Ok Yağmuru Emri:** tick 6'da okçular ×2 vuruş |
| 5 | **Şövalye** | Orta | 30 | 3×5 | 12 (+1) | 3 | 30 | 3 | **Sancak Hücumu:** süvari/kahraman ilk vuruş ×2, düşman sersem 1 tick |
| 6 | *General* | Sanayi | 45 | 3×5 | 12 (+1) | 4 | 45 | 3 | *Topçu Desteği* (veri satırı) |
| 7 | *Mareşal* | Modern | 60 | 3×5 | 12 (+1) | 5 | 60 | 3 | *Hava Gözcüsü* (veri satırı) |
- Rütbe **köyün ordusuna** aittir (Whiteout'taki "lider düzeyi" gibi); savaşta ortadaki ana kahraman taşır (rozet + sancak rengi).
  Önder sefere katılırsa (AKSIYON §2.2) orta sırada ayrı bir birimdir; rütbeyi taşımaz.
- Ad çakışması: kahraman sınıfı **Komutan** (Orta, şemada kapalı, `acik:false`) ile rütbe adı çakışır → sınıf adı **Sancaktar**
  olsun (ÖNERİ, tek veri satırı; kayıtta yok). Bkz. §12 soru 2.

### 3.2 Rütbe nasıl kazanılır — Zafer Puanı (ZP) + çağ
- Her rütbenin içinde 3 yıldız (★1–★3). ★2: kapasite +2 · ★3: komuta yeteneği +%50 etki. Rütbe tavanı = bulunulan çağın satırı ★3.
- **ZP kaynakları:** savaş büyük 3 · başarı 2 · kısmi 1 · başarısız 0 (× `1 + 0,25 × çağSırası`, aşağı yuvarla); tehdit püskürtme 2,
  kısmi 1; destan bitişi 5; "Yiğitlik" görevi 1; **çağ atlama +5 "Çağ Sancağı"** (barışçıl oyuncu kilitlenmesin).
- **Eşikler (toplam ZP):** Lider ★1 0 · ★2 4 · ★3 9 → Yiğitbaşı ★1 14 · ★2 20 · ★3 28 → Komutan 36/46/58 → Serdar 70/85/100 →
  Şövalye 118/138/160. Bir sonraki rütbe = çağ ≥ satır çağı **ve** ZP ≥ ★1 eşiği; ZP yetmezse eski rütbede kalınır (ceza yok).
- Hedef ölçüt: aktif oyuncu çağ ortasında yeni rütbeye geçer; pasif/barışçıl oyuncu çağ sonunda ★1'e ulaşır (bot §11).

## 4. KAHRAMAN, KARTLAR, EŞYA

### 4.1 Savaşta kahraman (mevcut `SINIFLAR`, XP 1–5 korunur)
- Kahraman birimi: can `60 + 20 × Sv`, saldırı `8 + 2 × Sv`, zırh `3 + Sv`, menzil sınıfa göre (Avcı 3, Kaşif 1), aralık 2 tick;
  × yıldız çarpanı `1 + 0,1 × (★ − 1)`. Ölmez: 0 canda çöker; kahraman çökerse ekip 3 tick sonra çekilir (§6.4).
- **Öfke (aktif yetenek):** vuruş +20, alınan hasar başına +10, 100'de **otomatik** tetiklenir (Whiteout gibi; F1–F3'te dokunma yok,
  bkz. §12 soru 3). Pasifler sınıf yeteneklerinin savaş yorumudur (mevcut etki anahtarları yeniden kullanılır):
| Sınıf | Pasif (Sv1) | Aktif (öfke) | Sv3 | Sv5 |
|---|---|---|---|---|
| Avcı ✱ | İz Sürme → canavara hasar ×1,5 (`avCarpan`) | **Zehirli Ok:** ×3 hasar, hedef 3 tick yavaş | Pusu → tick 0'da okçular bedava atış; `avYaraliYok` = çökenler yaralanmaz | aktif 2 kez |
| Kaşif ✱ | **Gözcü:** düşmanın ilk saldırısı 2 tick gecikir | **Meşale:** düşman 2 tick sersem (ayı geri sıçrar) | Keskin Göz → okçu kritik %15 (×1,5) | Haritacı → Hamle/dalış önceden görünür (ızgarada uyarı) |
| Savaşçı | Kalkan → ön sıra komşusu hasar −%15 | Kalkan Duvarı: ön sıra −%30, 4 tick | | |
| Şaman | Şifa → savaş sonu yaralı −1 | Şifa Davulu: herkese +%20 can | | |
| Diğerleri | veri satırı (F5) | | | |

### 4.2 Kahraman kartı (parça) ve yıldız
- Yeni alan `kahramanKart: { [sinif]: adet }` (mevcut `hedef.kartlar` **mevsim görev kartlarıdır**, karıştırılmaz; arayüzde
  "Kahraman Kartı" vs "Görev").
- **Kaynaklar:** savaş büyük 3 / başarı 2 / kısmi 1 kart (ekipteki kahramanın sınıfından, yoksa açık rastgele sınıf) · harabe %20
  1–3 kart (kapalı sınıflar dahil) · görev kartı tamamlama 2 · destan bitişi 5 · tehdit püskürtmede bekçi kahraman 1. Çekim
  durumsuz `kart:tohum:tur` akışıyla (mevcut).
- **Yıldız (★1–★5, seviye/XP'den ayrı eksen):** ★2 5 kart · ★3 10 · ★4 20 · ★5 35 (+ çağ kaynağı: deri 3 / alet 3 / metal 4 /
  sikke 15). Etki: savaş çarpanı +%10/★, sefer gücü +0,5/★ (yeni `ekipGucu` kalemi "Yıldız"). Komut `kahramanYildiz(d, uid)`.
- **İşe alma:** bir sınıftan 10 kart + sınıfın çağı açık + `KAHRAMAN_TAVAN` boş → `kahramanKartKullan(d, sinif)` yeni kahraman
  (nüfustan terfi, mevcut kural; Ateş Yemini'ne ek bir yol). Tavan doluysa kartlar birikir (en çok 60/sınıf, fazlası 1:1 "Genel Kart").

### 4.3 Eşya (mevcut 3 yuva: silah/giysi/tılsım; kaybolmaz)
- Savaş yorumu: silah `guc +n` → saldırı +2n · giysi `guc +n` → can +10n (Deri/Zincir Zırh'ın yaralı süresi aynen) · tılsım özel
  (`sifali_ot` = bu savaşta çökenler yaralanmaz, sonra tükenir; `ayi_postu` kış cezası yok + can +10; `kurt_disi` XP +%25).
- F5: eşya geliştirme +1/+2/+3 (aynı eşyadan 1 kopya + çağ kaynağı; etki +%25/düzey); savaş ganimetinde eşya parçası
  (`esyaParca`), 5 parça = eşya. Sandık sınırı 8 korunur (parçalar sayılmaz).

### 4.4 Göç
- Mevcut kahramanlar: `yildiz: 1`, `kahramanKart: {}`; XP/seviye/yetenek aynen. Avcı/Kaşif'in tüm mevcut sefer etkileri değişmez.

## 5. SAVAŞ ÖNCESİ YERLEŞİM

### 5.1 Akış
1. Sefer yolda ilerler; varış turu = `ceil(süre / 2)` (2 turluk sefer: 1. tur sonunda varış). Bildirim `savas_hazir`
   ("Ekip ayıya ulaştı! Düzeni kur.") + harita işaretinde çakan ⚔ ve çip.
2. **Yerleşim penceresi** (kompakt pencere dili, yatay): sol %55 ızgara, sağ %45 düşman kartı. Seçilmezse sonraki turda otomatik.
3. **Saldır!** → `savasBaslat` → sahne açılır. Sonuç ekibe yazılır; ekip dönüş yoluna geçer (kalan süre), ödüller dönüşte
   (mevcut `seferSonuclandir`, kademe saklanan değerden).

### 5.2 Izgara
- 3 sıra (**ön / orta / arka**) × 3 sütun (rütbeyle 4–5). Kahraman **orta sıra orta sütun**, sabit. Açık hücre sayısı rütbeden;
  kilitli hücre kilit simgeli ("Yiğitbaşı'nda açılır").
- Etkileşim: alt şeritte birlik kartları (tür simgesi + T + adet); **sürükle-bırak** (hücreden hücreye takas), çift dokunuş = çıkar.
  Düğmeler: **Öneri** (en yüksek çarpanlı düzen, §5.3 açgözlü), **Otomatik** (kural: piyade ön, menzilli arka, atlı kanat),
  **Saldır!** (altın, büyük). Sağ panel: "⚔ 7,4 / 🐻 6" güç karşılaştırması, **olasılık çubuğu** (canlı güncellenir), düşman
  profili ipucu ("Ayı ön sırayı savurur; 5. saniyede ortaya atlar — mızrakçıları öne").
- Dokunma hedefi ≥ 44 px; hücre 64×64 px (844×390'da ızgara ~230×210 px). Son yerleşim tür başına hatırlanır (`yerlesimKaydet`).

### 5.3 Formasyon ve karşıtlık çarpanı (gücü değiştiren tek yer)
```
konumC[tür][sıra]: mızrakçı 1,10/1,00/0,85 · okçu 0,80/1,00/1,10 · kalkanlı 1,15/0,95/0,80 · süvari 1,05/1,00/0,90 (+0,05 kanat) ·
                   kuşatma 0,70/0,85/1,10                                  (ön/orta/arka)
formC = clamp( Σ katkı_i × konumC_i / Σ katkı_i × (ön sıra boşsa 0,9) , 0,85 , 1,15 )
karsC = clamp( Σ katkı_i × K[tür_i][düşmanProfil] / Σ katkı_i , 0,80 , 1,25 )
ekipGucu' = ekipGucu (mevcut kalemler + Yıldız) × formC × karsC × komutaC     (komutaC: rütbe ★ başına 1,00/1,02/1,04)
r = ekipGucu' / zorluk  →  mevcut SEFER_SANS / SEFER_ESIK / SEFER_SONUC (değişmez)
```
- Dengeyi bozmamak için: **Öneri** düzeninin ortalama `formC × karsC` ≈ 1,12 olacak biçimde F1'de `ayi_avi` zorluğu ×1,10
  yükseltilir (ÖNERİ; bot ölçütü §11: Öneri düzeniyle büyük başarı oranı bugünküyle ±5 puan). Kötü düzen (okçular önde) ≈ 0,85.
- Seferde birlik yoksa (yalnız kahraman/önder) formC = karsC = 1 → bugünkü sonuç birebir.

## 6. SAVAŞ SİMÜLASYONU (çekirdek, saf)

### 6.1 İlke: "önce kademe, sonra savaş" (kademe kilidi)
1. `savasBaslat` **tek** `u = sefer.rng` çekimi yapar (bugün `seferSonuclandir`'da yapılan çekim buraya taşınır; sefer başına yine
   1 çekim → akış sırası korunur). `r'` → hedef kademe.
2. Simülasyon ayrı, durumsuz akışla koşar: `rngBaslat('savas:' + tohum + ':' + seferUid)` (`durum.rng`, `tehdit.rng`, `sefer.rng`
   tüketilmez). Girdi: birimler + yerleşim + düşman + hedef kademe.
3. Gizli düşman çarpanı `m` (can ve saldırı; [0,4; 2,5]) ikiye bölme ile en çok 8 denemede ayarlanır; her deneme aynı alt tohumla
   koşar → sim sonucu **hedef kademenin ölçütünü** sağlayana kadar. Tutmazsa son denemeye zorunlu bitiş olayı eklenir (`kacis` /
   `geri_cekil`). Böylece sahne her zaman çekirdeğin kademesini gösterir; yerleşim hem `r`'yi hem sahnenin akışını etkiler.
| Kademe | Sim ölçütü (bitişte) |
|---|---|
| Büyük başarı | düşman çöktü, ekip toplam canı ≥ %60, kahraman ayakta, çöken ≤ 1 (sersem, yaralanmaz) |
| Başarı | düşman çöktü, ekip canı %25–75 (çökenler sersem, yaralanmaz) |
| Kısmi | düşman canı ≤ %50'de **kaçar**, ekipte ≥ 1 çöken (ilk çöken = yaralı) |
| Başarısız | ekip **çekilir** (ekip canı ≤ %35 ya da kahraman çöktü), düşman canı ≥ %40; ilk 1–2 çöken + kahraman yaralı |

### 6.2 Tick, hareket, hedef seçimi
- 1 tick = 0,5 sn (1×). Üst sınır 50 tick (25 sn); dolarsa can oranlarıyla bitiş (kilit ölçütü yine geçerli).
- Konum: her taraf 3 sıra; iki ordu 6 birim aralıkla başlar; yakın dövüşçüler tick 0–2 ileri yürür (hız), menzilliler durur.
- **Hedef:** yakın dövüş → aynı sütunda en öndeki düşman, yoksa en yakın sütun (eşitlikte sol). Menzilli → düşmanın en ön dolu
  sırası, aynı sütun öncelikli, eşitlikte en düşük can. Süvari → ilk hamlede arka sıra, sonra yakın dövüş kuralı. Kuşatma → yapı/sur,
  yoksa en kalabalık hücre. Canavar → ön sıra yayı (Pençe), Hamle tick'inde orta sıra (kahraman). Hedef çöktüyse yeniden seç.
- Sersem/yavaş: sersem birim vuruş yapmaz; yavaş aralık ×1,5.

### 6.3 Hasar
```
hasar = max(1, round( saldırı × T_çarpan × K[saldıran][hedef] × konumC_saldıran × buff × m_taraf × 20 / (20 + zırh_hedef) × v ))
v = 0,9 + 0,2 × rng   (savas akışı) · kritik: yalnız yetenekle (×1,5) · ok hasarı kalkanlıya ×0,6
```
Bölük: hücredeki asker sayısı `n` → hücre canı `can × n`, saldırı `saldırı × n^0,85` (kalabalık azalan getiri).

### 6.4 Yetenek tetikleri
- Komuta yeteneği: rütbe tablosundaki sabit tick. Kahraman aktif: öfke 100. Düşman özel: tick/aralık tablosu (`DUSMANLAR`).
- Çöken birim: `cokme` olayı, 2 tick sonra `geri_cekil` (arka kenara yürür, oturur). Kahraman çökerse 3 tick sonra tüm ekip çekilir.

### 6.5 Sonuç → mevcut sefer sonucu
- Kademe = `SEFER_SONUC` anahtarı (`buyuk|basari|kismi|basarisiz`); ödül, XP, eşya şansı, yaralı, Ayı tehdidi iptali, destan adımı
  **mevcut kodla** uygulanır. Savaşa özgü ekler: ZP (§3.2), kahraman kartı (§4.2), F5 eşya parçası.
- Yaralılar: `SEFER_SONUC[k].yarali` adedi kadar, **çökme sırasına göre** (işçi/asker yoksa kahraman 3 tur — mevcut kural).
  Avcı Pusu / Şifalı Ot → yaralı yok (mevcut `avYaraliYok`).

### 6.6 Veri akışı
```
seferGonder → (yol) → adimSefer: varış → sf.savas = {durum:'bekliyor'} + bildirim savas_hazir
UI: savasKur(d, uid) → {ızgara, birlikler, düşman, öneri, olasılık}   ↔  yerlesimKaydet(d, uid, yerlesim) (saf, olasılık günceller)
UI: savasBaslat(d, uid) → { durum, savas: { kademe, ozet, girdi } }   (durum: sf.savas = {durum:'bitti', kademe, yerlesim, m})
render: savasOlayListesi(girdi) → { birimler:[...], olaylar:[...], sure }   (saf, yeniden üretilebilir; kayda yazılmaz)
render/savas.js: olayları zaman çizelgesinde oynatır; Atla → son kare + sonuç kartı
adimSefer: dönüş → seferSonuclandir(kademe = sf.savas.kademe)  (çekim yapmaz)
```
Olay şeması: `{ t, tur: 'yuru'|'saldiri'|'mermi'|'vurus'|'yetenek'|'sersem'|'cokme'|'geri_cekil'|'kacis'|'bitis', k: kaynakId,
h: hedefId|[ids], d: hasar, kalan: can, ek: {yetenekId, kritik} }`. Birim: `{ id, taraf: 'biz'|'onlar', tur, T, sira, sutun, n, can, kahramanUid? }`.

## 7. SAVAŞ ANİMASYONU (Three.js, `src/render/savas.js`)

### 7.1 Sahne
- Ayrı küçük sahne (köy sahnesi duraklatılır, renderer ve BD son-işleme geçişi paylaşılır): 24×12 birimlik arena zemini, hedefe göre
  dekor (ayı: orman kenarı + kaya + çalı; harabe: yıkık sütun; baskın: komşu köy çiti). Mevsim ışığı ve kar tozu köy sahnesinden.
- Kamera: yatay telefonda **yandan-üstten 3/4** (yükseklik 35°), ekip solda, düşman sağda; açılışta "VS" bandı (sol: rütbe +
  kahraman portresi, sağ: düşman adı/gücü) 1,2 sn, kamera ortaya kayar. Kahraman yeteneğinde 0,4 sn yaklaşma + zaman ×0,3.
- HUD (DOM): üstte iki can çubuğu (taraf toplamı), sağ üstte `1× / 2×` ve **Atla**; altta kahraman öfke halkası (yalnız gösterge F1–F3).

### 7.2 Modeller (kıdemli sanat yönetmeni notu: önce siluet)
- Prosedürel, düşük poligon (figür ≤ 350 üçgen, ayı ≤ 1.200, kahraman ≤ 600): gövde, baş, iki kol, silah, kalkan/sırt ayrı parça →
  her parça tür başına bir InstancedMesh (konum/dönüş örnek matrisinde); renk köşe rengi + paylaşılan atlas malzemesi (`malzeme.js`).
- **Çağ siluetleri** (kademe T = görünüm): T1 Göçebe deri yelek, sivri sopa-mızrak, sapan/kısa yay, tüy · T2 Taş kemik uçlu mızrak,
  hasır kalkan, aşı boyası yüz çizgisi · T3 Bronz bronz miğfer (sivri), yuvarlak kalkan, kompozit yay · T4 Antik sorguçlu miğfer,
  dikdörtgen kalkan, lacivert pelerin · T5 Orta zincir zırh, sancaklı mızrak, uzun yay, at zırhı (Şövalye). Palet `docs/GORSEL.md`
  çağ satırları; takım rengi bant: biz `#ffd34d` altın, düşman `#e0443a` kırmızı (yalnız omuz/sancak).
- Ayı: iri, öne eğik, omuz kamburu siluet; kaçarken orman dekoruna koşar.

### 7.3 Animasyonlar (kemiksiz, parça dönüşüyle; tüm figürler tek güncelleme döngüsünde)
- yürüme (gövde zıplama + kol salınımı 2 Hz) · bekleme (nefes) · saldırı (kol 0,25 sn öne, mızrak dürtme / yay germe) · vuruş alma
  (0,1 sn geri itme + beyaz parlama) · **çökme** (diz çöker, gri, 0,4 sn) → **geri çekilme** (arkaya yürür, oturur) · zafer (kol
  kaldırma) · kaçış. Ölüm/kan YOK.
- Efektler: ok/sapan taşı (instanced, parabol iz), toz bulutu (sprite havuzu 32), kıvılcım (havuz 24), hasar sayıları (canvas
  doku atlası; beyaz, kritik altın), kahraman yeteneği halka + ad bandı, komuta yeteneğinde sancak dalgalanması.
- Ses yok (şimdilik); `olaylar` ses kancası alanı taşır (ileride).

### 7.4 Bütçe ve kalite
- ≤ 60 figür, ≤ 25 çizim çağrısı, ≤ 45 bin üçgen, gölge yalnız anahtar ışıktan (tek 1024 harita); Performans kalitesinde gölge yok,
  efekt havuzları yarı. Hedef 30 fps (sabit sahne kuralı) GPU'lu telefonda; SwiftShader'da ölçüm e2e ile (denenmedi).
- Bölük > 3 asker → hücrede 3 figür + sayı rozeti ("×5").

## 8. KÖY SAVAŞLARI (faz 2: F3–F4)

### 8.1 Savunma sahnesi (tehdit varışı, `docs/TEHDIT.md` §5.2)
- **Hesap değişmez:** varış sonucu yine `savunma ≥ guc` → püskürtme · `≥ guc/2` → kısmi · aksi yenilgi (`tehdit.rng`, mevcut
  korumalar: `NUFUS_MIN`, kayıp kilidi, kış azığı, konut/merkez hasarsız, toparlanma, merhamet).
- **Savunma düzeni:** uyarı süresince "Savunma Düzeni" penceresi (tehdit penceresinde düğme): ordu + bekçi kahraman 3×N ızgaraya
  (ön = çit/sur hattı, orta, arka = kuleler yanında). Çarpan yalnız **ordu kalemine** uygulanır ve dar: `formC` [0,95; 1,05]
  (TEHDIT dengesini korur). Yerleşim yapılmazsa Otomatik.
- **Oynatım:** `tehdit_varis` bildiriminde "İzle" → **köy sahnesinin kendisinde** (yeni arena değil) kamera tehdit yönündeki sınıra
  uçar; saldırganlar harita kenarından 2–3 dalga (`guc` ile: ≤ 6 → 1 dalga, ≤ 15 → 2, üstü 3), çit/sur parçaları gerçek
  konumlarında, kule ve nöbetçi figürleri ok atar. Sonuç kademesi `savunmaTesti` sonucuna kilitli (§6.1 yöntemi; `m` ayarı).
  Hasar gören bina → is dumanı (mevcut hasar görünümü), yanabilir çit parçası → alev efekti.
- **Kuşatma evresi** (Orta, TEHDIT §14): her kuşatma turu 6–8 sn'lik kısa sahne: dışarıda kuşatma kampı (çadır + mancınık), aşınma
  kadar düşman figürü çekilir, duvar sarsıntısı. Karar penceresi (Dayan/Fidye) sahneden önce gelir.
- **Oyuncu müdahalesi:** ÖNERİ = sonuç önceden hesaplı; müdahale **sahne öncesinde** (Nöbet Tut, Tahkimat, Silah Dağıt, Savunma
  Düzeni, bekçi kahraman). Sahnede kahraman yeteneği otomatik. Canlı dokunuşla sonucu değiştirmek ayrı karar (§12 soru 3).
- Atlanabilir; "Savaşları izle: Her zaman / Yalnız önemli / Hiç" ayarı (`ut_ayar`).

### 8.2 Komşu baskını (`baskin_seferi`, Bronz+, Barışçıl'da kapalı — mevcut kural)
- Varışta yerleşim + sahne: hedef **komşu köy** (komşu çağına göre prosedürel 3–5 bina + çit/sur, komşu profili `piyade|okcu|atli|surlu`
  düşman birlik karışımını belirler). `karsC` komşu profilinden (AKSIYON §5 ipucu: "Irmak Halkı okçu; süvari etkili").
  Ganimet tavanı (`guc × 3`), ilişki −30, 15 tur bekleme aynen. Surlu hedefte kuşatma birimi yoksa `karsC` × 0,9.
- Komşunun bize baskını (`komsu_baskini` tehdidi) = §8.1 savunma sahnesi.

## 9. Mevcut sistemlerle bağlantı
- **Seferler:** savaşlı türler `savas: true` alanıyla: `ayi_avi` (F1), `kurt_avi` (F2), `baskin_seferi` (F4), harabe tuzağı (F5,
  kısa sahne, ÖNERİ). `kesif`, `koyun`, `uzak_kamp`, `ticaret`, `elci`, `kahraman_arayisi` savaşsız (değişmez).
- **Sefer olasılıkları:** `seferOnizleme` yerleşim verilirse `formC/karsC` uygular; verilmezse Öneri düzeniyle hesaplar (UI'daki
  çubuk her zaman gönderilecek düzenin kesin olasılığı).
- **Yol olayları:** varıştan önce çözülür; "İkinci iz" (+1 gün, ödül ×1,3) varışı 1 tur kaydırır.
- **Tehdit / savunma:** `savunmaDokum` yeni kalem "Ordu" (köydeki asker × `ASKER_SAVUNMA[T]` × formC); seferdeki asker/kahraman/önder
  düşer (mevcut). Kışla/Kale yuvasındaki asker mevcut `isciSavunma`'yı verir, "Ordu" kalemine **ayrıca eklenmez** (çift sayım yok;
  test: döküm toplamı = `savunmaHesapla`).
- **Ayı destanı "Ayının İzinde":** adım `ayi_avla` koşulu aynen (`sefer: ayi_avi, sonuc: buyuk|basari`); ilk ayı savaşı
  **öğretici savaş**: yerleşimde parlayan "Öneri", tek cümlelik ipuçları (`ogretici.js`), ayının Hamle'si yavaş gösterilir. Kaybolan
  ayı işareti cezası aynen. Destan bitişi +5 ZP + 5 kahraman kartı.
- **Görev kartları:** "Yiğitlik" (bir seferi başarıyla tamamla) savaşlı seferle de dolar; yeni görev önerisi "Düzen Ustası" (Öneri'ye
  dokunmadan büyük başarı) F5.
- **Denge:** savaş eklenince sefer başına ödül değişmez; yeni kazançlar (ZP, kart) ekonomiye kaynak katmaz. Ordu bedeli üretim
  kaybıdır (§2.4). Bot: aktif oyuncunun çağ süresi en çok −%5 değişsin.

## 10. Veri şeması, durum, çekirdek, render/UI (yalnız liste)

**Veri (yeni):**
- `src/data/birimler.js`: `BIRIMLER [{ id, ad, cagMin, gerekir:{bina}, can, saldiri, zirh, menzil, aralik, hiz, seferGuc, sinif:
  'piyade'|'okcu'|'atli'|'kusatma', egitim:{maliyet, sure}, talim:{[T]: maliyet}, gorunum:{[T]: parcaSeti} }]`, `KARSITLIK`, `KONUM_C`,
  `DUSMANLAR [{ id, profil, can, saldiri, zirh, aralik, ozel:[{id, tick|her, etki}] }]`, `KADEME_TAVAN` (çağ → T).
- `src/data/rutbeler.js`: `RUTBELER [{ id, ad, cag, kapasite, izgara:[sira, sutun], acikHucre, bolukBoyu, kalici, kahraman, komuta:
  {id, ad, tick, etki}, zp:[★1, ★2, ★3] }]`, `ZP_KAYNAK`.
- `src/data/savas.js`: `SAVAS_TICK 0.5`, `SAVAS_TICK_MAX 50`, `KILIT_OLCUT` (§6.1), `M_ARALIK [0.4, 2.5]`, `M_DENEME 8`,
  `FORM_SINIR [0.85, 1.15]`, `KARS_SINIR [0.8, 1.25]`, `SAVUNMA_FORM_SINIR [0.95, 1.05]`, `OFKE`, `ASKER_SAVUNMA`, `ASKER_ORAN 0.3`,
  `KART_YILDIZ [5,10,20,35]`, `KART_ISE_ALMA 10`.
**Veri (değişiklik):** `seferler.js` + `savas: bool`, `dusman: {id, adet}|{komsu:true}`; `kahramanlar.js` + sınıf `savas: {menzil,
pasif, aktif}`, sınıf Komutan → Sancaktar (ÖNERİ); `binalar.js` + `talim_yeri`, `ahir`, `kusatma_atolyesi`, bina `ordu: {yuva, egitir:[...]}`;
`hedefler.js` destan ödülüne `zp`, `kahramanKart`; `dogrula.js` çapraz denetim (birim/rütbe/düşman/bina referansları).

**Durum (kayıt sürümü 5, `GOCLER[4]`; beyaz liste `DURUM_SEMASI`):**
- `ordu { asker: {[tur]: n}, kademe: {[tur]: T}, egitim: [{tur, adet, kalan, binaUid}], talim: [{tur, kalan, binaUid}],
  yerlesim: {[seferTur]: hucreler}, savunmaYerlesim }` — varsayılan boş; v4 göçünde Kışla'daki atanmış asker → `asker.mizrakci`, T3.
- `rutbe { zp, sira, yildiz }` (göç: `sira` = çağ satırı, ZP = 5 × çağSırası, ★1).
- `kahramanlar[].yildiz` (1), `kahramanKart {}`.
- `sefer.aktif[].savas { durum: 'yolda'|'bekliyor'|'bitti', yerlesim, kademe, m, varisTur }` (≤ 200 bayt); `savas { sayac, son: [≤5
  girdi özeti] }` "Tekrar izle" için (olay listesi kaydedilmez, girdiden üretilir).
- Kayıt büyümesi hedefi ≤ +0,6 KB.

**Çekirdek (`src/core/savas.js`, `ordu.js`, `rutbe.js`; saf, testli):**
`savasKur(d, seferUid)` · `yerlesimOner(d, seferUid)` · `yerlesimKaydet(d, seferUid, yerlesim)` · `savasCarpanlari(d, ekip, yerlesim,
dusman)` → {formC, karsC, komutaC} · `savasBaslat(d, seferUid)` · `savasGirdisi(d, seferUid)` · `savasOlayListesi(girdi)` (saf; sim +
kademe kilidi) · `savasOzet(olaylar)` · `askerEgit`, `askerTerhis`, `birlikTalim`, `orduGorunumu(d)`, `adimOrdu` (tur adımı: eğitim/talim −1)
· `rutbeGorunumu(d)`, `zpEkle(d, miktar, neden, bildirimler)`, `rutbeDenetle` (çağ atlama + ZP) · `kahramanYildiz`, `kahramanKartKullan`
· `savunmaDuzeniKaydet(d, yerlesim)`, `savunmaSavasGirdisi(d)` (F3). Tur adımı: `m3` Sefer içinde varış/otomatik savaş; `m4` Ordu.
Bildirim kodları: `savas_hazir | savas_otomatik | savas_sonuc | ordu_egitim_tamam | ordu_talim_tamam | rutbe_yildiz | rutbe_yeni |
kahraman_kart | kahraman_yildiz`.

**Render:** `src/render/savas.js` (arena, oynatıcı, hız/atla), `src/render/birlik.js` (prosedürel parça setleri, InstancedMesh havuzu,
T görünümleri), `efekt.js` (ok/toz/kıvılcım/sayı havuzları), F3 `koySavasi.js` (köy sahnesinde dalga oynatımı).
**UI:** `src/ui/savas.js` — yerleşim penceresi (ızgara, kart şeridi, Öneri/Otomatik/Saldır, olasılık çubuğu), VS bandı, sahne HUD,
sonuç kartı (kademe, ödül, ZP, kart, yaralılar, "Tekrar izle"); Ordu paneli (Talim Yeri/Kışla bina kartında: eğit/terhis/talim kuyruğu);
Rütbe rozeti (üst çubukta, dokununca ZP ilerlemesi); kahraman kartında ★ ve kart sayacı; Ayarlar "Savaşları izle".

## 11. Fazlama ve MVP dilimi

| Faz | İçerik | Bot / test ölçütleri | Tahmini iş (model) |
|---|---|---|---|
| **F1 Ayı savaşı** ✱ | yalnız `ayi_avi`; mızrakçı + okçu rolleri (ekip işçileri); Avcı/Kaşif savaş yetenekleri; 3×3 ızgara (4+1 hücre); rütbe **Lider** (ZP sayılır, yükselme yok); varış bildirimi, yerleşim penceresi, otomatik saldırı; sim + kademe kilidi; arena + 2 birim T1 + ayı + kahraman modelleri; öğretici ilk savaş; kayıt v5 (yalnız `sefer.aktif[].savas`, `rutbe`) | 1.000 tohum: sim kademesi = çekirdek kademesi **%100**; aynı girdi → aynı olay listesi (karşılaştırma); sim < 20 ms; formC/karsC sınırlar; Öneri düzeniyle 50 tohum botta büyük başarı oranı ±5 puan (§5.3 zorluk ×1,10); `durum.rng`/`tehdit.rng` dizisi eski botla aynı; e2e: yerleşim → Saldır → Atla → sonuç kartı; ölüm 0 | çekirdek sim Opus (~1 oturum); render sanatı + oynatıcı Opus (~1–2); yerleşim UI Sonnet (~1); e2e Sonnet |
| **F2 Ordu ve rütbe** | Talim Yeri, asker eğitimi/terhis, talim T1–T2/T3, Kışla bağlantısı, ZP + rütbe yükselme (Yiğitbaşı, Komutan), `kurt_avi` savaşlı, kalkanlı (Bronz) | asker oranı ortanca %10–20; üretim kaybı ≤ %12; aktif bot Taş'ta Yiğitbaşı ★1'e çağ ortasında, pasif bot çağ sonunda; `nüfus − asker − sefer ≥ 2` her tur; döküm toplamı testi; çağ süresi değişimi ≤ %5 | çekirdek Opus; Ordu paneli Sonnet; T2–T3 görünümleri Opus |
| **F3 Köy savunma savaşı** | Savunma Düzeni, köy sahnesinde dalga oynatımı, çit/sur/kule katılımı, kuşatma kısa sahneleri, "Savaşları izle" ayarı | varış sonucu eski `savunmaTesti` ile **birebir** (50 tohum × 5 çağ); kayıp/tehdit ölçümü TEHDIT §14 tablosundan ±1 puan; sahne bütçesi 60 figür | çekirdek kilit Opus; köy oynatımı Opus; UI Sonnet |
| **F4 Komşu baskını + çağ birlikleri** | `baskin_seferi` sahnesi, komşu köy dekoru, süvari (Ahır), kuşatma (Atölye), Serdar/Şövalye, T4–T5 görünümleri | baskın ganimet tavanı korunur; Barışçıl'da kapalı; karsC komşu profiline göre beklenen yönde (test) | Opus (sanat), Sonnet (UI) |
| **F5 Kart/eşya derinliği** | kahraman yıldızı, kartla işe alma, eşya geliştirme/parça, diğer sınıfların savaş yetenekleri, harabe tuzağı sahnesi, "Düzen Ustası" görevi | kahraman tavanı korunur; sandık 8; kart birikimi oyun başına ★3'e Antik'te ulaşır (bot) | Opus çekirdek; Haiku metin (yetenek/eşya adları) |

## 12. Açık sorular (kullanıcıya)

1. **Savaş kaç seferde?** ÖNERİ: yalnız düşmanlı seferler (Ayı, Kurt, Baskın; ileride tuzaklı harabe); keşif/ticaret/elçi savaşsız kalsın
   (tempo bozulmasın).
2. **Rütbe adları:** ÖNERİ: Lider (Göçebe) → Yiğitbaşı (Taş) → Komutan (Bronz) → Serdar (Antik) → Şövalye (Orta) → General (Sanayi) →
   Mareşal (Modern); çakışmayı önlemek için Orta Çağ kahraman sınıfı "Komutan" → "Sancaktar".
3. **Savaş sırasında canlı müdahale** (kahraman yeteneğine dokunma) sonucu değiştirsin mi? ÖNERİ: hayır (F1–F3 yetenek otomatik,
   sonuç olasılık çubuğuyla kesin); istenirse F4'te yalnız "yetenek zamanlaması" (±%5 etki) olarak.
4. **Oyuncu savaşı izlemezse?** ÖNERİ: varış turunda yerleşim yapılmazsa sonraki turda Öneri düzeniyle otomatik savaş + "İzle" bildirimi;
   ayarla "Yalnız önemli savaşları göster" (ilk ayı, baskın, kuşatma).
5. **Ordu nüfustan mı?** ÖNERİ: evet, asker = nüfustan terfi (yer, üretmez), tavan nüfusun %30'u ve `nüfus − asker − sefer ≥ 2`;
   ayrı "asker" kaynağı yok. Göçebe'de ordu yapısı yok, seferdeki işçiye rol verilir.
6. **Köy savaşı sahnesi nerede?** ÖNERİ: köy sahnesinin kendisinde (kamera sınıra uçar, gerçek çit/sur/kule); baskın seferleri ayrı arenada
   (komşu köy dekoru).
