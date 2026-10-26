// Görsel stil adayları (deneme): `?stil=a|b|c|d`. Parametre yoksa hiçbir şey kurulmaz, varsayılan görünüm aynen kalır.
//  a = Minyatür maket: sıcak renk, yumuşak gölge, ucuz AO, tilt-shift (üst/alt şerit bulanık), vinyet.
//  b = Çizgi film: ışık bantları (4 ton), derinlik + parlaklık tabanlı ince koyu kenar, doygun palet.
//  c = Boyalı illüstrasyon: 4 çeyrekli Kuwahara (16 örnek), fırça sapması, kâğıt dokusu, sıcak/soluk palet.
//  d = Konsept diyorama: altın saat + kenar ışığı, iki ölçekli AO, sıcak parlama, doygun palet; ayrıca `stil_d.js`
//      görsel arazi katmanı (yükseklik alanı, falez, kumsal, derinlik renkli su, yoğun bitki, hayvan, iskele/tekne).
// Hepsi: sahne → çok örnekli HalfFloat hedef (+derinlik dokusu) → tek tam ekran geçiş (ton eşleme + sRGB burada).
// Yakın zoom ayrıntısı (üç stilde): bina malzemesinde doku parlaklığından türetilmiş tümsek (ekran türevli normal sapması)
// + atlas hücresine göre prosedürel tuğla / kiremit / tahta deseni; `kamera.zoom` büyüdükçe güçlenir.
import * as THREE from 'three';
import { binaMat } from './malzeme.js';
import { StilD, kenarIsigi } from './stil_d.js';

export function stilParametresi() {
  try {
    const s = new URLSearchParams(location.search).get('stil');
    return ['a', 'b', 'c', 'd'].includes(s) ? s : null;
  } catch { return null; }
}

export function stilKur(sahne) {
  const kip = stilParametresi();
  return kip ? new Stil(sahne, kip) : null;
}

const STIL_UNIFORM = { uDetay: { value: 0 }, uKip: { value: 0 } };

