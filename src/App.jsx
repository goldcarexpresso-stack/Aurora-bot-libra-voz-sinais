import { useEffect, useState } from 'react'
import { supabase, conectado } from './supabase.js'
import Login from './Login.jsx'
import Perfil from './Perfil.jsx'
import Falar from './Falar.jsx'
import Contatos from './Contatos.jsx'
import Conversas from './Conversas.jsx'

const MENU = [
  { id: 'libras', icone: '🤟', titulo: 'Falar em Libras', fase: 'Fase 3' },
  { id: 'falar', icone: '🎤', titulo: 'Falar' },
  { id: 'conversas', icone: '💬', titulo: 'Minhas conversas' },
  { id: 'contatos', icone: '👥', titulo: 'Contatos' },
  { id: 'ambiente', icone: '👁️', titulo: 'Sentir o ambiente', fase: 'Fase 4' },
  { id: 'sos', icone: '🚨', titulo: 'SOS', fase: 'Fase 5' },
  { id: 'confianca', icone: '🔐', titulo: 'Contatos de confiança', fase: 'Fase 5' },
  { id: 'config', icone: '⚙️', titulo: 'Configurações', fase: 'Fase 1' },
]

export default function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [aberto, setAberto] = useState(null)
  const [noPerfil, setNoPerfil] = useState(false)

  useEffect(() => {
    if (!conectado) {
      setCarregando(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSess
