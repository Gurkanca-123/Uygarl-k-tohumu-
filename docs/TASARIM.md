# Uygarlık Tohumu — Tasarım belgesi (aşama 0)

> Uygulayıcılar için bağlayıcı kaynak. Sayılar bilinçli olarak birbirine bağlıdır; birini değiştiren, bağlı olduğu satırları
> (özellikle §7 denge kontrolleri) da gözden geçirir. Tüm sayılar `src/data/` tablolarına girer, koda gömülmez.
> Kısaltmalar: **BP** = bilgi puanı · **Sv** = bina seviyesi · **tur** = 1 gün.

---

## 1. Çekirdek döngü ve tur akışı

**Zaman:** 1 tur = 1 gün. 1 mevsim = 5 gün. 1 yıl = 4 mevsim = 20 gün. Oyun **Bahar 1. gün** başlar.
Gerekçe: gün gün karar vermek Punch Club'daki "bugün ne yapayım" hissini verir; 5 günlük mevsim, ilk kışın 16. turda gelmesini
sağlar — oyuncu ilk 15 turda kışa hazırlanmak zorunda kalır (ilk gerilim).

**Önder:** Kabilenin başı, nüfusa sayılmaz, yemek yemez. Her tur **1 önder eylemi** yapar (§1.3). `yorgunluk` 0–6 göstergesi vardır.

### 1.1 Oyuncu evresi (tur ilerlemez, sıra serbest)
1. **Bekleyen olay** varsa önce onu çözer (zorunlu; diğer düğmeler kilitli).
2. **İş atama:** kişileri bina yuvalarına / serbest işlere / işsize sürükler. Ücretsiz, sınırsız değişiklik.
3. **İnşa / yükselt / onar / yık:** maliyet anında düşer. Aynı anda süren inşaat sınırı çağa bağlı (§3.5).
4. **Araştırma:** açık bir buluş seçer (tek seferde 1).
5. **Önder eylemi** seçer (seçmezse "Dinlen" sayılır).
6. Antik+'da **vergi oranı**, Pazar varsa **takas** (§4.3).
7. **"Günü bitir"** → çözümleme.

### 1.2 Tur sonu çözümleme (`turIlerlet`, saf fonksiyon, sıra sabit)
| # | Adım | Not |
|---|---|---|
| a | Önder eylemi sonucu | RNG durumdan (`rng`) |
| b | İnşaat ilerlemesi | `insaKalan − 1`; 0 olan bina **bu tur** çalışmaya başlar |
| c | Bakım ödemesi | ödenemeyen binanın bu tur etkisi yok (üretim, huzur, savunma) |
| d | Ham üretim | §2.4 formülü; işçisiz sabit üretimler dahil |
| e | Dönüşüm binaları | girdi depoda yoksa o işçi üretmez (kısmi çalışma serbest) |
| f | Depo tavanına kırpma | fazla kaybolur, uyarı gösterilir |
| g | Tüketim | yiyecek (nüfus × 1), kışta ısınma odunu |
| h | Yiyecek bozulması | §2.3 |
| i | Açlık / ısınma kontrolü | `acTur` sayacı |
| j | Huzur güncelle | §2.6 |
| k | Nüfus: kayıp → doğum | §2.5, kayıp kilidi §7.3 |
| l | BP ekle → araştırma | tamamlanan buluşun etkisi bir sonraki turdan |
| m | Değiştiricilerin süresi −1 | 0 olan silinir |
| n | Olay kontrolü | en fazla 1 olay, sonraki oyuncu evresinde gösterilir |
| o | Takvim | `tur + 1`, mevsim/yıl; çağ şartları kontrolü (düğme yanar) |
| p | Otomatik kayıt | §8 — çekirdek dışında: `turIlerlet` `{ durum, bildirimler }` döner, kaydı çağıran katman yapar (`src/save` `turIlerletVeKaydet`) |

### 1.3 Önder eylemleri (`src/data/eylemler.js`)
Yorgunluk 6 iken yalnız **Dinlen** seçilebilir. Sonuçlardaki kaynak miktarları `× (1 + 0,5 × çağSırası)` ile ölçeklenir (çağSırası 0–4).

| Eylem | Çağ | Yorgunluk | Sonuç |
|---|---|---|---|
| Avlan | Göçebe | +2 | +4 yiyecek, +1 deri; %10 yaralanma → önder 2 tur yalnız Dinlen |
| Keşfet | Göçebe | +2 | %40: +6 odun ya da +4 taş · %25: +3 BP · %15: "Yabancı Aile" olayı · %10: "Kurt Sürüsü" olayı · %10: boş |
| Hikâye Anlat | Göçebe | +1 | +2 BP, +2 huzur (anında) |
| Dinlen | Göçebe | −3 | — |
| Alet Yap | Taş Devri | +1 | 2 taş + 1 odun → 1 alet |
| Kervan Gönder | Bronz | +2 | Pazar gerekir; 20 birim tek kaynak verilir → 3 tur sonra seçilen kaynaktan 15 birim gelir |
| Halka Hitap | Antik | +1 | +6 huzur (vergi Yüksek ise +10) |
| Turnuva Düzenle | Orta Çağ | +2 | −20 sikke; +10 huzur; 3 tur savunma +10 |

---

## 2. Kaynaklar ve nüfus modeli

### 2.1 Kaynak listesi
Depolanan kaynaklar 12 adettir. **BP** ayrı göstergedir; depo tavanı yoktur, depoya sayılmaz.

| Kaynak | id | Açıldığı çağ | Kaynak (üretim) | Tüketim |
|---|---|---|---|---|
| Yiyecek | `yiyecek` | Göçebe | serbest Toplayıcı/Avcı, Avcı Kulübesi, Toplayıcı Barınağı, Balıkçı, Tarla, Ağıl, Liman, Çiftlik | nüfus × 1/tur, bozulma, Mabet bakımı, olaylar |
| Odun | `odun` | Göçebe | serbest Oduncu, Oduncu Kampı, orman temizleme (+5) | inşaat, kış ısınması, Fırın/Demirci/Alet girdisi, Hamam bakımı |
| Taş | `tas` | Göçebe | serbest Taşçı, Taş Ocağı | inşaat, Alet Yapımcısı girdisi |
| Deri | `deri` | Göçebe | serbest Avcı, Avcı Kulübesi, Ağıl | Çadır, Kurutma Rafı, Dokuma girdisi, takas |
| Alet | `alet` | Taş Devri | Alet Yapımcısı, Demirci, Alet Yap eylemi | inşaat (Taş Devri+) |
| Kil | `kil` | Bronz/Demir | Kil Ocağı | Kerpiç Ev, Bronz binaları |
| Cevher | `cevher` | Bronz/Demir | Maden Ocağı | Eritme Fırını girdisi |
| Metal | `metal` | Bronz/Demir | Eritme Fırını | inşaat, Demirci, Darphane girdisi |
| Mermer | `mermer` | Antik | Mermer Ocağı | Antik/Orta Çağ anıtsal binaları |
| Sikke | `sikke` | Antik | vergi, Darphane, Han | bakım, inşaat, olaylar |
| Kumaş | `kumas` | Orta Çağ | Dokuma Atölyesi | Lonca, Darüşşifa, Katedral |
| Kitap | `kitap` | Orta Çağ | Manastır | Orta Çağ buluşları, Katedral |

