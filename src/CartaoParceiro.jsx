function idYoutube(url) {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

function ehWhatsApp(url) {
  return !!url && /wa\.me|whatsapp/i.test(url)
}

export default function CartaoParceiro({ p, compacto = false }) {
  const idVideo = idYoutube(p.video)
  const wa = ehWhatsApp(p.link)
  const rotulo = p.botao || (wa ? 'Chamar no WhatsApp' : 'Visitar o site')

  return (
    <div className={compacto ? 'cartao-parceiro compacto' : 'cartao-parceiro'}>
      <span className="cartao-parceiro-selo">Patrocinado</span>

      {idVideo ? (
        <iframe
          className="cartao-parceiro-midia"
          src={`https://www.youtube-nocookie.com/embed/${idVideo}?autoplay=1&mute=1&loop=1&playlist=${idVideo}&controls=0&playsinline=1&modestbranding=1`}
          title={p.nome}
          allow="autoplay; encrypted-media"
        />
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
