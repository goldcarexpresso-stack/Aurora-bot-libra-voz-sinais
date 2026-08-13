import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY

export const conectado = Boolean(url && chave)

export const supabase = conectado ? createClient(url, chave) : null
