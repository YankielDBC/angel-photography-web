import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/bookings - List all bookings (admin)
export async function GET(request: Request) {
  try {
    // Check for admin token
    const authHeader = request.headers.get('authorization')
    const isAdmin = authHeader?.startsWith('Bearer admin-')

    const bookings = await prisma.booking.findMany({
      include: {
        client: true
      },
      orderBy: { sessionDate: 'desc' }
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/bookings - Create new booking (client)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      clientName, 
      clientEmail, 
      clientPhone, 
      sessionDate, 
      sessionTime,
      serviceType,
      serviceTier,
      totalAmount,
      stripeSessionId
    } = body

    // Check if slot is available
    const existingSlot = await prisma.calendarSlot.findUnique({
      where: {
        date_time: {
          date: new Date(sessionDate),
          time: sessionTime
        }
      }
    })

    if (existingSlot?.status === 'booked') {
      return NextResponse.json({ error: 'Este horario ya está reservado' }, { status: 400 })
    }

    // Check if day is blocked
    const dayBlocked = await prisma.blockedDay.findUnique({
      where: {
        date: new Date(new Date(sessionDate).toISOString().split('T')[0])
      }
    })

    if (dayBlocked) {
      return NextResponse.json({ error: 'Este día está bloqueado' }, { status: 400 })
    }

    // Find or create client
    let client = await prisma.client.findFirst({
      where: { email: clientEmail }
    })

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone
        }
      })
    }

    // Create booking with slot
    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        serviceType,
        serviceTier,
        sessionDate: new Date(sessionDate),
        sessionTime,
        totalAmount,
        depositPaid: 100,
        stripeSessionId,
        status: 'confirmed'
      },
      include: {
        client: true
      }
    })

    // Mark slot as booked
    await prisma.calendarSlot.upsert({
      where: {
        date_time: {
          date: new Date(sessionDate),
          time: sessionTime
        }
      },
      create: {
        date: new Date(sessionDate),
        time: sessionTime,
        status: 'booked',
        bookingId: booking.id
      },
      update: {
        status: 'booked',
        bookingId: booking.id
      }
    })

    // TODO: Send confirmation email

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Booking error:', error)
    return NextResponse.json({ error: 'Error al crear la reserva' }, { status: 500 })
  }
}
