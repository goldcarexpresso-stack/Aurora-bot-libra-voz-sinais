import { useEffect, useRef, useState } from 'react'

const ENDERECO_APP = 'https://vlibras.gov.br/app'

const Reconhecimento =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export default function Libras({ aoVoltar }) {
  const [texto, setTexto] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [erroVoz, setErroVoz] = useState('')
  const [situacao, setSituacao] = useState('procurando')
  const recRef = useRef(null)

  useEffect(() => {
    let tentativas = 0
    let jaIniciou = false

    const relogio = setInterval(() => {
      tentativas++

      const wrapper = document.querySelector('[vw-plugin-wrapper]')
      const funcionando = wrapper && wrapper.children.length > 1

      if (funcionando) {
        setSituacao('pronto')
        clearInterval(relogio)
        return
      }

      if (window.VLibras && window.VLibras.Widget && !jaIniciou) {
        jaIniciou = true
        try {
          new window.VLibras.Widget(ENDERECO_APP)
          setSituacao('iniciando')
        } catch {
          setSituacao('falhou')
          clearInterval(relogio)
        }
        return
      }

      if (tentativas > 25) {
        setSituacao(window.VLibras ? 'nao-iniciou' : 'sem-script')
        clearInterval(relogio)
      }
    }, 1000)

    return () => {
      clearInterval(relogio)
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

  const recados = {
    procurando: 'Procurando o avatar do VLibras...',
    iniciando: 'Ligando o avatar. Isso pode demorar alguns segundos.',
    pronto:
      'Avatar pronto. Toque no botão azul com a mão, no canto da tela, e depois no texto grande acima.',
    'sem-script':
      'O programa do VLibras não foi baixado. Pode ser a conexão ou o site do governo estar fora do ar.',
    'nao-iniciou':
      'O programa do VLibras baixou, mas o avatar não ligou neste aparelho.',
    falhou: 'Deu erro ao ligar o avatar do VLibras.',
  }

  const deuRuim =
    situacao === 'sem-script' ||
    situacao === 'nao-iniciou' ||
    situacao === 'falhou'

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

        {deuRuim ? (
          <p className="erro">{recados[situacao]}</p>
        ) : (
          <div className="instrucao">
            <p className="aviso-linha">{recados[situacao]}</p>
          </div>
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