### 2.2 Serbest işler (bina gerektirmez, sınırsız yuva, merkez bina sağlar)
| İş | İşçi başına/tur | Mevsim etiketi |
|---|---|---|
| Toplayıcı | 2 yiyecek | `toplama` |
| Avcı | 1 yiyecek + 0,5 deri | `avcilik` |
| Oduncu | 1 odun | — |
| Taşçı | 1 taş (Taş Yontma ile 1,5) | — |

Binalar serbest işten daha verimlidir; serbest işler her zaman güvenlik ağıdır (açlıkta §7.3 ile +%50).

### 2.3 Depo ve bozulma
- Merkez bina depo tavanı (her kaynak için ayrı): Göçebe 30 · Taş 60 · Bronz 120 · Antik 200 · Orta Çağ 300. Depo binaları ekler.
- **Yiyecek bozulması:** her tur stokun `%4`'ü. Her Kurutma Rafı / Erzak Çukuru / Ambar ve Çömlekçilik buluşu −1 puan; en az `%1`.
- Diğer kaynaklar bozulmaz.

### 2.4 Üretim formülü
```
uretim = isciBasina × isciSayisi × seviyeCarpani × (1 + bitisiklik) × mevsimCarpani × huzurCarpani × bulusCarpani × yolCarpani
```
- `seviyeCarpani`: Sv1 1,0 · Sv2 1,5 · Sv3 2,0
- `bitisiklik`: §3.3, toplam en fazla +0,50
- `huzurCarpani`: huzur ≥70 → 1,10 · 30–69 → 1,00 · 15–29 → 0,85 · <15 → 0,70
- `bulusCarpani`: ilgili buluşların çarpımı (örn. Mızrak Ucu avcılık ×1,25)
- `yolCarpani`: §3.4 (Bronz+), aksi 1,0
- Dönüşüm binalarında girdi de `isciSayisi × seviyeCarpani` ile ölçeklenir; diğer çarpanlar yalnız çıktıya uygulanır.
- Sonuçlar ondalıklı tutulur, arayüz aşağı yuvarlar.

**Mevsim çarpanları** (`src/data/mevsimler.js`):
| Etiket | Bahar | Yaz | Güz | Kış |
|---|---|---|---|---|
| `toplama` | 1,0 | 1,25 | 1,0 | 0,5 |
| `avcilik` | 1,0 | 1,0 | 1,1 | 0,8 |
| `tarim` | 1,0 | 1,25 | 1,5 | 0 (Üçlü Ekim ile 0,3) |
| `balik` | 1,0 | 1,0 | 1,0 | 0,8 |
| diğer | 1,0 | 1,0 | 1,0 | 1,0 |

### 2.5 Nüfus
- **Herkes çalışabilir** (yaş yok). Kişi: bir bina yuvasında, serbest işte ya da işsiz.
- **Barınma:** kapasite = Σ konut kapasitesi. `evsiz = max(0, nüfus − kapasite)`.
- **Tüketim:** kişi başına 1 yiyecek/tur. Kışta her konut `isinma` kadar odun yakar.
- **Açlık:** yiyecek ihtiyacı karşılanmazsa yiyecek 0'a iner, `acTur + 1` (karşılanırsa `acTur = 0`).
  `acTur ≥ 3` → 1 kişi ölür ve `acTur = 1` (kayıp kilidine tabi, §7.3).
- **Isınma eksikliği:** kışta odun yetmezse o tur huzur cezası ve hastalık riski ×2.
- **Doğum:** her `dogumAraligi` turda bir kez denetlenir (Göçebe 4 · Taş 4 · Bronz 3 · Antik 3 · Orta 3). Şartlar: boş barınak ≥1,
  yiyecek ≥ nüfus × 2, huzur ≥40, `acTur = 0`. Doğan sayı = `min(1 + floor(nüfus / 30), boşBarınak)`.
- **Göç (huzursuzluk):** huzur <15 iken her tur %20 olasılıkla 1 kişi ayrılır (kayıp kilidine tabi).
- **Göçmenler:** yalnız olaylarla gelir (§6).
- **İş atama kuralı:** doğan/gelen kişi otomatik olarak "Toplayıcı" serbest işine yazılır (yeni oyuncu açlığa düşmesin).

### 2.6 Huzur (0–100, başlangıç 60)
```
hedef = 50
      + Σ bina.huzur            (aynı türden 2. ve sonraki binalar %50 sayılır)
      + (evsiz = 0 ? +5 : −5 × evsiz)
      − 15  (bu tur açlık varsa)
      − 10  (kışta ısınma eksikse)
      − 2 × işsiz
      − max(0, nüfus − kalabalikEsigi)      Göçebe 10 · Taş 22 · Bronz 50 · Antik 95 · Orta 160
      + vergi cezası (Yok 0 · Düşük −3 · Yüksek −10)
      + bitişiklik huzur etkileri (§3.3) + Σ değiştirici.huzur
huzur = clamp(huzur + clamp(hedef − huzur, −5, +5), 0, 100)
```
Anında huzur etkileri (olay, Hikâye Anlat) doğrudan `huzur`'a eklenir; hedefe doğru kayma her tur yine işler.
Başlangıç kontrolü: 50 + Kamp Ateşi 5 + barınaklı 5 = **60** (= başlangıç değeri, ilk turlarda dalgalanma yok).

---

## 3. Izgara ve bina sistemi

### 3.1 Izgara
- Dünya **16×16** karo, tohumlu (`tohum`) üretilir. Açık (kullanılabilir) alan merkezden kare olarak büyür:
  Göçebe 8×8 · Taş 10×10 · Bronz 12×12 · Antik 14×14 · Orta Çağ 16×16.
