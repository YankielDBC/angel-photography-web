'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('adminEmail', data.email)
        router.push('/admin/dashboard')
      } else {
        setError(data.error || 'Error de autenticación')
      }
    } catch (err) {
      setError('Algo salió mal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0806]">
      <div className="w-full max-w-sm">
        <Link 
          href="/" 
          className="text-[#f5f0e8]/50 hover:text-[#c8a46e] text-sm transition mb-6 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </Link>
        
        <div className="bg-[#f5f0e8]/5 p-6 rounded-2xl border border-[#f5f0e8]/10">
          <h1 className="font-serif text-2xl font-semibold text-[#c8a46e] mb-1">
            Angel Photo
          </h1>
          <p className="text-[#f5f0e8]/50 text-sm mb-6">Panel de Administrador</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#f5f0e8]/60 uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#f5f0e8]/5 border border-[#f5f0e8]/15 rounded-lg px-4 py-3 text-[#f5f0e8] placeholder:text-[#f5f0e8]/30 focus:border-[#c8a46e]/50 outline-none transition text-sm"
                placeholder="admin@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs text-[#f5f0e8]/60 uppercase tracking-wider mb-2">Contrasena</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#f5f0e8]/5 border border-[#f5f0e8]/15 rounded-lg px-4 py-3 text-[#f5f0e8] placeholder:text-[#f5f0e8]/30 focus:border-[#c8a46e]/50 outline-none transition text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-[#ef4444] text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c8a46e] hover:bg-[#c8a46e]/90 disabled:bg-[#f5f0e8]/20 disabled:text-[#f5f0e8]/50 text-[#0a0806] py-3 rounded-lg font-medium transition text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verificando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <p className="text-[10px] text-[#f5f0e8]/30 mt-6 text-center">
            Solo para el administrador
          </p>
        </div>
      </div>
    </div>
  )
}
