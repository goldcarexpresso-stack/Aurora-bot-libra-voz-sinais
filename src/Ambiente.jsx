import { useEffect, useRef, useState } from 'react'

const LIMIARES = { baixa: 60, media: 42, alta: 28 }
const ESPERA_ENTRE_ALERTAS = 3000

function agora() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function Ambiente({ aoVoltar }) {
  const [ligado, setLigado] = useState(false)
  const [nivel, setNivel] = useState(0)
  const [sensibilidade, setSensibilidade] = useState('media')
  const [eventos, setEventos] = useState([])
  const [alerta, setAlerta] = useState(false)
  const [erro, setErro] = useState('')

  const ctxRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const ultimoRef = useRef(0)
  const limiarRef = useRef(LIMIARES.media)

  useEffect(() => {
    limiarRef.current = LIMIARES[sensibilidade]
  }, [sensibilidade])

  useEffect(() => {
    return () => desligar()
  }, [])

  function desligar() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
    setLigado(false)
    setNivel(0)
    setAlerta(false)
  }

  async function ligar() {
    setErro('')

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErro('Este navegador não dá acesso ao microfone.')
      return
    }

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (e) {
      if (e && e.name === 'NotAllowedError') {
        setErro('Permissão do microfone negada. Libere nas configurações do navegador.')
      } else {
        setErro('Não foi possível abrir o microfone.')
      }
      return
    }

    const Contexto = window.AudioContext || window.webkitAudioContext
    const ctx = new Contexto()
    const fonte = ctx.createMediaStreamSource(stream)
    const analisador = ctx.createAnalyser()
    analisador.fftSize = 1024

    fonte.connect(analisador)

    streamRef.current = stream
    ctxRef.current = ctx
    setLigado(true)

    const dados = new Uint8Array(analisador.fftSize)

    function medir() {
      analisador.getByteTimeDomainData(dados)

      let soma = 0
      for (let i = 0; i < dados.length; i++) {
        const desvio = (dados[i] - 128) / 128
        soma += desvio * desvio
      }
      const rms = Math.sqrt(soma / dados.length)
      const valor = Math.min(100, Math.round(rms * 320))

      setNivel(valor)

      if (valor >= limiarRef.current) {
        const instante = Date.now()
        if (instante - ultimoRef.current > ESPERA_ENTRE_ALERTAS) {
          ultimoRef.current = instante
          setAlerta(true)
          setEventos((antes) =>
            [{ id: instante, hora: agora(), forca: valor }, ...antes].slice(0, 12)
          )
          if (navigator.vibrate) navigator.vibrate([300, 120, 300])
          setTimeout(() => setAlerta(false), 2500)
        }
      }

      rafRef.current = requestAnimationFrame(medir)
    }

    medir()
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Sentir o ambiente</h2>

        {ligado && (
          <p className="indicador">🎤 Microfone ligado — escutando agora</p>
        )}

        {alerta && (
          <div className="alerta-forte">
            <span className="alerta-icone">⚠️</span>
            <strong>Som forte detectado perto de você</strong>
          </div>
        )}

        <div className="medidor">
          <div className="medidor-barra">
            <div
              className={nivel >= LIMIARES[sensibilidade] ? 'medidor-nivel alto' : 'medidor-nivel'}
              style={{ width: nivel + '%' }}
            />
          </div>
          <p className="medidor-texto">
            {ligado ? 'Som agora: ' + nivel : 'Desligado'}
          </p>
        </div>

        {erro && <p className="erro">{erro}</p>}

        {ligado ? (
          <button className="principal perigo" onClick={desligar}>
            Parar de escutar
          </button>
        ) : (
          <button className="principal" onClick={ligar}>
            Começar a escutar
          </button>
        )}

        <div className="campo">
          <span className="campo-nome">Sensibilidade do alerta</span>
          <div className="abas">
            <button
              className={sensibilidade === 'baixa' ? 'aba aba-ativa' : 'aba'}
              onClick={() => setSensibilidade('baixa')}
            >
              Baixa
            </button>
            <button
              className={sensibilidade === 'media' ? 'aba aba-ativa' : 'aba'}
              onClick={() => setSensibilidade('media')}
            >
              Média
            </button>
            <button
              className={sensibilidade === 'alta' ? 'aba aba-ativa' : 'aba'}
              onClick={() => setSensibilidade('alta')}
            >
              Alta
            </button>
          </div>
        </div>

        {eventos.length > 0 && (
          <section className="grupo">
            <h3 className="grupo-titulo">O que aconteceu</h3>
            {eventos.map((e) => (
              <div key={e.id} className="evento">
                <strong className="evento-hora">{e.hora}</strong>
                <span className="evento-texto">
                  Som forte detectado (força {e.forca})
                </span>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="rodape">
        O som é analisado dentro do seu celular. Nada é gravado nem enviado.
        Esta versão avisa que houve um som forte, mas ainda não sabe dizer
        que tipo de som foi. Só funciona com esta tela aberta.
      </footer>
    </div>
  )
}
