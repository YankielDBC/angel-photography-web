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
  // Campos adicionales
  clientAge?: string
  clientNotes?: string
  family2?: boolean
  family4?: boolean
  hairMakeup?: boolean
  outdoor?: boolean
  outdoorLocation?: string
  additionalServicesCost?: number
  // Gastos de sesión
  expenses?: Array<{ amount: number; category: string; notes: string; createdAt: string }>
}

type View = 'home' | 'calendar' | 'bookings' | 'reports'

// Centralized constants - single source of truth
const TIME_SLOTS = ['9:30', '11:30', '14:00', '16:00', '18:00']

// These can be overridden by API
let SERVICE_TYPES_FROM_API: Record<string, string> = {
  pregnant: 'Maternidad',
  newborn: 'Newborn',
  kids: 'Niños',
  wedding: 'Boda',
  eventos: 'Eventos',
  exclusivo: 'Exclusivo'
}

const SERVICE_TYPES: Record<string, string> = {
  pregnant: 'Maternidad',
  newborn: 'Newborn',
  kids: 'Niños',
  wedding: 'Boda',
  eventos: 'Eventos',
  exclusivo: 'Exclusivo'
}

const SERVICE_TIERS: Record<string, string> = {
  digital: 'Digital',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  premium: 'Premium'
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-100' },
  confirmed: { label: 'Confirmado', color: 'text-green-700', bg: 'bg-green-100' },
  completed: { label: 'Completado', color: 'text-blue-700', bg: 'bg-blue-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
  postponed: { label: 'Pospuesto', color: 'text-orange-700', bg: 'bg-orange-100' }
}

// Format helpers - use API values when available
const formatServiceType = (type: string) => SERVICE_TYPES_FROM_API[type] || SERVICE_TYPES[type] || type
const formatServiceTier = (tier: string) => SERVICE_TIERS[tier] || tier
const formatStatus = (status: string) => STATUS_LABELS[status]?.label || status
const getStatusConfig = (status: string) => STATUS_LABELS[status] || STATUS_LABELS.pending

// Format time to 12-hour format
const formatTime = (time: string) => {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m || '00'} ${ampm}`
}

// Export Excel Component
function ExportExcel({ bookings, monthName, year }: { bookings: Booking[]; monthName: string; year: number }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    
    const excelData = bookings.map(b => ({
      'Fecha': new Date(b.sessionDate).toLocaleDateString('es-ES'),
      'Hora': formatTime(b.sessionTime),
      'Cliente': b.client.name,
      'Email': b.client.email,
      'Teléfono': b.client.phone,
      'Tipo': formatServiceType(b.serviceType),
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
  const [packages, setPackages] = useState<{sessionTypes: any[], packages: Record<string, any[]>} | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const router = useRouter()

  // Fetch packages from API - single source of truth
  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/packages')
      if (res.ok) {
        const data = await res.json()
        setPackages(data)
        // Update constants from API
        SERVICE_TYPES_FROM_API = data.sessionTypes.reduce((acc: Record<string, string>, t: any) => {
          acc[t.id] = t.nameEs || t.name
          return acc
        }, {})
      }
    } catch (e) { console.error('Error fetching packages:', e) }
  }

  // Persist view to localStorage
  useEffect(() => {
    localStorage.setItem('adminView', view)
  }, [view])

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) { router.push('/admin'); return }
    fetchData()
    fetchPackages()
    
    // Auto-cancel: reservas pending con más de 48 horas de antigüedad se cancelan automáticamente
    const autoCancelOldPending = async () => {
      const now = new Date()
      for (const booking of bookings) {
        if (booking.status === 'pending') {
          const sessionDate = new Date(booking.sessionDate)
          const diffHours = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60)
          if (diffHours > 48) {
            await fetch(`/api/bookings?id=${booking.id}`, { 
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ status: 'cancelled' }) 
            })
          }
        }
      }
    }
    if (bookings.length > 0) autoCancelOldPending()
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
          notes: item.notes || '',
          // Campos adicionales
          clientAge: item.clientAge || null,
          clientNotes: item.clientNotes || '',
          family2: item.family2 || false,
          family4: item.family4 || false,
          hairMakeup: item.hairMakeup || false,
          outdoor: item.outdoor || false,
          outdoorLocation: item.outdoorLocation || null,
          additionalServicesCost: item.additionalServicesCost || 0,
          // Gastos
          expenses: item.expenses || []
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
      await fetch(`/api/bookings?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
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
          status: item.status || 'pending', notes: item.notes || '',
          // Campos adicionales
          clientAge: item.clientAge || null,
          clientNotes: item.clientNotes || '',
          family2: item.family2 || false,
          family4: item.family4 || false,
          hairMakeup: item.hairMakeup || false,
          outdoor: item.outdoor || false,
          outdoorLocation: item.outdoorLocation || null,
          additionalServicesCost: item.additionalServicesCost || 0,
          // Gastos
          expenses: item.expenses || []
        }))
        setBookings(normalized)
      }
    } catch (e) { console.error(e) }
  }

  const updateSessionCost = async (id: string, cost: number) => {
    setSelectedBooking(null)
    try { 
      await fetch(`/api/bookings?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionCost: cost }) })
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
          status: item.status || 'pending', notes: item.notes || '',
          // Campos adicionales
          clientAge: item.clientAge || null,
          clientNotes: item.clientNotes || '',
          family2: item.family2 || false,
          family4: item.family4 || false,
          hairMakeup: item.hairMakeup || false,
          outdoor: item.outdoor || false,
          outdoorLocation: item.outdoorLocation || null,
          additionalServicesCost: item.additionalServicesCost || 0,
          // Gastos
          expenses: item.expenses || []
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
          {view === 'calendar' && <CalendarView bookings={bookings} onSelectBooking={setSelectedBooking} refreshCalendar={fetchData} />}
          {view === 'bookings' && <BookingsView bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} />}
          {view === 'reports' && <ReportsView bookings={bookings} />}
        </div>
      </main>

      {selectedBooking && <BookingModal booking={selectedBooking} onClose={() => { setSelectedBooking(null); fetchData(); }} onUpdateStatus={updateBookingStatus} onUpdateCost={updateSessionCost} onRefresh={fetchData} />}
    </div>
  )
}

function KpiCard({ title, value, subtext, color }: { title: string; value: string; subtext?: string; color: string }) {
  return <div className="bg-white border border-gray-200 rounded-xl p-3 lg:p-4 shadow-sm"><p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1">{title}</p><p className="text-xl lg:text-2xl font-semibold" style={{ color }}>{value}</p>{subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}</div>
}

function HomeView({ bookings, formatDate, onSelectBooking }: { bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void }) {
  // Filter by status for correct calculations
  // pending: $100 deposit + resto pendiente
  // confirmed: pagó todo
  // completed: sesión realizada, pagó todo
  // cancelled: solo los $100 deposit (el resto NO se cobra)
  
  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')
  
  // Facturado = $100 deposit de todas las reservas (pending + cancelled) + totalAmount de confirmed/completed
  const depositFromPending = pendingBookings.reduce((sum, b) => sum + (b.depositPaid || 100), 0)
  const depositFromCancelled = cancelledBookings.reduce((sum, b) => sum + (b.depositPaid || 100), 0)
  const totalFromConfirmed = confirmedBookings.reduce((sum, b) => sum + b.totalAmount, 0)
  const totalFacturado = depositFromPending + depositFromCancelled + totalFromConfirmed
  
  // Pendiente = (totalAmount - $100) de reservas PENDING
  // Lo que falta por pagar de las reservas que aún no confirman
  const totalPending = pendingBookings.reduce((sum, b) => {
    const additional = b.additionalServicesCost || 0
    return sum + (b.totalAmount - 100) + additional
  }, 0)
  
  // Costs (sessionCost = costo del photographer para esa sesión)
  const totalCosts = confirmedBookings.reduce((sum, b) => sum + (b.sessionCost || 0), 0)
  
  // Beneficio = facturado - costos
  const beneficio = totalFacturado - totalCosts
  
  // 6% tax estimate
  const taxEstimate = Math.round(totalFacturado * 0.06)
  
  // Upcoming bookings (not cancelled, not completed)
  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-lg lg:text-xl font-semibold text-amber-600">Resumen</h2><span className="text-xs text-gray-400">{new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:g-3">
        <KpiCard title="Reservas" value={String(bookings.length)} subtext="totales" color="#b8964c" />
        <KpiCard title="Facturado" value={`$${totalFacturado}`} subtext="deposit + completas" color="#22c55e" />
        <KpiCard title="Pendiente" value={`$${totalPending}`} subtext="por cobrar" color="#eab308" />
        <KpiCard title="Impuesto" value={`$${taxEstimate}`} subtext={`6% de $${totalFacturado}`} color="#3b82f6" />
      </div>
      <div><h3 className="text-sm font-medium text-amber-600 mb-3">Próximas Sesiones</h3>
        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {upcomingBookings.length === 0 ? <div className="p-6 text-center text-gray-400 text-sm">No hay reservas próximas</div> : (
            <div className="divide-y divide-gray-100">
              {upcomingBookings.slice(0, 5).map(booking => (
                <button key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full p-3 lg:p-4 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{booking.client.name}</p><p className="text-xs text-gray-500">{formatServiceType(booking.serviceType)} - {formatServiceTier(booking.serviceTier)}</p></div>
                  <div className="text-right shrink-0"><p className="text-xs text-gray-500">{formatDate(booking.sessionDate)} - {formatTime(booking.sessionTime)}</p><div className="flex items-center justify-end gap-2 mt-1">{booking.status === 'confirmed' || booking.status === 'completed' ? <span className="text-xs text-green-600">${booking.totalAmount}</span> : <><span className="text-xs text-amber-500">${((booking.remainingPaid || 0) + (booking.additionalServicesCost || 0))}</span><span className="text-xs text-green-500">+${booking.depositPaid}</span></>}</div></div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BookingModal({ booking, onClose, onUpdateStatus, onUpdateCost, onRefresh }: { booking: Booking; onClose: () => void; onUpdateStatus: (id: string, status: string) => void; onUpdateCost: (id: string, cost: number) => void; onRefresh?: () => void }) {
  // Estado local para mantener los datos actualizados del booking
  const [localBooking, setLocalBooking] = useState(booking)
  
  // Sincronizar cuando cambia el booking prop
  useEffect(() => {
    setLocalBooking(booking)
  }, [booking])
  
  // Inicializar con string vacío si es 0 para poder escribir directamente
  const [sessionCost, setSessionCost] = useState(String(localBooking.sessionCost || ''))
  const [saving, setSaving] = useState(false)
  // Estados para colapsar/expandir secciones (inician colapsados por defecto)
  const [showExtras, setShowExtras] = useState(false)
  const [showPagos, setShowPagos] = useState(false)
  const [showGastos, setShowGastos] = useState(false)
  // Estado para formulario de agregar gasto
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('gasolina')
  const [expenseNotes, setExpenseNotes] = useState('')
  
  // Obtener gastos del booking (usar localBooking para datos actualizados)
  const expenses: Array<{ amount: number; category: string; notes: string; createdAt: string }> = (localBooking as any).expenses || []
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  
  const pending = localBooking.totalAmount - localBooking.depositPaid
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = { pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' }, confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmado' }, completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completado' }, cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelado' } }
  const currentStatus = statusConfig[localBooking.status] || statusConfig.pending

  // Extraer campos adicionales del booking
  const clientAge = (booking as any).clientAge
  const clientNotes = (booking as any).clientNotes
  const family2 = (booking as any).family2
  const family4 = (booking as any).family4
  const hairMakeup = (booking as any).hairMakeup
  const outdoor = (booking as any).outdoor
  const outdoorLocation = (booking as any).outdoorLocation
  const additionalServicesCost = (booking as any).additionalServicesCost || 0

  const handleSaveCost = () => { 
    setSaving(true); 
    onUpdateCost(localBooking.id, parseFloat(sessionCost) || 0); 
    setSaving(false) 
  }
  
  const handleAddExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) return
    const newExpense = {
      amount: parseFloat(expenseAmount),
      category: expenseCategory,
      notes: expenseNotes,
      createdAt: new Date().toISOString()
    }
    const currentExpenses = (localBooking as any).expenses || []
    await fetch(`/api/bookings?id=${localBooking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses: [...currentExpenses, newExpense] })
    })
    // Actualizar estado local directamente
    setLocalBooking({ ...localBooking, expenses: [...currentExpenses, newExpense] })
    setShowAddExpense(false)
    setExpenseAmount('')
    setExpenseNotes('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-sm h-[75vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-amber-700 text-sm">Reserva</h3>
          <button onClick={onClose} className="p-1 hover:bg-amber-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3">
          {/* Cliente */}
          <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Cliente</p><p className="text-sm font-medium">{localBooking.client.name}</p></div>
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Correo</p><p className="text-xs truncate">{localBooking.client.email}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Celular</p><p className="text-xs">{localBooking.client.phone}</p></div>
          </div>
          
          {/* Servicio */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Tipo</p><p className="text-xs">{formatServiceType(localBooking.serviceType)}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-gray-400">Paquete</p><p className="text-xs">{formatServiceTier(localBooking.serviceTier)}</p></div>
          </div>
          
          {/* Fecha y Hora */}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[10px] uppercase tracking-wider text-gray-400">Fecha y Hora</p>
            <p className="text-xs">{new Date(localBooking.sessionDate).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })} a las {formatTime(localBooking.sessionTime)}</p>
          </div>
          
          {/* Campos adicionales */}
          {(clientAge || clientNotes || family2 || family4 || hairMakeup || outdoor) && (
            <div className="pt-2 border-t border-gray-100">
              <button onClick={() => setShowExtras(!showExtras)} className="w-full flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-amber-600">Extras</p>
                <svg className={`w-4 h-4 text-amber-600 transition-transform ${showExtras ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showExtras && (
                <>
                  {clientAge && <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Edad nino/a</span><span>{clientAge}</span></div>}
                  {clientNotes && <div className="mb-2"><span className="text-gray-500 text-xs">Notas: </span><span className="text-xs text-gray-700">{clientNotes}</span></div>}
                  {family2 && <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">+2 Familiares</span><span>$50</span></div>}
                  {family4 && <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">+4 Familiares</span><span>$80</span></div>}
                  {hairMakeup && <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Peluqueria/Maquillaje</span><span>$90</span></div>}
                  {outdoor && <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Outdoor ({outdoorLocation === 'near' ? 'Cerca' : 'Lejos'})</span><span>${outdoorLocation === 'near' ? '100' : '200'}</span></div>}
                  {additionalServicesCost > 0 && <div className="flex justify-between text-xs font-medium pt-1 border-t border-gray-100 mt-1"><span className="text-amber-600">Total Extras</span><span className="text-amber-600">${additionalServicesCost}</span></div>}
                </>
              )}
            </div>
          )}
          
          {/* Pagos */}
          <div className="pt-2 border-t border-gray-100">
            <button onClick={() => setShowPagos(!showPagos)} className="w-full flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Pagos</p>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showPagos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showPagos && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Paquete</span><span>${localBooking.totalAmount - (additionalServicesCost || 0)}</span></div>
                {additionalServicesCost > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Servicios extras</span><span>${additionalServicesCost}</span></div>}
                <div className="flex justify-between text-xs"><span className="text-gray-500">Reserva (pagado)</span><span className="text-green-600">-${localBooking.depositPaid}</span></div>
                {(localBooking.status === 'confirmed' || localBooking.status === 'completed') && <div className="flex justify-between text-xs pt-1 border-t border-gray-100 font-medium"><span className="text-gray-500">Pagado</span><span className="text-green-600">$${localBooking.totalAmount}</span></div>}
                {localBooking.status === 'pending' && <div className="flex justify-between text-xs pt-1 border-t border-gray-100 font-medium"><span className="text-gray-500">Pendiente</span><span className="text-amber-600">${pending + (additionalServicesCost || 0)}</span></div>}
              </div>
            )}
          </div>
          
          {/* Gastos */}
          <div className="pt-2 border-t border-gray-100">
            <button onClick={() => setShowGastos(!showGastos)} className="w-full flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Gastos</p>
              <div className="flex items-center gap-1">
                {totalExpenses > 0 && <span className="text-xs text-red-500">-${totalExpenses}</span>}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${showGastos ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </button>
            {showGastos && (
              <div className="space-y-2">
                {/* Lista de gastos */}
                {expenses.map((expense, idx) => (
                  <div key={idx} className="bg-gray-50 rounded p-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-600 capitalize">{expense.category}</span>
                      <span className="text-red-500">-${expense.amount}</span>
                    </div>
                    {expense.notes && <p className="text-gray-400 text-[10px] mt-1">{expense.notes}</p>}
                  </div>
                ))}
                {/* Total */}
                {totalExpenses > 0 && (
                  <div className="flex justify-between text-xs font-medium pt-1 border-t border-gray-200">
                    <span className="text-gray-500">Total Gastos</span>
                    <span className="text-red-500">-${totalExpenses}</span>
                  </div>
                )}
                {/* Botón agregar */}
                <button onClick={() => setShowAddExpense(true)} className="w-full py-1.5 bg-gray-100 text-gray-500 rounded text-xs hover:bg-gray-200">+ Agregar Gasto</button>
              </div>
            )}
          </div>
          
          {/* Estado */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-gray-400 uppercase">Estado</span>
            <span className={`${currentStatus.bg} ${currentStatus.text} px-2 py-0.5 rounded-full text-xs`}>{currentStatus.label}</span>
          </div>
        </div>
        
        {/* Modal de agregar gasto */}
        {showAddExpense && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddExpense(false)}>
            <div className="bg-white rounded-xl w-full max-w-xs p-4 space-y-3" onClick={e => e.stopPropagation()}>
              <h4 className="font-semibold text-amber-700 text-sm">Agregar Gasto</h4>
              <div>
                <label className="text-xs text-gray-500">Monto</label>
                <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="0" autoFocus />
              </div>
              <div>
                <label className="text-xs text-gray-500">Categoría</label>
                <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs">
                  <option value="gasolina">Gasolina</option>
                  <option value="parqueo">Parqueo</option>
                  <option value="comida">Comida</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Notas</label>
                <textarea value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs" placeholder="Descripción..." rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddExpense(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded text-xs">Cancelar</button>
                <button onClick={handleAddExpense} className="flex-1 py-2 bg-amber-500 text-white rounded text-xs">Guardar</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Botones */}
        <div className="p-2 border-t border-gray-100 space-y-1">
          {/* Lógica de estados:
              - Confirmar: solo si pending (cliente pagó el resto)
              - Completar: solo si confirmed Y la fecha ya pasó
              - Cancelar: si pending o confirmed (no-show, cliente no vino)
          */}
          <div className="grid grid-cols-3 gap-1">
            {/* Confirmar: solo si está pending */}
            <button onClick={() => onUpdateStatus(localBooking.id, 'confirmed')} disabled={localBooking.status !== 'pending'} className="py-2 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40">Confirmar</button>
            {/* Completar: solo si está confirmed Y la fecha ya pasó */}
            <button onClick={() => onUpdateStatus(localBooking.id, 'completed')} disabled={localBooking.status !== 'confirmed' || new Date(localBooking.sessionDate) > new Date()} className="py-2 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-40">Completar</button>
            {/* Cancelar: si está pending o confirmed (no completed) */}
            <button onClick={() => onUpdateStatus(localBooking.id, 'cancelled')} disabled={localBooking.status === 'cancelled' || localBooking.status === 'completed'} className="py-2 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CalendarView({ bookings, onSelectBooking, refreshCalendar }: { bookings: Booking[]; onSelectBooking: (b: Booking) => void; refreshCalendar?: () => Promise<void> }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay()
  const monthName = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const weekDays = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  const getDateKey = (day: number) => `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  // Reservas del día seleccionado directamente del prop bookings
  const selectedDayBookings = selectedDate 
    ? bookings.filter(b => b.sessionDate === selectedDate && b.status !== 'cancelled')
    : []

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return date < today
  }

  const getDayStatus = (day: number) => {
    const dateKey = getDateKey(day)
    const dayBookings = bookings.filter(b => b.sessionDate === dateKey && b.status !== 'cancelled')
    if (dayBookings.length === 0) return 'available'
    const hasPending = dayBookings.some(b => b.status === 'pending')
    const hasConfirmed = dayBookings.some(b => b.status === 'confirmed' || b.status === 'completed')
    if (hasConfirmed) return 'full'
    if (hasPending) return 'has_bookings'
    return 'available'
  }

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

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
      </div>
      <div className="bg-white rounded-xl p-3 lg:p-4 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => <div key={d} className="text-center text-xs text-gray-400 font-medium py-2">{d}</div>)}
          {days.map((day, i) => {
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
            <span className="text-xs text-gray-500">{selectedDayBookings.length} reserva(s)</span>
          </div>
          <div className="space-y-2">
            {['9:30', '11:30', '14:00', '16:00', '18:00'].map(time => {
              const booking = selectedDayBookings.find((b) => b.sessionTime === time)
              const isBooked = !!booking
              const status = booking?.status || 'pending'
              const statusMap: Record<string, string> = { pending: '🟡', confirmed: '🟢', completed: '🔵', cancelled: '🔴', postponed: '🟠' }
              const statusLabel = statusMap[status] || '🟡'
              
              return (
                <div key={time} className={`flex items-center justify-between text-sm p-2 rounded ${isBooked ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <span className="text-gray-600 font-medium w-16">{time}</span>
                  {isBooked ? (
                    <button onClick={() => { 
                      if (booking) onSelectBooking({ 
                        id: booking.id, 
                        client: { name: booking.client.name, email: booking.client.email || '', phone: booking.client.phone || '' }, 
                        serviceType: booking.serviceType, 
                        serviceTier: booking.serviceTier, 
                        sessionDate: selectedDate, 
                        sessionTime: time, 
                        totalAmount: booking.totalAmount || 0, 
                        depositPaid: booking.depositPaid || 100, 
                        remainingPaid: booking.remainingPaid || ((booking.totalAmount || 0) - 100), 
                        sessionCost: booking.sessionCost || 0, 
                        status: booking.status,
                        clientAge: booking.clientAge,
                        clientNotes: booking.clientNotes || '',
                        family2: booking.family2 || false,
                        family4: booking.family4 || false,
                        hairMakeup: booking.hairMakeup || false,
                        outdoor: booking.outdoor || false,
                        outdoorLocation: booking.outdoorLocation || null,
                        additionalServicesCost: booking.additionalServicesCost || 0,
                        expenses: booking.expenses || []
                      }) 
                    }} className="text-amber-600 hover:underline flex-1 text-left">
                      {booking.client.name} {statusLabel}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">Disponible</span>
                  )}
                </div>
              )
            })}
          </div>
          {selectedDayBookings.length > 0 && <p className="text-xs text-amber-500 mt-3 text-center">💡 Click en una reserva para ver detalles y gastos</p>}
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
            <div className="flex items-center justify-between text-xs"><div className="flex gap-3 text-gray-500"><span>{formatDate(booking.sessionDate)}</span><span>{formatTime(booking.sessionTime)}</span></div><div className="flex gap-2">{booking.status === 'confirmed' || booking.status === 'completed' ? <span className="text-green-600">${booking.totalAmount}</span> : <><span className="text-amber-500">${((booking.remainingPaid || 0) + (booking.additionalServicesCost || 0))}</span><span className="text-green-500">+${booking.depositPaid}</span></>}</div></div>
            <p className="text-xs text-amber-600 mt-2">{formatServiceType(booking.serviceType)} - {formatServiceTier(booking.serviceTier)}</p>
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
    // Calcular gastos totales del mes (sessionCost + expenses)
    const totalExpenses = completed.reduce((sum, b) => {
      const sessionCost = b.sessionCost || 0
      const bookingExpenses = (b as any).expenses || []
      const expensesSum = bookingExpenses.reduce((s: number, e: any) => s + e.amount, 0)
      return sum + sessionCost + expensesSum
    }, 0)
    return { 
      ...m, 
      revenue: completed.reduce((sum, b) => sum + b.totalAmount, 0), 
      costs: totalExpenses,
      profit: completed.reduce((sum, b) => sum + b.totalAmount, 0) - totalExpenses, 
      bookings: monthBookings.length 
    }
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
          <div className="text-center p-3 bg-red-50 rounded-lg"><p className="text-xs text-gray-500 uppercase">Gastos</p><p className="text-lg font-semibold text-red-600">-${selectedMonthData.costs}</p></div>
          <div className={`text-center p-3 rounded-lg ${selectedMonthData.profit >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}><p className="text-xs text-gray-500 uppercase">Beneficio</p><p className={`text-lg font-semibold ${selectedMonthData.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>${selectedMonthData.profit}</p></div>
        </div>
        <p className="text-xs text-gray-400 text-center">Gastos = sessionCost (asistente, estudio, props) + gastos registrados en cada reserva</p>
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
