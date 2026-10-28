// İzometrik ortografik sahne: harita, binalar, sınır çizgisi, seçim/önizleme işaretleri, kamera ve dokunma/fare girişi.
// Çekirdeği yalnız okur; durumu değiştirmez. Dışarıya: onTik(x, y), onUzerinde(x, y).
import * as THREE from 'three';
import { BINALAR } from '../data/binalar.js';
import { izgara } from '../world/izgara.js';
import { merkezNokta, sinirYaricapi } from '../world/harita.js';
import { takvim } from '../core/takvim.js';
import { binaIsi, binaCalisir } from '../core/yardimci.js';
import { HaritaCizim, MEVSIM_STIL } from './harita.js';
import { binaModeli, modeliTemizle } from './binalar.js';
import { KoyCizim } from './koy.js';
import { ORTAK } from './malzeme.js';
import { stilKur } from './stil.js';
import { baglantiMaskeleri } from '../world/cevre.js';
import { SavasSahnesi } from './savas.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const ZOOM_MIN = 0.55, ZOOM_MAX = 3.4, YARIM_YUKSEKLIK = 8.5, ZEMIN_Y = 0.3;
const ROZET_V = new THREE.Vector3();
const OFSET = new THREE.Vector3(1, 1, 1).multiplyScalar(40);

export class Sahne {
  constructor(kap) {
    this.kap = kap;
    this.onTik = null;
    this.onUzerinde = null;
    this.kirli = true;
    this.n = 64;
    this.hedef = new THREE.Vector3(32, 0, 32);
    this.durum = null;
    this.anahtarlar = {};

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // gölge haritası yalnız sahne/kamera değişince (animasyon karelerinde değil)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.canvas = this.renderer.domElement;
    this.canvas.style.display = 'block';
    this.canvas.style.touchAction = 'none';
    kap.appendChild(this.canvas);

    this.sahne = new THREE.Scene();
    this.sahne.background = new THREE.Color(0x2c313a);
    this.sahne.fog = new THREE.Fog(0x2c313a, 72, 125); // izometrik derinlik pusu (ekranın üstü hafif soluk)
    this.kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
    this.kamera.zoom = 1.6;

    this.gunes = new THREE.DirectionalLight(0xfff2dd, 2.5);
    this.gunes.castShadow = true;
    const g = this.gunes.shadow;
    g.mapSize.set(2048, 2048);
    g.camera.left = -24; g.camera.right = 24; g.camera.top = 24; g.camera.bottom = -24;
    g.camera.near = 1; g.camera.far = 120;
    g.bias = -0.0006; g.normalBias = 0.03;
    this.sahne.add(this.gunes, this.gunes.target);
    this.hemi = new THREE.HemisphereLight(0xcfe2ff, 0x7a6a48, 1.05);
    this.sahne.add(this.hemi);
    // karşı ışık (gölge yok): siluetleri arka plandan ayırır
    this.arka = new THREE.DirectionalLight(0xbcd0ff, 0.45);
    this.arka.position.set(30, 20, -30);
    this.sahne.add(this.arka);
    this.stil = stilKur(this); // varsayılan bd son işlemesi; ?stil=eski ya da WebGL2 yoksa / hata varsa null (eski görünüm)

    this.haritaGrup = new THREE.Group();
    this.binaGrup = new THREE.Group();
    this.isaretGrup = new THREE.Group();
    this.sahne.add(this.haritaGrup, this.binaGrup, this.isaretGrup);
    this.harita = new HaritaCizim(this.haritaGrup);
    this.koyGrup = new THREE.Group();
    this.sahne.add(this.koyGrup);
    this.koy = new KoyCizim(this.koyGrup);
    this.binaModelleri = [];

    this.isaretleriKur();
    this.girisKur();
    this.ro = new ResizeObserver(() => this.boyutla());
    this.ro.observe(kap);
    addEventListener('resize', () => this.boyutla());
    addEventListener('orientationchange', () => setTimeout(() => this.boyutla(), 200));
    this.boyutla();
    this.kameraGuncelle();
  }

