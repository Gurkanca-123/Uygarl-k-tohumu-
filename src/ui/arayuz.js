// Arayüz kabuğu: üst çubuk, sağ sekmeli panel, alt şerit, bilgi kartı, yerleştirme modu, olay penceresi, günlük, menü, toast.
import { KAYNAKLAR } from '../data/kaynaklar.js';
import { BINALAR } from '../data/binalar.js';
import { OLAYLAR } from '../data/olaylar.js';
import { insaEt, olayCoz, cagAtla } from '../core/komutlar.js';
import { yik } from '../core/komutlar.js';
import { secenekUygunMu } from '../core/olay.js';
import { bilgiUretimi } from '../core/arastirma.js';
import { takvim } from '../core/takvim.js';
import { kaynakAcik, depoTavani, mevcutCag, binaBul, barinmaKapasitesi, issizSayisi, isciYuvasi, binaIsi } from '../core/yardimci.js';
import { maliyetHesapla } from '../core/insa.js';
import { yerUygunMu, uygunYerler } from '../world/yerlestir.js';
import { merkezNokta } from '../world/harita.js';
import { h, yuvarla, depoOku, depoYaz, tamEkranDestekli, tamEkranMi, tamEkranAcKapa, tamEkranDinle, donusPerdesiKur } from './dom.js';
import {
  insaSekmesi, isSekmesi, arastirmaSekmesi, onderSekmesi, cagSekmesi, binaKarti, hucreKarti, maliyetChips, gereksinimMetni, binaResmi,
} from './paneller.js';
import { Ogretici } from './ogretici.js';
import { EYLEMLER } from '../data/eylemler.js';
import { VARSAYILAN_EYLEM, YORGUNLUK_MAX } from '../data/denge.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const OLAY = Object.fromEntries(OLAYLAR.map((o) => [o.id, o]));
const EYLEM = Object.fromEntries(EYLEMLER.map((e) => [e.id, e]));
const SEKMELER = [['insa', '🔨', 'İnşa', insaSekmesi], ['is', '👷', 'İş', isSekmesi], ['arastirma', '🔬', 'Araştırma', arastirmaSekmesi],
  ['onder', '🧭', 'Önder', onderSekmesi], ['cag', '🏛', 'Çağ', cagSekmesi]];
const MEVSIM_SIMGE = ['🌱', '☀️', '🍂', '❄️'];
const KALITELER = [['yuksek', 'Yüksek'], ['standart', 'Standart'], ['performans', 'Performans']];
const ROZET_ZOOM = 1.0;
const SEVIYE_SIMGE = { iyi: '✔', uyari: '⚠', hata: '✖', bilgi: 'ℹ' };

export class Arayuz {
  constructor(kok, oyun, sahne) {
    this.kok = kok; this.oyun = oyun; this.sahne = sahne;
    const ui = depoOku('ut_ui', { sekme: 'insa', pencere: 'kapali' });
    this.sekme = SEKMELER.some((x) => x[0] === ui.sekme) ? ui.sekme : 'insa';
    this.pencere = ['kapali', 'acik', 'kucuk'].includes(ui.pencere) ? ui.pencere : 'kapali'; // sekme penceresi: kapali | acik | kucuk
    this.ayar = depoOku('ut_ayar', { kalite: 'yuksek', ses: false });
    this.kartKucuk = false; this.kartAnahtar = null; this.modalAnahtar = null;
    this.insaKat = 'hepsi'; this.insaSadeceAcik = false;
    this.secim = null; this.yerlestirme = null; this.yikOnay = null; this.kervanSecim = null;
    this.menuAcik = false; this.menuSayfa = 'ana'; this.yeniOnay = false; this.gunlukAcik = false; this.zaferGoster = null;
    this.scrollTop = {}; this.sonSekme = null; this.kapaliBolum = new Set();
    this.ogretici = new Ogretici(this);
    donusPerdesiKur();
    tamEkranDinle(() => this.yenile());
    this.kur();
    this.kaliteUygula();
    oyun.dinle((tip, veri) => this.olay(tip, veri));
    sahne.onTik = (x, y) => this.hucreTik(x, y);
    sahne.onKare = () => this.rozetKonumla();
    sahne.onUzerinde = (x, y) => { if (this.yerlestirme && !this.sahneDokunmatik) this.yerlestirmeKonum(x, y); };
  }

  get d() { return this.oyun.durum; }

  kaydetUi() { depoYaz('ut_ui', { sekme: this.sekme, pencere: this.pencere }); }
  kaliteUygula() { try { this.sahne?.kaliteAyarla?.(this.ayar.kalite); } catch { /* sahne bu ayarı bilmiyor olabilir */ } }
  ayarYaz() { depoYaz('ut_ayar', this.ayar); }

