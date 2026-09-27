import { Layers, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Account created. If email confirmation is enabled on this Supabase project, check your inbox; otherwise you are signed in now.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm animate-in">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
            style={{ background: 'var(--primary)' }}
          >
            <Layers size={17} strokeWidth={2} />
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Document Assistant
          </span>
        </div>

        <div className="rounded-xl border bg-white p-8 shadow-sm" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            {mode === 'sign_in' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {mode === 'sign_in' ? 'Sign in to access your workspaces.' : 'Get started with a free account.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text)' }}>
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2"
                  style={{ borderColor: 'var(--border)', ['--tw-ring-color' as string]: 'var(--primary-soft)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text)' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2"
                  style={{ borderColor: 'var(--border)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              style={{ background: 'var(--primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--primary)')}
            >
              {busy ? 'Please wait…' : mode === 'sign_in' ? 'Sign in' : 'Sign up'}
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
          className="mt-5 w-full text-center text-sm font-medium transition hover:opacity-80"
          style={{ color: 'var(--primary)' }}
        >
          {mode === 'sign_in' ? "Need an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
