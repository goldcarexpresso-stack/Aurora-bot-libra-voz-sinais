// Gráficos do Painel do Dono — sem biblioteca externa, só SVG.
// Funciona com toque e mouse: arrastar o dedo sobre o gráfico mostra o valor de cada ponto.

const NS = 'http://www.w3.org/2000/svg';
const W = 340;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const nf = n => Number(n || 0).toLocaleString('pt-BR');

// Arredonda o topo da escala para um número "bonito" (5, 10, 20, 50...)
function topoBonito(max) {
  if (max <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  const f = max / p;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return n * p;
}

function esqueleto(el) {
  el.classList.add('gf');
  el.innerHTML = '<div class="gf-tip" hidden></div>';
  return el.querySelector('.gf-tip');
}

function mostrarTip(el, tip, xPct, yPct, html) {
  tip.hidden = false;
  tip.innerHTML = html;
  tip.style.left = xPct + '%';
  tip.style.top = yPct + '%';
  const meio = xPct < 22 ? 'esq' : xPct > 78 ? 'dir' : 'meio';
  tip.dataset.lado = meio;
}

function linhaTip(nome, cor, valor) {
  return '<div><i style="background:' + cor + '"></i>' + esc(nome) + ' <b>' + nf(valor) + '</b></div>';
}

// ---------- BARRAS (uma ou várias séries) ----------
export function barras(el, { labels, series, altura = 170, vazio = 'Sem dados ainda' }) {
  const tip = esqueleto(el);
  const n = labels.length;
  const H = altura, ML = 26, MR = 6, MT = 12, MB = 24;
  const iw = W - ML - MR, ih = H - MT - MB;
  const max = Math.max(0, ...series.flatMap(s => s.valores));
  if (!n || max === 0) {
    el.insertAdjacentHTML('afterbegin', '<div class="gf-vazio" style="height:' + H + 'px">' + esc(vazio) + '</div>');
    return;
  }
  const topo = topoBonito(max);
  const passo = iw / n;
  const grupo = passo * 0.72;
  const bw = grupo / series.length;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="gf-svg" role="img"><defs>';
  series.forEach((s, k) => { svg += '<linearGradient id="gb' + k + el.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.cor + '"/><stop offset="1" stop-color="' + s.cor + '" stop-opacity=".45"/></linearGradient>'; });
  svg += '</defs>';
  [0, .5, 1].forEach(f => {
    const y = MT + ih - f * ih;
    svg += '<line x1="' + ML + '" x2="' + (W - MR) + '" y1="' + y + '" y2="' + y + '" class="gf-grade"/><text x="' + (ML - 5) + '" y="' + (y + 3) + '" class="gf-eixo" text-anchor="end">' + nf(Math.round(topo * f)) + '</text>';
  });
  const cada = n > 24 ? 4 : n > 14 ? 3 : n > 8 ? 2 : 1;
  labels.forEach((lb, i) => {
    const x0 = ML + i * passo + (passo - grupo) / 2;
    svg += '<rect class="gf-hit" data-i="' + i + '" x="' + (ML + i * passo) + '" y="' + MT + '" width="' + passo + '" height="' + ih + '" fill="transparent"/>';
    series.forEach((s, k) => {
      const h = Math.max(s.valores[i] > 0 ? 2 : 0, (s.valores[i] / topo) * ih);
      svg += '<rect class="gf-bar" data-i="' + i + '" x="' + (x0 + k * bw + 0.5) + '" y="' + (MT + ih - h) + '" width="' + Math.max(2, bw - 1.5) + '" height="' + h + '" rx="' + Math.min(4, bw / 2) + '" fill="url(#gb' + k + el.id + ')" style="transform-origin:0 ' + (MT + ih) + 'px;animation-delay:' + Math.min(i * 18, 400) + 'ms"/>';
    });
    if ((n - 1 - i) % cada === 0) svg += '<text x="' + (ML + i * passo + passo / 2) + '" y="' + (H - 7) + '" class="gf-eixo" text-anchor="middle">' + esc(lb.curto || lb) + '</text>';
  });
  svg += '</svg>';
  el.insertAdjacentHTML('afterbegin', svg);
  const sv = el.querySelector('svg');
  const sel = i => {
    el.querySelectorAll('.gf-bar').forEach(b => b.classList.toggle('dim', b.dataset.i !== String(i)));
    const xPct = ((ML + i * passo + passo / 2) / W) * 100;
    const topV = Math.max(...series.map(s => s.valores[i]));
    const yPct = ((MT + ih - (topV / topo) * ih) / H) * 100;
    mostrarTip(el, tip, xPct, Math.max(8, yPct), '<b>' + esc(labels[i].longo || labels[i]) + '</b>' + series.map(s => linhaTip(s.nome, s.cor, s.valores[i])).join(''));
  };
  const limpar = () => { el.querySelectorAll('.gf-bar').forEach(b => b.classList.remove('dim')); tip.hidden = true; };
  const mover = e => {
    const r = sv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const i = Math.floor((x - ML) / passo);
    if (i >= 0 && i < n) sel(i);
  };
  sv.addEventListener('pointerdown', mover);
  sv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure) mover(e); });
  sv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') limpar(); });
  if (el._gfDoc) document.removeEventListener('pointerdown', el._gfDoc);
  el._gfDoc = e => { if (!el.contains(e.target)) limpar(); };
  document.addEventListener('pointerdown', el._gfDoc, { passive: true });
  // mostra o último ponto logo de início
  sel(n - 1);
  tip.hidden = false;
}

