import { useRef, useState } from 'react'
import { supabase } from './supabase.js'

const SEGURAR = 3000

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

export default function Titulo({ sessao }) {
  const meuId = sessao.user.id

  const [marca, setMarca] = useState(false)
  const relogio = useRef(null)
  const ocupado = useRef(false)

  function comecar() {
    parar()
    relogio.current = setTimeout(disparar, SEGURAR)
  }

  function parar() {
    if (relogio.current) {
      clearTimeout(relogio.current)
      relogio.current = null
    }
  }

  function falhou() {
    ocupado.current = false
    if (navigator.vibrate) navigator.vibrate([60, 80, 60, 80, 60])
  }

  async function disparar() {
    relogio.current = null

    if (ocupado.current) return
    ocupado.current = true

    try {
      const { data: confianca, error: erroConfianca } = await supabase
        .from('confianca')
        .select('contato_id, pode_localizacao')
        .eq('dono_id', meuId)

      if (erroConfianca) {
        falhou()
        return
      }

      const lista = confianca || []

      let local = null
      if (lista.some((c) => c.pode_localizacao)) {
        local = await pegarLocal()
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
        .select('id')
        .single()

      if (error || !data) {
        falhou()
        return
      }

      if (lista.length > 0) {
        await supabase
          .from('sos_avisados')
          .insert(lista.map((c) => ({ sos_id: data.id, contato_id: c.contato_id })))
      }

      setMarca(true)
      if (navigator.vibrate) navigator.vibrate(60)
    } catch (e) {
      falhou()
      return
    }

    ocupado.current = false
  }

  return (
    <header className="topo">
      <h1
        className="titulo-toque"
        onPointerDown={comecar}
        onPointerUp={parar}
        onPointerLeave={parar}
        onPointerCancel={parar}
        onContextMenu={(e) => e.preventDefault()}
      >
        AURORA
      </h1>
      <p className="sub">A Luz que Traduz{marca ? ' ·' : ''}</p>
    </header>
  )
}
