import { useEffect, useRef, useState } from 'react'

export function idYoutube(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

// Diz de que tipo é o vídeo do anunciante
export function tipoVideo(url) {
  if (!url) return null
  if (idYoutube(url)) return 'youtube'
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return 'arquivo'
  if (/vimeo\.com\/\d+/.test(url)) return 'vimeo'
  if (/tiktok\.com\/.*video\/\d+/.test(url)) return 'tiktok'
  if (/instagram\.com\/(p|reel)\/[\w-]+/.test(url)) return 'instagram'
  return null
}

function linkIncorporado(url, tipo, som) {
  if (tipo === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${idYoutube(url)}?autoplay=1&mute=${som ? 0 : 1}&enablejsapi=1&controls=0&playsinline=1&modestbranding=1`
  }
  if (tipo === 'vimeo') {
    const id = url.match(/vimeo\.com\/(\d+)/)[1]
    return `https://player.vimeo.com/video/${id}?autoplay=1&muted=${som ? 0 : 1}&playsinline=1`
  }
  if (tipo === 'tiktok') {
    const id = url.match(/video\/(\d+)/)[1]
    return `https://www.tiktok.com/embed/v2/${id}`
  }
  if (tipo === 'instagram') {
    const m = url.match(/instagram\.com\/(p|reel)\/([\w-]+)/)
    return `https://www.instagram.com/${m[1]}/${m[2]}/embed`
  }
  return null
}

function ehWhatsApp(url) {
  return !!url && /wa\.me|whatsapp/i.test(url)
}

export default function CartaoParceiro({ p, compacto = false, aoTerminar }) {
  const tipo = tipoVideo(p.video)
  const wa = ehWhatsApp(p.link)
  const rotulo = p.botao || (wa ? 'Chamar no WhatsApp' : 'Visitar o site')
  const [som, setSom] = useState(false)
  const frame = useRef(null)
  // O vídeo sempre começa mudo; o som é ligado por comando, sem recarregar o player
  const incorporado = tipo && tipo !== 'arquivo' ? linkIncorporado(p.video, tipo, false) : null
  const temBotaoSom = tipo === 'arquivo' || tipo === 'youtube' || tipo === 'vimeo'

  // Vídeo do YouTube: avisa quando termina para passar ao próximo
  useEffect(() => {
    if (tipo !== 'youtube' || !aoTerminar) return
    function ouvir(e) {
      if (!frame.current || e.source !== frame.current.contentWindow) return
      let d = e.data
      try {
        if (typeof d === 'string') d = JSON.parse(d)
      } catch {
        return
      }
      const terminou =
        (d && d.event === 'onStateChange' && d.info === 0) ||
        (d && d.event === 'infoDelivery' && d.info && d.info.playerState === 0)
      if (terminou) aoTerminar()
    }
    window.addEventListener('message', ouvir)
    return () => window.removeEventListener('message', ouvir)
  }, [tipo, aoTerminar])

  function alternarSom() {
    const novo = !som
    setSom(novo)
    const janela = frame.current && frame.current.contentWindow
    if (!janela) return
    if (tipo === 'youtube') {
      janela.postMessage(JSON.stringify({ event: 'command', func: novo ? 'unMute' : 'mute', args: [] }), '*')
      if (novo) janela.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*')
    }
    if (tipo === 'vimeo') {
      janela.postMessage(JSON.stringify({ method: 'setVolume', value: novo ? 1 : 0 }), '*')
    }
  }

  function aoCarregarIframe() {
    if (tipo === 'youtube' && frame.current && frame.current.contentWindow) {
      frame.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*')
    }
  }

  return (
    <div className={compacto ? 'cartao-parceiro compacto' : 'cartao-parceiro'}>
      <span className="cartao-parceiro-selo">Patrocinado</span>

      {tipo === 'arquivo' ? (
        <div className="cartao-parceiro-videowrap">
          <video
            className="cartao-parceiro-midia"
            src={p.video}
            autoPlay
            playsInline
            muted={!som}
            onEnded={aoTerminar}
          />
          <button className="video-som" onClick={() => setSom(!som)}>
            {som ? '🔇 Desligar som' : '🔊 Ligar som'}
          </button>
        </div>
      ) : incorporado ? (
        <div className="cartao-parceiro-videowrap">
          <iframe
            ref={frame}
            onLoad={aoCarregarIframe}
            className="cartao-parceiro-midia"
            src={incorporado}
            title={p.nome}
            allow="autoplay; encrypted-media; fullscreen"
          />
          {temBotaoSom && (
            <button className="video-som" onClick={alternarSom}>
              {som ? '🔇 Desligar som' : '🔊 Ligar som'}
            </button>
          )}
        </div>
      ) : p.imagem ? (
        <img src={p.imagem} alt={p.nome} className="cartao-parceiro-midia" />
      ) : null}

      <div className="cartao-parceiro-texto">
        <strong>{p.nome}</strong>
        {p.descricao && <span>{p.descricao}</span>}
      </div>

      {p.link && (
        <a
          className={wa ? 'cartao-botao cartao-botao-wa' : 'cartao-botao cartao-botao-site'}
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {rotulo}
        </a>
      )}

      {p.video && !incorporado && tipo !== 'arquivo' && (
        <a className="cartao-botao cartao-botao-site" href={p.video} target="_blank" rel="noopener noreferrer">
          ▶ Ver vídeo
        </a>
      )}
    </div>
  )
}
