import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NewBill from './pages/NewBill'
import BillDetail from './pages/BillDetail'
import CreateGroup from './pages/CreateGroup'
import GroupDashboard from './pages/GroupDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bill/new" element={<NewBill />} />
        <Route path="/bill/:id" element={<BillDetail />} />
        <Route path="/group/new" element={<CreateGroup />} />
        <Route path="/group/:code" element={<GroupDashboard />} />
        <Route path="/group/:code/bill/new" element={<NewBill />} />
      </Routes>
    </BrowserRouter>
  )
}
