'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

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
  sessionCost: number
  status: string
}

type View = 'home' | 'calendar' | 'bookings' | 'reports'

const TIME_SLOTS = ['9:30', '11:30', '14:00', '16:00', '18:00']

// Export Excel Component
function ExportExcel({ bookings, monthName, year }: { bookings: Booking[]; monthName: string; year: number }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    
    const excelData = bookings.map(b => ({
      'Fecha': new Date(b.sessionDate).toLocaleDateString('es-ES'),
      'Hora': b.sessionTime,
      'Cliente': b.client.name,
      'Email': b.client.email,
      'Teléfono': b.client.phone,
      'Tipo': b.serviceType,
      'Plan': b.serviceTier,
      'Total': b.totalAmount,
      'Depósito': b.depositPaid,
      'Restante': b.remainingPaid,
      'Costo': b.sessionCost || 0,
      'Ingreso': b.status === 'completed' || b.status === 'confirmed' ? b.totalAmount : 0,
      'Beneficio': b.status === 'completed' || b.status === 'confirmed' ? (b.totalAmount - (b.sessionCost || 0)) : 0,
      'Estado': b.status
    }))
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...excelData.map(row => String(row[key as keyof typeof row]).length))
    }))
    ws['!cols'] = colWidths
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas')
    
    const completed = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed')
    const totalRevenue = completed.reduce((sum, b) => sum + b.totalAmount, 0)
    const totalCost = completed.reduce((sum, b) => sum + (b.sessionCost || 0), 0)
    
    const summaryData = [
      { 'Concepto': 'Ingresos', 'Valor': totalRevenue },
      { 'Concepto': 'Costos', 'Valor': -totalCost },
      { 'Concepto': 'Beneficio Neto', 'Valor': totalRevenue - totalCost }
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen')
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `angel-photography-${year}-${monthName.toLowerCase()}.xlsx`)
    setExporting(false)
  }

  return (
    <button onClick={handleExport} disabled={exporting || bookings.length === 0} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      {exporting ? 'Exportando...' : 'Exportar Excel'}
    </button>
  )
}