  // ---------- işaretler ----------
  isaretleriKur() {
    const kare = (renk, saydam) => {
      const grup = new THREE.Group();
      const dolgu = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: saydam, depthTest: false, depthWrite: false }),
      );
      const cizgi = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]].map((p) => new THREE.Vector3(...p))),
        new THREE.LineBasicMaterial({ color: renk, depthTest: false, transparent: true }),
      );
      dolgu.renderOrder = 10; cizgi.renderOrder = 11;
      grup.add(dolgu, cizgi);
      grup.visible = false;
      grup.userData = { dolgu, cizgi };
      return grup;
    };
    this.secimIsareti = kare(0xffd34d, 0.16);
    const halka = new THREE.Mesh(
      new THREE.RingGeometry(0.56, 0.66, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    halka.renderOrder = 12;
    halka.position.y = -0.3;
    this.secimIsareti.add(halka);
    this.secimIsareti.userData.halka = halka;
    this.onizlemeIsareti = kare(0x4cd964, 0.35);
    this.hayaletGrup = new THREE.Group();
    this.hayaletGrup.visible = false;
    this.uygunMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.84, 0.84).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4cd964, transparent: true, opacity: 0.25, depthTest: false, depthWrite: false }),
      2500,
    );
    this.uygunMesh.count = 0;
    this.uygunMesh.renderOrder = 9;
    this.uygunMesh.frustumCulled = false;
    this.sinirCizgi = null;
    this.isaretGrup.add(this.uygunMesh, this.secimIsareti, this.onizlemeIsareti, this.hayaletGrup);
  }

  isaretKonumla(isaret, x, y, g, h) {
    isaret.position.set(x + g / 2, 0.62, y + h / 2);
    isaret.scale.set(g, 1, h);
    isaret.visible = true;
  }

  secim(s) {
    if (!s) this.secimIsareti.visible = false;
    else if (s.tip === 'bina') {
      const [g, h] = BINA[s.bina.id].boyut;
      this.isaretKonumla(this.secimIsareti, s.bina.x, s.bina.y, g, h);
    } else this.isaretKonumla(this.secimIsareti, s.x, s.y, 1, 1);
    this.kirli = true;
  }

  // Sürükleyerek çit/sur çizme önizlemesi. hucreler: [[x, y, hata?]]; null = temizle. Mevcut çevre parçalarıyla bağlanır.
  cizimOnizleme(binaId, hucreler) {
    if (!this.cizimGrup) { this.cizimGrup = new THREE.Group(); this.cizimGrup.renderOrder = 12; this.isaretGrup.add(this.cizimGrup); }
    modeliTemizle(this.cizimGrup);
    this.kirli = true;
    if (!hucreler || !hucreler.length) return;
    const d = this.durum;
    const mevcut = d ? d.binalar.filter((b) => BINA[b.id].cevre).map((b) => [b.x, b.y]) : [];
    const maske = baglantiMaskeleri([...mevcut, ...hucreler.map(([x, y]) => [x, y])]);
    for (const [x, y, hata] of hucreler) {
      const renk = hata ? 0xe0443a : 0x4cd964;
      const model = binaModeli({ id: binaId, seviye: 1 }, {}, { hayalet: renk, bag: maske.get(`${x},${y}`) });
      model.position.set(x + 0.5, 0, y + 0.5);
      this.cizimGrup.add(model);
    }
  }

  // Çizim kipi: tek parmak sürükleme kamerayı kaydırmaz, onCizim(x, y, 'basla'|'surukle'|'bitir') çağrılır (iki parmak yine kaydırır).
  cizimKipi(acik) { this.cizimAktif = !!acik; }

  // m: { binaId, x, y, hata } | null
  yerlestirme(m) {
    modeliTemizle(this.hayaletGrup);
    if (!m) {
      this.cizimKipi(false);
      this.cizimOnizleme(null);
      this.onizlemeIsareti.visible = false;
      this.hayaletGrup.visible = false;
      this.uygunMesh.count = 0;
      this.kirli = true;
      return;
    }
    const [g, h] = BINA[m.binaId].boyut;
    const renk = m.hata ? 0xe0443a : 0x4cd964;
    const { dolgu, cizgi } = this.onizlemeIsareti.userData;
    dolgu.material.color.setHex(renk); cizgi.material.color.setHex(renk);
    this.isaretKonumla(this.onizlemeIsareti, m.x, m.y, g, h);
    const model = binaModeli({ id: m.binaId, seviye: 1 }, {}, { hayalet: renk });
    this.hayaletGrup.add(model);
    this.hayaletGrup.position.set(m.x + g / 2, 0, m.y + h / 2);
    this.hayaletGrup.visible = true;
    this.kirli = true;
  }

  uygunIsaretleri(liste, g = 1, h = 1) {
    const m4 = new THREE.Matrix4();
    const adet = Math.min(liste.length, 2500);
    for (let i = 0; i < adet; i++) {
      m4.setPosition(liste[i][0] + g / 2, 0.6, liste[i][1] + h / 2);
      this.uygunMesh.setMatrixAt(i, m4);
    }
    this.uygunMesh.count = adet;
    this.uygunMesh.instanceMatrix.needsUpdate = true;
    this.kirli = true;
  }

  // ---------- durum ----------
  guncelle(d) {
    this.durum = d;
    this.n = d.harita.boyut;
    const ms = takvim(d.tur).mevsim;
    if (this.mevsimId !== ms) {
      this.mevsimId = ms;
      const s = MEVSIM_STIL[ms];
      this.gunes.color.setHex(s.isik); this.gunes.intensity = s.siddet; this.hemi.intensity = s.ortam;
      this.hemi.color.setHex(s.gok); this.hemi.groundColor.setHex(s.yer);
      this.harita.mevsimAyarla(ms);
      this.koy.mevsim(ms);
      const arka = new THREE.Color(s.sis).multiplyScalar(0.42);
      this.sahne.background.copy(arka); this.sahne.fog.color.copy(arka).lerp(new THREE.Color(s.sis), 0.5);
    }
    this.harita.guncelle(d);

    const kapali = d.istatistik?.sonTur?.kapali || [];
    const bAnahtar = JSON.stringify([d.binalar, d.insaatSirasi, d.cag, kapali]);
    const kAnahtar = JSON.stringify([d.atama, d.nufus, d.degistiriciler?.length]);
    if (bAnahtar !== this.anahtarlar.bina) {
      this.anahtarlar.bina = bAnahtar;
      for (const c of [...this.binaGrup.children]) { modeliTemizle(c); this.binaGrup.remove(c); }
      this.binaModelleri = [];
      const maske = baglantiMaskeleri(d.binalar.filter((b) => BINA[b.id].cevre).map((b) => [b.x, b.y]));
      for (const b of d.binalar) {
        const t = BINA[b.id];
        const isi = binaIsi(d, b);
        const model = binaModeli(b, {
          insa: isi === 'insa' ? 1 - b.insaKalan / Math.max(1, t.insaSuresi) : null,
          hasarli: b.hasarli, isi, kapali: isi !== 'insa' && !b.hasarli && kapali.includes(b.uid),
          bag: t.cevre ? maske.get(`${b.x},${b.y}`) : 0,
        });
        model.position.set(b.x + t.boyut[0] / 2, 0, b.y + t.boyut[1] / 2);
        // çeşitlilik: kapı her zaman kameraya bakan iki yüzden birinde (+z / +x); çevre parçaları döndürülmez (kollar eksene hizalı)
        if (t.tur !== 'merkez' && !t.cevre && ((b.x * 7 + b.y * 13) & 1)) model.rotation.y = Math.PI / 2;
        this.binaGrup.add(model);
        this.binaModelleri.push({ b, model });
      }
      this.koy.binalar(d, this.binaModelleri);
      this.anahtarlar.koy = kAnahtar;
    } else if (kAnahtar !== this.anahtarlar.koy) {
      this.anahtarlar.koy = kAnahtar;
      this.koy.figurKur(d);
    }
    const sAnahtar = `${d.cag}|${d.binalar.find((b) => BINA[b.id].tur === 'merkez')?.x}`;
    if (sAnahtar !== this.anahtarlar.sinir) {
      this.anahtarlar.sinir = sAnahtar;
      if (this.sinirCizgi) { this.isaretGrup.remove(this.sinirCizgi); this.sinirCizgi.geometry.dispose(); }
      const m = merkezNokta(d), r = sinirYaricapi(d);
      const pts = [];
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        pts.push(new THREE.Vector3(m.x + Math.cos(a) * r, 0.7, m.y + Math.sin(a) * r));
      }
      this.sinirCizgi = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xf2c14e, transparent: true, opacity: 0.8, depthTest: false }),
      );
      this.sinirCizgi.renderOrder = 8;
      this.isaretGrup.add(this.sinirCizgi);
    }
    this.kirli = true;
  }

  // Bina uid ya da hücre için seçim kolaylığı: hücredeki bina (yoksa null).
  hucredekiBina(x, y) {
    const d = this.durum;
    if (!d) return null;
    const uid = izgara(d)[y * d.harita.boyut + x];
    return uid ? d.binalar.find((b) => b.uid === uid) : null;
  }

  // Grafik kalitesi ('yuksek' | 'standart' | 'performans'; Ayarlar'dan). Yalnız bd stilinde (varsayılan) görünümü değiştirir.
  kaliteAyarla(seviye) {
    this.kalite = seviye;
    this.stil?.kaliteAyarla?.(seviye);
    this.kirli = true;
  }

  odakla(x, y) {
    this.hedef.set(x, 0, y);
    this.kameraGuncelle();
  }

  // ---------- görsel savaş (docs/SAVAS.md §7): ayrı küçük sahne; açıkken köy sahnesi çizilmez ----------
  // liste = çekirdek `savasOlayListesi(girdi)` (ya da `savasBaslat`/`savasIzle` sonucu `.liste`).
  // sec: { hiz: 1|2, atla, hud (varsayılan true: yerleşik HUD), arayuzGizle (varsayılan true), mevsim, onBitti(ozet), onKapat() }.
  savasOynat(liste, sec = {}) {
    if (!this.savas) this.savas = new SavasSahnesi(this);
    return this.savas.oynat(liste, sec);
  }
  savasAtla() { this.savas?.atla(); }
  savasHiz(h) { this.savas?.hizAyarla(h); }
  savasSar(sn) { this.savas?.sar(sn); }        // test: verilen saniyede dondurur (giriş dahil)
  savasDevam() { if (this.savas) this.savas.durdu = false; }
  savasKapat() { this.savas?.kapat(); }
  savasBilgi() { return this.savas ? this.savas.bilgi() : { aktif: false }; }

  // ---------- kamera ----------
  boyutla() {
    const g = this.kap.clientWidth || innerWidth, y = this.kap.clientHeight || innerHeight;
    const oran = g / y;
    Object.assign(this.kamera, {
      left: -YARIM_YUKSEKLIK * oran, right: YARIM_YUKSEKLIK * oran, top: YARIM_YUKSEKLIK, bottom: -YARIM_YUKSEKLIK,
    });
    this.kamera.updateProjectionMatrix();
    this.renderer.setSize(g, y);
    this.stil?.boyut();
    this.savas?.boyut();
    this.kirli = true;
  }

  kameraGuncelle() {
    this.hedef.x = Math.min(this.n, Math.max(0, this.hedef.x));
    this.hedef.z = Math.min(this.n, Math.max(0, this.hedef.z));
    this.kamera.position.copy(this.hedef).add(OFSET);
    this.kamera.lookAt(this.hedef);
    this.kamera.updateMatrixWorld(true);
    this.gunes.position.set(this.hedef.x - 14, 34, this.hedef.z + 8);
    const gk = Math.min(46, Math.max(16, 22 / this.kamera.zoom)), gc = this.gunes.shadow.camera;
    if (Math.abs(gc.right - gk) > 0.5) { gc.left = -gk; gc.right = gk; gc.top = gk; gc.bottom = -gk; gc.updateProjectionMatrix(); }
    this.gunes.target.position.copy(this.hedef);
    this.gunes.target.updateMatrixWorld();
    this.kirli = true;
  }

  ekranZemin(px, py, hedef = new THREE.Vector3()) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.kamera);
    return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -ZEMIN_Y), hedef);
  }

  // Dünya noktası → ekran (px, tuval köşesine göre); arkada/dışarıda ise null. Arayüz rozetleri için salt-okunur.
  ekranNokta(x, yuk, z, hedef = { x: 0, y: 0 }) {
    const g = this.canvas.clientWidth, y = this.canvas.clientHeight;
    const v = ROZET_V.set(x, yuk, z).project(this.kamera);
    hedef.x = (v.x + 1) / 2 * g; hedef.y = (1 - v.y) / 2 * y;
    return hedef;
  }

  hucreBul(px, py) {
    const p = this.ekranZemin(px, py);
    if (!p) return null;
    const x = Math.floor(p.x), y = Math.floor(p.z);
    return x >= 0 && y >= 0 && x < this.n && y < this.n ? { x, y } : null;
  }

  yakinlastir(zoom, px, py) {
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
    const once = this.ekranZemin(px, py);
    this.kamera.zoom = z;
    this.kamera.updateProjectionMatrix();
    this.kamera.updateMatrixWorld(true);
    const sonra = this.ekranZemin(px, py);
    if (once && sonra) this.hedef.add(once.sub(sonra));
    this.kameraGuncelle();
  }

  // ---------- giriş ----------
  girisKur() {
    const c = this.canvas;
    const ptr = new Map();
    let ank = null, surukle = false, iptal = false, pinch0 = null, cizdi = false;
    const orta = () => {
      const p = [...ptr.values()];
      return p.length === 1 ? { x: p[0].x, y: p[0].y } : { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
    };
    c.addEventListener('pointerdown', (e) => {
      try { c.setPointerCapture(e.pointerId); } catch { /* yapay olay */ }
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
      if (ptr.size === 1) { surukle = false; iptal = false; }
      else { iptal = true; pinch0 = { d: Math.hypot(...[...ptr.values()].reduce((a, p, i) => (i ? [a[0] - p.x, a[1] - p.y] : [p.x, p.y]), [])), z: this.kamera.zoom }; }
      const o = orta();
      ank = this.ekranZemin(o.x, o.y);
      if (this.cizimAktif && ptr.size === 1 && this.onCizim) {
        const h = this.hucreBul(e.clientX, e.clientY);
        cizdi = true;
        if (h) this.onCizim(h.x, h.y, 'basla');
      } else if (cizdi && ptr.size > 1) { cizdi = false; this.onCizim?.(0, 0, 'iptal'); }
    });
    c.addEventListener('pointermove', (e) => {
      const p = ptr.get(e.pointerId);
      if (!p) {
        if (e.pointerType === 'mouse' && this.onUzerinde) { const h = this.hucreBul(e.clientX, e.clientY); if (h) this.onUzerinde(h.x, h.y); }
        return;
      }
      p.x = e.clientX; p.y = e.clientY;
      if (cizdi && ptr.size === 1) {
        const h = this.hucreBul(e.clientX, e.clientY);
        if (h) this.onCizim(h.x, h.y, 'surukle');
        return;
      }
      if (ptr.size === 1 && !surukle && Math.hypot(p.x - p.sx, p.y - p.sy) > 7) surukle = true;
      if (ptr.size === 1 && !surukle) return;
      if (ptr.size >= 2 && pinch0) {
        const [a, b] = [...ptr.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const o = orta();
        this.kamera.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinch0.z * (dist / Math.max(1, pinch0.d))));
        this.kamera.updateProjectionMatrix();
        this.kamera.updateMatrixWorld(true);
        const yeni = this.ekranZemin(o.x, o.y);
        if (ank && yeni) this.hedef.add(ank.clone().sub(yeni));
        this.kameraGuncelle();
        return;
      }
      const o = orta();
      const yeni = this.ekranZemin(o.x, o.y);
      if (ank && yeni) this.hedef.add(ank.clone().sub(yeni));
      this.kameraGuncelle();
    });
    const bitir = (e, iptalEt) => {
      const p = ptr.get(e.pointerId);
      if (!p) return;
      ptr.delete(e.pointerId);
      if (cizdi && ptr.size === 0) { cizdi = false; if (!iptalEt) this.onCizim?.(0, 0, 'bitir'); else this.onCizim?.(0, 0, 'iptal'); return; }
      if (ptr.size === 0 && !surukle && !iptal && !iptalEt && this.onTik) {
        const h = this.hucreBul(e.clientX, e.clientY);
        if (h) this.onTik(h.x, h.y);
      }
      if (ptr.size === 1) { const o = orta(); ank = this.ekranZemin(o.x, o.y); pinch0 = null; }
    };
    c.addEventListener('pointerup', (e) => bitir(e, false));
    c.addEventListener('pointercancel', (e) => bitir(e, true));
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.yakinlastir(this.kamera.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Döngü: etkileşimde hemen çizer; ortam animasyonu (duman, ateş, işçi, rüzgâr, su) ~30 fps ile sınırlı.
  baslat() {
    this.saat = new THREE.Clock();
    this.son = 0;
    this.kareSureleri = [];
    const dongu = () => {
      requestAnimationFrame(dongu);
      const t = this.saat.getElapsedTime();
      if (!this.kirli && t - this.son < 1 / 31) return;
      const dt = Math.min(0.1, t - this.son);
      this.son = t;
      if (this.savas?.aktif) {
        const t1 = performance.now();
        this.savas.tik(dt);
        this.renderer.shadowMap.needsUpdate = true;
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.savas.sahne, this.savas.kamera);
        this.kareSureleri.push(performance.now() - t1);
        if (this.kareSureleri.length > 120) this.kareSureleri.shift();
        return;
      }
      if (this.kirli) this.renderer.shadowMap.needsUpdate = true;
      this.kirli = false;
      ORTAK.uZaman.value = t;
      this.koy.tik(dt, t, this.hedef);
      const h = this.secimIsareti.userData.halka;
      if (this.secimIsareti.visible && h) { const p = 1 + Math.sin(t * 4) * 0.05; h.scale.set(p, 1, p); h.material.opacity = 0.65 + Math.sin(t * 4) * 0.2; }
      const t0 = performance.now();
      if (this.stil) {
        try { this.stil.ciz(); } catch (e) { // son işleme çizimi çöktüyse eski görünüme dön
          console.warn('[stil] çizim hatası, eski görünüme dönülüyor:', e?.message || e);
          this.renderer.setRenderTarget(null); this.stil = null; this.renderer.render(this.sahne, this.kamera);
        }
      } else this.renderer.render(this.sahne, this.kamera);
      this.kareSureleri.push(performance.now() - t0);
      try { this.onKare?.(); } catch (e) { console.warn('[onKare]', e?.message || e); }
      if (this.kareSureleri.length > 120) this.kareSureleri.shift();
    };
    dongu();
  }
}
