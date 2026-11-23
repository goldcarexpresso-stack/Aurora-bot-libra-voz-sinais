import { useEffect, useState } from 'react'

// Divide o texto em frases para ler uma de cada vez
function frasesDo(texto) {
  return texto
    .split(/(?<=[.!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0)
}

export default function Estudar({ aoVoltar }) {
  const [texto, setTexto] = useState('')
  const [frases, setFrases] = useState([])
  const [atual, setAtual] = useState(0)
  const [lendo, setLendo] = useState(false)

  // Quando a mãozinha abre, o texto sobe e os botões descem para não ficarem cobertos
  useEffect(() => {
    function aoClicar(e) {
      if (e.target.closest && e.target.closest('.vw-access-button')) {
        document.body.classList.toggle('estudar-libras')
      }
    }
    document.addEventListener('click', aoClicar)
    return () => {
      document.removeEventListener('click', aoClicar)
      document.body.classList.remove('estudar-libras')
    }
  }, [])

  function comecar() {
    const lista = frasesDo(texto)
    if (lista.length === 0) return
    setFrases(lista)
    setAtual(0)
    setLendo(true)
  }

  if (lendo) {
    const total = frases.length
    return (
      <div className="tela estudar-tela">
        <div className="libras-topo">
          <button className="voltar" onClick={() => setLendo(false)}>
            ← Texto
          </button>
          <span className="libras-titulo">Leitura</span>
        </div>

        <p className="instrucao">
          Leia uma frase por vez. Para ver a frase em Libras, toque na mãozinha azul.
        </p>

        <div className="cartao-claro estudar-frase">{frases[atual]}</div>

        <div className="estudar-controles">
        <p className="aviso-linha">
          Frase {atual + 1} de {total}
        </p>

        <div className="estudar-botoes">
          <button
            className="secundario"
            disabled={atual === 0}
            onClick={() => setAtual((n) => Math.max(0, n - 1))}
          >
            ← Anterior
          </button>
          <button
            className="botao-neon"
            disabled={atual >= total - 1}
            onClick={() => setAtual((n) => Math.min(total - 1, n + 1))}
          >
            Próxima →
          </button>
        </div>

        <div className="estudar-botoes">
          <button className="secundario" onClick={() => setAtual(0)}>
            Começar de novo
          </button>
          <button className="secundario" onClick={() => setLendo(false)}>
            Trocar texto
          </button>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="tela estudar-tela">
      <div className="libras-topo">
        <button className="voltar" onClick={aoVoltar}>
          ← Voltar
        </button>
        <span className="libras-titulo">Estudar</span>
      </div>

      <p className="instrucao">
        Cole aqui o texto da matéria, do site ou da lição. Depois toque em LER. O texto aparece uma frase por vez.
      </p>

      <label className="campo">
        <span className="campo-nome">Texto para estudar</span>
        <textarea
          className="area estudar-area"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole o texto aqui"
        />
      </label>

      <button className="botao-neon" type="button" onClick={comecar} disabled={!texto.trim()}>
        LER
      </button>
    </div>
  )
}
