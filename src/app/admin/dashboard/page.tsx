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
      console.log('Demo mode')
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber-400/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        <span className="font-serif text-amber-600 text-lg">Angel Photo</span>
        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-amber-600">Salir</button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-56 bg-white border-r border-gray-200 p-4 shadow-sm">
        <h1 className="font-serif text-xl text-amber-600 mb-8">Angel Photo</h1>
        <nav className="flex-1 space-y-1">
          {[
            { key: 'home', label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { key: 'calendar', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { key: 'bookings', label: 'Reservas', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { key: 'reports', label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as View)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                view === tab.key ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all mt-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </aside>

      {/* Mobile Nav Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setSidebarOpen(false)}>
          <aside className="absolute left-0 top-0 h-full w-56 bg-white border-r border-gray-200 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h1 className="font-serif text-xl text-amber-600">Angel Photo</h1>
              <button onClick={() => setSidebarOpen(false)} className="p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <nav className="space-y-1">
              {['Inicio', 'Calendario', 'Reservas', 'Reportes'].map((label, i) => {
                const keys: View[] = ['home', 'calendar', 'bookings', 'reports']
                return (
                  <button key={label} onClick={() => { setView(keys[i]); setSidebarOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${view === keys[i] ? 'bg-amber-50 text-amber-700' : 'text-gray-600'}`}>{label}</button>
                )
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-56 min-h-screen">
        <div className="p-4 lg:p-6">
          {view === 'home' && <HomeView stats={stats} bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} />}
          {view === 'calendar' && <CalendarView bookings={bookings} onSelectBooking={setSelectedBooking} />}
          {view === 'bookings' && <BookingsView bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} />}
          {view === 'reports' && <ReportsView />}
        </div>
      </main>

      {selectedBooking && <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onUpdateStatus={updateBookingStatus} />}
    </div>
  )
}

function KpiCard({ title, value, subtext, color }: { title: string; value: string; subtext?: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 lg:p-4 shadow-sm">
      <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">{title}</p>
      <p className="text-xl lg:text-2xl font-semibold" style={{ color }}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  )
}

function HomeView({ stats, bookings, formatDate, onSelectBooking }: { stats: Stats | null; bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void }) {
  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-semibold text-amber-600">Resumen</h2>
        <span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        <KpiCard title="Reservas" value={String(stats?.totalBookings || 0)} subtext="totales" color="#b8964c" />
        <KpiCard title="x Reserva" value={`$${stats?.averagePerBooking || 0}`} subtext="promedio" color="#3b82f6" />
        <KpiCard title="Pendiente" value={`$${stats?.confirmedPending || 0}`} subtext="por cobrar" color="#eab308" />
        <KpiCard title="Facturado" value={`$${stats?.totalRevenue || 0}`} subtext="confirmadas" color="#22c55e" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-amber-600 mb-3">Próximas Sesiones</h3>
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {upcomingBookings.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No hay reservas próximas</div> : (
            <div className="divide-y divide-gray-100">
              {upcomingBookings.slice(0, 5).map(booking => (
                <button key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full p-3 lg:p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{booking.client.name}</p>
                    <p className="text-xs text-gray-500">{booking.serviceType} - {booking.serviceTier}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{formatDate(booking.sessionDate)} - {booking.sessionTime}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {booking.status === 'confirmed' || booking.status === 'completed' ? <span className="text-xs text-green-600">${booking.totalAmount}</span> : <><span className="text-xs text-amber-500">${booking.totalAmount - booking.depositPaid}</span><span className="text-xs text-green-500">+${booking.depositPaid}</span></>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BookingDetailModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const pending = booking.totalAmount - booking.depositPaid
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmado' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completado' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },
  }
  const currentStatus = statusConfig[booking.status] || statusConfig.pending

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-50 p-4 border-b border-amber-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-700">Detalle de Reserva</h3>
            <button onClick={onClose} className="p-1 hover:bg-amber-100 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Cliente</p><p className="text-sm font-medium">{booking.client.name}</p></div>
          <div className="grid grid-cols-2 gap-3"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Correo</p><p className="text-xs">{booking.client.email}</p></div><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Celular</p><p className="text-xs">{booking.client.phone}</p></div></div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Tipo</p><p className="text-sm">{booking.serviceType}</p></div><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Paquete</p><p className="text-sm">{booking.serviceTier}</p></div></div>
          <div className="pt-3 border-t border-gray-100"><p className="text-[10px] uppercase tracking-wider text-gray-400">Horario</p><p className="text-sm">{new Date(booking.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })} a las {booking.sessionTime}</p></div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Pagos</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Total Paquete</span><span>${booking.totalAmount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Reserva (pagado)</span><span className="text-green-600">+${booking.depositPaid}</span></div>
              {(booking.status === 'confirmed' || booking.status === 'completed') && <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-500">Total Pagado</span><span className="text-green-600 font-medium">${booking.totalAmount}</span></div>}
              {booking.status === 'pending' && <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-500">Pendiente</span><span className="text-amber-600 font-medium">${pending}</span></div>}
            </div>
          </div>
          <div className="flex items-center justify-between pt-3"><span className="text-xs text-gray-400">Estado</span><span className={`${currentStatus.bg} ${currentStatus.text} px-3 py-1 rounded-full text-xs font-medium`}>{currentStatus.label}</span></div>
        </div>
      </div>
    </div>
  )
}

function BookingModal({ booking, onClose, onUpdateStatus }: { booking: Booking; onClose: () => void; onUpdateStatus: (id: string, status: string) => void }) {
  const pending = booking.totalAmount - booking.depositPaid
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' },
    confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmado' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completado' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' },
  }
  const currentStatus = statusConfig[booking.status] || statusConfig.pending

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-50 p-4 border-b border-amber-100">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-700">Detalle de Reserva</h3>
            <button onClick={onClose} className="p-1 hover:bg-amber-100 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Cliente</p><p className="text-sm font-medium">{booking.client.name}</p></div>
          <div className="grid grid-cols-2 gap-3"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Correo</p><p className="text-xs">{booking.client.email}</p></div><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Celular</p><p className="text-xs">{booking.client.phone}</p></div></div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Tipo</p><p className="text-sm">{booking.serviceType}</p></div><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Paquete</p><p className="text-sm">{booking.serviceTier}</p></div></div>
          <div className="pt-3 border-t border-gray-100"><p className="text-[10px] uppercase tracking-wider text-gray-400">Horario</p><p className="text-sm">{new Date(booking.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })} a las {booking.sessionTime}</p></div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Pagos</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Total Paquete</span><span>${booking.totalAmount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Reserva (pagado)</span><span className="text-green-600">+${booking.depositPaid}</span></div>
              {(booking.status === 'confirmed' || booking.status === 'completed') && <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-500">Total Pagado</span><span className="text-green-600 font-medium">${booking.totalAmount}</span></div>}
              {booking.status === 'pending' && <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-500">Pendiente</span><span className="text-amber-600 font-medium">${pending}</span></div>}
            </div>
          </div>
          <div className="flex items-center justify-between pt-3"><span className="text-xs text-gray-400">Estado</span><span className={`${currentStatus.bg} ${currentStatus.text} px-3 py-1 rounded-full text-xs font-medium`}>{currentStatus.label}</span></div>
        </div>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button onClick={() => onUpdateStatus(booking.id, 'confirmed')} disabled={booking.status === 'confirmed' || booking.status === 'completed'} className="w-full py-2.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 disabled:cursor-not-allowed transition">{booking.status === 'confirmed' || booking.status === 'completed' ? 'Confirmado' : 'Confirmar (ya pagó el resto)'}</button>
          <button onClick={() => onUpdateStatus(booking.id, 'completed')} disabled={booking.status !== 'confirmed'} className="w-full py-2.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition">Completar (ya se entregó trabajo)</button>
          <button onClick={() => onUpdateStatus(booking.id, 'cancelled')} disabled={booking.status === 'cancelled' || booking.status === 'completed' || booking.status === 'confirmed'} className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition">Cancelar (no vino a la sesión)</button>
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
  const [blockedSlots, setBlockedSlots] = useState<Record<string, string[]>>({})
  const [slotReasons, setSlotReasons] = useState<Record<string, Record<string, string>>>({}) // date -> time -> reason
  const [blockedDays, setBlockedDays] = useState<string[]>([])
  const [blockedReasons, setBlockedReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [blockSlotTime, setBlockSlotTime] = useState<string | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')

  useEffect(() => { fetchBlockedSlots(); fetchBlockedDays() }, [])
  
  const fetchBlockedDays = async () => {
    try {
      const res = await fetch('/api/blocked-dates', { headers: { 'Authorization': 'Bearer admin-token' } })
      const days = await res.json()
      setBlockedDays(days.map((d: any) => new Date(d.date).toISOString().split('T')[0]))
      const reasons: Record<string, string> = {}
      days.forEach((d: any) => {
        const dateKey = new Date(d.date).toISOString().split('T')[0]
        reasons[dateKey] = d.reason || ''
      })
      setBlockedReasons(reasons)
    } catch (e) { console.log('Demo mode') }
  }
  
  const fetchBlockedSlots = async () => {
    try {
      const res = await fetch('/api/blocked-slots', { headers: { 'Authorization': 'Bearer admin-token' } })
      const slots = await res.json()
      const grouped: Record<string, string[]> = {}
      const reasons: Record<string, Record<string, string>> = {}
      slots.forEach((s: any) => {
        const dateKey = new Date(s.date).toISOString().split('T')[0]
        if (!grouped[dateKey]) grouped[dateKey] = []
        grouped[dateKey].push(s.time)
        if (!reasons[dateKey]) reasons[dateKey] = {}
        reasons[dateKey][s.time] = s.reason || ''
      })
      setBlockedSlots(grouped)
      setSlotReasons(reasons)
    } catch (e) { console.log('Demo mode') }
  }
  const blockSlot = async (date: Date, time: string) => {
    setLoading(true)
    const dateKey = getDateKey(date)
    try {
      await fetch('/api/blocked-slots', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token' }, 
        body: JSON.stringify({ date: dateKey, time, reason: blockReason || null }) 
      })
      setBlockedSlots(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), time] }))
      setSlotReasons(prev => ({ ...prev, [dateKey]: { ...(prev[dateKey] || {}), [time]: blockReason } }))
      setShowBlockModal(false)
      setBlockReason('')
      setBlockSlotTime(null)
    } catch (e) { 
      setBlockedSlots(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), time] }))
      setSlotReasons(prev => ({ ...prev, [dateKey]: { ...(prev[dateKey] || {}), [time]: blockReason } }))
      setShowBlockModal(false)
      setBlockReason('')
      setBlockSlotTime(null)
    }
    setLoading(false)
  }

  const openBlockSlotModal = (time: string) => {
    setBlockSlotTime(time)
    setShowBlockModal(true)
  }
  const unblockSlot = async (date: Date, time: string) => {
    setLoading(true)
    const dateKey = getDateKey(date)
    try {
      await fetch(`/api/blocked-slots?date=${dateKey}&time=${time}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer admin-token' } })
      setBlockedSlots(prev => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter(t => t !== time) }))
    } catch (e) { setBlockedSlots(prev => ({ ...prev, [dateKey]: (prev[dateKey] || []).filter(t => t !== time) })) }
    setLoading(false)
  }

  const blockDay = async (date: Date) => {
    setLoading(true)
    const dateKey = getDateKey(date)
    try {
      await fetch('/api/blocked-dates', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer admin-token' }, 
        body: JSON.stringify({ date: dateKey, reason: blockReason || null }) 
      })
      setBlockedDays(prev => [...prev, dateKey])
      setBlockedReasons(prev => ({ ...prev, [dateKey]: blockReason }))
      setShowBlockModal(false)
      setBlockReason('')
    } catch (e) { 
      setBlockedDays(prev => [...prev, dateKey])
      setBlockedReasons(prev => ({ ...prev, [dateKey]: blockReason }))
      setShowBlockModal(false)
      setBlockReason('')
    }
    setLoading(false)
  }

  const unblockDay = async (date: Date) => {
    setLoading(true)
    const dateKey = getDateKey(date)
    try {
      await fetch(`/api/blocked-dates?date=${dateKey}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer admin-token' } })
      setBlockedDays(prev => prev.filter(d => d !== dateKey))
    } catch (e) { setBlockedDays(prev => prev.filter(d => d !== dateKey)) }
    setLoading(false)
  }

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  const getDateKey = (date: Date) => date.toISOString().split('T')[0]
  const isPastDate = (date: Date) => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today }

  useEffect(() => {
    const status: Record<string, 'free' | 'partial' | 'full' | 'blocked'> = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
      const dateKey = getDateKey(date)
      
      // Check if day is explicitly blocked by admin
      if (blockedDays.includes(dateKey)) {
        status[dateKey] = 'blocked'
        continue
      }
      
      // Check if day is fully booked (all slots either reserved or blocked)
      const dayBookings = bookings.filter(b => b.sessionDate === dateKey && b.status !== 'cancelled')
      const dayBlockedSlots = blockedSlots[dateKey] || []
      const totalOccupied = dayBookings.length + dayBlockedSlots.length
      
      if (totalOccupied >= TIME_SLOTS.length) {
        status[dateKey] = 'full' // Full means no more availability
      } else if (totalOccupied > 0) {
        status[dateKey] = 'partial'
      } else {
        status[dateKey] = 'free'
      }
    }
    setDayStatus(status)
  }, [bookings, currentMonth, daysInMonth, blockedDays, blockedSlots])

  const getBookingsForDate = (date: Date) => bookings.filter(b => b.sessionDate === getDateKey(date))
  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const selectedDateKey = selectedDate ? getDateKey(selectedDate) : null
  const selectedDayBookings = selectedDate ? getBookingsForDate(selectedDate) : []
  const selectedDayBlockedSlots = selectedDate ? (blockedSlots[selectedDateKey!] || []) : []
  const isSlotBlocked = (time: string) => selectedDayBlockedSlots.includes(time)
  const isDayBlocked = selectedDateKey ? blockedDays.includes(selectedDateKey) : false

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-semibold text-amber-600">Calendario</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-amber-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <span className="text-sm capitalize min-w-[120px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-amber-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
        </div>
      </div>
      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500"></span> Libre</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400"></span> Parcial</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> Lleno</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-400"></span> Bloqueado</span>
      </div>
      <div className="bg-white rounded-xl p-3 lg:p-4 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium py-2">{d}</div>)}
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="aspect-square" />
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
            const dateKey = getDateKey(date)
            const isToday = date.toDateString() === new Date().toDateString()
            const isPast = isPastDate(date)
            const isSelected = selectedDate?.toDateString() === date.toDateString()
            const isDayBlocked = blockedDays.includes(dateKey)
            const state = isPast ? 'past' : (isDayBlocked ? 'blocked' : (dayStatus[dateKey] || 'free'))
            const colors: Record<string, string> = { free: 'bg-green-500', partial: 'bg-amber-400', full: 'bg-red-500', blocked: 'bg-gray-400', past: 'bg-gray-100 text-gray-300' }
            return <button key={day} onClick={() => !isPast && setSelectedDate(date)} className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${colors[state]} ${isToday ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white' : ''} ${isSelected ? 'ring-2 ring-gray-800' : ''} ${isPast ? 'cursor-not-allowed' : 'hover:opacity-80'}`} disabled={isPast}>{day}</button>
          })}
        </div>
      </div>
      {selectedDate && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            {!isPastDate(selectedDate) && (
              isDayBlocked ? (
                <div className="flex items-center gap-2">
                  {blockedReasons[selectedDateKey!] && (
                    <button 
                      onClick={() => { setNoteText(blockedReasons[selectedDateKey!]); setShowNoteModal(true) }}
                      className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                    >
                      Ver nota
                    </button>
                  )}
                  <button onClick={() => !loading && unblockDay(selectedDate!)} disabled={loading} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">Desbloquear</button>
                </div>
              ) : (
                <button onClick={() => setShowBlockModal(true)} disabled={loading} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Bloquear día</button>
              )
            )}
          </div>
          <div className="space-y-2">
            {TIME_SLOTS.map(time => {
              const bookingAtTime = selectedDayBookings.find(b => b.sessionTime === time && b.status !== 'cancelled')
              const isBlocked = isSlotBlocked(time)
              const isAvailable = !bookingAtTime && !isBlocked && !isDayBlocked
              return (
                <div key={time} className={`flex items-center justify-between text-sm p-2 rounded ${isDayBlocked ? 'bg-gray-50 opacity-50' : isBlocked ? 'bg-gray-100' : isAvailable ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <span className="text-gray-600">{time}</span>
                  {isDayBlocked ? (
                    <span className="text-xs text-gray-400">Bloqueado</span>
                  ) : isBlocked ? (
                    <div className="flex items-center gap-2">
                      {slotReasons[selectedDateKey!]?.[time] && (
                        <button 
                          onClick={() => { setNoteText(slotReasons[selectedDateKey!][time]); setShowNoteModal(true) }}
                          className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                        >
                          Ver nota
                        </button>
                      )}
                      <button onClick={() => !loading && unblockSlot(selectedDate!, time)} disabled={loading} className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50">Desbloquear</button>
                    </div>
                  ) : isAvailable ? (
                    <div className="flex items-center gap-2"><span className="text-green-600">Disponible</span><button onClick={() => openBlockSlotModal(time)} disabled={loading} className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50">Bloquear</button></div>
                  ) : bookingAtTime ? (
                    <button onClick={() => setViewOnlyModal(bookingAtTime)} className="text-amber-600 hover:underline">{bookingAtTime.client.name}</button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {viewOnlyModal && <BookingDetailModal booking={viewOnlyModal} onClose={() => setViewOnlyModal(null)} />}
      
      {/* Block Day/Slot Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowBlockModal(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="bg-red-50 p-4 border-b border-red-100">
              <h3 className="font-semibold text-red-700">{blockSlotTime ? `Bloquear Horario ${blockSlotTime}` : 'Bloquear Día'}</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Motivo (opcional)</label>
                <textarea 
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="Ej: Vacaciones, evento personal..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-red-400"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowBlockModal(false); setBlockSlotTime(null); setBlockReason('') }} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Cancelar</button>
                <button 
                  onClick={() => blockSlotTime ? blockSlot(selectedDate!, blockSlotTime) : blockDay(selectedDate!)} 
                  disabled={loading} 
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                >
                  Bloquear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowNoteModal(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-50 p-4 border-b border-amber-100">
              <h3 className="font-semibold text-amber-700">Nota</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{noteText || 'Sin nota'}</p>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setShowNoteModal(false)} className="w-full py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingsView({ bookings, formatDate, onSelectBooking }: { bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const filteredBookings = bookings.filter(b => (filter === 'all' || b.status === filter) && (b.client.name.toLowerCase().includes(search.toLowerCase()) || b.serviceType.toLowerCase().includes(search.toLowerCase())))
  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { bg: string; text: string; label: string }> = { pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' }, confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmado' }, completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completado' }, cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' } }
    const c = config[status] || config.pending
    return <span className={`${c.bg} ${c.text} px-2 py-0.5 rounded-full text-xs font-medium`}>{c.label}</span>
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg lg:text-xl font-semibold text-amber-600">Reservas</h2><span className="text-xs text-gray-400">{filteredBookings.length} resultados</span></div>
      <div className="space-y-2">
        <input type="text" placeholder="Buscar cliente o servicio..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-amber-400" />
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['Todas', 'Pendiente', 'Confirmado', 'Completado', 'Cancelado'].map((label, i) => {
            const keys = ['all', 'pending', 'confirmed', 'completed', 'cancelled']
            return <button key={label} onClick={() => setFilter(keys[i])} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${filter === keys[i] ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
          })}
        </div>
      </div>
      <div className="space-y-2">
        {filteredBookings.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">No se encontraron reservas</div> : filteredBookings.map(booking => (
          <button key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full bg-white rounded-xl p-3 lg:p-4 border border-gray-200 hover:border-amber-300 transition-colors text-left">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1"><p className="font-medium text-sm truncate">{booking.client.name}</p><p className="text-xs text-gray-500 truncate">{booking.client.email}</p></div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-3 text-gray-500"><span>{formatDate(booking.sessionDate)}</span><span>{booking.sessionTime}</span></div>
              <div className="flex gap-2">{booking.status === 'confirmed' || booking.status === 'completed' ? <span className="text-green-600">${booking.totalAmount}</span> : <><span className="text-amber-500">${booking.totalAmount - booking.depositPaid}</span><span className="text-green-500">+${booking.depositPaid}</span></>}</div>
            </div>
            <p className="text-xs text-amber-600 mt-2">{booking.serviceType} - {booking.serviceTier}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ReportsView() {
  const [year, setYear] = useState(new Date().getFullYear())
  const monthlyData = [{ month: 'Ene', deposits: 400 }, { month: 'Feb', deposits: 300 }, { month: 'Mar', deposits: 500 }, { month: 'Abr', deposits: 450 }, { month: 'May', deposits: 600 }, { month: 'Jun', deposits: 550 }]
  const planData = [{ plan: 'Maternity', count: 8, deposits: 800 }, { plan: 'Newborn', count: 6, deposits: 600 }, { plan: 'Family', count: 5, deposits: 500 }, { plan: 'Kids', count: 5, deposits: 500 }]
  const maxDeposit = Math.max(...monthlyData.map(m => m.deposits))
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-lg lg:text-xl font-semibold text-amber-600">Reportes</h2><select value={year} onChange={e => setYear(parseInt(e.target.value))} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm"><option value={2025}>2025</option><option value={2026}>2026</option></select></div>
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"><h3 className="text-sm font-medium mb-4">Ingresos por Mes</h3><div className="flex items-end gap-1 lg:gap-2 h-32 lg:h-40">{monthlyData.map((m, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1"><div className="w-full bg-gradient-to-t from-amber-400 to-amber-500 rounded-t transition-all hover:opacity-80" style={{ height: `${(m.deposits / maxDeposit) * 100}%` }}></div><span className="text-[10px] text-gray-400">{m.month}</span></div>)}</div></div>
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"><h3 className="text-sm font-medium mb-4">Por Plan</h3><div className="space-y-2">{planData.map((p, i) => <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"><div><p className="text-sm font-medium">{p.plan}</p><p className="text-xs text-gray-400">{p.count} sesiones</p></div><div className="text-right"><p className="text-sm text-green-600">${p.deposits}</p></div></div>)}</div></div>
      <button className="w-full bg-amber-50 border border-amber-200 text-amber-700 py-3 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">Exportar Datos (CSV)</button>
    </div>
  )
}
