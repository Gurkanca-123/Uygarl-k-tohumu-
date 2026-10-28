// Hedefler (docs/AKSIYON.md §6): çağ destanı (MVP: Göçebe "Ayının İzinde") ve mevsim görev kartları. Saf.
// Kart çekimi durum RNG'lerini tüketmez: rngBaslat(`kart:${tohum}:${tur}`) (kayıt-yükle ile yeniden çekilemez, akışlar bozulmaz).
import { DESTANLAR, MEVSIM_GOREVLERI } from '../data/hedefler.js';
import { GOREV_SURE, GOREV_KART_SAYI, GOREV_MEVSIM, MEVSIM_TUR, SEFER_OLCEK } from '../data/denge.js';
import {
  kopya, cagSira, mevcutCag, calisanBinalar, kaynakUygula, degistiriciEkle, bildir, olayKilitli, OLAY_KILIDI, hataDon, BINA,
  aktifSeferler,
} from './yardimci.js';
import { takvim } from './takvim.js';
import { rngBaslat, rngSonraki } from './rng.js';
import { xpEkle, sandigaKoy, esyaSahip, ilkKahramanTeklifi, ESYA } from './kahraman.js';
import { iliskiDegistir } from './komsu_temel.js';
import { bilgiEkle } from './arastirma.js';
import { huzurEkle } from './huzur.js';

export const DESTAN = Object.fromEntries(DESTANLAR.map((x) => [x.id, x]));
export const GOREV = Object.fromEntries(MEVSIM_GOREVLERI.map((x) => [x.id, x]));
export const hedefVarsayilan = () => ({ destan: { id: DESTANLAR[0].id, adim: 0, bitti: false }, kartlar: [], gorev: null,
  unvanlar: [], sayac: { hediye: 0 } });

const seferBasariSayisi = (d) => (d.sefer?.istatistik?.basari || 0) + (d.sefer?.istatistik?.buyuk || 0);

// ---------- Destan ----------
// Kopya üstünde: olay = { tur: 'isaret', isaret } | { tur: 'sefer', id, sonuc } | { tur: 'komut', id }.
// Dönüş: adım ilerlediyse true.
export function destanIlerlet(d, olay, bildirimler) {
  const h = d.hedef?.destan;
  if (!h || h.bitti) return false;
  const ds = DESTAN[h.id];
  if (!ds || cagSira(d.cag) < cagSira(ds.cag)) return false;
  const adim = ds.adimlar[h.adim];
  const k = adim?.kosul || {};
  const tutar = (olay.tur === 'isaret' && k.isaret === olay.isaret)
    || (olay.tur === 'sefer' && k.sefer?.id === olay.id && k.sefer.sonuc.includes(olay.sonuc))
    || (olay.tur === 'komut' && k.komut?.id === olay.id);
  if (!tutar) return false;
  h.adim += 1;
  if (h.adim >= ds.adimlar.length) {
    h.bitti = true;
    destanOdulu(d, ds, bildirimler);
  } else {
    bildir(bildirimler, 'hedef_destan', `${ds.ad}: ${adim.metin.replace(/\.$/, '')} — tamam. Sıradaki: ${ds.adimlar[h.adim].metin}`, 'iyi',
      { destan: ds.id, adim: h.adim });
  }
  return true;
}

function destanOdulu(d, ds, bildirimler) {
  const o = ds.odul || {};
  if (o.esya && !esyaSahip(d, o.esya)) sandigaKoy(d, o.esya, bildirimler);
  if (o.huzurKalici) degistiriciEkle(d, { id: `destan_${ds.id}`, sure: null, etki: { huzur: o.huzurKalici } });
  if (o.unvan && !d.hedef.unvanlar.includes(o.unvan)) d.hedef.unvanlar = [...d.hedef.unvanlar, o.unvan];
  if (o.kaynak) kaynakUygula(d, o.kaynak);
  if (o.bp) bilgiEkle(d, o.bp);
  bildir(bildirimler, 'hedef_destan', `Destan tamamlandı: ${ds.ad}! ${o.unvan ? `Unvan: "${o.unvan}". ` : ''}`
    + `${o.huzurKalici ? `Huzur kalıcı +${o.huzurKalici}.` : ''}`.trim(), 'iyi', { destan: ds.id, bitti: true });
}