  kur() {
    this.kok.innerHTML = '';
    this.ustEl = h('div', { class: 'ust' });
    this.ortaEl = h('div', { class: 'orta' });
    this.altEl = h('div', { class: 'alt' });
    this.toastEl = h('div', { class: 'toasts' });
    this.kartEl = h('div', { class: 'kart-yuva' });
    this.ipucuEl = h('div', { class: 'ipucu-yuva' });
    this.cubukEl = h('div');
    // sağ kenarda sekme şeridi + açılır pencere (bir kez kurulur; geçiş animasyonu için)
    this.rayEl = h('div', { class: 'sekmeler' });
    this.rayDugme = {};
    for (const [id, ik, ad] of SEKMELER) {
      const d = h('button', { 'data-sekme': id, 'aria-label': ad, title: ad, onclick: () => this.sekmeTikla(id) }, h('span', {}, ik));
      this.rayDugme[id] = d; this.rayEl.append(d);
    }
    this.pIkon = h('span', { class: 'p-ikon' });
    this.pBaslik = h('h3', {});
    this.pKucult = h('button', { class: 'ikon-d', onclick: (e) => { e.stopPropagation(); this.pencereKucult(); } });
    this.pKapat = h('button', { class: 'ikon-d', 'aria-label': 'Kapat', onclick: (e) => { e.stopPropagation(); this.pencereKapat(); } }, '✕');
    this.panelGovde = h('div', { class: 'govde' });
    this.pencereEl = h('div', { class: 'pencere sag' },
      h('div', { class: 'p-bas', onclick: () => this.pencereKucult() }, this.pIkon, this.pBaslik, this.pKucult, this.pKapat), this.panelGovde);
    this.rozetEl = h('div', { class: 'rozet-katman' });
    this.rozetler = new Map(); this.rozetAnahtar = null; this.rozetKamera = '';
    this.ortaEl.append(this.rozetEl, this.toastEl, this.ipucuEl, this.kartEl, this.cubukEl, this.pencereEl, this.rayEl);
    this.modalEl = h('div');
    this.kok.append(this.ustEl, this.ortaEl, this.altEl, this.modalEl);
  }

  // ---------- pencere durumu ----------
  sekmeTikla(id) {
    if (this.sekme === id && this.pencere === 'acik') this.pencere = 'kapali';
    else { this.sekme = id; this.pencere = 'acik'; if (this.secim) this.kartKucuk = true; } // en çok 1 büyük pencere
    this.kaydetUi(); this.yenile();
  }
  pencereKucult() { this.pencere = this.pencere === 'kucuk' ? 'acik' : 'kucuk'; this.kaydetUi(); this.yenile(); }
  pencereKapat() { this.pencere = 'kapali'; this.kaydetUi(); this.yenile(); }

  // Ortak pencere kabuğu: başlık çubuğu + ▾ küçült + ✕ kapat.
  pencereKabuk({ baslik, ikon, govde, kucuk, kapat, kucult, sinif = '', govdeSinif = '', kapatSimge = '✕' }) {
    return h('div', { class: `pencere ${sinif}${kucuk ? ' kucuk' : ''}` },
      h('div', { class: 'p-bas', onclick: kucult },
        h('span', { class: 'p-ikon' }, ikon), h('h3', {}, baslik),
        kucult ? h('button', { class: 'ikon-d', 'aria-label': kucuk ? 'Genişlet' : 'Küçült', onclick: (e) => { e.stopPropagation(); kucult(); } }, kucuk ? '▴' : '▾') : null,
        kapat ? h('button', { class: 'ikon-d', 'aria-label': kapatSimge === '‹' ? 'Geri' : 'Kapat', onclick: (e) => { e.stopPropagation(); kapat(); } }, kapatSimge) : null),
      kucuk ? null : h('div', { class: `govde ${govdeSinif}` }, govde));
  }

  // ---------- olaylar ----------
  olay(tip, veri) {
    if (tip === 'durum') this.yenile();
    else if (tip === 'hata') this.toast([{ metin: veri, seviye: 'hata' }], 'hata');
    else if (tip === 'tur') {
      this.yikOnay = null;
      if (veri.bildirimler.length) this.toast(veri.bildirimler);
      if (veri.bildirimler.some((b) => b.kod === 'zafer')) this.zaferGoster = true;
      if (this.yerlestirme) this.yerlestirmeBaslat(this.yerlestirme.binaId, true);
      this.yenile();
    } else if (tip === 'bildirim') {
      this.toast(veri);
      if (veri.some((b) => b.kod === 'zafer')) this.zaferGoster = true;
    }
  }

