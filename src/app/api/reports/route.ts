import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/reports - Get reports data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'monthly', 'by_plan', 'summary'
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    // Get all bookings
    const bookings = await prisma.booking.findMany({
      include: { client: true },
      orderBy: { sessionDate: 'desc' }
    })

    if (type === 'monthly') {
      // Revenue by month
      const monthly: Record<string, { deposits: number, remaining: number, count: number }> = {}
      
      for (let month = 1; month <= 12; month++) {
        const key = `${year}-${month.toString().padStart(2, '0')}`
        monthly[key] = { deposits: 0, remaining: 0, count: 0 }
      }

      bookings.forEach(booking => {
        const date = new Date(booking.sessionDate)
        if (date.getFullYear() === year) {
          const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
          if (monthly[key]) {
            monthly[key].deposits += booking.depositPaid
            monthly[key].remaining += booking.remainingPaid
            monthly[key].count += 1
          }
        }
      })

      return NextResponse.json({ monthly })
    }

    if (type === 'by_plan') {
      // Revenue by service type/tier
      const byPlan: Record<string, { total: number, deposits: number, remaining: number, count: number }> = {}

      bookings.forEach(booking => {
        const key = `${booking.serviceType} - ${booking.serviceTier}`
        if (!byPlan[key]) {
          byPlan[key] = { total: 0, deposits: 0, remaining: 0, count: 0 }
        }
        byPlan[key].total += booking.totalAmount
        byPlan[key].deposits += booking.depositPaid
        byPlan[key].remaining += booking.remainingPaid
        byPlan[key].count += 1
      })

      return NextResponse.json({ byPlan })
    }

    // Summary (KPIs)
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed')
    const totalDeposits = confirmedBookings.reduce((sum, b) => sum + b.depositPaid, 0)
    const totalRemaining = confirmedBookings.reduce((sum, b) => sum + b.remainingPaid, 0)
    const totalRevenue = totalDeposits + totalRemaining

    // Upcoming bookings (next 30 days)
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        sessionDate: {
          gte: now,
          lte: thirtyDaysLater
        },
        status: { in: ['confirmed', 'pending'] }
      },
      include: { client: true },
      orderBy: { sessionDate: 'asc' }
    })

    // Calendar stats
    const calendarSlots = await prisma.calendarSlot.findMany()
    const bookedSlots = calendarSlots.filter(s => s.status === 'booked').length
    const blockedSlots = calendarSlots.filter(s => s.status === 'blocked_admin').length

    return NextResponse.json({
      summary: {
        totalBookings: confirmedBookings.length,
        totalDeposits,
        totalRemaining,
        totalRevenue,
        bookedSlots,
        blockedSlots
      },
      upcomingBookings
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/reports - Export CSV
export async function POST(request: Request) {
  try {
    const { export: exportType } = await request.json()

    const bookings = await prisma.booking.findMany({
      include: { client: true },
      orderBy: { sessionDate: 'desc' }
    })

    if (exportType === 'csv') {
      // Generate CSV
      const headers = ['ID', 'Cliente', 'Email', 'Teléfono', 'Fecha', 'Hora', 'Tipo', 'Tier', 'Total', 'Depósito', 'Restante', 'Estado', 'Creado']
      
      const rows = bookings.map(b => [
        b.id,
        b.client.name,
        b.client.email,
        b.client.phone,
        new Date(b.sessionDate).toLocaleDateString('es'),
        b.sessionTime,
        b.serviceType,
        b.serviceTier,
        b.totalAmount.toString(),
        b.depositPaid.toString(),
        b.remainingPaid.toString(),
        b.status,
        new Date(b.createdAt).toLocaleDateString('es')
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      
      return NextResponse.json({ csv, filename: `reservas_${new Date().toISOString().split('T')[0]}.csv` })
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
  } catch (error) {
    console.error('Error exporting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
