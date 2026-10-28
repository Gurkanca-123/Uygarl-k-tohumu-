// Komuta kademesi (docs/SAVAS.md §3; kullanıcı kararı 2026-10-28: Lider → Yiğitbaşı → Komutan → Serdar → Şövalye → General → Mareşal).
// RUTBELER: { id, ad, cag, kapasite, izgara:[sira, sutun], acikHucre ([sira, sutun] listesi; kahraman hücresi ayrıca), kahramanHucre,
//   bolukBoyu, kalici (kalıcı asker tavanı; null = ordu yok), kahraman (savaştaki kahraman sayısı), komuta:{ id, ad, tick, etki },
//   zp:[★1, ★2, ★3] (toplam Zafer Puanı eşikleri), acik (F1'de yalnız Lider) }.
// Sıra 0 = ön, 1 = orta, 2 = arka; sütun 0..n-1 (ortadaki sütun kahramanın).
export const RUTBELER = [
  { id: 'lider', ad: 'Lider', cag: 'gocebe', kapasite: 4, izgara: [3, 3], acikHucre: [[0, 0], [0, 1], [0, 2], [2, 1]], kahramanHucre: [1, 1],
    bolukBoyu: 1, kalici: null, kahraman: 1, acik: true,
    komuta: { id: 'birlikte_vur', ad: 'Birlikte Vur', tick: 0, etki: { ilkSaldiri: 0.15 } }, zp: [0, 4, 9] },
  { id: 'yigitbasi', ad: 'Yiğitbaşı', cag: 'tasdevri', kapasite: 6, izgara: [3, 3],
    acikHucre: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]], kahramanHucre: [1, 1], bolukBoyu: 1, kalici: 6, kahraman: 1, acik: false,
    komuta: { id: 'kalkan_sirasi', ad: 'Kalkan Sırası', tick: 0, etki: { onSiraHasar: -0.2, sure: 6 } }, zp: [14, 20, 28] },
  { id: 'komutan', ad: 'Komutan', cag: 'bronz', kapasite: 12, izgara: [3, 4],
    acikHucre: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 3], [2, 1], [2, 2]], kahramanHucre: [1, 1], bolukBoyu: 2, kalici: 12, kahraman: 2,
    acik: false, komuta: { id: 'hucum_borusu', ad: 'Hücum Borusu', tick: 8, etki: { hiz: 1.5, saldiri: 0.1, sure: 4 } }, zp: [36, 46, 58] },
  { id: 'serdar', ad: 'Serdar', cag: 'antik', kapasite: 20, izgara: [3, 5],
    acikHucre: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 4], [2, 1], [2, 2], [2, 3]], kahramanHucre: [1, 2], bolukBoyu: 2, kalici: 20,
    kahraman: 2, acik: false, komuta: { id: 'ok_yagmuru', ad: 'Ok Yağmuru Emri', tick: 6, etki: { okcuVurus: 2 } }, zp: [70, 85, 100] },
  { id: 'sovalye', ad: 'Şövalye', cag: 'ortacag', kapasite: 30, izgara: [3, 5],
    acikHucre: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 0], [1, 1], [1, 3], [1, 4], [2, 1], [2, 2], [2, 3]], kahramanHucre: [1, 2],
    bolukBoyu: 3, kalici: 30, kahraman: 3, acik: false,
    komuta: { id: 'sancak_hucumu', ad: 'Sancak Hücumu', tick: 0, etki: { ilkVurus: 2, sersem: 1 } }, zp: [118, 138, 160] },
  // ---------- Yalnız veri satırı (Sanayi / Modern çağları henüz yok) ----------
  { id: 'general', ad: 'General', cag: null, kapasite: 45, izgara: [3, 5], acikHucre: [], kahramanHucre: [1, 2], bolukBoyu: 4, kalici: 45,
    kahraman: 3, acik: false, komuta: { id: 'topcu_destegi', ad: 'Topçu Desteği', tick: 4, etki: {} }, zp: [190, 215, 240] },
  { id: 'maresal', ad: 'Mareşal', cag: null, kapasite: 60, izgara: [3, 5], acikHucre: [], kahramanHucre: [1, 2], bolukBoyu: 5, kalici: 60,
    kahraman: 3, acik: false, komuta: { id: 'hava_gozcusu', ad: 'Hava Gözcüsü', tick: 0, etki: {} }, zp: [270, 300, 330] },
];
// Rütbe yıldızı başına komuta çarpanı komutaC (★1/★2/★3).
export const KOMUTA_C = [1.0, 1.02, 1.04];
// ZP kaynakları (§3.2). Savaş ZP'si × (1 + 0,25 × çağSırası), aşağı yuvarlanır.
export const ZP_KAYNAK = { savas: { buyuk: 3, basari: 2, kismi: 1, basarisiz: 0 }, cagCarpan: 0.25, tehditPuskurtme: 2, tehditKismi: 1,
  destan: 5, yigitlik: 1, cagAtlama: 5 };
