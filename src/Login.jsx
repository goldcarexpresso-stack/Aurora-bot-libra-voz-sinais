import { useState } from 'react'
import { supabase, conectado } from './supabase.js'

function traduzirErro(mensagem) {
  const m = (mensagem || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('user already registered')) return 'Esse e-mail já tem cadastro. Use Entrar.'
  if (m.includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('email')) return 'Verifique o e-mail digitado.'
  if (m.includes('fetch') || m.includes('network')) return 'Sem conexão. Tente de novo.'
  return 'Não foi possível concluir. Tente de novo.'
}

export default function Login() {
  const [modo, setModo] = useState('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const criando = modo === 'criar'

  async function enviar() {
    setErro('')

    if (!conectado) {
      setErro('O aplicativo não está conectado ao banco de dados.')
      return
    }
    if (!email.trim() || !senha) {
      setErro('Preencha o e-mail e a senha.')
      return
    }
    if (criando && !nome.trim()) {
      setErro('Digite seu nome.')
      return
    }
    if (criando && senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setCarregando(true)
    const resposta = criando
      ? await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { nome: nome.trim() } },
        })
      : await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        })
    setCarregando(false)

    if (resposta.error) setErro(traduzirErro(resposta.error.message))
  }

  function trocarModo() {
    setModo(criando ? 'entrar' : 'criar')
    setErro('')
  }

  return (
    <div className="tela">
      <header className="topo">
        <h1>AURORA</h1>
        <p className="sub">A Luz que Traduz</p>
      </header>

      <div className="form">
        <h2 className="form-titulo">{criando ? 'Criar conta' : 'Entrar'}</h2>

        {criando && (
          <label className="campo">
            <span className="campo-nome">Seu nome</span>
            <input
              className="campo-input"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}

        <label className="campo">
          <span className="campo-nome">E-mail</span>
          <input
            className="campo-input"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="campo">
          <span className="campo-nome">Senha</span>
          <input
            className="campo-input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={criando ? 'new-password' : 'current-password'}
          />
        </label>

        {erro && <p className="erro">{erro}</p>}

        <button className="principal" onClick={enviar} disabled={carregando}>
          {carregando ? 'Aguarde...' : criando ? 'Criar conta' : 'Entrar'}
        </button>

        <button className="secundario" onClick={trocarModo} disabled={carregando}>
          {criando ? 'Já tenho conta' : 'Criar uma conta'}
        </button>
      </div>

      <footer className="rodape">
        Ao criar a conta você recebe um ID da Aurora,
        usado para outras pessoas te encontrarem.
      </footer>
    </div>
  )
}
