import { PlannerProvider } from './features/planner/PlannerProvider'
import { PlannerPage } from './pages/PlannerPage'
export default function App() {
  return (
    <PlannerProvider>
      <PlannerPage />
    </PlannerProvider>
  )
}