export default function AdminDashboard() {
  const [view, setView] = useState<View>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('adminView') as View) || 'home'
    }
    return 'home'
  })
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const router = useRouter()

  // Persist view to localStorage
  useEffect(() => {
    localStorage.setItem('adminView', view)
  }, [view])

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) { router.push('/admin'); return }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch from DynamoDB via API
      const res = await fetch('/api/bookings')
      if (res.ok) {
        const items = await res.json()
        // Normalize DynamoDB items to match expected format
        const normalized = items.map((item: any) => ({
          id: item.id,
          client: {
            name: item.clientName || '',
            email: item.clientEmail || '',
            phone: item.clientPhone || ''
          },
          serviceType: item.serviceType || '',
          serviceTier: item.serviceTier || '',
          sessionDate: item.sessionDate || '',
          sessionTime: item.sessionTime || '',
          totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : parseInt(item.totalAmount) || 0,
          depositPaid: typeof item.depositPaid === 'number' ? item.depositPaid : parseInt(item.depositPaid) || 0,
          remainingPaid: typeof item.remainingPaid === 'number' ? item.remainingPaid : parseInt(item.remainingPaid) || 0,
          sessionCost: typeof item.sessionCost === 'number' ? item.sessionCost : parseInt(item.sessionCost) || 0,
          status: item.status || 'pending',
          notes: item.notes || ''
        }))
        setBookings(normalized)
      } else {
        setBookings([])
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (id: string, newStatus: string) => {
    setSelectedBooking(null)
    try { 
      await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      // Refresh all bookings from server
      const res = await fetch('/api/bookings')
      if (res.ok) {
        const items = await res.json()
        const normalized = items.map((item: any) => ({
          id: item.id,
          client: { name: item.clientName || '', email: item.clientEmail || '', phone: item.clientPhone || '' },
          serviceType: item.serviceType || '', serviceTier: item.serviceTier || '',
          sessionDate: item.sessionDate || '', sessionTime: item.sessionTime || '',
          totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : parseInt(item.totalAmount) || 0,
          depositPaid: typeof item.depositPaid === 'number' ? item.depositPaid : parseInt(item.depositPaid) || 0,
          remainingPaid: typeof item.remainingPaid === 'number' ? item.remainingPaid : parseInt(item.remainingPaid) || 0,
          sessionCost: typeof item.sessionCost === 'number' ? item.sessionCost : parseInt(item.sessionCost) || 0,
          status: item.status || 'pending', notes: item.notes || ''
        }))
        setBookings(normalized)
      }
    } catch (e) { console.error(e) }
  }

  const updateSessionCost = async (id: string, cost: number) => {
    setSelectedBooking(null)
    try { 
      await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionCost: cost }) })
      // Refresh all bookings from server
      const res = await fetch('/api/bookings')
      if (res.ok) {
        const items = await res.json()
        const normalized = items.map((item: any) => ({
          id: item.id,
          client: { name: item.clientName || '', email: item.clientEmail || '', phone: item.clientPhone || '' },
          serviceType: item.serviceType || '', serviceTier: item.serviceTier || '',
          sessionDate: item.sessionDate || '', sessionTime: item.sessionTime || '',
          totalAmount: typeof item.totalAmount === 'number' ? item.totalAmount : parseInt(item.totalAmount) || 0,
          depositPaid: typeof item.depositPaid === 'number' ? item.depositPaid : parseInt(item.depositPaid) || 0,
          remainingPaid: typeof item.remainingPaid === 'number' ? item.remainingPaid : parseInt(item.remainingPaid) || 0,
          sessionCost: typeof item.sessionCost === 'number' ? item.sessionCost : parseInt(item.sessionCost) || 0,
          status: item.status || 'pending', notes: item.notes || ''
        }))
        setBookings(normalized)
      }
    } catch (e) { console.error(e) }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })
  const handleLogout = () => { localStorage.removeItem('adminToken'); router.push('/admin') }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-3 border-amber-400/30 border-t-amber-500 rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Fixed Header - Always visible */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
          </button>
          <span className="font-serif text-amber-600 text-lg">Angel Photo</span>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-amber-600">Salir</button>
      </header>

      {/* Sidebar - Desktop fixed */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-56 bg-white border-r border-gray-200 p-4 shadow-sm z-30">
        <nav className="flex-1 space-y-1">
          {[{ key: 'home', label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' }, { key: 'calendar', label: 'Calendario', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }, { key: 'bookings', label: 'Reservas', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }, { key: 'reports', label: 'Reportes', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }].map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key as View)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${view === tab.key ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setSidebarOpen(false)}>
        <aside className="absolute left-0 top-0 h-full w-56 bg-white p-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-xl text-amber-600">Angel Photo</h1>
            <button onClick={() => setSidebarOpen(false)}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          {['Inicio', 'Calendario', 'Reservas', 'Reportes'].map((label, i) => { const keys: View[] = ['home', 'calendar', 'bookings', 'reports']; return <button key={label} onClick={() => { setView(keys[i]); setSidebarOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${view === keys[i] ? 'bg-amber-50 text-amber-700' : 'text-gray-600'}`}>{label}</button> })}
        </aside>
      </div>}

      {/* Main Content - With top margin for fixed header */}
      <main className="lg:ml-56 mt-14 min-h-screen">
        <div className="p-4 lg:p-6">
          {view === 'home' && <HomeView bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} />}
          {view === 'calendar' && <CalendarView bookings={bookings} onSelectBooking={setSelectedBooking} />}
          {view === 'bookings' && <BookingsView bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} />}
          {view === 'reports' && <ReportsView bookings={bookings} />}
        </div>
      </main>

      {selectedBooking && <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onUpdateStatus={updateBookingStatus} onUpdateCost={updateSessionCost} />}
    </div>
  )
}

function KpiCard({ title, value, subtext, color }: { title: string; value: string; subtext?: string; color: string }) {
  return <div className="bg-white border border-gray-200 rounded-xl p-3 lg:p-4 shadow-sm"><p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">{title}</p><p className="text-xl lg:text-2xl font-semibold" style={{ color }}>{value}</p>{subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}</div>
}

function HomeView({ bookings, formatDate, onSelectBooking }: { bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void }) {
  // Filter by status for correct calculations
  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
  
  // Pending = sum of remainingPaid for pending bookings
  const totalPending = pendingBookings.reduce((sum, b) => sum + (b.remainingPaid || 0), 0)
  
  // Total = sum of all bookings (regardless of status)
  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0)
  
  // Facturado = sum of confirmed bookings (totalAmount, not deposits)
  const totalFacturado = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0)
  
  // Costs
  const totalCosts = confirmedBookings.reduce((sum, b) => sum + (b.sessionCost || 0), 0)
  
  // 6% tax estimate on confirmed
  const taxEstimate = Math.round(totalFacturado * 0.06)
  
  // Upcoming bookings (not cancelled, not completed)
  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-lg lg:text-xl font-semibold text-amber-600">Resumen</h2><span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
        <KpiCard title="Reservas" value={String(bookings.length)} subtext="totales" color="#b8964c" />
        <KpiCard title="x Reserva" value={`$${confirmedBookings.length ? Math.round(totalRevenue / confirmedBookings.length) : 0}`} subtext="promedio" color="#3b82f6" />
        <KpiCard title="Pendiente" value={`$${totalPending}`} subtext="por cobrar" color="#eab308" />
        <KpiCard title="Beneficio" value={`$${totalFacturado - totalCosts - taxEstimate}`} subtext="confirmadas" color="#22c55e" />
      </div>
      <div><h3 className="text-sm font-medium text-amber-600 mb-3">Próximas Sesiones</h3>
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {upcomingBookings.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No hay reservas próximas</div> : (
            <div className="divide-y divide-gray-100">
              {upcomingBookings.slice(0, 5).map(booking => (
                <button key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full p-3 lg:p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{booking.client.name}</p><p className="text-xs text-gray-500">{booking.serviceType} - {booking.serviceTier}</p></div>
                  <div className="text-right shrink-0"><p className="text-xs text-gray-500">{formatDate(booking.sessionDate)} - {booking.sessionTime}</p><div className="flex items-center justify-end gap-2 mt-1">{booking.status === 'confirmed' ? <span className="text-xs text-green-600">${booking.totalAmount}</span> : <><span className="text-xs text-amber-500">${booking.totalAmount - booking.depositPaid}</span><span className="text-xs text-green-500">+${booking.depositPaid}</span></>}</div></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BookingModal({ booking, onClose, onUpdateStatus, onUpdateCost }: { booking: Booking; onClose: () => void; onUpdateStatus: (id: string, status: string) => void; onUpdateCost: (id: string, cost: number) => void }) {
  const [sessionCost, setSessionCost] = useState(booking.sessionCost || 0)
  const [saving, setSaving] = useState(false)
  const pending = booking.totalAmount - booking.depositPaid
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = { pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' }, confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmado' }, completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completado' }, cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' } }
  const currentStatus = statusConfig[booking.status] || statusConfig.pending

  const handleSaveCost = () => { setSaving(true); onUpdateCost(booking.id, sessionCost); setSaving(false) }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-50 p-4 border-b border-amber-100"><div className="flex items-center justify-between"><h3 className="font-semibold text-amber-700">Detalle de Reserva</h3><button onClick={onClose} className="p-1 hover:bg-amber-100 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div></div>
        <div className="p-4 space-y-4">
          <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Cliente</p><p className="text-sm font-medium">{booking.client.name}</p></div>
          <div className="grid grid-cols-2 gap-3"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Correo</p><p className="text-xs">{booking.client.email}</p></div><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Celular</p><p className="text-xs">{booking.client.phone}</p></div></div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100"><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Tipo</p><p className="text-sm">{booking.serviceType}</p></div><div><p className="text-[10px] uppercase tracking-wider text-gray-400">Paquete</p><p className="text-sm">{booking.serviceTier}</p></div></div>
          <div className="pt-3 border-t border-gray-100"><p className="text-[10px] uppercase tracking-wider text-gray-400">Horario</p><p className="text-sm">{new Date(booking.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })} a las {booking.sessionTime}</p></div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Pagos</p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Total Paquete</span><span>${booking.totalAmount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Reserva</span><span className="text-green-600">+${booking.depositPaid}</span></div>
              {(booking.status === 'confirmed' || booking.status === 'completed') && <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-500">Total Pagado</span><span className="text-green-600 font-medium">${booking.totalAmount}</span></div>}
              {booking.status === 'pending' && <div className="flex justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-500">Pendiente</span><span className="text-amber-600 font-medium">${pending}</span></div>}
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Costo de Sesión</p>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <input type="number" value={sessionCost} onChange={(e) => setSessionCost(parseFloat(e.target.value) || 0)} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400" placeholder="0" />
              <button onClick={handleSaveCost} disabled={saving} className="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">{saving ? '...' : 'Guardar'}</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Asistente, estudio, props, etc.</p>
          </div>
          <div className="flex items-center justify-between pt-3"><span className="text-xs text-gray-400">Estado</span><span className={`${currentStatus.bg} ${currentStatus.text} px-3 py-1 rounded-full text-xs font-medium`}>{currentStatus.label}</span></div>
        </div>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button onClick={() => onUpdateStatus(booking.id, 'confirmed')} disabled={booking.status === 'confirmed' || booking.status === 'completed'} className="w-full py-2.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40">{booking.status === 'confirmed' || booking.status === 'completed' ? 'Confirmado' : 'Confirmar'}</button>
          <button onClick={() => onUpdateStatus(booking.id, 'completed')} disabled={booking.status !== 'confirmed'} className="w-full py-2.5 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-40">Completar</button>
          <button onClick={() => onUpdateStatus(booking.id, 'cancelled')} disabled={booking.status === 'cancelled' || booking.status === 'completed'} className="w-full py-2.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function CalendarView({ bookings, onSelectBooking }: { bookings: Booking[]; onSelectBooking: (b: Booking) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarData, setCalendarData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  const getMonthStr = () => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`

  const loadCalendar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/calendar?month=${getMonthStr()}`)
      const data = await res.json()
      if (data.availability) setCalendarData(data.availability)
    } catch (error) { console.error('Error loading calendar:', error) }
    setLoading(false)
  }

  useEffect(() => { loadCalendar() }, [currentMonth])

  const getDateKey = (day: number) => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return date < today
  }

  const getDayStatus = (day: number) => calendarData[getDateKey(day)]?.status || 'available'

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const selectedDayData = selectedDate ? calendarData[selectedDate] : null
  const selectedDayBookings = selectedDayData?.bookings || []
  const hasDayBookings = selectedDayData?.bookings?.length > 0

  const handleBlockDay = async () => {
    if (!selectedDate || hasDayBookings) return
    await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'day', date: selectedDate }) })
    loadCalendar()
  }

  const handleBlockSlot = async (time: string) => {
    if (!selectedDate) return
    await fetch('/api/calendar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'slot', date: selectedDate, time }) })
    loadCalendar()
  }

  const handleUnblock = async (type: 'day' | 'slot', time?: string) => {
    if (!selectedDate) return
    const id = type === 'day' ? `day_${selectedDate}` : `slot_${selectedDate}_${time}`
    await fetch(`/api/calendar?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    loadCalendar()
  }

  const colors: Record<string, string> = { available: 'bg-green-500', partial: 'bg-green-400', has_bookings: 'bg-amber-400', full: 'bg-red-500', blocked: 'bg-gray-400', past: 'bg-gray-100 text-gray-300' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg lg:text-xl font-semibold text-amber-600">Calendario</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-amber-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <span className="text-sm capitalize min-w-[120px] text-center">{monthName}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-amber-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
        </div>
      </div>
      <div className="flex gap-3 text-xs flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500"></span> Disponible</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400"></span> Con reservas</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500"></span> Lleno</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-400"></span> Bloqueado</span>
      </div>
      <div className="bg-white rounded-xl p-3 lg:p-4 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium py-2">{d}</div>)}
          {loading ? <div className="col-span-7 text-center py-8 text-gray-400">Cargando...</div> : days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="aspect-square" />
            const isPast = isPastDate(day)
            const isToday = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString() === new Date().toDateString()
            const isSelected = selectedDate === getDateKey(day)
            const state = isPast ? 'past' : getDayStatus(day)
            return <button key={day} onClick={() => !isPast && setSelectedDate(getDateKey(day))} className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${colors[state]} ${isToday ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-white' : ''} ${isSelected ? 'ring-2 ring-gray-800' : ''} ${isPast ? 'cursor-not-allowed' : 'hover:opacity-80'}`} disabled={isPast}>{day}</button>
          })}
        </div>
      </div>
      {selectedDate && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            {selectedDayData?.status === 'blocked' ? (
              <button onClick={() => handleUnblock('day')} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600">🔓 Desbloquear día</button>
            ) : !hasDayBookings ? (
              <button onClick={handleBlockDay} className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">🔒 Bloquear día</button>
            ) : null}
          </div>
          <div className="space-y-2">
            {['9:30', '11:30', '14:00', '16:00', '18:00'].map(time => {
              const slot = selectedDayData?.slots?.find((s: any) => s.time === time)
              const isBooked = slot?.status === 'booked'
              const isBlocked = slot?.status === 'blocked'
              const booking = selectedDayBookings.find((x: any) => x.sessionTime === time)
              const status = booking?.status || 'pending'
              const statusMap: Record<string, string> = { pending: '🟡', confirmed: '🟢', completed: '🔵', cancelled: '🔴', postponed: '🟠' }
              const statusLabel = statusMap[status] || '🟡'
              
              return (
                <div key={time} className={`flex items-center justify-between text-sm p-2 rounded ${isBooked ? 'bg-amber-50' : isBlocked ? 'bg-gray-100' : 'bg-green-50'}`}>
                  <span className="text-gray-600 font-medium w-16">{time}</span>
                  {isBooked ? (
                    <button onClick={() => { if (booking) onSelectBooking({ id: booking.id, client: { name: booking.clientName, email: '', phone: '' }, serviceType: booking.serviceType, serviceTier: booking.serviceTier, sessionDate: selectedDate, sessionTime: time, totalAmount: booking.totalAmount, depositPaid: 100, remainingPaid: booking.totalAmount - 100, sessionCost: 0, status: booking.status }) }} className="text-amber-600 hover:underline flex-1 text-left">
                      {slot?.booking?.clientName || 'Reservado'} {statusLabel}
                    </button>
                  ) : isBlocked ? (
                    <button onClick={() => handleUnblock('slot', time)} className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex-1 text-left max-w-[100px]">🔓 Desbloquear</button>
                  ) : (
                    <button onClick={() => handleBlockSlot(time)} className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 flex-1 text-left max-w-[100px]">🔒 Bloquear</button>
                  )}
                </div>
              )
            })}
          </div>
          {hasDayBookings && <p className="text-xs text-amber-500 mt-3 text-center">⚠️ No se puede bloquear el día porque hay reservas.</p>}
        </div>
      )}
    </div>
  )
}

function BookingsView({ bookings, formatDate, onSelectBooking }: { bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const filteredBookings = bookings.filter(b => (filter === 'all' || b.status === filter) && (b.client.name.toLowerCase().includes(search.toLowerCase()) || b.serviceType.toLowerCase().includes(search.toLowerCase())))
  const StatusBadge = ({ status }: { status: string }) => { const config: Record<string, { bg: string; text: string; label: string }> = { pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' }, confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmado' }, completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completado' }, cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' } }; const c = config[status] || config.pending; return <span className={`${c.bg} ${c.text} px-2 py-0.5 rounded-full text-xs font-medium`}>{c.label}</span> }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg lg:text-xl font-semibold text-amber-600">Reservas</h2><span className="text-xs text-gray-400">{filteredBookings.length} resultados</span></div>
      <div className="space-y-2">
        <input type="text" placeholder="Buscar cliente o servicio..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:border-amber-400" />
        <div className="flex gap-1.5 overflow-x-auto pb-1">{['Todas', 'Pendiente', 'Confirmado', 'Completado', 'Cancelado'].map((label, i) => { const keys = ['all', 'pending', 'confirmed', 'completed', 'cancelled']; return <button key={label} onClick={() => setFilter(keys[i])} className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${filter === keys[i] ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button> })}</div>
      </div>
      <div className="space-y-2">
        {filteredBookings.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">No se encontraron reservas</div> : filteredBookings.map(booking => (
          <button key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full bg-white rounded-xl p-3 lg:p-4 border border-gray-200 hover:border-amber-300 transition-colors text-left">
            <div className="flex items-start justify-between gap-3 mb-2"><div className="min-w-0 flex-1"><p className="font-medium text-sm truncate">{booking.client.name}</p><p className="text-xs text-gray-500 truncate">{booking.client.email}</p></div><StatusBadge status={booking.status} /></div>
            <div className="flex items-center justify-between text-xs"><div className="flex gap-3 text-gray-500"><span>{formatDate(booking.sessionDate)}</span><span>{booking.sessionTime}</span></div><div className="flex gap-2">{booking.status === 'confirmed' || booking.status === 'completed' ? <span className="text-green-600">${booking.totalAmount}</span> : <><span className="text-amber-500">${booking.totalAmount - booking.depositPaid}</span><span className="text-green-500">+${booking.depositPaid}</span></>}</div></div>
            <p className="text-xs text-amber-600 mt-2">{booking.serviceType} - {booking.serviceTier}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ReportsView({ bookings }: { bookings: Booking[] }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthOffset, setMonthOffset] = useState(0)

  const months = []
  const now = new Date()
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 11 + monthOffset, 1)
  for (let i = 0; i < 12; i++) { const m = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1); months.push({ month: m.getMonth(), year: m.getFullYear(), name: m.toLocaleDateString('es-ES', { month: 'short' }) }) }

  const monthlyData = months.map(m => {
    const monthBookings = bookings.filter(b => { const d = new Date(b.sessionDate); return d.getMonth() === m.month && d.getFullYear() === m.year })
    const completed = monthBookings.filter(b => b.status === 'completed' || b.status === 'confirmed')
    return { ...m, revenue: completed.reduce((sum, b) => sum + b.totalAmount, 0), costs: completed.reduce((sum, b) => sum + (b.sessionCost || 0), 0), profit: completed.reduce((sum, b) => sum + b.totalAmount - (b.sessionCost || 0), 0), bookings: monthBookings.length }
  })

  const maxValue = Math.max(...monthlyData.map(m => m.revenue), 100)
  const selectedMonthData = monthlyData.find(m => m.month === selectedMonth && m.year === selectedYear) || monthlyData[0]
  const selectedMonthBookings = bookings.filter(b => { const d = new Date(b.sessionDate); return d.getMonth() === selectedMonthData.month && d.getFullYear() === selectedMonthData.year })

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-lg lg:text-xl font-semibold text-amber-600">Reportes</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonthOffset(prev => Math.min(prev + 12, 0))} className="p-2 hover:bg-amber-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <span className="text-sm min-w-[100px] text-center">{selectedYear}</span>
          <button onClick={() => setMonthOffset(prev => Math.max(prev - 12, -12))} className="p-2 hover:bg-amber-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-medium mb-4">Ingresos por Mes (12 meses)</h3>
        <div className="flex items-end gap-1 lg:gap-2 h-32 lg:h-40">
          {monthlyData.map((m, i) => (
            <button key={i} onClick={() => { setSelectedMonth(m.month); setSelectedYear(m.year) }} className={`flex-1 flex flex-col items-center gap-1 group ${selectedMonthData.month === m.month && selectedMonthData.year === m.year ? 'bg-amber-50 rounded-lg p-1' : ''}`}>
              <div className="w-full bg-gradient-to-t from-amber-400 to-amber-500 rounded-t transition-all group-hover:opacity-80" style={{ height: `${Math.max((m.revenue / maxValue) * 100, 2)}%` }}></div>
              <span className={`text-[10px] ${selectedMonthData.month === m.month && selectedMonthData.year === m.year ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium">Profit & Loss - {monthNames[selectedMonthData.month]} {selectedMonthData.year}</h3><span className="text-xs text-gray-400">{selectedMonthData.bookings} sesiones</span></div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg"><p className="text-xs text-gray-500 uppercase">Ingresos</p><p className="text-lg font-semibold text-green-600">${selectedMonthData.revenue}</p></div>
          <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-xs text-gray-500 uppercase">Costos</p><p className="text-lg font-semibold text-red-600">-${selectedMonthData.costs}</p></div>
          <div className={`text-center p-3 rounded-lg ${selectedMonthData.profit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}><p className="text-xs text-gray-500 uppercase">Beneficio</p><p className={`text-lg font-semibold ${selectedMonthData.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${selectedMonthData.profit}</p></div>
        </div>
        <p className="text-xs text-gray-400 text-center">Los costos se configuran en cada reserva (asistente, estudio, props, etc.)</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium">Reservas - {monthNames[selectedMonthData.month]}</h3><span className="text-xs text-gray-400">{selectedMonthBookings.length} reservas</span></div>
        {selectedMonthBookings.length === 0 ? <p className="text-center text-gray-400 text-sm py-4">No hay reservas este mes</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100"><th className="text-left py-2 text-xs text-gray-400 font-medium">Fecha</th><th className="text-left py-2 text-xs text-gray-400 font-medium">Cliente</th><th className="text-left py-2 text-xs text-gray-400 font-medium">Plan</th><th className="text-right py-2 text-xs text-gray-400 font-medium">Total</th><th className="text-right py-2 text-xs text-gray-400 font-medium">Costo</th><th className="text-right py-2 text-xs text-gray-400 font-medium">Beneficio</th><th className="text-center py-2 text-xs text-gray-400 font-medium">Estado</th></tr></thead>
            <tbody>{selectedMonthBookings.map(b => { const isCompleted = b.status === 'completed' || b.status === 'confirmed'; return (
              <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50"><td className="py-2">{new Date(b.sessionDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td><td className="py-2 truncate max-w-[100px]">{b.client.name}</td><td className="py-2">{b.serviceTier}</td><td className="py-2 text-right text-green-600">${b.totalAmount}</td><td className="py-2 text-right text-red-500">${b.sessionCost || 0}</td><td className="py-2 text-right font-medium">{isCompleted ? `$${b.totalAmount - (b.sessionCost || 0)}` : '-'}</td><td className="py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${b.status === 'completed' ? 'bg-blue-100 text-blue-700' : b.status === 'confirmed' ? 'bg-green-100 text-green-700' : b.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span></td></tr>
            )})}</tbody>
          </table></div>
        )}
      </div>

      <div className="flex justify-end"><ExportExcel bookings={selectedMonthBookings} monthName={monthNames[selectedMonthData.month]} year={selectedMonthData.year} /></div>
    </div>
  )
}