// Adımın komutla tamamlanması (ör. postu Totem'e sun).
export function destanAdimBilgi(d) {
  const h = d.hedef?.destan;
  const ds = h && DESTAN[h.id];
  if (!ds || h.bitti) return { uygun: false, hata: 'Etkin destan adımı yok.' };
  const k = ds.adimlar[h.adim]?.kosul?.komut;
  if (!k) return { uygun: false, hata: 'Bu adım bir komutla tamamlanmaz.' };
  if (k.gerekir?.bina && !calisanBinalar(d).some((b) => b.id === k.gerekir.bina)) {
    return { uygun: false, hata: `Bu adım için ${BINA[k.gerekir.bina].ad} gerekir.` };
  }
  return { uygun: true, hata: null };
}
export function destanAdim(durum) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const b = destanAdimBilgi(durum);
  if (b.hata) return hataDon(durum, b.hata);
  const d = kopya(durum);
  const bildirimler = [];
  destanIlerlet(d, { tur: 'komut', id: 'destanAdim' }, bildirimler);
  return { durum: d, bildirimler };
}

// ---------- Mevsim görevleri ----------
function kartUygun(d, g) {
  if (cagSira(d.cag) < cagSira(g.cagMin)) return false;
  if (g.uygun?.tehditAktif && !d.tehdit?.aktif) return false;
  if (g.uygun?.komsu && !(d.komsular || []).length) return false;
  return true;
}
export function kartCek(d) {
  const havuz = MEVSIM_GOREVLERI.filter((g) => kartUygun(d, g)).map((g) => g.id);
  let rng = rngBaslat(`kart:${d.tohum}:${d.tur}`);
  const secilen = [];
  while (havuz.length && secilen.length < GOREV_KART_SAYI) {
    const r = rngSonraki(rng);
    rng = r.rng;
    secilen.push(havuz.splice(Math.floor(r.deger * havuz.length), 1)[0]);
  }
  return secilen;
}

const olcek = (d) => 1 + SEFER_OLCEK * mevcutCag(d).sira;
// Görev durumu: 'tamam' | 'basarisiz' | null (sürüyor).
export function gorevDurumu(d, gv) {
  const g = GOREV[gv.id];
  const k = g.kosul;
  if (k.tur === 'kaynak') return (d.kaynaklar[k.kaynak] || 0) + 1e-9 >= Math.ceil(k.miktar * olcek(d)) ? 'tamam' : null;
  if (k.tur === 'sefer') return seferBasariSayisi(d) - gv.baslangic.sefer >= k.adet ? 'tamam' : null;
  if (k.tur === 'hediye') return (d.hedef.sayac.hediye || 0) > gv.baslangic.hediye ? 'tamam' : null;
  if (k.tur === 'tehdit') {
    const yeni = (d.tehdit?.gecmis || []).filter((x) => x.tur >= gv.baslangic.tur);
    if (yeni.some((x) => ['harac', 'yenilgi'].includes(x.sonuc))) return 'basarisiz';
    if (yeni.some((x) => ['puskurtme', 'kismi', 'saklan', 'elci'].includes(x.sonuc))) return 'tamam';
  }
  return null;
}

function gorevOdulu(d, g, bildirimler) {
  const o = g.odul || {};
  if (o.kaynak) kaynakUygula(d, o.kaynak, { carpan: olcek(d) });
  if (o.bp) bilgiEkle(d, o.bp);
  if (o.huzur) huzurEkle(d, o.huzur);
  if (o.xp) for (const k of d.kahramanlar || []) xpEkle(d, k, o.xp, bildirimler);
  if (o.iliski && d.komsular?.[0]) iliskiDegistir(d, d.komsular[0], o.iliski);
  bildir(bildirimler, 'hedef_gorev_tamam', `Görev tamamlandı: ${g.ad}.`, 'iyi', { gorev: g.id, odul: o });
}

