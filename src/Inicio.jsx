import { useEffect, useState } from 'react'
import Titulo from './Titulo.jsx'
import { supabase } from './supabase.js'

function FaixaParceiros() {
  const [banners, setBanners] = useState([])
  const [i, setI] = useState(0)

  useEffect(() => {
    let vivo = true
    supabase
      .from('parceiros')
      .select('id, nome, descricao, link, imagem')
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
    const t = setInterval(() => setI((atual) => (atual + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  if (banners.length === 0) return null
  const b = banners[i % banners.length]

  return (
    <a className="faixa-parceiro" href={b.link || undefined} target="_blank" rel="noopener noreferrer">
      {b.imagem && <img src={b.imagem} alt={b.nome} className="faixa-parceiro-imagem" />}
      <span className="faixa-parceiro-selo">Parceiro</span>
      <strong>{b.nome}</strong>
      {b.descricao && <span>{b.descricao}</span>}
    </a>
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

const LISTA = [
  { id: 'confianca', icone: '🔐', titulo: 'Contatos de confiança' },
  { id: 'alertas', icone: '🔔', titulo: 'Alertas recebidos' },
  { id: 'parceiros', icone: '🤝', titulo: 'Parceiros e divulgação' },
  { id: 'config', icone: '⚙️', titulo: 'Configurações', fase: 'Fase 6' },
]

export default function Inicio({ sessao, dono, aoAbrir, aoPerfil, aoPainel }) {
  return (
    <div className="tela inicio">
      <Titulo sessao={sessao} />

      <FaixaParceiros />

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

      <section className="inicio-lista">
        {LISTA.map((item) => (
          <button key={item.id} className="linha-lista" onClick={() => aoAbrir(item)}>
            <span>
              {item.icone} {item.titulo}
            </span>
            <span>›</span>
          </button>
        ))}

        <button className="linha-lista" onClick={aoPerfil}>
          <span>👤 Meu perfil</span>
          <span>›</span>
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
