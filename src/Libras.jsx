import { useEffect, useRef, useState } from 'react'

const ENDERECO_APP = 'https://vlibras.gov.br/app'
const ENDERECO_SCRIPT = 'https://vlibras.gov.br/app/vlibras-plugin.js'

let widgetCriado = false

const Reconhecimento =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export default function Libras({ aoVoltar }) {
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState('carregando')
  const [ouvindo, setOuvindo] = useState(false)
  const [erroVoz, setErroVoz] = useState('')
  const recRef = useRef(null)

  useEffect(() => {
    let ativo = true

    function iniciar() {
      if (!ativo) return
      try {
        if (window.VLibras && window.VLibras.Widget) {
          if (!widgetCriado) {
            new window.VLibras.Widget(ENDERECO_APP)
            widgetCriado = true
          }
          setEstado('pronto')
        } else {
          setEstado('erro')
        }
      } catch {
        setEstado('erro')
      }
    }

    if (window.VLibras) {
      iniciar()
      return () => {
        ativo = false
      }
    }

    const script = document.createElement('script')
    script.src = ENDERECO_SCRIPT
    script.async = true
    script.onload = iniciar
    script.onerror = () => ativo && setEstado('erro')
    document.body.appendChild(script)

    return () => {
      ativo = false
    }
  }, [])

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

        {estado === 'carregando' && (
          <p className="aviso-linha">Carregando o avatar do VLibras...</p>
        )}

        {estado === 'erro' && (
          <p className="erro">
            O avatar do VLibras não carregou. Verifique sua conexão e
            abra a tela de novo.
          </p>
        )}

        {estado === 'pronto' && (
          <div className="instrucao">
            <p className="aviso-linha">
              Toque no botão azul com a mão, no canto da tela. Depois toque
              no texto acima para o avatar traduzir.
            </p>
          </div>
        )}
      </div>

      <footer className="rodape">
        A tradução é feita pelo VLibras, ferramenta gratuita do governo federal.
        É automática e pode errar em frases longas.
        A leitura de sinais pela câmera ainda não existe no aplicativo.
      </footer>

      <div vw="true" className="enabled">
        <div vw-access-button="true" className="active"></div>
        <div vw-plugin-wrapper="true">
          <div className="vw-plugin-top-wrapper"></div>
        </div>
      </div>
    </div>
  )
}
