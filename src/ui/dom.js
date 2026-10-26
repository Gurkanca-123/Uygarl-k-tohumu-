// Küçük DOM yardımcıları (vanilla). h('div', { class: 'x', onclick: fn }, ...çocuklar)
export function h(etiket, oz = {}, ...cocuklar) {
  const el = document.createElement(etiket);
  for (const [k, v] of Object.entries(oz || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'disabled') el.disabled = true;
    else el.setAttribute(k, v === true ? '' : v);
  }
  ekle(el, cocuklar);
  return el;
}
function ekle(el, cocuklar) {
  for (const c of cocuklar.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export const yuvarla = (v, n = 1) => Math.round(v * 10 ** n) / 10 ** n;
