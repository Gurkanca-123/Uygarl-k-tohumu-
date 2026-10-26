// Olay tablosu (TASARIM §6, yapı §6.1 aynen). Seçenek metinleri belgeden; açıklama metinleri (metin) yer tutucudur (aşama 6).
// { id, ad, metin, cag:[...], tur, kotu, tetik, kosul:{}, agirlik, bekleme, secenekler:[{ metin, gereksinim:{}, sonuc:{} }], mvp }
// gereksinim anahtarları kosul ile aynıdır (binaVar, kaynakMin, ...); ek: isciTuruMin:{ tur: adet }.
// Şemaya eklenen sonuc alanları: kayipOrani (her kaynağın oranı kadar kayıp), kayipKilidiKadar (kayıp kilidi kadar kişi),
//   puskurtme (saldırı püskürtüldü, §6.3 ödülü), vergi (yeni vergi düzeyi), bekleme (bu olayın beklemesini değiştirir),
//   cagOlcek (kaynak × (1 + cagOlcek × çağSırası)), hasar.binaId; degistirici.sure null = kalıcı;
//   degistirici.etki ekleri: uretim.etiket '*' (tüm üretim), uretim.suMesafe, uretim.bonus (çarpan yerine ek), bakim:{}.
// savunmaTesti:{} — guc verilmezse §6.3 formülü kullanılır.
//
// TODO(tasarim): olay ağırlıkları belgede yok → hepsi OLAY_VARSAYILAN_AGIRLIK (10); bekleme varsayılan OLAY_BEKLEME (15).
// TODO(tasarim): `kotu` bayrağı belgede açık değil; tür ve sonuçlara göre atandı (saldırı/hastalık/doğa = kötü).
// TODO(tasarim): çağ örnek olayları sonraki çağlarda da çıkar mı belirsiz; yalnız kendi çağına bağlandı.
// TODO(tasarim): ödeme yapılan seçeneklerde (Hekim çağır, Fidye, Ağırla, Bayram) gereksinim yok: §6.1'e göre eksi değer stokta
//   olandan fazla düşmez. Takas seçeneklerine (Komşu Kabile Takası, Kalay Kervanı) bedava kazanç olmasın diye kaynakMin eklendi.
import { OLAY_VARSAYILAN_AGIRLIK as A, OLAY_BEKLEME as B } from './denge.js';

function olay(o) {
  return { kosul: {}, agirlik: A, bekleme: B, tetik: 'rastgele', mvp: false, ...o,
    secenekler: o.secenekler.map((s) => ({ gereksinim: {}, ...s })) };
}

const REDDET = { metin: 'Reddet', sonuc: {} };

