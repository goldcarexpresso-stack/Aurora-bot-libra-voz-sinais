import { useEffect, useMemo, useRef, useState } from 'react'
import { barras, linha, rosca } from './graficos.js'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function iso(d) {
  return (
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  )
}

function curto(d) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
}

// Dia no fuso de Brasília, para bater com o que o banco guarda
function diaBR(valor) {
  if (!valor) return null
  if (String(valor).length === 10) return String(valor)
  try {
    return new Date(valor).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  } catch {
    return null
  }
}

function periodos(gran) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const lista = []
  if (gran === 'dia') {
    for (let i = 13; i >= 0; i--) {
      const a = new Date(hoje)
      a.setDate(a.getDate() - i)
      const b = new Date(a)
      b.setDate(b.getDate() + 1)
      lista.push({
        a: iso(a),
        b: iso(b),
        curto: curto(a),
        longo: a.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      })
    }
  } else if (gran === 'semana') {
    const seg = new Date(hoje)
    seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7))
    for (let i = 11; i >= 0; i--) {
      const a = new Date(seg)
      a.setDate(a.getDate() - i * 7)
      const b = new Date(a)
      b.setDate(b.getDate() + 7)
      const f = new Date(b)
      f.setDate(f.getDate() - 1)
      lista.push({ a: iso(a), b: iso(b), curto: curto(a), longo: 'Semana de ' + curto(a) + ' a ' + curto(f) })
    }
  } else {
    for (let i = 5; i >= 0; i--) {
      const a = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const b = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 1)
      lista.push({
        a: iso(a),
        b: iso(b),
        curto: MESES[a.getMonth()],
        longo: MESES_LONGO[a.getMonth()] + ' de ' + a.getFullYear(),
      })
    }
  }
  return lista
}

function Quadro({ cor, valor, titulo, sub }) {
  return (
    <div className="dash-tile" style={{ '--c': cor }}>
      <b>{valor}</b>
      <span>{titulo}</span>
      {sub && <small>{sub}</small>}
    </div>
  )
}

