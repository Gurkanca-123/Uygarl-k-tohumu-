// Görsel otomatik savaş sabitleri (docs/SAVAS.md §5–§7, şema §10). Çekirdek: src/core/savas.js · sahne: src/render/savas.js.
// Savaş yalnız `savas: true` seferlerinde ve oyuncu ayarı "Savaş sahnesi: Açık" iken (turIlerlet sec.savasSahnesi) devreye girer;
// kapalıyken seferler eski hesaplamalı yolla çözülür (aynı sonuç dağılımı).
export const SAVAS_TICK = 0.5;                 // sn (1×)
export const SAVAS_TICK_MAX = 50;              // 25 sn üst sınır
export const M_ARALIK = [0.4, 2.5];            // gizli düşman çarpanı (kademe kilidi, §6.1)
export const M_DENEME = 8;
export const FORM_SINIR = [0.85, 1.15];
export const KARS_SINIR = [0.8, 1.25];
export const SAVUNMA_FORM_SINIR = [0.95, 1.05]; // F3
export const ON_BOS_CEZA = 0.9;                // ön sıra boşsa formC × 0,9
// Savaş açıkken sefer zorluk çarpanı (§5.3: Öneri düzeninin formC × karsC kazancını dengeler). Kapalıyken uygulanmaz.
// Belgedeki ×1,10 ölçümle düşürüldü: tipik Göçebe ekibi (kahraman + 0–2 işçi) Öneri'de ≈ ×1,0–1,07 kazanır; ×1,10 büyük başarıyı
// %50 → %41'e indirdi (bot 50 tohum), ×1,05 ile %51 (±5 puan ölçütü içinde).
export const SAVAS_ZORLUK = { ayi_avi: 1.05 };
// Kademe kilidi ölçütleri (bitişte; §6.1). ekipCan = ekip toplam can / başlangıç.
export const KILIT_OLCUT = {
  buyuk: { dusmanCoker: true, ekipCanMin: 0.6, kahramanAyakta: true, cokenMax: 1, hedefCan: 0.78 },
  basari: { dusmanCoker: true, ekipCanMin: 0.25, ekipCanMax: 0.75, kahramanAyakta: true, hedefCan: 0.5 },
  kismi: { kacisCan: 0.5, cokenMin: 1, kahramanAyakta: true },
  basarisiz: { cekilmeCan: 0.35, dusmanCanMin: 0.4 },
};
// Simülasyon süresi ayarı: düşman tabanı ekibe göre ölçeklenir → m = 1'de ekip düşmanı ~OLDURME tick'te, düşman ekibi ~DAYANMA tick'te çökertir.
export const SIM_OLCEK = { oldurme: 24, dayanma: 30 };
// Kahraman öfkesi (§4.1): vuruş +20, alınan hasar başına +10, 100'de otomatik aktif yetenek.
export const OFKE = { vurus: 20, hasar: 10, esik: 100 };
export const COKME_GERI = 2;                   // çöken birim 2 tick sonra geri çekilir
export const KAHRAMAN_CEKILME = 3;             // kahraman çökerse ekip 3 tick sonra çekilir
// Kahraman birimi (§4.1): can 60 + 20 × Sv, saldırı 8 + 2 × Sv, zırh 3 + Sv, aralık 2; eşya: silah guc ×2 saldırı, giysi guc ×10 can.
export const KAHRAMAN_BIRIM = { can: [60, 20], saldiri: [8, 2], zirh: [3, 1], aralik: 2, silah: 2, giysi: 10 };
export const ONDER_BIRIM = { can: 50, saldiri: 7, zirh: 3, menzil: 1, aralik: 2, hiz: 1 };
// Köy savunmasında asker başına (T1..T5; §2.4). Bekçi 0,5 ile karşılaştır.
export const ASKER_SAVUNMA = [0.75, 1, 1.5, 2.5, 3.5];
export const ASKER_ORAN = 0.3;                 // asker ≤ floor(nüfus × 0,3)
export const ORDU_CAG = 'tasdevri';            // kalıcı asker (terfi) bu çağdan; Göçebe'de seferdeki işçilere rol verilir
export const KART_YILDIZ = [5, 10, 20, 35];    // F5
export const KART_ISE_ALMA = 10;               // F5
export const SAVAS_SON_MAX = 3;                // "Tekrar izle" için saklanan son savaş girdisi
