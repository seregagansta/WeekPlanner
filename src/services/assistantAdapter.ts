import type { PlannerActions, RescheduleChange } from './plannerActions'
import type { TaskInput } from '../types/planner'
// Translate natural language server-side into a typed proposal. No browser LLM keys.
export type AssistantProposal =
  | { kind: 'create'; task: TaskInput; explanation: string }
  | { kind: 'reschedule'; changes: RescheduleChange[]; explanation: string }
  | { kind: 'answer'; text: string }
export interface AssistantAdapter {
  interpret(
    command: string,
    context: { today: string; weekStart: string; timeZone: string },
    actions: Pick<PlannerActions, 'getDaySchedule' | 'getWeekSchedule' | 'findFreeSlots'>,
  ): Promise<AssistantProposal>
}
