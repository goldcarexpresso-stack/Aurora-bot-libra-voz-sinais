import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const VAZIO = { nome: '', categoria: 'Parceiro', descricao: '', link: '', video: '', tipo: 'banner', ate: '', imagem: '' }

function reduzirImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = reject
    leitor.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const max = 900
        const escala = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('sem imagem'))), 'image/jpeg', 0.8)
      }
      img.src = leitor.result
    }
    leitor.readAsDataURL(arquivo)
  })
}

export default function ParceriasDono() {
  const [parceiros, setParceiros] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [form, setForm] = useState(VAZIO)
  const [editandoId, setEditandoId] = useState(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoImagem, setEnviandoImagem] = useState(false)

  async function carregar() {
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase
        .from('parceiros')
        .select('id, nome, categoria, descricao, link, video, imagem, tipo, ativo, ate, criado_em')
        .order('criado_em', { ascending: false }),
      supabase
        .from('parceria_pedidos')
        .select('id, nome, contato, mensagem, lido, criado_em')
        .order('criado_em', { ascending: false })
        .limit(30),
    ])
    setParceiros(p || [])
    setPedidos(d || [])
  }

  useEffect(() => {
    carregar()
  }, [])

  function mudar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function iniciarEdicao(p) {
    setErro('')
    setEditandoId(p.id)
    setForm({
      nome: p.nome || '',
      categoria: p.categoria || '',
      descricao: p.descricao || '',
      link: p.link || '',
      video: p.video || '',
      tipo: p.tipo || 'banner',
      ate: p.ate || '',
      imagem: p.imagem || '',
    })
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setForm(VAZIO)
    setErro('')
  }

  async function escolherImagem(e) {
    const arquivo = e.target.files && e.target.files[0]
    if (!arquivo) return
    setErro('')
    setEnviandoImagem(true)

    try {
      const blob = await reduzirImagem(arquivo)
      const caminho = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error } = await supabase.storage
        .from('parceiros')
        .upload(caminho, blob, { contentType: 'image/jpeg', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('parceiros').getPublicUrl(caminho)
      mudar('imagem', data.publicUrl)
    } catch {
      setErro('Não foi possível enviar a imagem. Tente outra foto.')
    } finally {
      setEnviandoImagem(false)
      e.target.value = ''
    }
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')

    if (!form.nome.trim()) {
      setErro('Dê um nome ao parceiro.')
      return
    }

    const dados = {
      nome: form.nome.trim(),
      categoria: form.categoria.trim() || 'Parceiro',
      descricao: form.descricao.trim() || null,
      link: form.link.trim() || null,
      video: form.video.trim() || null,
      tipo: form.tipo,
      ate: form.ate || null,
      imagem: form.imagem || null,
    }

    setSalvando(true)
    const { error } = editandoId
      ? await supabase.from('parceiros').update(dados).eq('id', editandoId)
      : await supabase.from('parceiros').insert(dados)
    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar. Confira os campos e tente de novo.')
      return
    }

    setEditandoId(null)
    setForm(VAZIO)
    carregar()
  }

  async function alternarAtivo(p) {
    await supabase.from('parceiros').update({ ativo: !p.ativo }).eq('id', p.id)
    carregar()
  }

  async function apagar(p) {
    await supabase.from('parceiros').delete().eq('id', p.id)
    if (editandoId === p.id) cancelarEdicao()
    carregar()
  }

  async function marcarLido(d) {
    await supabase.from('parceria_pedidos').update({ lido: true }).eq('id', d.id)
    carregar()
  }

  const novos = pedidos.filter((d) => !d.lido).length

  return (
    <section className="grupo">
      <h3 className="grupo-titulo">Parcerias e divulgação</h3>

      <form className="form" onSubmit={salvar}>
        <p className="aviso-linha">{editandoId ? 'Editando parceiro' : 'Novo parceiro'}</p>

        <label className="campo">
          <span className="campo-nome">Nome do parceiro</span>
          <input className="campo-input" value={form.nome} onChange={(e) => mudar('nome', e.target.value)} />
        </label>

        <label className="campo">
          <span className="campo-nome">Categoria (ex.: Escola de Libras)</span>
          <input className="campo-input" value={form.categoria} onChange={(e) => mudar('categoria', e.target.value)} />
        </label>

        <label className="campo">
          <span className="campo-nome">Imagem do banner (o app ajusta sozinho para preencher a faixa)</span>
          <input type="file" accept="image/*" onChange={escolherImagem} disabled={enviandoImagem} />
          {enviandoImagem && <span className="aviso-linha">Enviando imagem...</span>}
          {form.imagem && <img src={form.imagem} alt="" className="parceiro-previa" />}
        </label>

        <label className="campo">
          <span className="campo-nome">Texto curto</span>
          <input className="campo-input" value={form.descricao} onChange={(e) => mudar('descricao', e.target.value)} />
        </label>

        <label className="campo">
          <span className="campo-nome">Link (site, WhatsApp ou Instagram)</span>
          <input className="campo-input" value={form.link} onChange={(e) => mudar('link', e.target.value)} />
        </label>

        <label className="campo">
          <span className="campo-nome">Link do vídeo (YouTube, Instagram ou TikTok, opcional)</span>
          <input className="campo-input" value={form.video} onChange={(e) => mudar('video', e.target.value)} />
        </label>

        <label className="campo">
          <span className="campo-nome">Onde aparece</span>
          <select className="campo-input" value={form.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
            <option value="banner">Faixa na tela inicial</option>
            <option value="destaque">Só na lista de parceiros</option>
          </select>
        </label>

        <label className="campo">
          <span className="campo-nome">Válido até (opcional)</span>
          <input type="date" className="campo-input" value={form.ate} onChange={(e) => mudar('ate', e.target.value)} />
        </label>

        {erro && <p className="erro">{erro}</p>}

        <button className="principal" type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : '+ Cadastrar parceiro'}
        </button>

        {editandoId && (
          <button className="secundario" type="button" onClick={cancelarEdicao}>
            Cancelar edição
          </button>
        )}
      </form>

      <h3 className="grupo-titulo">Parceiros cadastrados</h3>
      {parceiros.length === 0 && <p className="aviso-linha">Nenhum parceiro ainda.</p>}
      {parceiros.map((p) => (
        <div key={p.id} className="evento">
          <span className="evento-hora">
            {p.ativo ? 'Ativo' : 'Pausado'} · {p.tipo === 'banner' ? 'faixa' : 'lista'}
            {p.ate ? ` · até ${p.ate}` : ''}
          </span>
          <strong className="evento-texto">{p.nome}</strong>
          <span className="evento-detalhe">{p.categoria}</span>
          <div className="pessoa-botoes">
            <button className="secundario" onClick={() => iniciarEdicao(p)}>
              Editar
            </button>
            <button className="secundario" onClick={() => alternarAtivo(p)}>
              {p.ativo ? 'Pausar' : 'Ativar'}
            </button>
            <button className="secundario" onClick={() => apagar(p)}>
              Apagar
            </button>
          </div>
        </div>
      ))}

      <h3 className="grupo-titulo">Pedidos de parceria {novos > 0 ? `(${novos} novos)` : ''}</h3>
      {pedidos.length === 0 && <p className="aviso-linha">Nenhum pedido ainda.</p>}
      {pedidos.map((d) => (
        <div key={d.id} className="evento">
          <span className="evento-hora">
            {d.lido ? 'Lido' : 'Novo'} · {new Date(d.criado_em).toLocaleDateString('pt-BR')}
          </span>
          <strong className="evento-texto">{d.nome}</strong>
          <span className="evento-detalhe">Contato: {d.contato}</span>
          {d.mensagem && <span className="evento-detalhe">{d.mensagem}</span>}
          {!d.lido && (
            <button className="secundario" onClick={() => marcarLido(d)}>
              Marcar como lido
            </button>
          )}
        </div>
      ))}
    </section>
  )
}