- Karo türleri (`src/data/karolar.js`): `cimen` (inşa edilir) · `orman` (inşa edilmez; 1 tur "temizle" → +5 odun, `cimen` olur)
  · `tasli` (inşa edilmez, taş yatağı) · `su` (inşa edilmez) · `verimli` (inşa edilir, tarım bonusu) · `cevher` (Bronz'da görünür)
  · `mermer` (Antik'te görünür). `cevher`/`mermer` yalnız ilgili ocak binası üstüne kurulabilir.
- Üretim garantileri (açık Göçebe alanında): ≥6 orman, ≥2 taşlı, ≥3 su kenarı karosu, ≥2 verimli; merkez 2×2 boş.
  Her açılan halkada ≥2 `cevher` (Bronz halkası) ve ≥2 `mermer` (Antik halkası).

### 3.2 Bina boyutları ve yerleşim
- Boyutlar: **1×1** (konut, küçük atölye), **2×2** (üretim, depo, kamu), **3×3** (tekil büyük yapılar, anıt). Döndürme yok.
- Tüm karolar açık alanda, boş ve inşa edilebilir olmalı; `karoUstu` (örn. Maden: en az 1 kaplanan karo `cevher`) ve
  `karoBitisik` (örn. Taş Ocağı: bitişik ≥1 `tasli`) şartları veri tablosundan okunur.
- **Yıkım:** anında, ödenen taban maliyetin %50'si iade. Merkez bina yıkılamaz/taşınamaz.
- **Hasar:** olaylar binayı `hasarli` yapabilir: üretmez, huzur/savunma vermez. **Onar:** taban maliyetin %25'i, 1 tur.

### 3.3 Bitişiklik
- **Bitişik** = binanın kapladığı alanın dışında, kenar paylaşan (4 yön, çapraz değil) karolar/binalar.
- Kural biçimi: `{ hedef: 'karo:orman' | 'bina:<id>' | 'etiket:<etiket>', etki: { uretim: 0.25 } | { huzur: -2 }, max: 2 }`
  (`max` = bu kuralın sayılabileceği en fazla bitişik adedi; aynı bina iki kez sayılmaz).
- Üretim bonusları toplanır, **toplam en fazla +0,50**. Huzur etkileri genel huzur hedefine eklenir.
- **Etki alanı** (`etkiAlani`): `{ yaricap, hedefEtiket, etki }`, Chebyshev uzaklığı (karelik alan), binaların en yakın karoları arasında.
  Etki alanı bonusları bitişiklik sınırına dahil değildir; aynı türden etki alanları üst üste binmez (en yükseği geçer).
- Genel kurallar: `etiket:atolye` olan bina bir konuta bitişikse o konut başına −2 huzur (gürültü, Bronz+).

### 3.4 Yol (Bronz+)
- Yol karosu: 1 taş, anında. Yalnız `cimen`/`verimli` üstüne.
- `cag ≥ bronz` olan binalar merkez binaya yol (veya merkez binaya doğrudan bitişiklik) ile bağlı değilse `yolCarpani = 0,75`.
  Göçebe/Taş binaları yoldan muaftır (eski köy dokusu).

### 3.5 Yükseltme ve inşaat
- Seviyeler: Sv1–Sv3. **Sv2** bina kendi çağındayken; **Sv3** bir sonraki çağa geçince açılır (Orta Çağ binaları Sv3'ü Gotik Mimari ile açar).
- Yükseltme maliyeti: Sv2 = `taban × 1,5`, Sv3 = `taban × 2,5` (adet çarpanı uygulanmaz). Süre = taban süre.
- Sv etkisi: üretim ×1,0/1,5/2,0 · işçi yuvası +0/+1/+2 · konut kapasitesi +0/+1/+2 · huzur/savunma/depo ×1,0/1,5/2,0.
- Yükseltme sırasında bina çalışmaya devam eder.
- Eşzamanlı inşaat sınırı (yükseltme dahil): Göçebe 1 · Taş 2 · Bronz 2 · Antik 3 · Orta 3.

---

## 4. Çağlar

Ortak sütunlar: **Maliyet** (taban; §7.2 ile artar) · **Süre** (tur) · **İşçi** (Sv1 yuva) · **Üretim** (işçi başına/tur, aksi yazılmadıkça).
Önceki çağların binaları kalır ve kurulmaya devam eder. Çağ atlama bir **eylemdir**: şartlar sağlanınca "Çağ Atla" düğmesi
yanar, maliyet ödenir, sonraki tur yeni çağ başlar: merkez bina dönüşür, harita büyür, yeni binalar/kaynaklar açılır.

### 4.1 Göçebe Çağı (`gocebe`) — hedef ~25 tur, nüfus 3 → 8
**Ana sorun:** ilk kışı atlatmak — yiyecek stoklama ile barınak/ısınma arasında az iş gücünü bölmek.
**Merkez:** Kamp Ateşi (2×2, başlangıçta kurulu): huzur +5, depo 30, +0,5 BP, serbest işler.
**Konut:** Çadır.

| Bina | id | Boyut | Maliyet | Süre | İşçi | Etki / üretim | Açılış |
|---|---|---|---|---|---|---|---|
| Çadır | `cadir` | 1×1 | 5 odun, 2 deri | 1 | — | kapasite 3, ısınma 1 | başta |
| Avcı Kulübesi | `avci_kulubesi` | 1×1 | 8 odun | 1 | 2 | 1,5 yiyecek + 0,75 deri (`avcilik`); orman bitişik +0,25 (max 2) | başta |
| Toplayıcı Barınağı | `toplayici_barinagi` | 1×1 | 6 odun | 1 | 2 | 3 yiyecek (`toplama`); orman/su bitişik +0,25 (max 2) | başta |
| Oduncu Kampı | `oduncu_kampi` | 1×1 | 6 odun | 1 | 2 | 2 odun; orman bitişik +0,25 (max 2) | başta |
| Kurutma Rafı | `kurutma_rafi` | 1×1 | 6 odun, 2 deri | 1 | — | depo +20 yiyecek, bozulma −1 puan | Deri İşleme |
| Totem | `totem` | 1×1 | 4 odun, 4 taş | 2 | — | huzur +6, +1 BP; tekil | Taş Yontma |
| Gözcü Direği | `gozcu_diregi` | 1×1 | 6 odun, 2 taş | 1 | 1 nöbetçi | savunma +2, nöbetçi +1; Keşfet iyi sonuç +%10 | Hayvan İzleri |
| Şifacı Çadırı | `sifaci_cadiri` | 1×1 | 8 odun, 3 deri | 2 | 1 | +0,3 BP; huzur +3; hastalık olaylarında kayıplar yarıya | başta (0.2) |

**Yeni kaynaklar:** yiyecek, odun, taş, deri.
**Taş Devri'ne geçiş:** nüfus ≥8 · Çadır ≥3 · Totem 1 · buluş **Yerleşik Hayat** · maliyet 30 yiyecek, 25 odun, 15 taş, 10 deri.

### 4.2 Taş Devri (`tasdevri`) — hedef ~40 tur, nüfus 8 → 20
**Ana sorun:** alet darboğazı ve yiyeceğin mevsime bağımlılığı (ilk tarım + depolama).
**Merkez:** Ocak Meydanı: huzur +5, depo 60, +1 BP, eşzamanlı inşaat 2. **Konut:** Kulübe. **Açılan eylem:** Alet Yap.

| Bina | id | Boyut | Maliyet | Süre | İşçi | Etki / üretim | Açılış |
|---|---|---|---|---|---|---|---|
| Kulübe | `kulube` | 1×1 | 8 odun, 4 taş | 2 | — | kapasite 4, ısınma 0,5 | çağ başı |
| Taş Ocağı | `tas_ocagi` | 2×2 | 12 odun | 3 | 3 | 1,5 taş; `karoBitisik: tasli` zorunlu | çağ başı |
| Alet Yapımcısı | `alet_yapimcisi` | 1×1 | 10 odun, 8 taş | 2 | 2 | girdi 1 taş + 0,5 odun → 0,5 alet; `atolye` | çağ başı |
| Erzak Çukuru | `erzak_cukuru` | 1×1 | 8 odun, 6 taş | 1 | — | depo +30 yiyecek, +20 odun/taş/deri/alet; bozulma −1 puan | çağ başı |
| Nöbet Çiti | `nobet_citi` | 1×1 | 8 odun, 4 taş | 1 | 2 nöbetçi | savunma +3, nöbetçi +1 | çağ başı |
| Balıkçı Sığınağı | `balikci_siginagi` | 1×1 | 10 odun, 2 alet | 2 | 2 | 2,5 yiyecek (`balik`); `karoBitisik: su` zorunlu | Balıkçılık |
| Tahıl Bahçesi | `tahil_bahcesi` | 2×2 | 10 odun, 2 alet | 2 | 2 | 3 yiyecek (`tarim`); verimli bitişik +0,25 (max 2) | Tohum Ekme |
| Ağıl | `agil` | 2×2 | 15 odun, 5 taş | 2 | 1 | 2 yiyecek + 1 deri (mevsimden etkilenmez) | Evcilleştirme |
| Mağara Resmi Yeri | `magara_resmi` | 2×2 | 10 taş, 4 alet | 3 | 1 | huzur +8, +1 BP, işçi +0,5 BP; tekil | çağ başı |

**Yeni kaynak:** alet.
**Bronz/Demir'e geçiş:** nüfus ≥20 · Kulübe ≥5 · Taş Ocağı ≥1 · Tahıl Bahçesi ≥2 · buluş **Maden Eritme** ·
maliyet 60 yiyecek, 50 odun, 40 taş, 15 alet.

### 4.3 Bronz/Demir Çağı (`bronz`) — hedef ~60 tur, nüfus 20 → 45
**Ana sorun:** üç aşamalı metal zinciri (cevher → metal → alet) ve yoğun köyde hastalık; ilk bakım giderleri.
**Merkez:** Köy Meydanı: huzur +6, depo 120, +1,5 BP. **Konut:** Kerpiç Ev. **Yeni kural:** yol (§3.4), atölye gürültüsü.
**Açılan eylem:** Kervan Gönder.

| Bina | id | Boyut | Maliyet | Süre | İşçi | Etki / üretim | Açılış |
|---|---|---|---|---|---|---|---|
| Kerpiç Ev | `kerpic_ev` | 1×1 | 6 odun, 10 kil | 2 | — | kapasite 5, ısınma 0,5 | çağ başı |
| Kil Ocağı | `kil_ocagi` | 1×1 | 10 odun, 4 alet | 1 | 2 | 2 kil; `karoBitisik: su` zorunlu | çağ başı |
| Maden Ocağı | `maden_ocagi` | 2×2 | 20 odun, 10 taş, 6 alet | 3 | 3 | 1 cevher; `karoUstu: cevher` | çağ başı |
| Eritme Fırını | `eritme_firini` | 1×1 | 15 kil, 10 taş | 2 | 2 | girdi 1 cevher + 1 odun → 1 metal; `atolye` | çağ başı |
| Demirci | `demirci` | 1×1 | 15 kil, 5 metal | 2 | 2 | girdi 0,5 metal + 0,5 odun → 1 alet; `atolye` | Tunç Döküm |
| Sulanan Tarla | `sulanan_tarla` | 2×2 | 10 odun, 15 kil, 4 alet | 2 | 3 | 4 yiyecek (`tarim`); 2 karo içinde su varsa +0,25 | Sulama |
| Ambar | `ambar` | 2×2 | 20 odun, 20 kil | 2 | — | depo +60 yiyecek, +40 diğer; bozulma −1 puan | çağ başı |
| Pazar Yeri | `pazar_yeri` | 2×2 | 20 odun, 20 kil, 5 metal | 3 | 1 | takas açılır (3 birim → 2 birim, tur başına en çok 20 birim verilir); ticaret olayı ağırlığı ×2; tekil | Takas |
| Kuyu | `kuyu` | 1×1 | 10 taş, 5 kil | 1 | — | huzur +2; hastalık kapasitesi +15 (§6.4) | çağ başı |
| Muhafız Kulesi | `muhafiz_kulesi` | 1×1 | 15 taş, 5 metal | 2 | 2 nöbetçi | savunma +6, nöbetçi +2 | çağ başı |
| Mabet | `mabet` | 2×2 | 30 kil, 20 taş, 5 metal | 4 | 1 | huzur +12, +2 BP, rahip +1 BP; bakım 1 yiyecek; tekil | çağ başı |

**Yeni kaynaklar:** kil, cevher, metal.
**Antik Çağ'a geçiş:** nüfus ≥45 · Kerpiç Ev ≥9 · Mabet 1 · Pazar Yeri 1 · buluş **Yazı** ·
maliyet 120 yiyecek, 80 odun, 80 kil, 60 taş, 30 metal.

### 4.4 Antik Çağ (`antik`) — hedef ~80 tur, nüfus 45 → 90
**Ana sorun:** sikke ekonomisi — kamu binalarının bakımı ile vergi huzursuzluğu arasında denge; şehir hastalıkları.
**Merkez:** Agora: huzur +8, depo 200, +2 BP, eşzamanlı inşaat 3. **Konut:** Taş Ev. **Açılan eylem:** Halka Hitap.
**Vergi** (Para buluşuyla): Yok / Düşük / Yüksek = kişi başı 0 / 0,1 / 0,25 sikke/tur; huzur 0 / −3 / −10.
Bakımı ödenemeyen bina o tur kapalıdır (§1.2 c); ödeme sırası: tekil binalar önce, sonra inşa sırası.

| Bina | id | Boyut | Maliyet | Süre | İşçi | Etki / üretim | Açılış |
|---|---|---|---|---|---|---|---|
| Taş Ev | `tas_ev` | 1×1 | 15 taş, 5 kil, 2 metal | 3 | — | kapasite 6, ısınma 0,5 | çağ başı |
| Mermer Ocağı | `mermer_ocagi` | 2×2 | 30 odun, 20 taş, 10 alet | 3 | 3 | 1 mermer; `karoUstu: mermer` | çağ başı |
| Bağ-Bahçe | `bag_bahce` | 2×2 | 20 odun, 10 alet | 2 | 2 | 2,5 yiyecek (`tarim`); huzur +2 | çağ başı |
| Darphane | `darphane` | 1×1 | 30 taş, 10 metal | 3 | 2 | girdi 0,5 metal → 2 sikke; `atolye`; tekil | Para |
| Liman | `liman` | 2×2 | 40 odun, 20 taş | 3 | 2 | 3 yiyecek (`balik`); takas oranı 4 → 3; `karoBitisik: su` | Denizcilik |
| Su Kemeri | `su_kemeri` | 2×2 | 40 taş, 10 mermer | 4 | — | etki alanı 4: `tarim` +0,20; hastalık kapasitesi +40 | Mühendislik |
| Hamam | `hamam` | 2×2 | 40 taş, 10 mermer, 10 kil | 3 | — | huzur +8; hastalık kapasitesi +30; bakım 1 odun | çağ başı |
| Kütüphane | `kutuphane` | 2×2 | 40 taş, 15 mermer, 10 sikke | 4 | 2 | bilgin +1,5 BP; bakım 1 sikke | Felsefe |
| Tiyatro | `tiyatro` | 3×3 | 60 taş, 30 mermer, 20 sikke | 6 | — | huzur +20; bakım 2 sikke; tekil | Mühendislik |
| Kışla | `kisla` | 2×2 | 40 taş, 20 metal | 4 | 4 asker | savunma +5, asker +3; bakım 1 sikke | çağ başı |

**Yeni kaynaklar:** mermer, sikke.
**Orta Çağ'a geçiş:** nüfus ≥90 · Taş Ev ≥15 · Kütüphane ≥1 · Tiyatro 1 · buluş **Feodal Düzen** ·
maliyet 200 yiyecek, 150 taş, 80 mermer, 100 sikke, 50 metal.

### 4.5 Orta Çağ (`ortacag`) — hedef ~100 tur, nüfus 90 → 150 (son çağ)
**Ana sorun:** kuşatmalar ve salgın (Kara Ölüm) altında büyük anıtı (Katedral) bitirmek; lonca/bakım yükü.
**Merkez:** Şehir Meydanı: huzur +10, depo 300, +2,5 BP. **Konut:** Yarı Ahşap Ev (karar §11.4; "Surlu şehir" çağın kimliği). **Açılan eylem:** Turnuva Düzenle.

| Bina | id | Boyut | Maliyet | Süre | İşçi | Etki / üretim | Açılış |
|---|---|---|---|---|---|---|---|
| Yarı Ahşap Ev | `yari_ahsap_ev` | 1×1 | 20 odun, 20 taş, 5 metal | 3 | — | kapasite 8, ısınma 1 | çağ başı |
| Çiftlik | `ciftlik` | 3×3 | 40 odun, 20 taş, 10 metal | 3 | 4 | 5 yiyecek (`tarim`) | Üçlü Ekim |
| Değirmen | `degirmen` | 2×2 | 40 odun, 20 taş, 10 metal | 3 | 1 | etki alanı 3: `tarim` +0,25 (işçi yoksa kapalı) | Su Değirmeni |
| Dokuma Atölyesi | `dokuma_atolyesi` | 1×1 | 30 odun, 10 metal | 2 | 2 | girdi 1 deri → 1 kumaş; `atolye` | Dokumacılık |
| Manastır | `manastir` | 3×3 | 80 taş, 20 mermer, 30 sikke | 6 | 3 | keşiş +1 BP + 0,3 kitap; huzur +10 | çağ başı |
| Lonca Binası | `lonca_binasi` | 2×2 | 60 taş, 30 sikke, 20 kumaş | 4 | — | tüm `atolye` +0,20 (bitişiklik sınırı dışı); bakım 2 sikke; tekil | Lonca Sistemi |
| Han | `han` | 2×2 | 50 odun, 40 taş, 20 sikke | 3 | — | +2 sikke/tur sabit; ticaret ×2, göçmen ×1,5 olay ağırlığı (toplam ticaret çarpanı en çok ×3) | çağ başı |
| Darüşşifa | `darussifa` | 2×2 | 60 taş, 20 kumaş, 20 sikke | 4 | 2 | huzur +5; hastalık kapasitesi +60 (işçi yoksa +20) | Dokumacılık |
| Sur Parçası | `sur_parcasi` | 1×1 | 10 taş | 1 | — | savunma +0,5 (açık alan kenarında +1) | çağ başı |
| Kale | `kale` | 3×3 | 150 taş, 40 metal, 50 sikke | 6 | 4 şövalye | savunma +25, şövalye +5; bakım 3 sikke; tekil | çağ başı |
| Katedral | `katedral` | 3×3 | 300 taş, 100 mermer, 150 sikke, 40 kumaş, 30 kitap | 20 | — | huzur +30; anıt; tamamlanınca **zafer** şartı | Gotik Mimari |

**Yeni kaynaklar:** kumaş, kitap.
**Zafer:** Katedral tamamlandı · nüfus ≥150. Zaferden sonra oyun serbest kipte sürer (karar §11.5).

---

## 5. Buluş ağacı (`src/data/buluslar.js`)

BP her tur araştırılan buluşa akar; buluş seçilmemişse `bilgiHavuz`'da birikir ve seçilince aktarılır.
Bir çağın buluşu yalnız o çağda (veya sonrasında) araştırılabilir. ★ = çağ buluşu (geçiş şartı).

| Çağ | Buluş | id | Maliyet | Gerekir | Açar / etki |
|---|---|---|---|---|---|
| Göçebe | Mızrak Ucu | `mizrak_ucu` | 6 BP | — | `avcilik` ×1,25; önder savunma +1 |
| Göçebe | Taş Yontma | `tas_yontma` | 10 BP | — | Totem; serbest Taşçı 1 → 1,5 |
| Göçebe | Hayvan İzleri | `hayvan_izleri` | 8 BP | — | Gözcü Direği; Keşfet iyi sonuç +%10 |
| Göçebe | Deri İşleme | `deri_isleme` | 8 BP | Mızrak Ucu | Kurutma Rafı; deri üretimi ×1,25 |
| Göçebe | ★ Yerleşik Hayat | `yerlesik_hayat` | 12 BP | Taş Yontma, Deri İşleme | Taş Devri'ne geçiş |
| Taş | Balıkçılık | `balikcilik` | 15 BP | Mızrak Ucu | Balıkçı Sığınağı |
| Taş | Tohum Ekme | `tohum_ekme` | 18 BP | Yerleşik Hayat | Tahıl Bahçesi |
| Taş | Evcilleştirme | `evcilestirme` | 20 BP | Hayvan İzleri | Ağıl |
| Taş | Çömlekçilik | `comlekcilik` | 22 BP | Tohum Ekme | bozulma −1 puan; Erzak Çukuru depo ×1,5 |
| Taş | ★ Maden Eritme | `maden_eritme` | 30 BP | Çömlekçilik | Bronz'a geçiş |
| Bronz | Takas | `takas` | 35 BP | — | Pazar Yeri |
| Bronz | Sulama | `sulama` | 35 BP | Tohum Ekme | Sulanan Tarla |
| Bronz | Tunç Döküm | `tunc_dokum` | 40 BP | Maden Eritme | Demirci; alet üretimi ×1,25 |
| Bronz | Demir İşleme | `demir_isleme` | 55 BP | Tunç Döküm | metal üretimi ×1,5; nöbetçi değeri ×1,5 |
| Bronz | ★ Yazı | `yazi` | 60 BP | Takas | Antik'e geçiş |
| Antik | Para | `para` | 65 BP | Yazı | Darphane, vergi |
| Antik | Felsefe | `felsefe` | 70 BP | Yazı | Kütüphane |
| Antik | Denizcilik | `denizcilik` | 70 BP | Takas | Liman |
| Antik | Mühendislik | `muhendislik` | 80 BP | Yazı | Su Kemeri, Tiyatro |
| Antik | ★ Feodal Düzen | `feodal_duzen` | 120 BP | Mühendislik, Para | Orta Çağ'a geçiş |
| Orta | Dokumacılık | `dokumacilik` | 110 BP | — | Dokuma Atölyesi, Darüşşifa |
| Orta | Üçlü Ekim | `uclu_ekim` | 120 BP | Sulama | Çiftlik; kış `tarim` 0 → 0,3 |
| Orta | Su Değirmeni | `su_degirmeni` | 130 BP | Mühendislik | Değirmen |
| Orta | Lonca Sistemi | `lonca_sistemi` | 150 BP + 10 kitap | Dokumacılık | Lonca Binası |
| Orta | ★ Gotik Mimari | `gotik_mimari` | 200 BP + 20 kitap | Su Değirmeni, Lonca Sistemi | Katedral; Orta Çağ binalarında Sv3 |

**BP bütçe kontrolü** (zorunlu yol / tüm buluşlar / çağda beklenen BP):
Göçebe 36 / 44 / ~37 (Kamp 0,5×25 + Totem 1×15 + ~5 Hikâye Anlat ×2) · Taş 70 / 105 / ~130 · Bronz 95 / 225 / ~240 ·
Antik 265 / 405 / ~480 · Orta 590 / 710 / ~800. Göçebe'de bilinçli olarak dar: Hayvan İzleri ya da çağ hızı arasında seçim.

---

## 6. Olay sistemi (`src/data/olaylar.js`)

### 6.1 Yapı
```
{ id, ad, metin, cag: ['gocebe', ...], tur: 'kitlik'|'hastalik'|'saldiri'|'gocmen'|'ticaret'|'doga'|'firsat'|'inanc'|'kurtarma',
  kotu: true|false, tetik: 'rastgele'|'kosul'|'zincir'|'eylem', kosul: {...}, agirlik: 10, bekleme: 15,
  secenekler: [ { metin, gereksinim: {...}, sonuc: {...} } ] }
```
- `kosul` alanları (hepsi isteğe bağlı, VE ile birleşir): `turMin`, `nufusMin`, `nufusMax`, `kaynakMin:{}`, `kaynakMax:{}`,
  `mevsim:[]`, `huzurMin`, `huzurMax`, `binaVar:[]`, `binaYok:[]`, `bulusVar:[]`, `acTurMin`, `vergi`.
- `gereksinim` sağlanmayan seçenek gri gösterilir ama listede kalır. Her olayda **en az bir seçenek gereksinimsizdir**.
- `sonuc` alanları: `kaynak:{}` (eksi değer stokta olandan fazla düşmez), `nufus`, `huzur`, `bilgi`, `yaraliIsci:{adet,sure}`,
  `hasar:{adet}`, `degistirici:{id, sure, etki}`, `savunmaTesti:{guc}`, `olasilik:[{p, sonuc}]`, `zincir:{olay, gecikme}`, `metin`.
- `degistirici.etki`: `{ uretim:{etiket, carpan} }` · `{ huzur }` · `{ tuketim:{kaynak, carpan} }` · `{ ticaretKapali:true }` · `{ savunma }`.

### 6.2 Motor kuralları
- **İlk olay günü `ILK_OLAY_TUR` = 6** (öğretici): olay, n adımında seçilip bir sonraki oyuncu evresinde gösterilir ve yalnız
  gösterileceği gün (`takvim(tur + 1).gun`, 1'den sayılır) ≥ `ILK_OLAY_TUR` ise çıkar. `tur` 0'dan sayıldığı için gün 1–5
  (tur 0–4) olaysızdır; ilk olay en erken tur 4 çözülürken seçilir ve 6. günde (`durum.tur = 5`) gösterilir. Koşuldaki
  `turMin` da aynı gün değeriyle karşılaştırılır; bekleyen zincir olayları da bu sınırı bekler. Tur başına en fazla 1 olay.
- Önce `tetik:'kosul'` olayları (koşulu sağlanan, beklemesi biten; öncelik `kurtarma`), yoksa rastgele:
  olasılık Göçebe 0,25 · Taş 0,25 · Bronz 0,30 · Antik 0,30 · Orta 0,35 → uygun havuzdan ağırlıklı seçim.
- `bekleme` (varsayılan 15 tur) aynı olayın tekrarını engeller. `zincir` olayları gecikmesi dolunca kesin gelir.
- **Sarmal koruması:** `acTur > 0` ya da huzur <30 iken `kotu` olayların ağırlığı ×0,5.
- Ağırlık çarpanları: Pazar/Han → `ticaret`; Han → `gocmen`; hastalık riski (§6.4) → `hastalik`.

### 6.3 Saldırı
```
saldiriGucu = cagTaban + floor(cagIcindekiTur / 10)    cagTaban: Göçebe 3 · Taş 6 · Bronz 12 · Antik 25 · Orta 50
savunma     = önder 1 (Mızrak Ucu ile 2) + Σ bina.savunma × Sv + Σ nöbetçi/asker/şövalye değeri + değiştiriciler
```
savunma ≥ güç → püskürtme, +5 huzur · savunma ≥ güç/2 → her kaynağın %10'u kaybı · aksi → her kaynağın %25'i, 1 kişi
(kayıp kilidine tabi), 1 rastgele bina hasarlı.

### 6.4 Hastalık riski
`hastalikCarpani = clamp(nüfus / (15 + Σ bina.hastalikKapasitesi), 0,5, 3)` → `hastalik` olaylarının ağırlığıyla çarpılır.
Kışta ısınma eksikse ek ×2.

### 6.5 Örnek olaylar (çağ başına 3)
**Göçebe**
1. **Kurt Sürüsü** (`saldiri`, rastgele, `turMin 8`): a) Karşı koy → `savunmaTesti` · b) Ateşi büyüt: −4 odun, huzur −2 · c) Et bırak: −6 yiyecek.
2. **Yabancı Aile** (`gocmen`): a) Kabul et: +2 nüfus, −4 yiyecek · b) Azık ver, gönder: −3 yiyecek, +3 huzur · c) Kov: −3 huzur.
3. **Erken Don** (`doga`, `mevsim:['guz']`): a) Gece gündüz topla: +6 yiyecek, −5 huzur · b) Kabullen: 5 tur `toplama` ×0,7.

