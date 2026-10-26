# Dış Tehdit Sistemi — tasarım (taslak, 2026-10-26)

Durum: **tasarım; kod yok.** Bağlı belgeler: `TASARIM.md` §2.5 nüfus, §4 çağlar, §6 olaylar (§6.3 saldırı), §7.3 ölüm sarmalı.
Kapsam dışı (sonraki adım, yalnız kanca): kahraman/sefer sistemi, köy dışı görevler (ayı avı, keşif seferi), tam komşu/diplomasi.
`ÖNERİ` = kullanıcı kararı bekleyen tasarımcı önerisi; uygulayıcı varsayılan olarak bunu kullanır.

---

## 1. Hedefler ve ilkeler

1. **Zorluk süreden değil, baskıdan gelir.** Tehdit hiçbir inşaat/bekleme süresini uzatmaz. Bedeli: işçiyi üretimden çekmek
   (nöbet), kaynak harcamak (tahkimat, haraç), stok riskine girmek (çok stok = çekici hedef).
2. **Adil ve öngörülebilir:** her tehdit **işaret → hazırlık → çözüm** sırasıyla gelir. Sürpriz saldırı yok; uyarı en az 2 tur.
   Oyuncu varıştan önce olası sonucu görür ("🛡 3 / ⚔ 4 → kısmi kayıp").
3. **Yenilgi yok:** `NUFUS_MIN = 2`, kayıp kilidi (§7.3.2) ve kemer sıkma aynen geçerli. Tehdit "kaybettirmez"; geri püskürtülemezse
   **kayıp + toparlanma** olur (§5.3). Göçebe'de tehdit kimseyi öldürmez (yaralı işçi).
4. **Hızlı tempo:** karar penceresi oyunu kilitlemez (olaydan farkı). Oyuncu uyarı süresince **tavır** seçer; varışta sonuç
   bildirim olarak gelir. Hiçbir şey seçilmezse varsayılan "Savun" uygulanır.
5. **Tek ağır kriz:** aynı anda en çok 1 dış tehdit; tehdit varış turunda kötü olay çıkmaz (§3.6).
6. **Tarih hissi:** her çağın kendine özgü düşmanı vardır (kurt → akıncı → barbar → kuşatma ordusu); çağ listesi açık uçludur.

---

## 2. Tehdit taksonomisi (çağa göre)

### 2.1 Türler (`tur`)
| tur | Kaynak (`kaynak`) | Hedef | Yenilgide en ağır sonuç | Geri çekilme biçimi |
|---|---|---|---|---|
| `yirtici` | doğa | yiyecek (depo) | yiyecek %25 + 1 yaralı işçi (3 tur) — **ölüm yok** | Yem bırak |
| `akinci` | göçebe/çete | taşınabilir kaynak (yiyecek, deri, alet, metal, sikke, kumaş) | %25 + 1 kişi | Haraç / Saklan |
| `baskin` | komşu kabile/köy | tüm depo + bina | %25 + 1 kişi + 1 bina hasarı (= mevcut §6.3) | Haraç / Elçi / Saklan |
| `istila` | barbar/yabancı halk | nüfus + bina + üretim | %25 + 1 kişi + 1 hasar + 4 tur `*` üretim ×0,8 | Haraç / Saklan |
| `kusatma` | ordu/krallık | sur, ticaret, üretim | %25 + 1 kişi + 1 hasar (önce savunma binası) + 5 tur `ticaretKapali` | Fidye (saklanma yok) |
| `yagma` | haydut/korsan | kervanlar, sikke/kumaş | yoldaki 1 kervan ya da sikke/kumaş %15 | Haraç / Saklan |

Kısmi sonuç (savunma ≥ güç/2) her türde: hedef kaynaklarda %10 kayıp (`SALDIRI_KISMI_KAYIP`), nüfus/bina kaybı yok;
`kusatma` ek olarak 3 tur `ticaretKapali`, `istila` ek olarak 1 hasar.

