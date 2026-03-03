import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM
    const year = searchParams.get('year')

    // Get all blocked days
    const blockedDays = await prisma.blockedDay.findMany({
      select: { date: true }
    })
    const blockedDaysSet = new Set(
      blockedDays.map(d => new Date(d.date).toISOString().split('T')[0])
    )

    // Get all blocked slots
    const blockedSlots = await prisma.calendarSlot.findMany({
      where: { status: 'blocked_admin' },
      select: { date: true, time: true }
    })
    
    // Group blocked slots by date
    const blockedSlotsByDate: Record<string, string[]> = {}
    blockedSlots.forEach(slot => {
      const dateKey = new Date(slot.date).toISOString().split('T')[0]
      if (!blockedSlotsByDate[dateKey]) blockedSlotsByDate[dateKey] = []
      blockedSlotsByDate[dateKey].push(slot.time)
    })

    // Get all bookings (except cancelled)
    const bookings = await prisma.booking.findMany({
      where: { 
        status: { not: 'cancelled' },
        sessionDate: { not: null }
      },
      select: { sessionDate: true, sessionTime: true }
    })
    
    // Group bookings by date
    const bookingsByDate: Record<string, string[]> = {}
    bookings.forEach(booking => {
      if (!booking.sessionDate) return
      const dateKey = new Date(booking.sessionDate).toISOString().split('T')[0]
      if (!bookingsByDate[dateKey]) bookingsByDate[dateKey] = []
      bookingsByDate[dateKey].push(booking.sessionTime)
    })

    // Determine unavailable dates
    const unavailableDates: string[] = []
    const allDates = new Set<string>([...blockedDaysSet])

    // Add dates that have all slots occupied
    const allTimes = ['9:30', '11:30', '14:00', '16:00', '18:00']
    
    for (const dateKey of allDates) {
      const blocked = blockedSlotsByDate[dateKey] || []
      const booked = bookingsByDate[dateKey] || []
      const occupied = [...new Set([...blocked, ...booked])]
      
      if (occupied.length >= allTimes.length) {
        unavailableDates.push(dateKey)
      }
    }

    // Also check dates with bookings (if they become full)
    Object.keys(bookingsByDate).forEach(dateKey => {
      const blocked = blockedSlotsByDate[dateKey] || []
      const booked = bookingsByDate[dateKey] || []
      const occupied = [...new Set([...blocked, ...booked])]
      
      if (occupied.length >= allTimes.length && !unavailableDates.includes(dateKey)) {
        unavailableDates.push(dateKey)
      }
    })

    return NextResponse.json({
      unavailableDates,
      blockedDays: Array.from(blockedDaysSet),
      details: {
        blockedSlotsByDate,
        bookingsByDate
      }
    })
  } catch (error) {
    console.error('Availability error:', error)
    // Return demo data on error
    return NextResponse.json({
      unavailableDates: [],
      blockedDays: [],
      details: { blockedSlotsByDate: {}, bookingsByDate: {} }
    })
  }
}
