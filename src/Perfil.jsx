import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

export default function Perfil({ sessao, aoVoltar }) {
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let ativo = true

    async function buscar() {
      const { data, error } = await supabase
        .from('perfis')
        .select('aurora_id, nome, criado_em')
        .eq('id', sessao.user.id)
        .maybeSingle()

      if (!ativo) return
      if (error) setErro('Não foi possível carregar seu perfil.')
      else if (!data) setErro('Seu perfil ainda não foi criado no banco.')
      else setPerfil(data)
      setCarregando(false)
    }

    buscar()
    return () => {
      ativo = false
    }
  }, [sessao])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(perfil.aurora_id)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não foi possível copiar. Anote o ID manualmente.')
    }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="perfil">
        <h2 className="form-titulo">Meu perfil</h2>

        {carregando && <p className="aviso-texto">Carregando...</p>}

        {erro && <p className="erro">{erro}</p>}

        {perfil && (
          <>
            <div className="perfil-linha">
              <span className="campo-nome">Nome</span>
              <strong className="perfil-valor">{perfil.nome || 'Sem nome'}</strong>
            </div>

            <div className="perfil-linha">
              <span className="campo-nome">Meu ID da Aurora</span>
              <strong className="perfil-id">{perfil.aurora_id}</strong>
            </div>

            <button className="secundario" onClick={copiar}>
              {copiado ? 'Copiado!' : 'Copiar meu ID'}
            </button>

            <div className="perfil-linha">
              <span className="campo-nome">E-mail</span>
              <strong className="perfil-valor">{sessao.user.email}</strong>
            </div>
          </>
        )}

        <button className="sair" onClick={sair}>
          Sair da conta
        </button>
      </div>

      <footer className="rodape">
        Compartilhe seu ID com quem você quiser que possa te encontrar na Aurora.
      </footer>
    </div>
  )
}