### 2.2 Tehdit tablosu (MVP ✱)
`gucOran` §3.4 formülüne girer. Güç örneği: Normal, çekicilik 1,0, çağ içi tur 10–19.
| id | Ad | tur | cagMin–cagMax | gucOran | Uyarı (tur) | Güç örneği | İşaret metni (çip) |
|---|---|---|---|---|---|---|---|
| `kurt_surusu` ✱ | Kurt Sürüsü | yirtici | gocebe–tasdevri | 1,0 (Taş'ta 0,8) | 2 | Göçebe 4 · Taş 6 | "Kampın çevresinde kurt izleri" |
| `avci_cetesi` ✱ | Yabancı Avcı Çetesi | akinci | tasdevri–bronz | 1,0 | 3 | Taş 7 | "Uzakta yabancı ateşler" |
| `komsu_baskini` ✱ | Komşu Kabile Baskını | baskin | tasdevri–∞ | 1,2 | 3 | Taş 9 · Bronz 16 | "Komşular silah biliyor" |
| `ayi` | Aç Ayı | yirtici | tasdevri–bronz | 1,0 | 2 | Taş 7 | "Ağaçlarda pençe izleri" (kanca: Ayı Avı görevi) |
| `akincilar` | Akıncılar | akinci | bronz–antik | 1,2 | 3 | Bronz 16 | "Toz bulutu ufukta" |
| `haydutlar` | Haydutlar | yagma | bronz–∞ (`kervanlar` ya da Pazar varsa) | 0,9 | 3 | Bronz 12 · Antik 24 | "Yolda soyulan yolcular" |
| `korsanlar` | Korsanlar | yagma | antik–∞ (su karosu yerleşim sınırına ≤3) | 1,1 | 3 | Antik 29 | "Kıyıda yabancı yelkenler" |
| `barbar_akini` | Barbar Akını | istila | antik–ortacag | 1,4 | 4 | Antik 36 · Orta 71 | "Kuzeyden kaçan köylüler" |
| `yagma_seferi` | Yağma Seferi | baskin | ortacag–∞ | 1,2 | 4 | Orta 61 | "Sancaklı atlılar görüldü" |
| `kusatma` | Kuşatma | kusatma | ortacag–∞ | 1,5 | 5 | Orta 76 | "Bir ordu yola çıktı" |

- `kurt_surusu`, `akincilar`, `kusatma` bugün `olaylar.js`'te `tur:'saldiri'` olayıdır → içerik (seçenek metinleri) tehdit
  tablosuna taşınır; olay kayıtları **silinmez** (kayıt beyaz listesi `idler(OLAYLAR)` kullanıyor), yalnız motor açıkken rastgele havuzdan süzülür (§8.3).
- **Sanayi / Modern (açık uçlu hat, ÖNERİ, şimdi uygulanmaz):** `cagMin`/`cagMax` çağ **sırası** ile karşılaştırılır (id listesi değil),
  böylece yeni çağ eklemek yalnız `caglar.js`'e satır + tehdit satırı demektir. Taslak: Sanayi `saldiriTaban 90`: `grev` (sosyal, huzur
  hedefli), `sabotaj` (bina), `savas_ilani` (komşu ülke, kusatma türü). Modern `saldiriTaban 150`: `hava_saldirisi`, `siber_ablukasi`
  (ticaretKapali). `cagMax` boş = son çağa kadar.

### 2.3 Doğal / sosyal tehditler (çerçeve)
Salgın, kıtlık, doğa (taşkın, don, fırtına) ve isyan (Vergi İsyanı) **olay sisteminde kalır** (§6). Tehdit motoru bunlara dokunmaz;
yalnız "tek ağır kriz" kuralıyla çakışmayı önler (§3.6). İleride Sanayi'de `grev` gibi sosyal tehditler motora alınabilir
(uyarılı, hazırlıklı olmaları gerekiyorsa); kural: **uyarıyla hazırlanılabilen = tehdit, anlık = olay.**

---

## 3. Tehdit motoru (`src/core/tehdit.js`)

### 3.1 Gerginlik (tehdit seviyesi)
`tehdit.gerginlik` 0–100. Her tur (aktif tehdit yokken) artar; 100'e ulaşınca bir tehdit **doğar** (uyarı aşaması).
```
artis = cag.gerginlikArtis × zorluk.siklik × (0,8 + 0,4 × doluluk) + rngTamsayi(0, 2)
doluluk = ortalama(min(1, stok[k] / depoTavan[k]))   (yalnız o çağda açık kaynaklar; 0–1)
```
| Çağ | gerginlikArtis | Başlangıç / çağ atlayınca | Hedef aralık (doğumlar arası, tur) |
|---|---|---|---|
| Göçebe | 5 | 40 (yeni oyun) | ilk tehdit gün 17–22 |
| Taş Devri | 6 | min(gerginlik, 50) | ~17–20 |
| Bronz/Demir | 6,5 | min(gerginlik, 50) | ~16–19 |
| Antik | 6 | min(gerginlik, 50) | ~17–20 |
| Orta Çağ | 6 | min(gerginlik, 50) | ~17–20 |
- Gerginlik `TEHDIT_ILK_GUN = 12`'den önce artmaz; doğum en erken gün 15 (uyarı ≥2 tur → varış ≥ gün 17). Göçebe'de ilk tehdit
  çoğu tohumda ilk kışa (tur 16–20) denk gelir: "kışın kurtlar köye iner" bilinçli tasarımdır; sarmal koruması §5.3.
