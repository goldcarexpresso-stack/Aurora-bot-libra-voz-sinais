import { useState } from 'react'
import { supabase } from './supabase.js'

export default function NovaSenha({ aoConcluir }) {
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    setErro('')
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirma) {
      setErro('As duas senhas não são iguais.')
      return
    }
    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setCarregando(false)
    if (error) setErro('Não foi possível salvar a senha. Peça um novo link e tente de novo.')
    else aoConcluir()
  }

  return (
    <div className="tela">
      <header className="topo">
        <h1>AURORA</h1>
        <p className="sub">A Luz que Traduz</p>
      </header>

      <div className="form">
        <h2 className="form-titulo">Nova senha</h2>

        <label className="campo">
          <span className="campo-nome">Nova senha</span>
          <input className="campo-input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
        </label>

        <label className="campo">
          <span className="campo-nome">Repita a nova senha</span>
          <input className="campo-input" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" />
        </label>

        {erro && <p className="erro">{erro}</p>}

        <button className="principal" onClick={salvar} disabled={carregando}>
          {carregando ? 'Aguarde...' : 'Salvar nova senha'}
        </button>
      </div>
    </div>
  )
}
