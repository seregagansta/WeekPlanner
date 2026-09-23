import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
let configurationError: string | null = null
if (Boolean(url) !== Boolean(key))
  configurationError = 'Заполните обе переменные Supabase в .env.local и перезапустите сервер.'
if (url && !/^https?:\/\//.test(url))
  configurationError = 'VITE_SUPABASE_URL должен быть URL проекта Supabase.'
export const supabaseConfigurationError = configurationError
export const supabase =
  url && key && !configurationError
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null
