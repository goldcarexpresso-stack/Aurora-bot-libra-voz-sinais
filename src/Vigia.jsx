import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const SELECAO = `
  id, criado_em, latitude, longitude,
  autor:perfis!sos_autor_id_fkey (id, aurora_id, nome)
`

export default function Vigia({ sessao, aoAbrir }) {
  const meuId = sessao.user.id
  const [alerta, setAlerta] = useState(null)

  const conferir = useCallback(
    async (id) => {
      const { data, error } = await supabase
        .from('sos')
        .select(SELECAO)
        .eq('id', id)
        .neq('autor_id', meuId)
        .maybeSingle()

      if (error || !data) return

      setAlerta(data)
      if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400])
    },
    [meuId]
  )

  useEffect(() => {
    const canal = supabase
      .channel('vigia-sos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos' },
        (payload) => {
          if (payload.new && payload.new.id) conferir(payload.new.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [conferir])

  if (!alerta) return null

  const nome = (alerta.autor && alerta.autor.nome) || 'Alguém'
  const identificador = (alerta.autor && alerta.autor.aurora_id) || ''

  return (
    <div className="vigia">
      <div className="vigia-texto">
        <strong className="vigia-nome">🚨 {nome} pediu ajuda</strong>
        <span className="vigia-id">{identificador}</span>
      </div>

      <div className="vigia-botoes">
        <button
          className="vigia-ver"
          onClick={() => {
            setAlerta(null)
            aoAbrir()
          }}
        >
          Ver o pedido
        </button>

        <button className="vigia-fechar" onClick={() => setAlerta(null)}>
          Fechar
        </button>
      </div>
    </div>
  )
}
