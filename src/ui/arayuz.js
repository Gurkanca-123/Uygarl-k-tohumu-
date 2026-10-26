// Arayüz kabuğu: üst çubuk, sağ sekmeli panel, alt şerit, bilgi kartı, yerleştirme modu, olay penceresi, günlük, menü, toast.
import { KAYNAKLAR } from '../data/kaynaklar.js';
import { BINALAR } from '../data/binalar.js';
import { OLAYLAR } from '../data/olaylar.js';
import { insaEt, olayCoz, cagAtla } from '../core/komutlar.js';
import { yik } from '../core/komutlar.js';
import { secenekUygunMu } from '../core/olay.js';
import { bilgiUretimi } from '../core/arastirma.js';
import { takvim } from '../core/takvim.js';
import { kaynakAcik, depoTavani, mevcutCag, binaBul, barinmaKapasitesi, issizSayisi } from '../core/yardimci.js';
import { maliyetHesapla } from '../core/insa.js';
import { yerUygunMu, uygunYerler } from '../world/yerlestir.js';
import { merkezNokta } from '../world/harita.js';
import { h, yuvarla } from './dom.js';
import {
  insaSekmesi, isSekmesi, arastirmaSekmesi, onderSekmesi, cagSekmesi, binaKarti, hucreKarti, maliyetChips, gereksinimMetni,
} from './paneller.js';
import { Ogretici } from './ogretici.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const OLAY = Object.fromEntries(OLAYLAR.map((o) => [o.id, o]));
const SEKMELER = [['insa', '🔨', 'İnşa', insaSekmesi], ['is', '👷', 'İş', isSekmesi], ['arastirma', '🔬', 'Araştırma', arastirmaSekmesi],
  ['onder', '🧭', 'Önder', onderSekmesi], ['cag', '🏛', 'Çağ', cagSekmesi]];

export class Arayuz {
  constructor(kok, oyun, sahne) {
    this.kok = kok; this.oyun = oyun; this.sahne = sahne;
    this.sekme = 'insa'; this.panelAcik = true;
    this.secim = null; this.yerlestirme = null; this.yikOnay = null; this.kervanSecim = null;
    this.menuAcik = false; this.gunlukAcik = false; this.zaferGoster = null;
    this.toastlar = [];
    this.scrollTop = {};
    this.ogretici = new Ogretici(this);
    this.kur();
    oyun.dinle((tip, veri) => this.olay(tip, veri));
    sahne.onTik = (x, y) => this.hucreTik(x, y);
    sahne.onUzerinde = (x, y) => { if (this.yerlestirme && !this.sahneDokunmatik) this.yerlestirmeKonum(x, y); };
  }

  get d() { return this.oyun.durum; }

