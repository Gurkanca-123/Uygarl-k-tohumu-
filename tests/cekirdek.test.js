import test from 'node:test';
import assert from 'node:assert/strict';
import { yeniOyun, turIlerlet } from '../src/core/oyun_durumu.js';

test('yeni oyun Göçebe Çağı ile başlar', () => {
  assert.equal(yeniOyun().cag, 'gocebe');
});

test('tur ilerler, eski durum değişmez', () => {
  const a = yeniOyun();
  const b = turIlerlet(a);
  assert.equal(b.tur, 1);
  assert.equal(a.tur, 0);
});