- Çağ atlama turunda ve sonraki 8 tur yeni tehdit doğmaz ("yeni çağ nefesi"); aktif uyarı varsa sürer.

### 3.2 Görünürlük — ÖNERİ
- Aktif tehdit yokken üst çubukta 3 kademe çip: **Sakin** (<50) · **Tedirgin** (50–79) · **Gergin** (≥80). Sayı gizli.
- **Gözcü Direği** (çalışır, ≥1 işçi) varsa sayı görünür ("Gerginlik 72 · ~5 gün") ve uyarı +1 tur erken gelir.
- Gerginlik hiçbir zaman "gizli zar" değildir: oyuncu stok doluluğunun ve çağın etkisini çipteki ipucundan okur
  ("Dolu ambarlar göz çekiyor").

### 3.3 Tehdit seçimi (doğum)
1. Aday havuzu: `cagMin ≤ çağSırası ≤ cagMax`, `kosul` sağlanır (olay `kosulSaglanir` aynen kullanılır), `bekleme` dolmuş,
   zorluk izin veriyor (Barışçıl: yalnız `yirtici`).
2. Ağırlık: `agirlik × (tur === sonTehditTuru ? 0,5 : 1) × kaynakIliskisi` (ilişki ≥30 olan komşudan `baskin` ×0,6).
3. `rngAgirlikli` ile seç. Güç doğumda **bir kez** hesaplanır ve sabitlenir (öngörülebilirlik).
4. Bekleme: aynı tehdit id'si `bekleme` (varsayılan 30) tur tekrar çıkmaz.

### 3.4 Güç ve üst sınır
```
taban = gucOran × cag.saldiriTaban + floor(cagIcindekiTur / 10)     (mevcut §6.3 saldiriGucu'nun genellemesi; gucOran 1 = aynı)
guc   = min( gucUst, ceil(taban × cekicilik × kademe × zorluk.guc) )
gucUst = ceil(cag.saldiriTaban × 1,8 × zorluk.guc)                   (Göçebe 6 · Taş 11 · Bronz 22 · Antik 45 · Orta 90)
cekicilik = clamp(0,85 + 0,3 × doluluk − 0,05 × un, 0,8, 1,2)        (un = art arda püskürtme, en çok 3)
kademe    = 1 + 0,15 × haracSayac − (son sonuç 'yenilgi' ? 0,15 : 0) (sınır 0,85–1,45)
```
Ulaşılabilir savunma kontrolü (Normal, mevcut binalar): Göçebe 2–5 · Taş 10–15 · Bronz 25–40 · Antik 40–55 · Orta 80–100
→ her çağda hazırlıklı oyuncu en güçlü tehdidi de püskürtebilir; hazırlıksız oyuncu kısmi/yenilgi alır.

### 3.5 Uyarı ve geri sayım
- Doğumda `aktif = { id, guc, kalan: uyari (+1 Gözcü, +1 Rahat), tavir: 'savun', bilinen }`.
- `bilinen`: güç kesin mi? Gözcü Direği/Muhafız Kulesi çalışıyorsa ya da o turda önder **Keşfet** yaptıysa `true`; değilse
  arayüz aralık gösterir: `[floor(guc × 0,8), ceil(guc × 1,2)]` (aralık doğumda sabit, her turda değişmez).
- Her tur sonu `kalan − 1`; `kalan = 0` olduğu turun tehdit adımında **varış**: savunma testi + sonuç (§5).
- Uyarı sürerken: gerginlik artmaz; huzur hedefi −2 (`savunma < guc` iken; "korku"), savunma ≥ güç ise 0.

### 3.6 Çakışma kuralları
- En çok 1 aktif tehdit. Varış turunda `adimOlay` `kotu` olay seçmez (iyi olay/zincir çıkabilir).
- Aktif `hastalik` değiştiricisi ya da bekleyen olay varken varış 1 tur ertelenir (tehdit başına en çok 1 kez).
- Motor açıkken `tur:'saldiri'` olayları rastgele havuzdan çıkarılır (çifte saldırı yok).

### 3.7 RNG — ÖNERİ
Ayrı akış: `tehdit.rng = rngBaslat(tohum ^ 0x7E4D17)` durumu; motor yalnız bunu tüketir. Sebep: mevcut `durum.rng` sırası
(olay, keşif, doğum) ve mevcut testler/bot sonuçları değişmez; Barışçıl ile Normal aynı tohumda aynı olayları görür.
Kullanılan: `rngTamsayi` (artış oynaması), `rngAgirlikli` (seçim), `rngOlasilik` (Elçi, Karşı saldırı). Determinizm testle denetlenir.

