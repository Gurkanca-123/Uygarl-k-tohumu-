// Buluş ağacı (TASARIM §5, şema §10). Bir çağın buluşu yalnız o çağda veya sonrasında araştırılır.
// Alanlar: id, ad, cag, maliyet:{ bilgi, kitap? }, gerekir[], acar:{ binalar[], eylemler[], ozellikler[] },
//   etkiler:[{ tur, hedef, deger }], cagBulusu, aciklama, mvp
// etki türleri: uretimCarpani (hedef 'etiket:x' | 'kaynak:x') · bozulma (deger: düşülen oran) · depoCarpani (hedef 'bina:x') ·
//   savunma (hedef 'onder', ek değer) · mevsimCarpani (hedef 'etiket:mevsim', deger {mevsim: çarpan}) ·
//   serbestIs (hedef iş id'si, deger {kaynak: işçi başına yeni değer}).
// Şemaya eklenenler: kesifIyiSonuc (Keşfet iyi sonuç +), kesifYaricap (Keşfet harita yarıçapı +, aşama 3; TODO(tasarim) sayı varsayım), isciSavunmaCarpani (hedef 'isciTuru:x'), seviyeAc (hedef 'cag:x', deger maxSv);
//   acar.ozellikler (örn. 'vergi').
function bulus(o) {
  return { gerekir: [], etkiler: [], cagBulusu: false, mvp: false, ...o,
    acar: { binalar: [], eylemler: [], ozellikler: [], ...(o.acar || {}) } };
}

