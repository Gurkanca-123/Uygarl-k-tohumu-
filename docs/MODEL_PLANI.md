# Model planı

Genel kural: pahalı model yalnız karar ve zor mantıkta; hacimli işte dengeli/ucuz model. Sonuç zayıfsa iş bir üst modelle yeniden yaptırılır.

| Aşama | İş | Model |
|---|---|---|
| 0 | Tasarım belgesi (döngü, ekonomi, çağ geçişleri) | Fable |
| 1 | Mimari iskelet, veri şeması | Fable (şema) + Opus (kod) |
| 2 | Simülasyon çekirdeği (tur, kaynak, nüfus, iş atama, mutluluk, olay motoru) | Opus |
| 3 | Şehir kurma (ızgara, yerleştirme, yol, bitişiklik, yükseltme) | Opus |
| 4 | Çizim ve kamera (izometrik sahne, gece-gündüz, mevsim) | Sonnet |
| 5 | Arayüz (yatay telefon, inşa menüsü, çağ ağacı, olay pencereleri) | Sonnet |
| 6 | Çağ içerikleri: tablo yapısı Sonnet, metinler Haiku | Sonnet + Haiku |
| 7 | Denge: strateji Fable, test betikleri Sonnet | Fable + Sonnet |
| 8 | Çevrimdışı ilerleme, başarımlar, öğretici | Sonnet |
| 9 | Ses ve cila | Sonnet |
| 10 | Test ve sürüm: hata avı Opus, basit kontroller Haiku | Opus + Haiku |

Sürüm 0.1 (MVP): Göçebe → Taş Devri, ~8 bina, 5 kaynak, ~10 olay, kayıt, dokunmatik arayüz.
