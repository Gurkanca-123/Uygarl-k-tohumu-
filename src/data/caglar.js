// Çağ tablosu (TASARIM §4, şema §10). Denge ve içerik buradan değişir; kod değişmez.
// konut / merkez = BINALAR id'si (ad BINALAR'dan okunur). gecis = BU çağdan sonrakine geçiş şartı; son çağda null.
// Kaynaklar: acikAlan §3.1 · depoTavani §2.3 · bilgiTaban/merkezHuzur §4 · esZamanliInsaat §3.5 · dogumAraligi §2.5 ·
//   kalabalikEsigi §2.6 · olayOlasiligi §6.2 · saldiriTaban §6.3 · hedefTur §7.1.
// kimlik: çağın şehir kimliği (kullanıcı kararı, 2026-10-26: "Surlu şehir" Orta Çağ'ın kimliği, konut değil).
export const CAGLAR = [
  {
    id: 'gocebe', ad: 'Göçebe Çağı', sira: 0, konut: 'cadir', merkez: 'kamp_atesi',
    acikAlan: 8, depoTavani: 30, bilgiTaban: 0.5, merkezHuzur: 5, esZamanliInsaat: 1, dogumAraligi: 4, kalabalikEsigi: 10,
    olayOlasiligi: 0.25, saldiriTaban: 3, hedefTur: 25,
    yeniKaynaklar: ['yiyecek', 'odun', 'tas', 'deri'], acilanEylemler: ['avlan', 'kesfet', 'hikaye_anlat', 'dinlen'],
    gecis: { nufus: 8, binalar: { cadir: 3, totem: 1 }, bulus: 'yerlesik_hayat', maliyet: { yiyecek: 30, odun: 25, tas: 15, deri: 10 } },
  },
  {
    id: 'tasdevri', ad: 'Taş Devri', sira: 1, konut: 'kulube', merkez: 'ocak_meydani',
    acikAlan: 10, depoTavani: 60, bilgiTaban: 1, merkezHuzur: 5, esZamanliInsaat: 2, dogumAraligi: 4, kalabalikEsigi: 22,
    olayOlasiligi: 0.25, saldiriTaban: 6, hedefTur: 40,
    yeniKaynaklar: ['alet'], acilanEylemler: ['alet_yap'],
    gecis: { nufus: 20, binalar: { kulube: 5, tas_ocagi: 1, tahil_bahcesi: 2 }, bulus: 'maden_eritme',
      maliyet: { yiyecek: 60, odun: 50, tas: 40, alet: 15 } },
  },
  {
    id: 'bronz', ad: 'Bronz/Demir Çağı', sira: 2, konut: 'kerpic_ev', merkez: 'koy_meydani',
    acikAlan: 12, depoTavani: 120, bilgiTaban: 1.5, merkezHuzur: 6, esZamanliInsaat: 2, dogumAraligi: 3, kalabalikEsigi: 50,
    olayOlasiligi: 0.30, saldiriTaban: 12, hedefTur: 60,
    yeniKaynaklar: ['kil', 'cevher', 'metal'], acilanEylemler: ['kervan_gonder'],
    gecis: { nufus: 45, binalar: { kerpic_ev: 9, mabet: 1, pazar_yeri: 1 }, bulus: 'yazi',
      maliyet: { yiyecek: 120, odun: 80, kil: 80, tas: 60, metal: 30 } },
  },
  {
    id: 'antik', ad: 'Antik Çağ', sira: 3, konut: 'tas_ev', merkez: 'agora',
    acikAlan: 14, depoTavani: 200, bilgiTaban: 2, merkezHuzur: 8, esZamanliInsaat: 3, dogumAraligi: 3, kalabalikEsigi: 95,
    olayOlasiligi: 0.30, saldiriTaban: 25, hedefTur: 80,
    yeniKaynaklar: ['mermer', 'sikke'], acilanEylemler: ['halka_hitap'],
    gecis: { nufus: 90, binalar: { tas_ev: 15, kutuphane: 1, tiyatro: 1 }, bulus: 'feodal_duzen',
      maliyet: { yiyecek: 200, tas: 150, mermer: 80, sikke: 100, metal: 50 } },
  },
  {
    id: 'ortacag', ad: 'Orta Çağ', sira: 4, konut: 'yari_ahsap_ev', merkez: 'sehir_meydani', kimlik: 'Surlu şehir',
    acikAlan: 16, depoTavani: 300, bilgiTaban: 2.5, merkezHuzur: 10, esZamanliInsaat: 3, dogumAraligi: 3, kalabalikEsigi: 160,
    olayOlasiligi: 0.35, saldiriTaban: 50, hedefTur: 100,
    yeniKaynaklar: ['kumas', 'kitap'], acilanEylemler: ['turnuva_duzenle'],
    gecis: null,
    zafer: { bina: 'katedral', nufus: 150 }, // zaferden sonra serbest kip (kullanıcı kararı)
  },
];
