// Üretim (TASARIM §2.4, §3.3): bitişiklik, mevsim, huzur, buluş, yol, değiştirici çarpanları; adımlar d (ham üretim),
// e (dönüşüm) ve f (depo tavanı). Saf.
//
// uretim = isciBasina × isci × seviyeCarpani × (1 + bitisiklik + etkiAlani + kuresel + degistiriciBonus)
//          × mevsimCarpani × huzurCarpani × bulusCarpani × yolCarpani × degistiriciCarpani
// (bitişiklik ≤ BITISIKLIK_MAX; etki alanı / küresel / değiştirici bonusları bu sınırın dışında, §3.3 ve §4.5).
import { MEVSIMLER } from '../data/mevsimler.js';
import {
  BITISIKLIK_MAX, HUZUR_CARPAN, KEMER_SIKMA_SERBEST, SERBEST_ISLER, HUZUR_ATOLYE_GURULTU, ATOLYE_GURULTU_CAG,
  YOL_CEZA, YOL_CAG, VERGI,
} from '../data/denge.js';
import { takvim } from './takvim.js';
import { izgara, kenarKomsulari, mesafeHucreleri, binaUzakligi } from '../world/izgara.js';
import { gorunurKaro } from '../world/kesif.js';
import { yolAgi, yolBagli } from '../world/yol.js';
import {
  BINA, kopya, cagSira, binaKurulu, binaCalisir, etkinAtama, seviyeCarpani, bulusEtkileri,
  serbestAnahtar, depoTavani, etkinDegistiriciler, sonTur, bildir, KAYNAK, binaBul,
} from './yardimci.js';

// ---------- Izgara ----------
// Gerçek ızgara src/world'de (aşama 3). Bitişiklikte karolar oyuncunun GÖRDÜĞÜ hâliyle sayılır (sis sayılmaz, çağından
// önceki cevher/mermer kayalık sayılır).
export { izgara, kenarKomsulari, binaUzakligi };
export const karoAt = (d, x, y) => gorunurKaro(d, x, y);
function suYakin(d, b, m) {
  return mesafeHucreleri(d, b, m).some(([x, y]) => karoAt(d, x, y) === 'su');
}

const hedefEslesir = (hedef, karo, binaId) => {
  const [tur, deger] = hedef.split(':');
  if (tur === 'karo') return karo === deger;
  if (!binaId) return false;
  if (tur === 'bina') return binaId === deger;
  if (tur === 'etiket') return BINA[binaId].etiketler.includes(deger);
  return false;
};