**Taş Devri**
1. **Ateşli Hastalık** (`hastalik`): a) Şifacıya güven (Şifacı Çadırı): kayıp yok, 3 tur 1 yaralı işçi · b) Hastaları ayır: 3 tur 2 yaralı işçi ·
   c) Totem önünde dua: +3 huzur; %50 1 kayıp.
2. **Mamut Sürüsü** (`firsat`): a) Büyük av (2 alet): +25 yiyecek, +6 deri; %20 1 yaralı işçi (2 tur) · b) Uzaktan izle: +3 BP.
3. **Komşu Kabile Takası** (`ticaret`): a) 10 deri → 6 alet · b) 15 yiyecek → 8 taş · c) Reddet.

**Bronz/Demir**
1. **Nehir Taşkını** (`doga`, `mevsim:['bahar']`, `binaVar:['sulanan_tarla']`): a) Set çek: −20 kil, −10 odun · b) Bekle: suya 2 karo
   yakın tarımlar 5 tur 0, ardından (`zincir`) "Alüvyon" 10 tur `tarim` ×1,25.
2. **Kalay Kervanı** (`ticaret`, `binaVar:['pazar_yeri']`): a) 30 yiyecek → 10 metal · b) 20 kil + 10 alet → 8 metal · c) Reddet.
3. **Akıncılar** (`saldiri`): a) Savun → `savunmaTesti` · b) Haraç: her kaynağın %15'i · c) Saklan: kayıp yok, 3 tur tüm üretim ×0,5.

