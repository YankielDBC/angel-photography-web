import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const client = new DynamoDBClient({ region: 'us-east-1' })
const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = 'angel-bookings'

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

async function sendEmail(booking: any) {
  const GMAIL_USER = process.env.GMAIL_USER || 'angelphotollc@gmail.com';
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
  
  if (!GMAIL_APP_PASSWORD) {
    console.log('Email not configured');
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const serviceNames: Record<string, string> = {
    pregnant: 'Sesión de Maternidad',
    newborn: 'Sesión Newborn',
    kids: 'Sesión de Niños',
    wedding: 'Sesión de Boda',
    eventos: 'Sesión de Eventos',
    exclusivo: 'Sesión Exclusiva'
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Confirmada</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1a1a1a;border-radius:20px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#c9a962 0%,#a88b4a 100%);padding:40px 40px 50px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">📸</div>
      <h2 style="margin:0;color:#fff;font-size:28px;font-weight:500;">¡Reserva Confirmada!</h2>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Tu sesión de fotos está programada</p>
    </div>
    
    <div style="padding:40px;">
      <p style="margin:0 0 20px;color:#fff;font-size:18px;">Hola <strong>${booking.clientName}</strong>,</p>
      <p style="margin:0 0 30px;color:#aaa;font-size:16px;">Tu reserva ha sido confirmada y pagada. Nos vemos en tu sesión de fotos.</p>
      
      <div style="background:#252525;border-radius:16px;padding:24px;margin-bottom:30px;">
        <h3 style="margin:0 0 20px;color:#c9a962;font-size:18px;border-bottom:1px solid #333;padding-bottom:12px;">Detalles de tu Reserva</h3>
        
        <table width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#888;font-size:14px;">📆 Fecha</td>
            <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">${formatDate(booking.sessionDate)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:14px;">🕐 Hora</td>
            <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">${formatTime(booking.sessionTime)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:14px;">📋 Tipo de Sesión</td>
            <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">${serviceNames[booking.serviceType] || booking.serviceType}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:14px;">🎁 Paquete</td>
            <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">${booking.serviceTier}</td>
          </tr>
          <tr style="border-top:1px solid #333;">
            <td style="padding:12px 0 8px;color:#888;font-size:14px;">💵 Total Pagado</td>
            <td style="padding:12px 0 8px;color:#c9a962;font-size:18px;font-weight:600;text-align:right;">$${booking.totalAmount}.00 USD</td>
          </tr>
        </table>
        
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #333;text-align:center;">
          <span style="color:#888;font-size:12px;">🆔 Código de Reserva: </span>
          <span style="color:#c9a962;font-size:14px;font-family:monospace;">${booking.id}</span>
        </div>
      </div>
      
      <p style="margin-top:30px;color:#666;font-size:14px;text-align:center;">
        Gracias por confiar en <strong style="color:#c9a962;">Angel Photography Miami</strong> 📸
      </p>
    </div>
    
    <div style="background:#0a0a0a;padding:24px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">© 2026 Angel Photography Miami. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

  await transporter.sendMail({
    from: `"Angel Photography Miami" <${GMAIL_USER}>`,
    to: booking.clientEmail,
    subject: `📸 Reserva Confirmada - ${formatDate(booking.sessionDate)}`,
    html,
  });
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const bookingId = session.metadata?.bookingId

    if (bookingId) {
      console.log('Payment completed for booking:', bookingId)
      
      // Update booking status in DynamoDB
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: bookingId },
        UpdateExpression: 'SET #status = :status, stripeSessionId = :stripeSessionId, paymentCompletedAt = :paymentCompletedAt',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'confirmed',
          ':stripeSessionId': session.id,
          ':paymentCompletedAt': new Date().toISOString()
        }
      }))

      // Get the full booking to send confirmation email
      const bookingResult = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: bookingId }
      }))
      
      const booking = bookingResult.Item

      if (booking) {
        // Send confirmation email to client
        await sendEmail(booking)
        console.log('Confirmation email sent for booking:', bookingId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
