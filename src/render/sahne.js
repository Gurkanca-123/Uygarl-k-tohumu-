import * as THREE from 'three';

// İzometrik sabit kameralı temel sahne (yer tutucu zemin).
export class Sahne {
  constructor(kap) {
    this.kap = kap;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    kap.appendChild(this.renderer.domElement);

    this.sahne = new THREE.Scene();
    this.sahne.background = new THREE.Color(0x14110d);
    this.kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.kamera.position.set(20, 20, 20);
    this.kamera.lookAt(0, 0, 0);

    const gunes = new THREE.DirectionalLight(0xffffff, 2.2);
    gunes.position.set(15, 30, 10);
    gunes.castShadow = true;
    this.sahne.add(gunes, new THREE.AmbientLight(0x8890a0, 0.8));

    const zemin = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x5f7a3a }),
    );
    zemin.position.y = -0.25;
    zemin.receiveShadow = true;
    this.sahne.add(zemin);

    addEventListener('resize', () => this.boyutla());
    this.boyutla();
  }

  boyutla() {
    const g = this.kap.clientWidth, y = this.kap.clientHeight, olcek = 12;
    const oran = g / y;
    Object.assign(this.kamera, { left: -olcek * oran, right: olcek * oran, top: olcek, bottom: -olcek });
    this.kamera.updateProjectionMatrix();
    this.renderer.setSize(g, y);
  }

  baslat() {
    const dongu = () => { this.renderer.render(this.sahne, this.kamera); requestAnimationFrame(dongu); };
    dongu();
  }
}