  hata(m) { this.toast([{ metin: m, seviye: 'hata' }], 'hata'); }

  toast(liste, sev = null) {
    const satirlar = liste.slice(0, 5);
    const ek = liste.length - satirlar.length;
    const seviye = sev || (liste.some((b) => b.seviye === 'uyari') ? 'uyari' : liste.some((b) => b.seviye === 'iyi') ? 'iyi' : '');
    const simge = SEVIYE_SIMGE[sev || seviye || 'bilgi'] || 'ℹ';
    const el = h('div', { class: `toast ${seviye}`, onclick: () => { el.remove(); this.toastTemizlikGuncelle(); } },
      h('span', { class: 'toast-sim' }, simge),
      h('div', { class: 'toast-gov' }, satirlar.map((b) => h('div', {}, b.metin)), ek > 0 ? h('div', { class: 'soluk kucuk' }, `…ve ${ek} bildirim daha (Günlük)`) : null));
    this.toastEl.append(el);
    while (this.toastEl.querySelectorAll('.toast').length > 3) this.toastEl.querySelector('.toast').remove();
    this.toastTemizlikGuncelle();
    setTimeout(() => { el.remove(); this.toastTemizlikGuncelle(); }, sev === 'hata' ? 4500 : 6500);
  }
  toastTemizlikGuncelle() {
    this.toastEl.querySelector('.toast-temizle')?.remove();
    if (this.toastEl.querySelectorAll('.toast').length > 1) {
      this.toastEl.append(h('button', { class: 'toast-temizle', onclick: () => this.toastEl.replaceChildren() }, 'Hepsini kapat'));
    }
  }

  islem(fn, ...args) {
    this.yikOnay = null;
    return this.oyun.komut(fn, ...args);
  }
  yik(uid) { this.yikOnay = null; const r = this.oyun.komut(yik, uid); if (!r.hata) this.secimiKaldir(); }
  yikOnayla(uid) { this.yikOnay = uid; this.yenile(); setTimeout(() => { if (this.yikOnay === uid) { this.yikOnay = null; this.yenile(); } }, 3500); }
  cagAtla() { const r = this.oyun.komut(cagAtla); if (!r.hata) this.toast([{ metin: 'Yeni çağa geçildi!', seviye: 'iyi' }]); }
  yenile() { this.cizim(); }

  // ---------- seçim ----------
  secimiKaldir() { this.secim = null; this.yikOnay = null; this.sahne.secim(null); this.yenile(); }

  // ---------- işçi rozetleri (haritada bina üstü; DOM katmanı, kamerayla birlikte konumlanır) ----------
  // Rozete dokunma = bina kartını açar (kartta büyük −/+). Neden: harita sürükleme/kaydırma ile aynı parmak bölgesinde küçük −/+ yanlış basmaya açık;
  // kart zaten 44px+ düğmeler, üretim önizlemesi ve nedenleri gösterir.
  rozetKur(d) {
    const sec = this.secim?.tip === 'bina' ? this.secim.uid : null;
    const liste = this.yerlestirme || d.olay.aktif ? [] : d.binalar.filter((b) => isciYuvasi(b) > 0 && (!binaIsi(d, b) || b.uid === sec));
    const anahtar = JSON.stringify([liste.map((b) => [b.uid, d.atama[b.uid] || 0, isciYuvasi(b), b.hasarli]), sec, issizSayisi(d)]);
    if (anahtar === this.rozetAnahtar) return;
    this.rozetAnahtar = anahtar;
    this.rozetEl.replaceChildren(); this.rozetler.clear();
    const issiz = issizSayisi(d);
    for (const b of liste) {
      const n = d.atama[b.uid] || 0, yuva = isciYuvasi(b);
      const sinif = `rozet${n === 0 ? ' bos' : n >= yuva ? ' dolu' : ''}${b.uid === sec ? ' secili' : ''}${n < yuva && issiz > 0 ? ' bosta' : ''}`;
      const el = h('button', { class: sinif, 'aria-label': `${BINA[b.id].ad}: ${n}/${yuva} işçi`, onclick: () => this.binaSec(b.uid) }, `👷 ${n}/${yuva}`);
      this.rozetler.set(b.uid, { el, b, hep: b.uid === sec });
      this.rozetEl.append(el);
    }
    this.rozetKamera = '';
    this.rozetKonumla();
  }