  kur() {
    this.kok.innerHTML = '';
    this.ustEl = h('div', { class: 'ust' });
    this.ortaEl = h('div', { class: 'orta' });
    this.panelEl = h('div', { class: 'panel' });
    this.altEl = h('div', { class: 'alt' });
    this.toastEl = h('div', { class: 'toasts' });
    this.kartEl = h('div');
    this.ipucuEl = h('div');
    this.cubukEl = h('div');
    this.ortaEl.append(this.toastEl, this.ipucuEl, this.kartEl, this.cubukEl);
    this.modalEl = h('div');
    this.kok.append(this.ustEl, this.ortaEl, this.panelEl, this.altEl, this.modalEl);
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
    const satirlar = liste.slice(0, 6);
    const ek = liste.length - satirlar.length;
    const seviye = sev || (liste.some((b) => b.seviye === 'uyari') ? 'uyari' : liste.some((b) => b.seviye === 'iyi') ? 'iyi' : '');
    const el = h('div', { class: `toast ${seviye}`, onclick: () => el.remove() },
      satirlar.map((b) => h('div', {}, b.metin)), ek > 0 ? h('div', { class: 'soluk kucuk' }, `…ve ${ek} bildirim daha (Günlük)`) : null);
    this.toastEl.append(el);
    while (this.toastEl.children.length > 4) this.toastEl.firstChild.remove();
    setTimeout(() => el.remove(), sev === 'hata' ? 4500 : 6500);
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

  hucreTik(x, y) {
    this.sahneDokunmatik = true;
    if (!this.d) return;
    if (this.yerlestirme) { this.yerlestirmeKonum(x, y, true); return; }
    const b = this.sahne.hucredekiBina(x, y);
    this.yikOnay = null;
    this.secim = b ? { tip: 'bina', uid: b.uid } : { tip: 'hucre', x, y };
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

    const eskiKaydirma = this.panelGovde?.scrollTop ?? 0;
    this.ust(d); this.panel(d, eskiKaydirma); this.alt(d); this.kart(d); this.cubuk(d); this.modal(d);
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
      chips.push(h('div', { class: `chip${v >= tavan - 0.01 ? ' dolu' : ''}`, title: k.ad },
        k.simge, h('b', {}, Math.floor(v + 1e-6)), h('small', {}, `/${Math.round(tavan)}`),
        Math.abs(dl) >= 0.05 ? h('span', { class: dl > 0 ? 'art' : 'azl' }, `${dl > 0 ? '▲+' : '▼'}${yuvarla(dl)}`) : null));
    }
    chips.push(h('div', { class: 'chip', title: 'Bilgi Puanı' }, '💡', h('b', {}, `+${yuvarla(bilgiUretimi(d))}`), h('small', {}, 'BP/gün')));
    chips.push(h('div', { class: `chip${d.huzur < 30 ? ' uyari' : ''}`, title: 'Huzur' }, '😊', h('b', {}, Math.round(d.huzur))));
    const bar = barinmaKapasitesi(d), isz = issizSayisi(d);
    chips.push(h('div', { class: `chip${d.nufus > bar ? ' uyari' : ''}`, title: 'Nüfus / barınak' }, '👥', h('b', {}, d.nufus), h('small', {}, `/${bar}`),
      isz > 0 ? h('small', { style: 'color:var(--kotu)' }, ` ${isz} işsiz`) : null));
    if (d.istatistik?.serbestKip) chips.push(h('div', { class: 'chip dolu' }, '🏆 Serbest kip'));
    this.ustEl.replaceChildren(
      h('div', { class: 'zaman' }, h('b', {}, c.ad), h('span', {}, `${t.mevsimAd} ${t.mevsimGunu}/5 · Gün ${t.gun} · Yıl ${t.yil}`)),
      h('div', { class: 'seritler' }, chips));
  }

  panel(d, kaydirma) {
    const gizli = !!this.yerlestirme || !this.panelAcik;
    this.panelEl.className = `panel${gizli ? ' gizli' : ''}`;
    const [, , , fn] = SEKMELER.find((s) => s[0] === this.sekme);
    this.panelGovde = h('div', { class: 'govde' }, fn(this));
    this.panelEl.replaceChildren(
      h('div', { class: 'sekmeler' }, SEKMELER.map(([id, ik, ad]) => h('button', { class: this.sekme === id ? 'secili' : '', onclick: () => { this.sekme = id; this.yenile(); } }, h('span', {}, ik), ad))),
      this.panelGovde);
    this.panelGovde.scrollTop = kaydirma;
  }

  alt(d) {
    const kilit = !!d.olay.aktif;
    this.altEl.replaceChildren(
      h('div', { class: 'sol' },
        h('button', { class: 'menu-d', onclick: () => { this.menuAcik = true; this.yenile(); }, 'aria-label': 'Menü' }, '☰'),
        h('button', { class: 'menu-d', onclick: () => { this.gunlukAcik = true; this.yenile(); }, 'aria-label': 'Günlük' }, '📜'),
        h('button', { class: 'menu-d', onclick: () => { this.panelAcik = !this.panelAcik; this.yenile(); }, 'aria-label': 'Paneli aç/kapat' }, this.panelAcik ? '▶' : '◀')),
      h('div', { class: 'sag' },
        h('button', { class: 'buyuk', disabled: kilit || !!this.yerlestirme, onclick: () => this.oyun.mevsimSonu() }, '⏭ Mevsim sonuna'),
        h('button', { class: 'buyuk vurgu', disabled: kilit || !!this.yerlestirme, onclick: () => this.oyun.gunuBitir() }, '☀ Günü bitir')));
  }

  kart(d) {
    let el = null;
    if (!this.yerlestirme && this.secim) {
      if (this.secim.tip === 'bina') { const b = binaBul(d, this.secim.uid); if (b) el = binaKarti(this, b); }
      else el = hucreKarti(this, this.secim.x, this.secim.y);
    }
    const eski = this.kartEl.firstChild?.scrollTop ?? 0;
    this.kartEl.replaceChildren(...(el ? [el] : []));
    if (el) el.scrollTop = eski;
  }

