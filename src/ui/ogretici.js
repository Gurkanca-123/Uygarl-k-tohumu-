// Başlangıç öğreticisi: 5 adımlık, kapatılabilir ipucu balonu. Bitince / kapatılınca bir daha gösterilmez (localStorage, yalnız kolaylık).
import { h } from './dom.js';
import { maliyetHesapla } from '../core/insa.js';

const ANAHTAR = 'ut_ogretici_bitti';
const cadirSayisi = (d) => d.binalar.filter((b) => b.id === 'cadir').length;
// Çadır'a yetecek kaynak var mı (yoksa hangisi eksik)?
function cadirEksik(d) {
  const m = maliyetHesapla(d, 'cadir');
  return Object.entries(m).filter(([k, n]) => (d.kaynaklar[k] || 0) < n).map(([k]) => k);
}
// Her adım oyuncunun gerçek durumuna tepki verir: `bitti(d, giris)` sağlanınca sonraki adıma geçilir (giris = adıma girilen tur).
const ADIMLAR = [
  { baslik: '1/5 · İşçi ata',
    metin: () => 'Sağdaki 👷 İş simgesine dokun; bir Toplayıcıyı Avcı yap. Avcı yiyecekle birlikte deri de getirir.',
    bitti: (d) => Object.entries(d.atama).some(([k, n]) => n > 0 && k !== 'serbest:toplayici') },
  { baslik: '2/5 · Çadır kur',
    metin: (d) => cadirEksik(d).length
      ? 'Çadır için odun ve deri yetmiyor. Önder simgesinden "Avlan"ı seç: deri toplar. Günü bitirince kaynak gelir.'
      : '🔨 İnşa simgesinden Çadır\'ı seç, haritada yeşil işaretli bir yere dokun, "Onayla"ya bas. Yeni kişiler barınak ister.',
    bitti: (d) => cadirSayisi(d) >= 2 },
  { baslik: '3/5 · Önder eylemi',
    metin: () => 'Önder simgesinden bir eylem seç: "Avlan" yiyecek ve deri, "Keşfet" haritadaki sisi açıp yeni kaynak bulur.',
    bitti: (d, giris) => !!d.onder.eylem || d.tur > giris },
  { baslik: '4/5 · Günü bitir',
    metin: () => 'Hazır olunca altta "Günü bitir"e bas. Üretim, tüketim ve inşaat o gün işler.',
    bitti: (d, giris) => d.tur > giris },
  { baslik: '5/5 · Kışa hazırlan',
    metin: (d) => d.binalar.some((b) => b.id === 'kurutma_rafi')
      ? 'Güzel! Kış 16. günde başlıyor: tarım durur, ısınma için odun yanar. Yiyecek ve odun biriktir.'
      : 'Kış 16. günde başlıyor: tarım durur, ısınma için odun yanar. 🔨 İnşa\'dan Kurutma Rafı kur, yiyecek ve odun biriktir.',
    bitti: () => false },
];

export class Ogretici {
  constructor(arayuz) {
    this.a = arayuz;
    this.adim = 0; this.giris = null;
    this.kapali = this.oku();
  }
  oku() { try { return localStorage.getItem(ANAHTAR) === '1'; } catch { return false; } }
  yaz() { try { localStorage.setItem(ANAHTAR, '1'); } catch { /* yoksay */ } }
  sifirla() { this.adim = 0; this.giris = null; this.kapali = this.oku(); }
  yenidenGoster() { this.adim = 0; this.giris = null; this.kapali = false; this.zorla = true; try { localStorage.removeItem(ANAHTAR); } catch { /* yoksay */ } }
  kapat() { this.kapali = true; this.yaz(); this.a.yenile(); }
  guncelle(d, el) {
    // yalnız oyunun ilk günlerinde (kayıttan devam eden ileri oyunlarda gösterme); ayarlardan açılırsa her zaman
    if (this.kapali || (d.tur > 25 && !this.zorla) || this.a.yerlestirme || this.a.secim) { el.replaceChildren(); return; }
    if (this.giris === null) this.giris = d.tur;
    while (this.adim < ADIMLAR.length - 1 && ADIMLAR[this.adim].bitti(d, this.giris)) { this.adim++; this.giris = d.tur; }
    const s = ADIMLAR[this.adim];
    const son = this.adim === ADIMLAR.length - 1;
    el.replaceChildren(h('div', { class: 'ipucu' },
      h('div', { class: 'ipucu-ust' }, h('b', {}, s.baslik),
        h('div', { class: 'dugmeler' },
          h('button', { onclick: () => this.kapat() }, son ? 'Bitti' : 'Kapat'),
          son ? null : h('button', { class: 'vurgu', onclick: () => { this.adim++; this.giris = this.a.d.tur; this.a.yenile(); } }, 'İleri'))),
      h('div', { class: 'kucuk' }, s.metin(d))));
  }
}
