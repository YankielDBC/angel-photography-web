'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { saveAs } from 'file-saver'
import { 
  Camera, 
  LogOut, 
  Menu, 
  Home, 
  CalendarDays, 
  ClipboardList, 
  BarChart3, 
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  FileText,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarX,
  Lock,
  Unlock,
  RotateCcw,
  Mail,
  Phone,
  User,
  Percent,
  Search
} from 'lucide-react'

// Hook to detect mobile viewport
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < breakpoint)
      setIsTablet(width >= breakpoint && width < 1024)
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [breakpoint])

  return { isMobile, isTablet }
}

// Hook to lock body scroll when modal is open
function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      const originalPosition = window.getComputedStyle(document.body).position
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      return () => {
        document.body.style.overflow = originalStyle
        document.body.style.position = originalPosition
        document.body.style.width = 'auto'
      }
    }
  }, [isLocked])
}


interface Booking {
  id: string
  client: { name: string; email: string; phone: string }
  clientName?: string
  clientEmail?: string
  clientPhone?: string
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
  // Gastos de sesión e ingresos extras (propinas)
  expenses?: Array<{ amount: number; category: string; notes: string; createdAt: string; isIncome?: boolean }>
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
  quinces: 'Quinceañeras',
  exclusivo: 'Exclusivo'
}

const SERVICE_TYPES: Record<string, string> = {
  pregnant: 'Maternidad',
  newborn: 'Newborn',
  kids: 'Niños',
  wedding: 'Boda',
  eventos: 'Eventos',
  quinces: 'Quinceañeras',
  exclusivo: 'Exclusivo'
}

const SERVICE_TIERS: Record<string, string> = {
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
      'Gasto': (b.sessionCost || 0) + ((b.expenses || []).filter((e: any) => !e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)),
      'Ingreso': (b.status === 'completed' || b.status === 'confirmed') ? b.totalAmount + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)) : (b.status === 'cancelled' ? (b.depositPaid || 100) + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)) : 0),
      'Beneficio': (b.status === 'completed' || b.status === 'confirmed') ? (b.totalAmount + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0))) - ((b.sessionCost || 0) + ((b.expenses || []).filter((e: any) => !e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0))) : (b.status === 'cancelled' ? ((b.depositPaid || 100) + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0))) - ((b.expenses || []).filter((e: any) => !e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)) : 0),
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
    const totalRevenue = completed.reduce((sum, b) => sum + b.totalAmount + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)), 0)
    const totalCost = completed.reduce((sum, b) => sum + (b.sessionCost || 0) + ((b.expenses || []).filter((e: any) => !e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)), 0)
    
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

// Gastos fijos mensuales del negocio
const FIXED_MONTHLY_COSTS = [
  { name: 'Renta Oficina', amount: 250 },
  { name: 'Internet', amount: 80 },
  { name: 'Teléfono', amount: 50 },
  { name: 'Software/Apps', amount: 50 },
  { name: 'Hosting/Dominio', amount: 20 },
  { name: 'Marketing', amount: 100 },
  { name: 'Seguro', amount: 50 },
  { name: 'Equipos', amount: 100 },
]

// PDF P&L Export Component
function ExportPDFPnL({ monthData, bookings, monthName, year }: { monthData: any; bookings: Booking[]; monthName: string; year: number }) {
  const [exporting, setExporting] = useState(false)

  const handleExport = () => {
    setExporting(true)
    
    // Ingresos del mes
    const pendingInMonth = bookings.filter(b => b.status === 'pending')
    const confirmedInMonth = bookings.filter(b => b.status === 'confirmed')
    const completedInMonth = bookings.filter(b => b.status === 'completed')
    const cancelledInMonth = bookings.filter(b => b.status === 'cancelled')
    
    const getExtraIncome = (b: any) => (b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const ingresos = 
      pendingInMonth.reduce((sum: number, b: any) => sum + Number(b.depositPaid || 100) + getExtraIncome(b), 0) +
      confirmedInMonth.reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0) + getExtraIncome(b), 0) +
      completedInMonth.reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0) + getExtraIncome(b), 0) +
      cancelledInMonth.reduce((sum: number, b: any) => sum + Number(b.depositPaid || 100) + getExtraIncome(b), 0)

    const fixedCostsTotal = FIXED_MONTHLY_COSTS.reduce((sum, c) => sum + c.amount, 0)
    
    // Simple text-based PDF-like report
    const reportText = `
===========================================
   ANGEL PHOTOGRAPHY MIAMI
   PROFIT & LOSS REPORT
   ${monthName.toUpperCase()} ${year}
===========================================

RESUMEN DEL MES
-------------------------------------------
Sesiones: ${bookings.length}
Ingresos: $${ingresos}
Gastos Fijos: -$${fixedCostsTotal}
-------------------------------------------
BENEFICIO NETO: $${ingresos - fixedCostsTotal}

===========================================
   DETALLE DE INGRESOS
===========================================

Reservas Pendientes (depósito):
${pendingInMonth.length > 0 ? pendingInMonth.map((b, i) => `${i + 1}. ${b.client?.name || b.clientName}: $${b.depositPaid || 100}`).join('\n') : 'Sin reservas pendientes'}

Reservas Confirmadas:
${confirmedInMonth.length > 0 ? confirmedInMonth.map((b, i) => `${i + 1}. ${b.client?.name || b.clientName}: $${b.totalAmount}`).join('\n') : 'Sin reservas confirmadas'}

Reservas Completadas:
${completedInMonth.length > 0 ? completedInMonth.map((b, i) => `${i + 1}. ${b.client?.name || b.clientName}: $${b.totalAmount}`).join('\n') : 'Sin reservas completadas'}

Reservas Canceladas:
${cancelledInMonth.length > 0 ? cancelledInMonth.map((b, i) => `${i + 1}. ${b.client?.name || b.clientName}: $${b.depositPaid || 100}`).join('\n') : 'Sin reservas canceladas'}

===========================================
   GASTOS FIJOS MENSUALES
===========================================

${FIXED_MONTHLY_COSTS.map(c => `${c.name}: $${c.amount}`).join('\n')}
-------------------------------------------
TOTAL GASTOS FIJOS: $${fixedCostsTotal}

===========================================
Generado: ${new Date().toLocaleDateString('es-ES')}
Angel Photography Miami
===========================================
    `

    // Create and download text file (works as simple report)
    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PNL-Angel-Photography-${monthName}-${year}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setExporting(false)
  }

  return (
    <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
      {exporting ? 'Exportando...' : 'Exportar P&L'}
    </button>
  )
}

