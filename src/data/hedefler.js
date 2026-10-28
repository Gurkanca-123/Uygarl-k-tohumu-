// Hedefler (docs/AKSIYON.md §6, şema §8.1): çağ destanları (olay zinciri) ve mevsim görev kartları.
// MVP (§9.3): Göçebe destanı "Ayının İzinde" + 4 mevsim görevi. Gelenek ve başarım SONRAKİ faz (kullanıcı kararı) → tablo yok.
//
// Destan adım koşulu anahtarları (core/hedef.js tanır): isaret (bu türde işaret haritada görüldü) · sefer ({ id, sonuc: [...] }
//   başarıyla döndü) · komut ('destanAdim', gerekir: { bina }).
// Ödül anahtarları: esya (sahipsizse sandığa) · huzurKalici (kalıcı değiştirici) · unvan · kaynak · bp.
export const DESTANLAR = [
  { id: 'ayinin_izinde', ad: 'Ayının İzinde', cag: 'gocebe', geriDonus: { adim: 1, kosul: 'isaretKayip', isaret: 'ayi', hedef: 0 },
    metin: 'Ormanın kıyısında dev bir ayının izleri var. Boy onu avlayan avcının adını yüzyıllar boyu anacak.',
    adimlar: [
      { id: 'iz_bul', metin: 'Keşifte bir ayı izi (🐻) bul.', kosul: { isaret: 'ayi' } },
      { id: 'ayi_avla', metin: 'Ayı Avı seferini başarıyla tamamla.', kosul: { sefer: { id: 'ayi_avi', sonuc: ['buyuk', 'basari'] } } },
      { id: 'post_sun', metin: 'Postu Totem\'e sun.', kosul: { komut: { id: 'destanAdim', gerekir: { bina: 'totem' } } } },
    ],
    odul: { esya: 'ayi_postu', huzurKalici: 3, unvan: 'Ayı Boyu' } },
];

// Mevsim görevleri: Bahar/Yaz/Güz başında GOREV_KART_SAYI kart (uygunlar arasından), biri seçilir, GOREV_SURE tur.
// kosul.tur: 'kaynak' ({ kaynak, miktar }, çağ ölçekli) · 'sefer' ({ adet, sonuc }) · 'tehdit' (haraçsız atlat: puskurtme/kismi/saklan/elci) ·
//   'hediye' (komşuya elçi/hediye). uygun: { tehditAktif?, komsu? } kart çekilebilmesi için.
// odul: { kaynak?, bp?, xp? (tüm kahramanlara), huzur?, iliski? (komşu) }.
export const MEVSIM_GOREVLERI = [
  { id: 'kis_azigi', ad: 'Kış Azığı', cagMin: 'gocebe', metin: 'Ambarda 25 yiyecek biriktir.',
    kosul: { tur: 'kaynak', kaynak: 'yiyecek', miktar: 25 }, uygun: {}, odul: { kaynak: { deri: 4 } } },
  { id: 'basarili_sefer', ad: 'Yiğitlik', cagMin: 'gocebe', metin: 'Bir seferi başarıyla tamamla.',
    kosul: { tur: 'sefer', adet: 1, sonuc: ['buyuk', 'basari'] }, uygun: {}, odul: { xp: 5, bp: 3 } },
  { id: 'harac_siz', ad: 'Boyun Eğme', cagMin: 'gocebe', metin: 'Yaklaşan tehdidi haraç vermeden atlat.',
    kosul: { tur: 'tehdit' }, uygun: { tehditAktif: true }, odul: { huzur: 5 } },
  { id: 'komsu_hediye', ad: 'Dostluk Hediyesi', cagMin: 'tasdevri', metin: 'Komşuya hediye götür.',
    kosul: { tur: 'hediye' }, uygun: { komsu: true }, odul: { iliski: 5 } },
];
export const GOREV_KOSUL_TURLERI = ['kaynak', 'sefer', 'tehdit', 'hediye'];
