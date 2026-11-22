import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import CartaoParceiro from './CartaoParceiro.jsx'

export default function Parceiros({ sessao, aoVoltar }) {
  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')
  const [precos, setPrecos] = useState({})

  useEffect(() => {
    let vivo = true
    supabase
      .from('precos_parceria')
      .select('chave, valor')
      .then(({ data }) => {
        if (!vivo) return
        const mapa = {}
        ;(data || []).forEach((x) => {
          mapa[x.chave] = x.valor
        })
        setPrecos(mapa)
      })
    supabase
      .from('parceiros')
      .select('id, nome, categoria, descricao, link, video, imagem, botao, tipo, ate, ordem')
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

        <button
          className="botao-neon"
          onClick={() => document.getElementById('form-parceria')?.scrollIntoView({ behavior: 'smooth' })}
        >
          🤝 QUER FAZER PARCERIA?
          <small>Anuncie sua marca aqui</small>
        </button>

        {(precos.bannerSemana || precos.bannerMes || precos.destaqueSemana || precos.destaqueMes) && (
          <section className="grupo">
            <h3 className="grupo-titulo">💰 Quanto custa divulgar</h3>
            <div className="plans">
              {(precos.bannerSemana || precos.bannerMes) && (
                <div className="plan">
                  <b>
                    🖼️ Banner na faixa
                    <small>Sua marca passa na tela inicial do Aurora</small>
                  </b>
                  <div>
                    {precos.bannerSemana && <span><em>{precos.bannerSemana}</em>/semana</span>}
                    {precos.bannerMes && <span><em>{precos.bannerMes}</em>/mês</span>}
                  </div>
                </div>
              )}
              {(precos.destaqueSemana || precos.destaqueMes) && (
                <div className="plan">
                  <b>
                    ⭐ Destaque
                    <small>Sua marca em evidência na tela inicial</small>
                  </b>
                  <div>
                    {precos.destaqueSemana && <span><em>{precos.destaqueSemana}</em>/semana</span>}
                    {precos.destaqueMes && <span><em>{precos.destaqueMes}</em>/mês</span>}
                  </div>
                </div>
              )}
            </div>
            {precos.promocao && <div className="promo">🎁 {precos.promocao}</div>}
          </section>
        )}

        {carregando && <p className="aviso-linha">Carregando...</p>}

        {!carregando && lista.length === 0 && (
          <p className="aviso-linha">Nenhum parceiro no momento.</p>
        )}

        {lista.map((p) => (
          <CartaoParceiro key={p.id} p={p} />
        ))}

        <section className="grupo" id="form-parceria">
          <h3 className="grupo-titulo">Quer anunciar ou fazer parceria?</h3>

          {enviado ? (
            <p className="aviso-linha">
              Pedido enviado. Obrigado! Entraremos em contato pelo contato que você informou.
            </p>
          ) : (
            <form className="form" onSubmit={enviarPedido}>
              <label className="campo">
                <span className="campo-nome">Seu nome</span>
                <input className="campo-input" value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>

              <label className="campo">
                <span className="campo-nome">Contato (WhatsApp, e-mail ou @)</span>
                <input className="campo-input" value={contato} onChange={(e) => setContato(e.target.value)} />
              </label>

              <label className="campo">
                <span className="campo-nome">Sua proposta (opcional)</span>
                <textarea className="area" rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
              </label>

              {erro && <p className="erro">{erro}</p>}

              <button className="botao-neon" type="submit" disabled={enviando}>
                {enviando ? 'Enviando...' : 'ENVIAR PEDIDO'}
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
