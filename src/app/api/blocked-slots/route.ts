import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Obtener todos los slots bloqueados
export async function GET() {
  try {
    const blockedSlots = await prisma.calendarSlot.findMany({
      where: { status: 'blocked_admin' },
      orderBy: { date: 'asc' }
    })
    return NextResponse.json(blockedSlots)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch blocked slots' }, { status: 500 })
  }
}

// POST: Bloquear un horario específico
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, time, reason } = body

    if (!date || !time) {
      return NextResponse.json({ error: 'Date and time required' }, { status: 400 })
    }

    const dateTime = new Date(`${date}T${time}:00`)

    // Check if already blocked
    const existing = await prisma.calendarSlot.findUnique({
      where: { 
        date_time: {
          date: dateTime,
          time: time
        }
      }
    })

    if (existing) {
      if (existing.status === 'blocked_admin') {
        return NextResponse.json({ error: 'Slot already blocked' }, { status: 400 })
      }
      // Si está reservado, no permitir bloquear
      if (existing.status === 'booked') {
        return NextResponse.json({ error: 'Cannot block a booked slot' }, { status: 400 })
      }
    }

    const blockedSlot = await prisma.calendarSlot.upsert({
      where: {
        date_time: {
          date: dateTime,
          time: time
        }
      },
      update: {
        status: 'blocked_admin',
        reason: reason || 'Bloqueado por admin'
      },
      create: {
        date: dateTime,
        time: time,
        status: 'blocked_admin',
        reason: reason || 'Bloqueado por admin'
      }
    })

    return NextResponse.json(blockedSlot, { status: 201 })
  } catch (error) {
    console.error('Block slot error:', error)
    return NextResponse.json({ error: 'Failed to block slot' }, { status: 500 })
  }
}

// DELETE: Desbloquear un horario
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    
    if (!date || !time) {
      return NextResponse.json({ error: 'Date and time required' }, { status: 400 })
    }

    const dateTime = new Date(`${date}T${time}:00`)

    await prisma.calendarSlot.delete({
      where: {
        date_time: {
          date: dateTime,
          time: time
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to unblock slot' }, { status: 500 })
  }
}