---

## 4. Savunma sistemi

### 4.1 Mevcut kaynaklar (`savunmaHesapla`, binalar.js'ten doğrulandı)
| Kaynak | Değer | Not |
|---|---|---|
| Önder | 1 (+1 Mızrak Ucu) | `ONDER_SAVUNMA` |
| Gözcü Direği (Göçebe, Hayvan İzleri) | 2 + 1/işçi (1 yuva) | nöbetçi; görüş 8 |
| Nöbet Çiti (Taş) | 3 + 1/işçi (2 yuva) | nöbetçi |
| Muhafız Kulesi (Bronz) | 6 + 2/işçi (2 yuva) | Demir İşleme: nöbetçi ×1,5 |
| Kışla (Antik) | 5 + 3/işçi (4 yuva), bakım 1 sikke | asker |
| Sur Parçası (Orta) | 0,5 (+1 sınır kenarında) | işçisiz |
| Kale (Orta, tekil) | 25 + 5/işçi (4 yuva), bakım 3 sikke | şövalye |
| Turnuva Düzenle (Orta eylemi) | +10, 3 tur | değiştirici |
Bina değerleri × `SEVIYE_ETKI [1; 1,5; 2]`; bakımı ödenmeyen/hasarlı bina 0.

### 4.2 Yeni kaynaklar
| Kaynak | Çağ | Değer | Bedel (baskı) |
|---|---|---|---|
| **Bekçi** (yeni serbest iş, `SERBEST_ISLER`, sınırsız yuva) ✱ | Göçebe+ | 0,5 / kişi (Mızrak Ucu ile 0,75) | üretmez → kişi başı ~2 yiyecek/tur kaybı |
| **Nöbet Tut** (önder eylemi `nobet_tut`) | Göçebe+ | +(1 + çağSırası), değiştirici 2 tur | yorgunluk 1; o tur Avlan/Keşfet yok |
| **Acil Tahkimat** (komut `tahkimatYap`, tehdit başına 1) | Göçebe+ | aşağıda | kaynak; değiştirici `kalan + 1` tur |
| **Silah Dağıt** (komut `silahDagit`) | Taş+ | 2 alet → +1 (Bronz+: 1 metal → +1); en çok `floor(nüfus/2)` puan | alet/metal harcanır |
| Keşif / Gözcü | Göçebe+ | savunma değil **bilgi**: kesin güç, +1 tur uyarı | — |
| Kahraman (sonraki adım, kanca) | — | `kahramanSavunma` alanı | sefer sisteminde tanımlanacak |

Acil Tahkimat: Göçebe 4 odun → +2 · Taş 6 odun + 2 taş → +3 · Bronz 10 odun + 6 taş → +5 · Antik 20 taş + 10 sikke → +8 ·
Orta 30 taş + 20 sikke → +12.

### 4.3 Formül
```
savunma = savunmaHesapla(d)                      (mevcut: önder + binalar × Sv + işçi × isciSavunma × çarpan + Σ değiştirici.savunma)
        + bekci × BEKCI_DEGER × bekciCarpani      (yeni: serbest iş)
        + kahramanSavunma                         (kanca, şimdilik 0)
```
Nöbet Tut, Tahkimat, Silah, Turnuva = `degistirici.etki.savunma` (mevcut altyapı). Yeni `savunmaDokum(d)` → `[{ad, deger}]`
kalem listesi döner; toplamı `savunmaHesapla` ile eşit olmak zorunda (test).

### 4.4 Gösterim
- Uyarı çipi: `⚠ Kurt izleri · 2 gün · 🛡 3 / ⚔ 4` — renk: yeşil (🛡 ≥ ⚔), sarı (🛡 ≥ ⚔/2), kırmızı.
  Güç bilinmiyorsa `⚔ 3–5` ve renk aralığın üst ucuna göre.
- Pencerede beklenen sonuç satırı: "Şu an: kısmi kayıp (yiyeceğin ~%10'u). +1 savunma ile püskürtürsünüz."
- Sahne (isteğe bağlı, render): uyarıda harita kenarında tehdit işareti (iz/duman/sancak), nöbetçi figürleri çite yürür.

---

## 5. Oyuncu kararları ve sonuçlar

