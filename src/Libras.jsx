import { useEffect, useRef, useState } from 'react'

const Reconhecimento =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export default function Libras({ aoVoltar }) {
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [erroVoz, setErroVoz] = useState('')
  const [avatarPronto, setAvatarPronto] = useState(false)
  const recRef = useRef(null)

  useEffect(() => {
    const tentativa = setInterval(() => {
      const botao = document.querySelector('[vw-access-button]')
      if (botao) {
        setAvatarPronto(true)
        clearInterval(tentativa)
      }
    }, 800)

    const desistir = setTimeout(() => clearInterval(tentativa), 20000)

    return () => {
      clearInterval(tentativa)
      clearTimeout(desistir)
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

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Português → Libras</h2>

        <label className="campo">
          <span className="campo-nome">Escreva ou fale o que quer traduzir</span>
          <textarea
            className="campo-input area"
            rows={4}
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
          <div className="para-traduzir">
            <p className="transcricao-texto">{texto}</p>
          </div>
        )}

        <div className="instrucao">
          {avatarPronto ? (
            <p className="aviso-linha">
              Toque no botão azul com a mão, no canto da tela.
              Depois toque no texto grande acima e o avatar traduz.
            </p>
          ) : (
            <p className="aviso-linha">
              Carregando o avatar do VLibras. Se o botão azul com a mão
              não aparecer no canto da tela em alguns segundos,
              confira sua conexão.
            </p>
          )}
        </div>
      </div>

      <footer className="rodape">
        A tradução é feita pelo VLibras, ferramenta gratuita do governo federal.
        É automática e pode errar em frases longas.
        A leitura de sinais pela câmera ainda não existe no aplicativo.
      </footer>
    </div>
  )
}
