import { useState } from 'react'
import Layout from './components/Layout'
import useHealth from './hooks/useHealth'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import UploadWorkspace from './pages/UploadWorkspace'
import Health from './pages/Health'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const health = useHealth()
  const backendOnline = Boolean(health.lastChecked && !health.error)
  let view
  if (page === 'dashboard') view = <Dashboard health={health} setPage={setPage}/>
  if (page === 'chat') view = <Chat/>
  if (page === 'speech') view = <UploadWorkspace mode="speech"/>
  if (page === 'ocr') view = <UploadWorkspace mode="ocr"/>
  if (page === 'health') view = <Health health={health}/>
  return <Layout page={page} setPage={setPage} backendOnline={backendOnline}>{view}</Layout>
}
