import { useEffect, useRef, useState } from 'react'
import { AMOSTRAS, TAXA, carregarReconhecedor, reconhecer } from './sons.js'

const LIMIARES = { baixa: 60, media: 42, alta: 28 }
const ESPERA_ENTRE_ALERTAS = 3000
const CONFIANCA_MINIMA = 0.18
const CONFIANCA_SOZINHA = 0.5
const INTERVALO_ANALISE = 700
const VALIDADE = 2500
const JANELA = 16384

function agora() {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function porcento(n) {
  return Math.round((n || 0) * 100) + '%'
}

export default function Ambiente({ aoVoltar }) {
  const [ligado, setLigado] = useState(false)
  const [nivel, setNivel] = useState(0)
  const [sensibilidade, setSensibilidade] = useState('media')
  const [eventos, setEventos] = useState([])
  const [alerta, setAlerta] = useState(false)
  const [erro, setErro] = useState('')
  const [modelo, setModelo] = useState('parado')

  const ctxRef = useRef(null)
  const streamRef = useRef(null)
  const capturaRef = useRef(null)
  const rafRef = useRef(null)
  const ultimoAlertaRef = useRef(0)
  const ultimaAnaliseRef = useRef(0)
  const melhorRef = useRef(null)
  const limiarRef = useRef(LIMIARES.media)
  const recRef = useRef(null)

  useEffect(() => {
    limiarRef.current = LIMIARES[sensibilidade]
  }, [sensibilidade])

  useEffect(() => {
    let vivo = true
    setModelo('baixando')

    carregarReconhecedor()
      .then((r) => {
        if (!vivo) return
        recRef.current = r
        setModelo('pronto')
      })
      .catch(() => {
        if (vivo) setModelo('falhou')
      })

    return () => {
      vivo = false
      desligar()
    }
  }, [])

  function desligar() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    capturaRef.current = null
    melhorRef.current = null

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

  function registrar(texto, detalhe) {
    setEventos((antes) =>
      [{ id: Date.now() + Math.random(), hora: agora(), texto, detalhe }, ...antes].slice(0, 15)
    )
    setAlerta(true)
    if (navigator.vibrate) navigator.vibrate([300, 120, 300])
    setTimeout(() => setAlerta(false), 2500)
  }

  function analisar() {
    const captura = capturaRef.current
    if (!captura || !recRef.current) return null

    const janela = new Float32Array(JANELA)
    captura.getFloatTimeDomainData(janela)

    const onda = janela.slice(JANELA - AMOSTRAS)

    let pico = 0
    for (let i = 0; i < onda.length; i++) {
      const v = Math.abs(onda[i])
      if (v > pico) pico = v
    }
    if (pico < 0.004) return null

    if (pico < 0.85) {
      const ganho = 0.9 / pico
      for (let i = 0; i < onda.length; i++) onda[i] = onda[i] * ganho
    }

    try {
      return reconhecer(recRef.current, onda)
    } catch {
      return null
    }
  }

  function melhorRecente() {
    const m = melhorRef.current
    if (!m) return null
    if (Date.now() - m.quando > VALIDADE) return null
    return m
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
    const ctx = new Contexto({ sampleRate: TAXA })
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        // segue mesmo assim
      }
    }

    const fonte = ctx.createMediaStreamSource(stream)

    const medidor = ctx.createAnalyser()
    medidor.fftSize = 1024
    fonte.connect(medidor)

    const captura = ctx.createAnalyser()
    captura.fftSize = JANELA
    fonte.connect(captura)

    streamRef.current = stream
    ctxRef.current = ctx
    capturaRef.current = captura
    melhorRef.current = null
    setLigado(true)

    const dados = new Uint8Array(medidor.fftSize)

    function medir() {
      medidor.getByteTimeDomainData(dados)

      let soma = 0
      for (let i = 0; i < dados.length; i++) {
        const desvio = (dados[i] - 128) / 128
        soma += desvio * desvio
      }
      const rms = Math.sqrt(soma / dados.length)
      const valor = Math.min(100, Math.round(rms * 320))

      setNivel(valor)

      const instante = Date.now()

      if (instante - ultimaAnaliseRef.current > INTERVALO_ANALISE) {
        ultimaAnaliseRef.current = instante
        const achado = analisar()

        if (achado && achado.texto) {
          const anterior = melhorRecente()
          if (!anterior || achado.nota > anterior.nota) {
            melhorRef.current = {
              texto: achado.texto,
              nota: achado.nota,
              geral: achado.geral,
              notaGeral: achado.notaGeral,
              quando: instante,
            }
          }
        }
      }

      const forte = valor >= limiarRef.current
      const bom = melhorRecente()
      const certeza = bom && bom.nota >= CONFIANCA_SOZINHA

      if ((forte || certeza) && instante - ultimoAlertaRef.current > ESPERA_ENTRE_ALERTAS) {
        ultimoAlertaRef.current = instante

        if (bom && bom.nota >= CONFIANCA_MINIMA) {
          registrar(
            'Possível ' + bom.texto,
            'certeza ' + porcento(bom.nota) +
              ' · modelo apontou ' + bom.geral + ' (' + porcento(bom.notaGeral) + ')'
          )
          melhorRef.current = null
        } else {
          registrar('Som forte, tipo não identificado', '')
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
            <strong>Som detectado perto de você</strong>
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

        {modelo === 'falhou' ? (
          <p className="erro">
            O reconhecedor de sons não carregou. O aviso de som forte continua
            funcionando, mas sem dizer o tipo.
          </p>
        ) : (
          modelo !== 'parado' && (
            <div className="instrucao">
              <p className="aviso-linha">
                {modelo === 'baixando'
                  ? 'Baixando o reconhecedor de sons. Pode demorar na primeira vez.'
                  : 'Reconhecedor de sons pronto.'}
              </p>
            </div>
          )
        )}

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
                <span className="evento-texto">{e.texto}</span>
                {e.detalhe && <span className="evento-detalhe">{e.detalhe}</span>}
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="rodape">
        O som é analisado dentro do seu celular. Nada é gravado nem enviado.
        O tipo de som é uma possibilidade, não uma certeza.
        Só funciona com esta tela aberta.
      </footer>
    </div>
  )
}
