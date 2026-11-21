import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

function dataHora(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function diaCurto(dia) {
  try {
    return new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })
  } catch {
    return ''
  }
}

function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Grafico({ serie }) {
  const LARG = 320
  const ALT = 190
  const BASE = 150
  const TOPO = 14

  const maior = Math.max(1, ...serie.flatMap((d) => [d.cadastros, d.mensagens]))
  const grupo = LARG / serie.length
  const barra = Math.max(4, grupo * 0.32)

  return (
    <svg
      viewBox={`0 0 ${LARG} ${ALT}`}
      className="grafico"
      role="img"
      aria-label="Gráfico dos últimos 14 dias"
    >
      {[0, 0.5, 1].map((f) => {
        const y = BASE - f * (BASE - TOPO)
        return <line key={f} x1="0" x2={LARG} y1={y} y2={y} className="grafico-grade" />
      })}

      {serie.map((d, i) => {
        const x = i * grupo + grupo * 0.12
        const hC = (d.cadastros / maior) * (BASE - TOPO)
        const hM = (d.mensagens / maior) * (BASE - TOPO)
        return (
          <g key={d.dia}>
            <rect x={x} y={BASE - hC} width={barra} height={hC} rx="3" className="grafico-cadastros" />
            <rect x={x + barra + 2} y={BASE - hM} width={barra} height={hM} rx="3" className="grafico-mensagens" />
            {i % 2 === 0 && (
              <text x={x} y={ALT - 6} className="grafico-eixo">
                {diaCurto(d.dia)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function Painel({ aoVoltar }) {
  const [dados, setDados] = useState(null)
  const [serie, setSerie] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [atualizado, setAtualizado] = useState('')

  async function buscar() {
    setCarregando(true)
    setErro('')

    const [{ data, error }, { data: dadosSerie, error: erroSerie }] = await Promise.all([
      supabase.rpc('painel_dono'),
      supabase.rpc('painel_serie'),
    ])

    if (error) {
      setErro('Não foi possível carregar o painel. Esta conta tem permissão de dono?')
      setDados(null)
    } else {
      setDados(data)
    }

    setSerie(erroSerie ? null : dadosSerie)
    setAtualizado(horaAgora())
    setCarregando(false)
  }

  useEffect(() => {
    buscar()
    const intervalo = setInterval(buscar, 30000)
    return () => clearInterval(intervalo)
  }, [])

  const caixas = dados
    ? [
        { n: dados.usuarios, r: 'Pessoas cadastradas' },
        { n: dados.usuarios_24h, r: 'Novas nas últimas 24h' },
        { n: dados.usuarios_7d, r: 'Novas nos últimos 7 dias' },
        { n: dados.contatos_aceitos, r: 'Contatos aceitos' },
        { n: dados.solicitacoes_pendentes, r: 'Solicitações pendentes' },
        { n: dados.mensagens, r: 'Mensagens no total' },
        { n: dados.mensagens_24h, r: 'Mensagens em 24h' },
      ]
    : []

  const totalSos = serie ? serie.reduce((soma, d) => soma + Number(d.sos || 0), 0) : 0

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Painel do dono</h2>

        {carregando && !dados && <p className="aviso-linha">Carregando...</p>}

        {erro && <p className="erro">{erro}</p>}

        {dados && (
          <>
            <div className="painel-grade">
              {caixas.map((c) => (
                <div key={c.r} className="painel-caixa">
                  <span className="painel-num">{c.n}</span>
                  <span className="painel-rotulo">{c.r}</span>
                </div>
              ))}
            </div>

            <section className="grafico-caixa">
              <h3 className="grupo-titulo">Últimos 14 dias</h3>

              <div className="grafico-legenda">
                <span>
                  <i className="legenda-cor legenda-cadastros" /> Cadastros
                </span>
                <span>
                  <i className="legenda-cor legenda-mensagens" /> Mensagens
                </span>
              </div>

              {serie && serie.length > 0 ? (
                <Grafico serie={serie} />
              ) : (
                <p className="aviso-linha">Gráfico indisponível. Rode o SQL do painel no Supabase.</p>
              )}

              {serie && <p className="grafico-resumo">SOS nestes 14 dias: {totalSos}</p>}
            </section>

            <p className="painel-atualizado">
              Atualizado às {atualizado} · atualiza sozinho a cada 30 segundos
            </p>

            <button className="secundario" onClick={buscar}>
              🔄 Atualizar agora
            </button>

            <section className="grupo">
              <h3 className="grupo-titulo">Últimos cadastros</h3>
              {(!dados.ultimos || dados.ultimos.length === 0) && (
                <p className="aviso-linha">Nenhum cadastro ainda.</p>
              )}
              {(dados.ultimos || []).map((p) => (
                <div key={p.aurora_id} className="evento">
                  <strong className="evento-hora">{dataHora(p.criado_em)}</strong>
                  <span className="evento-texto">{p.nome || 'Sem nome'}</span>
                  <span className="evento-detalhe">{p.aurora_id}</span>
                </div>
              ))}
            </section>
          </>
        )}
      </div>

      <footer className="rodape">
        Estes números vêm direto do banco e só abrem para a conta dona.
        Nenhuma senha, e-mail ou conteúdo de conversa aparece aqui.
      </footer>
    </div>
  )
}