export const BULUSLAR = [
  // ---------- Göçebe ----------
  bulus({ id: 'mizrak_ucu', ad: 'Mızrak Ucu', cag: 'gocebe', maliyet: { bilgi: 6 }, mvp: true,
    etkiler: [{ tur: 'uretimCarpani', hedef: 'etiket:avcilik', deger: 1.25 }, { tur: 'savunma', hedef: 'onder', deger: 1 },
      { tur: 'bekciCarpani', hedef: 'bekci', deger: 1.5 }],
    aciklama: 'Avcılık ×1,25; önder savunması +1; bekçi ×1,5.' }),
  bulus({ id: 'tas_yontma', ad: 'Taş Yontma', cag: 'gocebe', maliyet: { bilgi: 10 }, mvp: true, acar: { binalar: ['totem'] },
    etkiler: [{ tur: 'serbestIs', hedef: 'tasci', deger: { tas: 1.5 } }], aciklama: 'Totem; serbest Taşçı 1 → 1,5.' }),
  bulus({ id: 'hayvan_izleri', ad: 'Hayvan İzleri', cag: 'gocebe', maliyet: { bilgi: 8 }, mvp: true, acar: { binalar: ['gozcu_diregi'] },
    etkiler: [{ tur: 'kesifIyiSonuc', hedef: 'kesfet', deger: 0.10 }, { tur: 'kesifYaricap', hedef: 'kesfet', deger: 1 }],
    aciklama: 'Gözcü Direği; Keşfet iyi sonuç +%10, keşif yarıçapı +1.' }),
  bulus({ id: 'deri_isleme', ad: 'Deri İşleme', cag: 'gocebe', maliyet: { bilgi: 8 }, gerekir: ['mizrak_ucu'], mvp: true,
    acar: { binalar: ['kurutma_rafi'] }, etkiler: [{ tur: 'uretimCarpani', hedef: 'kaynak:deri', deger: 1.25 }],
    aciklama: 'Kurutma Rafı; deri üretimi ×1,25.' }),
  bulus({ id: 'yerlesik_hayat', ad: 'Yerleşik Hayat', cag: 'gocebe', maliyet: { bilgi: 12 }, gerekir: ['tas_yontma', 'deri_isleme'],
    cagBulusu: true, mvp: true, aciklama: "Taş Devri'ne geçiş." }),

  // ---------- Taş Devri ----------
  bulus({ id: 'balikcilik', ad: 'Balıkçılık', cag: 'tasdevri', maliyet: { bilgi: 15 }, gerekir: ['mizrak_ucu'],
    acar: { binalar: ['balikci_siginagi'] }, aciklama: 'Balıkçı Sığınağı.' }),
  bulus({ id: 'tohum_ekme', ad: 'Tohum Ekme', cag: 'tasdevri', maliyet: { bilgi: 18 }, gerekir: ['yerlesik_hayat'],
    acar: { binalar: ['tahil_bahcesi'] }, aciklama: 'Tahıl Bahçesi.' }),
  bulus({ id: 'evcilestirme', ad: 'Evcilleştirme', cag: 'tasdevri', maliyet: { bilgi: 20 }, gerekir: ['hayvan_izleri'],
    acar: { binalar: ['agil'] }, aciklama: 'Ağıl.' }),
  bulus({ id: 'comlekcilik', ad: 'Çömlekçilik', cag: 'tasdevri', maliyet: { bilgi: 22 }, gerekir: ['tohum_ekme'],
    etkiler: [{ tur: 'bozulma', hedef: 'yiyecek', deger: 0.01 }, { tur: 'depoCarpani', hedef: 'bina:erzak_cukuru', deger: 1.5 }],
    aciklama: 'Bozulma −1 puan; Erzak Çukuru deposu ×1,5.' }),
  bulus({ id: 'maden_eritme', ad: 'Maden Eritme', cag: 'tasdevri', maliyet: { bilgi: 30 }, gerekir: ['comlekcilik'], cagBulusu: true,
    aciklama: "Bronz/Demir Çağı'na geçiş." }),

  // ---------- Bronz/Demir ----------
  bulus({ id: 'takas', ad: 'Takas', cag: 'bronz', maliyet: { bilgi: 35 }, acar: { binalar: ['pazar_yeri'] }, aciklama: 'Pazar Yeri.' }),
  bulus({ id: 'sulama', ad: 'Sulama', cag: 'bronz', maliyet: { bilgi: 35 }, gerekir: ['tohum_ekme'], acar: { binalar: ['sulanan_tarla'] },
    aciklama: 'Sulanan Tarla.' }),
  bulus({ id: 'tunc_dokum', ad: 'Tunç Döküm', cag: 'bronz', maliyet: { bilgi: 40 }, gerekir: ['maden_eritme'], acar: { binalar: ['demirci'] },
    etkiler: [{ tur: 'uretimCarpani', hedef: 'kaynak:alet', deger: 1.25 }], aciklama: 'Demirci; alet üretimi ×1,25.' }),
  bulus({ id: 'demir_isleme', ad: 'Demir İşleme', cag: 'bronz', maliyet: { bilgi: 55 }, gerekir: ['tunc_dokum'],
    etkiler: [{ tur: 'uretimCarpani', hedef: 'kaynak:metal', deger: 1.5 }, { tur: 'isciSavunmaCarpani', hedef: 'isciTuru:nobetci', deger: 1.5 }],
    aciklama: 'Metal üretimi ×1,5; nöbetçi değeri ×1,5.' }),
  bulus({ id: 'yazi', ad: 'Yazı', cag: 'bronz', maliyet: { bilgi: 60 }, gerekir: ['takas'], cagBulusu: true, aciklama: "Antik Çağ'a geçiş." }),

  // ---------- Antik ----------
  bulus({ id: 'para', ad: 'Para', cag: 'antik', maliyet: { bilgi: 65 }, gerekir: ['yazi'], acar: { binalar: ['darphane'], ozellikler: ['vergi'] },
    aciklama: 'Darphane ve vergi.' }),
  bulus({ id: 'felsefe', ad: 'Felsefe', cag: 'antik', maliyet: { bilgi: 70 }, gerekir: ['yazi'], acar: { binalar: ['kutuphane'] },
    aciklama: 'Kütüphane.' }),
  bulus({ id: 'denizcilik', ad: 'Denizcilik', cag: 'antik', maliyet: { bilgi: 70 }, gerekir: ['takas'], acar: { binalar: ['liman'] },
    aciklama: 'Liman.' }),
  bulus({ id: 'muhendislik', ad: 'Mühendislik', cag: 'antik', maliyet: { bilgi: 80 }, gerekir: ['yazi'],
    acar: { binalar: ['su_kemeri', 'tiyatro'] }, aciklama: 'Su Kemeri, Tiyatro.' }),
  bulus({ id: 'feodal_duzen', ad: 'Feodal Düzen', cag: 'antik', maliyet: { bilgi: 120 }, gerekir: ['muhendislik', 'para'], cagBulusu: true,
    aciklama: "Orta Çağ'a geçiş." }),

  // ---------- Orta Çağ ----------
  bulus({ id: 'dokumacilik', ad: 'Dokumacılık', cag: 'ortacag', maliyet: { bilgi: 110 },
    acar: { binalar: ['dokuma_atolyesi', 'darussifa'] }, aciklama: 'Dokuma Atölyesi, Darüşşifa.' }),
  bulus({ id: 'uclu_ekim', ad: 'Üçlü Ekim', cag: 'ortacag', maliyet: { bilgi: 120 }, gerekir: ['sulama'], acar: { binalar: ['ciftlik'] },
    etkiler: [{ tur: 'mevsimCarpani', hedef: 'etiket:tarim', deger: { kis: 0.3 } }], aciklama: 'Çiftlik; kışta tarım 0 → 0,3.' }),
  bulus({ id: 'su_degirmeni', ad: 'Su Değirmeni', cag: 'ortacag', maliyet: { bilgi: 130 }, gerekir: ['muhendislik'],
    acar: { binalar: ['degirmen'] }, aciklama: 'Değirmen.' }),
  bulus({ id: 'lonca_sistemi', ad: 'Lonca Sistemi', cag: 'ortacag', maliyet: { bilgi: 150, kitap: 10 }, gerekir: ['dokumacilik'],
    acar: { binalar: ['lonca_binasi'] }, aciklama: 'Lonca Binası.' }),
  bulus({ id: 'gotik_mimari', ad: 'Gotik Mimari', cag: 'ortacag', maliyet: { bilgi: 200, kitap: 20 }, gerekir: ['su_degirmeni', 'lonca_sistemi'],
    cagBulusu: true, acar: { binalar: ['katedral'] }, etkiler: [{ tur: 'seviyeAc', hedef: 'cag:ortacag', deger: 3 }],
    aciklama: 'Katedral; Orta Çağ binalarında Sv3.' }),
];
