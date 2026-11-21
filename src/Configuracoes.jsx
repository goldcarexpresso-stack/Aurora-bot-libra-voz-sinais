import { useState } from 'react'
import { supabase } from './supabase.js'
import { lerPrefs, salvarPrefs } from './prefs.js'

const LINHAS = [
  { campo: 'contraste', titulo: 'Contraste alto', texto: 'Bordas e textos mais fortes.' },
  { campo: 'reduzirMovimento', titulo: 'Reduzir animações', texto: 'Tira os pulsos e brilhos da tela.' },
  { campo: 'dicas', titulo: 'Dicas de ajuda', texto: 'Uma dica no topo de cada tela, nas primeiras 2 semanas.' },
]

export default function Configuracoes({ sessao, aoVoltar }) {
  const [p, setP] = useState(lerPrefs)
  const [mensagem, setMensagem] = useState('')

  function mudar(campo) {
    const novo = { ...p, [campo]: !p[campo] }
    setP(novo)
    salvarPrefs(novo)
  }

  function verDicasDeNovo() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('aurora_dica_') || k === 'aurora_primeiro_uso')
        .forEach((k) => localStorage.removeItem(k))
    } catch {
      // sem armazenamento, nada a limpar
    }
    setMensagem('Pronto. As dicas voltam nas próximas telas.')
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Configurações</h2>

        <section className="grupo">
          <h3 className="grupo-titulo">Minha conta</h3>
          <div className="config-linha">
            <div>
              <strong>E-mail</strong>
              <span>{sessao.user.email}</span>
            </div>
          </div>
          <button className="sair" onClick={sair}>
            Sair da conta
          </button>
        </section>

        <section className="grupo">
          <h3 className="grupo-titulo">Acessibilidade</h3>
          {LINHAS.map((l) => (
            <div key={l.campo} className="config-linha">
              <div>
                <strong>{l.titulo}</strong>
                <span>{l.texto}</span>
              </div>
              <button
                className={p[l.campo] ? 'config-chave ligada' : 'config-chave'}
                onClick={() => mudar(l.campo)}
                aria-pressed={!!p[l.campo]}
                aria-label={l.titulo}
              >
                <span />
              </button>
            </div>
          ))}
        </section>

        <section className="grupo">
          <h3 className="grupo-titulo">Ajuda</h3>
          <button className="secundario" onClick={verDicasDeNovo}>
            Ver as dicas de novo
          </button>
          {mensagem && <p className="aviso-linha">{mensagem}</p>}
        </section>

        <section className="grupo">
          <h3 className="grupo-titulo">Sobre</h3>
          <p className="aviso-linha">Aurora · A Luz que Traduz</p>
        </section>
      </div>

      <footer className="rodape">As preferências de acessibilidade valem neste aparelho.</footer>
    </div>
  )
}
