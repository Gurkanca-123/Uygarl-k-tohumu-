// Tehdit arayüzü: üst çubuk uyarı çipi + tehdit penceresi (savunma göstergesi, çit durumu, tavır seçimi). Çekirdeği yalnız okur;
// durumu değiştirmek için `a.oyun.komut(fn, ...)` kullanır. Pencere oyunu DURDURMAZ (TEHDIT.md §11).
import { tehditGorunumu } from '../core/tehdit.js';
import { tehditTavir, haracOde, tahkimatYap, zorlukAyarla } from '../core/komutlar.js';
import { savunmaDokum, savunmaHesapla } from '../core/savunma.js';
import { cevreDurumu } from '../world/cevre.js';
import { BINALAR } from '../data/binalar.js';
import { ZORLUK } from '../data/denge.js';
import { h, yuvarla } from './dom.js';
import { maliyetChips, insaNedeni } from './paneller.js';
import { maliyetHesapla } from '../core/insa.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const KADEME_SIMGE = { sakin: '🛡', tedirgin: '👁', gergin: '⚠' };
const KADEME_METNI = {
  sakin: 'Çevre sakin. Şimdilik kimse köyüne göz dikmiyor.',
  tedirgin: 'Çevrede huzursuzluk var; bir tehlike belirebilir.',
  gergin: 'Hava gergin. Yakında bir tehdit çıkabilir; hazırlıklı ol.',
};
const RENK_METNI = { yesil: 'Savunma yeterli', sari: 'Kısmi kayıp riski', kirmizi: 'Savunma yetersiz' };

// Üst çubuk çipi. Dönüş: { el, aktifMi } (tıklanınca pencereyi açıp kapatan `ac` çağrılır) ya da null (motor kapalı).
export function tehditCipi(d, ac) {
  const g = tehditGorunumu(d);
  if (!g) return null;
  const a = g.aktif;
  const sinif = a ? `tehdit-${a.renk}` : `tehdit-${g.kademe}`;
  const etiket = a ? `${a.kalan} gün` : g.kademeAd;
  return h('button', { class: `chip tehdit ${sinif}${a ? ' aktif' : ''}`, title: a ? `${a.ad}: ${a.isaret}` : `Tehdit: ${g.kademeAd}`,
    'aria-label': 'Tehdit durumu', onclick: ac },
  h('span', { class: 'sim' }, a ? '⚔' : KADEME_SIMGE[g.kademe]), h('b', {}, etiket));
}

function savunmaSatiri(d) {
  const dokum = savunmaDokum(d).filter((k) => Math.abs(k.deger) > 0.001);
  return h('div', { class: 'tehdit-dokum' }, dokum.map((k) =>
    h('div', {}, h('span', {}, k.ad), h('b', {}, `${k.deger > 0 ? '+' : ''}${yuvarla(k.deger)}`),
      k.tavan != null && k.deger >= k.tavan ? h('small', {}, ' (tavan)') : null)));
}

function cevreBlogu(a, d) {
  const c = cevreDurumu(d);
  const durum = c.kapali ? h('div', { class: 'ok' }, `✓ Köy çevresi kapalı (içeride ${c.ic}/${c.toplam} bina)`)
    : c.parca ? h('div', { class: 'neden', style: 'color:var(--uyari)' }, c.bosluk != null ? `○ Halka açık: ${c.bosluk} parça eksik` : '○ Halka açık (çok geniş)')
      : h('div', { class: 'soluk kucuk' }, 'Henüz çit yok.');
  const dugmeler = ['cit', 'sur_parcasi'].map((id) => {
    const t = BINA[id];
    const neden = insaNedeni(d, t);
    if (neden && id !== 'cit') return null;
    return h('button', { class: 'tam-genislik', disabled: !!neden, title: neden || '', onclick: () => a.yerlestirmeBaslat(id) },
      `${id === 'cit' ? '🪵' : '🧱'} ${t.ad} çiz`, h('small', { style: 'margin-left:6px' }, `${Object.entries(maliyetHesapla(d, id)).map(([r, m]) => `${m} ${r}`).join(' ')}/parça`));
  });
  return h('div', { class: 'tehdit-blok' },
    h('h4', {}, '🪵 Çevre (çit / sur)'), durum,
    c.insaatta ? h('div', { class: 'soluk kucuk' }, `${c.insaatta} parça yapım aşamasında`) : null,
    c.hasarli ? h('div', { class: 'neden' }, `${c.hasarli} parça hasarlı (onarılana dek sayılmaz)`) : null,
    dugmeler);
}