### 5.1 Seçenekler (uyarı süresince; engellemez)
| Seçenek | Ne zaman | Maliyet | Risk | Ödül / sonraki tehdide etkisi |
|---|---|---|---|---|
| **Savun** (varsayılan tavır) ✱ | varışta test | hazırlık bedeli (bekçi, tahkimat) | test sonucu | püskürtme: +5 huzur, ganimet `ceil(guc × 1,5)` yiyecek (Taş+: + `ceil(guc/2)` deri/alet), `un +1`, gerginlik = −20 |
| **Güçlendir** | uyarı içinde | §4.2 kalemleri | yok (kaynak gider) | yalnız savunmaya ekler |
| **Haraç / Yem bırak** ✱ | anında çözer | yırtıcı: `ceil(guc × 1,5)` yiyecek · diğerleri: hedef kaynakların %15'i (= Akıncılar "Haraç ver") · kuşatma: fidye `guc × 0,8` sikke | yok | `haracSayac +1` → sonraki tehdit güç +%15 (en çok 3 kez); gerginlik = 0 |
| **Saklan / Kampı taşı** ✱ | tavır, varışta uygulanır | Göçebe "Kampı taşı": 2 tur `*` üretim ×0,6 · diğer: hedef kaynak %10 + 3 tur üretim ×0,5 (= Akıncılar "Saklan") | yok (nüfus/bina kaybı yok) | gerginlik = 0; kuşatmada yok |
| **Elçi Gönder** (önder eylemi `elci_gonder`) | Taş+, `baskin`/`akinci`/`istila`; tehdit başına 1 | hediye `guc × 2` yiyecek (Antik+: `guc` sikke) | `p = clamp(0,35 + iliski/100 + 0,05 × çağSırası, 0,2, 0,85)` | başarı: tehdit biter, ilişki +10, gerginlik = 0 · başarısız: hediyenin yarısı gider, ilişki −5, tehdit sürer |
| **Karşı saldırı** (ÖNERİ: sefer sistemine ertele) | Bronz+, savunma ≥ güç × 1,25, ≥2 asker/nöbetçi | önder + işçiler 2 tur yok | `p = clamp(savunma / (guc × 1,5), 0,2, 0,9)`; başarısız: 1 kişi (kilitli) + tehdit sürer | ganimet ×2, gerginlik −40, ilişki −15 (kaynak öfkelenir) |

Kurallar: her tehditte en az 1 seçenek bedelsizdir (Savun). Gereksinimi tutmayan seçenek gri ve gerekçesi yazılı.

### 5.2 Varış sonucu (mevcut eşikler korunur, `savunmaTesti` genişler)
`savunma ≥ guc` → püskürtme · `savunma ≥ guc/2` → kısmi (%10) · aksi → yenilgi (%25 + tür profili, §2.1).
`SALDIRI_KISMI_KAYIP 0,10`, `SALDIRI_TAM_KAYIP 0,25`, `SALDIRI_TAM_NUFUS 1`, `SALDIRI_TAM_HASAR 1` değişmez; tür profili yalnız
**hangi** kaynakların etkileneceğini ve ek etkileri (yaralı, ticaretKapali) seçer.

### 5.3 Kayıp sınırları ve ölüm sarmalı koruması (zorunlu)
1. Nüfus kaybı yalnız `kayipUygula` ile (kayıp kilidi + `NUFUS_MIN 2`). Göçebe ve Rahat'ta ölüm yerine 1 yaralı işçi (3 tur).
2. Tek tehditte bir kaynaktaki kayıp ≤ %25 (Zor %30). **Kış azığı korunur:** yiyecekten `2 × nüfus`, kışta odundan `3 × Σ isinma`
   altına inilmez (kayıp oranı yalnız fazlaya uygulanır).
