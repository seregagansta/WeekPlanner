import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category, PlannerRepository, Task } from '../types/planner'
export function createSupabaseRepository(
  client: SupabaseClient,
  userId: string,
): PlannerRepository {
  return {
    mode: 'cloud',
    async load() {
      const [tasks, categories] = await Promise.all([
        client.from('tasks').select('*').eq('user_id', userId).order('date').order('start_time'),
        client.from('categories').select('*').eq('user_id', userId).order('position'),
      ])
      if (tasks.error) throw tasks.error
      if (categories.error) throw categories.error
      return { tasks: tasks.data as Task[], categories: categories.data as Category[] }
    },
    async create(input) {
      const { data, error } = await client
        .from('tasks')
        .insert({ ...input, user_id: userId })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    async update(id, patch) {
      const { data, error } = await client
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    async createMany(entries) {
      if (!entries.length) return []
      // One atomic INSERT; stable client IDs make a retry safe after a lost response.
      const { data, error } = await client
        .from('tasks')
        .upsert(
          entries.map(({ id, input }) => ({ ...input, id, user_id: userId })),
          { onConflict: 'id', ignoreDuplicates: true },
        )
        .select()
      if (error) throw error
      return data as Task[]
    },
    async remove(id) {
      const { error } = await client.from('tasks').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
    },
    async updateCategory(id, color) {
      const { error } = await client
        .from('categories')
        .update({ color })
        .eq('id', id)
        .eq('user_id', userId)
      if (error) throw error
    },
    subscribe(onChange, onState) {
      onState('connecting')
      const channel = client
        .channel(`planner-${userId}-${crypto.randomUUID()}`)
        // DELETE events cannot be filtered reliably; RLS protects reads and refetches.
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, onChange)
        .subscribe((status) => {
          onState(
            status === 'SUBSCRIBED'
              ? 'connected'
              : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'
                ? 'disconnected'
                : 'connecting',
          )
          if (status === 'SUBSCRIBED') onChange()
        })
      const visible = () => {
        if (document.visibilityState === 'visible') onChange()
      }
      window.addEventListener('online', onChange)
      document.addEventListener('visibilitychange', visible)
      return () => {
        void client.removeChannel(channel)
        window.removeEventListener('online', onChange)
        document.removeEventListener('visibilitychange', visible)
      }
    },
  }
}
