import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'

const SELECAO = `
  id, telefone, pode_localizacao, contato_id,
  contato:perfis!confianca_contato_id_fkey (id, aurora_id, nome)
`

function hora(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function Sos({ sessao, aoVoltar }) {
  const meuId = sessao.user.id

  const [confianca, setConfianca] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [etapa, setEtapa] = useState('inicio')
  const [pedido, setPedido] = useState(null)
  const [passos, setPassos] = useState([])
  const [erro, setErro] = useState('')
  const [meuNome, setMeuNome] = useState('')
  const vivoRef = useRef(true)

  useEffect(() => {
    vivoRef.current = true

    async function carregar() {
      const [c, p] = await Promise.all([
        supabase.from('confianca').select(SELECAO).eq('dono_id', meuId),
        supabase.from('perfis').select('nome, aurora_id').eq('id', meuId).maybeSingle(),
      ])

      if (!vivoRef.current) return
      if (!c.error) setConfianca(c.data || [])
      if (p.data) setMeuNome(p.data.nome || p.data.aurora_id || '')
      setCarregando(false)
    }

    carregar()
    return () => {
      vivoRef.current = false
    }
  }, [meuId])

  function anotar(texto, ok) {
    setPassos((antes) => [...antes, { id: Date.now() + Math.random(), texto, ok }])
  }

  function pegarLocal() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            precisao: pos.coords.accuracy,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  async function enviar() {
    setErro('')
    setPassos([])
    setEtapa('enviando')

    if (navigator.vibrate) navigator.vibrate([200, 100, 200])

    const querLocal = confianca.some((c) => c.pode_localizacao)
    let local = null

    if (querLocal) {
      local = await pegarLocal()
      anotar(
        local ? 'Localização obtida' : 'Sem localização (permissão negada ou sem sinal)',
        Boolean(local)
      )
    }

    const { data, error } = await supabase
      .from('sos')
      .insert({
        autor_id: meuId,
        mensagem: 'Preciso de ajuda.',
        latitude: local ? local.latitude : null,
        longitude: local ? local.longitude : null,
        precisao: local ? local.precisao : null,
        local_em: local ? new Date().toISOString() : null,
      })
      .select('id, criado_em, latitude, longitude')
      .single()

    if (error) {
      anotar('O pedido não foi registrado', false)
      setErro('Não foi possível enviar. Tente de novo ou ligue direto.')
      setEtapa('resultado')
      return
    }

    anotar('Pedido registrado', true)
    setPedido(data)

    if (confianca.length > 0) {
      const avisados = confianca.map((c) => ({
        sos_id: data.id,
        contato_id: c.contato_id,
      }))
      const r = await supabase.from('sos_avisados').insert(avisados)
      anotar(
        r.error
          ? 'Falha ao avisar os contatos'
          : confianca.length + ' contato(s) avisado(s) dentro da Aurora',
        !r.error
      )
    } else {
      anotar('Você não tem contatos de confiança cadastrados', false)
    }

    setEtapa('resultado')
  }

  async function encerrar() {
    if (!pedido) return
    await supabase
      .from('sos')
      .update({ situacao: 'encerrado', encerrado_em: new Date().toISOString() })
      .eq('id', pedido.id)

    setPedido(null)
    setPassos([])
    setEtapa('inicio')
  }

  function textoAviso() {
    let t = '🚨 ' + (meuNome || 'Alguém') + ' pediu ajuda pela Aurora.'
    if (pedido && pedido.latitude && pedido.longitude) {
      t += ' Localização: https://maps.google.com/?q=' + pedido.latitude + ',' + pedido.longitude
    }
    return t
  }

  const comTelefone = confianca.filter((c) => c.telefone)

  if (etapa === 'inicio') {
    return (
      <div className="tela">
        <button className="voltar" onClick={aoVoltar}>
          ← Voltar
        </button>

        <div className="bloco">
          <h2 className="form-titulo">Pedir ajuda</h2>

          <div className="instrucao">
            <p className="aviso-linha">
              Ao tocar, seus contatos de confiança recebem o aviso dentro da
              Aurora, com o horário e a sua localização se você tiver liberado.
              A Aurora não liga sozinha para polícia ou bombeiro.
            </p>
          </div>

          {carregando && <p className="aviso-linha">Carregando...</p>}

          {!carregando && confianca.length === 0 && (
            <p className="erro">
              Você ainda não tem contatos de confiança. Sem eles, o pedido é
              registrado mas ninguém é avisado.
            </p>
          )}

          {!carregando && confianca.length > 0 && (
            <p className="aviso-linha">
              Vão ser avisados: {confianca.map((c) => c.contato?.nome || 'Sem nome').join(', ')}
            </p>
          )}

          <button className="botao-sos" onClick={enviar}>
            🚨<br />PEDIR AJUDA AGORA
          </button>
        </div>

        <footer className="rodape">
          O aviso só sai com o aplicativo aberto nesta tela.
        </footer>
      </div>
    )
  }

  if (etapa === 'enviando') {
    return (
      <div className="tela">
        <div className="aviso">
          <span className="aviso-icone">🚨</span>
          <h2>Enviando pedido de ajuda</h2>
          <p className="aviso-texto">Não feche esta tela.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tela">
      <div className="bloco">
        <h2 className="form-titulo">{erro ? 'Pedido NÃO enviado' : 'Pedido enviado'}</h2>

        {erro && <p className="erro">{erro}</p>}

        <section className="grupo">
          <h3 className="grupo-titulo">O que realmente saiu</h3>
          {passos.map((p) => (
            <div key={p.id} className="evento">
              <span className="evento-texto">
                {p.ok ? '✅ ' : '⚠️ '}
                {p.texto}
              </span>
            </div>
          ))}
          {pedido && (
            <div className="evento">
              <span className="evento-texto">🕐 Horário: {hora(pedido.criado_em)}</span>
            </div>
          )}
        </section>

        {pedido && pedido.latitude && (
          <a
            className="principal link-botao"
            href={'https://maps.google.com/?q=' + pedido.latitude + ',' + pedido.longitude}
            target="_blank"
            rel="noreferrer"
          >
            📍 Ver minha localização no mapa
          </a>
        )}

        {comTelefone.length > 0 && (
          <section className="grupo">
            <h3 className="grupo-titulo">Avisar também por fora da Aurora</h3>
            <p className="aviso-linha">
              A mensagem já vem escrita. Você só toca em enviar.
            </p>
            {comTelefone.map((c) => (
              <div key={c.id} className="pessoa">
                <div>
                  <strong className="pessoa-nome">{c.contato?.nome || 'Sem nome'}</strong>
                  <span className="pessoa-id">{c.telefone}</span>
                </div>
                <div className="pessoa-botoes">
                  <a
                    className="secundario link-botao"
                    href={
                      'https://wa.me/55' +
                      c.telefone.replace(/\D/g, '') +
                      '?text=' +
                      encodeURIComponent(textoAviso())
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                  <a
                    className="secundario link-botao"
                    href={'tel:' + c.telefone.replace(/\D/g, '')}
                  >
                    Ligar
                  </a>
                </div>
              </div>
            ))}
          </section>
        )}

        <a className="principal perigo link-botao" href="tel:190">
          📞 Ligar para 190
        </a>

        <button className="secundario" onClick={encerrar}>
          Encerrar pedido
        </button>
      </div>

      <footer className="rodape">
        Ao encerrar, seus contatos veem que a situação foi encerrada.
      </footer>
    </div>
  )
}