  cubuk(d) {
    const y = this.yerlestirme;
    if (!y) { this.cubukEl.replaceChildren(); return; }
    const t = BINA[y.binaId];
    const m = maliyetChips(d, maliyetHesapla(d, y.binaId));
    this.cubukEl.replaceChildren(h('div', { class: 'yerlestirme-cubugu' },
      h('div', { class: 'metin' }, h('b', {}, t.ad), ' ', m,
        h('div', { class: y.hata ? 'neden' : 'ok kucuk' }, y.hata || `Uygun yer. (${y.adet} uygun konum yeşil)`),
        h('div', { class: 'soluk kucuk' }, 'Haritada dokunarak yer seç.')),
      h('button', { onclick: () => this.yerlestirmeIptal() }, 'İptal'),
      h('button', { class: 'iyi', disabled: !!y.hata, onclick: () => this.yerlestirmeOnayla() }, 'İnşa et')));
  }
  // ---------- modallar ----------
  modal(d) {
    let ic = null;
    if (this.menuAcik || !d) ic = this.menu();
    else if (d.olay.aktif) ic = this.olayPenceresi(d);
    else if (this.zaferGoster) {
      ic = h('div', { class: 'perde' }, h('div', { class: 'modal' }, h('h2', {}, '🏆 Zafer!'),
        h('p', {}, 'Medeniyetin Orta Çağ\'ın zirvesine ulaştı. Oyun serbest kipte sürüyor: istediğin kadar büyümeye devam edebilirsin.'),
        h('button', { class: 'vurgu', style: 'width:100%', onclick: () => { this.zaferGoster = false; this.yenile(); } }, 'Serbest kipte devam et')));
    } else if (this.gunlukAcik) ic = this.gunluk();
    this.modalEl.replaceChildren(...(ic ? [ic] : []));
  }

  olayPenceresi(d) {
    const o = OLAY[d.olay.aktif.id];
    return h('div', { class: 'perde' }, h('div', { class: 'modal' },
      h('h2', {}, o.ad), h('p', {}, o.metin),
      h('div', { class: 'secenekler' }, o.secenekler.map((s, i) => {
        const uygun = secenekUygunMu(d, s);
        return h('div', {}, h('button', { style: 'width:100%', class: uygun ? '' : '', disabled: !uygun, onclick: () => this.oyun.komut(olayCoz, i) }, s.metin),
          uygun ? null : h('div', { class: 'neden' }, gereksinimMetni(s.gereksinim)));
      }))));
  }

  gunluk() {
    const g = this.oyun.gecmis;
    const ogeler = [];
    let son = null;
    for (const b of [...g].reverse()) {
      if (b.gun !== son) { ogeler.push(h('div', { class: 'gunluk-gun' }, `Gün ${b.gun}`)); son = b.gun; }
      ogeler.push(h('div', { class: `gunluk-satir ${b.seviye}` }, b.metin));
    }
    return h('div', { class: 'perde', onclick: (e) => { if (e.target === e.currentTarget) { this.gunlukAcik = false; this.yenile(); } } },
      h('div', { class: 'modal' }, h('h2', {}, '📜 Günlük'),
        ogeler.length ? ogeler : h('p', { class: 'soluk' }, 'Henüz bildirim yok.'),
        h('button', { style: 'width:100%;margin-top:10px', onclick: () => { this.gunlukAcik = false; this.yenile(); } }, 'Kapat')));
  }

  menu() {
    const var_ = this.oyun.kayitVar();
    const ozet = this.oyun.kayitOzeti();
    const devamHata = () => { const m = this.oyun.devam(); this.menuAcik = false; if (m) this.hata(m); this.sahneOdak(); this.yenile(); };
    return h('div', { class: 'perde' }, h('div', { class: 'modal menu' },
      h('h1', {}, 'Uygarlık Tohumu'), h('p', { class: 'alt-yazi soluk' }, 'Çadırdan Orta Çağ\'a şehir kur.'),
      h('div', { class: 'secenekler' },
        h('button', { class: 'vurgu', disabled: !var_, onclick: devamHata },
          var_ ? `Devam${ozet ? ` (Gün ${ozet.tur + 1})` : ''}` : 'Devam (kayıt yok)'),
        h('button', { onclick: () => {
          if (var_ && !confirm('Mevcut kayıt silinecek. Yeni oyun başlatılsın mı?')) return;
          this.oyun.yeni(); this.menuAcik = false; this.secim = null; this.yerlestirme = null; this.sahne.yerlestirme(null);
          this.sahneOdak(); this.ogretici.sifirla(); this.yenile();
        } }, 'Yeni Oyun'),
        this.d ? h('button', { onclick: () => { this.menuAcik = false; this.yenile(); } }, 'Oyuna dön') : null)));
  }

  sahneOdak() {
    const m = merkezNokta(this.d);
    this.sahne.odakla(m.x, m.y);
  }
}