// ---------- LINHA / ÁREA ----------
export function linha(el, { labels, series, altura = 170, area = true, vazio = 'Sem dados ainda' }) {
  const tip = esqueleto(el);
  const n = labels.length;
  const H = altura, ML = 26, MR = 10, MT = 14, MB = 24;
  const iw = W - ML - MR, ih = H - MT - MB;
  const max = Math.max(0, ...series.flatMap(s => s.valores));
  if (n < 2 || max === 0) {
    el.insertAdjacentHTML('afterbegin', '<div class="gf-vazio" style="height:' + H + 'px">' + esc(vazio) + '</div>');
    return;
  }
  const topo = topoBonito(max);
  const X = i => ML + (i / (n - 1)) * iw;
  const Y = v => MT + ih - (v / topo) * ih;
  const caminho = vals => {
    let d = 'M' + X(0) + ' ' + Y(vals[0]);
    for (let i = 1; i < n; i++) {
      const mx = (X(i - 1) + X(i)) / 2;
      d += ' C' + mx + ' ' + Y(vals[i - 1]) + ' ' + mx + ' ' + Y(vals[i]) + ' ' + X(i) + ' ' + Y(vals[i]);
    }
    return d;
  };
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="gf-svg" role="img"><defs>';
  series.forEach((s, k) => { svg += '<linearGradient id="gl' + k + el.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + s.cor + '" stop-opacity=".42"/><stop offset="1" stop-color="' + s.cor + '" stop-opacity="0"/></linearGradient>'; });
  svg += '</defs>';
  [0, .5, 1].forEach(f => {
    const y = MT + ih - f * ih;
    svg += '<line x1="' + ML + '" x2="' + (W - MR) + '" y1="' + y + '" y2="' + y + '" class="gf-grade"/><text x="' + (ML - 5) + '" y="' + (y + 3) + '" class="gf-eixo" text-anchor="end">' + nf(Math.round(topo * f)) + '</text>';
  });
  series.forEach((s, k) => {
    const d = caminho(s.valores);
    if (area) svg += '<path d="' + d + ' L' + X(n - 1) + ' ' + (MT + ih) + ' L' + X(0) + ' ' + (MT + ih) + ' Z" fill="url(#gl' + k + el.id + ')" class="gf-area"/>';
    svg += '<path d="' + d + '" fill="none" stroke="' + s.cor + '" stroke-width="2.4" stroke-linecap="round" class="gf-linha" pathLength="1"/>';
  });
  const cada = n > 24 ? Math.ceil(n / 6) : n > 12 ? 3 : n > 7 ? 2 : 1;
  labels.forEach((lb, i) => { if ((n - 1 - i) % cada === 0) svg += '<text x="' + X(i) + '" y="' + (H - 7) + '" class="gf-eixo" text-anchor="' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + esc(lb.curto || lb) + '</text>'; });
  svg += '<line class="gf-guia" x1="0" x2="0" y1="' + MT + '" y2="' + (MT + ih) + '" style="opacity:0"/>';
  series.forEach((s, k) => { svg += '<circle class="gf-ponto" data-k="' + k + '" r="4.5" fill="' + s.cor + '" stroke="#0d1628" stroke-width="2" style="opacity:0"/>'; });
  svg += '</svg>';
  el.insertAdjacentHTML('afterbegin', svg);
  const sv = el.querySelector('svg'), guia = el.querySelector('.gf-guia');
  const sel = i => {
    guia.setAttribute('x1', X(i)); guia.setAttribute('x2', X(i)); guia.style.opacity = 1;
    el.querySelectorAll('.gf-ponto').forEach(p => { const k = +p.dataset.k; p.setAttribute('cx', X(i)); p.setAttribute('cy', Y(series[k].valores[i])); p.style.opacity = 1; });
    const topV = Math.max(...series.map(s => s.valores[i]));
    mostrarTip(el, tip, (X(i) / W) * 100, Math.max(8, (Y(topV) / H) * 100), '<b>' + esc(labels[i].longo || labels[i]) + '</b>' + series.map(s => linhaTip(s.nome, s.cor, s.valores[i])).join(''));
  };
  const mover = e => {
    const r = sv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    sel(Math.max(0, Math.min(n - 1, Math.round(((x - ML) / iw) * (n - 1)))));
  };
  sv.addEventListener('pointerdown', mover);
  sv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure) mover(e); });
  sel(n - 1);
}

