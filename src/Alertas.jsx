import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import Notificar from './Notificar.jsx'

const SELECAO = `
  id, autor_id, situacao, mensagem, latitude, longitude,
  criado_em, encerrado_em,
  autor:perfis!sos_autor_id_fkey (id, aurora_id, nome)
`

function quando(iso) {
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

export default function Alertas({ sessao, aoVoltar }) {
  const meuId = sessao.user.id

  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('sos')
      .select(SELECAO)
      .neq('autor_id', meuId)
      .order('criado_em', { ascending: false })
      .limit(30)

    if (error) setErro('Não foi possível carregar os alertas.')
    else {
      setPedidos(data || [])
      setErro('')
    }
    setCarregando(false)
  }, [meuId])
async function apagarTudo() {
    const ids = pedidos.map((p) => p.id)
    if (ids.length === 0) return
    await supabase.from('sos').update({ situacao: 'visto' }).in('id', ids)
    setPedidos([])
}
  useEffect(() => {
    carregar()

    const canal = supabase
      .channel('alertas-sos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos' },
        () => {
          carregar()
          if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregar])
const abertos = pedidos.filter((p) => p.situacao === 'aberto')
  const enganos = pedidos.filter((p) => p.situacao === 'engano')
  const antigos = pedidos.filter((p) => p.situacao !== 'aberto')

  function cartao(p, urgente) {
    return (
      <div key={p.id} className={urgente ? 'pessoa cartao-urgente' : 'pessoa'}>
        <div>
          <strong className="pessoa-nome">
            {urgente ? '🚨 ' : ''}
            {p.autor?.nome || 'Alguém'} pediu ajuda
          </strong>
          <span className="pessoa-id">{p.autor?.aurora_id}</span>
        </div>

        <span className="evento-detalhe">{quando(p.criado_em)}</span>

        {p.situacao === 'encerrado' && (
          <span className="evento-detalhe">
            Encerrado em {quando(p.encerrado_em)}
          </span>
        )}

        {p.latitude && p.longitude ? (
          <a
            className="principal link-botao"
            href={'https://maps.google.com/?q=' + p.latitude + ',' + p.longitude}
            target="_blank"
            rel="noreferrer"
          >
            📍 Ver onde a pessoa estava
          </a>
        ) : (
          <span className="evento-detalhe">Sem localização neste pedido.</span>
        )}
      </div>
    )
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Alertas recebidos</h2>

        <div className="instrucao">
          <p className="aviso-linha">
            Aqui aparecem os pedidos de ajuda de quem colocou você como contato
            de confiança. Chega na hora, com esta tela aberta.
          </p>
        </div>

        <Notificar sessao={sessao} />

        {pedidos.length > 0 && (
          <button className="secundario" onClick={apagarTudo}>
            🧹 Limpar todos os alertas
          </button>
        )}
        {erro && <p className="erro">{erro}</p>}
        {carregando && <p className="aviso-linha">Carregando...</p>}

        {!carregando && pedidos.length === 0 && (
          <p className="aviso-linha">Nenhum alerta até agora.</p>
        )}

        {enganos.length > 0 && (
          <section className="grupo">
            {enganos.map((p) => (
              <div key={p.id} className="pessoa">
                <strong className="pessoa-nome">
                  {(p.autor && p.autor.nome) || 'Alguém'} — foi um engano
                </strong>
                <span className="evento-detalhe">O pedido foi cancelado por quem enviou.</span>
              </div>
            ))}
          </section>
        )}

        {antigos.length > 0 && (
          <section className="grupo">
            <h3 className="grupo-titulo">Já encerrados</h3>
            {antigos.map((p) => cartao(p, false))}
          </section>
        )}
      </div>

      <footer className="rodape">
        Você só enxerga o pedido de quem escolheu você como confiança.
      </footer>
    </div>
  )
}
