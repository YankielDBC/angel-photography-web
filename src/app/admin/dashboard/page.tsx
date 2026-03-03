'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  totalBookings: number
  totalDeposits: number
  totalRemaining: number
  totalRevenue: number
  averagePerBooking: number
  confirmedPending: number
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

type View = 'home' | 'calendar' | 'bookings' | 'reports'

// Horarios disponibles
const TIME_SLOTS = ['9:30', '11:30', '14:00', '16:00', '18:00']

export default function AdminDashboard() {
  const [view, setView] = useState<View>('home')
  const [stats, setStats] = useState<Stats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
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
      // Demo data
      const demoBookings: Booking[] = [
        { id: '1', client: { name: 'Maria Garcia', email: 'maria@email.com', phone: '+1 305-555-0101' }, serviceType: 'Maternity', serviceTier: 'Premium', sessionDate: '2026-03-05', sessionTime: '9:30', totalAmount: 250, depositPaid: 100, remainingPaid: 0, status: 'confirmed' },
        { id: '2', client: { name: 'Carlos Rodriguez', email: 'carlos@email.com', phone: '+1 305-555-0102' }, serviceType: 'Newborn', serviceTier: 'Basic', sessionDate: '2026-03-08', sessionTime: '14:00', totalAmount: 150, depositPaid: 100, remainingPaid: 0, status: 'pending' },
        { id: '3', client: { name: 'Ana Martinez', email: 'ana@email.com', phone: '+1 305-555-0103' }, serviceType: 'Family', serviceTier: 'Standard', sessionDate: '2026-03-10', sessionTime: '11:30', totalAmount: 200, depositPaid: 100, remainingPaid: 0, status: 'confirmed' },
        { id: '4', client: { name: 'Luis Perez', email: 'luis@email.com', phone: '+1 305-555-0104' }, serviceType: 'Kids', serviceTier: 'Premium', sessionDate: '2026-03-12', sessionTime: '16:00', totalAmount: 300, depositPaid: 100, remainingPaid: 0, status: 'pending' },
        { id: '5', client: { name: 'Sofia Lopez', email: 'sofia@email.com', phone: '+1 305-555-0105' }, serviceType: 'Wedding', serviceTier: 'Exclusive', sessionDate: '2026-03-15', sessionTime: '9:30', totalAmount: 500, depositPaid: 100, remainingPaid: 0, status: 'confirmed' },
      ]
      setBookings(demoBookings)
      
      const confirmedOrCompleted = demoBookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
      const allPaid = demoBookings.filter(b => b.status === 'confirmed')
      const totalDeposits = demoBookings.reduce((sum, b) => sum + b.depositPaid, 0)
      const pendingFromConfirmed = allPaid.reduce((sum, b) => sum + (b.totalAmount - b.depositPaid), 0)
      const totalRevenue = confirmedOrCompleted.reduce((sum, b) => sum + b.totalAmount, 0)
      const avgPerBooking = confirmedOrCompleted.length > 0 ? Math.round(totalRevenue / confirmedOrCompleted.length) : 0
      
      setStats({
        totalBookings: demoBookings.length,
        totalDeposits,
        totalRemaining: pendingFromConfirmed,
        totalRevenue,
        averagePerBooking: avgPerBooking,
        confirmedPending: pendingFromConfirmed
      })
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (id: string, newStatus: string) => {
    setBookings(prevBookings => {
      const updatedBookings = prevBookings.map(b => b.id === id ? { ...b, status: newStatus } : b)
      
      const confirmedOrCompleted = updatedBookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
      const allPaid = updatedBookings.filter(b => b.status === 'confirmed')
      const totalDeposits = updatedBookings.reduce((sum, b) => sum + b.depositPaid, 0)
      const pendingFromConfirmed = allPaid.reduce((sum, b) => sum + (b.totalAmount - b.depositPaid), 0)
      const totalRevenue = confirmedOrCompleted.reduce((sum, b) => sum + b.totalAmount, 0)
      const avgPerBooking = updatedBookings.length > 0 ? Math.round(totalRevenue / confirmedOrCompleted.length) : 0
      
      setStats({
        totalBookings: updatedBookings.length,
        totalDeposits,
        totalRemaining: pendingFromConfirmed,
        totalRevenue,
        averagePerBooking: avgPerBooking,
        confirmedPending: pendingFromConfirmed
      })
      
      return updatedBookings
    })
    
    setSelectedBooking(null)

    try {
      await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
    } catch (e) {
      console.log('Demo mode - status update simulated')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    router.push('/admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0806] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c8a46e]/30 border-t-[#c8a46e] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0806] text-[#f5f0e8]">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0f0d0b] border-b border-[#c8a46e]/20">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-[#c8a46e]/10 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        <span className="font-serif text-[#c8a46e] text-lg">Angel Photo</span>
        <button onClick={handleLogout} className="text-xs text-[#c8a46e]/70 hover:text-[#c8a46e]">
          Salir
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 bg-[#0f0d0b] border-r border-[#c8a46e]/20 p-4">
        <h1 className="font-serif text-xl text-[#c8a46e] mb-8">Angel Photo</h1>
        <nav className="flex-1 space-y-1">
          {[
            { key: 'home', label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { key: 'calendar', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { key: 'bookings', label: 'Reservas', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
            { key: 'reports', label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as View)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                view === tab.key 
                  ? 'bg-[#c8a46e]/15 text-[#c8a46e]' 
                  : 'text-[#f5f0e8]/60 hover:text-[#f5f0e8] hover:bg-[#f5f0e8]/5'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#f5f0e8]/60 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-all mt-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </aside>

      {/* Mobile Navigation Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside className="absolute left-0 top-0 h-full w-56 bg-[#0f0d0b] border-r border-[#c8a46e]/20 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-serif text-xl text-[#c8a46e]">Angel Photo</h1>
              <button onClick={() => setSidebarOpen(false)} className="p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="space-y-1">
              {[
                { key: 'home', label: 'Inicio' },
                { key: 'calendar', label: 'Calendario' },
                { key: 'bookings', label: 'Reservas' },
                { key: 'reports', label: 'Reportes' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setView(tab.key as View); setSidebarOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                    view === tab.key 
                      ? 'bg-[#c8a46e]/15 text-[#c8a46e]' 
                      : 'text-[#f5f0e8]/60 hover:text-[#f5f0e8]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-56 min-h-screen">
        <div className="p-4 lg:p-6">
          {view === 'home' && (
            <HomeView 
              stats={stats} 
              bookings={bookings} 
              formatDate={formatDate}
              onSelectBooking={setSelectedBooking}
            />
          )}
          {view === 'calendar' && <CalendarView bookings={bookings} onSelectBooking={setSelectedBooking} />}
          {view === 'bookings' && <BookingsView bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} />}
          {view === 'reports' && <ReportsView />}
        </div>
      </main>

      {/* Modal de Reserva */}
      {selectedBooking && (
        <BookingModal 
          booking={selectedBooking} 
          onClose={() => setSelectedBooking(null)}
          onUpdateStatus={updateBookingStatus}
        />
      )}
    </div>
  )
}

// === COMPONENTES ===

function KpiCard({ title, value, subtext, color }: { title: string; value: string; subtext?: string; color: string }) {
  return (
    <div className="bg-[#f5f0e8]/3 border border-[#f5f0e8]/8 rounded-xl p-3 lg:p-4">
      <p className="text-[#f5f0e8]/50 text-[10px] uppercase tracking-wider mb-1">{title}</p>
      <p className="text-xl lg:text-2xl font-semibold" style={{ color }}>{value}</p>
      {subtext && <p className="text-xs text-[#f5f0e8]/40 mt-1">{subtext}</p>}
    </div>
  )
}

function HomeView({ stats, bookings, formatDate, onSelectBooking }: { 
  stats: Stats | null; 
  bookings: Booking[]; 
  formatDate: (s: string) => string;
  onSelectBooking: (b: Booking) => void;
}) {
  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed')
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-semibold text-[#c8a46e]">Resumen</h2>
        <span className="text-xs text-[#f5f0e8]/40">{new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        <KpiCard title="Reservas" value={String(stats?.totalBookings || 0)} subtext="totales" color="#c8a46e" />
        <KpiCard title="x Reserva" value={`$${stats?.averagePerBooking || 0}`} subtext="promedio" color="#60a5fa" />
        <KpiCard title="Pendiente" value={`$${stats?.confirmedPending || 0}`} subtext="por cobrar" color="#eab308" />
        <KpiCard title="Facturado" value={`$${stats?.totalRevenue || 0}`} subtext="confirmadas" color="#22c55e" />
      </div>

      <div>
        <h3 className="text-sm font-medium text-[#c8a46e] mb-3">Proximas Sesiones</h3>
        <div className="bg-[#f5f0e8]/3 rounded-xl overflow-hidden border border-[#f5f0e8]/8">
          {upcomingBookings.length === 0 ? (
            <div className="p-6 text-center text-[#f5f0e8]/40 text-sm">No hay reservas proximas</div>
          ) : (
            <div className="divide-y divide-[#f5f0e8]/5">
              {upcomingBookings.slice(0, 5).map(booking => {
                const pending = booking.totalAmount - booking.depositPaid
                const isCancelled = booking.status === 'cancelled'
                return (
                  <button
                    key={booking.id}
                    onClick={() => onSelectBooking(booking)}
                    className="w-full p-3 lg:p-4 flex items-center justify-between gap-3 hover:bg-[#f5f0e8]/5 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCancelled ? 'line-through text-[#f5f0e8]/50' : ''}`}>{booking.client.name}</p>
                      <p className={`text-xs ${isCancelled ? 'text-[#f5f0e8]/30' : 'text-[#f5f0e8]/50'}`}>{booking.serviceType} - {booking.serviceTier}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs ${isCancelled ? 'text-[#f5f0e8]/30' : 'text-[#f5f0e8]/70'}`}>{formatDate(booking.sessionDate)} - {booking.sessionTime}</p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {booking.status === 'confirmed' || booking.status === 'completed' ? (
                          <span className="text-xs text-[#22c55e]">${booking.totalAmount}</span>
                        ) : (
                          <>
                            <span className={`text-xs ${isCancelled ? 'text-[#ef4444]/50 line-through' : 'text-[#eab308]'}`}>${pending}</span>
                            <span className="text-xs text-[#22c55e]">+${booking.depositPaid}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Modal reutilizable (solo vista, sin actions)
function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const pending = booking.totalAmount - booking.depositPaid
  
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-[#eab308]/20', text: 'text-[#eab308]', label: 'Pendiente' },
    confirmed: { bg: 'bg-[#22c55e]/20', text: 'text-[#22c55e]', label: 'Confirmado' },
    completed: { bg: 'bg-[#60a5fa]/20', text: 'text-[#60a5fa]', label: 'Completado' },
    cancelled: { bg: 'bg-[#ef4444]/20', text: 'text-[#ef4444]', label: 'Cancelado' },
  }
  const currentStatus = statusConfig[booking.status] || statusConfig.pending

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f0d0b] border border-[#c8a46e]/30 rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#c8a46e]/20 to-transparent p-4 border-b border-[#c8a46e]/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#c8a46e]">Detalle de Reserva</h3>
            <button onClick={onClose} className="p-1 hover:bg-[#f5f0e8]/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Cliente</p>
              <p className="text-sm font-medium">{booking.client.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Correo</p>
                <p className="text-xs">{booking.client.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Celular</p>
                <p className="text-xs">{booking.client.phone}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#f5f0e8]/10">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Tipo de Sesion</p>
              <p className="text-sm">{booking.serviceType}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Paquete</p>
              <p className="text-sm">{booking.serviceTier}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#f5f0e8]/10">
            <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Horario</p>
            <p className="text-sm">{new Date(booking.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })} a las {booking.sessionTime}</p>
          </div>

          <div className="pt-3 border-t border-[#f5f0e8]/10">
            <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50 mb-2">Pagos</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[#f5f0e8]/60">Total Paquete</span>
                <span>${booking.totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#f5f0e8]/60">Reserva (pagado)</span>
                <span className="text-[#22c55e]">+${booking.depositPaid}</span>
              </div>
              {(booking.status === 'confirmed' || booking.status === 'completed') ? (
                <div className="flex justify-between text-sm pt-2 border-t border-[#f5f0e8]/10">
                  <span className="text-[#f5f0e8]/60">Total Pagado</span>
                  <span className="text-[#22c55e] font-medium">${booking.totalAmount}</span>
                </div>
              ) : booking.status === 'cancelled' ? (
                <div className="flex justify-between text-sm pt-2 border-t border-[#f5f0e8]/10">
                  <span className="text-[#f5f0e8]/60">Perdido (no vino)</span>
                  <span className="text-[#ef4444]/50 line-through">${pending}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm pt-2 border-t border-[#f5f0e8]/10">
                  <span className="text-[#f5f0e8]/60">Pendiente</span>
                  <span className="text-[#eab308] font-medium">${pending}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-[#f5f0e8]/50">Estado actual</span>
            <span className={`${currentStatus.bg} ${currentStatus.text} px-3 py-1 rounded-full text-xs font-medium`}>{currentStatus.label}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingModal({ booking, onClose, onUpdateStatus }: { 
  booking: Booking; 
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const pending = booking.totalAmount - booking.depositPaid
  
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-[#eab308]/20', text: 'text-[#eab308]', label: 'Pendiente' },
    confirmed: { bg: 'bg-[#22c55e]/20', text: 'text-[#22c55e]', label: 'Confirmado' },
    completed: { bg: 'bg-[#60a5fa]/20', text: 'text-[#60a5fa]', label: 'Completado' },
    cancelled: { bg: 'bg-[#ef4444]/20', text: 'text-[#ef4444]', label: 'Cancelado' },
  }
  const currentStatus = statusConfig[booking.status] || statusConfig.pending

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0f0d0b] border border-[#c8a46e]/30 rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#c8a46e]/20 to-transparent p-4 border-b border-[#c8a46e]/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#c8a46e]">Detalle de Reserva</h3>
            <button onClick={onClose} className="p-1 hover:bg-[#f5f0e8]/10 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Cliente</p>
              <p className="text-sm font-medium">{booking.client.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Correo</p>
                <p className="text-xs">{booking.client.email}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Celular</p>
                <p className="text-xs">{booking.client.phone}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#f5f0e8]/10">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Tipo de Sesion</p>
              <p className="text-sm">{booking.serviceType}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Paquete</p>
              <p className="text-sm">{booking.serviceTier}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#f5f0e8]/10">
            <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50">Horario</p>
            <p className="text-sm">{new Date(booking.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })} a las {booking.sessionTime}</p>
          </div>

          <div className="pt-3 border-t border-[#f5f0e8]/10">
            <p className="text-[10px] uppercase tracking-wider text-[#f5f0e8]/50 mb-2">Pagos</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[#f5f0e8]/60">Total Paquete</span>
                <span>${booking.totalAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#f5f0e8]/60">Reserva (pagado)</span>
                <span className="text-[#22c55e]">+${booking.depositPaid}</span>
              </div>
              {(booking.status === 'confirmed' || booking.status === 'completed') ? (
                <div className="flex justify-between text-sm pt-2 border-t border-[#f5f0e8]/10">
                  <span className="text-[#f5f0e8]/60">Total Pagado</span>
                  <span className="text-[#22c55e] font-medium">${booking.totalAmount}</span>
                </div>
              ) : booking.status === 'cancelled' ? (
                <div className="flex justify-between text-sm pt-2 border-t border-[#f5f0e8]/10">
                  <span className="text-[#f5f0e8]/60">Perdido (no vino)</span>
                  <span className="text-[#ef4444]/50 line-through">${pending}</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm pt-2 border-t border-[#f5f0e8]/10">
                  <span className="text-[#f5f0e8]/60">Pendiente</span>
                  <span className="text-[#eab308] font-medium">${pending}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-[#f5f0e8]/50">Estado actual</span>
            <span className={`${currentStatus.bg} ${currentStatus.text} px-3 py-1 rounded-full text-xs font-medium`}>{currentStatus.label}</span>
          </div>
        </div>

        <div className="p-4 border-t border-[#f5f0e8]/10 space-y-2">
          <button
            onClick={() => onUpdateStatus(booking.id, 'confirmed')}
            disabled={booking.status === 'confirmed' || booking.status === 'completed'}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {booking.status === 'confirmed' || booking.status === 'completed' ? 'Confirmado' : 'Confirmar (ya pago el resto)'}
          </button>
          <button
            onClick={() => onUpdateStatus(booking.id, 'completed')}
            disabled={booking.status !== 'confirmed'}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#60a5fa]/20 text-[#60a5fa] hover:bg-[#60a5fa]/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Completar (ya se entrego trabajo)
          </button>
          <button
            onClick={() => onUpdateStatus(booking.id, 'cancelled')}
            disabled={booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'confirmed'}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Cancelar (no vino a la sesion)
          </button>
        </div>
      </div>
    </div>
  )
}

function CalendarView({ bookings, onSelectBooking }: { bookings: Booking[]; onSelectBooking: (b: Booking) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayStatus, setDayStatus] = useState<Record<string, 'free' | 'partial' | 'full' | 'blocked'>>({})
  const [viewOnlyModal, setViewOnlyModal] = useState<Booking | null>(null)
  const [blockedSlots, setBlockedSlots] = useState<Record<string, string[]>>({}) // date -> [times]
  const [loading, setLoading] = useState(false)

  // Cargar slots bloqueados al inicio
  useEffect(() => {
    fetchBlockedSlots()
  }, [])

  const fetchBlockedSlots = async () => {
    try {
      const res = await fetch('/api/blocked-slots', {
        headers: { 'Authorization': 'Bearer admin-token' }
      })
      const slots = await res.json()
      const grouped: Record<string, string[]> = {}
      slots.forEach((s: any) => {
        const dateKey = new Date(s.date).toISOString().split('T')[0]
        if (!grouped[dateKey]) grouped[dateKey] = []
        grouped[dateKey].push(s.time)
      })
      setBlockedSlots(grouped)
    } catch (e) {
      console.log('Demo mode - no blocked slots')
    }
  }

  const blockSlot = async (date: Date, time: string) => {
    setLoading(true)
    const dateKey = getDateKey(date)
    try {
      await fetch('/api/blocked-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token' },
        body: JSON.stringify({ date: dateKey, time, reason: 'Bloqueado por admin' })
      })
      setBlockedSlots(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), time]
      }))
    } catch (e) {
      // Demo mode
      setBlockedSlots(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), time]
      }))
    }
    setLoading(false)
  }

  const unblockSlot = async (date: Date, time: string) => {
    setLoading(true)
    const dateKey = getDateKey(date)
    try {
      await fetch(`/api/blocked-slots?date=${dateKey}&time=${time}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer admin-token' }
      })
      setBlockedSlots(prev => ({
        ...prev,
        [dateKey]: (prev[dateKey] || []).filter(t => t !== time)
      }))
    } catch (e) {
      // Demo mode
      setBlockedSlots(prev => ({
        ...prev,
        [dateKey]: (prev[dateKey] || []).filter(t => t !== time)
      }))
    }
    setLoading(false)
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  const getDateKey = (date: Date) => date.toISOString().split('T')[0]
  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Calcular estado de cada día basado en bookings
  useEffect(() => {
    const status: Record<string, 'free' | 'partial' | 'full' | 'blocked'> = {}
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInThisMonth = new Date(year, month + 1, 0).getDate()

    for (let d = 1; d <= daysInThisMonth; d++) {
      const date = new Date(year, month, d)
      const dateKey = getDateKey(date)
      const dayBookings = bookings.filter(b => b.sessionDate === dateKey && b.status !== 'cancelled')
      
      if (dayBookings.length === 0) {
        status[dateKey] = 'free'
      } else if (dayBookings.length >= TIME_SLOTS.length) {
        status[dateKey] = 'full'
      } else {
        status[dateKey] = 'partial'
      }
    }
    setDayStatus(status)
  }, [bookings, currentMonth])

  const handleBlockDay = (date: Date) => {
    const dateKey = getDateKey(date)
    const current = dayStatus[dateKey]
    
    if (current === 'blocked') {
      setDayStatus(prev => ({ ...prev, [dateKey]: 'free' }))
    } else if (current === 'free') {
      setDayStatus(prev => ({ ...prev, [dateKey]: 'blocked' }))
    } else if (current === 'partial') {
      alert('Para días con reservas parciales, bloquea los horarios disponibles manualmente')
    }
  }

  const getBookingsForDate = (date: Date) => {
    const dateKey = getDateKey(date)
    return bookings.filter(b => b.sessionDate === dateKey)
  }

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const selectedDateKey = selectedDate ? getDateKey(selectedDate) : null
  const selectedDayStatus = selectedDateKey ? dayStatus[selectedDateKey] : null
  const selectedDayBookings = selectedDate ? getBookingsForDate(selectedDate) : []
  const selectedDayBlockedSlots = selectedDate ? (blockedSlots[selectedDateKey!] || []) : []

  // Función para verificar si un slot está bloqueado
  const isSlotBlocked = (time: string) => selectedDayBlockedSlots.includes(time)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-semibold text-[#c8a46e]">Calendario</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-[#c8a46e]/10 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm capitalize min-w-[120px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-[#c8a46e]/10 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#22c55e]" /> Libre</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#eab308]" /> Parcial</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ef4444]" /> Lleno</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#7f1d1d]" /> Bloqueado</span>
      </div>

      <div className="bg-[#f5f0e8]/3 rounded-xl p-3 lg:p-4 border border-[#f5f0e8]/8">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs text-[#f5f0e8]/40 font-medium py-2">{d}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="aspect-square" />
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            const dateKey = getDateKey(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isPast = isPastDate(date)
            const isSelected = selectedDate?.toDateString() === date.toDateString()
            
            const state = isPast ? 'past' : (dayStatus[dateKey] || 'free')
            const colors: Record<string, string> = {
              free: 'bg-[#22c55e]',
              partial: 'bg-[#eab308]',
              full: 'bg-[#ef4444]',
              blocked: 'bg-[#7f1d1d]',
              past: 'bg-[#f5f0e8]/10 text-[#f5f0e8]/30'
            }

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(date)}
                className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${
                  colors[state]
                } ${isToday ? 'ring-2 ring-[#c8a46e] ring-offset-2 ring-offset-[#0a0806]' : ''} ${
                  isSelected ? 'ring-2 ring-white' : ''
                } ${isPast ? 'cursor-not-allowed' : 'hover:opacity-80'}`}
                disabled={isPast}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-[#f5f0e8]/3 rounded-xl p-4 border border-[#f5f0e8]/8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">
              {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h3>
            {selectedDayStatus !== 'full' && !isPastDate(selectedDate) && (
              <button 
                onClick={() => handleBlockDay(selectedDate)}
                className={`text-xs px-2 py-1 rounded ${
                  selectedDayStatus === 'blocked' 
                    ? 'bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30' 
                    : 'bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30'
                }`}
              >
                {selectedDayStatus === 'blocked' ? 'Desbloquear' : 'Bloquear dia'}
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {TIME_SLOTS.map(time => {
              const bookingAtTime = selectedDayBookings.find(b => b.sessionTime === time && b.status !== 'cancelled')
              const isBlocked = isSlotBlocked(time)
              const isAvailable = !bookingAtTime && !isBlocked
              
              return (
                <div 
                  key={time} 
                  className={`flex items-center justify-between text-sm p-2 rounded ${
                    isBlocked ? 'bg-[#7f1d1d]/20' : isAvailable ? 'bg-[#f5f0e8]/5' : 'bg-[#f5f0e8]/10'
                  }`}
                >
                  <span className="text-[#f5f0e8]/60">{time}</span>
                  {isBlocked ? (
                    <button
                      onClick={() => !loading && unblockSlot(selectedDate!, time)}
                      disabled={loading}
                      className="text-xs px-2 py-1 rounded bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30 disabled:opacity-50"
                    >
                      Desbloquear
                    </button>
                  ) : isAvailable ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[#22c55e]">Disponible</span>
                      <button
                        onClick={() => !loading && blockSlot(selectedDate!, time)}
                        disabled={loading}
                        className="text-xs px-2 py-1 rounded bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30 disabled:opacity-50"
                      >
                        Bloquear
                      </button>
                    </div>
                  ) : bookingAtTime ? (
                    <button
                      onClick={() => setViewOnlyModal(bookingAtTime)}
                      className="text-[#eab308] hover:underline"
                    >
                      {bookingAtTime.client.name}
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {viewOnlyModal && (
        <BookingDetailModal booking={viewOnlyModal} onClose={() => setViewOnlyModal(null)} />
      )}
    </div>
  )
}

function BookingsView({ bookings, formatDate, onSelectBooking }: { bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === 'all' || b.status === filter
    const matchesSearch = b.client.name.toLowerCase().includes(search.toLowerCase()) ||
      b.serviceType.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-[#eab308]/20', text: 'text-[#eab308]', label: 'Pendiente' },
      confirmed: { bg: 'bg-[#22c55e]/20', text: 'text-[#22c55e]', label: 'Confirmado' },
      completed: { bg: 'bg-[#60a5fa]/20', text: 'text-[#60a5fa]', label: 'Completado' },
      cancelled: { bg: 'bg-[#ef4444]/20', text: 'text-[#ef4444]', label: 'Cancelado' },
    }
    const c = config[status] || config.pending
    return <span className={`${c.bg} ${c.text} px-2 py-0.5 rounded-full text-xs font-medium`}>{c.label}</span>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-semibold text-[#c8a46e]">Reservas</h2>
        <span className="text-xs text-[#f5f0e8]/40">{filteredBookings.length} resultados</span>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          placeholder="Buscar cliente o servicio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#f5f0e8]/5 border border-[#f5f0e8]/10 rounded-lg px-3 py-2 text-sm text-[#f5f0e8] placeholder:text-[#f5f0e8]/30 focus:outline-none focus:border-[#c8a46e]/50"
        />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'pending', label: 'Pendiente' },
            { key: 'confirmed', label: 'Confirmado' },
            { key: 'completed', label: 'Completado' },
            { key: 'cancelled', label: 'Cancelado' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-[#c8a46e]/20 text-[#c8a46e] border border-[#c8a46e]/30'
                  : 'bg-[#f5f0e8]/5 text-[#f5f0e8]/60 border border-transparent hover:border-[#f5f0e8]/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-8 text-[#f5f0e8]/40 text-sm">No se encontraron reservas</div>
        ) : (
          filteredBookings.map(booking => (
            <button
              key={booking.id}
              onClick={() => onSelectBooking(booking)}
              className="w-full bg-[#f5f0e8]/3 rounded-xl p-3 lg:p-4 border border-[#f5f0e8]/8 hover:border-[#c8a46e]/30 transition-colors text-left"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{booking.client.name}</p>
                  <p className="text-xs text-[#f5f0e8]/50 truncate">{booking.client.email}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex gap-3 text-[#f5f0e8]/60">
                  <span>{formatDate(booking.sessionDate)}</span>
                  <span>{booking.sessionTime}</span>
                </div>
                <div className="flex gap-2 items-center">
                  {booking.status === 'confirmed' || booking.status === 'completed' ? (
                    <span className="text-[#22c55e]">${booking.totalAmount}</span>
                  ) : (
                    <>
                      <span className={`${booking.status === 'cancelled' ? 'line-through text-[#ef4444]/50' : 'text-[#eab308]'}`}>
                        ${booking.totalAmount - booking.depositPaid}
                      </span>
                      <span className="text-[#22c55e]">+${booking.depositPaid}</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#c8a46e]/70 mt-2">{booking.serviceType} - {booking.serviceTier}</p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function ReportsView() {
  const [year, setYear] = useState(new Date().getFullYear())

  const monthlyData = [
    { month: 'Ene', deposits: 400, total: 800 },
    { month: 'Feb', deposits: 300, total: 600 },
    { month: 'Mar', deposits: 500, total: 1000 },
    { month: 'Abr', deposits: 450, total: 900 },
    { month: 'May', deposits: 600, total: 1200 },
    { month: 'Jun', deposits: 550, total: 1100 },
  ]

  const planData = [
    { plan: 'Maternity', count: 8, deposits: 800, total: 1600 },
    { plan: 'Newborn', count: 6, deposits: 600, total: 1200 },
    { plan: 'Family', count: 5, deposits: 500, total: 1000 },
    { plan: 'Kids', count: 5, deposits: 500, total: 1000 },
  ]

  const maxDeposit = Math.max(...monthlyData.map(m => m.deposits))

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-semibold text-[#c8a46e]">Reportes</h2>
        <select
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
          className="bg-[#f5f0e8]/10 border border-[#f5f0e8]/20 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
        </select>
      </div>

      <div className="bg-[#f5f0e8]/3 rounded-xl p-4 border border-[#f5f0e8]/8">
        <h3 className="text-sm font-medium mb-4">Ingresos por Mes</h3>
        <div className="flex items-end gap-1 lg:gap-2 h-32 lg:h-40">
          {monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-gradient-to-t from-[#c8a46e] to-[#eab308] rounded-t transition-all hover:opacity-80"
                style={{ height: `${(m.deposits / maxDeposit) * 100}%` }}
              />
              <span className="text-[10px] text-[#f5f0e8]/50">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#f5f0e8]/3 rounded-xl p-4 border border-[#f5f0e8]/8">
        <h3 className="text-sm font-medium mb-4">Por Plan</h3>
        <div className="space-y-2">
          {planData.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-[#f5f0e8]/5 last:border-0">
              <div>
                <p className="text-sm font-medium">{p.plan}</p>
                <p className="text-xs text-[#f5f0e8]/50">{p.count} sesiones</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#22c55e]">${p.deposits}</p>
                <p className="text-xs text-[#60a5fa]">${p.total} total</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full bg-[#c8a46e]/10 border border-[#c8a46e]/30 text-[#c8a46e] py-3 rounded-xl text-sm font-medium hover:bg-[#c8a46e]/20 transition-colors">
        Exportar Datos (CSV)
      </button>
    </div>
  )
}
