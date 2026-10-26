// Giriş noktası: sahne + oyun denetçisi + arayüz. Çekirdek ekrandan bağımsızdır; burası yalnız bağlar.
import './ui/arayuz.css';
import { Sahne } from './render/sahne.js';
import { Oyun } from './ui/oyun.js';
import { Arayuz } from './ui/arayuz.js';
import { merkezNokta } from './world/harita.js';

const sahne = new Sahne(document.getElementById('oyun'));
sahne.baslat();
const oyun = new Oyun();
const arayuz = new Arayuz(document.getElementById('arayuz'), oyun, sahne);
window.__oyun = { oyun, arayuz, sahne }; // hata ayıklama / uçtan uca test için
arayuz.menuAcik = true; // açılışta ana menü (Devam / Yeni Oyun)
arayuz.yenile();
oyun.dinle((tip) => {
  if (tip === 'durum' && oyun.durum && !sahne.odaklandi) {
    sahne.odaklandi = true;
    const m = merkezNokta(oyun.durum);
    sahne.odakla(m.x, m.y);
  }
});
