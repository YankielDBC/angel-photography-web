import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/notifications/send - Send notification (confirmation, reminder)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, bookingId } = body

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { client: true }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    let subject = ''
    let message = ''

    if (type === 'confirmation') {
      subject = '✅ Confirmación de tu sesión de fotos - Angel Photography Miami'
      message = `
¡Hola ${booking.client.name}!

Tu reserva ha sido confirmada ✅

📅 Fecha: ${new Date(booking.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
⏰ Hora: ${booking.sessionTime}
📸 Tipo de sesión: ${booking.serviceType}
💎 Paquete: ${booking.serviceTier}

💰 Total: $${booking.totalAmount}
💵 Depósito pagado: $${booking.depositPaid}
📌 Restante a pagar el día de la sesión: $${booking.totalAmount - booking.depositPaid}

📍 IMPORTANTE: El pago restante se realiza el día de la sesión de forma presencial.

¿Tienes dudas? Contáctanos por WhatsApp: +1 (786) 318-4596

¡Nos!
 vemos pronto- Angel Photography Miami
      `.trim()
    }

    if (type === 'reminder') {
      subject = '⏰ Recordatorio: Tu sesión de fotos es mañana'
      message = `
¡Hola ${booking.client.name}!

Solo un recordatorio amigable 📸

Tu sesión de fotos es MAÑANA:
📅 ${new Date(booking.sessionDate).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
⏰ Hora: ${booking.sessionTime}

📍 Recuerda:
- Llega 10-15 minutos antes
- Trae tu vestimenta lista
- El pago restante ($${booking.totalAmount - booking.depositPaid}) se paga ese día

¿Necesitas cambiar algo? Contáctanos ASAP.

¡Hasta mañana!
- Angel Photography Miami
      `.trim()
    }

    // In production, integrate with email service (SendGrid, Resend, etc.)
    // For now, we'll log and return success
    console.log('=== EMAIL NOTIFICATION ===')
    console.log(`To: ${booking.client.email}`)
    console.log(`Subject: ${subject}`)
    console.log(`Message: ${message}`)
    console.log('===========================')

    // Store notification in DB
    const notification = await prisma.booking.update({
      where: { id: bookingId },
      data: { notes: (booking.notes || '') + `\n[${type}] Notification sent: ${new Date().toISOString()}` }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent (logged)',
      notification
    })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/notifications/schedule - Check and send reminders for upcoming sessions
export async function GET() {
  try {
    // Find bookings needing reminder (1 day before)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    const tomorrowEnd = new Date(tomorrow)
    tomorrowEnd.setHours(23, 59, 59, 999)

    const bookingsForReminder = await prisma.booking.findMany({
      where: {
        sessionDate: {
          gte: tomorrow,
          lte: tomorrowEnd
        },
        status: { in: ['pending', 'confirmed'] }
      },
      include: { client: true }
    })

    console.log(`Found ${bookingsForReminder.length} bookings for tomorrow reminder`)

    // In production, loop and send emails
    return NextResponse.json({ 
      found: bookingsForReminder.length,
      bookings: bookingsForReminder.map(b => ({
        id: b.id,
        client: b.client.name,
        date: b.sessionDate,
        time: b.sessionTime
      }))
    })
  } catch (error) {
    console.error('Error checking reminders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