3. Bina hasarı en çok 1 (Zor 2); merkez, inşaattaki, hasarlı ve **konut** binalar hedef dışı (barınma çökmesin). Onarım %25 (mevcut).
4. `acTur > 0` ya da huzur < 30 iken yeni tehdit doğmaz (gerginlik 95'te bekler); uyarıdaki tehdit gelir ama güç ×0,8.
5. **Toparlanma:** yenilgi sonrası gerginlik = −30 (≈ +5 tur barış), 5 tur `toparlanma` değiştiricisi (huzur +5, onarım bedava),
   sonraki tehdit güç ×0,85 (`kademe`).
6. **Merhamet:** art arda 2 yenilgi → sonraki tehdit Rahat çarpanlarıyla gelir ve uyarı +1 tur.
7. Kurtarma olayı (§6.5 Komşu Kabile Yardımı) ve kemer sıkma aynen çalışır; tehdit bunları tüketmez.

---

## 6. Zorluk ayarı

| Çarpan | Barışçıl | Rahat | Normal | Zor |
|---|---|---|---|---|
| Türler | yalnız `yirtici` | hepsi | hepsi | hepsi |
| `siklik` (gerginlik artışı) | 0,6 | 0,75 | 1 | 1,25 |
| `guc` | 0,75 | 0,8 | 1 | 1,2 |
| Uyarı süresi | +1 | +1 | 0 | 0 |
| Kayıp oranı çarpanı | 0,5 | 0,6 | 1 | 1,2 (tavan %30) |
| Ölüm | yok (yaralı) | yok (yaralı) | Taş+ 1 kişi (kilitli) | Taş+ 1 kişi (kilitli) |
| Bina hasarı en çok | 0 | 1 | 1 | 2 |
| Haraç kademe artışı | %10 | %10 | %15 | %20 |

- Barışçıl'da `tur:'saldiri'` olayları da kapalı; yırtıcılar ve doğal/sosyal olaylar sürer.
- **Savaş isteğe bağlı mı? ÖNERİ:** evet, Barışçıl seçilebilsin (yeni oyun ekranı), varsayılan **Normal**. Zorluk her an
  düşürülebilir, yükseltilmesi yalnız yeni oyunda (başarı/istatistik ileride bayrakla ayrılır). Zorluk çağ hedef sürelerini
  değiştirmez; yalnız baskıyı.

---

## 7. Komşu köy/ülke kancaları (karar sonraya)

Şimdilik komşu yalnız **tehdit kaynağı + ilişki puanı**dır: `tehdit.iliski[kaynakId]` −100…+100 (başlangıç 0, gizli değil; tehdit
penceresinde "Komşu kabile: Soğuk (−10)"). Değişim: Elçi ±, haraç +3, püskürtme −5, karşı saldırı −15, Komşu Kabile Takası olayında takas +5.

| Seçenek | İçerik | Artı | Eksi |
|---|---|---|---|
| A) Yalnız tehdit kaynağı | `komsu` id'si soyut; haritada yok; ilişki baskın ağırlığını ve Elçi olasılığını etkiler | ucuz, MVP'ye sığar | komşu "yüzsüz" |
| B) Ticaret + ilişki + tehdit | keşifle bulunan komşu yerleşim karosu (`kesif` kancası), ilişkiye bağlı takas olayları/kervan hedefi, düşük ilişkide baskın | tarih hissi, sefer sistemine doğal hedef | harita + arayüz işi |
| C) Tam diplomasi/savaş | birden çok komşu, antlaşma, savaş ilanı, ordu hareketi | derin strateji | sıra tabanlı hızlı tempoyu ve kapsamı zorlar |

**ÖNERİ:** şimdi **A**; kahraman/sefer adımıyla birlikte **B** (komşu yerleşim = sefer/elçi hedefi); **C** yalnız Sanayi/Modern
çağ kararı verilirse ve B oynanınca değerlendirilir. A'nın veri alanları (`kaynak`, `iliski`) B'ye göçsüz taşınır.

**Sefer/kahraman kancaları (yalnız ad):** `tehdit.aktif.kaynakKonum` (yön/mesafe; sefer hedefi) · tehdit satırında `onleyiciGorev`
(örn. `ayi` → "Ayı Avı" görevi tamamlanırsa tehdit iptal + ganimet) · `kahramanSavunma` (savunma toplamına ek) · `ganimet` tablosu
(karşı saldırı/sefer ödülü ortak) · `karsi_saldiri` seçeneği sefer sistemine taşınır.

---

## 8. Veri şeması ve değişiklik listesi

### 8.1 `src/data/tehditler.js` (yeni)
```
{ id, ad, metin, tur: 'yirtici'|'akinci'|'baskin'|'istila'|'kusatma'|'yagma',
  kaynak: 'doga'|'gocebe'|'komsu'|'barbar'|'ordu'|'haydut',
  cagMin: 'gocebe', cagMax: 'tasdevri'|null,          // sıra ile karşılaştırılır; null = son çağ
  gucOran: 1.0, gucOranCag: { tasdevri: 0.8 }?,       // çağa özel geçersiz kılma
  uyari: 2, agirlik: 10, bekleme: 30, kosul: {},      // kosul = olay kosul anahtarları
  isaret: 'Kampın çevresinde kurt izleri',
  hedef: ['yiyecek'] | '*' | 'tasinabilir',
  sonuc: { kismi: { oran: 0.10, ek: {} }, yenilgi: { oran: 0.25, nufus: 1, hasar: 1, yarali: {adet,sure}, ek: { degistirici } } },
  secenekler: ['savun','harac','saklan','elci', 'karsi'],  // + metin geçersiz kılma: { harac: 'Et bırak' }
  harac: { kaynak: { yiyecek: 1.5 } } | { oran: 0.15 } | { sikke: 0.8 },   // × guc ya da oran
  ganimet: { yiyecek: 1.5, deri: 0.5 },                // × guc
  onleyiciGorev: null, mvp: true }
```
`denge.js` ekleri: `TEHDIT_ILK_GUN 12`, `TEHDIT_BASLANGIC 40`, `TEHDIT_CAG_SINIR 50`, `TEHDIT_CAG_NEFES 8`, `TEHDIT_GUC_UST 1.8`,
`TEHDIT_BEKLEME 30`, `BEKCI_DEGER 0.5`, `HARAC_KADEME 0.15`, `TOPARLANMA_TUR 5`, `ZORLUK {barisci, rahat, normal, zor}` (§6 tablo).
`caglar.js`: her çağa `gerginlikArtis`. `eylemler.js`: `nobet_tut`, `elci_gonder`. `SERBEST_ISLER`: `bekci`.
`dogrula.js`: tehdit alanları, `cagMin ≤ cagMax`, `secenekler` içinde `savun` zorunlu.

