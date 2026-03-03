import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/slots - Get slots for a date range
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Get slots
    const slots = await prisma.calendarSlot.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    })

    // Get blocked days
    const blockedDays = await prisma.blockedDay.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      }
    })

    // Get business hours
    const businessHours = await prisma.businessHours.findMany({
      where: { isActive: true },
      orderBy: { dayOfWeek: 'asc' }
    })

    // Get bookings for this range
    const bookings = await prisma.booking.findMany({
      where: {
        sessionDate: {
          gte: start,
          lte: end
        },
        status: { in: ['confirmed', 'pending'] }
      },
      include: { client: true }
    })

    return NextResponse.json({ 
      slots, 
      blockedDays: blockedDays.map(b => b.date.toISOString().split('T')[0]),
      businessHours,
      bookings
    })
  } catch (error) {
    console.error('Error fetching slots:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/slots - Create, block, unblock slots (admin)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, date, time, reason } = body

    // Check admin auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer admin-')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dateStr = new Date(date).toISOString().split('T')[0]

    if (action === 'block_slot') {
      const slot = await prisma.calendarSlot.upsert({
        where: { 
          date_time: { date: new Date(date), time } 
        },
        create: {
          date: new Date(date),
          time,
          status: 'blocked_admin',
          reason
        },
        update: {
          status: 'blocked_admin',
          reason
        }
      })
      return NextResponse.json(slot)
    }

    if (action === 'unblock_slot') {
      const slot = await prisma.calendarSlot.findUnique({
        where: { 
          date_time: { date: new Date(date), time } 
        }
      })
      
      if (slot?.bookingId) {
        return NextResponse.json({ error: 'No se puede desbloquear un slot reservado' }, { status: 400 })
      }

      await prisma.calendarSlot.update({
        where: { 
          date_time: { date: new Date(date), time } 
        },
        data: { status: 'available', reason: null }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'block_day') {
      // Block entire day
      const blockedDay = await prisma.blockedDay.upsert({
        where: { date: new Date(date) },
        create: {
          date: new Date(date),
          reason
        },
        update: {
          reason
        }
      })
      return NextResponse.json(blockedDay)
    }

    if (action === 'unblock_day') {
      await prisma.blockedDay.delete({
        where: { date: new Date(date) }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'generate_slots') {
      // Generate available slots for a day based on business hours
      const targetDate = new Date(date)
      const dayOfWeek = targetDate.getDay()
      
      const hours = businessHours.find(h => h.dayOfWeek === dayOfWeek)
      if (!hours) {
        return NextResponse.json({ error: 'No business hours for this day' }, { status: 400 })
      }

      const newSlots = []
      const [startH, startM] = hours.startTime.split(':').map(Number)
      const [endH, endM] = hours.endTime.split(':').map(Number)

      for (let h = startH; h < endH; h++) {
        for (let m = 0; m < 60; m += 60) {
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
          
          const slot = await prisma.calendarSlot.upsert({
            where: { date_time: { date: targetDate, time: timeStr } },
            create: {
              date: targetDate,
              time: timeStr,
              status: 'available'
            },
            update: {} // Keep existing status
          })
          newSlots.push(slot)
        }
      }

      return NextResponse.json({ generated: newSlots.length })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const businessHours = [] // Placeholder for the function
