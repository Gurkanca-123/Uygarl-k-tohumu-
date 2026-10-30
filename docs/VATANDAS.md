# Bireysel vatandaş sistemi — TASARIM ÖNERİSİ (UYGULANMADI; kullanıcı onayı bekliyor)

## Bugünkü model (kodda)
`nufus` tek sayı · `atama` = iş sayaçları (`{uid | serbest:x: adet}`) · doğum `nufus.js` (aralık, boş barınak, yiyecek ≥ 2×nüfus, huzur ≥ 40) ·
ölüm/göç sayaç düşer (`kisiEkle`, `kayiplar`) · barınma = Σ konut kapasitesi · kayıt ~2,5 KB.
Sayaç modeli ucuz, test edilmiş, dengesi ölçülmüş (bot, 196+ test). Kökten değişim bunların hepsine dokunur.

## Önerilen yaklaşım: "defter" (sayaçlar yetkili kalır, vatandaşlar üstüne eklenir)
1. `d.halk = [{ id, dogum (tur), hane, ad? }]` — yalnız kimlik/yaş/hane. `nufus === halk.length` değişmezi (test + `atamaDuzelt` benzeri onarım).
2. Mevcut sayaçlar (`atama`, `huzur`, üretim formülü) AYNEN kalır → denge bozulmaz. Vatandaş yalnız: yaş evresi (çocuk/yetişkin/yaşlı), hane, ölüm seçimi (yaşlılar önce), isim, geçmiş.
3. Yaş: çocuk (< 5 yıl=100 tur?) çalışmaz → bu denge değişir; BU yüzden aşama 1'de çocuk da çalışır (bugünkü "herkes çalışabilir"); yaş yalnız ölüm olasılığı + görünüm.
4. Hane: konut başına yerleştirme (kapasite sınırı); doğum yalnız boş barınaklı hanede; evsiz = haneye yerleşemeyen. Evrim hane yerini korur.
5. Kayıt: `halk` şemaya eklenir (kayıt sürümü 3→4, göç: nufus kadar kimlik üret). 150 kişi ≈ +6 KB.
6. Performans: sayaçlar günlük hesapta kalır; vatandaş yalnız doğum/ölüm/göç olaylarında dokunulur (O(olay)); görsel figürler zaten ayrı (`koy.js`).
7. UI (üç katman): genel (nüfus/yaş dağılımı), sistem (konut/iş), ayrıntı (vatandaş/hane kartı). Otomatik varsayılan; manuel iş atama mevcut `atama`.

## Açık sorular (kullanıcı kararı)
- Çocuk çalışmasın mı? (denge değişir; bot yeniden ayarlanır)  · Yaşlanma/ölüm oranı?  · İsimler (Türkçe liste) gerekli mi?
- Kayıt sürümü 4'e çıkma onayı. Eski kayıtlar için rastgele yaş dağılımı üretimi kabul mü?
- Bu iş: çekirdek (Opus) + testler + kayıt göçü ≈ ayrı bir aşama; önerilen sıra: (a) defter + hane (b) yaş/ölüm (c) UI.
