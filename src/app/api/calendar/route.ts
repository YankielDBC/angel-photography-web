import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

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
  
  try {
    // 1. Obtener reservas
    const bookingsResult = await docClient.send(new ScanCommand({
      TableName: BOOKINGS_TABLE
    }))
    const bookings = (bookingsResult.Items || []).filter((b: any) => b.status !== 'cancelled')
    
    // 2. Obtener bloqueos
    const blockedResult = await docClient.send(new ScanCommand({
      TableName: BLOCKED_TABLE
    }))
    const blocked = blockedResult.Items || []
    
    // Días bloqueados
    const blockedDays = blocked.filter((b: any) => b.type === 'day').map((b: any) => b.date)
    
    // Horarios bloqueados
    const blockedSlots = blocked.filter((b: any) => b.type === 'slot')
    
    // Generar fechas del mes
    const now = new Date()
    const year = month ? parseInt(month.split('-')[0]) : now.getFullYear()
    const monthNum = month ? parseInt(month.split('-')[1]) : now.getMonth() + 1
    const daysInMonth = new Date(year, monthNum, 0).getDate()
    
    const datesToCheck: string[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      datesToCheck.push(`${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
    }
    
    const availability: Record<string, any> = {}
    
    for (const date of datesToCheck) {
      const dateBookings = bookings.filter((b: any) => b.sessionDate === date)
      const dateBlockedSlots = blockedSlots.filter((b: any) => b.date === date)
      
      const bookedTimes = dateBookings.map((b: any) => b.sessionTime)
      const blockedTimes = dateBlockedSlots.map((b: any) => b.time)
      
      // Calcular slots
      const slots = TIME_SLOTS.map(time => {
        if (bookedTimes.includes(time)) {
          const booking = dateBookings.find((b: any) => b.sessionTime === time)
          return {
            time,
            status: 'booked',
            booking: booking ? {
              id: booking.id,
              clientName: booking.clientName,
              serviceType: booking.serviceType,
              serviceTier: booking.serviceTier,
              status: booking.status
            } : null
          }
        }
        if (blockedTimes.includes(time)) {
          const block = dateBlockedSlots.find((b: any) => b.time === time)
          return {
            time,
            status: 'blocked',
            reason: block?.reason || 'Bloqueado'
          }
        }
        return { time, status: 'available' }
      })
      
      const availableSlots = slots.filter((s: any) => s.status === 'available').length
      const bookedSlots = slots.filter((s: any) => s.status === 'booked').length
      const blockedSlotsCount = slots.filter((s: any) => s.status === 'blocked').length
      
      // Estado del día
      let dayStatus: string
      
      // Gris: día bloqueado sin reservas
      if (blockedDays.includes(date)) {
        dayStatus = 'blocked'
      } 
      // Rojo: sin horarios disponibles (reservados + bloqueados = todos)
      else if (availableSlots === 0) {
        dayStatus = 'full'
      }
      // Amarillo: hay 1+ reservas
      else if (bookedSlots > 0) {
        dayStatus = 'has_bookings'
      }
      // Verde: hay al menos 1 horario disponible
      else {
        dayStatus = 'available'
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
        bookings: dateBookings.map((b: any) => ({
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
      month: month || `${year}-${String(monthNum).padStart(2, '0')}`,
      timeSlots: TIME_SLOTS,
      availability
    })
    
  } catch (error) {
    console.error('Error fetching calendar:', error)
    return NextResponse.json({ error: 'Error al obtener calendario' }, { status: 500 })
  }
}

// POST - Bloquear día u horario
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

// DELETE - Desbloquear
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