### 8.2 Durum ve kayıt
```
zorluk: 'normal'                      (metin, izinli ZORLUK anahtarları)
tehdit: { gerginlik, rng, un, haracSayac, sonSonuc: 'puskurtme'|'kismi'|'yenilgi'|null, artArdaYenilgi,
          aktif: { id, guc, aralik:[a,b], kalan, tavir, bilinen, erteleme, elciDenendi, tahkimat } | null,
          bekleme: { [tehditId]: tur }, iliski: { [kaynak]: sayi }, nefesKalan,
          gecmis: [ { tur, id, guc, savunma, sonuc } ]   (son 5) }
```
Kayıt **sürüm 3**: `GOCLER[2] = goc2to3` → `zorluk: 'normal'`, `tehdit` varsayılanı (gerginlik 0, `nefesKalan 10`: yüklenen
eski oyunda 10 tur tehdit yok). `DURUM_SEMASI`'na alanlar eklenir; mevcut alan silinmez.

### 8.3 Çekirdek değişiklikleri (yalnız liste)
- `core/tehdit.js` (yeni): `gerginlikArtis`, `doluluk`, `cekicilik`, `tehditGucu`, `tehditSec`, `adimTehdit`, `tehditVaris`, `beklenenSonuc` (UI önizleme, saf).
- `core/savunma.js`: bekçi kalemi, `savunmaDokum`, `savunmaTesti(d, bl, guc, profil)` (profil yoksa bugünkü davranış).
- `core/tur.js`: `ADIMLAR`'a `['m2', 'Tehdit', adimTehdit]` (m ile n arası); varış turunda n kötü olay seçmez.
- `core/olay.js`: motor açıkken `tur:'saldiri'` havuz dışı; varış bayrağına saygı.
- `core/komutlar.js`: `tehditTavirSec(durum, tavir)`, `haracOde(durum)`, `tahkimatYap(durum)`, `silahDagit(durum, adet)` → `{ durum, hata? }` (Türkçe hata).
- `core/eylem.js`: `nobet_tut`, `elci_gonder` sonuçları. `core/cag.js`: çağ atlarken gerginlik sınırı + nefes. `core/durum.js`: `yeniOyun(tohum, { zorluk })`.
- `save/kayit.js`: sürüm 3 + göç.

### 8.4 Arayüz gereksinimleri (yalnız liste)
1. Üst çubukta **tehdit çipi** (gerginlik kademesi ya da aktif uyarı + geri sayım + 🛡/⚔ renk).
2. **Tehdit penceresi** (çipe dokununca; mevcut pencere sistemi): açıklama, kaynak + ilişki, geri sayım, güç (kesin/aralık),
   savunma dökümü, beklenen sonuç satırı, seçenek düğmeleri (maliyet + risk etiketi), tavır seçimi.
3. Kaynak/iş panelinde **Bekçi** satırı ve savunma toplamı ("🛡 Savunma 14").
4. Varış bildirimi (sonuç + kayıplar + toparlanma ipucu) ve Önder sekmesinde yeni eylemler.
5. Yeni oyun ekranında **zorluk seçimi**; Ayarlar'da düşürme.
6. (İsteğe bağlı) sahne işaretleri: harita kenarında iz/duman/sancak; çit/kulede nöbetçi figürü.

---

## 9. Denge hedefleri

| Çağ | Tehdit sayısı (Normal) | Tipik güç | Püskürtme (hazırlıklı bot) | Yenilgi (pasif bot) |
|---|---|---|---|---|
| Göçebe | 1 (0–2) | 4–5 | ≥ %60 | ≤ %40, ölüm 0 |
| Taş Devri | 2 (1–3) | 6–10 | ≥ %60 | ≤ %50 |
| Bronz/Demir | 3 (2–4) | 12–20 | ≥ %65 | ≤ %50 |
| Antik | 4 (3–5) | 24–40 | ≥ %65 | ≤ %55 |
| Orta Çağ | 5 (4–6) | 50–85 | ≥ %60 | ≤ %60 |

