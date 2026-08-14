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

export default function Painel({ aoVoltar }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  async function buscar() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase.rpc('painel_dono')

    if (error) {
      setErro('Não foi possível carregar o painel. Esta conta tem permissão de dono?')
      setDados(null)
    } else {
      setDados(data)
    }
    setCarregando(false)
  }

  useEffect(() => {
    buscar()
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

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Painel do dono</h2>

        {carregando && <p className="aviso-linha">Carregando...</p>}

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

            <button className="secundario" onClick={buscar}>
              🔄 Atualizar
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