  // Yalnız kamera/ekran değişince çalışır; yalnız görünür rozetlere dokunur. Uzak zoomda (seçili hariç) gizler.
  rozetKonumla() {
    if (!this.rozetler?.size) return;
    const S = this.sahne, c = S.canvas, k = S.kamera;
    const w = c.clientWidth, hh = c.clientHeight;
    const anahtar = `${S.hedef.x.toFixed(2)},${S.hedef.z.toFixed(2)},${k.zoom.toFixed(3)},${w}x${hh}`;
    if (anahtar === this.rozetKamera) return;
    this.rozetKamera = anahtar;
    const yakin = k.zoom >= ROZET_ZOOM;
    this.rozetEl.classList.toggle('uzak', !yakin);
    const r = c.getBoundingClientRect(), r0 = this.rozetEl.getBoundingClientRect();
    const dx = r.left - r0.left, dy = r.top - r0.top;
    const p = { x: 0, y: 0 };
    for (const { el, b, hep } of this.rozetler.values()) {
      const t = BINA[b.id];
      if (!yakin && !hep) { if (!el.hidden) el.hidden = true; continue; }
      S.ekranNokta(b.x + t.boyut[0] / 2, 2.6, b.y + t.boyut[1] / 2, p);
      const gor = p.x > -20 && p.y > -20 && p.x < w + 20 && p.y < hh + 20;
      if (el.hidden === gor) el.hidden = !gor;
      if (gor) el.style.transform = `translate(${Math.round(p.x + dx)}px, ${Math.round(p.y + dy)}px) translate(-50%, -100%)`;
    }
  }

  binaSec(uid) {
    this.sahneDokunmatik = true;
    const b = this.d && binaBul(this.d, uid);
    if (!b) return;
    if (this.pencere !== 'kapali') { this.pencere = 'kapali'; this.kaydetUi(); }
    this.yikOnay = null;
    this.secim = { tip: 'bina', uid };
    this.kartKucuk = false;
    this.yenile();
  }

  hucreTik(x, y) {
    this.sahneDokunmatik = true;
    if (!this.d) return;
    if (this.yerlestirme) { this.yerlestirmeKonum(x, y, true); return; }
    if (this.pencere !== 'kapali') { this.pencere = 'kapali'; this.kaydetUi(); } // haritaya dokununca pencere kapanır
    const b = this.sahne.hucredekiBina(x, y);
    this.yikOnay = null;
    this.secim = b ? { tip: 'bina', uid: b.uid } : { tip: 'hucre', x, y };
    this.kartKucuk = false;
    this.yenile();
  }

  // ---------- yerleştirme ----------
  yerlestirmeBaslat(binaId, koru = false) {
    const d = this.d;
    const t = BINA[binaId];
    const yerler = uygunYerler(d, binaId);
    this.sahne.uygunIsaretleri(yerler, t.boyut[0], t.boyut[1]);
    if (!koru || !this.yerlestirme) {
      const m = merkezNokta(d);
      const [x, y] = yerler[0] || [Math.floor(m.x), Math.floor(m.y)];
      this.yerlestirme = { binaId, x, y, adet: yerler.length };
      if (!yerler.length) this.hata(`${t.ad} için uygun yer yok.`);
      this.secim = null; this.sahne.secim(null);
      this.pencere = 'kapali'; this.kaydetUi(); // harita görünsün
      this.sahne.odakla(x + t.boyut[0] / 2, y + t.boyut[1] / 2);
    } else this.yerlestirme.adet = yerler.length;
    this.yerlestirmeGoster();
    this.yenile();
  }

  yerlestirmeKonum(hx, hy) {
    const t = BINA[this.yerlestirme.binaId];
    this.yerlestirme.x = hx - Math.floor((t.boyut[0] - 1) / 2);
    this.yerlestirme.y = hy - Math.floor((t.boyut[1] - 1) / 2);
    this.yerlestirmeGoster();
    this.yenile();
  }

  yerlestirmeGoster() {
    const y = this.yerlestirme;
    y.hata = yerUygunMu(this.d, y.binaId, y.x, y.y);
    this.sahne.yerlestirme({ binaId: y.binaId, x: y.x, y: y.y, hata: y.hata });
  }

  yerlestirmeIptal() { this.yerlestirme = null; this.sahne.yerlestirme(null); this.yenile(); }

  yerlestirmeOnayla() {
    const y = this.yerlestirme;
    const r = this.oyun.komut(insaEt, y.binaId, y.x, y.y);
    if (r.hata) return;
    this.yerlestirme = null;
    this.sahne.yerlestirme(null);
    this.secim = { tip: 'bina', uid: r.uid };
    this.kartKucuk = false;
    this.yenile();
  }