export const OLAYLAR = [
  // ---------- Göçebe (§6.5) ----------
  olay({ id: 'kurt_surusu', ad: 'Kurt Sürüsü', cag: ['gocebe'], tur: 'saldiri', kotu: true, kosul: { turMin: 8 }, mvp: true,
    metin: 'Gece kampın çevresinde kurt gözleri parlıyor.',
    secenekler: [
      { metin: 'Karşı koy', sonuc: { savunmaTesti: {} } },
      { metin: 'Ateşi büyüt', sonuc: { kaynak: { odun: -4 }, huzur: -2 } },
      { metin: 'Et bırak', sonuc: { kaynak: { yiyecek: -6 } } },
    ] }),
  olay({ id: 'yabanci_aile', ad: 'Yabancı Aile', cag: ['gocebe'], tur: 'gocmen', kotu: false, mvp: true,
    metin: 'Yorgun bir aile ateşinize yaklaşıyor.',
    secenekler: [
      { metin: 'Kabul et', sonuc: { nufus: 2, kaynak: { yiyecek: -4 } } },
      { metin: 'Azık ver, gönder', sonuc: { kaynak: { yiyecek: -3 }, huzur: 3 } },
      { metin: 'Kov', sonuc: { huzur: -3 } },
    ] }),
  olay({ id: 'erken_don', ad: 'Erken Don', cag: ['gocebe'], tur: 'doga', kotu: true, kosul: { mevsim: ['guz'] }, mvp: true,
    metin: 'Sabah otlar kırağıyla kaplı; yemişler donmak üzere.',
    secenekler: [
      { metin: 'Gece gündüz topla', sonuc: { kaynak: { yiyecek: 6 }, huzur: -5 } },
      { metin: 'Kabullen', sonuc: { degistirici: { id: 'erken_don', sure: 5, etki: { uretim: { etiket: 'toplama', carpan: 0.7 } } } } },
    ] }),

  // ---------- Sürüm 0.1 ek Göçebe olayları (§9) ----------
  olay({ id: 'bereketli_calilik', ad: 'Bereketli Çalılık', cag: ['gocebe'], tur: 'firsat', kotu: false, mvp: true,
    metin: 'Toplayıcılar yemişle dolu bir çalılık buldu.',
    secenekler: [{ metin: 'Topla', sonuc: { kaynak: { yiyecek: 8 } } }] }),
  // TODO(tasarim): Fırtına'nın huzur etkisi yok; Çadır yoksa b) ne yapar belirsiz.
  olay({ id: 'firtina', ad: 'Fırtına', cag: ['gocebe'], tur: 'doga', kotu: true, mvp: true,
    metin: 'Sert bir fırtına kampı dövüyor.',
    secenekler: [
      { metin: 'Odunla destekle', sonuc: { kaynak: { odun: -4 } } },
      { metin: 'Bekle', sonuc: { hasar: { adet: 1, binaId: 'cadir' } } },
    ] }),
  // TODO(tasarim): "Şifacısız sürüm" — yaralı süresi yazılmamış (Ateşli Hastalık'taki 3 tur varsayıldı); Şifacı'lı seçenek 0.2'de eklenecek.
  olay({ id: 'oksuruk_salgini', ad: 'Öksürük Salgını', cag: ['gocebe'], tur: 'hastalik', kotu: true, mvp: true,
    metin: 'Kampta öksürük yayılıyor.',
    secenekler: [
      { metin: 'Hastaları ayır', sonuc: { yaraliIsci: { adet: 2, sure: 3 } } },
      { metin: 'Dua et', sonuc: { olasilik: [{ p: 0.5, sonuc: { nufus: -1 } }, { p: 0.5, sonuc: {} }] } },
    ] }),
  // TODO(tasarim): belgede yalnız a) var; gereksinimsiz "Gönder" seçeneği eklendi.
  olay({ id: 'yasli_bilge', ad: 'Yaşlı Bilge', cag: ['gocebe'], tur: 'firsat', kotu: false, mvp: true,
    metin: 'Uzaklardan gelen yaşlı bir bilge yemek karşılığı bildiklerini anlatmayı öneriyor.',
    secenekler: [
      { metin: 'Doyur ve dinle', sonuc: { kaynak: { yiyecek: -5 }, bilgi: 6 } },
      { metin: 'Gönder', sonuc: {} },
    ] }),

  // ---------- Taş Devri ----------
  olay({ id: 'atesli_hastalik', ad: 'Ateşli Hastalık', cag: ['tasdevri'], tur: 'hastalik', kotu: true,
    metin: 'Birkaç kişi yüksek ateşle yatıyor.',
    secenekler: [
      { metin: 'Şifacıya güven', gereksinim: { binaVar: ['sifaci_cadiri'] }, sonuc: { yaraliIsci: { adet: 1, sure: 3 } } },
      { metin: 'Hastaları ayır', sonuc: { yaraliIsci: { adet: 2, sure: 3 } } },
      { metin: 'Totem önünde dua', sonuc: { huzur: 3, olasilik: [{ p: 0.5, sonuc: { nufus: -1 } }, { p: 0.5, sonuc: {} }] } },
    ] }),
  // TODO(tasarim): "Büyük av (2 alet)" — 2 alet harcanır mı yoksa yalnız gerekli mi? Harcanır varsayıldı.
  olay({ id: 'mamut_surusu', ad: 'Mamut Sürüsü', cag: ['tasdevri'], tur: 'firsat', kotu: false, mvp: true,
    metin: 'Vadiye bir mamut sürüsü indi.',
    secenekler: [
      { metin: 'Büyük av', gereksinim: { kaynakMin: { alet: 2 } },
        sonuc: { kaynak: { alet: -2, yiyecek: 25, deri: 6 }, olasilik: [{ p: 0.2, sonuc: { yaraliIsci: { adet: 1, sure: 2 } } }, { p: 0.8, sonuc: {} }] } },
      { metin: 'Uzaktan izle', sonuc: { bilgi: 3 } },
    ] }),
  olay({ id: 'komsu_takasi', ad: 'Komşu Kabile Takası', cag: ['tasdevri'], tur: 'ticaret', kotu: false, mvp: true,
    metin: 'Komşu kabile takas için geldi.',
    secenekler: [
      { metin: '10 deri ver, 6 alet al', gereksinim: { kaynakMin: { deri: 10 } }, sonuc: { kaynak: { deri: -10, alet: 6 } } },
      { metin: '15 yiyecek ver, 8 taş al', gereksinim: { kaynakMin: { yiyecek: 15 } }, sonuc: { kaynak: { yiyecek: -15, tas: 8 } } },
      REDDET,
    ] }),

  // ---------- Bronz/Demir ----------
  olay({ id: 'nehir_taskini', ad: 'Nehir Taşkını', cag: ['bronz'], tur: 'doga', kotu: true,
    kosul: { mevsim: ['bahar'], binaVar: ['sulanan_tarla'] },
    metin: 'Bahar selleri nehri taşırdı.',
    secenekler: [
      { metin: 'Set çek', sonuc: { kaynak: { kil: -20, odun: -10 } } },
      { metin: 'Bekle', sonuc: {
        degistirici: { id: 'taskin', sure: 5, etki: { uretim: { etiket: 'tarim', carpan: 0, suMesafe: 2 } } },
        zincir: { olay: 'aluvyon', gecikme: 5 } } },
    ] }),
  // Belgede yalnız zincir sonucu olarak geçer ("Alüvyon" 10 tur tarim ×1,25).
  olay({ id: 'aluvyon', ad: 'Alüvyon', cag: ['bronz'], tur: 'doga', kotu: false, tetik: 'zincir',
    metin: 'Çekilen sular tarlalara verimli bir çamur bıraktı.',
    secenekler: [{ metin: 'Ekime başla', sonuc: { degistirici: { id: 'aluvyon', sure: 10, etki: { uretim: { etiket: 'tarim', carpan: 1.25 } } } } }] }),
  olay({ id: 'kalay_kervani', ad: 'Kalay Kervanı', cag: ['bronz'], tur: 'ticaret', kotu: false, kosul: { binaVar: ['pazar_yeri'] },
    metin: 'Uzak dağlardan kalay taşıyan bir kervan geldi.',
    secenekler: [
      { metin: '30 yiyecek ver, 10 metal al', gereksinim: { kaynakMin: { yiyecek: 30 } }, sonuc: { kaynak: { yiyecek: -30, metal: 10 } } },
      { metin: '20 kil + 10 alet ver, 8 metal al', gereksinim: { kaynakMin: { kil: 20, alet: 10 } },
        sonuc: { kaynak: { kil: -20, alet: -10, metal: 8 } } },
      REDDET,
    ] }),
  olay({ id: 'akincilar', ad: 'Akıncılar', cag: ['bronz'], tur: 'saldiri', kotu: true,
    metin: 'Atlı akıncılar köye doğru geliyor.',
    secenekler: [
      { metin: 'Savun', sonuc: { savunmaTesti: {} } },
      { metin: 'Haraç ver', sonuc: { kayipOrani: 0.15 } },
      { metin: 'Saklan', sonuc: { degistirici: { id: 'saklanma', sure: 3, etki: { uretim: { etiket: '*', carpan: 0.5 } } } } },
    ] }),

  // ---------- Antik ----------
  olay({ id: 'salgin', ad: 'Salgın', cag: ['antik'], tur: 'hastalik', kotu: true, kosul: { nufusMin: 50 },
    metin: 'Kentte salgın başladı.',
    secenekler: [
      { metin: 'Karantina', sonuc: { degistirici: { id: 'karantina', sure: 5, etki: { ticaretKapali: true, uretim: { etiket: '*', carpan: 0.9 } } } } },
      { metin: 'Hekim çağır', sonuc: { kaynak: { sikke: -30 } } },
      { metin: 'Görmezden gel', sonuc: { kayipKilidiKadar: true, huzur: -8 } },
    ] }),
  olay({ id: 'filozof_ziyareti', ad: 'Filozof Ziyareti', cag: ['antik'], tur: 'firsat', kotu: false,
    metin: 'Ünlü bir filozof kente uğradı.',
    secenekler: [
      { metin: 'Ağırla', sonuc: { kaynak: { sikke: -15 }, bilgi: 20 } },
      { metin: 'Tiyatroda tartışma', gereksinim: { binaVar: ['tiyatro'] }, sonuc: { huzur: 10, bilgi: 10 } },
      { metin: 'Gönder', sonuc: {} },
    ] }),
  // TODO(tasarim): Vergi İsyanı'nın türü yazılmamış; 'inanc' varsayıldı.
  olay({ id: 'vergi_isyani', ad: 'Vergi İsyanı', cag: ['antik'], tur: 'inanc', kotu: true, tetik: 'kosul',
    kosul: { vergi: 'yuksek', huzurMax: 40 },
    metin: 'Halk ağır vergilere karşı ayaklandı.',
    secenekler: [
      { metin: 'Vergiyi düşür', sonuc: { vergi: 'dusuk', huzur: 10 } },
      { metin: 'Askerleri gönder', gereksinim: { binaVar: ['kisla'], isciTuruMin: { asker: 2 } }, sonuc: { huzur: -10, bekleme: 10 } },
      { metin: 'Bayram ilan et', sonuc: { kaynak: { yiyecek: -40, sikke: -20 }, huzur: 15 } },
    ] }),

  // ---------- Orta Çağ ----------
  olay({ id: 'kusatma', ad: 'Kuşatma', cag: ['ortacag'], tur: 'saldiri', kotu: true,
    metin: 'Bir ordu şehri kuşattı.',
    secenekler: [
      { metin: 'Surlarda savun', sonuc: { savunmaTesti: {} } },
      { metin: 'Fidye öde', sonuc: { kaynak: { sikke: -60 } } },
      { metin: 'Şövalyelerle çıkış', gereksinim: { binaVar: ['kale'], isciTuruMin: { sovalye: 2 } },
        sonuc: { olasilik: [
          { p: 0.5, sonuc: { puskurtme: true, kaynak: { sikke: 30 } } },
          { p: 0.5, sonuc: { nufus: -1, savunmaTesti: {} } },
        ] } },
    ] }),
  olay({ id: 'kara_olum', ad: 'Kara Ölüm', cag: ['ortacag'], tur: 'hastalik', kotu: true, kosul: { nufusMin: 100 },
    metin: 'Veba şehre ulaştı.',
    secenekler: [
      { metin: "Darüşşifa'ya taşı", gereksinim: { binaVar: ['darussifa'] }, sonuc: { nufus: -1 } },
      { metin: 'Şehri kapat', sonuc: { degistirici: { id: 'sehir_kapali', sure: 8, etki: { ticaretKapali: true, uretim: { etiket: '*', carpan: 0.8 } } } } },
      { metin: 'Dua alayı', gereksinim: { binaVar: ['manastir'] }, sonuc: { huzur: 10, kayipKilidiKadar: true } },
    ] }),
  // TODO(tasarim): tür "inanc/ekonomi" yazılmış; 'inanc' kullanıldı. "Kalıcı +0,10" süresiz değiştirici (sure: null) olarak girildi.
  olay({ id: 'lonca_talebi', ad: 'Lonca Talebi', cag: ['ortacag'], tur: 'inanc', kotu: false, kosul: { binaVar: ['lonca_binasi'] },
    metin: 'Loncalar yeni ayrıcalıklar istiyor.',
    secenekler: [
      { metin: 'Ayrıcalık ver', sonuc: { degistirici: { id: 'lonca_ayricalik', sure: null,
        etki: { uretim: { etiket: 'atolye', bonus: 0.10 }, bakim: { sikke: 2 } } } } },
      { metin: 'Reddet', sonuc: { huzur: -5, degistirici: { id: 'lonca_kuskun', sure: 5, etki: { uretim: { etiket: 'atolye', carpan: 0.8 } } } } },
    ] }),

  // ---------- Kurtarma (tüm çağlar, çağ başına 1 kez) ----------
  olay({ id: 'komsu_yardimi', ad: 'Komşu Kabile Yardımı', cag: ['gocebe', 'tasdevri', 'bronz', 'antik', 'ortacag'], tur: 'kurtarma',
    kotu: false, tetik: 'kosul', kosul: { acTurMin: 2 }, cagBasinaBir: true, mvp: true,
    metin: 'Açlığınızı duyan komşular yiyecek getirdi.',
    secenekler: [{ metin: 'Teşekkür et', sonuc: { kaynak: { yiyecek: 15 }, cagOlcek: 1 } }] }),
];

export const OLAY_TURLERI = ['kitlik', 'hastalik', 'saldiri', 'gocmen', 'ticaret', 'doga', 'firsat', 'inanc', 'kurtarma'];
export const OLAY_TETIKLERI = ['rastgele', 'kosul', 'zincir', 'eylem'];
