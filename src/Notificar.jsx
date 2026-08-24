import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

const CHAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC

function paraBytes(base64) {
  const completo = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const cru = window.atob(completo)
  const saida = new Uint8Array(cru.length)

  for (let i = 0; i < cru.length; i++) {
    saida[i] = cru.charCodeAt(i)
  }

  return saida
}

export default function Notificar({ sessao }) {
  const meuId = sessao.user.id

  const [estado, setEstado] = useState('conferindo')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setEstado('sem-suporte')
      return
    }

    if (!CHAVE_PUBLICA) {
      setEstado('sem-chave')
      return
    }

    if (Notification.permission === 'denied') {
      setEstado('bloqueado')
      return
    }

    navigator.serviceWorker.ready
      .then((registro) => registro.pushManager.getSubscription())
      .then((inscricao) => {
        setEstado(inscricao ? 'ligado' : 'desligado')
      })
      .catch(() => setEstado('desligado'))
  }, [])

  async function ligar() {
    setErro('')
    setEstado('ligando')

    try {
      const permissao = await Notification.requestPermission()

      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'bloqueado' : 'desligado')
        return
      }

      const registro = await navigator.serviceWorker.ready

      let inscricao = await registro.pushManager.getSubscription()

      if (!inscricao) {
        inscricao = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: paraBytes(CHAVE_PUBLICA),
        })
      }

      const dados = inscricao.toJSON()

      const { error } = await supabase.from('push_inscricoes').upsert(
        {
          pessoa_id: meuId,
          endpoint: dados.endpoint,
          p256dh: dados.keys.p256dh,
          auth: dados.keys.auth,
        },
        { onConflict: 'endpoint' }
      )

      if (error) {
        setErro('Não foi possível salvar. Tente de novo.')
        setEstado('desligado')
        return
      }

      setEstado('ligado')
    } catch (e) {
      setErro('Este aparelho recusou o aviso.')
      setEstado('desligado')
    }
  }

  if (estado === 'conferindo' || estado === 'ligado') return null

  if (estado === 'sem-suporte') {
    return (
      <p className="aviso-linha">
        Este navegador não recebe aviso com o aplicativo fechado.
      </p>
    )
  }

  if (estado === 'sem-chave') {
    return <p className="erro">A chave de notificação não chegou ao aplicativo.</p>
  }

  if (estado === 'bloqueado') {
    return (
      <p className="erro">
        O aviso está bloqueado nas configurações do navegador para este site.
        Libere as notificações e recarregue a página.
      </p>
    )
  }

  return (
    <div className="convite">
      <p className="aviso-linha">
        Ligue o aviso para saber de um pedido de ajuda mesmo com o aplicativo
        fechado. Nenhum aviso é garantido — o WhatsApp e o 190 continuam sendo o
        caminho mais seguro.
      </p>

      {erro && <p className="erro">{erro}</p>}

      <button className="principal" onClick={ligar} disabled={estado === 'ligando'}>
        {estado === 'ligando' ? 'Ligando...' : '🔔 Ligar o aviso neste aparelho'}
      </button>
    </div>
  )
}
