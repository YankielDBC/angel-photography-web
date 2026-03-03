import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/slots/availability - Get available slots for a date range
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

    // Get all slots in range
    const slots = await prisma.calendarSlot.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: { date: 'asc' }
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
      where: { isActive: true }
    })

    return NextResponse.json({
      slots,
      blockedDays: blockedDays.map(b => b.date.toISOString().split('T')[0]),
      businessHours
    })
  } catch (error) {
    console.error('Error fetching availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/slots/availability - Block/unblock a slot (admin)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, date, time, reason } = body

    // Check admin auth (simple check)
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (action === 'block_slot') {
      const slot = await prisma.calendarSlot.upsert({
        where: { date_time: { date: new Date(date), time } },
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
      await prisma.calendarSlot.update({
        where: { date_time: { date: new Date(date), time } },
        data: { status: 'available', reason: null }
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'block_day') {
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error managing slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