export default function PainelGraficos({ dados }) {
  const [gran, setGran] = useState('semana')
  const [fatia, setFatia] = useState(-1)
  const rNovos = useRef(null)
  const rUsando = useRef(null)
  const rCresc = useRef(null)
  const rMsg = useRef(null)
  const rParou = useRef(null)

  const calc = useMemo(() => {
    const pessoas = (dados.pessoas || []).map((p) => {
      const dias = (p.dias || []).slice().sort()
      return { ...p, criado: diaBR(p.criado_em), dias, ultimo: dias.length ? dias[dias.length - 1] : null }
    })
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeIso = iso(hoje)
    const ha = (n) => {
      const d = new Date(hoje)
      d.setDate(d.getDate() - n)
      return iso(d)
    }

    const novos7 = pessoas.filter((p) => p.criado > ha(7)).length
    const novosAntes = pessoas.filter((p) => p.criado > ha(14) && p.criado <= ha(7)).length
    const ativos7 = pessoas.filter((p) => p.ultimo && p.ultimo > ha(7)).length
    const hojeN = pessoas.filter((p) => p.ultimo === hojeIso).length
    const pararam = pessoas.filter((p) => p.ultimo && p.ultimo <= ha(7)).length
    const nunca = pessoas.filter((p) => !p.ultimo).length
    const instalaram = pessoas.filter((p) => p.instalou).length

    const per = periodos(gran)
    const dentro = (p, dia) => !!dia && dia >= p.a && dia < p.b
    const labels = per.map((p) => ({ curto: p.curto, longo: p.longo }))
    const novos = per.map((p) => pessoas.filter((x) => dentro(p, x.criado)).length)
    const usando = per.map((p) => pessoas.filter((x) => x.dias.some((d) => dentro(p, d))).length)
    const acumulado = per.map((p) => pessoas.filter((x) => x.criado && x.criado < p.b).length)
    const msgs = per.map((p) => (dados.mensagens || []).filter((d) => dentro(p, d)).length)
    const sos = per.map((p) => (dados.sos || []).filter((d) => dentro(p, d)).length)

    const faixas = [
      { nome: 'Usou hoje', cor: '#22c55e', f: (l) => l === hojeIso },
      { nome: '1 a 3 dias', cor: '#84cc16', f: (l) => l && l < hojeIso && l >= ha(3) },
      { nome: '4 a 7 dias', cor: '#facc15', f: (l) => l && l < ha(3) && l >= ha(7) },
      { nome: '8 a 14 dias', cor: '#fb923c', f: (l) => l && l < ha(7) && l >= ha(14) },
      { nome: '15 dias ou mais', cor: '#ef4444', f: (l) => l && l < ha(14) },
      { nome: 'Nunca usou', cor: '#64748b', f: (l) => !l },
    ].map((f) => {
      const membros = pessoas.filter((p) => f.f(p.ultimo))
      return { ...f, membros, valor: membros.length }
    })

    const delta =
      novos7 === novosAntes
        ? '= igual à semana anterior'
        : (novos7 > novosAntes ? '▲ +' : '▼ ') + (novos7 - novosAntes) + ' vs semana anterior'

    return {
      pessoas, labels, novos, usando, acumulado, msgs, sos, faixas,
      topo: { novos7, delta, ativos7, hojeN, pararam, nunca, instalaram, total: pessoas.length },
    }
  }, [dados, gran])

  useEffect(() => {
    const { labels, novos, usando, acumulado, msgs, sos } = calc
    if (rNovos.current)
      barras(rNovos.current, { labels, series: [{ nome: 'Novos cadastros', cor: '#7FD1CC', valores: novos }] })
    if (rUsando.current)
      barras(rUsando.current, { labels, series: [{ nome: 'Pessoas', cor: '#facc15', valores: usando }] })
    if (rCresc.current)
      linha(rCresc.current, { labels, series: [{ nome: 'Cadastros', cor: '#38bdf8', valores: acumulado }] })
    if (rMsg.current)
      barras(rMsg.current, {
        labels,
        series: [
          { nome: 'Mensagens', cor: '#1877CC', valores: msgs },
          { nome: 'SOS', cor: '#ef4444', valores: sos },
        ],
      })
  }, [calc])

  useEffect(() => {
    if (!rParou.current) return
    rosca(rParou.current, {
      fatias: calc.faixas.map((f) => ({ nome: f.nome, valor: f.valor, cor: f.cor })),
      centro: 'pessoas',
      aoEscolher: (i) => setFatia(i),
    })
  }, [calc])

  const nomePer = { dia: 'por dia (14 dias)', semana: 'por semana (12 semanas)', mes: 'por mês (6 meses)' }[gran]
  const t = calc.topo
  const membros = fatia >= 0 && calc.faixas[fatia] ? calc.faixas[fatia].membros : []
  const desde = dados.desde ? dados.desde.split('-').reverse().join('/') : null

  return (
    <div className="dash">
      <div className="dash-tiles">
        <Quadro cor="#38bdf8" valor={t.total} titulo="Cadastros" sub="Quem criou conta" />
        <Quadro cor="#7FD1CC" valor={t.novos7} titulo="Novos em 7 dias" sub={t.delta} />
        <Quadro cor="#a78bfa" valor={t.instalaram} titulo="Instalaram" sub="Abriram pela tela inicial" />
        <Quadro cor="#22c55e" valor={t.hojeN} titulo="Usaram hoje" />
        <Quadro cor="#facc15" valor={t.ativos7} titulo="Ativos em 7 dias" />
        <Quadro cor="#fb923c" valor={t.pararam} titulo="Pararam de usar" sub="Sem uso há 8 dias ou mais" />
        <Quadro cor="#94a3b8" valor={t.nunca} titulo="Nunca usaram" sub="Cadastro sem nenhuma atividade" />
      </div>

      <div className="dash-chips">
        {[['dia', '14 dias'], ['semana', '12 semanas'], ['mes', '6 meses']].map(([k, rot]) => (
          <button key={k} type="button" className={gran === k ? 'on' : ''} onClick={() => setGran(k)}>
            {rot}
          </button>
        ))}
      </div>

      <div className="dash-card">
        <div className="dash-h"><b>🆕 Novos cadastros</b><small>Quem baixou e criou conta, {nomePer}</small></div>
        <div ref={rNovos} />
      </div>
      <div className="dash-card">
        <div className="dash-h"><b>🔥 Pessoas usando o app</b><small>Quem abriu ou usou, {nomePer}</small></div>
        <div ref={rUsando} />
      </div>
      <div className="dash-card">
        <div className="dash-h"><b>📈 Crescimento</b><small>Total de cadastros ao longo do tempo</small></div>
        <div ref={rCresc} />
      </div>
      <div className="dash-card">
        <div className="dash-h"><b>💬 Mensagens e SOS</b><small>Atividade do app, {nomePer}</small></div>
        <div ref={rMsg} />
      </div>
      <div className="dash-card">
        <div className="dash-h"><b>⏳ Quem parou de usar</b><small>Toque numa fatia para ver as pessoas</small></div>
        <div ref={rParou} />
        {fatia >= 0 && (
          <div className="dash-lista">
            {membros.length === 0 && <p className="dash-nota">Ninguém nesta faixa.</p>}
            {membros.map((p) => (
              <div key={p.aurora_id} className="dash-pessoa">
                <span>{p.nome || 'Sem nome'}</span>
                <small>
                  {p.aurora_id} ·{' '}
                  {p.ultimo ? 'último uso ' + p.ultimo.split('-').reverse().join('/') : 'sem uso registrado'}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="dash-nota">
        {desde
          ? `O registro de quem abre o app começou em ${desde}. `
          : 'O registro de quem abre o app começa na próxima vez que alguém entrar. '}
        Antes disso, só contam mensagens e SOS enviados.
      </p>
    </div>
  )
}