export default function AdminDashboard() {
  const { isMobile, isTablet } = useIsMobile()
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
  const [showManualBookingModal, setShowManualBookingModal] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [calendarData, setCalendarData] = useState<Record<string, any>>({})
  const router = useRouter()

  // Lock body scroll when any modal is open
  useScrollLock(modalOpen || !!selectedBooking || showManualBookingModal)

  const NAV_ITEMS = [
    { id: 'home' as View, label: 'Inicio', icon: <Home className="w-[18px] h-[18px]" /> },
    { id: 'calendar' as View, label: 'Calendario', icon: <CalendarDays className="w-[18px] h-[18px]" /> },
    { id: 'bookings' as View, label: 'Reservas', icon: <ClipboardList className="w-[18px] h-[18px]" /> },
    { id: 'reports' as View, label: 'Reportes', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  ]

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
    loadCalendarData()
    
    // Auto-cancel: reservas pending con más de 24 horas de su cita se cancelan automáticamente
    const autoCancelOldPending = async () => {
      try {
        await fetch('/api/cron/auto-cancel', { method: 'POST' })
      } catch (e) { console.error('Auto-cancel error:', e) }
    }
    autoCancelOldPending()
  }, [])

  const loadCalendarData = async () => {
    try {
      const now = new Date()
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const res = await fetch(`/api/calendar?month=${month}`)
      const data = await res.json()
      if (data.availability) setCalendarData(data.availability)
    } catch (e) { console.error('Error loading calendar:', e) }
  }

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
    try { 
      await fetch(`/api/bookings?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      // Refresh all bookings from server FIRST, then close modal
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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header - always visible */}
      <header className="h-[56px] md:h-[60px] bg-white border-b border-zinc-100 flex items-center justify-between px-3 md:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-600">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-violet-600" />
            <h1 className="text-base md:text-lg font-bold text-zinc-900 tracking-tight">Angel Photo</h1>
          </div>
          <div className="hidden md:block w-px h-5 bg-zinc-200" />
          <span className="hidden md:block text-zinc-400 text-sm font-medium">Admin</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 md:w-8 h-7 md:h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-violet-500 to-violet-700 shadow-sm shadow-violet-200/60">
              A
            </div>
            <span className="text-sm font-medium text-zinc-600 hidden md:block">Admin</span>
          </div>
          <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors duration-200">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:flex-col md:w-64 fixed top-[60px] left-0 bottom-0 z-30 bg-white border-r border-zinc-100">
          {/* Logo area */}
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-violet-500 to-violet-700 shadow-sm shadow-violet-200/60 shrink-0">
              AP
            </div>
            <span className="text-sm font-bold text-zinc-900 tracking-tight">Angel Photo</span>
          </div>
          <div className="mx-4 h-px bg-zinc-100" />
          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = view === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                    isActive
                      ? 'text-violet-700 bg-violet-50'
                      : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-violet-600" />
                  )}
                  <span className={isActive ? 'text-violet-600' : ''}>{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="mx-4 h-px bg-zinc-100" />
          {/* New booking button */}
          <div className="p-4">
            <button
              onClick={() => setShowManualBookingModal(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl h-10 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 shadow-md shadow-violet-200/60 hover:shadow-lg hover:shadow-violet-300/60 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nueva Reserva
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
            <div className="absolute left-0 top-0 h-full w-64 bg-white p-4 animate-slide-in-left" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-violet-500 to-violet-700">
                    AP
                  </div>
                  <span className="text-sm font-bold text-zinc-900">Angel Photo</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-zinc-100 rounded-lg">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = view === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setView(item.id); setSidebarOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-violet-700 bg-violet-50'
                          : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  )
                })}
              </nav>
              <button
                onClick={() => { setShowManualBookingModal(true); setSidebarOpen(false) }}
                className="w-full flex items-center justify-center gap-2 mt-4 rounded-xl h-10 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-violet-500"
              >
                <Plus className="w-4 h-4" />
                Nueva Reserva
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className={`flex-1 ${isMobile ? 'pt-2' : 'md:ml-64'} p-3 md:p-6 lg:p-8 overflow-auto`}>
          {view === 'home' && <HomeView bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} isMobile={isMobile} setModalOpen={setModalOpen} />}
          {view === 'calendar' && <CalendarView bookings={bookings} onSelectBooking={setSelectedBooking} refreshCalendar={fetchData} setBookings={setBookings} isMobile={isMobile} setModalOpen={setModalOpen} />}
          {view === 'bookings' && <BookingsView bookings={bookings} formatDate={formatDate} onSelectBooking={setSelectedBooking} isMobile={isMobile} setModalOpen={setModalOpen} />}
          {view === 'reports' && <ReportsView bookings={bookings} onEditCosts={() => {}} isMobile={isMobile} />}
        </main>
      </div>

      {/* Modals - only render when needed */}
      {selectedBooking && (
        <BookingModal 
          booking={selectedBooking} 
          onClose={() => { setSelectedBooking(null); fetchData(); }} 
          onUpdateStatus={updateBookingStatus} 
          onUpdateCost={updateSessionCost} 
          onRefresh={fetchData}
          isMobile={isMobile}
        />
      )}
      
      {showManualBookingModal && (
        <ManualBookingModal 
          onClose={() => setShowManualBookingModal(false)} 
          onSuccess={() => { setShowManualBookingModal(false); fetchData(); }}
          isMobile={isMobile}
          calendarData={calendarData}
          bookings={bookings}
        />
      )}
    </div>
  )
}

function KpiCard({ title, value, subtext, color, iconBg, iconColor }: { title: string; value: string; subtext?: string; color: string; iconBg: string; iconColor: string }) {
  return (
    <div className="modern-card rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {iconColor}
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs uppercase tracking-wider text-zinc-500 mt-0.5">{title}</p>
      {subtext && <p className="text-xs text-zinc-400 mt-1">{subtext}</p>}
    </div>
  )
}

function HomeView({ bookings, formatDate, onSelectBooking, isMobile, setModalOpen }: { bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void; isMobile?: boolean; setModalOpen?: (open: boolean) => void }) {
  // Filter bookings with valid data
  const validBookings = bookings.filter(b => b.sessionDate && b.totalAmount)
  
  // pending: $100 deposit pagado, resto pendiente
  // confirmed: TODO pagado, no hay pendiente
  // completed: sesión realizada
  // cancelled: solo $100 deposit (cliente no asistió), no hay pendiente
  
  const pendingBookings = validBookings.filter(b => b.status === 'pending')
  const confirmedBookings = validBookings.filter(b => b.status === 'confirmed')
  const completedBookings = validBookings.filter(b => b.status === 'completed')
  const cancelledBookings = validBookings.filter(b => b.status === 'cancelled')
  
  // Facturado = $100 deposit de pending + TOTAL de confirmed + completed + cancelled (deposit + ingresos extras) + propinas
  const depositFromPending = pendingBookings.reduce((sum, b) => sum + (b.depositPaid || 100), 0)
  const totalFromConfirmed = confirmedBookings.reduce((sum, b) => sum + b.totalAmount + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)), 0)
  const totalFromCompleted = completedBookings.reduce((sum, b) => sum + b.totalAmount + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)), 0)
  const depositFromCancelled = cancelledBookings.reduce((sum, b) => sum + (b.depositPaid || 100) + ((b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)), 0)
  const totalFacturado = depositFromPending + totalFromConfirmed + totalFromCompleted + depositFromCancelled
  
  // Pendiente = (totalAmount - $100) de reservas PENDING SOLO
  // confirmed/cancelled NO tienen pendiente porque ya se decidió su estado
  const totalPending = pendingBookings.reduce((sum, b) => {
    const deposit = b.depositPaid || 100
    const additional = b.additionalServicesCost || 0
    return sum + (b.totalAmount - deposit) + additional
  }, 0)
  
  // Costs (sessionCost + expenses de cada reserva) - EXCLUYE ingresos extras
  const totalCosts = [...confirmedBookings, ...completedBookings].reduce((sum, b) => {
    const sessionCost = b.sessionCost || 0
    const bookingExpenses = (b.expenses || []).filter((e: any) => !e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)
    return sum + sessionCost + bookingExpenses
  }, 0)
  
  // Ingresos extras (propinas) - solo para mostrar, NO sumar al benefit (ya included in totalFacturado)
  const totalExtras = [...confirmedBookings, ...completedBookings].reduce((sum, b) => {
    const bookingIncome = (b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)
    return sum + bookingIncome
  }, 0)
  
  // Beneficio = facturado - costos (propinas ya incluidas en facturado)
  const beneficio = totalFacturado - totalCosts
  
  // 6% tax estimate
  const taxEstimate = Math.round(totalFacturado * 0.06)
  
  // Upcoming bookings (not cancelled, not completed)
  const upcomingBookings = bookings.filter(b => b.status !== 'cancelled' && b.status !== 'completed').sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())

  // Greeting
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'
  const formattedDate = now.toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' })

  const kpis = [
    { 
      label: 'Reservas', 
      value: String(bookings.length), 
      sub: 'totales', 
      iconBg: 'bg-violet-50', 
      iconColor: <CalendarDays className="w-5 h-5 text-violet-500" />,
      valueColor: 'text-violet-600'
    },
    { 
      label: 'Facturado', 
      value: `$${totalFacturado}`, 
      sub: 'deposit + completas', 
      iconBg: 'bg-emerald-50', 
      iconColor: <DollarSign className="w-5 h-5 text-emerald-500" />,
      valueColor: 'text-emerald-600'
    },
    { 
      label: 'Pendiente', 
      value: `$${totalPending}`, 
      sub: 'por cobrar', 
      iconBg: 'bg-amber-50', 
      iconColor: <div className="text-amber-500 text-lg font-bold">$</div>,
      valueColor: 'text-amber-600'
    },
    { 
      label: 'Impuesto', 
      value: `$${taxEstimate}`, 
      sub: `6% de $${totalFacturado}`, 
      iconBg: 'bg-sky-50', 
      iconColor: <Percent className="w-5 h-5 text-sky-500" />,
      valueColor: 'text-sky-600'
    },
  ]

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
      confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
      completed: { bg: 'bg-sky-50', text: 'text-sky-700' },
      cancelled: { bg: 'bg-rose-50', text: 'text-rose-600' },
    }
    const s = map[status] || map.pending
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${s.bg} ${s.text}`}>
        {formatStatus(status)}
      </span>
    )
  }

  const renderAmount = (booking: Booking) => {
    if (booking.status === 'completed' || booking.status === 'confirmed') {
      const extra = getExtraIncome(booking)
      return (
        <span className="text-emerald-600 text-xs">
          ${booking.totalAmount}
          {extra > 0 && <span className="text-emerald-500 ml-1">+${extra}</span>}
        </span>
      )
    } else if (booking.status === 'cancelled') {
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-600">${booking.depositPaid}</span>
          <span className="text-rose-400 line-through">${booking.totalAmount}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-amber-600">${booking.totalAmount - booking.depositPaid}</span>
          <span className="text-emerald-600">+${booking.depositPaid}</span>
        </div>
      )
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in-up">
      {/* Compact header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-zinc-900 text-lg font-semibold whitespace-nowrap">Resumen</h2>
        <span className="text-zinc-400 text-sm">{greeting} · {formattedDate}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="modern-card rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                {kpi.iconColor}
              </div>
            </div>
            <p className={`text-2xl font-bold ${kpi.valueColor}`}>{kpi.value}</p>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-zinc-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Sessions */}
      <div className="modern-card rounded-xl p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <h3 className="section-title text-zinc-900 font-semibold text-lg">Próximas Sesiones</h3>
        {upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <CalendarX className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No hay sesiones próximas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.slice(0, 5).map(booking => (
              <button key={booking.id} onClick={() => onSelectBooking(booking)} className="w-full text-left p-4 rounded-xl hover:bg-zinc-50 transition-colors duration-200 group">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-zinc-900">{booking.client.name}</p>
                    <p className="text-zinc-400 text-xs truncate mt-0.5">{formatServiceType(booking.serviceType)} · {formatServiceTier(booking.serviceTier)}</p>
                    <div className="flex items-center gap-2.5 mt-2">
                      <span className="text-zinc-500 text-xs">{formatDate(booking.sessionDate)} · {formatTime(booking.sessionTime)}</span>
                      {statusBadge(booking.status)}
                    </div>
                  </div>
                  <div className="flex-shrink-0">{renderAmount(booking)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BookingModal({ booking, onClose, onUpdateStatus, onUpdateCost, onRefresh, isMobile }: { booking: Booking; onClose: () => void; onUpdateStatus: (id: string, status: string) => void; onUpdateCost: (id: string, cost: number) => void; onRefresh?: () => void; isMobile?: boolean }) {
  const [localBooking, setLocalBooking] = useState(booking)
  
  useEffect(() => { setLocalBooking(booking) }, [booking])
  
  const handleStatusChange = async (newStatus: string) => {
    setLocalBooking({ ...localBooking, status: newStatus as any })
    await onUpdateStatus(localBooking.id, newStatus)
  }
  
  const [sessionCost, setSessionCost] = useState(String(localBooking.sessionCost || ''))
  const [saving, setSaving] = useState(false)
  const [showExtras, setShowExtras] = useState(isMobile ? false : false)
  const [showPagos, setShowPagos] = useState(isMobile ? true : true)
  const [showGastos, setShowGastos] = useState(isMobile ? false : false)
  const [expensesOpen, setExpensesOpen] = useState(false)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('gasolina')
  const [expenseNotes, setExpenseNotes] = useState('')
  const [isIncome, setIsIncome] = useState(false)
  
  const expenses: Array<{ amount: number; category: string; notes: string; createdAt: string; isIncome?: boolean }> = (localBooking as any).expenses || []
  const totalExpenses = expenses.filter(e => !e.isIncome).reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = expenses.filter(e => e.isIncome).reduce((sum, e) => sum + e.amount, 0)
  const netAmount = totalIncome - totalExpenses
  const pending = localBooking.status === 'pending' ? localBooking.totalAmount - localBooking.depositPaid : 0
  
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = { 
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pendiente' }, 
    confirmed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Confirmado' }, 
    completed: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Completado' }, 
    cancelled: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Cancelado' } 
  }
  const currentStatus = statusConfig[localBooking.status] || statusConfig.pending

  const clientAge = (booking as any).clientAge
  const clientNotes = (booking as any).clientNotes
  const family2 = (booking as any).family2
  const family4 = (booking as any).family4
  const hairMakeup = (booking as any).hairMakeup
  const outdoor = (booking as any).outdoor
  const outdoorLocation = (booking as any).outdoorLocation
  const additionalServicesCost = (booking as any).additionalServicesCost || 0
  const paidAmount = localBooking.depositPaid + localBooking.remainingPaid

  const handleSaveCost = () => { setSaving(true); onUpdateCost(localBooking.id, parseFloat(sessionCost) || 0); setSaving(false) }
  const handleAddExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) return
    const newExpense = { amount: parseFloat(expenseAmount), category: expenseCategory, notes: expenseNotes, isIncome, createdAt: new Date().toISOString() }
    const currentExpenses = (localBooking as any).expenses || []
    await fetch(`/api/bookings?id=${localBooking.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expenses: [...currentExpenses, newExpense] }) })
    setLocalBooking({ ...localBooking, expenses: [...currentExpenses, newExpense] })
    if (onRefresh) onRefresh()
    setExpensesOpen(false)
    setExpenseAmount('')
    setExpenseNotes('')
    setIsIncome(false)
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[3px] h-[14px] bg-violet-500 rounded-full" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{children}</h4>
      </div>
    )
  }

  function CollapsibleSection({ title, open, onToggle, children, badge }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode; badge?: React.ReactNode }) {
    return (
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        <button onClick={onToggle} className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors">
          <span className="text-sm font-medium text-zinc-700">{title}</span>
          <div className="flex items-center gap-2">
            {badge}
            {open ? <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg> : <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
          </div>
        </button>
        {open && <div className="px-4 pb-4 pt-0 border-t border-zinc-100">{children}</div>}
      </div>
    )
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-ES')}`

  const modalWidth = isMobile ? 'max-w-[98vw] max-h-[85vh]' : 'max-w-xl max-h-[90vh]'
  const padding = isMobile ? 'p-2' : 'p-5'
  const headerPadding = isMobile ? 'p-2' : 'p-5'
  const textSize = isMobile ? 'text-xs' : 'text-sm'
  const titleSize = isMobile ? 'text-sm' : 'text-base'

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center ${isMobile ? 'pt-2 pb-4 px-1' : 'p-4'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`animate-scale-in relative bg-white rounded-xl shadow-xl w-full ${modalWidth} overflow-hidden flex flex-col`}>
        <div className={`shrink-0 bg-white border-b border-zinc-100 flex items-center justify-between ${headerPadding}`}>
          <h3 className={`font-semibold text-zinc-900 ${titleSize}`}>Detalle de Reserva</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg"><svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <div className={`flex-1 overflow-y-auto ${padding}`}>
          <section>
            <SectionTitle>Cliente</SectionTitle>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center"><svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div><p className="text-lg font-semibold text-zinc-900">{localBooking.client.name}</p></div>
              <div className="flex items-center gap-2 text-sm text-zinc-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg><span>{localBooking.client.email}</span></div>
              <div className="flex items-center gap-2 text-sm text-zinc-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg><span>{localBooking.client.phone}</span></div>
            </div>
          </section>

          <section>
            <SectionTitle>Servicio</SectionTitle>
            <div className="text-sm">
              <p className="text-zinc-900 font-medium capitalize">{formatServiceType(localBooking.serviceType)}</p>
              <p className="text-zinc-500">{formatServiceTier(localBooking.serviceTier)}</p>
            </div>
          </section>

          <section>
            <SectionTitle>Fecha y Hora</SectionTitle>
            <p className="text-sm text-zinc-700">{(() => { const [y, m, d] = localBooking.sessionDate.split('-').map(Number); return new Date(y, m-1, d).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' }) })()} — {formatTime(localBooking.sessionTime)}</p>
          </section>

          <CollapsibleSection title="Extras" open={showExtras} onToggle={() => setShowExtras(!showExtras)}>
            <div className="space-y-2 text-sm mt-3">
              {clientAge && <p className="text-zinc-500">Edad niño/a: {clientAge}</p>}
              {clientNotes && <p className="text-zinc-500">Notas: {clientNotes}</p>}
              <div className="space-y-1">
                {family2 && <p className="text-zinc-500">+2 Familiares: $50</p>}
                {family4 && <p className="text-zinc-500">+4 Familiares: $80</p>}
                {hairMakeup && <p className="text-zinc-500">Peluqueria/Maquillaje: $90</p>}
                {outdoor && <p className="text-zinc-500">Outdoor ({outdoorLocation === 'near' ? 'Cerca' : 'Lejos'}): ${outdoorLocation === 'near' ? 100 : 200}</p>}
              </div>
              <p className="font-medium text-zinc-900 pt-2 border-t border-zinc-100">Total Extras: {formatCurrency(additionalServicesCost)}</p>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Pagos" open={showPagos} onToggle={() => setShowPagos(!showPagos)}>
            <div className="space-y-2 text-sm mt-3">
              <div className="flex justify-between text-zinc-500"><span>Paquete base</span><span>{formatCurrency(localBooking.totalAmount - additionalServicesCost)}</span></div>
              {additionalServicesCost > 0 && <div className="flex justify-between text-zinc-500"><span>Servicios extras</span><span>{formatCurrency(additionalServicesCost)}</span></div>}
              {totalIncome > 0 && <div className="flex justify-between text-emerald-600"><span>Propinas</span><span>+ {formatCurrency(totalIncome)}</span></div>}
              <div className="flex justify-between font-medium text-zinc-900 pt-2 border-t border-zinc-100"><span>Total Pagado</span><span className="text-emerald-600">{formatCurrency(paidAmount)}</span></div>
              <div className="flex justify-between text-zinc-500"><span>Reserva (depósito)</span><span className="text-emerald-600">-{formatCurrency(localBooking.depositPaid)}</span></div>
              {localBooking.status === 'pending' && pending > 0 && <div className="flex justify-between text-amber-600"><span>Pendiente</span><span>{formatCurrency(pending)}</span></div>}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Gastos e Ingresos Extras" open={showGastos} onToggle={() => setShowGastos(!showGastos)} badge={netAmount !== 0 && <span className={`text-xs ${netAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}</span>}>
            <div className="space-y-3 mt-3">
              {expenses.filter(e => e.isIncome).length > 0 && <div className="space-y-1">{expenses.filter(e => e.isIncome).map((e, i) => (<div key={i} className="flex justify-between text-sm text-emerald-600"><span>💡 {e.category} {e.notes && `- ${e.notes}`}</span><span>+{formatCurrency(e.amount)}</span></div>))}</div>}
              {expenses.filter(e => !e.isIncome).length > 0 && <div className="space-y-1">{expenses.filter(e => !e.isIncome).map((e, i) => (<div key={i} className="flex justify-between text-sm text-zinc-500"><span>💸 {e.category} {e.notes && `- ${e.notes}`}</span><span>-{formatCurrency(e.amount)}</span></div>))}</div>}
              <div className={`flex justify-between text-sm font-medium pt-2 border-t border-zinc-100 ${netAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}><span>Total neto</span><span>{netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}</span></div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { setIsIncome(false); setExpensesOpen(true); }} 
                  className="flex-1 py-2 bg-zinc-100 text-zinc-600 rounded-lg text-xs hover:bg-zinc-200"
                  type="button"
                >+ Agregar Gasto</button>
                <button 
                  onClick={() => { setIsIncome(true); setExpensesOpen(true); }} 
                  className="flex-1 py-2 bg-emerald-100 text-emerald-600 rounded-lg text-xs hover:bg-emerald-200"
                  type="button"
                >+ Agregar Propina</button>
              </div>
              {expensesOpen && (
                <div className="space-y-2 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  <input 
                    type="text" 
                    placeholder="Categoría" 
                    value={expenseCategory} 
                    onChange={(e) => setExpenseCategory(e.target.value)} 
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                    inputMode="text"
                  />
                  <input 
                    type="number" 
                    placeholder="Monto" 
                    value={expenseAmount} 
                    onChange={(e) => setExpenseAmount(e.target.value)} 
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                    inputMode="decimal"
                  />
                  <input 
                    type="text" 
                    placeholder="Notas (opcional)" 
                    value={expenseNotes} 
                    onChange={(e) => setExpenseNotes(e.target.value)} 
                    className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs"
                    inputMode="text"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setExpensesOpen(false); setExpenseAmount(''); setExpenseNotes(''); }} 
                      className="flex-1 py-2 bg-zinc-200 text-zinc-600 rounded-lg text-xs"
                      type="button"
                    >Cancelar</button>
                    <button 
                      onClick={handleAddExpense} 
                      className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-xs"
                      type="button"
                    >{isIncome ? 'Agregar Propina' : 'Agregar Gasto'}</button>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          <section>
            <SectionTitle>Estado</SectionTitle>
            {localBooking.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => handleStatusChange('confirmed')} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium">Confirmar</button>
                <button onClick={() => handleStatusChange('cancelled')} className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium">Cancelar</button>
              </div>
            )}
            {localBooking.status === 'confirmed' && <button onClick={() => handleStatusChange('completed')} className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium shadow-sm">Completar Sesión</button>}
            {localBooking.status === 'completed' && <p className="text-emerald-600 text-sm flex items-center gap-1">✓ Sesión completada</p>}
            {localBooking.status === 'cancelled' && <p className="text-rose-600 text-sm flex items-center gap-1">✗ Reserva cancelada</p>}
          </section>

          <section>
            <SectionTitle>Costo de Sesión</SectionTitle>
            <div className="flex gap-2">
              <input type="number" value={sessionCost} onChange={(e) => setSessionCost(e.target.value)} placeholder="0" className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm" />
              <button onClick={handleSaveCost} disabled={saving} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium shadow-sm">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function CalendarView({ bookings, onSelectBooking, refreshCalendar, setBookings, isMobile, setModalOpen }: { bookings: Booking[]; onSelectBooking: (b: Booking) => void; refreshCalendar?: () => void; setBookings?: (b: Booking[]) => void; isMobile?: boolean; setModalOpen?: (open: boolean) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarData, setCalendarData] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [unavailableDates, setUnavailableDates] = useState<string[]>([])

  // Cargar disponibilidad del mes para el date picker
  const loadMonthAvailability = async () => {
    try {
      const res = await fetch(`/api/availability?month=${currentMonth.getMonth() + 1}&year=${currentMonth.getFullYear()}`)
      const data = await res.json()
      setUnavailableDates(data.unavailableDates || [])
    } catch (e) {
      console.error('Error loading availability:', e)
    }
  }

  useEffect(() => { loadMonthAvailability() }, [currentMonth])

  // Cargar horarios disponibles cuando cambia la fecha
  const loadAvailableSlots = async (date: string) => {
    if (!date) return
    setLoadingSlots(true)
    try {
      const res = await fetch(`/api/calendar?month=${date.substring(0, 7)}`)
      const data = await res.json()
      const dayData = data.availability?.[date]
      if (dayData) {
        const available = dayData.slots
          ?.filter((s: any) => s.status === 'available')
          ?.map((s: any) => s.time) || []
        setAvailableSlots(available)
      } else {
        // Si no hay datos del día, todos los horarios están disponibles
        setAvailableSlots(['9:30', '11:30', '14:00', '16:00', '18:00'])
      }
    } catch (e) {
      console.error('Error loading slots:', e)
      setAvailableSlots(['9:30', '11:30', '14:00', '16:00', '18:00'])
    }
    setLoadingSlots(false)
  }

  // Cargar slots cuando cambia la fecha seleccionada
  useEffect(() => {
    if (rescheduleDate) {
      loadAvailableSlots(rescheduleDate)
    }
  }, [rescheduleDate])

  // Reset available slots when modal opens
  useEffect(() => {
    if (showRescheduleModal && rescheduleBooking) {
      setAvailableSlots([])
      setRescheduleDate('')
      setRescheduleTime('')
    }
  }, [showRescheduleModal])

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

  const getDayStatus = (day: number) => {
    const dateKey = getDateKey(day)
    const dayBookings = bookings.filter(b => b.sessionDate === dateKey && b.status !== 'cancelled')
    
    // Obtener datos del día desde calendarData
    const dayData = calendarData[dateKey]
    const blockedSlots = dayData?.slots?.filter((s: any) => s.status === 'blocked').length || 0
    
    // Verificar si el día está completamente bloqueado
    // El día está bloqueado si todos los slots están blocked o si el status del día es 'blocked'
    const isDayBlocked = dayData?.status === 'blocked'
    
    // Total de horarios: 5 (9:30, 11:30, 14:00, 16:00, 18:00)
    const totalSlots = 5
    const bookedSlots = dayBookings.length
    const occupiedSlots = bookedSlots + blockedSlots
    
    // Si el día está bloqueado completamente = gris
    if (isDayBlocked && bookedSlots === 0) return 'blocked'
    
    // Si todos los horarios están ocupados = rojo
    if (occupiedSlots >= totalSlots) return 'full'
    
    // Si hay al menos 1 reserva = amarillo
    if (bookedSlots > 0) return 'has_bookings'
    
    // Si hay horarios disponibles = verde
    return 'available'
  }

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return date < today
  }

  const days: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)

  const selectedDayBookings = selectedDate 
    ? bookings.filter(b => b.sessionDate === selectedDate && b.status !== 'cancelled')
    : []
  const hasDayBookings = selectedDayBookings.length > 0
  
  // Verificar si el día está bloqueado completamente
  const selectedDayData = selectedDate ? calendarData[selectedDate] : null
  const isDayBlocked = selectedDayData?.status === 'blocked'
  
  // Contar horarios bloqueados en el día
  const blockedSlotsCount = selectedDayData?.slots?.filter((s: any) => s.status === 'blocked').length || 0
  const hasBlockedSlots = blockedSlotsCount > 0
  
  // Solo se puede bloquear el día si: no hay reservas Y no hay horarios bloqueados Y el día no está bloqueado
  const canBlockDay = !hasDayBookings && !hasBlockedSlots && !isDayBlocked
  // Solo se puede desbloquear el día si está bloqueado
  const canUnblockDay = isDayBlocked

  const handleBlockDay = async () => {
    if (!selectedDate || !canBlockDay) return
    setLoading(true)
    try {
      const res = await fetch('/api/calendar', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ type: 'day', date: selectedDate }) 
      })
      if (!res.ok) throw new Error('Error al bloquear día')
      // Recargar calendar
      await loadCalendar()
      if (refreshCalendar) refreshCalendar()
    } catch (error) {
      console.error('Error blocking day:', error)
      alert('Error al bloquear el día')
    } finally {
      setLoading(false)
    }
  }

  const handleBlockSlot = async (time: string) => {
    if (!selectedDate || isDayBlocked) return
    setLoading(true)
    try {
      const res = await fetch('/api/calendar', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ type: 'slot', date: selectedDate, time }) 
      })
      if (!res.ok) throw new Error('Error al bloquear horario')
      // Recargar calendar
      await loadCalendar()
      if (refreshCalendar) refreshCalendar()
    } catch (error) {
      console.error('Error blocking slot:', error)
      alert('Error al bloquear el horario')
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (type: 'day' | 'slot', time?: string) => {
    if (!selectedDate) return
    setLoading(true)
    try {
      const id = type === 'day' ? `day_${selectedDate}` : `slot_${selectedDate}_${time}`
      const res = await fetch(`/api/calendar?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al desbloquear')
      // Recargar calendar
      await loadCalendar()
      if (refreshCalendar) refreshCalendar()
    } catch (error) {
      console.error('Error unblocking:', error)
      alert('Error al desbloquear')
    } finally {
      setLoading(false)
    }
  }

  // Función para abrir modal de reagendar
  const openRescheduleModal = async (booking: Booking) => {
    setRescheduleBooking(booking)
    setRescheduleDate('')
    setRescheduleTime('')
    setShowRescheduleModal(true)
    // Pre-cargar el mes actual para tener disponibilidad
    try {
      const res = await fetch(`/api/calendar?month=${new Date().toISOString().slice(0, 7)}`)
      const data = await res.json()
      if (data.availability) setCalendarData(prev => ({ ...prev, ...data.availability }))
    } catch (e) { console.error('Error preloading calendar:', e) }
  }

  // Función para ejecutar el reagendado
  const handleReschedule = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime) return
    setRescheduling(true)
    try {
      const res = await fetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDate: rescheduleDate, newTime: rescheduleTime })
      })
      const data = await res.json()
      if (data.success) {
        setShowRescheduleModal(false)
        setRescheduleBooking(null)
        // Recargar datos
        if (refreshCalendar) refreshCalendar()
        // También recargar bookings del parent
        const resBookings = await fetch('/api/bookings')
        if (resBookings.ok) {
          const items = await resBookings.json()
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
            clientAge: item.clientAge || null,
            clientNotes: item.clientNotes || '',
            family2: item.family2 || false,
            family4: item.family4 || false,
            hairMakeup: item.hairMakeup || false,
            outdoor: item.outdoor || false,
            outdoorLocation: item.outdoorLocation || null,
            additionalServicesCost: item.additionalServicesCost || 0,
            expenses: item.expenses || []
          }))
          if (setBookings) setBookings(normalized)
        }
      } else {
        alert(data.error || 'Error al reagendar')
      }
    } catch (e) {
      console.error('Error rescheduling:', e)
      alert('Error al reagendar')
    }
    setRescheduling(false)
  }

  const colors: Record<string, string> = { 
  available: 'bg-emerald-50 text-emerald-700 border border-emerald-100', 
  partial: 'bg-emerald-50 text-emerald-700 border border-emerald-100', 
  has_bookings: 'bg-amber-50 text-amber-700 border border-amber-100', 
  full: 'bg-rose-50 text-rose-700 border border-rose-100', 
  blocked: 'bg-zinc-100 text-zinc-400 border border-zinc-200', 
  past: 'bg-zinc-50/50 text-zinc-300 border border-transparent' 
}

  return (
    <div className="space-y-4 p-4 md:p-6 animate-fade-in-up">
      {/* Compact header: title + nav + legend in one row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-zinc-900 text-lg font-semibold whitespace-nowrap">Calendario</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="h-8 w-8 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-zinc-900 text-sm font-semibold min-w-[130px] text-center capitalize">{monthName}</span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="h-8 w-8 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 flex items-center justify-center transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />Disp.</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Reserv.</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" />Lleno</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-300" />Bloq.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="modern-card rounded-xl p-5 lg:col-span-2">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {weekDays.map(d => <div key={d} className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {loading ? <div className="col-span-7 text-center py-4 text-zinc-400 text-xs">Cargando...</div> : days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="aspect-square" />
              const isPast = isPastDate(day)
              const isToday = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString() === new Date().toDateString()
              const isSelected = selectedDate === getDateKey(day)
              const state = isPast ? 'past' : getDayStatus(day)
              return (
                <button key={day} onClick={() => !isPast && setSelectedDate(getDateKey(day))} 
                  className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 relative ${
                    colors[state]
                  } ${
                    isToday ? 'ring-2 ring-violet-400 ring-offset-2' : ''
                  } ${
                    isSelected ? 'ring-2 ring-violet-500 ring-offset-2 scale-105 shadow-md' : ''
                  } ${
                    !isPast ? 'cursor-pointer hover:scale-105 hover:shadow-md active:scale-95' : 'cursor-default opacity-40'
                  }`} 
                  disabled={isPast}>
                  {day}
                  {state === 'blocked' && <Lock className="w-3 h-3 absolute top-1 right-1 text-zinc-400" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day Panel */}
        <div className="modern-card rounded-xl p-5">
          {selectedDate ? (
            <div className="space-y-4 animate-fade-in-up">
              <div>
                <h3 className="font-semibold text-zinc-900 text-base">
                  {(() => {
                    const [y, m, d] = selectedDate.split('-').map(Number)
                    return new Date(y, m-1, d).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })
                  })()}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">{selectedDayBookings.length} reserva{selectedDayBookings.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Time slots */}
              <div className="space-y-2">
                {['9:30', '11:30', '14:00', '16:00', '18:00'].map(time => {
                  const fullBooking = bookings.find(b => b.sessionDate === selectedDate && b.sessionTime === time && b.status !== 'cancelled')
                  const isBooked = !!fullBooking
                  const slotData = selectedDayData?.slots?.find((s: any) => s.time === time)
                  const isBlocked = slotData?.status === 'blocked'
                  const status = fullBooking?.status || 'pending'
                  const statusConfig: Record<string, { bg: string; text: string }> = {
                    pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
                    confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    completed: { bg: 'bg-sky-50', text: 'text-sky-700' },
                    cancelled: { bg: 'bg-rose-50', text: 'text-rose-600' },
                  }
                  const s = statusConfig[status] || statusConfig.pending
                  const showSlotControls = !isDayBlocked

                  return (
                    <div key={time} className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                      isBooked ? 'bg-amber-50/50 border border-amber-100 hover:border-amber-200' : isBlocked ? 'bg-zinc-50 border border-zinc-200' : 'bg-emerald-50 border border-emerald-100 hover:border-emerald-200'
                    }`}>
                      {isBooked ? (
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <button onClick={() => fullBooking && onSelectBooking(fullBooking)} className="text-sm font-medium text-zinc-900 hover:text-violet-600 truncate transition-colors">
                            {fullBooking?.client?.name || fullBooking?.clientName || 'Reservado'}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
                              {formatStatus(status)}
                            </span>
                            <button onClick={() => openRescheduleModal(fullBooking!)} className="p-1 text-zinc-300 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : isBlocked ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-sm text-zinc-400">{formatTime(time)}</span>
                          </div>
                          <button onClick={() => handleUnblock('slot', time)} className="p-1 text-zinc-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : showSlotControls ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm text-emerald-600 font-medium">{formatTime(time)}</span>
                          <button onClick={() => handleBlockSlot(time)} className="p-1 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-400">—</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Day block buttons */}
              <div className="pt-4 border-t border-zinc-100">
                {isDayBlocked ? (
                  <button onClick={() => handleUnblock('day')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-emerald-600 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200 text-sm font-medium">
                    <Unlock className="w-4 h-4" />
                    Desbloquear Día
                  </button>
                ) : hasDayBookings ? (
                  <p className="text-xs text-amber-500 text-center py-2 font-medium">No se puede bloquear: hay reservas activas</p>
                ) : hasBlockedSlots ? (
                  <p className="text-xs text-amber-500 text-center py-2 font-medium">Desbloquea los horarios primero</p>
                ) : (
                  <button onClick={handleBlockDay} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-zinc-500 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-700 transition-all duration-200 text-sm font-medium">
                    <Lock className="w-4 h-4" />
                    Bloquear Día
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-300">
              <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center mb-3">
                <CalendarDays className="w-5 h-5 text-zinc-300" />
              </div>
              <p className="text-sm font-medium text-zinc-400">Selecciona un día</p>
              <p className="text-xs text-zinc-300 mt-1">para ver los horarios</p>
            </div>
          )}
        </div>
      </div>

      {showRescheduleModal && rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRescheduleModal(false)} />
          <div className="animate-scale-in relative bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Reagendar Reserva</h3>
              <button onClick={() => setShowRescheduleModal(false)} className="p-2 hover:bg-zinc-100 rounded-xl"><svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="text-sm text-zinc-500">Cliente: <span className="font-semibold text-zinc-900">{rescheduleBooking.client?.name || rescheduleBooking.clientName}</span></div>
              <div className="flex items-center gap-2 text-sm"><span className="text-zinc-400">Fecha actual:</span><span className="font-medium text-violet-600">{new Date(rescheduleBooking.sessionDate).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })} — {formatTime(rescheduleBooking.sessionTime)}</span></div>

              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-2">Nueva Fecha</label>
                <input type="date" value={rescheduleDate} onChange={(e) => { setRescheduleDate(e.target.value); setRescheduleTime(''); }} className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:border-violet-500" min={new Date().toISOString().split('T')[0]} />
                {rescheduleDate && unavailableDates.includes(rescheduleDate) && <p className="text-rose-500 text-xs mt-1">Esta fecha no está disponible</p>}
              </div>
              
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-2">Nueva Hora</label>
                {!rescheduleDate ? <p className="text-zinc-400 text-sm bg-zinc-50 p-3 rounded-xl text-center">Selecciona una fecha primero</p> : loadingSlots ? <div className="flex justify-center py-3"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div></div> : availableSlots.length === 0 ? <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center"><p className="text-rose-600 text-sm">No hay horarios disponibles</p></div> : (
                  <div className="grid grid-cols-5 gap-2">
                    {['9:30', '11:30', '14:00', '16:00', '18:00'].map(time => {
                      const isAvailable = availableSlots.includes(time)
                      const isSelected = rescheduleTime === time
                      return <button key={time} disabled={!isAvailable} onClick={() => setRescheduleTime(time)} className={`py-2.5 rounded-xl text-xs font-medium transition-all ${isSelected ? 'bg-violet-600 text-white' : isAvailable ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200' : 'bg-zinc-50 text-zinc-300 cursor-not-allowed'}`}>{time === '9:30' ? '9:30a' : time === '11:30' ? '11:30a' : time === '14:00' ? '2:00p' : time === '16:00' ? '4:00p' : '6:00p'}</button>
                    })}
                  </div>
                )}
              </div>

              {rescheduleDate && rescheduleTime && availableSlots.includes(rescheduleTime) && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                  <p className="text-sm text-violet-800"><span className="font-medium">Nueva fecha:</span> {new Date(rescheduleDate).toLocaleDateString('es-ES', { weekday: 'short', month: 'short', day: 'numeric' })} — {formatTime(rescheduleTime)}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3">
              <button onClick={() => setShowRescheduleModal(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200">Cancelar</button>
              <button onClick={handleReschedule} disabled={rescheduling || !rescheduleDate || !rescheduleTime || !availableSlots.includes(rescheduleTime)} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 disabled:opacity-50">{rescheduling ? 'Guardando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function - single source of truth for extra income (propinas)
const getExtraIncome = (booking: Booking | any): number => {
  return (booking.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)
}

// Helper to display total with extra income
const getTotalWithExtra = (booking: Booking | any): number => {
  return booking.totalAmount + getExtraIncome(booking)
}

function BookingsView({ bookings, formatDate, onSelectBooking, isMobile, setModalOpen }: { bookings: Booking[]; formatDate: (s: string) => string; onSelectBooking: (b: Booking) => void; isMobile?: boolean; setModalOpen?: (open: boolean) => void }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'name' | 'status'>('date-asc')
  
  const STATUS_FILTERS = [
    { value: 'all', label: 'Todas' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmado' },
    { value: 'completed', label: 'Completado' },
    { value: 'cancelled', label: 'Cancelado' },
  ]
  
  // Filtrar y ordenar
  const filteredBookings = bookings
    .filter(b => {
      if (filter !== 'all' && b.status !== filter) return false
      if (search && !b.client.name.toLowerCase().includes(search.toLowerCase()) && 
          !b.serviceType.toLowerCase().includes(search.toLowerCase()) &&
          !b.client.email.toLowerCase().includes(search.toLowerCase())) return false
      if (dateFrom && b.sessionDate < dateFrom) return false
      if (dateTo && b.sessionDate > dateTo) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'date-asc') return a.sessionDate.localeCompare(b.sessionDate)
      if (sortBy === 'date-desc') return b.sessionDate.localeCompare(a.sessionDate)
      if (sortBy === 'name') return a.client.name.localeCompare(b.client.name)
      if (sortBy === 'status') return a.status.localeCompare(b.status)
      return 0
    })
  
  // Función para descargar factura PDF
  const downloadInvoice = async (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/invoices?id=${booking.id}`)
      const data = await res.json()
      if (data.pdf) {
        const pdfBlob = await fetch(data.pdf).then(r => r.blob())
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename || `factura-${booking.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error downloading invoice:', err)
    }
  }
  
  const StatusBadge = ({ status }: { status: string }) => { 
    const config: Record<string, { bg: string; text: string; label: string }> = { 
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pendiente' }, 
      confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Confirmado' }, 
      completed: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Completado' }, 
      cancelled: { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Cancelado' } 
    }
    const c = config[status] || config.pending
    return <span className={`${c.bg} ${c.text} px-2.5 py-0.5 rounded-full text-[11px] font-semibold`}>{c.label}</span>
  }

  const renderAmount = (booking: Booking) => {
    const extraIncome = getExtraIncome(booking)
    const totalWithExtra = getTotalWithExtra(booking)
    if (booking.status === 'completed' || booking.status === 'confirmed') {
      return (
        <div>
          <span className="text-emerald-600 text-sm font-semibold">${totalWithExtra}</span>
          {extraIncome > 0 && <span className="text-emerald-500 text-xs ml-1">+${extraIncome}</span>}
        </div>
      )
    } else if (booking.status === 'cancelled') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 text-sm font-medium">+${booking.depositPaid}</span>
          <span className="text-rose-400 line-through text-sm">${booking.totalAmount}</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-sm font-medium">${booking.totalAmount - booking.depositPaid}</span>
          <span className="text-emerald-500 text-sm">+${booking.depositPaid}</span>
        </div>
      )
    }
  }

  return (
    <div className="space-y-4 p-3 md:p-6 animate-fade-in-up">
      {/* Compact header + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-zinc-900 text-lg font-semibold whitespace-nowrap">Reservas</h2>
        <div className="flex-1 min-w-[200px] max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full h-8 pl-9 pr-4 text-sm rounded-lg border border-zinc-200 bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 transition-all duration-200 outline-none"
          />
        </div>
        <span className="text-zinc-400 text-xs">{filteredBookings.length} resultado{filteredBookings.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Date filters + Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-600"
          />
          <span className="text-zinc-400 text-xs">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-600"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="h-8 px-2 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-600 cursor-pointer"
        >
          <option value="date-asc">Fecha ↑</option>
          <option value="date-desc">Fecha ↓</option>
          <option value="name">Nombre</option>
          <option value="status">Estado</option>
        </select>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === f.value
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="modern-card rounded-xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-zinc-300" />
            </div>
            <p className="text-zinc-400 font-medium">No se encontraron reservas</p>
            <p className="text-zinc-300 text-xs mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          filteredBookings.map((booking, idx) => (
            <div
              key={booking.id}
              className="modern-card rounded-xl p-5 cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${idx * 40}ms` }}
              onClick={() => onSelectBooking(booking)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-base font-semibold text-zinc-900 truncate">{booking.client.name}</p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-zinc-400 text-sm truncate mt-0.5">{booking.client.email}</p>
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap text-sm">
                    <span className="text-zinc-600 font-medium">{formatServiceType(booking.serviceType)}</span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-zinc-600 font-medium">{formatServiceTier(booking.serviceTier)}</span>
                    <span className="text-zinc-200">|</span>
                    <span className="text-zinc-500">{booking.sessionDate}</span>
                    <span className="text-zinc-200">|</span>
                    <span className="text-zinc-500">{formatTime(booking.sessionTime)}</span>
                  </div>
                  <div className="mt-2">{renderAmount(booking)}</div>
                </div>
                <button
                  onClick={(e) => downloadInvoice(booking, e)}
                  className="text-zinc-300 hover:text-violet-600 hover:bg-violet-50 p-2 rounded-lg transition-all duration-200 flex-shrink-0 mt-1"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ReportsView({ bookings, onEditCosts, isMobile }: { bookings: Booking[]; onEditCosts?: () => void; isMobile?: boolean }) {
  const validBookings = bookings.filter(b => b.sessionDate && b.totalAmount)
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthOffset, setMonthOffset] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)

  // Costos fijos - se cargan desde API o usan default
  const [fixedCosts, setFixedCosts] = useState([
    { name: 'Renta Oficina', amount: 250 },
    { name: 'Internet', amount: 80 },
    { name: 'Teléfono', amount: 50 },
    { name: 'Software/Apps', amount: 50 },
    { name: 'Hosting/Dominio', amount: 20 },
    { name: 'Marketing', amount: 100 },
    { name: 'Seguro', amount: 50 },
    { name: 'Equipos', amount: 100 },
  ])
  const [savingCosts, setSavingCosts] = useState(false)
  const [showEditCosts, setShowEditCosts] = useState(false)
  const [editCosts, setEditCosts] = useState<{name: string, amount: number}[]>([])

  // Cargar costos fijos desde API
  useEffect(() => {
    const loadCosts = async () => {
      try {
        const res = await fetch('/api/config/fixed-costs')
        if (res.ok) {
          const data = await res.json()
          if (data.fixedCosts) {
            setFixedCosts(data.fixedCosts)
          }
        }
      } catch (e) { console.error('Error loading fixed costs:', e) }
    }
    loadCosts()
  }, [])

  const monthlyFixedCosts = fixedCosts.reduce((sum, c) => sum + c.amount, 0)

  // Calcular monthOffset para que el mes seleccionado esté siempre visible
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  
  let adjustedMonthOffset = monthOffset
  const monthsAhead = (selectedYear - currentYear) * 12 + (selectedMonth - currentMonth)
  if (monthsAhead < -11) {
    adjustedMonthOffset = monthsAhead + 11
  } else if (monthsAhead > 0) {
    adjustedMonthOffset = monthsAhead
  }

  const months = []
  const startMonth = new Date(currentYear, currentMonth - 11 + adjustedMonthOffset, 1)
  for (let i = 0; i < 12; i++) { const m = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1); months.push({ month: m.getMonth(), year: m.getFullYear(), name: m.toLocaleDateString('es-ES', { month: 'short' }) }) }

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  const monthlyData = months.map(m => {
    const monthPrefix = `${m.year}-${String(m.month + 1).padStart(2, '0')}`
    const monthBookings = validBookings.filter(b => b.sessionDate.startsWith(monthPrefix))
    
    const pendingInMonth = monthBookings.filter(b => b.status === 'pending')
    const confirmedInMonth = monthBookings.filter(b => b.status === 'confirmed')
    const completedInMonth = monthBookings.filter(b => b.status === 'completed')
    const cancelledInMonth = monthBookings.filter(b => b.status === 'cancelled')
    
    const getExtraIncome = (b: any) => (b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const ingresos = 
      pendingInMonth.reduce((sum: number, b: any) => sum + Number(b.depositPaid || 100) + getExtraIncome(b), 0) +
      confirmedInMonth.reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0) + getExtraIncome(b), 0) +
      completedInMonth.reduce((sum: number, b: any) => sum + Number(b.totalAmount || 0) + getExtraIncome(b), 0) +
      cancelledInMonth.reduce((sum: number, b: any) => sum + Number(b.depositPaid || 100) + getExtraIncome(b), 0)
    
    const costos = monthlyFixedCosts
    
    return { 
      ...m, 
      revenue: ingresos, 
      costs: costos,
      profit: ingresos - costos, 
      bookings: monthBookings.length 
    }
  })

  const maxValue = Math.max(...monthlyData.map(m => m.revenue), 100)
  const selectedMonthData = monthlyData.find(m => m.month === selectedMonth && m.year === selectedYear) || monthlyData[0]
  
  const selectedMonthPrefix = `${selectedMonthData.year}-${String(selectedMonthData.month + 1).padStart(2, '0')}`
  const selectedMonthBookings = validBookings.filter(b => b.sessionDate.startsWith(selectedMonthPrefix))

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-zinc-900 text-lg font-semibold whitespace-nowrap">Reportes</h2>
        <button 
          onClick={() => { setEditCosts([...fixedCosts]); setShowEditCosts(true) }}
          className="text-sm font-medium text-zinc-400 hover:text-violet-600 hover:bg-violet-50 px-3.5 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          Costos Fijos
        </button>
      </div>

      {/* Month selector */}
      <div className="modern-card rounded-xl p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-1.5">Mes</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 outline-none transition-all"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[100px]">
            <label className="text-xs text-zinc-400 uppercase font-semibold tracking-wider block mb-1.5">Año</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 outline-none transition-all"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* P&L Cards */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'} animate-fade-in-up`} style={{ animationDelay: '100ms' }}>
        <div className={`modern-card rounded-xl p-4 md:p-5 ${isMobile ? 'bg-emerald-50' : 'bg-gradient-to-br from-emerald-50/50 to-white'} border-emerald-100`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Ingresos</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-emerald-600">${selectedMonthData.revenue}</p>
          <p className="text-xs text-zinc-400 mt-1">{selectedMonthData.bookings} reserva{selectedMonthData.bookings !== 1 ? 's' : ''}</p>
        </div>
        <div className={`modern-card rounded-xl p-4 md:p-5 ${isMobile ? 'bg-rose-50' : 'bg-gradient-to-br from-rose-50/50 to-white'} border-rose-100`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-rose-100 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Gastos</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-rose-600">-${selectedMonthData.costs}</p>
          <p className="text-xs text-zinc-400 mt-1">fijos mensuales</p>
        </div>
        <div className={`modern-card rounded-xl p-4 md:p-5 ${isMobile ? (selectedMonthData.profit >= 0 ? 'bg-violet-50' : 'bg-rose-50') : 'bg-gradient-to-br '}${selectedMonthData.profit >= 0 ? (isMobile ? '' : 'from-violet-50/50 to-white') : (isMobile ? '' : 'from-rose-50/50 to-white')} border ${selectedMonthData.profit >= 0 ? 'border-violet-100' : 'border-rose-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center ${selectedMonthData.profit >= 0 ? 'bg-violet-100' : 'bg-rose-100'}`}>
              {selectedMonthData.profit >= 0 ? <TrendingUp className="w-4 h-4 text-violet-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
            </div>
            <span className={`text-xs font-semibold uppercase tracking-wider ${selectedMonthData.profit >= 0 ? 'text-violet-600' : 'text-rose-600'}`}>Beneficio</span>
          </div>
          <p className={`text-xl md:text-2xl font-bold ${selectedMonthData.profit >= 0 ? 'text-violet-600' : 'text-rose-600'}`}>
            ${selectedMonthData.profit}
          </p>
          <p className="text-xs text-zinc-400 mt-1">neto</p>
        </div>
      </div>

      {/* Table */}
      <div className="modern-card rounded-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900">Detalle de Reservas</h3>
          <span className="text-xs text-zinc-400">{selectedMonthBookings.length} reserva{selectedMonthBookings.length !== 1 ? 's' : ''}</span>
        </div>
        {selectedMonthBookings.length === 0 ? (
          <div className="p-10 text-center text-zinc-400">
            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center mx-auto mb-3">
              <CalendarX className="w-5 h-5 text-zinc-300" />
            </div>
            <p className="text-sm">No hay reservas este mes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Plan</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gastos</th>
                  <th className="text-right py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Beneficio</th>
                  <th className="text-center py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody>
                {selectedMonthBookings.map(b => { 
                  const isCompleted = b.status === 'completed' || b.status === 'confirmed'
                  const extraIncome = (b.expenses || []).filter((e: any) => e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0)
                  const gastos = (b.sessionCost || 0) + ((b.expenses || []).filter((e: any) => !e.isIncome).reduce((s: number, e: any) => s + (e.amount || 0), 0))
                  const beneficio = isCompleted ? (b.totalAmount + extraIncome - gastos) : 0
                  const statusConfig: Record<string, { bg: string; text: string }> = {
                    completed: { bg: 'bg-sky-50', text: 'text-sky-700' },
                    confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
                    pending: { bg: 'bg-amber-50', text: 'text-amber-700' },
                    cancelled: { bg: 'bg-rose-50', text: 'text-rose-600' },
                  }
                  const s = statusConfig[b.status] || statusConfig.pending
                  return (
                    <tr key={b.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-600">{new Date(b.sessionDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</td>
                      <td className="py-3 px-5 text-zinc-900 font-medium truncate max-w-[120px]">{b.client.name}</td>
                      <td className="py-3 px-5 text-zinc-500">{b.serviceTier}</td>
                      <td className="py-3 px-5 text-right">
                        {isCompleted ? (
                          <span className="text-emerald-600 font-medium">${b.totalAmount}{extraIncome > 0 && <span className="text-emerald-500 text-xs ml-1">+${extraIncome}</span>}</span>
                        ) : b.status === 'cancelled' ? (
                          <div className="flex items-center justify-end gap-1.5"><span className="text-emerald-500">+${b.depositPaid}</span> <span className="text-rose-400 line-through">${b.totalAmount}</span></div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5"><span className="text-amber-600">${b.totalAmount - b.depositPaid}</span> <span className="text-emerald-500">+${b.depositPaid}</span></div>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right text-rose-500">${gastos}</td>
                      <td className="py-3 px-5 text-right font-semibold">{isCompleted ? <span className={beneficio >= 0 ? 'text-violet-600' : 'text-rose-500'}>${beneficio}</span> : '-'}</td>
                      <td className="py-3 px-5 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>{formatStatus(b.status)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex justify-end gap-3 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <ExportExcel bookings={selectedMonthBookings} monthName={monthNames[selectedMonthData.month]} year={selectedMonthData.year} />
        <button 
          onClick={async () => {
            try {
              const res = await fetch(`/api/reports/pl?month=${selectedMonthData.month + 1}&year=${selectedMonthData.year}`)
              const data = await res.json()
              if (data.pdf) {
                const link = document.createElement('a')
                link.href = data.pdf
                link.download = data.filename || `PL-${monthNames[selectedMonthData.month]}-${selectedMonthData.year}.pdf`
                link.click()
              }
            } catch (err) {
              console.error('Error exporting P&L:', err)
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 shadow-md shadow-violet-200/60 hover:shadow-lg transition-all duration-200 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar P&L PDF
        </button>
      </div>

      {/* Edit Fixed Costs Modal */}
      {showEditCosts && (
        <EditFixedCostsModal
          costs={editCosts}
          onSave={(newCosts) => setFixedCosts(newCosts)}
          onClose={() => setShowEditCosts(false)}
        />
      )}
    </div>
  )
}

function ManualBookingModal({ onClose, onSuccess, isMobile, calendarData, bookings }: { onClose: () => void; onSuccess: () => void; isMobile?: boolean; calendarData?: Record<string, any>; bookings?: any[] }) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceType: '',
    deliveryType: '',
    packageTier: '',
    sessionDate: '',
    sessionTime: '',
    totalAmount: '',
    clientAge: '',
    clientNotes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [packages, setPackages] = useState<Record<string, any>>({})
  const [sessionTypes, setSessionTypes] = useState<any[]>([])

  const timeSlots = ['9:30', '11:30', '14:00', '16:00', '18:00']
  const digitalPackages = [
    { id: 'digital-6', name: '6 Fotos Digitales', price: 190 },
    { id: 'digital-12', name: '12 Fotos Digitales', price: 290 },
    { id: 'digital-18', name: '18 Fotos Digitales', price: 360 },
    { id: 'digital-35', name: '35 Fotos Digitales', price: 550 }
  ]
  const hasDigitalOptions = ['newborn', 'kids', 'pregnant'].includes(formData.serviceType)

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const res = await fetch('/api/packages')
        const data = await res.json()
        setPackages(data.packages || {})
        setSessionTypes(data.sessionTypes || [])
      } catch (e) { console.error('Error loading packages:', e) }
    }
    loadPackages()
  }, [])

  // Load blocked slots
  const [blockedSlots, setBlockedSlots] = useState<string[]>([])
  const [bookingsData, setBookingsData] = useState<any[]>([])
  
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load bookings directly from API
        const bookingsRes = await fetch('/api/bookings')
        const bookingsList = await bookingsRes.json()
        const activeBookings = bookingsList.filter((b: any) => b.status !== 'cancelled')
        console.log('ManualBookingModal: Loaded bookings:', activeBookings.length)
        setBookingsData(activeBookings)
      } catch (e) { console.error('Error loading bookings:', e) }
    }
    
    const loadBlockedSlots = async () => {
      try {
        const res = await fetch('/api/blocked-slots')
        const data = await res.json()
        console.log('ManualBookingModal: Blocked slots loaded:', data.length || 0)
        if (data && data.length > 0) {
          const slots = data.map((b: any) => `${b.date} ${b.time}`)
          setBlockedSlots(slots)
        }
      } catch (e) { console.error('Error loading blocked slots:', e) }
    }
    
    loadData()
    loadBlockedSlots()
  }, [])

  const isTimeBlocked = (date: string, time: string) => {
    return blockedSlots.includes(`${date} ${time}`)
  }

  const getAvailableTimes = (date: string) => {
    if (!date) return timeSlots
    
    const occupiedTimes: string[] = []
    
    // Add booked times from local state
    if (bookingsData && bookingsData.length > 0) {
      const dateBookings = bookingsData.filter((b: any) => b.sessionDate === date && b.status !== 'cancelled')
      console.log('getAvailableTimes:', date, 'bookings found:', dateBookings.length)
      dateBookings.forEach((b: any) => {
        const timeParts = b.sessionTime.split(':')
        occupiedTimes.push(`${parseInt(timeParts[0])}:${timeParts[1]}`)
      })
    }
    
    // Add blocked times
    blockedSlots.forEach(slot => {
      if (slot.startsWith(date)) {
        const time = slot.replace(date + ' ', '')
        occupiedTimes.push(time)
      }
    })
    
    console.log('getAvailableTimes:', date, 'occupied:', occupiedTimes)
    return timeSlots.filter(t => !occupiedTimes.includes(t));
  }

  const isDateBlockedOrFull = (date: string) => {
    if (!date) return false
    
    let occupiedCount = 0
    
    // Count booked slots
    if (bookingsData && bookingsData.length > 0) {
      const dateBookings = bookingsData.filter((b: any) => b.sessionDate === date && b.status !== 'cancelled')
      occupiedCount += dateBookings.length
    }
    
    // Count blocked slots
    const dateBlockedSlots = blockedSlots.filter(slot => slot.startsWith(date))
    occupiedCount += dateBlockedSlots.length
    
    console.log('isDateBlockedOrFull:', date, 'total occupied:', occupiedCount, 'bookings:', bookingsData?.length || 0, 'blocked:', dateBlockedSlots.length)
    return occupiedCount >= 5
  }

  const handlePackageChange = (packageId: string) => {
    let price = ''
    if (formData.deliveryType === 'digital') {
      price = digitalPackages.find(p => p.id === packageId)?.price?.toString() || ''
    } else {
      price = packages[formData.serviceType]?.find((p: any) => p.id === packageId)?.price?.toString() || ''
    }
    setFormData({...formData, packageTier: packageId, totalAmount: price})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate date is not full
    if (formData.sessionDate && isDateBlockedOrFull(formData.sessionDate)) {
      setError('Esa fecha está completa - escoge otra')
      return
    }

    // Validate time is available
    if (formData.sessionDate && formData.sessionTime) {
      const available = getAvailableTimes(formData.sessionDate)
      if (!available.includes(formData.sessionTime)) {
        setError('Ese horario ya no está disponible')
        return
      }
    }

    setSaving(true)

    try {
      const res = await fetch('/api/bookings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          clientPhone: formData.clientPhone,
          serviceType: formData.serviceType,
          serviceTier: formData.packageTier,
          sessionDate: formData.sessionDate,
          sessionTime: formData.sessionTime,
          totalAmount: parseFloat(formData.totalAmount),
          clientAge: formData.clientAge,
          clientNotes: formData.clientNotes,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al crear reserva')
        return
      }
      onSuccess()
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex items-center gap-2 mb-2">
        <div className="w-[3px] h-[14px] bg-violet-500 rounded-full" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{children}</h4>
      </div>
    )
  }

  const modalWidth = isMobile ? 'max-w-[98vw] max-h-[85vh]' : 'max-w-xl max-h-[90vh]'
  const padding = isMobile ? 'p-2' : 'p-5'
  const headerPadding = isMobile ? 'p-2' : 'p-5'

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center ${isMobile ? 'pt-2 pb-4 px-1' : 'p-4'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`animate-scale-in relative bg-white rounded-xl shadow-xl w-full ${modalWidth} overflow-hidden flex flex-col`}>
        <div className={`shrink-0 bg-white border-b border-zinc-100 flex items-center justify-between ${headerPadding}`}>
          <h3 className={`font-semibold text-zinc-900 ${isMobile ? 'text-sm' : 'text-base'}`}>Nueva Reserva Manual</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-lg"><svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto ${padding} space-y-4 md:space-y-5`}>
          {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm">{error}</div>}

          <section>
            <SectionTitle>Cliente</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} placeholder="Nombre completo" className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
                <input required type="tel" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} placeholder="Teléfono" className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
              </div>
              <input required type="email" value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})} placeholder="Email" className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </section>

          <section>
            <SectionTitle>Servicio</SectionTitle>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select required value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value, deliveryType: '', packageTier: '', totalAmount: ''})} className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="">Tipo de sesión...</option>
                  {sessionTypes.map(t => <option key={t.id} value={t.id}>{t.nameEs}</option>)}
                </select>
                {hasDigitalOptions && (
                  <select required value={formData.deliveryType} onChange={e => setFormData({...formData, deliveryType: e.target.value, packageTier: '', totalAmount: ''})} className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm">
                    <option value="">Entrega...</option>
                    <option value="digital">Solo Digital</option>
                    <option value="print">Con Impresión</option>
                  </select>
                )}
              </div>
              {formData.serviceType && (formData.deliveryType || !hasDigitalOptions) && (
                <select required value={formData.packageTier} onChange={e => handlePackageChange(e.target.value)} className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="">Paquete...</option>
                  {formData.deliveryType === 'digital' ? (
                    digitalPackages.map(p => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)
                  ) : (
                    packages[formData.serviceType]?.map((p: any) => <option key={p.id} value={p.id}>{p.name} - ${p.price}</option>)
                  )}
                </select>
              )}
            </div>
          </section>

          <section>
            <SectionTitle>Fecha y Hora</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input 
                  required 
                  type="date" 
                  value={formData.sessionDate} 
                  onChange={e => {
                    const selectedDate = e.target.value
                    if (selectedDate && isDateBlockedOrFull(selectedDate)) {
                      setError('Ese día está completo - escoge otra fecha')
                      setFormData({...formData, sessionDate: '', sessionTime: ''})
                    } else {
                      setError('')
                      setFormData({...formData, sessionDate: selectedDate, sessionTime: ''})
                    }
                  }} 
                  min={new Date().toISOString().split('T')[0]} 
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <select required value={formData.sessionTime} onChange={e => setFormData({...formData, sessionTime: e.target.value})} className="border border-zinc-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="">Hora...</option>
                {formData.sessionDate && getAvailableTimes(formData.sessionDate).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </section>

          <section>
            <SectionTitle>Total</SectionTitle>
            <input required type="number" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} placeholder="0" className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
          </section>

          <section>
            <SectionTitle>Notas</SectionTitle>
            <textarea value={formData.clientNotes} onChange={e => setFormData({...formData, clientNotes: e.target.value})} placeholder="Notas adicionales..." rows={2} className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" />
          </section>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700">{saving ? 'Guardando...' : 'Crear Reserva'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditFixedCostsModal({ costs, onSave, onClose }: { costs: { name: string, amount: number }[]; onSave: (costs: { name: string, amount: number }[]) => void; onClose: () => void }) {
  const [editData, setEditData] = useState(costs)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config/fixed-costs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fixedCosts: editData }) })
      if (res.ok) { onSave(editData); onClose() }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  const total = editData.reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-scale-in relative bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900">Configurar Costos Fijos Mensuales</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl"><svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {editData.map((cost, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input type="text" value={cost.name} onChange={e => { const newData = [...editData]; newData[idx].name = e.target.value; setEditData(newData) }} className="flex-1 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Nombre del gasto" />
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input type="number" value={cost.amount} onChange={e => { const newData = [...editData]; newData[idx].amount = parseFloat(e.target.value) || 0; setEditData(newData) }} className="w-full border border-zinc-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-right" min="0" />
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-zinc-100 bg-zinc-50 rounded-b-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-zinc-600">Total mensual:</span>
            <span className="text-xl font-bold text-violet-600">${total}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 bg-zinc-200 text-zinc-600 rounded-xl font-medium hover:bg-zinc-300">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}


