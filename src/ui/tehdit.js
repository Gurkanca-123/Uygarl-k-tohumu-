// Tehdit arayüzü: üst çubuk uyarı çipi + tehdit penceresi (savunma göstergesi, çit durumu, tavır seçimi). Çekirdeği yalnız okur;
// durumu değiştirmek için `a.oyun.komut(fn, ...)` kullanır. Pencere oyunu DURDURMAZ (TEHDIT.md §11).
import { tehditGorunumu } from '../core/tehdit.js';
import { tehditTavir, haracOde, tahkimatYap, zorlukAyarla, silahDagit, kusatmaKarar, onderEylemiSec } from '../core/komutlar.js';
import { savunmaDokum, savunmaHesapla } from '../core/savunma.js';
import { cevreDurumu } from '../world/cevre.js';
import { BINALAR } from '../data/binalar.js';
import { ZORLUK } from '../data/denge.js';
import { KAYNAK } from '../core/yardimci.js';
import { h, yuvarla } from './dom.js';
import { insaNedeni } from './paneller.js';
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
  const kus = a?.evre === 'kusatma';
  const etiket = a ? (kus ? `${a.kusatma?.kalan ?? a.kalan} tur` : `${a.kalan} gün`) : g.kademeAd;
  return h('button', { class: `chip tehdit ${sinif}${a ? ' aktif' : ''}${kus ? ' kusatma' : ''}${a?.karar ? ' karar' : ''}`,
    title: a ? `${a.ad}${kus ? ' (kuşatma)' : ''}: ${a.isaret}` : `Tehdit: ${g.kademeAd}`, 'aria-label': 'Tehdit durumu', onclick: ac },
  h('span', { class: 'sim' }, a ? (kus ? '🏰' : '⚔') : KADEME_SIMGE[g.kademe]), h('b', {}, etiket));
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

const kay = (r) => KAYNAK[r]?.simge ?? r;
const say = (x) => Math.max(1, Math.round(x));
// Kısa maliyet (en çok 2 kalem, kalan "…"); tamamı title'da (ucretAd).
const ucret = (m) => { const e = Object.entries(m || {}).filter(([, x]) => x > 0); return e.length ? e.slice(0, 2).map(([r, x]) => `${say(x)}${kay(r)}`).join(' ') + (e.length > 2 ? '…' : '') : 'bedelsiz'; };
const ucretAd = (m) => Object.entries(m || {}).filter(([, x]) => x > 0).map(([r, x]) => `${say(x)} ${KAYNAK[r]?.ad ?? r}`).join(', ') || 'bedelsiz';

// Küçük eylem düğmesi: ad + kısa ek (maliyet / olasılık). Uygun değilse devre dışı; nedeni `neden` satırında ve title'da.
function eylemDugme(ad, ek, { secili, uygun, hata, ipucu, tikla, sinif = '' }) {
  return h('button', { class: `t-d${ek ? ' ek' : ''}${secili ? ' secili' : ''}${sinif ? ` ${sinif}` : ''}`, disabled: !uygun || secili, title: hata || ipucu || '', onclick: tikla },
    h('span', {}, `${secili ? '✓ ' : ''}${ad}`), ek ? h('small', {}, ek) : null);
}

function ozetSatiri(t) {
  const guc = t.guc != null ? `${t.guc}` : `${t.aralik[0]}–${t.aralik[1]}`;
  const oran = Math.max(0, Math.min(1, t.savunma / Math.max(1, t.guc ?? t.aralik[1])));
  const kus = t.evre === 'kusatma';
  return [
    h('div', { class: 't-ozet' },
      h('span', { title: kus ? 'Kuşatmanın bitmesine kalan tur' : 'Varışa kalan gün' }, kus ? '⛓' : '⏳', h('b', {}, kus ? `${t.kusatma?.kalan ?? t.kalan} tur` : `${t.kalan} gün`)),
      h('span', { title: 'Tehdit gücü' }, '⚔', h('b', {}, guc + (t.bilinen ? '' : '?'))),
      h('span', { title: 'Savunmanız' }, '🛡', h('b', {}, yuvarla(t.savunma))),
      h('em', { class: t.renk }, RENK_METNI[t.renk])),
    h('div', { class: `tehdit-bar ${t.renk}`, title: t.beklenen.metin }, h('i', { style: `width:${Math.round(oran * 100)}%` }))];
}