- Ortalama tehdit kaybı (Normal, hazırlıklı bot): tehdit başına toplam stoğun ≤ %8'i; çağ başına tehdit kaynaklı ölüm ortalaması ≤ 1.
- Tehdit kaynaklı ek süre: çağ ortalaması en çok **+2 tur** (zorluk süreyi değil baskıyı artırmalı).

**Bot ölçütleri** (50 tohum, `tests/` ya da bot betiği; motor Normal):
1. Göçebe 20–32 turda biter: **≥ 40/50 tohum** (bugün 42/50; en çok 2 tohum kayıp kabul).
2. Taş Devri 32–50 turda biter: ≥ 40/50.
3. Hiçbir tohumda nüfus < 2 yok (%100); hiçbir tehditte bir kaynakta > %25 kayıp yok.
4. Aynı tohum + aynı komutlar → aynı tehditler (determinizm); ayrı `tehdit.rng` sayesinde `durum.rng` dizisi
   motorsuz oyunla birebir aynı.
5. Pasif bot (hiç hazırlık yok) yine çağ atlar (ölüm sarmalı yok): Göçebe ≤ 36 tur ≥ 45/50.
6. Rahat/Zor ile Normal arasında çağ süresi farkı ≤ 3 tur (ortalama).

---

## 10. MVP dilimi

**Kapsam:** Göçebe + Taş Devri.
- 3 tehdit: `kurt_surusu` (yırtıcı), `avci_cetesi` (akıncı), `komsu_baskini` (baskın; kaynak A seçeneği, soyut komşu).
- 1 yeni savunma yolu: **Bekçi** serbest işi (mevcut Gözcü Direği / Nöbet Çiti zaten sayılır).
- Seçenekler: Savun · Haraç/Yem bırak · Saklan/Kampı taşı. (Tahkimat, Silah, Nöbet Tut, Elçi = MVP+1.)
- 1 uyarı çipi + 1 tehdit penceresi + varış bildirimi. Zorluk: yalnız Normal ve Barışçıl (Rahat/Zor = MVP+1).
- Kayıt v3 + göç; `kurt_surusu` olayı motor açıkken havuz dışı.

**Test planı**
- Birim (`tests/tehdit.test.js`): güç formülü ve `gucUst`; gerginlik artışı/sıfırlanması (püskürtme −20, haraç 0, yenilgi −30);
  ilk gün ve çağ nefesi; tek aktif tehdit; uyarı süresi (+1 Gözcü); varsayılan tavır Savun; üç sonuç eşiği ve tür profili;
  kış azığı ve %25 tavanı; konut/merkez hasar dışı; Göçebe'de ölüm yok; `acTur > 0` iken doğum yok; Barışçıl'da yalnız yırtıcı;
  komut hataları Türkçe ve durum değişmez; `savunmaDokum` toplamı = `savunmaHesapla`.
- Determinizm: aynı tohum iki koşu eşit; ayrı `tehdit.rng` mevcut olay dizisini değiştirmiyor.
- Kayıt: v2 kaydı → v3 (alanlar varsayılan, `nefesKalan 10`), v3 gidiş-dönüş eşit.
- Bot: §9 ölçütleri 1, 3, 4, 5 (MVP'de Göçebe + Taş).
- e2e (tarayıcı): çip görünür, pencere açılır, Haraç düğmesi stok düşürür, varış bildirimi çıkar (denenmedi — uygulama sonrası).

---

## 11. Açık sorular (kullanıcıya)

1. **Karar penceresi oyunu durdursun mu?** ÖNERİ: hayır — uyarı süresince tavır seçilir, varışta yalnız sonuç bildirimi (hızlı tempo).
   Olay gibi durduran pencere yalnız Kuşatma'da (çağın büyük anı).
2. **Gerginlik sayısı görünsün mü?** ÖNERİ: 3 kademe çip herkes için; sayı ve kesin güç Gözcü Direği/keşifle açılır (keşfe değer katar).
3. **Göçebe'de tehdit can alsın mı?** ÖNERİ: hayır, yalnız yaralı + yiyecek kaybı; ölüm Taş Devri'nden itibaren (kilitli).
4. **Zorluk/Barışçıl:** ÖNERİ varsayılan Normal; Barışçıl seçilebilir; zorluk her an düşer, yalnız yeni oyunda yükselir.
5. **Komşu sistemi:** ÖNERİ şimdi A (soyut kaynak + ilişki), kahraman/sefer adımında B; C yalnız Sanayi/Modern kararıyla.
6. **Karşı saldırı şimdi mi?** ÖNERİ: hayır; sefer sistemine bırakılsın (aynı ganimet tablosunu kullanır).
