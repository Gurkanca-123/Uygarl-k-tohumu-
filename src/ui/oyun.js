// Oyun denetçisi: durumu tutar, komutları çekirdekten geçirir, kayıt ve bildirim günlüğünü yönetir.
// Arayüz ve çizim durumu DOĞRUDAN değiştirmez; yalnız `komut(fn, ...args)` / `gunuBitir()` / `mevsimSonu()` kullanır.
import { yeniOyun } from '../core/oyun_durumu.js';
import { mevsimSonunaIlerlet } from '../core/komutlar.js';
import { takvim } from '../core/takvim.js';
import { ANAHTARLAR, kaydet, oku, turIlerletVeKaydet } from '../save/kayit.js';

export function depoAl() {
  try {
    const s = window.localStorage;
    s.setItem('__ut', '1'); s.removeItem('__ut');
    return s;
  } catch {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
  }
}

const rastgeleTohum = () => Math.floor(Math.random() * 1e9) + 1;
const NEDEN = {
  olay: 'Bir olay çıktığı için duruldu.', aclik: 'Açlık başladığı için duruldu.',
  insaat: 'Bir inşaat bittiği için duruldu.', mevsim_sonu: 'Mevsim sonuna gelindi.', en_cok: 'En çok tur sayısına ulaşıldı.',
};

export class Oyun {
  constructor(depo = depoAl()) {
    this.depo = depo;
    this.durum = null;
    this.gecmis = [];       // { gun, seviye, metin }
    this.degisim = {};      // son turda kaynak başına ortalama değişim
    this.sonBildirimler = [];
    this.dinleyiciler = [];
  }

  dinle(fn) { this.dinleyiciler.push(fn); }
  yay(tip, veri) { for (const f of this.dinleyiciler) f(tip, veri); }

  kayitVar() {
    try { return this.depo.getItem(ANAHTARLAR.otomatik) != null; } catch { return false; }
  }

  kayitOzeti() {
    try {
      const m = this.depo.getItem(ANAHTARLAR.otomatik);
      if (m == null) return null;
      const j = JSON.parse(m);
      return { tur: j.tur, cag: j.cag, nufus: j.nufus };
    } catch { return null; }
  }

  // Dönüş: hata iletisi ya da null.
  devam() {
    const r = oku(this.depo, ANAHTARLAR.otomatik, rastgeleTohum());
    if (!r.durum) return 'Kayıt bulunamadı.';
    this.ata(r.durum);
    return r.hata ? `Kayıt okunamadı (${r.hata}); yeni oyun başlatıldı.` : null;
  }

  yeni() {
    this.ata(yeniOyun(rastgeleTohum()));
    this.gecmis = [];
    this.kaydetSessiz();
  }

  ata(durum) {
    this.durum = durum;
    this.degisim = {};
    this.sonBildirimler = [];
    this.yay('durum', null);
  }

  kaydetSessiz() {
    try { kaydet(this.depo, ANAHTARLAR.otomatik, this.durum); } catch (e) { this.yay('hata', 'Kayıt yazılamadı.'); }
  }

  bildirimEkle(liste, gun) {
    for (const b of liste) this.gecmis.push({ gun, seviye: b.seviye, metin: b.metin, kod: b.kod });
    if (this.gecmis.length > 150) this.gecmis.splice(0, this.gecmis.length - 150);
  }

  // Komut çağırır. Dönüş: çekirdeğin sonucu ({ durum, hata? }); hata varsa durum değişmez ve hata yayılır.
  komut(fn, ...args) {
    const r = fn(this.durum, ...args);
    if (r.hata) { this.yay('hata', r.hata); return r; }
    this.durum = r.durum;
    if (r.bildirimler?.length) {
      this.bildirimEkle(r.bildirimler, takvim(this.durum.tur).gun);
      this.yay('bildirim', r.bildirimler);
    }
    this.kaydetSessiz();
    this.yay('durum', null);
    return r;
  }

  turSonrasi(onceki, sonuc, turSayisi) {
    const d = sonuc.durum;
    const fark = {};
    for (const [k, v] of Object.entries(d.kaynaklar)) fark[k] = (v - (onceki.kaynaklar[k] || 0)) / Math.max(1, turSayisi);
    this.degisim = fark;
    this.durum = d;
    this.sonBildirimler = sonuc.bildirimler;
    this.bildirimEkle(sonuc.bildirimler, takvim(onceki.tur).gun + turSayisi - 1);
    this.yay('durum', null);
    this.yay('tur', { bildirimler: sonuc.bildirimler, turSayisi, neden: sonuc.neden });
  }

  gunuBitir() {
    const onceki = this.durum;
    const r = turIlerletVeKaydet(this.depo, this.durum);
    if (r.hata) { this.yay('hata', r.hata); return r; }
    this.turSonrasi(onceki, r, 1);
    return r;
  }

  mevsimSonu() {
    const onceki = this.durum;
    const r = mevsimSonunaIlerlet(this.durum);
    if (r.hata) { this.yay('hata', r.hata); return r; }
    this.kaydetSessiz();
    const bildirimler = [...r.bildirimler, { kod: 'ilerleme', seviye: 'bilgi', metin: `${r.turSayisi} gün ilerledi. ${NEDEN[r.neden] || ''}`.trim() }];
    this.turSonrasi(onceki, { durum: r.durum, bildirimler, neden: r.neden }, r.turSayisi);
    return r;
  }
}