// Kuşatma evresi: süre, aşınma çubuğu, iki karar düğmesi.
function kusatmaBlogu(a, d, t) {
  const k = t.kusatma;
  const harac = t.secenekler.find((s) => s.id === 'harac');
  const guc0 = Math.max(t.guc ?? 1, (t.guc ?? 1) + (k.asinma || 0) * Math.max(0, k.sure - (k.kalan ?? k.sure)));
  const oran = Math.max(0.04, Math.min(1, (t.guc ?? 1) / guc0));
  const dayan = t.karar;
  return [
    h('div', { class: 't-kus' },
      h('div', { class: 't-kus-ust' }, h('span', {}, `Kuşatma ${Math.max(0, k.sure - (k.kalan ?? 0) + 1)}/${k.sure}`), h('small', {}, 'kuşatan ordunun gücü')),
      h('div', { class: 'tehdit-bar kirmizi asinma', title: 'Kuşatan ordunun kalan gücü' }, h('i', { style: `width:${Math.round(oran * 100)}%` }))),
    h('div', { class: 't-grid iki' },
      eylemDugme('🛡 Dayan', dayan ? `ordu −${k.asinma}/tur` : 'sürüyor', { secili: !dayan, uygun: dayan, hata: dayan ? '' : 'Dayanma kararı verildi.',
        ipucu: 'Duvarlara güven: kuşatma sürer, savunma gücü aşarsa ordu püskürür; süre dolarsa kayıp yaşanır.', tikla: () => a.oyun.komut(kusatmaKarar, 'dayan'), sinif: 'oner' }),
      eylemDugme('💰 Fidye', harac ? `${ucret(harac.maliyet)} · biter` : '', { secili: false, uygun: !!harac?.uygun, hata: harac?.hata,
        ipucu: harac ? `${ucretAd(harac.maliyet)} verilir, ordu çekilir.` : '', tikla: () => a.oyun.komut(kusatmaKarar, 'fidye') }))];
}

function silahSatiri(a, d, t) {
  const s = t.silah;
  if (!s || !s.birim) return null;
  const [r, m] = Object.entries(s.birim)[0];
  const ust = Math.max(1, s.kalan);
  a.silahAdet = Math.max(1, Math.min(a.silahAdet || 1, ust));
  const n = a.silahAdet;
  return h('div', { class: `t-silah${s.uygun ? '' : ' gri'}`, title: s.hata || `Her ${m} ${KAYNAK[r].ad} +1 savunma` },
    h('span', { class: 't-etk' }, '🗡 Silah'),
    h('button', { class: 't-pm', disabled: !s.uygun || n <= 1, 'aria-label': 'Azalt', onclick: () => { a.silahAdet = n - 1; a.yenile(); } }, '−'),
    h('b', { class: 't-n' }, n),
    h('button', { class: 't-pm', disabled: !s.uygun || n >= s.kalan, 'aria-label': 'Artır', onclick: () => { a.silahAdet = n + 1; a.yenile(); } }, '+'),
    h('button', { class: 't-d ek t-dagit', disabled: !s.uygun, onclick: () => a.oyun.komut(silahDagit, n) },
      h('span', {}, 'Dağıt'), h('small', {}, `${m * n}${kay(r)} +${n}🛡`)),
    h('small', { class: 't-say' }, `${s.verilen}/${s.ust}`));
}

