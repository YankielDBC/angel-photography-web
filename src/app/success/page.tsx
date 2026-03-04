'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'

// Animated checkmark SVG
function SuccessIcon() {
  return (
    <div className="mb-6 flex justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-scale">
        <circle cx="40" cy="40" r="36" stroke="#22c55e" strokeWidth="4" fill="none" style={{ animation: 'pulse 2s ease-in-out infinite' }}/>
        <circle cx="40" cy="40" r="28" fill="#22c55e" opacity="0.15"/>
        <path 
          d="M24 40L35 51L56 30" 
          stroke="#22c55e" 
          strokeWidth="5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none" 
          style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'draw 0.6s ease-out 0.3s forwards' }}
        />
      </svg>
      <style jsx>{`
        @keyframes draw {
          to { strokeDashoffset: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

interface BookingData {
  id: string
  clientName: string
  clientEmail: string
  serviceType: string
  serviceTier: string
  sessionDate: string
  sessionTime: string
  totalAmount: number
  depositPaid: number
  remainingPaid: number
  status: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bookingId) {
      fetch('/api/bookings')
        .then(res => res.json())
        .then(data => {
          const found = data.find((b: BookingData) => b.id === bookingId)
          if (found) {
            setBooking(found)
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [bookingId])

  const getServiceName = (type: string) => {
    const names: Record<string, string> = {
      pregnant: 'Maternidad',
      newborn: 'Newborn',
      kids: 'Niños',
      wedding: 'Boda',
      eventos: 'Eventos',
      exclusivo: 'Exclusivo'
    }
    return names[type] || type
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0a', color: '#fafafa' }}>
      <div className="text-center max-w-lg">
        <SuccessIcon />
        
        <h1 className="font-serif text-4xl font-bold mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
          ¡Reserva Confirmada!
        </h1>
        
        {!loading && booking && (
          <div className="text-left bg-white/5 rounded-2xl p-6 mb-8 border border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-amber-400">Detalles de tu sesión</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Nombre:</span>
                <span>{booking.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Servicio:</span>
                <span className="capitalize">{getServiceName(booking.serviceType)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Paquete:</span>
                <span className="capitalize">{booking.serviceTier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fecha:</span>
                <span>{formatDate(booking.sessionDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Hora:</span>
                <span>{booking.sessionTime}</span>
              </div>
              <div className="border-t border-white/10 pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total:</span>
                  <span>${booking.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Depósito (pagado):</span>
                  <span className="text-green-400">${booking.depositPaid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pendiente:</span>
                  <span className="text-amber-400">${booking.remainingPaid}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-gray-400 text-lg mb-8">
          Te hemos enviado un correo con los detalles. 
          El depósito de $100 ha sido procesado.
        </p>
        
        <p className="text-xs text-gray-500 mb-8">
          ID de reserva: {bookingId}
        </p>
        
        <Link 
          href="/" 
          className="inline-block px-8 py-3 rounded-full font-medium transition"
          style={{ background: '#c9a962', color: '#0a0a0a' }}
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <p style={{ color: '#c9a962' }}>Cargando...</p>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  )
}
