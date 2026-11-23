import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import ParceriasDono from './ParceriasDono.jsx'
import FeedbackDono from './FeedbackDono.jsx'
import PainelGraficos from './PainelGraficos.jsx'

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

function horaAgora() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Painel({ aoVoltar }) {
  const [dados, setDados] = useState(null)
  const [serie, setSerie] = useState(null)
  const [graficos, setGraficos] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [atualizado, setAtualizado] = useState('')

  async function buscar() {
    setCarregando(true)
    setErro('')

    const [{ data, error }, { data: dadosSerie, error: erroSerie }, { data: dadosGraf, error: erroGraf }] =
      await Promise.all([
        supabase.rpc('painel_dono'),
        supabase.rpc('painel_serie'),
        supabase.rpc('painel_graficos'),
      ])

    if (error) {
      setErro('Não foi possível carregar o painel. Esta conta tem permissão de dono?')
      setDados(null)
    } else {
      setDados(data)
    }

    setSerie(erroSerie ? null : dadosSerie)
    setGraficos(erroGraf ? null : dadosGraf)
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

            {graficos ? (
              <PainelGraficos dados={graficos} />
            ) : (
              <p className="aviso-linha">Gráficos indisponíveis agora.</p>
            )}

            {serie && <p className="grafico-resumo-dono">SOS nos últimos 14 dias: {totalSos}</p>}

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

        {dados && <ParceriasDono />}

        {dados && <FeedbackDono />}

      <footer className="rodape">
        Estes números vêm direto do banco e só abrem para a conta dona.
        Nenhuma senha, e-mail ou conteúdo de conversa aparece aqui.
      </footer>
    </div>
  )
}
