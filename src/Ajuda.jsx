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
        [t.titulo, ...(t.palavras || []), t.dica, ...(t.duvida ? [t.duvida.p, t.duvida.r] : [])].join(' ')
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

  function irParaTela(t) {
    fechar()
    window.dispatchEvent(new CustomEvent('aurora-ir', { detail: t.destino || t.id }))
  }

  if (!aberto) {
    return (
      <button className="ajuda-flutuante" onClick={abrir}>
        💬 Dúvidas
      </button>
    )
  }

  const topico = TOPICOS.find((t) => t.id === escolhido)
  const lista = busca.trim() && achados.length ? achados : TOPICOS

  return (
    <div className="ajd-fundo" onClick={fechar}>
      <div className="ajd-folha" onClick={(e) => e.stopPropagation()}>
        <div className="ajd-topo">
          {topico ? (
            <button className="ajd-voltar" onClick={() => setEscolhido(null)}>
              ‹ Voltar
            </button>
          ) : (
            <strong className="ajd-titulo">Ajuda</strong>
          )}
          <button className="ajd-fechar" onClick={fechar} aria-label="Fechar">
            ✕
          </button>
        </div>

        {!topico && (
          <>
            <input
              className="ajd-busca"
              placeholder="🔎  O que você quer fazer?"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca.trim() && achados.length === 0 && (
              <p className="ajd-vazio">Não achei. Escolha um tema:</p>
            )}
            <div className="ajd-grade">
              {lista.map((t) => (
                <button key={t.id} className="ajd-tile" onClick={() => setEscolhido(t.id)}>
                  <span className="ajd-tile-icone">{t.icone}</span>
                  <span className="ajd-tile-nome">{t.titulo}</span>
                  {t.id === telaAtual && <span className="ajd-aqui">aqui</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {topico && (
          <div className="ajd-detalhe">
            <div className="ajd-hero">
              <span className="ajd-hero-icone">{topico.icone}</span>
              <div>
                <h3>{topico.titulo}</h3>
                <p>{topico.dica}</p>
              </div>
            </div>

            <h4 className="ajd-rotulo">Toque e use</h4>
            <div className="ajd-acoes">
              {topico.acoes.map((a) => (
                <div key={a.nome} className="ajd-acao">
                  <span className="ajd-acao-icone">{a.icone}</span>
                  <strong>{a.nome}</strong>
                  <small>{a.faz}</small>
                </div>
              ))}
            </div>

            <h4 className="ajd-rotulo">Em 3 passos</h4>
            <ol className="ajd-passos">
              {topico.passos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>

            {topico.duvida && (
              <details className="ajd-duvida">
                <summary>{topico.duvida.p}</summary>
                <p>{topico.duvida.r}</p>
              </details>
            )}

            {topico.id === telaAtual ? (
              <button className="botao-neon" onClick={fechar}>
                Entendi
              </button>
            ) : !topico.semTela ? (
              <button className="botao-neon" onClick={() => irParaTela(topico)}>
                Ir para esta tela →
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
