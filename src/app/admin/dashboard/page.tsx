'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  totalBookings: number
  totalDeposits: number
  totalRemaining: number
  totalRevenue: number
  bookedSlots: number
  blockedSlots: number
}

interface Booking {
  id: string
  client: { name: string; email: string; phone: string }
  serviceType: string
  serviceTier: string
  sessionDate: string
  sessionTime: string
  totalAmount: number
  depositPaid: number
  remainingPaid: number
  status: string
}

export default function AdminDashboard() {
  const [view, setView] = useState<'home' | 'calendar' | 'bookings' | 'reports'>('home')
  const [stats, setStats] = useState<Stats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin')
    }
  }

  const fetchData = async () => {
    try {
      const res = await fetch('/api/reports?type=summary', {
        headers: { 'Authorization': 'Bearer admin-token' }
      })
      const data = await res.json()
      setStats(data.summary)
      setBookings(data.upcomingBookings || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0806', 
        color: '#f5f0e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0806', 
      color: '#f5f0e8',
      fontFamily: 'Outfit, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(201,169,98,0.15) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(201,169,98,0.2)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ 
          fontFamily: 'Cormorant Garamond, serif', 
          fontSize: '1.8rem',
          color: '#c8a46e'
        }}>
          Angel Photography Miami - Admin
        </h1>
        <button
          onClick={() => { localStorage.removeItem('adminToken'); router.push('/admin') }}
          style={{
            background: 'transparent',
            border: '1px solid rgba(201,169,98,0.5)',
            color: '#c8a46e',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Cerrar Sesión
        </button>
      </header>

      {/* Navigation */}
      <nav style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        {[
          { key: 'home', label: '🏠 Inicio' },
          { key: 'calendar', label: '📅 Calendario' },
          { key: 'bookings', label: '📋 Reservas' },
          { key: 'reports', label: '📊 Reportes' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key as any)}
            style={{
              background: view === tab.key ? 'rgba(201,169,98,0.2)' : 'transparent',
              border: 'none',
              color: view === tab.key ? '#c8a46e' : 'rgba(245,240,232,0.7)',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: '2rem' }}>
        {view === 'home' && (
          <div>
            <h2 style={{ color: '#c8a46e', marginBottom: '1.5rem' }}>Resumen</h2>
            
            {/* KPIs */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <KpiCard title="Total Reservas" value={stats?.totalBookings || 0} color="#c8a46e" />
              <KpiCard title="Depósitos Recibidos" value={`$${stats?.totalDeposits || 0}`} color="#4ade80" />
              <KpiCard title="Pendiente de Cobrar" value={`$${stats?.totalRemaining || 0}`} color="#facc15" />
              <KpiCard title="Ingresos Totales" value={`$${stats?.totalRevenue || 0}`} color="#60a5fa" />
            </div>

            {/* Upcoming */}
            <h3 style={{ color: '#c8a46e', marginBottom: '1rem' }}>Próximas Sesiones</h3>
            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              {bookings.length === 0 ? (
                <p style={{ padding: '2rem', opacity: 0.6 }}>No hay reservas próximas</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', opacity: 0.7 }}>Fecha</th>
                      <th style={{ padding: '1rem', textAlign: 'left', opacity: 0.7 }}>Cliente</th>
                      <th style={{ padding: '1rem', textAlign: 'left', opacity: 0.7 }}>Tipo</th>
                      <th style={{ padding: '1rem', textAlign: 'left', opacity: 0.7 }}>Paquete</th>
                      <th style={{ padding: '1rem', textAlign: 'right', opacity: 0.7 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 10).map(booking => (
                      <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem' }}>{formatDate(booking.sessionDate)} - {booking.sessionTime}</td>
                        <td style={{ padding: '1rem' }}>{booking.client.name}</td>
                        <td style={{ padding: '1rem' }}>{booking.serviceType}</td>
                        <td style={{ padding: '1rem' }}>{booking.serviceTier}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: '#4ade80' }}>${booking.totalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <CalendarView />
        )}

        {view === 'bookings' && (
          <BookingsView />
        )}

        {view === 'reports' && (
          <ReportsView />
        )}
      </main>
    </div>
  )
}

function KpiCard({ title, value, color }: { title: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '1.5rem'
    }}>
      <p style={{ opacity: 0.6, fontSize: '0.85rem', marginBottom: '0.5rem' }}>{title}</p>
      <p style={{ fontSize: '1.8rem', fontWeight: 600, color }}>{value}</p>
    </div>
  )
}

function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [slots, setSlots] = useState<any[]>([])
  const [blockedDays, setBlockedDays] = useState<string[]>([])

  useEffect(() => {
    fetchSlots()
  }, [currentMonth])

  const fetchSlots = async () => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    
    const res = await fetch(`/api/slots?startDate=${start.toISOString()}&endDate=${end.toISOString()}`, {
      headers: { 'Authorization': 'Bearer admin-token' }
    })
    const data = await res.json()
    setSlots(data.slots || [])
    setBlockedDays(data.blockedDays || [])
  }

  const getDaysInMonth = () => {
    const days = []
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    
    for (let d = 1; d <= end.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    }
    return days
  }

  const getDayStatus = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    if (blockedDays.includes(dateStr)) return 'blocked'
    
    const daySlots = slots.filter(s => new Date(s.date).toISOString().split('T')[0] === dateStr)
    const booked = daySlots.filter(s => s.status === 'booked').length
    const total = daySlots.length
    
    if (total === 0) return 'free'
    if (booked === total) return 'full'
    if (booked > 0) return 'partial'
    return 'free'
  }

  const handleBlockDay = async (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const status = getDayStatus(date)
    
    if (status === 'blocked') {
      await fetch('/api/slots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ action: 'unblock_day', date: dateStr })
      })
    } else {
      await fetch('/api/slots', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
        body: JSON.stringify({ action: 'block_day', date: dateStr, reason: 'Bloqueado por admin' })
      })
    }
    
    fetchSlots()
  }

  const days = getDaysInMonth()
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#c8a46e' }}>Calendario</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={{ background: 'transparent', border: '1px solid #c8a46e', color: '#c8a46e', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            ←
          </button>
          <span>{currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button 
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={{ background: 'transparent', border: '1px solid #c8a46e', color: '#c8a46e', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
          >
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 16, height: 16, background: '#22c55e', borderRadius: 4 }}></span> Libre
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 16, height: 16, background: '#eab308', borderRadius: 4 }}></span> Parcial
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: 16, height: 16, background: '#ef4444', borderRadius: 4 }}></span> Completo/Bloqueado
        </span>
      </div>

      {/* Calendar Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: 4,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 1
      }}>
        {weekDays.map(d => (
          <div key={d} style={{ padding: '0.75rem', textAlign: 'center', opacity: 0.6, fontWeight: 600 }}>
            {d}
          </div>
        ))}
        {/* Empty cells for first week */}
        {Array.from({ length: new Date(days[0].getDay()) }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(date => {
          const status = getDayStatus(date)
          const colors: Record<string, string> = {
            free: '#22c55e',
            partial: '#eab308',
            full: '#ef4444',
            blocked: '#7f1d1d'
          }
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => handleBlockDay(date)}
              style={{
                padding: '1rem 0.5rem',
                background: colors[status],
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9rem',
                opacity: status === 'blocked' ? 0.8 : 1
              }}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BookingsView() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    const res = await fetch('/api/bookings', {
      headers: { 'Authorization': 'Bearer admin-token' }
    })
    const data = await res.json()
    setBookings(data)
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token'
      },
      body: JSON.stringify({ status })
    })
    fetchBookings()
  }

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter)

  return (
    <div>
      <h2 style={{ color: '#c8a46e', marginBottom: '1.5rem' }}>Todas las Reservas</h2>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? 'rgba(201,169,98,0.2)' : 'transparent',
              border: '1px solid rgba(201,169,98,0.3)',
              color: filter === f ? '#c8a46e' : 'rgba(245,240,232,0.7)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {f === 'all' ? 'Todas' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem', textAlign: 'left', opacity: 0.7 }}>Fecha</th>
              <th style={{ padding: '1rem', textAlign: 'left', opacity: 0.7 }}>Cliente</th>
              <th style={{ padding: '1rem', textAlign: 'left', opacity: 0.7 }}>Servicio</th>
              <th style={{ padding: '1rem', textAlign: 'right', opacity: 0.7 }}>Total</th>
              <th style={{ padding: '1rem', textAlign: 'right', opacity: 0.7 }}>Depósito</th>
              <th style={{ padding: '1rem', textAlign: 'center', opacity: 0.7 }}>Estado</th>
              <th style={{ padding: '1rem', textAlign: 'center', opacity: 0.7 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map(booking => (
              <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '1rem' }}>
                  {new Date(booking.sessionDate).toLocaleDateString('es-ES')}<br/>
                  <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>{booking.sessionTime}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {booking.client.name}<br/>
                  <span style={{ opacity: 0.6, fontSize: '0.85rem' }}>{booking.client.email}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {booking.serviceType} - {booking.serviceTier}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#60a5fa' }}>
                  ${booking.totalAmount}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', color: '#4ade80' }}>
                  ${booking.depositPaid}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <StatusBadge status={booking.status} />
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <select
                    value={booking.status}
                    onChange={(e) => updateStatus(booking.id, e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#f5f0e8',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 4,
                      fontSize: '0.8rem'
                    }}
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="no_show">No asistió</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#eab308',
    confirmed: '#22c55e',
    completed: '#60a5fa',
    cancelled: '#ef4444',
    no_show: '#9ca3af'
  }
  
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    completed: 'Completado',
    cancelled: 'Cancelado',
    no_show: 'No asistió'
  }
  
  return (
    <span style={{
      background: colors[status] + '20',
      color: colors[status],
      padding: '0.25rem 0.75rem',
      borderRadius: 20,
      fontSize: '0.8rem',
      fontWeight: 500
    }}>
      {labels[status]}
    </span>
  )
}

