// Tüm veri tablolarını tek nesnede toplar (doğrulama ve çekirdek için).
import { CAGLAR } from './caglar.js';
import { KAYNAKLAR, BILGI } from './kaynaklar.js';
import { KAROLAR } from './karolar.js';
import { BINALAR } from './binalar.js';
import { BULUSLAR } from './buluslar.js';
import { OLAYLAR, OLAY_TURLERI, OLAY_TETIKLERI } from './olaylar.js';
import { EYLEMLER } from './eylemler.js';
import { MEVSIMLER, MEVSIM_ETIKETLERI } from './mevsimler.js';
import * as DENGE from './denge.js';

export const VERI = {
  CAGLAR, KAYNAKLAR, BILGI, KAROLAR, BINALAR, BULUSLAR, OLAYLAR, OLAY_TURLERI, OLAY_TETIKLERI,
  EYLEMLER, MEVSIMLER, MEVSIM_ETIKETLERI, DENGE,
};

export { CAGLAR, KAYNAKLAR, BILGI, KAROLAR, BINALAR, BULUSLAR, OLAYLAR, EYLEMLER, MEVSIMLER, DENGE };