function aktifBlok(a, d, g) {
  const t = g.aktif;
  const guc = t.guc != null ? `${t.guc}` : `${t.aralik[0]}–${t.aralik[1]}`;
  const oran = Math.max(0, Math.min(1, t.savunma / Math.max(1, t.guc ?? t.aralik[1])));
  const govde = [
    h('p', { class: 'tehdit-metin' }, t.metin),
    h('div', { class: 'tehdit-ozet' },
      h('div', {}, h('small', {}, 'Varışa'), h('b', {}, `${t.kalan} gün`)),
      h('div', {}, h('small', {}, 'Tehdit gücü'), h('b', {}, guc + (t.bilinen ? '' : ' ?'))),
      h('div', {}, h('small', {}, 'Savunmanız'), h('b', {}, yuvarla(t.savunma)))),
    h('div', { class: `tehdit-bar ${t.renk}` }, h('i', { style: `width:${Math.round(oran * 100)}%` })),
    h('div', { class: 'soluk kucuk' }, `${RENK_METNI[t.renk]} · ${t.beklenen.metin}`),
    !t.bilinen ? h('div', { class: 'soluk kucuk' }, 'Gücü kesin değil: aralığın üst ucu hesaba katıldı. Gözcü ve keşif netleştirir.') : null,
    h('h4', {}, 'Ne yapacaksın?'),
    t.secenekler.map((s) => {
      const harac = s.id === 'harac';
      return h('div', { class: `oge tehdit-sec${s.secili ? ' secili' : ''}${s.uygun ? '' : ' gri'}` },
        h('div', { class: 'baslik' }, h('span', { class: 'ad' }, `${s.secili ? '✓ ' : ''}${s.ad}`),
          h('button', { disabled: !s.uygun || (!harac && s.secili), onclick: () => a.oyun.komut(harac ? haracOde : tehditTavir, ...(harac ? [] : [s.id])) },
            harac ? 'Ver' : s.secili ? 'Seçili' : 'Seç')),
        harac ? maliyetChips(d, s.maliyet) : null,
        !s.uygun && s.hata ? h('div', { class: 'neden' }, s.hata) : null);
    }),
  ];
  const k = t.tahkimat;
  if (k) {
    govde.push(h('div', { class: `oge tehdit-sec${k.uygun ? '' : ' gri'}` },
      h('div', { class: 'baslik' }, h('span', { class: 'ad' }, `🛠 Acil Tahkimat (+${k.savunma} savunma)`),
        h('button', { disabled: !k.uygun, onclick: () => a.oyun.komut(tahkimatYap) }, 'Yap')),
      maliyetChips(d, k.maliyet), !k.uygun && k.hata ? h('div', { class: 'neden' }, k.hata) : null));
  }
  return govde;
}

// Pencere içeriği (pencereKabuk parametreleri).
export function tehditPenceresi(a, d) {
  const g = tehditGorunumu(d);
  const aktif = g.aktif;
  const govde = [];
  if (aktif) govde.push(aktifBlok(a, d, g));
  else {
    govde.push(h('p', { class: 'tehdit-metin' }, KADEME_METNI[g.kademe]));
    if (g.nefes) govde.push(h('div', { class: 'soluk kucuk' }, 'Yeni çağın sessizliği: tehditler bir süre gelmez.'));
    if (g.ipucu) govde.push(h('div', { class: 'soluk kucuk' }, `💡 ${g.ipucu}`));
    if (g.gerginlik != null) govde.push(h('div', { class: 'soluk kucuk' }, `Gerginlik ${g.gerginlik}/100${g.tahminiGun ? ` · en erken ~${g.tahminiGun} gün` : ''}`));
    else govde.push(h('div', { class: 'soluk kucuk' }, 'Gözcü Direği kurarsan tehdidin ne zaman geleceğini sezersin.'));
  }
  govde.push(h('div', { class: 'tehdit-blok' }, h('h4', {}, `🛡 Savunma: ${yuvarla(savunmaHesapla(d))}`), savunmaSatiri(d)));
  govde.push(cevreBlogu(a, d));
  const dus = Object.entries(ZORLUK).filter(([id, z]) => z.mvp && z.sira < ZORLUK[d.zorluk].sira);
  govde.push(h('div', { class: 'tehdit-blok soluk kucuk' }, `Zorluk: ${ZORLUK[d.zorluk].ad}`,
    dus.map(([id, z]) => h('button', { class: 'kucuk-d', onclick: () => a.oyun.komut(zorlukAyarla, id) }, `${z.ad}'a düşür`))));
  return { baslik: aktif ? `Tehdit: ${aktif.ad}` : 'Tehdit durumu', ikon: aktif ? '⚔' : KADEME_SIMGE[g.kademe], govde };
}