export function gorevKartiSec(durum, kartId) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (durum.hedef.gorev) return hataDon(durum, 'Zaten etkin bir mevsim görevi var.');
  if (!durum.hedef.kartlar.includes(kartId)) return hataDon(durum, 'Bu kart şu an seçilemez.');
  const d = kopya(durum);
  d.hedef.gorev = { id: kartId, kalan: GOREV_SURE,
    baslangic: { tur: d.tur, sefer: seferBasariSayisi(d), hediye: d.hedef.sayac.hediye || 0 } };
  d.hedef.kartlar = [];
  return { durum: d };
}

// ---------- Adım o3 (takvimden sonra; d.tur yeni günün turu) ----------
export function adimHedef(durum, bildirimler = []) {
  if (!durum.hedef) return durum;
  const d = kopya(durum);
  ilkKahramanTeklifi(d, bildirimler);
  // Destan: haritada ayı izi görüldü mü; işaret kaybolduysa adım geri döner.
  const h = d.hedef.destan;
  const ds = DESTAN[h.id];
  if (ds && !h.bitti) {
    for (const i of d.hedefIsaretleri || []) destanIlerlet(d, { tur: 'isaret', isaret: i.tur }, bildirimler);
    const g = ds.geriDonus;
    if (g && h.adim === g.adim && !(d.hedefIsaretleri || []).some((i) => i.tur === g.isaret)
      && !aktifSeferler(d).some((s) => s.tur === 'ayi_avi')) {
      h.adim = g.hedef;
      bildir(bildirimler, 'hedef_destan', `${ds.ad}: ayının izi kayboldu; yeni bir iz bulmalısın.`, 'uyari', { destan: ds.id, adim: h.adim });
    }
  }
  // Etkin görev
  const gv = d.hedef.gorev;
  if (gv) {
    const g = GOREV[gv.id];
    const s = gorevDurumu(d, gv);
    if (s === 'tamam') { gorevOdulu(d, g, bildirimler); d.hedef.gorev = null; }
    else {
      gv.kalan -= 1;
      if (s === 'basarisiz' || gv.kalan <= 0) {
        bildir(bildirimler, 'hedef_gorev_basarisiz', `Görev tamamlanamadı: ${g.ad}.`, 'uyari', { gorev: g.id });
        d.hedef.gorev = null;
      }
    }
  }
  // Mevsim başı kartlar (Bahar/Yaz/Güz); Kış başında seçilmemiş kartlar düşer.
  if (d.tur % MEVSIM_TUR === 0 && d.tur > 0) {
    const m = takvim(d.tur).mevsim;
    d.hedef.kartlar = GOREV_MEVSIM.includes(m) && !d.hedef.gorev ? kartCek(d) : [];
    if (d.hedef.kartlar.length) {
      bildir(bildirimler, 'hedef_kartlar', `Yeni mevsim görevleri: ${d.hedef.kartlar.map((id) => GOREV[id].ad).join(', ')}.`, 'bilgi',
        { kartlar: [...d.hedef.kartlar] });
    }
  }
  return d;
}

// ---------- Arayüz okuması ----------
export function hedefGorunumu(d) {
  const h = d.hedef;
  const ds = DESTAN[h.destan.id];
  const kart = (id) => { const g = GOREV[id]; return { id, ad: g.ad, metin: g.metin, odul: g.odul, sure: GOREV_SURE }; };
  return {
    destan: ds ? { id: ds.id, ad: ds.ad, metin: ds.metin, adim: h.destan.adim, bitti: h.destan.bitti,
      adimlar: ds.adimlar.map((a, i) => ({ id: a.id, metin: a.metin, tamam: h.destan.bitti || i < h.destan.adim, etkin: !h.destan.bitti && i === h.destan.adim })),
      komut: destanAdimBilgi(d), odul: { ...ds.odul, esyaAd: ds.odul.esya ? ESYA[ds.odul.esya].ad : null } } : null,
    kartlar: h.kartlar.map(kart),
    gorev: h.gorev ? { ...kart(h.gorev.id), kalan: h.gorev.kalan } : null,
    unvanlar: [...h.unvanlar],
  };
}
