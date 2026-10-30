// Gerçek cihaz ölçümü: aynı köy düzenini ESKİ, YENİ ve YENİ-UZAK (düşük ayrıntı) yari_ahsap_ev modelleriyle, oyun sahnesiyle aynı ışık/gölge/kamera
// ayarıyla çizer; her boyutta (bina sayısı) kare süresi, fps, çizim çağrısı, üçgen sayısı, geometri kurulum süresi raporlar.
// Adres parametreleri: ?sure=4 (sn/aşama)  ?pr=1 (piksel oranı; boş = cihazınki, en çok 2)  ?golge=0  ?hizli=1 (kısa deneme)
// UYARI: tarayıcı yazılım çizimi (SwiftShader/llvmpipe) kullanıyorsa sayılar GPU'lu telefonu temsil ETMEZ; sayfa bunu açıkça işaretler.
import * as THREE from 'three';
import { binaModeli, modeliTemizle } from '../render/binalar.js';

const q = new URLSearchParams(location.search);
const hizli = q.get('hizli') === '1';
const SURE = Number(q.get('sure') || (hizli ? 1.2 : 4)) * 1000;
const BOYUTLAR = hizli ? [16, 40] : [30, 80, 160];
const golge = q.get('golge') !== '0';
const $ = (id) => document.getElementById(id);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const pr = q.get('pr') ? Number(q.get('pr')) : Math.min(2, devicePixelRatio || 1);
renderer.setPixelRatio(pr);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = golge;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // oyundaki gibi: yalnız sahne değişince
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x2c313a);
document.body.prepend(renderer.domElement);

const gl = renderer.getContext();
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'bilinmiyor';
const yazilim = /swiftshader|llvmpipe|software|softpipe|basic render/i.test(gpu);

const sahne = new THREE.Scene();
const gunes = new THREE.DirectionalLight(0xfff2dd, 2.5);
gunes.castShadow = golge;
gunes.shadow.mapSize.set(2048, 2048);
Object.assign(gunes.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 120 });
gunes.shadow.bias = -0.0006; gunes.shadow.normalBias = 0.03;
sahne.add(gunes, gunes.target, new THREE.HemisphereLight(0xcfe2ff, 0x7a6a48, 1.05));
const arka = new THREE.DirectionalLight(0xbcd0ff, 0.45); arka.position.set(30, 20, -30); sahne.add(arka);
const zemin = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: 0x5f9a42 }));
zemin.rotation.x = -Math.PI / 2; zemin.position.y = 0.3; zemin.receiveShadow = true;
sahne.add(zemin);
const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
const kameraKur = (zoom = 1.6) => {
  const a = innerWidth / innerHeight, y = 8.5 / zoom;
  Object.assign(kamera, { left: -y * a, right: y * a, top: y, bottom: -y });
  kamera.position.set(40 + 6, 40, 40 + 6); kamera.lookAt(6, 0, 6);
  gunes.position.set(6 - 14, 34, 6 + 8); gunes.target.position.set(6, 0, 6); gunes.target.updateMatrixWorld();
  kamera.updateProjectionMatrix();
};
kameraKur();
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); kameraKur(); });

