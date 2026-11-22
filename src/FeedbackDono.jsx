import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export default function FeedbackDono() {
  const [lista, setLista] = useState([])

  async function carregar() {
    const { data } = await supabase
      .from('feedbacks')
      .select('id, mensagem, criado_em, lido')
      .order('criado_em', { ascending: false })
      .limit(30)
    setLista(data || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  async function marcarLido(f) {
    await supabase.from('feedbacks').update({ lido: true }).eq('id', f.id)
    carregar()
  }

  return (
    <section className="grupo">
      <h3 className="grupo-titulo">Feedbacks das pessoas</h3>
      {lista.length === 0 && <p className="aviso-linha">Nenhum feedback ainda.</p>}
      {lista.map((f) => (
        <div key={f.id} className="evento">
          <span className="evento-hora">
            {f.lido ? 'Lido' : 'Novo'} · {new Date(f.criado_em).toLocaleDateString('pt-BR')}
          </span>
          <span className="evento-texto">{f.mensagem}</span>
          {!f.lido && (
            <button className="secundario" onClick={() => marcarLido(f)}>
              Marcar como lido
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