// Arayüz: harita bitişikliği. Dönüş: { [uid]: { uretim (≤ BITISIKLIK_MAX), huzur, alan, kuresel } , toplamHuzur }.
// Yalnız kurulu binalar kaynak/hedef sayılır. Karo hedefleri yalnız bina kaplamayan karolarda sayılır.
export function hesaplaBitisiklik(d) {
  const n = d.harita.boyut;
  const hucre = izgara(d);
  const kurulu = d.binalar.filter((b) => binaKurulu(d, b));
  const sonuc = {};
  let toplamHuzur = 0;
  const etkin = etkinAtama(d);
  const gurultu = cagSira(d.cag) >= cagSira(ATOLYE_GURULTU_CAG);

  for (const b of kurulu) {
    const t = BINA[b.id];
    let uretim = 0, huzur = 0;
    for (const kural of t.bitisiklik) {
      const hedefler = [].concat(kural.hedef);
      const hucreler = kural.mesafe ? mesafeHucreleri(d, b, kural.mesafe) : kenarKomsulari(d, b);
      const gorulen = new Set();
      let sayac = 0;
      for (const [x, y] of hucreler) {
        const uid = hucre[y * n + x];
        if (uid) {
          if (gorulen.has(uid)) continue;
          gorulen.add(uid);
          const ob = binaBul(d, uid);
          if (ob && binaKurulu(d, ob) && hedefler.some((h) => hedefEslesir(h, null, ob.id))) sayac++;
        } else if (hedefler.some((h) => hedefEslesir(h, karoAt(d, x, y), null))) sayac++;
      }
      const adet = Math.min(sayac, kural.max ?? Infinity);
      uretim += (kural.etki.uretim || 0) * adet;
      huzur += (kural.etki.huzur || 0) * adet;
    }
    // Genel kural §3.3: atölye bir konuta bitişikse konut başına gürültü cezası (Bronz+).
    if (gurultu && t.etiketler.includes('atolye')) {
      const komsu = new Set(kenarKomsulari(d, b).map(([x, y]) => hucre[y * n + x]).filter(Boolean));
      for (const uid of komsu) {
        const ob = binaBul(d, uid);
        if (ob && binaKurulu(d, ob) && BINA[ob.id].tur === 'konut') huzur += HUZUR_ATOLYE_GURULTU;
      }
    }
    sonuc[b.uid] = { uretim: Math.min(uretim, BITISIKLIK_MAX), huzur, alan: 0, kuresel: 0 };
    toplamHuzur += huzur;
  }

  // Etki alanı (§3.3): aynı türden kaynaklar üst üste binmez (en yükseği), farklı türler toplanır.
  const kaynaklar = kurulu.filter((b) => BINA[b.id].etkiAlani && binaCalisir(d, b)
    && (!BINA[b.id].etkiIsciGerekir || (etkin[b.uid] || 0) > 0));
  // Küresel (Lonca): hedef etiketli tüm binalara.
  const kureseller = kurulu.filter((b) => BINA[b.id].kuresel && binaCalisir(d, b));
  for (const b of kurulu) {
    const t = BINA[b.id];
    const enIyi = {};
    for (const k of kaynaklar) {
      const ea = BINA[k.id].etkiAlani;
      if (!t.etiketler.includes(ea.hedefEtiket) || binaUzakligi(k, b) > ea.yaricap) continue;
      enIyi[k.id] = Math.max(enIyi[k.id] || 0, ea.etki.uretim || 0);
    }
    sonuc[b.uid].alan = Object.values(enIyi).reduce((a, x) => a + x, 0);
    for (const k of kureseller) {
      const kr = BINA[k.id].kuresel;
      if (t.etiketler.includes(kr.hedefEtiket)) sonuc[b.uid].kuresel += kr.etki.uretim || 0;
    }
  }
  return { ...sonuc, toplamHuzur };
}

// ---------- Çarpanlar ----------
export function huzurCarpani(huzur) {
  return HUZUR_CARPAN.find((h) => huzur >= h.min)?.carpan ?? HUZUR_CARPAN[HUZUR_CARPAN.length - 1].carpan;
}

export function mevsimCarpani(d, etiket, tur = d.tur) {
  if (!etiket) return 1;
  const m = MEVSIMLER[takvim(tur).mevsimSira];
  let c = m.carpan[etiket] ?? 1;
  for (const e of bulusEtkileri(d, 'mevsimCarpani')) {
    if (e.hedef === `etiket:${etiket}` && e.deger[m.id] !== undefined) c = e.deger[m.id];
  }
  return c;
}

// etiketler: üretici etiketleri (binanın etiketleri + mevsim etiketi; serbest işte mevsim etiketi).
export function bulusCarpani(d, kaynakId, etiketler) {
  let c = 1;
  for (const e of bulusEtkileri(d, 'uretimCarpani')) {
    const [tur, deger] = e.hedef.split(':');
    if ((tur === 'kaynak' && deger === kaynakId) || (tur === 'etiket' && etiketler.includes(deger))) c *= e.deger;
  }
  return c;
}