**Antik**
1. **Salgın** (`hastalik`, `nufusMin 50`): a) Karantina: 5 tur `ticaretKapali`, üretim ×0,9 · b) Hekim çağır: −30 sikke · c) Görmezden gel: kayıp kilidi kadar kayıp, −8 huzur.
2. **Filozof Ziyareti** (`firsat`): a) Ağırla: −15 sikke, +20 BP · b) Tiyatroda tartışma (Tiyatro): +10 huzur, +10 BP · c) Gönder.
3. **Vergi İsyanı** (`kosul`, `vergi:'yuksek'`, `huzurMax 40`): a) Vergiyi düşür (Düşük'e iner): +10 huzur · b) Askerleri gönder (Kışla, ≥2 asker): −10 huzur, 10 tur tekrar etmez · c) Bayram ilan et: −40 yiyecek, −20 sikke, +15 huzur.

**Orta Çağ**
1. **Kuşatma** (`saldiri`): a) Surlarda savun → `savunmaTesti` · b) Fidye: −60 sikke · c) Şövalyelerle çıkış (Kale, ≥2 şövalye): %50 püskürtme + 30 sikke / %50 1 kayıp ve savunma testi.
2. **Kara Ölüm** (`hastalik`, `nufusMin 100`): a) Darüşşifa'ya taşı (Darüşşifa): 1 kayıp · b) Şehri kapat: 8 tur `ticaretKapali`, üretim ×0,8 · c) Dua alayı (Manastır): +10 huzur, kayıp kilidi kadar kayıp.
3. **Lonca Talebi** (`inanc`/ekonomi, `binaVar:['lonca_binasi']`): a) Ayrıcalık ver: kalıcı `atolye` +0,10, bakım +2 sikke · b) Reddet: 5 tur `atolye` ×0,8, −5 huzur.

