// Veri tabloları arası çapraz başvuru denetimi. Saf fonksiyon: tabloları alır, hata dizgileri dizisi döner (boş = geçerli).
// Denetlenenler: kimlik biçimi/tekrarı, kaynak/bina/buluş/çağ/karo/eylem/olay/mevsim başvuruları, buluş bağımlılık döngüsü,
// buluş ↔ bina açılış tutarlılığı, çağ sırası (başvurulan şey daha geç çağda açılamaz), olay seçenek kuralları.
const KIMLIK = /^[a-z][a-z0-9_]*$/;
const BINA_TURLERI = ['merkez', 'konut', 'uretim', 'donusum', 'depo', 'huzur', 'savunma', 'bilgi', 'kamu', 'anit'];
const ISCI_TURLERI = ['nobetci', 'asker', 'sovalye', 'rahip', 'bilgin', 'kesis'];
const BULUS_ETKI_TURLERI = ['uretimCarpani', 'bozulma', 'depoCarpani', 'savunma', 'mevsimCarpani', 'serbestIs',
  'kesifIyiSonuc', 'isciSavunmaCarpani', 'seviyeAc'];

export function dogrula(v) {
  const h = [];
  const hata = (m) => h.push(m);

  const kume = (tablo) => new Map((tablo || []).map((x) => [x.id, x]));
  const cag = kume(v.CAGLAR), kay = kume(v.KAYNAKLAR), karo = kume(v.KAROLAR), bina = kume(v.BINALAR);
  const bul = kume(v.BULUSLAR), olay = kume(v.OLAYLAR), eyl = kume(v.EYLEMLER), mev = kume(v.MEVSIMLER);
  const sira = (id) => (cag.has(id) ? cag.get(id).sira : Infinity);
  const etiketler = new Set([...(v.MEVSIM_ETIKETLERI || []), ...(v.BINALAR || []).flatMap((b) => b.etiketler || []), '*']);
  const isler = new Set((v.DENGE?.SERBEST_ISLER || []).map((i) => i.id));

  // --- 1. kimlikler ---
  for (const [ad, tablo] of Object.entries({ CAGLAR: v.CAGLAR, KAYNAKLAR: v.KAYNAKLAR, KAROLAR: v.KAROLAR, BINALAR: v.BINALAR,
    BULUSLAR: v.BULUSLAR, OLAYLAR: v.OLAYLAR, EYLEMLER: v.EYLEMLER, MEVSIMLER: v.MEVSIMLER })) {
    if (!Array.isArray(tablo)) { hata(`${ad}: dizi değil`); continue; }
    const gorulen = new Set();
    for (const x of tablo) {
      if (typeof x.id !== 'string' || !KIMLIK.test(x.id)) hata(`${ad}: geçersiz id "${x.id}"`);
      if (gorulen.has(x.id)) hata(`${ad}: tekrarlanan id "${x.id}"`);
      gorulen.add(x.id);
      if (typeof x.ad !== 'string' || !x.ad) hata(`${ad}.${x.id}: ad yok`);
    }
  }
  if (bina.has('bilgi') || kay.has('bilgi')) hata('"bilgi" kimliği BP için ayrılmıştır');

  // --- yardımcılar ---
  const kaynakNesne = (yer, nesne, { bilgiOlur = false, enGecCag = null } = {}) => {
    if (nesne == null) return;
    if (typeof nesne !== 'object') { hata(`${yer}: miktar nesnesi değil`); return; }
    for (const [k, n] of Object.entries(nesne)) {
      if (k === 'bilgi' && bilgiOlur) { if (typeof n !== 'number') hata(`${yer}.bilgi: sayı değil`); continue; }
      if (!kay.has(k)) { hata(`${yer}: bilinmeyen kaynak "${k}"`); continue; }
      if (typeof n !== 'number' || Number.isNaN(n)) hata(`${yer}.${k}: sayı değil`);
      if (enGecCag && sira(kay.get(k).cag) > sira(enGecCag)) hata(`${yer}: "${k}" ${enGecCag} çağında henüz yok`);
    }
  };
  const binaRef = (yer, id) => { if (!bina.has(id)) hata(`${yer}: bilinmeyen bina "${id}"`); };
  const bulusRef = (yer, id) => { if (!bul.has(id)) hata(`${yer}: bilinmeyen buluş "${id}"`); };
  const cagRef = (yer, id) => { if (!cag.has(id)) hata(`${yer}: bilinmeyen çağ "${id}"`); };
  const karoRef = (yer, id) => { if (!karo.has(id)) hata(`${yer}: bilinmeyen karo "${id}"`); };
  const olayRef = (yer, id) => { if (!olay.has(id)) hata(`${yer}: bilinmeyen olay "${id}"`); };
  const hedefRef = (yer, hedef) => {
    for (const t of Array.isArray(hedef) ? hedef : [hedef]) {
      const [tur, id] = String(t).split(':');
      if (tur === 'karo') karoRef(yer, id);
      else if (tur === 'bina') binaRef(yer, id);
      else if (tur === 'etiket') { if (!etiketler.has(id)) hata(`${yer}: bilinmeyen etiket "${id}"`); }
      else if (tur === 'kaynak') { if (!kay.has(id)) hata(`${yer}: bilinmeyen kaynak "${id}"`); }
      else if (tur === 'isciTuru') { if (!ISCI_TURLERI.includes(id)) hata(`${yer}: bilinmeyen işçi türü "${id}"`); }
      else if (tur === 'cag') cagRef(yer, id);
      else hata(`${yer}: geçersiz hedef "${t}"`);
    }
  };
  const kosulGez = (yer, k) => {
    if (!k) return;
    kaynakNesne(`${yer}.kaynakMin`, k.kaynakMin);
    kaynakNesne(`${yer}.kaynakMax`, k.kaynakMax);
    for (const id of k.binaVar || []) binaRef(`${yer}.binaVar`, id);
    for (const id of k.binaYok || []) binaRef(`${yer}.binaYok`, id);
    for (const id of k.bulusVar || []) bulusRef(`${yer}.bulusVar`, id);
    for (const id of k.mevsim || []) if (!mev.has(id)) hata(`${yer}.mevsim: bilinmeyen mevsim "${id}"`);
    for (const t of Object.keys(k.isciTuruMin || {})) if (!ISCI_TURLERI.includes(t)) hata(`${yer}.isciTuruMin: bilinmeyen "${t}"`);
    if (k.vergi && !(v.DENGE?.VERGI || []).some((x) => x.id === k.vergi)) hata(`${yer}.vergi: bilinmeyen "${k.vergi}"`);
  };
  const sonucGez = (yer, s) => {
    if (!s) return;
    kaynakNesne(`${yer}.kaynak`, s.kaynak);
    if (s.zincir) olayRef(`${yer}.zincir`, s.zincir.olay);
    if (s.hasar?.binaId) binaRef(`${yer}.hasar`, s.hasar.binaId);
    if (s.vergi && !(v.DENGE?.VERGI || []).some((x) => x.id === s.vergi)) hata(`${yer}.vergi: bilinmeyen "${s.vergi}"`);
    if (s.degistirici) {
      const e = s.degistirici.etki || {};
      if (!s.degistirici.id) hata(`${yer}.degistirici: id yok`);
      if (e.uretim && !etiketler.has(e.uretim.etiket)) hata(`${yer}.degistirici: bilinmeyen etiket "${e.uretim.etiket}"`);
      if (e.tuketim && !kay.has(e.tuketim.kaynak)) hata(`${yer}.degistirici: bilinmeyen kaynak "${e.tuketim.kaynak}"`);
      kaynakNesne(`${yer}.degistirici.bakim`, e.bakim);
    }
    if (s.kervan && !(s.kervan.ver > 0 && s.kervan.al > 0)) hata(`${yer}.kervan: miktar geçersiz`);
    if (s.olasilik) {
      const top = s.olasilik.reduce((a, o) => a + o.p, 0);
      if (Math.abs(top - 1) > 1e-9) hata(`${yer}.olasilik: p toplamı ${top} (1 olmalı)`);
      s.olasilik.forEach((o, i) => sonucGez(`${yer}.olasilik[${i}]`, o.sonuc));
    }
    (s.kosullu || []).forEach((o, i) => { kosulGez(`${yer}.kosullu[${i}]`, o.kosul); sonucGez(`${yer}.kosullu[${i}]`, o.sonuc); });
  };

  // --- 2. kaynaklar, karolar, mevsimler ---
  for (const k of v.KAYNAKLAR || []) cagRef(`KAYNAKLAR.${k.id}`, k.cag);
  const kodlar = new Set();
  for (const k of v.KAROLAR || []) {
    cagRef(`KAROLAR.${k.id}`, k.gorunurCag);
    if (typeof k.kod !== 'string' || k.kod.length !== 1) hata(`KAROLAR.${k.id}: kod tek karakter olmalı`);
    if (kodlar.has(k.kod)) hata(`KAROLAR.${k.id}: tekrarlanan kod "${k.kod}"`);
    kodlar.add(k.kod);
    if (k.temizlenir) { karoRef(`KAROLAR.${k.id}.temizlenir`, k.temizlenir.donusur); kaynakNesne(`KAROLAR.${k.id}.temizlenir`, k.temizlenir.kazanc); }
    for (const id of k.yalnizBina || []) binaRef(`KAROLAR.${k.id}.yalnizBina`, id);
  }
  for (const m of v.MEVSIMLER || []) {
    for (const e of Object.keys(m.carpan || {})) if (!(v.MEVSIM_ETIKETLERI || []).includes(e)) hata(`MEVSIMLER.${m.id}: bilinmeyen etiket "${e}"`);
  }
  for (const i of v.DENGE?.SERBEST_ISLER || []) {
    kaynakNesne(`SERBEST_ISLER.${i.id}`, i.uretim);
    if (i.mevsimEtiketi && !(v.MEVSIM_ETIKETLERI || []).includes(i.mevsimEtiketi)) hata(`SERBEST_ISLER.${i.id}: bilinmeyen mevsim etiketi`);
  }

  // --- 3. binalar ---
  const boyutlar = (v.DENGE?.BOYUTLAR || []).map((b) => b.join('x'));
  for (const b of v.BINALAR || []) {
    const y = `BINALAR.${b.id}`;
    cagRef(y, b.cag);
    if (!BINA_TURLERI.includes(b.tur)) hata(`${y}: geçersiz tür "${b.tur}"`);
    if (!Array.isArray(b.boyut) || !boyutlar.includes(b.boyut.join('x'))) hata(`${y}: geçersiz boyut`);
    if (!(b.insaSuresi >= 0)) hata(`${y}: insaSuresi geçersiz`);
    if (![1, 2, 3].includes(b.maxSeviye)) hata(`${y}: maxSeviye geçersiz`);
    for (const alan of ['maliyet', 'uretim', 'girdi', 'sabitUretim', 'bakim']) kaynakNesne(`${y}.${alan}`, b[alan], { enGecCag: b.cag });
    kaynakNesne(`${y}.depo`, b.depo); // depo sonraki çağların kaynaklarını da kapsayabilir (Ambar "+40 diğer")
    const g = b.gereksinim || {};
    if (g.bulus) {
      bulusRef(`${y}.gereksinim`, g.bulus);
      const bu = bul.get(g.bulus);
      if (bu && !bu.acar?.binalar?.includes(b.id)) hata(`${y}: ${g.bulus} buluşu bu binayı açar listesinde değil`);
      if (bu && sira(bu.cag) > sira(b.cag)) hata(`${y}: buluşu (${g.bulus}) binadan sonraki çağda`);
    }
    if (g.karoUstu) karoRef(`${y}.karoUstu`, g.karoUstu);
    if (g.karoBitisik) karoRef(`${y}.karoBitisik`, g.karoBitisik);
    if (b.isciTuru && !ISCI_TURLERI.includes(b.isciTuru)) hata(`${y}: bilinmeyen işçi türü "${b.isciTuru}"`);
    if (b.mevsimEtiketi && !(v.MEVSIM_ETIKETLERI || []).includes(b.mevsimEtiketi)) hata(`${y}: bilinmeyen mevsim etiketi`);
    if (b.tur === 'konut' && !(b.kapasite > 0)) hata(`${y}: konutun kapasitesi yok`);
    if (b.tur === 'donusum' && !Object.keys(b.girdi || {}).length) hata(`${y}: dönüşüm binasının girdisi yok`);
    if (Object.keys(b.uretim || {}).length && !(b.isci > 0)) hata(`${y}: işçi başına üretim var ama işçi yuvası yok`);
    for (const [i, r] of (b.bitisiklik || []).entries()) {
      hedefRef(`${y}.bitisiklik[${i}]`, r.hedef);
      if (!(r.max >= 1)) hata(`${y}.bitisiklik[${i}]: max geçersiz`);
    }
    if (b.etkiAlani && !etiketler.has(b.etkiAlani.hedefEtiket)) hata(`${y}.etkiAlani: bilinmeyen etiket`);
    if (b.kuresel && !etiketler.has(b.kuresel.hedefEtiket)) hata(`${y}.kuresel: bilinmeyen etiket`);
  }

  // --- 4. buluşlar (başvurular + döngü) ---
  const cagBulusSay = new Map();
  for (const b of v.BULUSLAR || []) {
    const y = `BULUSLAR.${b.id}`;
    cagRef(y, b.cag);
    kaynakNesne(`${y}.maliyet`, b.maliyet, { bilgiOlur: true, enGecCag: b.cag });
    if (!(b.maliyet?.bilgi > 0)) hata(`${y}: BP maliyeti yok`);
    for (const g of b.gerekir || []) {
      bulusRef(`${y}.gerekir`, g);
      if (bul.has(g) && sira(bul.get(g).cag) > sira(b.cag)) hata(`${y}: gereken ${g} daha sonraki çağda`);
    }
    for (const id of b.acar?.binalar || []) {
      binaRef(`${y}.acar`, id);
      if (bina.has(id) && bina.get(id).gereksinim?.bulus !== b.id) hata(`${y}: açtığı ${id} binası bu buluşu gerektirmiyor`);
    }
    for (const id of b.acar?.eylemler || []) if (!eyl.has(id)) hata(`${y}.acar: bilinmeyen eylem "${id}"`);
    for (const [i, e] of (b.etkiler || []).entries()) {
      if (!BULUS_ETKI_TURLERI.includes(e.tur)) hata(`${y}.etkiler[${i}]: geçersiz tür "${e.tur}"`);
      if (['uretimCarpani', 'depoCarpani', 'mevsimCarpani', 'isciSavunmaCarpani', 'seviyeAc'].includes(e.tur)) hedefRef(`${y}.etkiler[${i}]`, e.hedef);
      if (e.tur === 'serbestIs') { if (!isler.has(e.hedef)) hata(`${y}.etkiler[${i}]: bilinmeyen serbest iş "${e.hedef}"`); kaynakNesne(`${y}.etkiler[${i}]`, e.deger); }
      if (e.tur === 'bozulma' && !kay.has(e.hedef)) hata(`${y}.etkiler[${i}]: bilinmeyen kaynak "${e.hedef}"`);
      if (e.tur === 'mevsimCarpani') for (const m of Object.keys(e.deger || {})) if (!mev.has(m)) hata(`${y}.etkiler[${i}]: bilinmeyen mevsim "${m}"`);
    }
    if (b.cagBulusu) cagBulusSay.set(b.cag, (cagBulusSay.get(b.cag) || 0) + 1);
  }
  for (const d of bulusDongusu(v.BULUSLAR || [])) hata(`BULUSLAR: döngüsel bağımlılık ${d.join(' → ')}`);

  // --- 5. eylemler ---
  for (const e of v.EYLEMLER || []) {
    const y = `EYLEMLER.${e.id}`;
    cagRef(y, e.cag);
    if (typeof e.yorgunluk !== 'number') hata(`${y}: yorgunluk sayı değil`);
    if (e.gereksinim?.bina) binaRef(`${y}.gereksinim`, e.gereksinim.bina);
    kaynakNesne(`${y}.gereksinim.kaynak`, e.gereksinim?.kaynak);
    sonucGez(`${y}.sonuc`, e.sonuc);
  }

  // --- 6. olaylar ---
  for (const o of v.OLAYLAR || []) {
    const y = `OLAYLAR.${o.id}`;
    if (!Array.isArray(o.cag) || !o.cag.length) hata(`${y}: cag listesi boş`);
    for (const c of o.cag || []) cagRef(y, c);
    if (!(v.OLAY_TURLERI || []).includes(o.tur)) hata(`${y}: geçersiz tür "${o.tur}"`);
    if (!(v.OLAY_TETIKLERI || []).includes(o.tetik)) hata(`${y}: geçersiz tetik "${o.tetik}"`);
    if (typeof o.kotu !== 'boolean') hata(`${y}: kotu boolean değil`);
    kosulGez(`${y}.kosul`, o.kosul);
    if (!Array.isArray(o.secenekler) || !o.secenekler.length) { hata(`${y}: seçenek yok`); continue; }
    if (!o.secenekler.some((s) => !s.gereksinim || !Object.keys(s.gereksinim).length)) hata(`${y}: gereksinimsiz seçenek yok`);
    o.secenekler.forEach((s, i) => {
      if (!s.metin) hata(`${y}.secenekler[${i}]: metin yok`);
      kosulGez(`${y}.secenekler[${i}].gereksinim`, s.gereksinim);
      sonucGez(`${y}.secenekler[${i}].sonuc`, s.sonuc);
    });
  }
  // zincir tetikli olay bir yerden çağrılmalı
  const zincirHedefleri = new Set();
  const topla = (s) => { if (!s) return; if (s.zincir) zincirHedefleri.add(s.zincir.olay); (s.olasilik || []).forEach((o) => topla(o.sonuc)); };
  (v.OLAYLAR || []).forEach((o) => o.secenekler?.forEach((s) => topla(s.sonuc)));
  (v.EYLEMLER || []).forEach((e) => topla(e.sonuc));
  for (const o of v.OLAYLAR || []) if (o.tetik === 'zincir' && !zincirHedefleri.has(o.id)) hata(`OLAYLAR.${o.id}: zincir olayı hiçbir yerden çağrılmıyor`);

  // --- 7. çağlar ---
  (v.CAGLAR || []).forEach((c, i) => {
    const y = `CAGLAR.${c.id}`;
    if (c.sira !== i) hata(`${y}: sira ${c.sira}, dizideki yer ${i}`);
    const konut = bina.get(c.konut);
    if (!konut) hata(`${y}: bilinmeyen konut binası "${c.konut}"`);
    else if (konut.tur !== 'konut' || konut.cag !== c.id) hata(`${y}: konut "${c.konut}" bu çağın konutu değil`);
    const merkez = bina.get(c.merkez);
    if (!merkez) hata(`${y}: bilinmeyen merkez binası "${c.merkez}"`);
    else if (merkez.tur !== 'merkez' || merkez.cag !== c.id) hata(`${y}: merkez "${c.merkez}" bu çağın merkezi değil`);
    for (const k of c.yeniKaynaklar || []) {
      if (!kay.has(k)) hata(`${y}.yeniKaynaklar: bilinmeyen "${k}"`);
      else if (kay.get(k).cag !== c.id) hata(`${y}.yeniKaynaklar: "${k}" başka çağın kaynağı`);
    }
    for (const e of c.acilanEylemler || []) {
      if (!eyl.has(e)) hata(`${y}.acilanEylemler: bilinmeyen "${e}"`);
      else if (eyl.get(e).cag !== c.id) hata(`${y}.acilanEylemler: "${e}" başka çağın eylemi`);
    }
    const sonCag = i === v.CAGLAR.length - 1;
    if (sonCag) {
      if (c.gecis !== null) hata(`${y}: son çağın geçişi null olmalı`);
      if (!c.zafer) hata(`${y}: son çağda zafer şartı yok`);
    } else if (!c.gecis) hata(`${y}: geçiş şartı yok`);
    if (c.gecis) {
      for (const [id, n] of Object.entries(c.gecis.binalar || {})) {
        binaRef(`${y}.gecis.binalar`, id);
        if (bina.has(id) && sira(bina.get(id).cag) > i) hata(`${y}.gecis: "${id}" sonraki çağın binası`);
        if (!(n >= 1)) hata(`${y}.gecis.binalar.${id}: adet geçersiz`);
      }
      bulusRef(`${y}.gecis`, c.gecis.bulus);
      const bu = bul.get(c.gecis.bulus);
      if (bu && (bu.cag !== c.id || !bu.cagBulusu)) hata(`${y}.gecis: "${c.gecis.bulus}" bu çağın çağ buluşu değil`);
      kaynakNesne(`${y}.gecis.maliyet`, c.gecis.maliyet, { enGecCag: c.id });
    }
    if (c.zafer) binaRef(`${y}.zafer`, c.zafer.bina);
    if ((cagBulusSay.get(c.id) || 0) !== 1) hata(`${y}: tam 1 çağ buluşu olmalı (${cagBulusSay.get(c.id) || 0})`);
  });

  return h;
}

