import { useState } from 'react'

const MENU = [
  { id: 'libras', icone: '🤟', titulo: 'Falar em Libras', fase: 'Fase 3' },
  { id: 'falar', icone: '🎤', titulo: 'Falar', fase: 'Fase 2' },
  { id: 'conversas', icone: '💬', titulo: 'Minhas conversas', fase: 'Fase 2' },
  { id: 'contatos', icone: '👥', titulo: 'Contatos', fase: 'Fase 2' },
  { id: 'ambiente', icone: '👁️', titulo: 'Sentir o ambiente', fase: 'Fase 4' },
  { id: 'sos', icone: '🚨', titulo: 'SOS', fase: 'Fase 5' },
  { id: 'confianca', icone: '🔐', titulo: 'Contatos de confiança', fase: 'Fase 5' },
  { id: 'config', icone: '⚙️', titulo: 'Configurações', fase: 'Fase 1' },
]

export default function App() {
  const [aberto, setAberto] = useState(null)

  if (aberto) {
    return (
      <div className="tela">
        <button className="voltar" onClick={() => setAberto(null)}>
          ← Voltar
        </button>
        <div className="aviso">
          <span className="aviso-icone">{aberto.icone}</span>
          <h2>{aberto.titulo}</h2>
          <p className="aviso-texto">
            Esta função ainda não foi construída.
          </p>
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
      </nav>

      <footer className="rodape">
        Fase 0 — base do aplicativo. Nenhuma função ativa ainda.
      </footer>
    </div>
  )
}
