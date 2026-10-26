// İnşa kartları için küçük bina önizlemesi. Tek paylaşılan offscreen renderer; sonuç (id + boyut) önbellekli dataURL.
// Kullanım: img.src = binaOnizleme('cadir', 96). WebGL yoksa '' döner (kart simgesiz kalır).
import * as THREE from 'three';
import { BINALAR } from '../data/binalar.js';
import { binaModeli, modeliTemizle } from './binalar.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const onbellek = new Map();
let r = null; // { renderer, sahne, kamera }
let kurulamadi = false;

function kur() {
  if (r || kurulamadi) return r;
  try {
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const sahne = new THREE.Scene();
    const gunes = new THREE.DirectionalLight(0xffe6c0, 2.6);
    gunes.position.set(-3, 6, 4);
    sahne.add(gunes, new THREE.HemisphereLight(0xd6e4ff, 0x8a6a48, 1.25));
    const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    r = { renderer, sahne, kamera };
  } catch {
    kurulamadi = true;
  }
  return r;
}

/**
 * @param {string} binaId  BINALAR id'si
 * @param {number} [boyutPx=96] kare kenar (CSS px; aygıt piksel oranı en çok 2 ile çarpılır)
 * @returns {string} PNG dataURL ('' = çizilemedi)
 */
export function binaOnizleme(binaId, boyutPx = 96) {
  const anahtar = `${binaId}|${boyutPx}`;
  if (onbellek.has(anahtar)) return onbellek.get(anahtar);
  if (!BINA[binaId] || !kur()) return '';
  const { renderer, sahne, kamera } = r;
  const px = Math.round(boyutPx * Math.min(2, globalThis.devicePixelRatio || 1));
  renderer.setPixelRatio(1);
  renderer.setSize(px, px, false);
  const model = binaModeli({ id: binaId, seviye: 1 }, {}, { onizleme: true });
  sahne.add(model);
  // izometrik bakış, modelin sınırlayıcı küresine sığdır
  const kure = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
  const yon = new THREE.Vector3(1, 0.95, 1).normalize();
  kamera.position.copy(kure.center).addScaledVector(yon, 20);
  kamera.lookAt(kure.center);
  const y = kure.radius * 1.02;
  Object.assign(kamera, { left: -y, right: y, top: y, bottom: -y, near: 0.1, far: 60 });
  kamera.updateProjectionMatrix();
  let url = '';
  try {
    renderer.render(sahne, kamera);
    url = renderer.domElement.toDataURL('image/png');
  } catch { url = ''; }
  sahne.remove(model);
  modeliTemizle(model);
  onbellek.set(anahtar, url);
  return url;
}