// Döngüleri bulur; her döngü bir id yolu olarak döner. Bilinmeyen gereksinimleri yok sayar (başvuru denetimi ayrıca yakalar).
export function bulusDongusu(buluslar) {
  const harita = new Map(buluslar.map((b) => [b.id, b.gerekir || []]));
  const durum = new Map(); // 1 = ziyarette, 2 = bitti
  const donguler = [];
  const gez = (id, yol) => {
    if (durum.get(id) === 2) return;
    if (durum.get(id) === 1) { donguler.push([...yol.slice(yol.indexOf(id)), id]); return; }
    durum.set(id, 1);
    for (const g of harita.get(id) || []) if (harita.has(g)) gez(g, [...yol, id]);
    durum.set(id, 2);
  };
  for (const id of harita.keys()) gez(id, []);
  return donguler;
}

// Bir buluşa ulaşmak için gereken tüm buluşlar (kendisi dahil).
export function bulusKapanisi(buluslar, hedefler) {
  const harita = new Map(buluslar.map((b) => [b.id, b]));
  const kume = new Set();
  const ekle = (id) => { if (kume.has(id) || !harita.has(id)) return; kume.add(id); harita.get(id).gerekir.forEach(ekle); };
  hedefler.forEach(ekle);
  return kume;
}
