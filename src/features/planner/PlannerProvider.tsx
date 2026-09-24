import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigurationError } from '../../lib/supabase'
import { createLocalRepository } from '../../services/localRepository'
import { createSupabaseRepository } from '../../services/supabaseRepository'
import { createPlannerActions } from '../../services/plannerActions'
import { getAuthErrorMessage, restoreAuthSession } from '../../services/authService'
import { PlannerContext } from './PlannerContext'
import type { ConnectionState, PlannerSnapshot } from '../../types/planner'

const blank: PlannerSnapshot = { tasks: [], categories: [] }
export function PlannerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [snapshot, setSnapshot] = useState<PlannerSnapshot>(blank)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(supabaseConfigurationError)
  const [online, setOnline] = useState(navigator.onLine)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const tasksRef = useRef(snapshot.tasks)
  const getTasks = useCallback(() => tasksRef.current, [])
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const generation = useRef(0)
  const reportError = useCallback(
    (e: unknown) =>
      setError(e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e)),
    [],
  )
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])
  useEffect(() => {
    if (!supabase) return
    let active = true
    void restoreAuthSession(supabase)
      .then(({ session: current, error: authError }) => {
        if (!active) return
        if (authError) reportError(authError)
        setSession(current)
      })
      .catch((cause: unknown) => {
        if (active) reportError(getAuthErrorMessage(cause))
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })
    const { data } = supabase.auth.onAuthStateChange((_event, current) => {
      if (active) {
        setSession(current)
        setAuthReady(true)
      }
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [reportError])
  const userId = session?.user.id
  const repository = useMemo(
    () =>
      supabase
        ? userId
          ? createSupabaseRepository(supabase, userId)
          : null
        : createLocalRepository(),
    [userId],
  )
  const cacheKey = userId ? `weekplanner.cache.${userId}` : null
  const refresh = useCallback(async () => {
    if (!repository) return
    const request = ++generation.current
    try {
      if (repository.mode === 'cloud' && !navigator.onLine) {
        const cached = cacheKey && localStorage.getItem(cacheKey)
        if (cached) {
          const data = JSON.parse(cached) as PlannerSnapshot
          tasksRef.current = data.tasks
          setSnapshot(data)
        }
        return
      }
      const data = await repository.load()
      if (request !== generation.current) return
      tasksRef.current = data.tasks
      setSnapshot(data)
      if (cacheKey) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data))
        } catch {
          /* Cloud data remains authoritative if cache quota is exceeded. */
        }
      }
    } catch (e) {
      if (request === generation.current) reportError(e)
    } finally {
      if (request === generation.current) setLoading(false)
    }
  }, [repository, cacheKey, reportError])
  useEffect(() => {
    // Reset the external repository snapshot on account changes; never display another user's tasks.
    // oxlint-disable-next-line react/set-state-in-effect
    setSnapshot(blank)
    tasksRef.current = []
    setLoading(Boolean(repository))
    if (!repository) return
    void refresh()
    const cleanup = repository.subscribe(() => {
      void refresh()
    }, setConnection)
    const invalidate = () => {
      ++generation.current
    }
    return () => {
      invalidate()
      cleanup()
    }
  }, [repository, refresh])
  const mutate = useCallback(
    <T,>(work: () => Promise<T>): Promise<T> => {
      setPending((n) => n + 1)
      const run = queue.current
        .catch(() => undefined)
        .then(async () => {
          if (repository?.mode === 'cloud' && !navigator.onLine)
            throw new Error('Нет сети. Облачные изменения доступны после подключения.')
          if (!repository) throw new Error('Войдите в аккаунт.')
          ++generation.current
          const result = await work()
          await refresh()
          setError(null)
          return result
        })
        .catch((e) => {
          reportError(e)
          throw e
        })
        .finally(() => setPending((n) => n - 1))
      queue.current = run
      return run
    },
    [repository, refresh, reportError],
  )
  // The factory stores getTasks as an event-time callback; it does not read a ref during render.
  /* oxlint-disable react/refs */
  const actions = useMemo(
    () =>
      createPlannerActions({
        getTasks,
        create: (input) => mutate(() => repository!.create(input)),
        createMany: (entries) => mutate(() => repository!.createMany(entries)),
        update: (id, patch) => mutate(() => repository!.update(id, patch)),
        remove: (id) => mutate(() => repository!.remove(id)),
      }),
    [repository, mutate, getTasks],
  )
  /* oxlint-enable react/refs */
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (pending) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [pending])
  return (
    <PlannerContext.Provider
      value={{
        ...snapshot,
        actions,
        session,
        authReady,
        cloud: Boolean(supabase),
        loading,
        pending,
        error,
        connection,
        online,
        reportError,
        clearError: () => setError(null),
        refresh,
        updateCategory: (id, color) => mutate(() => repository!.updateCategory(id, color)),
      }}
    >
      {children}
    </PlannerContext.Provider>
  )
}
