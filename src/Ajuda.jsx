import { useMemo, useState } from 'react'
import { TOPICOS } from './ajuda.js'

function semAcento(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function Ajuda({ telaAtual = 'inicio' }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState(null)

  const achados = useMemo(() => {
    const q = semAcento(busca).trim()
    if (!q) return []
    const palavras = q.split(/\s+/).filter((w) => w.length > 2)
    return TOPICOS.filter((t) => {
      const texto = semAcento(
        [t.titulo, ...(t.palavras || []), ...(t.duvidas || []).flatMap((d) => [d.p, d.r])].join(' ')
      )
      return palavras.some((w) => texto.includes(w))
    })
  }, [busca])

  function abrir() {
    setBusca('')
    setEscolhido(telaAtual)
    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setBusca('')
    setEscolhido(null)
  }

  if (!aberto) {
    return (
      <button className="ajuda-flutuante" onClick={abrir}>
        💬 Dúvidas
      </button>
    )
  }

  const topico = TOPICOS.find((t) => t.id === escolhido)
  const mostrarLista = !topico

  return (
    <div className="ajuda-fundo" onClick={fechar}>
      <div className="ajuda-folha" onClick={(e) => e.stopPropagation()}>
        <div className="ajuda-topo">
          <strong>Ajuda do Aurora</strong>
          <button className="ajuda-fechar" onClick={fechar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <input
          className="campo-input"
          placeholder="Digite sua dúvida, ex.: como ligar o aviso"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            setEscolhido(null)
          }}
        />

        {mostrarLista && busca.trim() && achados.length === 0 && (
          <p className="aviso-linha">Não encontrei. Escolha um tema abaixo.</p>
        )}

        {mostrarLista && (
          <div className="ajuda-lista">
            {(busca.trim() && achados.length ? achados : TOPICOS).map((t) => (
              <button key={t.id} className="ajuda-item" onClick={() => setEscolhido(t.id)}>
                <span className="ajuda-item-icone">{t.icone}</span>
                <span>
                  {t.titulo}
                  {t.id === telaAtual && <em className="ajuda-voce"> · você está aqui</em>}
                </span>
                <span className="ajuda-seta">›</span>
              </button>
            ))}
          </div>
        )}

        {topico && (
          <div className="ajuda-detalhe">
            <button className="voltar" onClick={() => setEscolhido(null)}>
              ← Todas as ajudas
            </button>

            <h3 className="ajuda-titulo">
              <span>{topico.icone}</span> {topico.titulo}
            </h3>
            <p className="ajuda-dica">{topico.dica}</p>

            {topico.botoes.length > 0 && (
              <>
                <h4 className="grupo-titulo">Botões desta tela</h4>
                {topico.botoes.map((b) => (
                  <div key={b.nome} className="ajuda-botao-linha">
                    <strong>{b.nome}</strong>
                    <span>{b.faz}</span>
                  </div>
                ))}
              </>
            )}

            <h4 className="grupo-titulo">Passo a passo</h4>
            <ol className="ajuda-passos">
              {topico.passos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>

            {topico.duvidas.length > 0 && (
              <>
                <h4 className="grupo-titulo">Dúvidas comuns</h4>
                {topico.duvidas.map((d) => (
                  <details key={d.p} className="ajuda-duvida">
                    <summary>{d.p}</summary>
                    <p>{d.r}</p>
                  </details>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
