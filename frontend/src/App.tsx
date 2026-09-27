import { Layers } from 'lucide-react'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

function Gate() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white pulse-dot"
          style={{ background: 'var(--primary)' }}
        >
          <Layers size={18} strokeWidth={2} />
        </div>
      </div>
    )
  }
  return session ? <Dashboard /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