// Değiştirici üretim etkileri: { carpan, bonus }. etiket '*' tüm üretim; suMesafe yalnız suya yakın binalar.
export function degistiriciUretim(d, etiketler, bina = null) {
  let carpan = 1, bonus = 0;
  for (const m of etkinDegistiriciler(d)) {
    const u = m.etki?.uretim;
    if (!u) continue;
    if (u.etiket !== '*' && !etiketler.includes(u.etiket)) continue;
    if (u.suMesafe && !(bina && suYakin(d, bina, u.suMesafe))) continue;
    if (u.carpan !== undefined) carpan *= u.carpan;
    if (u.bonus) bonus += u.bonus;
  }
  return { carpan, bonus };
}

// §3.4: Bronz+ binaları merkeze yolla (ya da doğrudan merkez bitişikliğiyle) bağlı değilse YOL_CEZA (world/yol.js).
// Göçebe/Taş binaları muaf. `ag`: önceden hesaplanmış yol ağı (verilmezse önbellekli hesaplanır).
export { yolBagli };
export function yolCarpani(d, b, ag) {
  if (cagSira(BINA[b.id].cag) < cagSira(YOL_CAG)) return 1;
  return yolBagli(d, b, ag ?? yolAgi(d)) ? 1 : YOL_CEZA;
}

const binaEtiketleri = (t) => (t.mevsimEtiketi ? [...t.etiketler, t.mevsimEtiketi] : [...t.etiketler]);

// Bir binanın işçi başına olmayan ortak çıktı çarpanı (seviye dahil), kaynak bazında bulus çarpanı ayrı.
function binaCarpani(d, b, bit) {
  const t = BINA[b.id];
  const et = binaEtiketleri(t);
  const deg = degistiriciUretim(d, et, b);
  const k = bit[b.uid] || { uretim: 0, alan: 0, kuresel: 0 };
  return {
    et,
    ortak: seviyeCarpani(b) * (1 + k.uretim + k.alan + k.kuresel + deg.bonus) * mevsimCarpani(d, t.mevsimEtiketi)
      * huzurCarpani(d.huzur) * yolCarpani(d, b) * deg.carpan,
  };
}
const ekle = (hedef, r, m) => { if (m) hedef[r] = (hedef[r] || 0) + m; };

// Ham üretim (dönüşüm binaları hariç): binalar, serbest işler, sabit üretim, vergi. Durumu değiştirmez.
// Dönüş: { toplam:{kaynak}, kaynaklar:{ '<uid>'|'serbest:x'|'vergi': {kaynak} } }
export function hamUretimHesapla(d) {
  const bit = hesaplaBitisiklik(d);
  const etkin = etkinAtama(d);
  const toplam = {};
  const kaynaklar = {};
  const hc = huzurCarpani(d.huzur);

  for (const b of d.binalar) {
    if (!binaCalisir(d, b)) continue;
    const t = BINA[b.id];
    const parca = {};
    const { et, ortak } = binaCarpani(d, b, bit);
    const isci = etkin[b.uid] || 0;
    if (Object.keys(t.girdi).length === 0 && isci > 0) {
      for (const [r, v] of Object.entries(t.uretim)) ekle(parca, r, v * isci * ortak * bulusCarpani(d, r, et));
    }
    for (const [r, v] of Object.entries(t.sabitUretim)) ekle(parca, r, v * seviyeCarpani(b) * hc);
    if (Object.keys(parca).length) {
      kaynaklar[b.uid] = parca;
      for (const [r, m] of Object.entries(parca)) ekle(toplam, r, m);
    }
  }

  const kemer = d.acTur >= 1 ? KEMER_SIKMA_SERBEST : 1;
  for (const is of SERBEST_ISLER) {
    const n = etkin[serbestAnahtar(is.id)] || 0;
    if (!n) continue;
    let birim = is.uretim;
    for (const e of bulusEtkileri(d, 'serbestIs')) if (e.hedef === is.id) birim = { ...birim, ...e.deger };
    const et = is.mevsimEtiketi ? [is.mevsimEtiketi] : [];
    const deg = degistiriciUretim(d, et);
    const parca = {};
    for (const [r, v] of Object.entries(birim)) {
      ekle(parca, r, v * n * (1 + deg.bonus) * mevsimCarpani(d, is.mevsimEtiketi) * hc * bulusCarpani(d, r, et) * kemer * deg.carpan);
    }
    kaynaklar[serbestAnahtar(is.id)] = parca;
    for (const [r, m] of Object.entries(parca)) ekle(toplam, r, m);
  }

  const vergi = VERGI.find((v) => v.id === d.vergi);
  if (vergi?.kisiBasi) {
    kaynaklar.vergi = { sikke: vergi.kisiBasi * d.nufus };
    ekle(toplam, 'sikke', vergi.kisiBasi * d.nufus);
  }
  return { toplam, kaynaklar };
}

