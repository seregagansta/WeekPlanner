import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { PlannerActions } from '../../services/plannerActions'
import type { ConnectionState, PlannerSnapshot } from '../../types/planner'
export interface PlannerContextValue extends PlannerSnapshot {
  actions: PlannerActions
  session: Session | null
  authReady: boolean
  cloud: boolean
  loading: boolean
  pending: number
  error: string | null
  connection: ConnectionState
  online: boolean
  reportError(error: unknown): void
  clearError(): void
  refresh(): Promise<void>
  updateCategory(id: string, color: string): Promise<void>
}
export const PlannerContext = createContext<PlannerContextValue | null>(null)
