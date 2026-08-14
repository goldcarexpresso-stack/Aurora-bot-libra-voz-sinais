import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const SELECAO = `
  id, status, solicitante_id, destinatario_id,
  solicitante:perfis!contatos_solicitante_id_fkey (id, aurora_id, nome),
  destinatario:perfis!contatos_destinatario_id_fkey (id, aurora_id, nome)
`

export default function Contatos({ sessao, aoVoltar }) {
  const meuId = sessao.user.id

  const [lista, setLista] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [codigo, setCodigo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [achado, setAchado] = useState(null)
  const [avisoBusca, setAvisoBusca] = useState('')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('contatos')
      .select(SELECAO)
      .order('criado_em', { ascending: false })

    if (error) setErro('Não foi possível carregar seus contatos.')
    else {
      setLista(data || [])
      setErro('')
    }
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function buscar() {
    setAvisoBusca('')
    setAchado(null)

    const limpo = codigo.trim().toUpperCase()
    if (!limpo) {
      setAvisoBusca('Digite o ID da pessoa.')
      return
    }

    setBuscando(true)
    const { data, error } = await supabase.rpc('buscar_por_aurora_id', {
      codigo: limpo,
    })
    setBuscando(false)

    if (error) {
      setAvisoBusca('A busca falhou. Tente de novo.')
      return
    }
    if (!data || data.length === 0) {
      setAvisoBusca('Nenhuma pessoa encontrada com esse ID.')
      return
    }

    const pessoa = data[0]
    const jaExiste = lista.some(
      (c) => c.solicitante_id === pessoa.id || c.destinatario_id === pessoa.id
    )
    if (jaExiste) {
      setAvisoBusca('Essa pessoa já está na sua lista.')
      return
    }

    setAchado(pessoa)
  }

  async function enviarSolicitacao() {
    const { error } = await supabase.from('contatos').insert({
      solicitante_id: meuId,
      destinatario_id: achado.id,
    })

    if (error) setAvisoBusca('Não foi possível enviar a solicitação.')
    else {
      setAchado(null)
      setCodigo('')
      setAvisoBusca('Solicitação enviada.')
      carregar()
    }
  }

  async function aceitar(id) {
    const { error } = await supabase
      .from('contatos')
      .update({ status: 'aceito' })
      .eq('id', id)

    if (error) setErro('Não foi possível aceitar.')
    else carregar()
  }

  async function remover(id) {
    const { error } = await supabase.from('contatos').delete().eq('id', id)

    if (error) setErro('Não foi possível remover.')
    else carregar()
  }

  function outraPessoa(c) {
    return c.solicitante_id === meuId ? c.destinatario : c.solicitante
  }

  const recebidas = lista.filter(
    (c) => c.status === 'pendente' && c.destinatario_id === meuId
  )
  const enviadas = lista.filter(
    (c) => c.status === 'pendente' && c.solicitante_id === meuId
  )
  const aceitos = lista.filter((c) => c.status === 'aceito')

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Contatos</h2>

        <label className="campo">
          <span className="campo-nome">Procurar pelo ID da Aurora</span>
          <input
            className="campo-input"
            type="text"
            placeholder="AURORA-00000"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </label>

        <button className="principal" onClick={buscar} disabled={buscando}>
          {buscando ? 'Procurando...' : 'Procurar'}
        </button>

        {avisoBusca && <p className="aviso-linha">{avisoBusca}</p>}

        {achado && (
          <div className="pessoa">
            <div>
              <strong className="pessoa-nome">{achado.nome || 'Sem nome'}</strong>
              <span className="pessoa-id">{achado.aurora_id}</span>
            </div>
            <button className="secundario" onClick={enviarSolicitacao}>
              Enviar solicitação
            </button>
          </div>
        )}

        {erro && <p className="erro">{erro}</p>}

        {carregando && <p className="aviso-linha">Carregando...</p>}

        {!carregando && recebidas.length > 0 && (
          <section className="grupo">
            <h3 className="grupo-titulo">Pedidos recebidos</h3>
            {recebidas.map((c) => (
              <div key={c.id} className="pessoa">
                <div>
                  <strong className="pessoa-nome">
                    {outraPessoa(c)?.nome || 'Sem nome'}
                  </strong>
                  <span className="pessoa-id">{outraPessoa(c)?.aurora_id}</span>
                </div>
                <div className="pessoa-botoes">
                  <button className="secundario" onClick={() => aceitar(c.id)}>
                    Aceitar
                  </button>
                  <button className="sair" onClick={() => remover(c.id)}>
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {!carregando && aceitos.length > 0 && (
          <section className="grupo">
            <h3 className="grupo-titulo">Meus contatos</h3>
            {aceitos.map((c) => (
              <div key={c.id} className="pessoa">
                <div>
                  <strong className="pessoa-nome">
                    {outraPessoa(c)?.nome || 'Sem nome'}
                  </strong>
                  <span className="pessoa-id">{outraPessoa(c)?.aurora_id}</span>
                </div>
                <button className="sair" onClick={() => remover(c.id)}>
                  Remover
                </button>
              </div>
            ))}
          </section>
        )}

        {!carregando && enviadas.length > 0 && (
          <section className="grupo">
            <h3 className="grupo-titulo">Aguardando resposta</h3>
            {enviadas.map((c) => (
              <div key={c.id} className="pessoa">
                <div>
                  <strong className="pessoa-nome">
                    {outraPessoa(c)?.nome || 'Sem nome'}
                  </strong>
                  <span className="pessoa-id">{outraPessoa(c)?.aurora_id}</span>
                </div>
                <button className="sair" onClick={() => remover(c.id)}>
                  Cancelar
                </button>
              </div>
            ))}
          </section>
        )}

        {!carregando && lista.length === 0 && (
          <p className="aviso-linha">
            Você ainda não tem contatos. Peça o ID da pessoa e procure acima.
          </p>
        )}
      </div>

      <footer className="rodape">
        O chat com esses contatos é o próximo passo.
      </footer>
    </div>
  )
    }