function ReportsView() {
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [byPlanData, setByPlanData] = useState<any>(null)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchReports()
  }, [year])

  const fetchReports = async () => {
    const monthlyRes = await fetch(`/api/reports?type=monthly&year=${year}`)
    const monthly = await monthlyRes.json()
    setMonthlyData(monthly.monthly)
    
    const planRes = await fetch('/api/reports?type=by_plan')
    const plan = await planRes.json()
    setByPlanData(plan.byPlan)
  }

  const exportCSV = async () => {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer admin-token' },
      body: JSON.stringify({ export: 'csv' })
    })
    const data = await res.json()
    
    // Download CSV
    const blob = new Blob([data.csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = data.filename
    a.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#c8a46e' }}>Reportes</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(201,169,98,0.3)',
              color: '#f5f0e8',
              padding: '0.5rem 1rem',
              borderRadius: 8
            }}
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            style={{
              background: 'rgba(201,169,98,0.2)',
              border: '1px solid #c8a46e',
              color: '#c8a46e',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* Monthly Chart */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#c8a46e', marginBottom: '1rem' }}>Ingresos por Mes ({year})</h3>
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          alignItems: 'flex-end',
          height: 200,
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          padding: '1rem'
        }}>
          {monthlyData && Object.entries(monthlyData).map(([month, data]: [string, any]) => {
            const maxValue = Math.max(...Object.values(monthlyData as object).map((d: any) => d.deposits))
            const height = maxValue > 0 ? (data.deposits / maxValue) * 150 : 0
            
            return (
              <div key={month} style={{ flex: 1, textAlign: 'center' }}>
                <div 
                  style={{ 
                    height, 
                    background: 'linear-gradient(to top, #c8a46e, #eab308)',
                    borderRadius: 4,
                    margin: '0 auto',
                    maxWidth: 40
                  }} 
                />
                <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', opacity: 0.6 }}>
                  {month.split('-')[1]}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#4ade80' }}>${data.deposits}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* By Plan */}
      <div>
        <h3 style={{ color: '#c8a46e', marginBottom: '1rem' }}>Ingresos por Plan</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {byPlanData && Object.entries(byPlanData).map(([plan, data]: [string, any]) => (
            <div key={plan} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              padding: '1rem'
            }}>
              <h4 style={{ marginBottom: '0.5rem', textTransform: 'capitalize' }}>{plan}</h4>
              <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>{data.count} sesiones</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ color: '#4ade80' }}>Depósitos: ${data.deposits}</span>
                <span style={{ color: '#60a5fa' }}>Total: ${data.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
