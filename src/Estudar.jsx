import { useState } from 'react'

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

  function comecar() {
    const lista = frasesDo(texto)
    if (lista.length === 0) return
    setFrases(lista)
    setAtual(0)
    setLendo(true)
  }

  function voltarParaTexto() {
    setLendo(false)
  }

  if (lendo) {
    const total = frases.length
    return (
      <div className="tela">
        <button className="voltar" onClick={voltarParaTexto}>
          ← Voltar ao texto
        </button>

        <div className="bloco">
          <h2 className="form-titulo">Leitura</h2>

          <p className="instrucao">
            Leia uma frase por vez. Para ver a frase em Libras, toque na mãozinha azul.
          </p>

          <p className="aviso-linha">
            Frase {atual + 1} de {total}
          </p>

          <div className="cartao-claro" style={{ padding: 20, fontSize: 24, lineHeight: 1.5, minHeight: 160 }}>
            {frases[atual]}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              className="secundario"
              style={{ flex: 1 }}
              disabled={atual === 0}
              onClick={() => setAtual((n) => Math.max(0, n - 1))}
            >
              ← Anterior
            </button>
            <button
              className="botao-neon"
              style={{ flex: 1 }}
              disabled={atual >= total - 1}
              onClick={() => setAtual((n) => Math.min(total - 1, n + 1))}
            >
              Próxima →
            </button>
          </div>

          <button className="secundario" style={{ width: '100%', marginTop: 12 }} onClick={() => setAtual(0)}>
            Começar de novo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Estudar</h2>

        <p className="instrucao">
          Cole aqui o texto da matéria, do site ou da lição. Depois toque em Ler. O texto aparece uma frase por
          vez, no seu ritmo.
        </p>

        <label className="campo">
          <span className="campo-nome">Texto para estudar</span>
          <textarea
            className="area"
            rows={10}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole o texto aqui"
          />
        </label>

        <button className="botao-neon" type="button" onClick={comecar} disabled={!texto.trim()}>
          LER
        </button>
      </div>
    </div>
  )
}
