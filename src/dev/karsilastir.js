// Geliştirici sayfası (yalnız `npm run dev`): eski ve yeni bina modellerini aynı ışık/kamera ile yan yana çizer.
// Adres: /karsilastir.html?hucre=eski,0,1,2,3&bina=yari_ahsap_ev&sv=1&yy=1.05  (hucre: 'eski' ya da mimari varyant indeksi)
// Oyun sahnesiyle aynı: izometrik ortografik kamera (1,1,1), güneş, yarım küre ışığı, ACES, PCF yumuşak gölge.
import * as THREE from 'three';
import { binaModeli, modeliTemizle } from '../render/binalar.js';

const q = new URLSearchParams(location.search);
const hucreler = (q.get('hucre') || 'eski,0,1,2,3').split(',');
const bina = q.get('bina') || 'yari_ahsap_ev';
const sv = Number(q.get('sv') || 1);
const yy = Number(q.get('yy') || 1.05); // kamera yarım yüksekliği (dünya birimi); oyun: 8.5 / zoom
const cy = Number(q.get('cy') || 0.62);

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setClearColor(0x2c313a);
document.body.append(renderer.domElement);
renderer.autoClear = false;

const sahne = new THREE.Scene();
const gunes = new THREE.DirectionalLight(0xfff2dd, 2.5);
gunes.position.set(-14, 34, 8);
gunes.castShadow = true;
gunes.shadow.mapSize.set(2048, 2048);
Object.assign(gunes.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 120 });
gunes.shadow.bias = -0.0006; gunes.shadow.normalBias = 0.03;
sahne.add(gunes, gunes.target);
sahne.add(new THREE.HemisphereLight(0xcfe2ff, 0x7a6a48, 1.05));
const arka = new THREE.DirectionalLight(0xbcd0ff, 0.45); arka.position.set(30, 20, -30); sahne.add(arka);
const zemin = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x5f9a42 }));
zemin.rotation.x = -Math.PI / 2; zemin.position.y = 0.3; zemin.receiveShadow = true;
sahne.add(zemin);

const n = hucreler.length, cw = Math.floor(W / n);
let model = null;
const bilgi = [];
hucreler.forEach((h, i) => {
  if (model) { sahne.remove(model); modeliTemizle(model); }
  const eski = h === 'eski';
  model = binaModeli({ id: bina, seviye: sv, uid: 'x' }, {}, eski ? { mimari: 'eski' } : { mimari: 'yeni', varyant: Number(h) });
  const os = 1.24 + 0.04 * (sv - 1); void os; // ölçek geometriye pişirilmiş
  sahne.add(model);
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let ucgen = 0;
  model.traverse((o) => { if (o.isMesh) ucgen += o.geometry.getAttribute('position').count / 3; });
  bilgi.push({ hucre: h, ucgen });
  const asp = cw / H;
  const kam = new THREE.OrthographicCamera(-yy * asp, yy * asp, yy, -yy, 1, 200);
  kam.position.set(40, 40 + cy, 40); kam.lookAt(0, cy, 0);
  renderer.shadowMap.needsUpdate = true;
  renderer.setViewport(i * cw, 0, cw, H); renderer.setScissor(i * cw, 0, cw, H); renderer.setScissorTest(true);
  renderer.render(sahne, kam);
});
window.__bilgi = bilgi;
window.__hazir = true;