  // ---------- çizim ----------
  cizim() {
    const d = this.d;
    if (!d) { this.modal(null); return; }
    this.sahne.guncelle(d);
    // seçim doğrulama
    if (this.secim?.tip === 'bina' && !binaBul(d, this.secim.uid)) this.secim = null;
    if (this.secim?.tip === 'bina') this.sahne.secim({ tip: 'bina', bina: binaBul(d, this.secim.uid) });
    else if (this.secim) this.sahne.secim(this.secim);
    else this.sahne.secim(null);
    if (this.yerlestirme) this.yerlestirmeGostermeden();

    this.kok.classList.toggle('yerlesme', !!this.yerlestirme);
    this.ust(d); this.panel(d); this.alt(d); this.kart(d); this.cubuk(d); this.modal(d); this.rozetKur(d);
    this.ogretici.guncelle(d, this.ipucuEl);
  }

  yerlestirmeGostermeden() {
    const y = this.yerlestirme;
    y.hata = yerUygunMu(this.d, y.binaId, y.x, y.y);
  }

  ust(d) {
    const t = takvim(d.tur);
    const c = mevcutCag(d);
    const chips = [];
    for (const k of KAYNAKLAR) {
      if (!kaynakAcik(d, k.id)) continue;
      const v = d.kaynaklar[k.id] || 0, tavan = depoTavani(d, k.id), dl = this.oyun.degisim[k.id] || 0;
      const dolu = v >= tavan - 0.01;
      chips.push(h('div', { class: `chip${dolu ? ' dolu' : ''}${v < 1 && dl < 0 ? ' uyari' : ''}`, title: `${k.ad}${dolu ? ' (depo dolu)' : ''}`, style: `--oran:${Math.min(100, (100 * v) / Math.max(1, tavan))}%` },
        h('span', { class: 'sim' }, k.simge), h('b', {}, Math.floor(v + 1e-6)), h('small', {}, `/${Math.round(tavan)}`),
        Math.abs(dl) >= 0.05 ? h('span', { class: dl > 0 ? 'art' : 'azl' }, `${dl > 0 ? '▲+' : '▼'}${yuvarla(dl)}`) : null));
    }
    const bar = barinmaKapasitesi(d), isz = issizSayisi(d);
    const huzurSinif = d.huzur < 30 ? 'uyari' : d.huzur >= 60 ? 'iyi' : '';
    const durumlar = [
      h('div', { class: 'chip bp', title: 'Bilgi Puanı' }, h('span', { class: 'sim' }, '💡'), h('b', {}, `+${yuvarla(bilgiUretimi(d))}`), h('small', {}, 'BP/gün')),
      h('div', { class: `chip huzur ${huzurSinif}`, title: 'Huzur', style: `--oran:${Math.max(0, Math.min(100, d.huzur))}%` }, h('span', { class: 'sim' }, '😊'), h('b', {}, Math.round(d.huzur))),
      h('div', { class: `chip${d.nufus > bar ? ' uyari' : ''}`, title: `Nüfus / barınak${isz > 0 ? ` · ${isz} işsiz` : ''}` }, h('span', { class: 'sim' }, '👥'), h('b', {}, d.nufus), h('small', {}, `/${bar}`),
        isz > 0 ? h('span', { class: 'azl' }, `${isz} boşta`) : null),
    ];
    if (d.istatistik?.serbestKip) durumlar.unshift(h('div', { class: 'chip dolu' }, '🏆 Serbest'));
    const gunler = [0, 1, 2, 3, 4].map((i) => h('i', { class: i < t.mevsimGunu ? 'dolu' : '' }));
    this.ustEl.replaceChildren(
      h('div', { class: 'zaman' },
        h('b', { class: 'cag-rozet' }, `🏕 ${c.ad}`),
        h('span', { class: 'mevsim' }, `${MEVSIM_SIMGE[t.mevsimSira] || ''} ${t.mevsimAd}`, h('span', { class: 'gunler' }, gunler), h('small', {}, `Gün ${t.gun} · Yıl ${t.yil}`))),
      h('div', { class: 'seritler' }, chips),
      h('div', { class: 'durumlar' }, durumlar, this.tamEkranDugme('ikon-d tam-d')));
  }

  panel(d) {
    const gizli = !!this.yerlestirme;
    const acik = !gizli && this.pencere !== 'kapali';
    this.rayEl.classList.toggle('gizli', gizli);
    for (const [id, dg] of Object.entries(this.rayDugme)) dg.classList.toggle('secili', acik && this.sekme === id);
    this.pencereEl.classList.toggle('acik', acik);
    this.pencereEl.classList.toggle('kucuk', this.pencere === 'kucuk');
    if (!acik) return; // kapanırken eski içerik solarak kaybolur
    const [, ik, ad, fn] = SEKMELER.find((x) => x[0] === this.sekme);
    this.pIkon.textContent = ik; this.pBaslik.textContent = ad;
    const kucuk = this.pencere === 'kucuk';
    this.pKucult.textContent = kucuk ? '▴' : '▾';
    this.pKucult.setAttribute('aria-label', kucuk ? 'Genişlet' : 'Küçült');
    if (kucuk) return;
    const eski = this.sonSekme === this.sekme ? this.panelGovde.scrollTop : 0;
    this.sonSekme = this.sekme;
    this.panelGovde.replaceChildren(fn(this));
    this.panelGovde.scrollTop = eski;
  }

