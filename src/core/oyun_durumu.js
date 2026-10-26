// Simülasyon çekirdeği: sıra tabanlı (tur = gün). DOM/Three.js bilmez.
import { CAGLAR } from '../data/caglar.js';

export function yeniOyun() {
  return { surum: 1, tur: 0, cag: CAGLAR[0].id, kaynaklar: { yiyecek: 10, odun: 5, tas: 0 }, nufus: 3 };
}

export function turIlerlet(durum) {
  return { ...durum, tur: durum.tur + 1 };
}