**Kurtarma olayı (tüm çağlar):** **Komşu Kabile Yardımı** (`kosul`, `acTurMin 2`, çağ başına 1 kez): +15 yiyecek × (1 + çağSırası).

---

## 7. Denge ilkeleri

### 7.1 Süre hedefleri
| Çağ | Hedef tur | Yıl (yaklaşık) | Nüfus |
|---|---|---|---|
| Göçebe | 25 (±5) | 1,25 | 3 → 8 |
| Taş Devri | 40 | 2 | 8 → 20 |
| Bronz/Demir | 60 | 3 | 20 → 45 |
| Antik | 80 | 4 | 45 → 90 |
| Orta Çağ | 100 | 5 | 90 → 150 |
| **Toplam** | **~305** | ~15 | |
Bir tur ~20–40 sn → tam oyun ~2–3 saat. Sürüm 0.1 hedefi ilk 25 tur ≈ 10–15 dk.

### 7.2 Maliyet büyümesi
- Aynı türden n'inci bina: `maliyet = max(taban, round(taban × k^(n−1)))`; konut `k = 1,10`, diğer `k = 1,15`. Tekil binalar tek adet.
- Yükseltme: §3.5 (adet çarpanı yok). Yıkılan binalar sayımdan düşer.
- Çağ geçiş maliyeti her zaman o çağın depo tavanının altında (Göçebe 30/30, Taş 60/60, Bronz 120/120, Antik 200/200).
  Orta Çağ Katedral taşı 300 = tavan; Ambar gibi depolarla rahatlar.

