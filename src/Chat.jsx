import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

function horario(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function Chat({ sessao, conversa, aoVoltar }) {
  const meuId = sessao.user.id
  const pessoa = conversa.pessoa

  const [mensagens, setMensagens] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fim = useRef(null)

  useEffect(() => {
    let ativo = true

    async function carregar() {
      const { data, error } = await supabase
        .from('mensagens')
        .select('id, autor_id, texto, criado_em')
        .eq('contato_id', conversa.id)
        .order('criado_em', { ascending: true })

      if (!ativo) return
      if (error) setErro('Não foi possível carregar as mensagens.')
      else setMensagens(data || [])
      setCarregando(false)
    }

    carregar()

    const canal = supabase
      .channel('chat-' + conversa.id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: 'contato_id=eq.' + conversa.id,
        },
        (evento) => {
          setMensagens((antes) => {
            if (antes.some((m) => m.id === evento.new.id)) return antes
            return [...antes, evento.new]
          })
        }
      )
      .subscribe()

    return () => {
      ativo = false
      supabase.removeChannel(canal)
    }
  }, [conversa.id])

  useEffect(() => {
    if (fim.current) fim.current.scrollIntoView({ block: 'end' })
  }, [mensagens])

  async function enviar() {
    const limpo = texto.trim()
    if (!limpo) return

    setErro('')
    setEnviando(true)

    const { data, error } = await supabase
      .from('mensagens')
      .insert({ contato_id: conversa.id, autor_id: meuId, texto: limpo })
      .select('id, autor_id, texto, criado_em')
      .single()

    setEnviando(false)

    if (error) {
      setErro('A mensagem não foi enviada. Tente de novo.')
      return
    }

    setTexto('')
    setMensagens((antes) =>
      antes.some((m) => m.id === data.id) ? antes : [...antes, data]
    )
  }

  return (
    <div className="tela">
      <div className="chat-topo">
        <button className="voltar" onClick={aoVoltar}>
          ←
        </button>
        <div>
          <strong className="pessoa-nome">{pessoa?.nome || 'Sem nome'}</strong>
          <span className="pessoa-id">{pessoa?.aurora_id}</span>
        </div>
      </div>

      <div className="conversa">
        {carregando && <p className="aviso-linha">Carregando...</p>}

        {!carregando && mensagens.length === 0 && (
          <p className="aviso-linha">
            Nenhuma mensagem ainda. Escreva a primeira abaixo.
          </p>
        )}

        {mensagens.map((m) => (
          <div
            key={m.id}
            className={m.autor_id === meuId ? 'balao balao-meu' : 'balao'}
          >
            <p className="balao-texto">{m.texto}</p>
            <span className="balao-hora">{horario(m.criado_em)}</span>
          </div>
        ))}

        <div ref={fim} />
      </div>

      {erro && <p className="erro">{erro}</p>}

      <div className="escrever">
        <textarea
          className="campo-input area"
          rows={2}
          placeholder="Escreva sua mensagem"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="principal" onClick={enviar} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}
