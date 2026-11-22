import { useEffect, useRef, useState } from 'react'

function idYoutube(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

function ehWhatsApp(url) {
  return !!url && /wa\.me|whatsapp/i.test(url)
}

export default function CartaoParceiro({ p, compacto = false, aoTerminar }) {
  const idVideo = idYoutube(p.video)
  const wa = ehWhatsApp(p.link)
  const rotulo = p.botao || (wa ? 'Chamar no WhatsApp' : 'Visitar o site')
  const [som, setSom] = useState(false)
  const frame = useRef(null)

  // Ouve o YouTube: quando o vídeo termina, avisa para passar para o próximo
  useEffect(() => {
    if (!idVideo || !aoTerminar) return
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
  }, [idVideo, aoTerminar])

  function aoCarregarVideo() {
    if (frame.current && frame.current.contentWindow) {
      frame.current.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*')
    }
  }

  return (
    <div className={compacto ? 'cartao-parceiro compacto' : 'cartao-parceiro'}>
      <span className="cartao-parceiro-selo">Patrocinado</span>

      {idVideo ? (
        <div className="cartao-parceiro-videowrap">
          <iframe
            ref={frame}
            onLoad={aoCarregarVideo}
            className="cartao-parceiro-midia"
            src={`https://www.youtube-nocookie.com/embed/${idVideo}?autoplay=1&mute=${som ? 0 : 1}&enablejsapi=1&controls=0&playsinline=1&modestbranding=1`}
            title={p.nome}
            allow="autoplay; encrypted-media"
          />
          <button className="video-som" onClick={() => setSom(!som)}>
            {som ? '🔇 Desligar som' : '🔊 Ligar som'}
          </button>
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

      {p.video && !idVideo && (
        <a className="cartao-botao cartao-botao-site" href={p.video} target="_blank" rel="noopener noreferrer">
          ▶ Ver vídeo
        </a>
      )}
    </div>
  )
}