### 7.3 Ölüm sarmalından kaçınma (zorunlu kurallar)
1. Nüfus **2'nin altına inmez**; oyunda yenilgi yoktur (karar §11.2).
2. **Kayıp kilidi:** her 3 turluk pencerede en çok `max(1, floor(nüfus × 0,05))` kişi kaybedilir (açlık + göç + hastalık + saldırı toplamı).
3. **Kemer sıkma:** `acTur ≥ 1` iken yiyecek tüketimi ×0,75 ve serbest işler +%50.
4. **Kurtarma olayı** (§6.5) çağ başına 1 kez garanti; kötü olay ağırlığı yarıya (§6.2).
5. Serbest işler hiçbir zaman kapanmaz; bina olmadan da yiyecek üretilebilir.
6. Yıkım %50 iade; hasar onarımı ucuz (%25).
7. Huzur <40 (`DOGUM_HUZUR_MIN`, §2.5 ile aynı eşik) iken doğum yok ama huzur hedefi yine her tur en çok 5 puan kayar (çöküş yavaş, toparlanma görünür).

### 7.4 Başlangıç değerleri (`yeniOyun` ile uyumlu)
Mevcut `yeniOyun`: yiyecek 10, odun 5, taş 0, nüfus 3 → **uyumlu, değiştirilmez; yalnız alan eklenir.**
- Eklenecek: `deri: 0`, `huzur: 60`, `bilgiHavuz: 0`, `yorgunluk: 0`, `acTur: 0`, binalar `[Kamp Ateşi, Çadır]`, 3 kişi Toplayıcı'da.
- Kontrol: 3 kişi, 1 Çadır (kap 3) → tam dolu; büyümek için 2. Çadır gerekir (5 odun + 2 deri). Odun 5 hazır, deri 0 →
  oyuncu ilk turlarda Avcı'ya adam ya da önderle Avlan seçmek zorunda (ilk küçük karar).
- 2 Toplayıcı + 1 Oduncu: +4 yiyecek, −3 tüketim, −0,4 bozulma → +0,6/tur; 10 yiyecekle açlığa düşmeden ilk 15 tur oynanabilir.
- İlk kış (tur 16–20): 3 Çadır için 3 odun/tur ısınma; toplama ×0,5 → oyuncunun ~20 yiyecek stoklaması gerekir (Kurutma Rafı yardımcı).

### 7.5 Ayar sabitleri (`src/data/denge.js`)
`YIYECEK_TUKETIM 1` · `MEVSIM_TUR 5` · `BOZULMA 0.04` / `BOZULMA_MIN 0.01` · `HUZUR_BASLANGIC 60` · `HUZUR_KAYMA 5` ·
`MALIYET_K_KONUT 1.10` / `MALIYET_K 1.15` · `SEVIYE_CARPAN [1, 1.5, 2]` · `YUKSELTME_MALIYET [1.5, 2.5]` · `YIKIM_IADE 0.5` ·
`ONARIM 0.25` · `BITISIKLIK_MAX 0.5` · `KAYIP_PENCERE 3` / `KAYIP_ORAN 0.05` · `NUFUS_MIN 2` · `ACLIK_OLUM_TUR 3` ·
`KEMER_SIKMA 0.75` · `YORGUNLUK_MAX 6` · `ILK_OLAY_TUR 6` · `OLAY_BEKLEME 15` · `YOL_CEZA 0.75`.

---

## 8. Kayıt ve çevrimdışı ilerleme

**Karar: çevrimdışı birikim YOK.** Oyunda zaman yalnız "Günü bitir" ile akar.
Gerekçe: (1) sıra tabanlı oyunda her gün bir karardır; çevrimdışı birikim olay seçimlerini ve kış hazırlığını atlar, çekirdek
gerilimi siler. (2) Çekirdek saf ve deterministiktir; gerçek saate bağlanması testleri bozar. (3) Kayıt/yükle hilesini önlemek kolaylaşır.
Yerine: **"Mevsim sonuna ilerlet"** düğmesi — en çok 5 tur otomatik oynar (önder Dinlen), olay çıkınca, açlık başlayınca ya da
inşaat bitince durur.

**Kayıt kuralları:**
- `localStorage` anahtarları: `uygarlik-tohumu:otomatik` (her tur sonu) ve `uygarlik-tohumu:elle` (oyuncu kaydı, 1 yuva).
- Kayıt = durum nesnesinin JSON'u; `surum` alanı zorunlu. Yükleme: `src/save/` sürüm göçleri (`gocler[surum]`) sırayla uygulanır,
  sonra **alan beyaz listesi** ile süzülür; bilinmeyen alan atılır, eksik alan `yeniOyun` varsayılanıyla doldurulur.
- RNG durumu (`tohum`, `rng`) kayda girer → aynı kayıttan aynı sonuç (kayıt-yükle ile zar yeniden atılamaz).
- Bozuk/okunamayan kayıt: oyuncuya "Kayıt okunamadı" + yeni oyun; eski kayıt silinmez, `:bozuk` ekiyle saklanır.

---

## 9. Sürüm 0.1 (MVP) kapsamı

