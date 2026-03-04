import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
})

const docClient = DynamoDBDocumentClient.from(client)
const BOOKINGS_TABLE = 'angel-bookings'
const BLOCKED_TABLE = 'angel-blocked'

// Horarios disponibles
const TIME_SLOTS = ['9:30', '11:30', '14:00', '16:00', '18:00']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // YYYY-MM
  const startDate = searchParams.get('startDate') // YYYY-MM-DD
  const endDate = searchParams.get('endDate') // YYYY-MM-DD
  
  try {
    // 1. Obtener todas las reservas
    const bookingsResult = await docClient.send(new ScanCommand({
      TableName: BOOKINGS_TABLE
    }))
    const bookings = (bookingsResult.Items || []).filter(b => b.status !== 'cancelled')
    
    // 2. Obtener bloqueos
    const blockedResult = await docClient.send(new ScanCommand({
      TableName: BLOCKED_TABLE
    }))
    const blocked = blockedResult.Items || []
    
    // 3. Obtener días bloqueados
    const blockedDays = blocked.filter(b => b.type === 'day').map(b => b.date)
    
    // 4. Obtener horarios bloqueados
    const blockedSlots = blocked.filter(b => b.type === 'slot')
    
    // 5. Calcular disponibilidad por día
    const availability: Record<string, any> = {}
    
    // Filtrar por rango si se especifica
    let datesToCheck: string[] = []
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const current = new Date(start)
      while (current <= end) {
        datesToCheck.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }
    } else if (month) {
      const [year, m] = month.split('-').map(Number)
      const daysInMonth = new Date(year, m, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, m - 1, day)
        datesToCheck.push(date.toISOString().split('T')[0])
      }
    } else {
      // Mes actual por defecto
      const now = new Date()
      const year = now.getFullYear()
      const monthNum = now.getMonth() + 1
      const daysInMonth = new Date(year, monthNum, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthNum - 1, day)
        datesToCheck.push(date.toISOString().split('T')[0])
      }
    }
    
    for (const date of datesToCheck) {
      const dateBookings = bookings.filter(b => b.sessionDate === date)
      const dateBlockedSlots = blockedSlots.filter(b => b.date === date)
      
      const bookedTimes = dateBookings.map(b => b.sessionTime)
      const blockedTimes = dateBlockedSlots.map(b => b.time)
      
      // Calcular estado de cada horario
      const slotsMap = TIME_SLOTS.map(time => {
        const isBooked = bookedTimes.includes(time)
        const isBlocked = blockedTimes.includes(time)
        
        if (isBooked) {
          const booking = dateBookings.find(b => b.sessionTime === time)
          if (!booking) return null
          return {
            time,
            status: 'booked',
            booking: {
              id: booking.id,
              clientName: booking.clientName,
              serviceType: booking.serviceType,
              serviceTier: booking.serviceTier,
              status: booking.status
            }
          }
        }
        
        if (isBlocked) {
          const block = dateBlockedSlots.find(b => b.time === time)
          return {
            time,
            status: 'blocked',
            reason: block?.reason || 'Bloqueado'
          }
        }
        
        return { time, status: 'available' }
      })
      
      const slots = slotsMap.filter((s): s is { time: string; status: string; booking?: any; reason?: string } => s !== null)
      
      const availableSlots = slots.filter(s => s.status === 'available').length
      const bookedSlots = slots.filter(s => s.status === 'booked').length
      const blockedSlotsCount = slots.filter(s => s.status === 'blocked').length
      
      // Determinar estado del día
      let dayStatus: string
      if (blockedDays.includes(date)) {
        dayStatus = 'blocked' // Gris - día bloqueado
      } else if (availableSlots === 0 && bookedSlots > 0) {
        dayStatus = 'full' // Rojo - día completo
      } else if (bookedSlots > 0) {
        dayStatus = 'has_bookings' // Amarillo - tiene reservas
      } else if (availableSlots === TIME_SLOTS.length) {
        dayStatus = 'available' // Verde - 100% disponible
      } else {
        dayStatus = 'partial' // Parcialmente disponible
      }
      
      availability[date] = {
        date,
        status: dayStatus,
        slots,
        summary: {
          total: TIME_SLOTS.length,
          available: availableSlots,
          booked: bookedSlots,
          blocked: blockedSlotsCount
        },
        bookings: dateBookings.map(b => ({
          id: b.id,
          clientName: b.clientName,
          serviceType: b.serviceType,
          serviceTier: b.serviceTier,
          sessionTime: b.sessionTime,
          status: b.status,
          totalAmount: b.totalAmount
        }))
      }
    }
    
    return NextResponse.json({
      month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      timeSlots: TIME_SLOTS,
      availability
    })
    
  } catch (error) {
    console.error('Error fetching calendar:', error)
    return NextResponse.json({ error: 'Error al obtener calendario' }, { status: 500 })
  }
}

// POST - Bloquear un día u horario
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, date, time, reason } = body
    
    if (!type || !date) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }
    
    const id = type === 'day' 
      ? `day_${date}` 
      : `slot_${date}_${time}`
    
    const item = {
      id,
      type,
      date,
      time: time || null,
      reason: reason || (type === 'day' ? 'Día bloqueado' : 'Horario bloqueado'),
      createdAt: new Date().toISOString()
    }
    
    await docClient.send(new PutCommand({
      TableName: BLOCKED_TABLE,
      Item: item
    }))
    
    return NextResponse.json({ success: true, blocked: item })
  } catch (error) {
    console.error('Error blocking:', error)
    return NextResponse.json({ error: 'Error al bloquear' }, { status: 500 })
  }
}

// DELETE - Desbloquear día u horario
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }
    
    await docClient.send(new DeleteCommand({
      TableName: BLOCKED_TABLE,
      Key: { id }
    }))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unblocking:', error)
    return NextResponse.json({ error: 'Error al desbloquear' }, { status: 500 })
  }
}
