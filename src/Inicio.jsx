import { useEffect, useState } from 'react'
import Titulo from './Titulo.jsx'
import { supabase } from './supabase.js'
import CartaoParceiro from './CartaoParceiro.jsx'

function FaixaParceiros() {
  const [banners, setBanners] = useState([])
  const [i, setI] = useState(0)

  useEffect(() => {
    let vivo = true
    supabase
      .from('parceiros')
      .select('id, nome, descricao, link, imagem, video, botao')
      .eq('tipo', 'banner')
      .order('ordem', { ascending: true })
      .then(({ data }) => {
        if (vivo) setBanners(data || [])
      })
    return () => {
      vivo = false
    }
  }, [])

  useEffect(() => {
    if (banners.length < 2) return
    const atual = banners[i % banners.length]
    // Banner com vídeo fica mais tempo para dar para assistir
    const espera = atual && atual.video ? 60000 : 5000
    const t = setTimeout(() => setI((x) => (x + 1) % banners.length), espera)
    return () => clearTimeout(t)
  }, [banners, i])

  if (banners.length === 0) return null
  const b = banners[i % banners.length]

  return (
    <div className="faixa-wrap">
      <CartaoParceiro p={b} compacto />
      {banners.length > 1 && (
        <div className="bdots-aurora">
          {banners.map((_, k) => (
            <i key={k} className={k === i % banners.length ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  )
}

const ITENS = [
  { id: 'libras', icone: '🤟', titulo: 'Falar em Libras' },
  { id: 'falar', icone: '🎤', titulo: 'Falar' },
  { id: 'conversas', icone: '💬', titulo: 'Minhas conversas' },
  { id: 'contatos', icone: '👥', titulo: 'Contatos' },
]

const AMBIENTE = { id: 'ambiente', icone: '👁️', titulo: 'Sentir o ambiente' }
const SOS = { id: 'sos', icone: '🚨', titulo: 'SOS' }
const ALERTAS = { id: 'alertas', icone: '🔔', titulo: 'Alertas recebidos' }
const PARCEIROS = { id: 'parceiros', icone: '🤝', titulo: 'Parceiros e divulgação' }

const LISTA = [
  { id: 'confianca', icone: '🔐', titulo: 'Contatos de confiança' },
  { id: 'alertas', icone: '🔔', titulo: 'Alertas recebidos' },
  { id: 'parceiros', icone: '🤝', titulo: 'Parceiros e divulgação' },
  { id: 'config', icone: '⚙️', titulo: 'Configurações' },
]

export default function Inicio({ sessao, dono, aoAbrir, aoPerfil, aoPainel }) {
  return (
    <div className="tela inicio">
      <Titulo sessao={sessao} />

      <FaixaParceiros />

      <button className="botao-neon" onClick={() => aoAbrir(PARCEIROS)}>
        📣 ANUNCIE AQUI
        <small>Sua marca em destaque no Aurora</small>
      </button>

      <nav className="inicio-grade">
        {ITENS.map((item) => (
          <button key={item.id} className="cartao-claro" onClick={() => aoAbrir(item)}>
            <span className="cartao-claro-icone">{item.icone}</span>
            <span className="cartao-claro-titulo">{item.titulo}</span>
          </button>
        ))}

        <button className="cartao-claro cartao-largo" onClick={() => aoAbrir(AMBIENTE)}>
          <span className="cartao-claro-icone">{AMBIENTE.icone}</span>
          <span className="cartao-claro-titulo">{AMBIENTE.titulo}</span>
        </button>
      </nav>

      <button className="faixa-sos" onClick={() => aoAbrir(SOS)}>
        🚨 SOS · pedir ajuda
      </button>

      <section className="inicio-cards">
        {LISTA.map((item) => (
          <button key={item.id} className="ficha" onClick={() => aoAbrir(item)}>
            <span className="ficha-icone">{item.icone}</span>
            <span className="ficha-titulo">{item.titulo}</span>
            {item.fase && <span className="ficha-selo">{item.fase}</span>}
          </button>
        ))}

        <button className="ficha" onClick={aoPerfil}>
          <span className="ficha-icone">👤</span>
          <span className="ficha-titulo">Meu perfil</span>
        </button>
      </section>

      {dono && (
        <button className="botao-painel" onClick={aoPainel}>
          📊 Painel do dono
        </button>
      )}

      <footer className="rodape">
        O SOS avisa seus contatos de confiança dentro da Aurora, com o app aberto.
      </footer>

      <nav className="barra-inferior">
        <button className="barra-item barra-ativo">
          🏠<span>Início</span>
        </button>
        <button className="barra-item" onClick={() => aoAbrir(ITENS[0])}>
          🤟<span>Tradutor</span>
        </button>
        <button className="barra-item" onClick={() => aoAbrir(SOS)}>
          🚨<span>SOS</span>
        </button>
        <button className="barra-item" onClick={() => aoAbrir(ALERTAS)}>
          🔔<span>Alertas</span>
        </button>
        <button className="barra-item" onClick={aoPerfil}>
          👤<span>Perfil</span>
        </button>
      </nav>
    </div>
  )
}
