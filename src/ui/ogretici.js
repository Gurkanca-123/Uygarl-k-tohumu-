// Başlangıç öğreticisi: 5 adımlık, kapatılabilir ipucu balonu. Bitince / kapatılınca bir daha gösterilmez (localStorage, yalnız kolaylık).
import { h } from './dom.js';

const ANAHTAR = 'ut_ogretici_bitti';
const ADIMLAR = [
  { baslik: '1/5 · İşçi ata', metin: 'Sağdaki 👷 İş simgesine dokun, kişileri işlere dağıt. Örneğin biri Oduncu olsun; odun çadır ve ısınma için gerekli.',
    bitti: (d) => Object.entries(d.atama).some(([k, n]) => n > 0 && k !== 'serbest:toplayici') },
  { baslik: '2/5 · Çadır kur', metin: '🔨 İnşa simgesinden Çadır\'ı seç, haritada yeşil işaretli bir yere dokun ve "Onayla"ya bas. Yeni kişiler için barınak lazım.',
    bitti: (d) => d.binalar.length > 2 },
  { baslik: '3/5 · Günü bitir', metin: 'Hazır olunca altta "Günü bitir"e bas. Üretim, tüketim ve inşaat o gün işler.', bitti: (d) => d.tur >= 1 },
  { baslik: '4/5 · Keşfet', metin: '🧭 Önder simgesinde "Keşfet"i seç ve günü bitir: harita sisi açılır, yeni kaynaklar bulunur.', bitti: (d) => d.onder.eylem === 'kesfet' },
  { baslik: '5/5 · Kışa hazırlan', metin: '16. günde kış başlıyor: tarım durur, ısınma için odun yanar. Yiyecek ve odun biriktir, yeterli barınak kur.', bitti: () => false },
];

export class Ogretici {
  constructor(arayuz) {
    this.a = arayuz;
    this.adim = 0;
    this.kapali = this.oku();
  }
  oku() { try { return localStorage.getItem(ANAHTAR) === '1'; } catch { return false; } }
  yaz() { try { localStorage.setItem(ANAHTAR, '1'); } catch { /* yoksay */ } }
  sifirla() { this.adim = 0; this.kapali = this.oku(); }
  yenidenGoster() { this.adim = 0; this.kapali = false; this.zorla = true; try { localStorage.removeItem(ANAHTAR); } catch { /* yoksay */ } }
  kapat() { this.kapali = true; this.yaz(); this.a.yenile(); }
  guncelle(d, el) {
    // yalnız oyunun ilk günlerinde (kayıttan devam eden ileri oyunlarda gösterme); ayarlardan açılırsa her zaman
    if (this.kapali || (d.tur > 25 && !this.zorla) || this.a.yerlestirme || this.a.secim) { el.replaceChildren(); return; }
    while (this.adim < ADIMLAR.length - 1 && ADIMLAR[this.adim].bitti(d)) this.adim++;
    const s = ADIMLAR[this.adim];
    const son = this.adim === ADIMLAR.length - 1;
    el.replaceChildren(h('div', { class: 'ipucu' },
      h('div', { class: 'ipucu-ust' }, h('b', {}, s.baslik),
        h('div', { class: 'dugmeler' },
          h('button', { onclick: () => this.kapat() }, son ? 'Bitti' : 'Kapat'),
          son ? null : h('button', { class: 'vurgu', onclick: () => { this.adim++; this.a.yenile(); } }, 'İleri'))),
      h('div', { class: 'kucuk' }, s.metin)));
  }
}
