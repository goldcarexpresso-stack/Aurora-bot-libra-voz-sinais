import { useEffect, useState } from 'react'
import { supabase, conectado } from './supabase.js'
import Login from './Login.jsx'
import Perfil from './Perfil.jsx'
import Falar from './Falar.jsx'

const MENU = [
  { id: 'libras', icone: '🤟', titulo: 'Falar em Libras', fase: 'Fase 3' },
  { id: 'falar', icone: '🎤', titulo: 'Falar', pronto: true },
  { id: 'conversas', icone: '💬', titulo: 'Minhas conversas', fase: 'Fase 2' },
  { id: 'contatos', icone: '👥', titulo: 'Contatos', fase: 'Fase 2' },
  { id: 'ambiente', icone: '👁️', titulo: 'Sentir o ambiente', fase: 'Fase 4' },
  { id: 'sos', icone: '🚨', titulo: 'SOS', fase: 'Fase 5' },
  { id: 'confianca', icone: '🔐', titulo: 'Contatos de confiança', fase: 'Fase 5' },
  { id: 'config', icone: '⚙️', titulo: 'Configurações', fase: 'Fase 1' },
]

export default function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(null)
  const [noPerfil, setNoPerfil] = useState(false)

  useEffect(() => {
    if (!conectado) {
      setCarregando(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })

    const { data: escuta } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova)
      setAberto(null)
      setNoPerfil(false)
    })

    return () => escuta.subscription.unsubscribe()
  }, [])

  if (!conectado) {
    return (
      <div className="tela">
        <div className="aviso">
          <span className="aviso-icone">⚠️</span>
          <h2>Sem conexão com o banco</h2>
          <p className="aviso-texto">
            As chaves do Supabase não chegaram até o aplicativo.
          </p>
        </div>
      </div>
    )
  }

  if (carregando) {
    return (
      <div className="tela">
        <div className="aviso">
          <span className="aviso-icone">🌅</span>
          <p className="aviso-texto">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!sessao) return <Login />

  if (noPerfil) {
    return <Perfil sessao={sessao} aoVoltar={() => setNoPerfil(false)} />
  }

  if (aberto && aberto.id === 'falar') {
    return <Falar aoVoltar={() => setAberto(null)} />
  }

  if (aberto) {
    return (
      <div className="tela">
        <button className="voltar" onClick={() => setAberto(null)}>
          ← Voltar
        </button>
        <div className="aviso">
          <span className="aviso-icone">{aberto.icone}</span>
          <h2>{aberto.titulo}</h2>
          <p className="aviso-texto">Esta função ainda não foi construída.</p>
          <p className="aviso-fase">Prevista para a {aberto.fase}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tela">
      <header className="topo">
        <h1>AURORA</h1>
        <p className="sub">A Luz que Traduz</p>
      </header>

      <nav className="menu">
        {MENU.map((item) => (
          <button
            key={item.id}
            className={item.id === 'sos' ? 'card card-sos' : 'card'}
            onClick={() => setAberto(item)}
          >
            <span className="card-icone">{item.icone}</span>
            <span className="card-titulo">{item.titulo}</span>
          </button>
        ))}

        <button className="card" onClick={() => setNoPerfil(true)}>
          <span className="card-icone">👤</span>
          <span className="card-titulo">Meu perfil</span>
        </button>
      </nav>

      <footer className="rodape">
        Fase 2 — voz funcionando.
        As demais funções ainda não foram construídas.
      </footer>
    </div>
  )
}
