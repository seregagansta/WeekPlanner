import { minutes } from '../../lib/dates'
import type { Task } from '../../types/planner'
export function layoutTasks(tasks: Task[]) {
  const sorted = [...tasks].sort((a, b) => minutes(a.start_time) - minutes(b.start_time))
  const result: { task: Task; lane: number; lanes: number }[] = []
  let group: typeof result = []
  let ends: number[] = []
  let groupEnd = -1
  const flush = () => {
    for (const item of group) item.lanes = ends.length
    result.push(...group)
    group = []
    ends = []
  }
  for (const task of sorted) {
    const start = minutes(task.start_time)
    const end = Math.max(minutes(task.end_time), start + 40)
    if (start >= groupEnd) {
      flush()
      groupEnd = -1
    }
    let lane = ends.findIndex((value) => value <= start)
    if (lane < 0) lane = ends.length
    ends[lane] = end
    groupEnd = Math.max(groupEnd, end)
    group.push({ task, lane, lanes: 1 })
  }
  flush()
  return result
}
