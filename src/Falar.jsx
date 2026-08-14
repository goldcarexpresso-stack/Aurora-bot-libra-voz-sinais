import { useEffect, useRef, useState } from 'react'

const Reconhecimento =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

const temVozFalada =
  typeof window !== 'undefined' && 'speechSynthesis' in window

function ehContinuacao(nova, velha) {
  if (!velha) return false
  const a = nova.toLowerCase()
  const b = velha.toLowerCase()
  return a.startsWith(b) || b.startsWith(a)
}

function traduzirErroVoz(codigo) {
  if (codigo === 'not-allowed' || codigo === 'service-not-allowed')
    return 'Permissão do microfone negada. Libere o microfone nas configurações do navegador.'
  if (codigo === 'audio-capture')
    return 'Nenhum microfone encontrado neste aparelho.'
  if (codigo === 'no-speech') return 'Não consegui ouvir nada. Tente de novo.'
  if (codigo === 'network') return 'Sem conexão. O reconhecimento de voz precisa de internet.'
  return 'O reconhecimento de voz parou. Toque para tentar de novo.'
}

export default function Falar({ aoVoltar }) {
  const [aba, setAba] = useState('ouvir')

  const [ouvindo, setOuvindo] = useState(false)
  const [frases, setFrases] = useState([])
  const [parcial, setParcial] = useState('')
  const [erroOuvir, setErroOuvir] = useState('')
  const recRef = useRef(null)
  const ultimaRef = useRef('')

  const [paraFalar, setParaFalar] = useState('')
  const [falando, setFalando] = useState(false)
  const [erroFalar, setErroFalar] = useState('')

  useEffect(() => {
    return () => {
      if (recRef.current) recRef.current.abort()
      if (temVozFalada) window.speechSynthesis.cancel()
    }
  }, [])

  function guardarFrase(bruto) {
    const limpo = bruto.trim()
    if (!limpo) return

    const anterior = ultimaRef.current

    if (ehContinuacao(limpo, anterior)) {
      const maior = limpo.length >= anterior.length ? limpo : anterior
      ultimaRef.current = maior
      setFrases((antes) => {
        if (antes.length === 0) return [maior]
        return [...antes.slice(0, -1), maior]
      })
      return
    }

    ultimaRef.current = limpo
    setFrases((antes) => [...antes, limpo])
  }

  function comecarOuvir() {
    setErroOuvir('')
    if (!Reconhecimento) {
      setErroOuvir('Este navegador não reconhece voz. Use o Chrome.')
      return
    }

    const rec = new Reconhecimento()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let emAndamento = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          guardarFrase(e.results[i][0].transcript)
        } else {
          emAndamento += e.results[i][0].transcript
        }
      }
      setParcial(emAndamento)
    }

    rec.onerror = (e) => {
      setErroOuvir(traduzirErroVoz(e.error))
    }

    rec.onend = () => {
      setOuvindo(false)
      setParcial('')
    }

    recRef.current = rec
    rec.start()
    setOuvindo(true)
  }

  function pararOuvir() {
    if (recRef.current) recRef.current.stop()
    setOuvindo(false)
  }

  function limpar() {
    setFrases([])
    setParcial('')
    setErroOuvir('')
    ultimaRef.current = ''
  }

  function falar() {
    setErroFalar('')
    if (!temVozFalada) {
      setErroFalar('Este navegador não consegue falar em voz alta.')
      return
    }
    if (!paraFalar.trim()) {
      setErroFalar('Digite alguma coisa primeiro.')
      return
    }

    window.speechSynthesis.cancel()
    const fala = new SpeechSynthesisUtterance(paraFalar.trim())
    fala.lang = 'pt-BR'
    fala.rate = 0.95
    fala.onend = () => setFalando(false)
    fala.onerror = () => {
      setFalando(false)
      setErroFalar('Não foi possível reproduzir a voz.')
    }
    setFalando(true)
    window.speechSynthesis.speak(fala)
  }

  function pararFala() {
    window.speechSynthesis.cancel()
    setFalando(false)
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="abas">
        <button
          className={aba === 'ouvir' ? 'aba aba-ativa' : 'aba'}
          onClick={() => setAba('ouvir')}
        >
          👂 Ouvir
        </button>
        <button
          className={aba === 'falar' ? 'aba aba-ativa' : 'aba'}
          onClick={() => setAba('falar')}
        >
          🔊 Falar por mim
        </button>
      </div>

      {aba === 'ouvir' && (
        <div className="bloco">
          {ouvindo && (
            <p className="indicador">🎤 Microfone ligado — ouvindo agora</p>
          )}

          <p className="dica-libras">
            🤟 Para ver em Libras: toque no texto abaixo e depois no botão azul
            da mãozinha.
          </p>

          <div className="transcricao">
            {frases.length === 0 && !parcial && (
              <p className="transcricao-vazia">
                Toque em Começar a ouvir e peça para a pessoa falar.
                O que ela disser aparece aqui.
              </p>
            )}
            {frases.map((f, i) => (
              <p key={i} className="transcricao-texto frase">
                {f}
              </p>
            ))}
            {parcial && <p className="transcricao-parcial">{parcial}</p>}
          </div>

          {erroOuvir && <p className="erro">{erroOuvir}</p>}

          {ouvindo ? (
            <button className="principal perigo" onClick={pararOuvir}>
              Parar de ouvir
            </button>
          ) : (
            <button className="principal" onClick={comecarOuvir}>
              Começar a ouvir
            </button>
          )}

          {(frases.length > 0 || parcial) && (
            <button className="secundario" onClick={limpar}>
              Limpar
            </button>
          )}
        </div>
      )}

      {aba === 'falar' && (
        <div className="bloco">
          <label className="campo">
            <span className="campo-nome">Escreva o que quer dizer</span>
            <textarea
              className="campo-input area"
              rows={5}
              value={paraFalar}
              onChange={(e) => setParaFalar(e.target.value)}
            />
          </label>

          {falando && <p className="indicador">🔊 Falando em voz alta</p>}

          {erroFalar && <p className="erro">{erroFalar}</p>}

          {falando ? (
            <button className="principal perigo" onClick={pararFala}>
              Parar
            </button>
          ) : (
            <button className="principal" onClick={falar}>
              Falar em voz alta
            </button>
          )}
        </div>
      )}

      <footer className="rodape">
        Esta tela usa voz e texto em português.
        Cada fala nova entra em uma linha separada.
      </footer>
    </div>
  )
}
