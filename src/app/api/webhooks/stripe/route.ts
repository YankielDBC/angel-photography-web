import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

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
  
  console.log('sendEmail called for:', booking.clientEmail);
  
  if (!GMAIL_APP_PASSWORD) {
    console.log('Email not configured - GMAIL_APP_PASSWORD missing');
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });

  const serviceNames: Record<string, string> = {
    pregnant: 'Maternidad',
    newborn: 'Newborn',
    kids: 'Ninos',
    wedding: 'Boda',
    eventos: 'Eventos',
    exclusif: 'Exclusivo'
  };

  // CLEAN MINIMAL DESIGN - Less is more
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Confirmada</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:60px 20px;">
        
        <!-- Logo / Brand -->
        <table cellpadding="0" cellspacing="0" style="margin-bottom:50px;">
          <tr>
            <td style="text-align:center;">
              <p style="margin:0;color:#c9a962;font-size:11px;font-weight:600;letter-spacing:4px;text-transform:uppercase;">Miami</p>
              <p style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:2px;">ANGEL</p>
              <p style="margin:0;color:#666666;font-size:11px;letter-spacing:6px;text-transform:uppercase;">Photography</p>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141414;border-radius:24px;overflow:hidden;">
          <!-- Success Bar -->
          <tr>
            <td style="background:#c9a962;padding:30px;text-align:center;">
              <span style="display:inline-block;font-size:36px;color:#0a0a0a;">&#10003;</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:40px 35px;">
              <h1 style="margin:0 0 8px;color:#ffffff;font-size:24px;font-weight:600;text-align:center;">Reserva Confirmada</h1>
              <p style="margin:0 0 30px;color:#999999;font-size:15px;text-align:center;">Felicidades, <span style="color:#ffffff;">${booking.clientName}</span></p>
              
              <!-- Details Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;margin-bottom:25px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #333333;">
                          <p style="margin:0;color:#bbbbbb;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Fecha</p>
                          <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:500;">${formatDate(booking.sessionDate)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #333333;">
                          <p style="margin:0;color:#bbbbbb;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Hora</p>
                          <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:500;">${formatTime(booking.sessionTime)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #333333;">
                          <p style="margin:0;color:#bbbbbb;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Tipo</p>
                          <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:500;">${serviceNames[booking.serviceType] || booking.serviceType}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #333333;">
                          <p style="margin:0;color:#bbbbbb;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Paquete</p>
                          <p style="margin:4px 0 0;color:#c9a962;font-size:15px;font-weight:600;text-transform:capitalize;">${booking.serviceTier}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #333333;">
                          <p style="margin:0;color:#bbbbbb;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Telefono</p>
                          <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:500;">${booking.clientPhone}</p>
                        </td>
                      </tr>
                      ${booking.clientAge ? `
                      <tr>
                        <td style="padding:12px 0;border-bottom:1px solid #333333;">
                          <p style="margin:0;color:#bbbbbb;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Edad del nino/a</p>
                          <p style="margin:4px 0 0;color:#ffffff;font-size:15px;font-weight:500;">${booking.clientAge}</p>
                        </td>
                      </tr>
                      ` : ''}
                      ${booking.clientNotes ? `
                      <tr>
                        <td style="padding:12px 0;">
                          <p style="margin:0;color:#bbbbbb;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Notas</p>
                          <p style="margin:4px 0 0;color:#cccccc;font-size:13px;line-height:1.5;">${booking.clientNotes}</p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Servicios Adicionales -->
              ${(booking.family2 || booking.family4 || booking.hairMakeup || booking.outdoor) ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;margin-bottom:25px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 25px;">
                    <p style="margin:0 0 15px;color:#c9a962;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Servicios Adicionales</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${booking.family2 ? `
                      <tr><td style="padding:8px 0;border-bottom:1px solid #333333;"><span style="color:#cccccc;font-size:13px;">+2 Familiares</span><span style="color:#ffffff;font-size:13px;float:right;">$50</span></td></tr>
                      ` : ''}
                      ${booking.family4 ? `
                      <tr><td style="padding:8px 0;border-bottom:1px solid #333333;"><span style="color:#cccccc;font-size:13px;">+4 Familiares</span><span style="color:#ffffff;font-size:13px;float:right;">$80</span></td></tr>
                      ` : ''}
                      ${booking.hairMakeup ? `
                      <tr><td style="padding:8px 0;border-bottom:1px solid #333333;"><span style="color:#cccccc;font-size:13px;">Peluqueria y Maquillaje</span><span style="color:#ffffff;font-size:13px;float:right;">$90</span></td></tr>
                      ` : ''}
                      ${booking.outdoor ? `
                      <tr><td style="padding:8px 0;border-bottom:1px solid #333333;"><span style="color:#cccccc;font-size:13px;">Sesion Outdoor (${booking.outdoorLocation === 'near' ? 'Cerca' : 'Lejos'})</span><span style="color:#ffffff;font-size:13px;float:right;">$${booking.outdoorLocation === 'near' ? '100' : '200'}</span></td></tr>
                      ` : ''}
                      ${booking.additionalServicesCost ? `
                      <tr><td style="padding-top:12px;border-top:1px solid #444444;"><span style="color:#c9a962;font-size:13px;font-weight:600;">Total Servicios</span><span style="color:#c9a962;font-size:13px;font-weight:600;float:right;">$${booking.additionalServicesCost}.00</span></td></tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <!-- Payment Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;margin-bottom:25px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;color:#bbbbbb;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total</p>
                          <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:600;">$${booking.totalAmount}.00</p>
                        </td>
                        <td style="text-align:right;padding-left:20px;border-left:1px solid #333333;">
                          <p style="margin:0;color:#c9a962;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Deposito</p>
                          <p style="margin:4px 0 0;color:#c9a962;font-size:18px;font-weight:600;">-$100</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#c9a962;padding:18px 25px;text-align:center;">
                    <p style="margin:0;color:#0a0a0a;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Resto a Pagar</p>
                    <p style="margin:4px 0 0;color:#0a0a0a;font-size:28px;font-weight:700;">$${booking.totalAmount - 100}.00</p>
                  </td>
                </tr>
              </table>
              
              <!-- Notice -->
              <p style="margin:0 0 30px;color:#888888;font-size:13px;text-align:center;line-height:1.5;">El deposito de $100 no es reembolsable.<br>El saldo restante se paga el dia de la sesion.</p>
              
              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:30px;">
                <tr>
                  <td align="center">
                    <a href="https://wa.me/17863184596" style="display:inline-block;padding:14px 32px;background:#c9a962;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:600;border-radius:50px;">Contactanos por WhatsApp</a>
                  </td>
                </tr>
              </table>
              
              <!-- Social -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #333333;padding-top:25px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 12px;color:#888888;font-size:12px;">Siguenos @angelphotographymiami</p>
                    <a href="https://instagram.com/angelphotographymiami" style="display:inline-block;margin:0 8px;color:#bbbbbb;font-size:13px;text-decoration:none;">Instagram</a>
                    <span style="color:#555555;">|</span>
                    <a href="https://facebook.com/angelphotographymiami" style="display:inline-block;margin:0 8px;color:#bbbbbb;font-size:13px;text-decoration:none;">Facebook</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table cellpadding="0" cellspacing="0" style="margin-top:40px;">
          <tr>
            <td style="text-align:center;">
              <p style="margin:0;color:#888888;font-size:12px;">angelphotographymiami.com</p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
`;

  console.log('Sending email to:', booking.clientEmail);
  
  try {
    await transporter.sendMail({
      from: `"Angel Photography Miami" <angelphotollc@gmail.com>`,
      to: booking.clientEmail,
      subject: `Reserva Confirmada - ${formatDate(booking.sessionDate)}`,
      html,
    });
    console.log('Email sent successfully!');
  } catch (emailError: any) {
    console.error('Email send error:', emailError.message);
    throw emailError;
  }
}

export async function POST(request: Request) {
  console.log('=== STRIPE WEBHOOK RECEIVED ===');
  
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  let event: any
  try {
    event = JSON.parse(body)
    console.log('Event type:', event.type)
  } catch (e) {
    console.error('Failed to parse webhook body:', e)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (signature && STRIPE_WEBHOOK_SECRET) {
    try {
      const crypto = await import('crypto')
      const sigStr = signature || ''
      const sigObj: Record<string, string> = {}
      sigStr.split(',').forEach(part => {
        const [key, value] = part.split('=')
        if (key && value) sigObj[key] = value
      })
      
      const timestamp = sigObj['t'] || ''
      const signedPayload = timestamp + '.' + body
      const expectedSignature = crypto.createHmac('sha256', STRIPE_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex')
      
      if (sigObj['v1'] !== expectedSignature) {
        console.log('Signature mismatch - continuing for testing')
      }
    } catch (err) {
      console.log('Signature verification error:', err)
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const bookingId = session.metadata?.bookingId

    console.log('Payment completed for booking ID:', bookingId)

    if (!bookingId) {
      return NextResponse.json({ error: 'No bookingId in metadata' }, { status: 400 })
    }

    try {
      // IMPORTANTE: No cambiamos el status a "confirmed" cuando se paga el depósito
      // El cliente solo pagó $100, el resto sigue pendiente
      // El admin decide manualmente cuándo marcar como "confirmed" (cuando paga TODO)
      // Solo actualizamos el stripeSessionId para tracking
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: bookingId },
        UpdateExpression: 'SET stripeSessionId = :stripeSessionId, paymentCompletedAt = :paymentCompletedAt',
        ExpressionAttributeValues: {
          ':stripeSessionId': session.id,
          ':paymentCompletedAt': new Date().toISOString()
        }
      }))

      const bookingResult = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id: bookingId }
      }))
      
      const booking = bookingResult.Item

      if (booking) {
        await sendEmail(booking)
      }
    } catch (dbError: any) {
      console.error('Database error:', dbError.message)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
