import { useEffect, useRef, useState } from 'react'

const Reconhecimento =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export default function Libras({ aoVoltar }) {
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [erroVoz, setErroVoz] = useState('')
  const recRef = useRef(null)

  useEffect(() => {
    return () => {
      if (recRef.current) recRef.current.abort()
    }
  }, [])

  function ouvir() {
    setErroVoz('')
    if (!Reconhecimento) {
      setErroVoz('Este navegador não reconhece voz. Use o Chrome.')
      return
    }

    const rec = new Reconhecimento()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false

    rec.onresult = (e) => {
      const falado = e.results[0][0].transcript
      setTexto((antes) => (antes ? antes + ' ' + falado : falado))
    }
    rec.onerror = () => setErroVoz('Não consegui ouvir. Tente de novo.')
    rec.onend = () => setOuvindo(false)

    recRef.current = rec
    rec.start()
    setOuvindo(true)
  }

  function pararOuvir() {
    if (recRef.current) recRef.current.stop()
    setOuvindo(false)
  }

  function limpar() {
    setTexto('')
    setErroVoz('')
  }

  return (
    <div className="tela tela-libras">
      <div className="libras-topo">
        <button className="voltar" onClick={aoVoltar}>
          ←
        </button>
        <h2 className="libras-titulo">Português → Libras</h2>
      </div>

      {texto && (
        <div className="para-traduzir">
          <p className="transcricao-texto">{texto}</p>
        </div>
      )}

      <div className="bloco">
        {texto && (
          <div className="instrucao">
            <p className="aviso-linha">
              Toque no botão azul com a mão e depois no texto acima.
            </p>
          </div>
        )}

        <label className="campo">
          <span className="campo-nome">Escreva ou fale o que quer traduzir</span>
          <textarea
            className="campo-input area"
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>

        {ouvindo && <p className="indicador">🎤 Microfone ligado — ouvindo</p>}
        {erroVoz && <p className="erro">{erroVoz}</p>}

        {ouvindo ? (
          <button className="principal perigo" onClick={pararOuvir}>
            Parar de ouvir
          </button>
        ) : (
          <button className="secundario" onClick={ouvir}>
            🎤 A pessoa vai falar
          </button>
        )}

        {texto && (
          <button className="secundario" onClick={limpar}>
            Limpar
          </button>
        )}
      </div>

      <footer className="rodape">
        A tradução é feita pelo VLibras, ferramenta gratuita do governo federal.
        É automática e pode errar em frases longas.
        A leitura de sinais pela câmera ainda não existe no aplicativo.
      </footer>
    </div>
  )
}