function aktifBlok(a, d, g) {
  const t = g.aktif;
  const kus = t.evre === 'kusatma';
  const govde = [h('p', { class: 'tehdit-metin', title: t.metin }, t.metin), ...ozetSatiri(t)];
  if (!t.bilinen) govde.push(h('div', { class: 'soluk kucuk' }, 'Güç kesin değil (üst uç sayıldı). Gözcü ve keşif netleştirir.'));
  const nedenler = [];
  if (kus && t.kusatma) govde.push(...kusatmaBlogu(a, d, t));
  else {
    const duvar = [];
    for (const s of t.secenekler) {
      let dg;
      if (s.eylem === 'elci_gonder') {
        dg = eylemDugme('🕊 Elçi', `%${Math.round(s.olasilik * 100)} · ${ucret(s.maliyet)}`, { secili: d.onder?.eylem === s.eylem, uygun: s.uygun, hata: s.hata,
          ipucu: `Hediye: ${ucretAd(s.maliyet)} · başarı olasılığı %${Math.round(s.olasilik * 100)}. Önder eylemi (bu tur).`, tikla: () => a.oyun.komut(onderEylemiSec, s.eylem) });
      } else if (s.id === 'harac') {
        dg = eylemDugme('💰 Haraç', ucret(s.maliyet), { secili: false, uygun: s.uygun, hata: s.hata, ipucu: `${ucretAd(s.maliyet)} verip tehdidi uzaklaştır.`, tikla: () => a.oyun.komut(haracOde) });
      } else {
        dg = eylemDugme(`${s.id === 'savun' ? '🛡 Savun' : '🏚 Saklan'}`, '', { secili: s.secili, uygun: s.uygun, hata: s.hata, ipucu: `${s.ad}: ${s.id === 'savun' ? 'savunmaya güven' : 'kayıp azalır, üretim düşer'}`, tikla: () => a.oyun.komut(tehditTavir, s.id) });
      }
      if (!s.uygun && s.hata) nedenler.push(`${s.ad}: ${s.hata}`);
      duvar.push(dg);
    }
    const n = t.nobet;
    if (n) {
      duvar.push(eylemDugme('🔦 Nöbet', `+${n.savunma} 🛡 · ${n.sure} tur`, { secili: d.onder?.eylem === n.eylem, uygun: n.uygun, hata: n.hata,
        ipucu: `Önder nöbet tutar: ${n.sure} tur +${n.savunma} savunma. Önder eylemi (bu tur).`, tikla: () => a.oyun.komut(onderEylemiSec, n.eylem) }));
      if (!n.uygun && n.hata) nedenler.push(`Nöbet: ${n.hata}`);
    }
    const k = t.tahkimat;
    if (k) {
      duvar.push(eylemDugme('🛠 Tahkimat', ucret(k.maliyet), { secili: false, uygun: k.uygun, hata: k.hata, ipucu: `Acil tahkimat: ${ucretAd(k.maliyet)} → +${k.savunma} savunma`, tikla: () => a.oyun.komut(tahkimatYap) }));
      if (!k.uygun && k.hata) nedenler.push(`Tahkimat: ${k.hata}`);
    }
    govde.push(h('div', { class: 't-grid' }, duvar));
    const sl = silahSatiri(a, d, t);
    if (sl) { govde.push(sl); if (!t.silah.uygun && t.silah.hata) nedenler.push(`Silah: ${t.silah.hata}`); }
    if (nedenler.length) govde.push(h('div', { class: 'neden t-neden', title: nedenler.join('\n') }, nedenler.join(' · ')));
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
  return { baslik: aktif ? (aktif.evre === 'kusatma' && !/Kuşatma/i.test(aktif.ad) ? `${aktif.ad} · kuşatma` : aktif.ad) : 'Tehdit durumu', ikon: aktif ? (aktif.evre === 'kusatma' ? '🏰' : '⚔') : KADEME_SIMGE[g.kademe], govde };
}