  alt(d) {
    const y = this.yerlestirme;
    this.altEl.className = `alt${y ? ' yerlesme' : ''}`;
    if (y) {
      const t = BINA[y.binaId];
      this.altEl.replaceChildren(
        h('button', { class: 'buyuk', onclick: () => this.yerlestirmeIptal() }, '✕ İptal'),
        h('div', { class: 'alt-orta yer-bilgi' },
          h('div', { class: 'yer-ad' }, binaResmi(y.binaId, 28), h('b', {}, t.ad), maliyetChips(d, maliyetHesapla(d, y.binaId))),
          h('div', { class: y.hata ? 'neden' : 'ok kucuk' }, y.hata ? `⚠ ${y.hata}` : `✓ Uygun yer · ${y.adet} uygun konum yeşil`)),
        h('button', { class: 'buyuk iyi', disabled: !!y.hata, onclick: () => this.yerlestirmeOnayla() }, '✓ Onayla'));
      return;
    }
    const kilit = !!d.olay.aktif;
    const eylem = EYLEM[d.onder.eylem || VARSAYILAN_EYLEM];
    const yorgun = d.onder.yorgunluk >= YORGUNLUK_MAX * 0.8;
    this.altEl.replaceChildren(
      h('div', { class: 'sol' },
        h('button', { class: 'menu-d', onclick: () => { this.menuAcik = true; this.menuSayfa = 'ana'; this.yenile(); }, 'aria-label': 'Menü' }, h('span', {}, '☰'), h('em', {}, 'Menü')),
        h('button', { class: 'menu-d', onclick: () => { this.gunlukAcik = true; this.yenile(); }, 'aria-label': 'Günlük' }, h('span', {}, '📜'), h('em', {}, 'Günlük'))),
      h('div', { class: 'alt-orta' },
        kilit ? h('div', { class: 'neden' }, '⚠ Önce olayı çöz') : [
          h('div', { class: 'kucuk' }, `🧭 Önder: ${eylem?.ad || 'Dinlen'}`),
          yorgun ? h('div', { class: 'neden' }, 'Önder çok yorgun') : null]),
      h('div', { class: 'sag' },
        h('button', { class: 'buyuk', disabled: kilit, onclick: () => this.oyun.mevsimSonu() }, '⏭ Mevsim sonuna'),
        h('button', { class: 'buyuk vurgu', disabled: kilit, onclick: () => this.oyun.gunuBitir() }, '☀ Günü bitir')));
  }

  kart(d) {
    let ic = null, anahtar = null;
    if (!this.yerlestirme && this.secim) {
      if (this.secim.tip === 'bina') { const b = binaBul(d, this.secim.uid); if (b) { ic = binaKarti(this, b); anahtar = `b${b.uid}`; } }
      else { ic = hucreKarti(this, this.secim.x, this.secim.y); anahtar = `h${this.secim.x},${this.secim.y}`; }
    }
    const eski = this.kartEl.querySelector('.govde')?.scrollTop ?? 0;
    if (!ic) { this.kartEl.replaceChildren(); this.kartAnahtar = null; return; }
    const gir = anahtar !== this.kartAnahtar;
    this.kartAnahtar = anahtar;
    const el = this.pencereKabuk({
      ...ic, kucuk: this.kartKucuk, sinif: `kart sol acik${gir ? ' gir' : ''}`,
      kucult: () => { this.kartKucuk = !this.kartKucuk; this.yenile(); }, kapat: () => this.secimiKaldir(),
    });
    this.kartEl.replaceChildren(el);
    const g = el.querySelector('.govde'); if (g && !gir) g.scrollTop = eski;
  }

  cubuk(d) {
    const y = this.yerlestirme;
    if (!y) { this.cubukEl.replaceChildren(); return; }
    this.cubukEl.replaceChildren(h('div', { class: 'yer-ipucu' }, '👆 Haritada dokunarak yer seç'));
  }