// ---------- yakın zoom: bina malzemesi yaması ----------
function binaDetayYamasi(kip) {
  const mat = binaMat();
  const once = mat.onBeforeCompile, anahtar = mat.customProgramCacheKey;
  mat.customProgramCacheKey = () => `${anahtar()}|stil${kip}`;
  mat.onBeforeCompile = (sh, r) => {
    once(sh, r);
    Object.assign(sh.uniforms, STIL_UNIFORM);
    let f = sh.fragmentShader;
    f = `uniform float uDetay; uniform float uKip;\nfloat stYuk = 0.0;
float stH3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float stG3(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(stH3(i), stH3(i + vec3(1, 0, 0)), f.x), mix(stH3(i + vec3(0, 1, 0)), stH3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(stH3(i + vec3(0, 0, 1)), stH3(i + vec3(1, 0, 1)), f.x), mix(stH3(i + vec3(0, 1, 1)), stH3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}\n` + f;
    // doku örneğinden yükseklik: parlaklık + hücreye göre prosedürel desen (atlas hücre no: 0..15)
    f = f.replace('diffuseColor *= sampledDiffuseColor;', `diffuseColor *= sampledDiffuseColor;
    {
      // kaba mip'ten parlaklık (ince doku ayrıntısı türevde kumlanmasın) + piksel yoğunluğuna göre sönüm
      vec4 kaba = textureGrad(map, au, dFdx(yu) * 0.25 * 5.0, dFdy(yu) * 0.25 * 5.0);
      float lum = dot(kaba.rgb, vec3(0.3, 0.59, 0.11));
      float yog = length(fwidth(yu));
      float net = (1.0 - smoothstep(0.022, 0.05, yog)) * uDetay;
      float hn = floor(vHucre.x * 4.0 + 0.5) + (3.0 - floor(vHucre.y * 4.0 + 0.5)) * 4.0;
      vec2 t = yu;
      float desen = 0.0;
      if (hn == 5.0 || hn == 6.0) {            // kerpiç / taş blok: sıra kaydırmalı tuğla derzi
        vec2 q = vec2(t.x * 2.0 + 0.5 * floor(t.y * 4.0), t.y * 4.0);
        vec2 e = abs(fract(q) - 0.5);
        desen = -smoothstep(0.36, 0.48, max(e.x * 0.8, e.y));
      } else if (hn == 8.0 || hn == 9.0) {     // kiremit / arduvaz: pul sıraları (alt kenar gölgeli)
        float sira = fract(t.y * 4.0);
        float pul = abs(fract(t.x * 3.0 + 0.5 * floor(t.y * 4.0)) - 0.5);
        desen = smoothstep(0.0, 0.85, sira) - 0.5 - smoothstep(0.40, 0.5, pul) * 0.5;
      } else if (hn == 3.0 || hn == 4.0 || hn == 10.0) { // kütük / tahta / yarı ahşap: ek yeri + yumuşak damar
        desen = sin((t.x + sin(t.y * 5.0) * 0.05) * 18.0) * 0.15 - smoothstep(0.40, 0.5, abs(fract(t.y * 3.0) - 0.5)) * 0.7;
      }
      stYuk = (lum * 0.8 + desen * 0.45) * net;
      // yakında doku/desen kontrastı
      diffuseColor.rgb *= max(0.3, 1.0 + (lum - 0.55) * 0.5 * net + desen * 0.12 * net);
      if (uKip > 2.5) { // d: dünya uzayında boya lekesi + dipte kir (her yakınlıkta)
        float bl = stG3(vDP * 7.0) * 0.65 + stG3(vDP * 23.0) * 0.35;
        diffuseColor.rgb *= 0.88 + 0.24 * bl;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.08, 1.0, 0.86), smoothstep(0.55, 0.8, bl) * 0.5);
        diffuseColor.rgb *= mix(0.86, 1.0, smoothstep(0.3, 0.42, vDP.y));
        // kerpiç / taş kaide üstü: çiğnenmiş toprak avlu (karo biçimli platform hissini kırar)
        if ((hn == 5.0 || hn == 6.0) && vDN.y > 0.9 && vDP.y < 0.355) {
          float kn = stG3(vDP * 3.0);
          vec3 toprak = mix(vec3(0.36, 0.27, 0.16), vec3(0.5, 0.4, 0.26), kn) * (0.9 + 0.2 * bl);
          diffuseColor.rgb = mix(diffuseColor.rgb, toprak, 0.85);
        }
      }
    }`);
    // ekran türevli tümsek (three'nin perturbNormalArb'ı ile aynı)
    f = f.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (uDetay > 0.01) {
    vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
    vec2 dh = vec2(dFdx(stYuk), dFdy(stYuk)) * 1.6;
    vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
    float det = dot(dpx, r1) * faceDirection;
    vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
    normal = normalize(abs(det) * normal - grad);
  }`);
    sh.fragmentShader = f;
  };
  mat.needsUpdate = true;
}

// ---------- son işleme gölgelendiricisi ----------
const ORTAK_GLSL = `
uniform sampler2D tRenk; uniform sampler2D tDerin;
uniform vec2 uPiksel; uniform float uZoom; uniform float uPozlama; uniform float uAralik; uniform float uOran;
varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c) {
  const mat3 IM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c *= uPozlama / 0.6; c = IM * c; c = RRTAndODTFit(c); c = OM * c; return clamp(c, 0.0, 1.0);
}
vec3 srgb(vec3 c) { return mix(pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, c * 12.92, step(c, vec3(0.0031308))); }
vec3 renk(vec2 uv) { return texture2D(tRenk, uv).rgb; }
float derin(vec2 uv) { return texture2D(tDerin, uv).x * uAralik; }   // ortografik: doğrusal, dünya birimi
float parl(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 doygunluk(vec3 c, float s) { return mix(vec3(parl(c)), c, s); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gurultu(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float vinyet(vec2 uv, float k) { vec2 d = (uv - 0.5) * vec2(uOran, 1.0) * 0.9; return 1.0 - k * smoothstep(0.25, 0.85, dot(d, d) * 1.6); }
// ucuz AO: 8 derinlik örneği, kameraya daha yakın komşu = örtme (dünya biriminde menzil sınırlı)
float ao(vec2 uv, float dC, float yar) {
  float o = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398 + 0.39;
    float r = yar * (0.55 + 0.45 * float(i & 1));
    float dS = derin(uv + vec2(cos(a), sin(a)) * r * uPiksel);
    float f = dC - dS;
    o += smoothstep(0.03, 0.35, f) * (1.0 - smoothstep(0.9, 2.2, f));
  }
  return 1.0 - o / 8.0;
}
`;

const PARCA = {
  a: `
void main() {
  float dC = derin(vUv);
  float zk = clamp((uZoom - 1.0) / 2.4, 0.0, 1.0);
  // tilt-shift: odak şeridi ekran ortasında, üst/alt kenara doğru büyüyen 12 örnekli disk bulanıklığı
  float bul = smoothstep(0.16, 0.5, abs(vUv.y - 0.5)) * mix(5.0, 7.5, zk);
  vec3 c = renk(vUv);
  if (bul > 0.3) {
    vec3 t = c; float w = 1.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 2.39996;
      float r = sqrt((float(i) + 0.5) / 12.0) * bul;
      t += renk(vUv + vec2(cos(a), sin(a)) * r * uPiksel); w += 1.0;
    }
    c = t / w;
  }
  c *= mix(0.62, 1.0, ao(vUv, dC, mix(5.0, 11.0, zk)));
  vec3 d = aces(c * vec3(1.03, 1.0, 0.96));
  d = doygunluk(d, 0.97);
  d.g = mix(d.g, (d.r + d.g) * 0.5, 0.12 * smoothstep(0.0, 0.2, d.g - d.b)); // çimeni limondan zeytine
  d = (d - 0.5) * 1.05 + 0.5;               // hafif kontrast
  d = mix(d, d * vec3(1.05, 0.99, 0.92), 4.0 * d * (1.0 - d)); // sıcak orta tonlar
  d *= vinyet(vUv, 0.38);
  gl_FragColor = vec4(srgb(clamp(d, 0.0, 1.0)), 1.0);
}`,
  b: `
void main() {
  float zk = clamp((uZoom - 1.0) / 2.4, 0.0, 1.0);
  float o = mix(1.0, 1.6, zk);
  vec2 px = uPiksel * o;
  vec3 c = renk(vUv);
  float dC = derin(vUv);
  // kenar: 4 komşu derinlik farkı (siluet) + log-parlaklık farkı (iç kıvrımlar, yalnız güçlüyse)
  float dL = derin(vUv - vec2(px.x, 0.0)), dR = derin(vUv + vec2(px.x, 0.0));
  float dD = derin(vUv - vec2(0.0, px.y)), dU = derin(vUv + vec2(0.0, px.y));
  float dd = max(max(abs(dL - dC), abs(dR - dC)), max(abs(dD - dC), abs(dU - dC)));
  float eD = smoothstep(mix(0.22, 0.10, zk), mix(0.40, 0.22, zk), dd);
  float lC = log(parl(c) + 0.02);
  float lX = log(parl(renk(vUv + vec2(px.x, 0.0))) + 0.02) - log(parl(renk(vUv - vec2(px.x, 0.0))) + 0.02);
  float lY = log(parl(renk(vUv + vec2(0.0, px.y))) + 0.02) - log(parl(renk(vUv - vec2(0.0, px.y))) + 0.02);
  float eL = smoothstep(0.75, 1.3, length(vec2(lX, lY)));
  float kenar = max(eD, eL * mix(0.15, 0.5, zk));
  // ışık bantları malzemede (celIsik); burada yalnız doygun palet + hafif düzleştirme
  vec3 d = aces(c);
  d = doygunluk(d, 1.12);
  d = (d - 0.5) * 1.06 + 0.5;
  d.g = mix(d.g, (d.r + d.g) * 0.5, 0.18 * smoothstep(0.0, 0.2, d.g - d.b)); // yeşili limondan uzaklaştır
  d = mix(d, d * d * 0.35 + vec3(0.04, 0.03, 0.05), kenar * 0.9);
  gl_FragColor = vec4(srgb(clamp(d, 0.0, 1.0)), 1.0);
}`,
  c: `
void main() {
  float zk = clamp((uZoom - 1.0) / 2.4, 0.0, 1.0);
  vec2 sp = vUv / uPiksel;
  // fırça sapması: düşük frekanslı gürültüyle örnek noktasını kaydır (kenarlar dalgalı)
  vec2 j = (vec2(gurultu(sp * 0.09), gurultu(sp * 0.09 + 17.3)) - 0.5) * mix(2.2, 3.2, zk);
  vec2 uv = vUv + j * uPiksel;
  // Kuwahara (4 çeyrek × 4 örnek): en düşük değişintili çeyreğin ortalaması
  float r = mix(1.6, 2.8, zk);
  vec3 en = vec3(0.0); float enV = 1e9;
  for (int q = 0; q < 4; q++) {
    vec2 sg = vec2(q == 0 || q == 3 ? -1.0 : 1.0, q < 2 ? -1.0 : 1.0);
    vec3 m = vec3(0.0); float s2 = 0.0;
    for (int k = 0; k < 4; k++) {
      vec2 o = vec2(float(k & 1), float(k >> 1)) * r + 0.5;
      vec3 c = aces(renk(uv + sg * o * uPiksel));
      m += c; s2 += dot(c, c);
    }
    m *= 0.25;
    float v = s2 * 0.25 - dot(m, m);
    if (v < enV) { enV = v; en = m; }
  }
  vec3 d = en;
  // pigment birikimi: derinlik kenarında hafif koyulaşma
  float dC = derin(vUv);
  float dd = abs(derin(vUv + vec2(uPiksel.x * 1.5, 0.0)) - dC) + abs(derin(vUv + vec2(0.0, uPiksel.y * 1.5)) - dC);
  d *= 1.0 - 0.18 * smoothstep(0.12, 0.5, dd);
  // palet: sıcak, doygunluğu azaltılmış; gölgeler kahveye, ışıklar kremaya
  d = doygunluk(d, 0.86);
  d = (d - 0.45) * 1.14 + 0.45;
  float L = parl(d);
  d = mix(d, d * vec3(1.06, 0.98, 0.86), 0.6);
  d = mix(vec3(0.10, 0.07, 0.05) + d * 0.92, d, smoothstep(0.0, 0.5, L));
  // kâğıt: lif gürültüsü + çapraz fırça izi
  float kagit = gurultu(sp * 0.35) * 0.5 + gurultu(sp * 0.9) * 0.3 + gurultu(sp * 2.7) * 0.2;
  vec2 rp = mat2(0.8, -0.6, 0.6, 0.8) * sp;
  float firca = gurultu(rp * vec2(0.035, 0.45));
  d *= 0.88 + 0.16 * kagit;
  d *= 0.92 + 0.12 * firca;
  d = mix(d, vec3(0.96, 0.92, 0.84), 0.04);
  d *= vinyet(vUv, 0.22);
  gl_FragColor = vec4(srgb(clamp(d, 0.0, 1.0)), 1.0);
}`,
  d: `
void main() {
  float zk = clamp((uZoom - 1.0) / 2.4, 0.0, 1.0);
  float dC = derin(vUv);
  vec3 c = renk(vUv);
  // iki ölçekli AO: bina dipleri / ağaç altları güçlü ve yumuşak
  float a1 = ao(vUv, dC, mix(4.0, 9.0, zk) * (0.6 + 0.4 * uZoom));
  float a2 = ao(vUv, dC, mix(9.0, 16.0, zk) * (0.6 + 0.4 * uZoom));
  c *= mix(0.58, 1.0, a1 * 0.6 + a2 * 0.4);
  // sıcak parlama: parlak bölgelerden 12 örnekli disk
  vec3 bl = vec3(0.0);
  float br = mix(7.0, 13.0, zk);
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 2.39996;
    float r = sqrt((float(i) + 0.5) / 12.0) * br;
    vec3 s = renk(vUv + vec2(cos(a), sin(a)) * r * uPiksel);
    bl += s * smoothstep(1.0, 2.2, parl(s));
  }
  bl /= 12.0;
  vec3 d = aces((c * 1.06 + bl * vec3(1.0, 0.78, 0.5) * 0.55) * vec3(1.03, 1.0, 0.95));
  d = doygunluk(d, 1.08);
  float L = parl(d);
  d = mix(d * vec3(0.92, 0.98, 1.08), d * vec3(1.04, 1.0, 0.93), smoothstep(0.12, 0.65, L)); // serin gölge, sıcak ışık
  d = (d - 0.5) * 1.08 + 0.5;
  d *= vinyet(vUv, 0.26);
  gl_FragColor = vec4(srgb(clamp(d, 0.0, 1.0)), 1.0);
}`,
};

// Çizgi film: Lambert ışığını malzemede bantla (3 ışık + 1 gölge tonu) ve gölge kenarını keskinleştir.
// Ön-derleme ShaderChunk değişikliği: yalnız ?stil=b'de, ilk derlemeden önce; ek çizim geçişi yok.
function celIsik() {
  const C = THREE.ShaderChunk;
  const a = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
  C.lights_lambert_pars_fragment = C.lights_lambert_pars_fragment.replace(a, `${a}
	dotNL = 0.42 * smoothstep( 0.02, 0.10, dotNL ) + 0.33 * smoothstep( 0.36, 0.44, dotNL ) + 0.25 * smoothstep( 0.74, 0.80, dotNL );`);
  C.lights_fragment_begin = C.lights_fragment_begin.replace(
    /\? getShadow\( directionalShadowMap\[ i \], ([^;]*?)\) : 1\.0;/,
    '? smoothstep( 0.3, 0.6, getShadow( directionalShadowMap[ i ], $1) ) : 1.0;');
}

export class Stil {
  constructor(sahne, kip) {
    this.s = sahne;
    this.kip = kip;
    const r = sahne.renderer;
    if (kip === 'a') { // yumuşak gölge: PCF + geniş yarıçap (PCFSoft yarıçapı yok sayar)
      r.shadowMap.type = THREE.PCFShadowMap;
      sahne.gunes.shadow.radius = 4;
      sahne.gunes.shadow.mapSize.set(1536, 1536);
    }
    if (kip === 'b') celIsik();
    if (kip === 'd') {
      r.shadowMap.type = THREE.PCFShadowMap;
      sahne.gunes.shadow.radius = 3;
      sahne.gunes.shadow.mapSize.set(2048, 2048);
      sahne.gunes.shadow.normalBias = 0.04;
      kenarIsigi();
      STIL_UNIFORM.uKip.value = 3;
      this.d = new StilD(sahne);
    }
    binaDetayYamasi(kip);
    this.hedef = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, samples: r.capabilities.isWebGL2 ? 4 : 0,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType),
    });
    this.hedef.depthTexture.format = THREE.DepthFormat;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tRenk: { value: this.hedef.texture }, tDerin: { value: this.hedef.depthTexture },
        uPiksel: { value: new THREE.Vector2() }, uZoom: { value: 1 }, uPozlama: { value: 1 },
        uAralik: { value: 1 }, uOran: { value: 1 },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: ORTAK_GLSL + PARCA[kip],
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.dortgen = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.dortgen.frustumCulled = false;
    this.postSahne = new THREE.Scene();
    this.postSahne.add(this.dortgen);
    this.postKamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.boyut();
  }

  boyut() {
    const v = this.s.renderer.getDrawingBufferSize(new THREE.Vector2());
    const g = Math.max(1, v.x), y = Math.max(1, v.y);
    this.hedef.setSize(g, y);
    this.mat.uniforms.uPiksel.value.set(1 / g, 1 / y);
    this.mat.uniforms.uOran.value = g / y;
  }

  ciz() {
    const { renderer: r, sahne, kamera } = this.s;
    const u = this.mat.uniforms;
    u.uZoom.value = kamera.zoom;
    u.uPozlama.value = r.toneMappingExposure;
    u.uAralik.value = kamera.far - kamera.near;
    STIL_UNIFORM.uDetay.value = Math.min(1, Math.max(0, (kamera.zoom - 1.4) / 1.8));
    this.d?.tik();
    r.setRenderTarget(this.hedef);
    r.render(sahne, kamera);
    this.bilgi = { cagri: r.info.render.calls, ucgen: r.info.render.triangles };
    r.setRenderTarget(null);
    r.render(this.postSahne, this.postKamera);
  }
}
