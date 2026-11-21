import { TOPICOS } from './ajuda.js'

const DIAS_DE_DICA = 14

function ler(chave) {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // sem armazenamento: a dica volta a aparecer, sem prejuízo
  }
}

export default function Dica({ telaAtual }) {
  let primeiro = ler('aurora_primeiro_uso')
  if (!primeiro) {
    primeiro = String(Date.now())
    gravar('aurora_primeiro_uso', primeiro)
  }

  const dias = (Date.now() - Number(primeiro)) / 86400000
  const topico = TOPICOS.find((t) => t.id === telaAtual)

  if (!topico || dias > DIAS_DE_DICA || ler('aurora_dica_' + telaAtual)) return null

  function entendi() {
    gravar('aurora_dica_' + telaAtual, '1')
    window.dispatchEvent(new Event('aurora-dica'))
  }

  return (
    <div className="dica-tela">
      <span className="dica-icone">💬</span>
      <div className="dica-texto">
        <strong>Dica</strong>
        <p>
          {topico.dica} Toque em <b>Dúvidas</b> aqui embaixo para aprender esta tela. Esta dica some
          sozinha depois de 2 semanas de uso.
        </p>
      </div>
      <button className="dica-ok" onClick={entendi}>
        Entendi
      </button>
    </div>
  )
}