  // ---------- modallar (pencere biçiminde) ----------
  modal(d) {
    let ic = null, anahtar = null;
    if (this.menuAcik || !d) { ic = this.menu(); anahtar = 'menu'; }
    else if (d.olay.aktif) { ic = this.olayPenceresi(d); anahtar = `olay${d.olay.aktif.id}`; }
    else if (this.zaferGoster) {
      anahtar = 'zafer';
      ic = h('div', { class: 'perde' }, this.pencereKabuk({ baslik: 'Zafer!', ikon: '🏆', sinif: 'modal acik',
        kapat: () => { this.zaferGoster = false; this.yenile(); },
        govde: [h('p', {}, 'Medeniyetin Orta Çağ\'ın zirvesine ulaştı. Oyun serbest kipte sürüyor: istediğin kadar büyümeye devam edebilirsin.'),
          h('button', { class: 'vurgu tam-genislik', onclick: () => { this.zaferGoster = false; this.yenile(); } }, 'Serbest kipte devam et')] }));
    } else if (this.gunlukAcik) { ic = this.gunluk(); anahtar = 'gunluk'; }
    const gir = anahtar && anahtar !== this.modalAnahtar;
    this.modalAnahtar = anahtar;
    this.kok.classList.toggle('olay-acik', !!anahtar);
    if (ic && gir) ic.classList.add('gir');
    const eski = this.modalEl.querySelector('.govde')?.scrollTop ?? 0;
    this.modalEl.replaceChildren(...(ic ? [ic] : []));
    const g = this.modalEl.querySelector('.govde'); if (g && !gir) g.scrollTop = eski;
  }

  olayPenceresi(d) {
    const o = OLAY[d.olay.aktif.id];
    return h('div', { class: 'perde' }, this.pencereKabuk({ baslik: o.ad, ikon: '📣', sinif: 'modal olay acik', govde: [
      h('p', { class: 'olay-metin' }, o.metin),
      h('div', { class: 'secenekler' }, o.secenekler.map((s, i) => {
        const uygun = secenekUygunMu(d, s);
        return h('div', { class: `secenek${uygun ? '' : ' gri'}` },
          h('button', { class: uygun ? 'vurgu-yumusak' : '', disabled: !uygun, onclick: () => this.oyun.komut(olayCoz, i) }, s.metin),
          uygun ? null : h('div', { class: 'neden' }, `⚠ ${gereksinimMetni(s.gereksinim)}`));
      }))] }));
  }

  gunluk() {
    const g = this.oyun.gecmis;
    const ogeler = [];
    let son = null;
    for (const b of [...g].reverse()) {
      if (b.gun !== son) { ogeler.push(h('div', { class: 'gunluk-gun' }, `Gün ${b.gun}`)); son = b.gun; }
      ogeler.push(h('div', { class: `gunluk-satir ${b.seviye}` }, h('span', {}, SEVIYE_SIMGE[b.seviye] || '•'), b.metin));
    }
    const kapat = () => { this.gunlukAcik = false; this.yenile(); };
    return h('div', { class: 'perde', onclick: (e) => { if (e.target === e.currentTarget) kapat(); } },
      this.pencereKabuk({ baslik: 'Günlük', ikon: '📜', sinif: 'modal acik', kapat,
        govde: ogeler.length ? ogeler : [h('p', { class: 'soluk bos' }, 'Henüz bildirim yok.')] }));
  }