// ---------- ROSCA (donut) ----------
export function rosca(el, { fatias, centro = 'Total', aoEscolher, selecionada = -1 }) {
  const tip = esqueleto(el);
  tip.remove();
  const total = fatias.reduce((a, f) => a + f.valor, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  let svg = '<svg viewBox="0 0 140 140" class="gf-rosca" role="img"><circle cx="70" cy="70" r="' + R + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="16"/>';
  if (total > 0) {
    fatias.forEach((f, i) => {
      if (!f.valor) return;
      const len = (f.valor / total) * C;
      const gap = fatias.filter(x => x.valor).length > 1 ? 2 : 0;
      svg += '<circle class="gf-fatia" data-i="' + i + '" cx="70" cy="70" r="' + R + '" fill="none" stroke="' + f.cor + '" stroke-width="16" stroke-dasharray="' + Math.max(0, len - gap) + ' ' + (C - Math.max(0, len - gap)) + '" stroke-dashoffset="' + (-acc) + '" transform="rotate(-90 70 70)"/>';
      acc += len;
    });
  }
  svg += '<text x="70" y="66" text-anchor="middle" class="gf-c1">' + nf(total) + '</text><text x="70" y="82" text-anchor="middle" class="gf-c2">' + esc(centro) + '</text></svg>';
  const leg = '<div class="gf-leg">' + fatias.map((f, i) => '<button type="button" class="gf-li" data-i="' + i + '"><i style="background:' + f.cor + '"></i><span>' + esc(f.nome) + '</span><b>' + nf(f.valor) + '</b><em>' + (total ? Math.round(f.valor / total * 100) : 0) + '%</em></button>').join('') + '</div>';
  el.innerHTML = '<div class="gf-rwrap">' + svg + leg + '</div>';
  const centroSvg = el.querySelector('.gf-c1'), centroTxt = el.querySelector('.gf-c2');
  let atual = -1;
  const marcar = i => {
    atual = i;
    el.querySelectorAll('.gf-fatia').forEach(c => { const on = +c.dataset.i === i; c.classList.toggle('on', on); c.classList.toggle('dim', i >= 0 && !on); });
    el.querySelectorAll('.gf-li').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    if (i >= 0) {
      centroSvg.textContent = nf(fatias[i].valor);
      centroTxt.textContent = fatias[i].nome.length > 16 ? fatias[i].nome.slice(0, 15) + '…' : fatias[i].nome;
    } else { centroSvg.textContent = nf(total); centroTxt.textContent = centro; }
  };
  el.onclick = e => {
    const alvo = e.target.closest('[data-i]');
    if (!alvo || !el.contains(alvo)) return;
    const i = +alvo.dataset.i;
    const novo = atual === i ? -1 : i;
    marcar(novo);
    if (aoEscolher) aoEscolher(novo, novo >= 0 ? fatias[novo] : null);
  };
  if (selecionada >= 0) marcar(selecionada);
}