let grup = null;
function kur(mod, n, uidOn) {
  if (grup) { sahne.remove(grup); grup.traverse((o) => { if (o.isMesh && o.userData.tekGeo) o.geometry.dispose(); }); }
  grup = new THREE.Group();
  const t0 = performance.now();
  const yan = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const m = binaModeli({ id: 'yari_ahsap_ev', seviye: 1 + (i % 3 === 0 ? 1 : 0), uid: `${uidOn}${i}` }, {}, { mimari: mod === 'eski' ? 'eski' : 'yeni', lod: mod === 'yeni-uzak' });
    m.position.set((i % yan) * 1.25 - (yan * 1.25) / 2 + 6, 0, Math.floor(i / yan) * 1.25 - (yan * 1.25) / 2 + 6);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = golge; o.receiveShadow = golge; } });
    grup.add(m);
  }
  sahne.add(grup);
  renderer.shadowMap.needsUpdate = true;
  return performance.now() - t0;
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
async function olc(mod, n) {
  const kurMs = kur(mod, n, 'b');
  kameraKur(1.6 + (n > 100 ? -0.5 : 0)); // büyük köyde daha uzak
  const dt = [];
  let son = performance.now();
  const bas = son;
  await new Promise((bit) => {
    const tik = () => {
      const t = performance.now();
      dt.push(t - son); son = t;
      if (dt.length % 30 === 0) renderer.shadowMap.needsUpdate = true; // gölgeyi ara sıra yenile (sabit sahne ucuz olsun)
      renderer.render(sahne, kamera);
      if (t - bas < SURE) requestAnimationFrame(tik); else bit();
    };
    requestAnimationFrame(tik);
  });
  const d = dt.slice(3).sort((a, b) => a - b);
  const ort = d.reduce((a, b) => a + b, 0) / d.length;
  const i = renderer.info;
  return { mod, n, kurMs: +kurMs.toFixed(0), fps: +(1000 / ort).toFixed(1), ortMs: +ort.toFixed(1), p95Ms: +d[Math.floor(d.length * 0.95)].toFixed(1), enKotuMs: +d[d.length - 1].toFixed(1),
    cagri: i.render.calls, ucgen: i.render.triangles, geometri: i.memory.geometries };
}

async function kos() {
  $('durum').textContent = 'Ölçülüyor… ekrana dokunma, sekmeyi açık tut.';
  const sonuc = [];
  for (const n of BOYUTLAR) for (const mod of ['eski', 'yeni', 'yeni-uzak']) {
    $('durum').textContent = `Ölçülüyor: ${mod} ev × ${n}…`;
    await bekle(150);
    sonuc.push(await olc(mod, n));
  }
  const rapor = { tarih: new Date().toISOString(), gpu, yazilimCizimi: yazilim, ekran: `${innerWidth}×${innerHeight}`, pikselOrani: pr, golge, tarayici: navigator.userAgent, sure_ms: SURE, sonuc };
  window.__rapor = rapor;
  const satir = (r) => `<tr><td>${r.mod} ×${r.n}</td><td>${r.fps}</td><td>${r.ortMs}/${r.p95Ms}</td><td>${r.cagri}</td><td>${(r.ucgen / 1000).toFixed(0)}k</td><td>${r.kurMs}</td></tr>`;
  $('durum').innerHTML = (yazilim ? '<b class="uyari">⚠ Yazılım çizimi algılandı (' + gpu + '): bu sayılar GPU\'lu telefonu temsil etmez.</b><br>' : '') + `GPU: ${gpu}<br>Ekran ${rapor.ekran} @${pr}x`;
  $('cikti').innerHTML = `<table><tr><th>model</th><th>fps</th><th>ort/p95 ms</th><th>çağrı</th><th>üçgen</th><th>kurulum ms</th></tr>${sonuc.map(satir).join('')}</table>
  <p class="soluk">fps ekran yenileme hızıyla (çoğu telefonda 60) sınırlıdır; 'ort ms' 16,7'nin altındaysa kare bütçesi içindesin. p95 yüksekse takılma var.</p>
  <button id="kopya">Sonucu kopyala</button><button id="tekrar">Tekrar ölç</button>
  <textarea id="json" readonly>${JSON.stringify(rapor)}</textarea>`;
  $('kopya').onclick = async () => { try { await navigator.clipboard.writeText(JSON.stringify(rapor)); $('kopya').textContent = 'Kopyalandı ✔'; } catch { $('json').select(); document.execCommand('copy'); } };
  $('tekrar').onclick = () => location.reload();
}
$('cikti').innerHTML = '<button id="basla">Ölçümü başlat</button><div class="soluk">Yaklaşık 30 sn sürer. Pili tam doldur, güç tasarrufu modunu kapat.</div>';
$('basla').onclick = kos;
if (q.get('oto') === '1') kos();