// Adım d: ham üretim depoya eklenir (kırpma f adımında).
export function adimHamUretim(durum, bildirimler = []) {
  const d = kopya(durum);
  const { toplam } = hamUretimHesapla(d);
  const st = sonTur(d);
  for (const [r, m] of Object.entries(toplam)) {
    d.kaynaklar[r] = (d.kaynaklar[r] || 0) + m;
    ekle(st.uretim, r, m);
  }
  return d;
}

// Adım e: dönüşüm binaları. Girdi depoda yoksa o işçi üretmez (kısmi çalışma). Girdi işçi × seviye ile ölçeklenir,
// diğer çarpanlar yalnız çıktıya uygulanır (§2.4). Binalar inşa sırasıyla girdi alır.
export function adimDonusum(durum, bildirimler = []) {
  const d = kopya(durum);
  const bit = hesaplaBitisiklik(d);
  const etkin = etkinAtama(d);
  const st = sonTur(d);
  for (const b of d.binalar) {
    const t = BINA[b.id];
    if (Object.keys(t.girdi).length === 0 || !binaCalisir(d, b)) continue;
    const isci = etkin[b.uid] || 0;
    if (!isci) continue;
    const sv = seviyeCarpani(b);
    let calisan = isci;
    for (const [r, g] of Object.entries(t.girdi)) {
      calisan = Math.min(calisan, Math.floor(((d.kaynaklar[r] || 0) + 1e-9) / (g * sv)));
    }
    if (calisan < isci) {
      bildir(bildirimler, 'girdi_eksik', `${t.ad}: girdi yetersiz, ${isci - calisan} işçi boşta kaldı.`, 'uyari', { uid: b.uid });
    }
    if (calisan <= 0) continue;
    for (const [r, g] of Object.entries(t.girdi)) {
      d.kaynaklar[r] = Math.max(0, d.kaynaklar[r] - g * sv * calisan);
      ekle(st.tuketim, r, g * sv * calisan);
    }
    const { et, ortak } = binaCarpani(d, b, bit);
    for (const [r, v] of Object.entries(t.uretim)) {
      const m = v * calisan * ortak * bulusCarpani(d, r, et);
      d.kaynaklar[r] = (d.kaynaklar[r] || 0) + m;
      ekle(st.uretim, r, m);
    }
  }
  return d;
}

// Adım f: depo tavanına kırpma; fazla kaybolur, uyarı verilir.
export function adimDepoKirp(durum, bildirimler = []) {
  const d = kopya(durum);
  const st = sonTur(d);
  const kayip = [];
  for (const r of Object.keys(d.kaynaklar)) {
    const tavan = depoTavani(d, r);
    if (d.kaynaklar[r] > tavan + 1e-9) {
      const fazla = d.kaynaklar[r] - tavan;
      d.kaynaklar[r] = tavan;
      ekle(st.kirpilan, r, fazla);
      kayip.push(`${KAYNAK[r]?.ad ?? r} ${Math.round(fazla * 10) / 10}`);
    }
  }
  if (kayip.length) bildir(bildirimler, 'depo_dolu', `Depo dolu, kaybolan: ${kayip.join(', ')}.`, 'uyari');
  return d;
}
