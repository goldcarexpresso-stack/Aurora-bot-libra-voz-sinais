import { useEffect, useRef, useState } from 'react'
import { AMOSTRAS, TAXA, carregarReconhecedor, reconhecer } from './sons.js'

const LIMIARES = { baixa: 60, media: 42, alta: 28 }
const ESPERA_ENTRE_ALERTAS = 3000
const CONFIANCA_MINIMA = 0.18
const CONFIANCA_SOZINHA = 0.5
const INTERVALO_ANALISE = 700
const VALIDADE = 2500
const JANELA = 16384

const Reconhecimento =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

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
  const [modo, setModo] = useState('parado')
  const [nivel, setNivel] = useState(0)
  const [sensibilidade, setSensibilidade] = useState('media')
  const [eventos, setEventos] = useState([])
  const [alerta, setAlerta] = useState(false)
  const [erro, setErro] = useState('')
  const [modelo, setModelo] = useState('parado')
  const [falaParcial, setFalaParcial] = useState('')

  const ctxRef = useRef(null)
  const streamRef = useRef(null)
  const capturaRef = useRef(null)
  const rafRef = useRef(null)
  const ultimoAlertaRef = useRef(0)
  const ultimaAnaliseRef = useRef(0)
  const melhorRef = useRef(null)
  const limiarRef = useRef(LIMIARES.media)
  const recRef = useRef(null)
  const vozRef = useRef(null)
  const querVozRef = useRef(false)

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
      desligarSons()
      pararVoz()
    }
  }, [])

  function registrar(texto, detalhe) {
    setEventos((antes) =>
      [{ id: Date.now() + Math.random(), hora: agora(), texto, detalhe }, ...antes].slice(0, 15)
    )
    setAlerta(true)
    if (navigator.vibrate) navigator.vibrate([300, 120, 300])
    setTimeout(() => setAlerta(false), 2500)
  }

  /* ---------- modo fala ---------- */

  function pararVoz() {
    querVozRef.current = false
    if (vozRef.current) {
      vozRef.current.onend = null
      vozRef.current.onresult = null
      vozRef.current.abort()
      vozRef.current = null
    }
    setFalaParcial('')
  }

  function comecarVoz() {
    if (!Reconhecimento) {
      setErro('Este navegador não escreve o que as pessoas falam. Use o Chrome.')
      return
    }
    if (vozRef.current) return

    querVozRef.current = true

    const voz = new Reconhecimento()
    voz.lang = 'pt-BR'
    voz.continuous = true
    voz.interimResults = true

    voz.onresult = (e) => {
      let finais = ''
      let parcial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const trecho = e.results[i][0].transcript
        if (e.results[i].isFinal) finais += trecho
        else parcial += trecho
      }
      if (finais.trim()) registrar(finais.trim(), 'fala')
      setFalaParcial(parcial)
    }

    voz.onerror = (e) => {
      if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) {
        querVozRef.current = false
        setErro('Permissão do microfone negada. Libere nas configurações do navegador.')
        setModo('parado')
      }
    }

    voz.onend = () => {
      vozRef.current = null
      if (querVozRef.current) {
        setTimeout(() => {
          if (querVozRef.current) comecarVoz()
        }, 400)
      }
    }

    vozRef.current = voz
    try {
      voz.start()
    } catch {
      vozRef.current = null
    }
  }

  /* ---------- modo sons ---------- */

  function desligarSons() {
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
    setNivel(0)
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

  async function ligarSons() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErro('Este navegador não dá acesso ao microfone.')
      return false
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
      return false
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
    return true
  }

  /* ---------- troca de modo ---------- */

  async function irPara(novo) {
    setErro('')

    if (novo === modo) {
      desligarSons()
      pararVoz()
      setModo('parado')
      return
    }

    desligarSons()
    pararVoz()

    if (novo === 'sons') {
      const deu = await ligarSons()
      setModo(deu ? 'sons' : 'parado')
      return
    }

    if (novo === 'fala') {
      setModo('fala')
      comecarVoz()
    }
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Sentir o ambiente</h2>

        {modo !== 'parado' && (
          <p className="indicador">
            {modo === 'sons'
              ? '🎤 Microfone ligado — escutando os sons'
              : '🎤 Microfone ligado — escrevendo as falas'}
          </p>
        )}

        {alerta && (
          <div className="alerta-forte">
            <span className="alerta-icone">⚠️</span>
            <strong>
              {modo === 'fala' ? 'Alguém falou' : 'Som detectado perto de você'}
            </strong>
          </div>
        )}

        {modo === 'fala' && (
          <div className="transcricao">
            {!falaParcial && eventos.length === 0 && (
              <p className="transcricao-vazia">
                Escutando. Peça para a pessoa falar perto do celular.
              </p>
            )}
            {falaParcial && <p className="transcricao-parcial">{falaParcial}</p>}
            {!falaParcial && eventos[0] && eventos[0].detalhe === 'fala' && (
              <p className="transcricao-texto">{eventos[0].texto}</p>
            )}
          </div>
        )}

        {modo === 'sons' && (
          <div className="medidor">
            <div className="medidor-barra">
              <div
                className={nivel >= LIMIARES[sensibilidade] ? 'medidor-nivel alto' : 'medidor-nivel'}
                style={{ width: nivel + '%' }}
              />
            </div>
            <p className="medidor-texto">Som agora: {nivel}</p>
          </div>
        )}

        {erro && <p className="erro">{erro}</p>}

        <button
          className={modo === 'sons' ? 'principal perigo' : 'principal'}
          onClick={() => irPara('sons')}
        >
          {modo === 'sons' ? 'Parar' : '👁️ Detectar sons do ambiente'}
        </button>

        <button
          className={modo === 'fala' ? 'principal perigo' : 'secundario'}
          onClick={() => irPara('fala')}
          disabled={!Reconhecimento}
        >
          {modo === 'fala' ? 'Parar' : '💬 Escutar as pessoas falando'}
        </button>

        {modo === 'sons' && modelo === 'falhou' && (
          <p className="erro">
            O reconhecedor de sons não carregou. O aviso de som forte continua
            funcionando, mas sem dizer o tipo.
          </p>
        )}

        {modo === 'sons' && modelo === 'baixando' && (
          <div className="instrucao">
            <p className="aviso-linha">
              Baixando o reconhecedor de sons. Pode demorar na primeira vez.
            </p>
          </div>
        )}

        {modo === 'fala' && (
          <div className="instrucao">
            <p className="aviso-linha">
              Neste modo o áudio é enviado ao serviço de voz do navegador (Google)
              para virar texto. A detecção de sirene, campainha e outros sons fica
              pausada enquanto ele estiver ligado.
            </p>
          </div>
        )}

        {modo === 'sons' && (
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
        )}

        {eventos.length > 0 && (
          <section className="grupo">
            <h3 className="grupo-titulo">O que aconteceu</h3>
            {eventos.map((e) => (
              <div key={e.id} className="evento">
                <strong className="evento-hora">{e.hora}</strong>
                <span className="evento-texto">
                  {e.detalhe === 'fala' ? '💬 ' + e.texto : e.texto}
                </span>
                {e.detalhe && e.detalhe !== 'fala' && (
                  <span className="evento-detalhe">{e.detalhe}</span>
                )}
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="rodape">
        Um modo por vez, porque os dois disputam o microfone.
        Os sons do ambiente são analisados dentro do celular e nada é gravado.
        Só funciona com esta tela aberta.
      </footer>
    </div>
  )
}
