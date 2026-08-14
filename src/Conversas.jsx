import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import Chat from './Chat.jsx'

const SELECAO = `
  id, status, solicitante_id, destinatario_id,
  solicitante:perfis!contatos_solicitante_id_fkey (id, aurora_id, nome),
  destinatario:perfis!contatos_destinatario_id_fkey (id, aurora_id, nome)
`

export default function Conversas({ sessao, aoVoltar }) {
  const meuId = sessao.user.id

  const [conversas, setConversas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberta, setAberta] = useState(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const { data, error } = await supabase
        .from('contatos')
        .select(SELECAO)
        .eq('status', 'aceito')
        .order('criado_em', { ascending: false })

      if (!ativo) return

      if (error) {
        setErro('Não foi possível carregar suas conversas.')
      } else {
        const lista = (data || []).map((c) => ({
          id: c.id,
          pessoa: c.solicitante_id === meuId ? c.destinatario : c.solicitante,
        }))
        setConversas(lista)
      }
      setCarregando(false)
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [meuId])

  if (aberta) {
    return (
      <Chat
        sessao={sessao}
        conversa={aberta}
        aoVoltar={() => setAberta(null)}
      />
    )
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Minhas conversas</h2>

        {carregando && <p className="aviso-linha">Carregando...</p>}

        {erro && <p className="erro">{erro}</p>}

        {!carregando && !erro && conversas.length === 0 && (
          <p className="aviso-linha">
            Você ainda não tem contatos aceitos. Vá em Contatos, procure a
            pessoa pelo ID e espere ela aceitar.
          </p>
        )}

        {conversas.map((c) => (
          <button
            key={c.id}
            className="pessoa-abrir"
            onClick={() => setAberta(c)}
          >
            <strong className="pessoa-nome">{c.pessoa?.nome || 'Sem nome'}</strong>
            <span className="pessoa-id">{c.pessoa?.aurora_id}</span>
          </button>
        ))}
      </div>

      <footer className="rodape">
        Por enquanto as conversas são por texto.
        Áudio e câmera entram depois.
      </footer>
    </div>
  )
}