  tamEkranDugme(sinif = '', etiket = false) {
    if (!tamEkranDestekli()) return null;
    const acik = tamEkranMi();
    return h('button', { class: sinif, title: acik ? 'Tam ekrandan çık' : 'Tam ekran', 'aria-label': 'Tam ekran', onclick: () => tamEkranAcKapa() }, etiket ? (acik ? '⛶ Tam ekrandan çık' : '⛶ Tam ekran') : '⛶');
  }
  // İlk başlatmada tam ekranı bir kez öneren, kapatılabilir satır (seçim ut_tam'da hatırlanır).
  tamEkranOner() {
    if (!tamEkranDestekli() || tamEkranMi() || depoOku('ut_tam', { soruldu: false }).soruldu) return;
    depoYaz('ut_tam', { soruldu: true });
    const el = h('div', { class: 'tam-oneri' }, h('span', {}, 'Tam ekran oynamak ister misin?'),
      h('button', { class: 'vurgu', onclick: () => { el.remove(); tamEkranAcKapa(); } }, '⛶ Tam ekran'),
      h('button', { class: 'ikon-d', 'aria-label': 'Kapat', onclick: () => el.remove() }, '✕'));
    document.body.append(el);
    setTimeout(() => el.remove(), 15000);
  }
  menu() {
    const var_ = this.oyun.kayitVar();
    const ozet = this.oyun.kayitOzeti();
    const oyunda = !!this.d;
    const kapat = () => { this.menuAcik = false; this.menuSayfa = 'ana'; this.yeniOnay = false; this.yenile(); };
    const devam = () => { const m = this.oyun.devam(); this.menuAcik = false; this.menuSayfa = 'ana'; if (m) this.hata(m); this.sahneOdak(); this.yenile(); this.tamEkranOner(); };
    const yeniBaslat = () => {
      this.oyun.yeni(); this.menuAcik = false; this.menuSayfa = 'ana'; this.yeniOnay = false; this.secim = null; this.yerlestirme = null; this.sahne.yerlestirme(null);
      this.pencere = 'kapali'; this.kaydetUi(); this.sahneOdak(); this.ogretici.sifirla(); this.yenile(); this.tamEkranOner();
    };
    let baslik = 'Uygarlık Tohumu', ikon = '🌱', govde;
    if (this.menuSayfa === 'ayar') { baslik = 'Ayarlar'; ikon = '⚙️'; govde = this.ayarSayfasi(); }
    else if (this.menuSayfa === 'hakkinda') { baslik = 'Hakkında'; ikon = 'ℹ️'; govde = this.hakkindaSayfasi(); }
    else {
      govde = [
        h('p', { class: 'alt-yazi soluk' }, 'Çadırdan Orta Çağ\'a şehir kur.'),
        h('div', { class: 'menu-izgara' },
          h('button', { class: 'vurgu genis', disabled: !var_, onclick: devam },
            var_ ? `▶ Devam${ozet ? ` · Gün ${ozet.tur + 1}` : ''}` : '▶ Devam (kayıt yok)'),
          this.yeniOnay
            ? h('div', { class: 'onay genis' }, h('div', {}, 'Mevcut kayıt silinecek. Emin misin?'),
              h('div', { class: 'dugmeler' }, h('button', { onclick: () => { this.yeniOnay = false; this.yenile(); } }, 'Vazgeç'), h('button', { class: 'kotu', onclick: yeniBaslat }, 'Evet, yeni oyun')))
            : h('button', { onclick: () => { if (var_) { this.yeniOnay = true; this.yenile(); } else yeniBaslat(); } }, '🌱 Yeni Oyun'),
          this.yeniOnay ? null : h('button', { onclick: () => { this.menuSayfa = 'ayar'; this.yenile(); } }, '⚙️ Ayarlar'),
          this.yeniOnay ? null : this.tamEkranDugme('', true),
          this.yeniOnay ? null : h('button', { onclick: () => { this.menuSayfa = 'hakkinda'; this.yenile(); } }, 'ℹ️ Hakkında'),
          oyunda && !this.yeniOnay ? h('button', { onclick: kapat }, '↩ Oyuna dön') : null)];
    }
    const geri = this.menuSayfa !== 'ana' ? () => { this.menuSayfa = 'ana'; this.yenile(); } : null;
    const kabuk = this.pencereKabuk({ baslik, ikon, govde, sinif: 'modal menu acik', kapat: oyunda ? (geri || kapat) : geri, kapatSimge: geri ? '‹' : '✕' });
    return h('div', { class: 'perde', onclick: (e) => { if (e.target === e.currentTarget && oyunda) kapat(); } }, kabuk);
  }

  ayarSayfasi() {
    return [
      h('h4', {}, 'Grafik kalitesi'),
      h('div', { class: 'segment' }, KALITELER.map(([id, ad]) => h('button', {
        class: this.ayar.kalite === id ? 'secili' : '', onclick: () => { this.ayar = { ...this.ayar, kalite: id }; this.ayarYaz(); this.kaliteUygula(); this.yenile(); } }, ad))),
      h('div', { class: 'soluk kucuk' }, 'Performans yavaş telefonlar içindir. Seçim bu cihazda saklanır.'),
      h('h4', {}, 'Ses'),
      h('div', { class: 'oge ses' }, h('span', {}, '🔊 Ses efektleri ve müzik'), h('span', { class: 'etiket' }, 'Yakında')),
      h('h4', {}, 'Yardım'),
      h('button', { class: 'tam-genislik', onclick: () => { this.ogretici.yenidenGoster(); this.menuAcik = false; this.menuSayfa = 'ana'; this.yenile(); } }, '🎓 Öğreticiyi yeniden göster')];
  }

  hakkindaSayfasi() {
    return [
      h('p', {}, 'Uygarlık Tohumu: bir göçebe kampından Orta Çağ krallığına uzanan, sıra tabanlı şehir kurma oyunu.'),
      h('p', { class: 'soluk' }, 'Her tur bir gündür; Önder günde bir eylem yapar. Kaynakları dengele, halkı mutlu tut, çağ atla.'),
      h('p', { class: 'soluk kucuk' }, 'Kayıt bu tarayıcıda saklanır; her başarılı işlemde otomatik kaydedilir.')];
  }

  sahneOdak() {
    const m = merkezNokta(this.d);
    this.sahne.odakla(m.x, m.y);
  }
}
