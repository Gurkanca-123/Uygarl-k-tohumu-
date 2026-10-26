// Giriş noktası. İskelet: çekirdek (core) ekrandan bağımsızdır, render onu okur.
import { Sahne } from './render/sahne.js';

const sahne = new Sahne(document.getElementById('oyun'));
sahne.baslat();
