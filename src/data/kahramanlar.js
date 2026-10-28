// Kahraman sınıfları ve eşyalar (docs/AKSIYON.md §3, şema §8.1). "item" değil "eşya".
// SINIFLAR: { id, ad, cagMin, taban (sefer gücü tabanı), savunma (köyde bekçi savunma tabanı), renk, acik (MVP), yetenekler: [{ sv, id, ad, metin, etki }],
//   savas?: { menzil, pasif, aktif, sv3, sv5 } (görsel savaş yorumu, docs/SAVAS.md §4.1; F1: Avcı, Kaşif) }.
// Yetenek etki anahtarları (çekirdek kahraman.js `kahramanEtki` toplar):
//   avCarpan (av seferinde ekip katkısı ×) · avYaraliYok · avOdul (av ödülü +oran) · ayiIsaret (ayı işareti ağırlığı ×) ·
//   sureAz (sefer süresi −n, en az SEFER_SURE_MIN) · isaretEk (mevsim başı işaret +n) · kesifYaricap (+n) · danismanTehdit (köyde
//   danışmanken tehdit gücü kesin bilinir) · kesifIsaret (her keşif seferinde işaret) · tuzakYok (harabe tuzağı yok) ·
//   danismanYiyecek (danışmanken tur başı yiyecek).
// Kahraman seviyesi 1–5; her seviye sefer gücü +1 (taban + seviye). Sv1, Sv3, Sv5 yetenek açar.
export const SINIFLAR = [
  { id: 'avci', ad: 'Avcı', cagMin: 'gocebe', taban: 2, savunma: 1, renk: '#8a5a2b', acik: true,
    yetenekler: [
      { sv: 1, id: 'iz_surme', ad: 'İz Sürme', metin: 'Av seferlerinde katkısı ×1,5.', etki: { avCarpan: 1.5 } },
      { sv: 3, id: 'pusu', ad: 'Pusu', metin: 'Av seferlerinde ekipten kimse yaralanmaz.', etki: { avYaraliYok: true } },
      { sv: 5, id: 'usta_avci', ad: 'Usta Avcı', metin: 'Av ödülü +%50; ayı izleri iki kat sık görülür.', etki: { avOdul: 0.5, ayiIsaret: 2 } },
    ],
    // TODO(tasarim): belgede Avcı danışmanlığı yok → danışmanken her tur +1 yiyecek (av bilgisi) varsayıldı.
    danisman: { danismanYiyecek: 1 },
    // Savaş yorumu (docs/SAVAS.md §4.1): pasif Sv1, aktif (öfke 100'de otomatik), Sv3 / Sv5 eki.
    savas: { menzil: 3, pasif: { id: 'iz_surme', ad: 'İz Sürme', etki: { canavarHasar: 1.5 } },
      aktif: { id: 'zehirli_ok', ad: 'Zehirli Ok', etki: { carpan: 3, yavas: 3 } },
      sv3: { id: 'pusu', ad: 'Pusu', etki: { okcuBedavaAtis: true } }, sv5: { id: 'usta_avci', ad: 'Usta Avcı', etki: { aktifTekrar: 2 } } } },
  { id: 'kasif', ad: 'Kaşif', cagMin: 'gocebe', taban: 1, savunma: 0, renk: '#2f6f8f', acik: true,
    yetenekler: [
      { sv: 1, id: 'yol_bilgisi', ad: 'Yol Bilgisi', metin: 'Sefer süresi −1 gün (en az 2).', etki: { sureAz: 1 } },
      { sv: 3, id: 'keskin_goz', ad: 'Keskin Göz', metin: 'Mevsim başında +1 işaret, keşif yarıçapı +3; köyde danışmanken tehdit gücü kesin bilinir.',
        etki: { isaretEk: 1, kesifYaricap: 3, danismanTehdit: true } },
      { sv: 5, id: 'haritaci', ad: 'Haritacı', metin: 'Harabelerde tuzak yok; her keşif seferi bir işaret bulur.', etki: { tuzakYok: true, kesifIsaret: true } },
    ],
    danisman: {},
    savas: { menzil: 1, pasif: { id: 'gozcu', ad: 'Gözcü', etki: { dusmanGecikme: 2 } },
      aktif: { id: 'mesale', ad: 'Meşale', etki: { sersem: 2, carpan: 1.5 } },
      sv3: { id: 'keskin_goz', ad: 'Keskin Göz', etki: { okcuKritik: 0.15 } }, sv5: { id: 'haritaci', ad: 'Haritacı', etki: { uyari: true } } } },
  // ---------- Şema hazır, MVP'de kapalı (F2+) ----------
  { id: 'saman', ad: 'Şaman', cagMin: 'tasdevri', taban: 1, savunma: 1, renk: '#6b4f8f', acik: false, yetenekler: [], danisman: {} },
  { id: 'savasci', ad: 'Savaşçı', cagMin: 'tasdevri', taban: 3, savunma: 3, renk: '#8f2f2f', acik: false, yetenekler: [], danisman: {} },
  { id: 'zanaatkar', ad: 'Zanaatkâr', cagMin: 'bronz', taban: 1, savunma: 1, renk: '#8f7a2f', acik: false, yetenekler: [], danisman: {} },
  { id: 'tuccar', ad: 'Tüccar', cagMin: 'bronz', taban: 1, savunma: 0, renk: '#2f8f5a', acik: false, yetenekler: [], danisman: {} },
  // Kullanıcı kararı (SAVAS.md §12-2): rütbe "Komutan" ile çakışmasın diye Orta Çağ sınıfı "Sancaktar".
  { id: 'sancaktar', ad: 'Sancaktar', cagMin: 'ortacag', taban: 4, savunma: 5, renk: '#4f4f6f', acik: false, yetenekler: [], danisman: {} },
];

