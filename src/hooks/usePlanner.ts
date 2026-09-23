import { useContext } from 'react'
import { PlannerContext } from '../features/planner/PlannerContext'
export function usePlanner() {
  const context = useContext(PlannerContext)
  if (!context) throw new Error('PlannerProvider is required')
  return context
}
