import { createServer } from 'vite'

export default async function setup() {
  // Isolate fake auth config from the user's .env.local. No production credentials are used.
  process.env.VITE_SUPABASE_URL = 'https://weekplanner-test.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_test_only'
  process.env.VITE_BASE_PATH = process.env.WP_AUTH_BASE_PATH || '/'
  const server = await createServer({ server: { host: '127.0.0.1', port: 5183, strictPort: true } })
  await server.listen()
  // Own the server directly so teardown also works on Windows without shell process-tree killing.
  return () => server.close()
}