export const XP_ESIK = [0, 10, 25, 45, 70];       // Sv1..Sv5
export const KAHRAMAN_TAVAN = { gocebe: 1, tasdevri: 2, bronz: 3, antik: 4, ortacag: 5 };
// Ateş Yemini (komut kahramanTerfi, teklif yokken): çağ başına 1 kez, merkez binada.
export const YEMIN_MALIYET = {
  gocebe: { yiyecek: 10, deri: 3 }, tasdevri: { yiyecek: 15, alet: 4 }, bronz: { metal: 10 }, antik: { sikke: 30 }, ortacag: { sikke: 40 },
};
export const GOREV_TURLERI = ['usta', 'bekci', 'danisman'];
export const GOREV_AD = { usta: 'Usta', bekci: 'Bekçi', danisman: 'Danışman' };
export const ESYA_YUVALARI = ['silah', 'giysi', 'tilsim'];
export const YUVA_AD = { silah: 'Silah', giysi: 'Giysi', tilsim: 'Tılsım' };

// Eşya etki anahtarları: guc (sefer gücü +) · xp (XP +oran) · sureAz (sefer süresi −1) · kisCeza (false = kış sefer zorluğu yok) ·
//   yaraliSure (yaralı süresi −n) · yaraliKoru (ekipte yaralı yok, 1 kez; `tukenir`) · huzur (köyde danışmanken).
// tarif: { kaynak, bina } (komut esyaYap; sandığa girer).
export const ESYALAR = [
  { id: 'tas_mizrak', ad: 'Taş Mızrak', yuva: 'silah', etki: { guc: 1 }, tarif: { kaynak: { alet: 2, deri: 1 }, bina: 'alet_yapimcisi' }, mvp: true },
  { id: 'ayi_postu', ad: 'Ayı Postu', yuva: 'giysi', etki: { guc: 1, kisCeza: false }, mvp: true },
  { id: 'kurt_disi', ad: 'Kurt Dişi Kolye', yuva: 'tilsim', etki: { xp: 0.25 }, mvp: true },
  { id: 'eski_harita', ad: 'Eski Harita', yuva: 'tilsim', etki: { sureAz: 1 }, mvp: true },
  { id: 'sifali_ot', ad: 'Şifalı Ot Kesesi', yuva: 'tilsim', etki: { yaraliKoru: true, tukenir: true }, mvp: true },
  { id: 'bronz_kilic', ad: 'Bronz Kılıç', yuva: 'silah', etki: { guc: 3 }, tarif: { kaynak: { metal: 3 }, bina: 'demirci' }, mvp: false },
  { id: 'deri_zirh', ad: 'Deri Zırh', yuva: 'giysi', etki: { guc: 1, yaraliSure: 1 }, tarif: { kaynak: { deri: 4 }, bina: 'alet_yapimcisi' }, mvp: false },
  { id: 'zincir_zirh', ad: 'Zincir Zırh', yuva: 'giysi', etki: { guc: 3, yaraliSure: 2 }, tarif: { kaynak: { metal: 6 }, bina: 'demirci' }, mvp: false },
  { id: 'ata_totemi', ad: 'Ata Totemi', yuva: 'tilsim', etki: { huzur: 3 }, mvp: false },
];

// Türkçe ad havuzu (deterministik sırayla verilir; portre = ad sırası).
export const ADLAR = ['Tuna', 'Alp', 'Ece', 'Bilge', 'Kaya', 'Aybars', 'Umay', 'Toygar', 'Ilgın', 'Batu', 'Ayaz', 'Sevda', 'Oğuz', 'Defne', 'Erkin', 'Yaren'];