**Oynanış:** Göçebe Çağı tam + Taş Devri'ne geçiş. Taş Devri'ne ulaşınca "0.1 tamamlandı" kartı, ardından sınırlı serbest oyun.
- **Kaynaklar (5):** yiyecek, odun, taş, deri, alet + BP göstergesi.
- **Binalar:** Kamp Ateşi (merkez, hazır) + Göçebe: Çadır, Avcı Kulübesi, Toplayıcı Barınağı, Oduncu Kampı, Kurutma Rafı, Totem,
  Gözcü Direği + Taş Devri çağ başı: Kulübe, Taş Ocağı, Alet Yapımcısı (10 inşa edilebilir). Ocak Meydanı dönüşümü dahil.
  Dışarıda: Şifacı Çadırı ve diğer Taş Devri binaları (0.2).
- **Buluşlar:** 5 Göçebe buluşu.
- **Önder eylemleri:** Avlan, Keşfet, Hikâye Anlat, Dinlen, Alet Yap.
- **Olaylar (10):** Kurt Sürüsü, Yabancı Aile, Erken Don, Komşu Kabile Yardımı, Bereketli Çalılık (+8 yiyecek), Fırtına
  (a: −4 odun · b: 1 Çadır hasarlı), Öksürük Salgını (Şifacısız sürüm: a) ayır 2 yaralı / b) dua %50 1 kayıp), Yaşlı Bilge
  (a: 5 yiyecek → +6 BP), Mamut Sürüsü, Komşu Kabile Takası.
- **Sistemler:** tur akışı (§1.2 tamamı; bakım/yol/vergi yok), mevsimler, açlık/ısınma, huzur, doğum, bitişiklik, Sv1–Sv2,
  izgara 8×8 → 10×10, saldırı testi, kayıt + "Mevsim sonuna ilerlet", dokunmatik yatay arayüz.
- **Kabul ölçütü:** test botu (her tur boşta işçiyi en düşük stoklu kaynağa atayan basit strateji) Göçebe'yi 20–32 turda bitirir,
  hiçbir tohumda nüfus 2'ye düşmez.

---

## 10. Veri şeması önerisi (`src/data/`)

Tüm tablolar dizi olarak dışa aktarılır, `id` benzersiz ve ASCII (`snake_case`), `ad` Türkçe. Miktar nesneleri `{ kaynakId: sayı }`.

**`caglar.js` → `CAGLAR`** (mevcut dosya genişletilir; `konut` alanı ad yerine bina id'si olur, ad `BINALAR`'dan okunur)
`id, ad, sira, konut, merkez, acikAlan, depoTavani, bilgiTaban, merkezHuzur, esZamanliInsaat, dogumAraligi, kalabalikEsigi,
olayOlasiligi, saldiriTaban, hedefTur, yeniKaynaklar[], acilanEylemler[], gecis: { nufus, binalar:{id:adet}, bulus, maliyet:{} } | null, zafer?: { bina, nufus }`

**`kaynaklar.js` → `KAYNAKLAR`**: `id, ad, cag, simge, bozulur:boolean`

**`karolar.js` → `KAROLAR`**: `id, ad, insaEdilir:boolean, gorunurCag, temizlenir?:{ sure, kazanc:{}, donusur }`

**`binalar.js` → `BINALAR`**
`id, ad, cag, tur: 'merkez'|'konut'|'uretim'|'donusum'|'depo'|'huzur'|'savunma'|'bilgi'|'kamu'|'anit', etiketler[] (ör. 'atolye','tarim'),
boyut:[g,y], maliyet:{}, insaSuresi, gereksinim:{ bulus?, tekil?, karoUstu?, karoBitisik?, suMesafe? }, isci, isciTuru?('nobetci'|'asker'|'sovalye'|'rahip'|'bilgin'|'kesis'),
uretim:{} (işçi başına), girdi:{} (işçi başına), sabitUretim:{}, mevsimEtiketi?, kapasite?, isinma?, huzur?, savunma?, isciSavunma?,
bilgi?, isciBilgi?, depo:{}, bozulmaAzaltma?, hastalikKapasitesi?, bakim:{}, bitisiklik:[{hedef, etki, max}], etkiAlani?:{yaricap, hedefEtiket, etki},
maxSeviye (2|3), aciklama`

**`buluslar.js` → `BULUSLAR`**: `id, ad, cag, maliyet:{ bilgi, kitap? }, gerekir[], acar:{ binalar[], eylemler[] }, etkiler:[{ tur:'uretimCarpani'|'bozulma'|'depoCarpani'|'savunma'|'mevsimCarpani'|'serbestIs', hedef, deger }], cagBulusu:boolean, aciklama`

**`olaylar.js` → `OLAYLAR`**: §6.1 yapısı aynen.

**`eylemler.js` → `EYLEMLER`**: `id, ad, cag, yorgunluk, gereksinim:{ bina?, kaynak? }, sonuc:{ ... §6.1 sonuc biçimi, olasilik dahil }, olcekli:boolean`

**`mevsimler.js` → `MEVSIMLER`**: `[{ id:'bahar'|'yaz'|'guz'|'kis', ad, carpan:{ toplama, avcilik, tarim, balik }, isinma:boolean }]`

**`denge.js`**: §7.5 sabitleri, `SERBEST_ISLER: [{ id, ad, uretim:{}, mevsimEtiketi }]`, `HUZUR_CARPAN`, `VERGI`.

**Durum nesnesi (`yeniOyun` çıktısı = kayıt biçimi, beyaz liste):**
```
{ surum, tohum, rng, tur, cag, cagBaslangicTuru,
  kaynaklar:{ yiyecek, odun, tas, deri, ... }, bilgiHavuz, arastirma:{ id, ilerleme } | null, buluslar:[],
  nufus, atama:{ '<binaUid>': n, 'serbest:toplayici': n, ... }, huzur, acTur, kayiplar:[{ tur, adet }],
  onder:{ yorgunluk, yaraliKalan, eylem },
  binalar:[{ uid, id, x, y, seviye, insaKalan, hasarli }], insaatSirasi:[],
  harita:{ boyut:16, karolar:'<256 karakterlik kod dizgisi>' },
  olay:{ aktif:{ id } | null, bekleme:{ id: tur }, zincir:[{ olay, tur }], kurtarmaKullanildi:{ cag:true } },
  degistiriciler:[{ id, kalan, etki }], kervanlar:[{ kaynak, miktar, tur }], vergi:'yok', istatistik:{} }
```
Not: `nufus` sayı olarak kalır (mevcut testlerle uyum). Birim saymanın kuralı: `Σ atama + işsiz = nufus`.

---

## 11. Açık sorular — CEVAPLANDI (2026-10-26, kullanıcı varsayılanları onayladı)
1. **Zaman ölçeği:** ✅ tur = 1 gün, mevsim = 5 gün, yıl = 20 gün.
2. **Yenilgi:** ✅ yenilgi yok; nüfus en az 2 (`NUFUS_MIN`).
3. **Önder:** ✅ soyut eylem menüsü (sahnede kahraman modeli yok).
4. **Orta Çağ konutu:** ✅ konut "Yarı Ahşap Ev" (`yari_ahsap_ev`); "Surlu şehir" çağın kimliğidir (`CAGLAR.ortacag.kimlik`), konut değil.
5. **Oyun sonu:** ✅ Katedral + 150 nüfus zaferinden sonra serbest kip (yeni çağ planlanmadı).
