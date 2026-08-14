import { useEffect, useRef, useState } from 'react'
import { AMOSTRAS, TAXA, carregarReconhecedor, reconhecer } from './sons.js'

const LIMIARES = { baixa: 60, media: 42, alta: 28 }
const ESPERA_ENTRE_ALERTAS = 3000
const CONFIANCA_MINIMA = 0.2

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
  const noRef = useRef(null)
  const rafRef = useRef(null)
  const ultimoRef = useRef(0)
  const limiarRef = useRef(LIMIARES.media)
  const bufferRef = useRef(new Float32Array(AMOSTRAS))
  const posRef = useRef(0)
  const cheioRef = useRef(false)
  const recRef = useRef(null)
  const ocupadoRef = useRef(false)

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

    if (noRef.current) {
      noRef.current.disconnect()
      noRef.current.onaudioprocess = null
      noRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
    posRef.current = 0
    cheioRef.current = false
    setLigado(false)
    setNivel(0)
    setAlerta(false)
  }

  function ordenar() {
    const buffer = bufferRef.current
    if (!cheioRef.current) return buffer.slice(0, posRef.current)
    const saida = new Float32Array(AMOSTRAS)
    const corte = posRef.current
    saida.set(buffer.subarray(corte), 0)
    saida.set(buffer.subarray(0, corte), AMOSTRAS - corte)
    return saida
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
    if (ocupadoRef.current || !recRef.current) return null
    if (!cheioRef.current && posRef.current < AMOSTRAS) return null

    ocupadoRef.current = true
    try {
      return reconhecer(recRef.current, ordenar())
    } catch {
      return { erro: 'Falha ao analisar o som.' }
    } finally {
      ocupadoRef.current = false
    }
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
    const fonte = ctx.createMediaStreamSource(stream)

    const analisador = ctx.createAnalyser()
    analisador.fftSize = 1024
    fonte.connect(analisador)

    const coletor = ctx.createScriptProcessor(4096, 1, 1)
    const mudo = ctx.createGain()
    mudo.gain.value = 0

    coletor.onaudioprocess = (evento) => {
      const dados = evento.inputBuffer.getChannelData(0)
      const buffer = bufferRef.current
      for (let i = 0; i < dados.length; i++) {
        buffer[posRef.current] = dados[i]
        posRef.current++
        if (posRef.current >= AMOSTRAS) {
          posRef.current = 0
          cheioRef.current = true
        }
      }
    }

    fonte.connect(coletor)
    coletor.connect(mudo)
    mudo.connect(ctx.destination)

    streamRef.current = stream
    ctxRef.current = ctx
    noRef.current = coletor
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

          const achado = analisar()

          if (!achado) {
            registrar('Som forte detectado', 'reconhecedor ainda não pronto')
          } else if (achado.erro) {
            registrar('Som forte detectado', achado.erro)
          } else if (achado.nota >= CONFIANCA_MINIMA) {
            registrar(
              'Possível ' + achado.texto,
              'certeza ' + porcento(achado.nota) +
                ' · modelo apontou ' + achado.geral + ' (' + porcento(achado.notaGeral) + ')'
            )
          } else {
            registrar(
              'Som forte, tipo não identificado',
              'modelo apontou ' + achado.geral + ' (' + porcento(achado.notaGeral) + ')'
            )
          }
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
