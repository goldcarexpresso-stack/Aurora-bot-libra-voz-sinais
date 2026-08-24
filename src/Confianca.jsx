import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const LIMITE = 5

const SELECAO_CONFIANCA = `
  id, apelido, telefone, pode_localizacao, receber_alertas, contato_id,
  contato:perfis!confianca_contato_id_fkey (id, aurora_id, nome)
`

const SELECAO_CONTATOS = `
  id, solicitante_id, destinatario_id,
  solicitante:perfis!contatos_solicitante_id_fkey (id, aurora_id, nome),
  destinatario:perfis!contatos_destinatario_id_fkey (id, aurora_id, nome)
`

export default function Confianca({ sessao, aoVoltar }) {
  const meuId = sessao.user.id

  const [lista, setLista] = useState([])
  const [disponiveis, setDisponiveis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')

  const carregar = useCallback(async () => {
    setErro('')

    const confianca = await supabase
      .from('confianca')
      .select(SELECAO_CONFIANCA)
      .eq('dono_id', meuId)
      .order('prioridade', { ascending: true })

    const contatos = await supabase
      .from('contatos')
      .select(SELECAO_CONTATOS)
      .eq('status', 'aceito')

    if (confianca.error || contatos.error) {
      setErro('Não foi possível carregar sua lista.')
      setCarregando(false)
      return
    }

    const minha = confianca.data || []
    setLista(minha)

    const jaEstao = minha.map((c) => c.contato_id)
    const pessoas = (contatos.data || [])
      .map((c) => (c.solicitante_id === meuId ? c.destinatario : c.solicitante))
      .filter((p) => p && !jaEstao.includes(p.id))

    setDisponiveis(pessoas)
    setCarregando(false)
  }, [meuId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function adicionar(pessoa) {
    setAviso('')

    if (lista.length >= LIMITE) {
      setAviso('Você já tem ' + LIMITE + ' contatos de confiança. Remova um antes.')
      return
    }

    const { error } = await supabase.from('confianca').insert({
      dono_id: meuId,
      contato_id: pessoa.id,
      prioridade: lista.length + 1,
    })

    if (error) setAviso('Não foi possível adicionar.')
    else carregar()
  }

  async function remover(id) {
    const { error } = await supabase.from('confianca').delete().eq('id', id)
    if (error) setAviso('Não foi possível remover.')
    else carregar()
  }

  async function trocarLocalizacao(item) {
    const { error } = await supabase
      .from('confianca')
      .update({ pode_localizacao: !item.pode_localizacao })
      .eq('id', item.id)

    if (error) setAviso('Não foi possível mudar essa opção.')
    else carregar()
  }

  async function salvarTelefone(item, valor) {
    const { error } = await supabase
      .from('confianca')
      .update({ telefone: valor.trim() || null })
      .eq('id', item.id)

    if (error) setAviso('Não foi possível salvar o telefone.')
    else carregar()
  }

  return (
    <div className="tela">
      <button className="voltar" onClick={aoVoltar}>
        ← Voltar
      </button>

      <div className="bloco">
        <h2 className="form-titulo">Contatos de confiança</h2>

        <div className="instrucao">
          <p className="aviso-linha">
            São as pessoas que recebem seu pedido de ajuda quando você toca no
            SOS. Se você deixar a localização ligada para alguém, essa pessoa
            também vê onde você está no momento do pedido. Até {LIMITE} pessoas.
          </p>
        </div>

        {erro && <p className="erro">{erro}</p>}
        {aviso && <p className="erro">{aviso}</p>}
        {carregando && <p className="aviso-linha">Carregando...</p>}

        {!carregando && (
          <section className="grupo">
            <h3 className="grupo-titulo">
              Minha lista ({lista.length} de {LIMITE})
            </h3>

            {lista.length === 0 && (
              <p className="aviso-linha">
                Ainda vazia. Escolha abaixo entre os seus contatos.
              </p>
            )}

            {lista.map((item) => (
              <div key={item.id} className="pessoa">
                <div>
                  <strong className="pessoa-nome">
                    {item.contato?.nome || 'Sem nome'}
                  </strong>
                  <span className="pessoa-id">{item.contato?.aurora_id}</span>
                </div>

                <label className="campo">
                  <span className="campo-nome">
                    Telefone com DDD (para abrir WhatsApp ou ligação)
                  </span>
                  <input
                    className="campo-input"
                    type="tel"
                    inputMode="tel"
                    placeholder="81999999999"
                    defaultValue={item.telefone || ''}
                    onBlur={(e) => salvarTelefone(item, e.target.value)}
                  />
                </label>

                <button
                  className={item.pode_localizacao ? 'chave chave-ligada' : 'chave'}
                  onClick={() => trocarLocalizacao(item)}
                >
                  {item.pode_localizacao
                    ? '📍 Recebe minha localização'
                    : '📍 Não recebe minha localização'}
                </button>

                <button className="sair" onClick={() => remover(item.id)}>
                  Tirar da lista
                </button>
              </div>
            ))}
          </section>
        )}

        {!carregando && (
          <section className="grupo">
            <h3 className="grupo-titulo">Seus contatos</h3>

            {disponiveis.length === 0 && (
              <p className="aviso-linha">
                Todos os seus contatos já estão na lista, ou você ainda não tem
                contatos aceitos. Adicione pessoas em Contatos primeiro.
              </p>
            )}

            {disponiveis.map((p) => (
              <div key={p.id} className="pessoa">
                <div>
                  <strong className="pessoa-nome">{p.nome || 'Sem nome'}</strong>
                  <span className="pessoa-id">{p.aurora_id}</span>
                </div>
                <button className="secundario" onClick={() => adicionar(p)}>
                  Colocar na confiança
                </button>
              </div>
            ))}
          </section>
        )}
      </div>

      <footer className="rodape">
        Só quem já é seu contato aceito pode entrar aqui.
        Você pode tirar qualquer pessoa da lista quando quiser.
      </footer>
    </div>
  )
}
