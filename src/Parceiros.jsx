import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export default function Parceiros({ sessao, aoVoltar }) {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let vivo = true
    supabase
      .from('parceiros')
      .select('id, nome, categoria, descricao, link, imagem, tipo, ate, ordem')
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        if (vivo) {
          setLista(data || [])
          setCarregando(false)
        }
      })
    return () => {
      vivo = false
    }
  }, [])

  async function enviarPedido(e) {
    e.preventDefault()
    setErro('')

    if (!nome.trim() || !contato.trim()) {
      setErro('Preencha seu nome e um contato (WhatsApp, e-mail ou @ do Instagram).')
      return
    }

    setEnviando(true)
    const { error } = await supabase.from('parceria_pedidos').insert({
      nome: nome.trim(),
      contato: contato.trim(),
      mensagem: mensagem.trim() || null,
    })
    setEnviando(false)

    if (error) {
      setErro('Não foi possível enviar agora. Tente de novo em instantes.')
      return
    }

    setEnviado(true)
    setNome('')
    setContato('')
    setMensagem('')
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Parceiros e divulgação</h2>

        <p className="aviso-linha">
          Estes são apoiadores da comunicação acessível. Eles não recebem dados de usuários e não
          influenciam alertas, SOS nem conversas.
        </p>

        {carregando && <p className="aviso-linha">Carregando...</p>}

        {!carregando && lista.length === 0 && (
          <p className="aviso-linha">Nenhum parceiro no momento.</p>
        )}

        {lista.map((p) => (
          <div key={p.id} className="evento">
            {p.imagem && <img src={p.imagem} alt={p.nome} className="parceiro-previa" />}
            <span className="evento-hora">Parceiro · {p.categoria}</span>
            <strong className="evento-texto">{p.nome}</strong>
            {p.descricao && <span className="evento-detalhe">{p.descricao}</span>}
            {p.link && (
              <a className="principal" href={p.link} target="_blank" rel="noopener noreferrer">
                Visitar
              </a>
            )}
          </div>
        ))}

        <section className="grupo">
          <h3 className="grupo-titulo">Quer anunciar ou fazer parceria?</h3>

          {enviado ? (
            <p className="aviso-linha">
              Pedido enviado. Obrigado! Entraremos em contato pelo contato que você informou.
            </p>
          ) : (
            <form className="form" onSubmit={enviarPedido}>
              <label className="campo">
                <span className="campo-nome">Seu nome</span>
                <input
                  className="campo-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </label>

              <label className="campo">
                <span className="campo-nome">Contato (WhatsApp, e-mail ou @)</span>
                <input
                  className="campo-input"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                />
              </label>

              <label className="campo">
                <span className="campo-nome">Sua proposta (opcional)</span>
                <textarea
                  className="area"
                  rows={4}
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                />
              </label>

              {erro && <p className="erro">{erro}</p>}

              <button className="principal" type="submit" disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar pedido'}
              </button>
            </form>
          )}
        </section>
      </div>

      <footer className="rodape">
        Parceiros pagam apenas para divulgar. Nenhum pagamento libera funções de segurança ou
        acessibilidade do Aurora.
      </footer>
    </div>
  )
}
