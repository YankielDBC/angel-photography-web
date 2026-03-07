import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || 'angelphotollc@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

console.log('Email config - GMAIL_USER:', GMAIL_USER);
console.log('Email config - GMAIL_APP_PASSWORD set:', !!GMAIL_APP_PASSWORD);

// Only create transporter at runtime, not at module load
function getTransporter() {
  if (!GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

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

export async function sendBookingConfirmation(booking: {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceType: string;
  serviceTier: string;
  sessionDate: string;
  sessionTime: string;
  totalAmount: number;
  depositPaid: number;
  remainingPaid: number;
}) {
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
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#c9a962 0%,#a88b4a 100%);padding:40px 40px 50px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">📸</div>
      <h2 style="margin:0;color:#fff;font-size:28px;font-weight:500;">¡Depósito Recibido!</h2>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Tu sesión de fotos está programada</p>
    </div>
    
    <!-- Content -->
    <div style="padding:40px;">
      <p style="margin:0 0 20px;color:#fff;font-size:18px;">Hola <strong>${booking.clientName}</strong>,</p>
      <p style="margin:0 0 30px;color:#aaa;font-size:16px;">Tu reserva está confirmada. Nos vemos en tu sesión de fotos. El depósito de $100 ha sido recibido. El resto ($ ${booking.remainingPaid}) se paga el día de la sesión.</p>
      
      <!-- Details Card -->
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
            <td style="padding:12px 0 8px;color:#888;font-size:14px;">💵 Depósito Pagado</td>
            <td style="padding:12px 0 8px;color:#c9a962;font-size:18px;font-weight:600;text-align:right;">$${booking.depositPaid}.00 USD</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:14px;">💰 Restante a Pagar</td>
            <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">$${booking.remainingPaid}.00 USD</td>
          </tr>
        </table>
        
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #333;text-align:center;">
          <span style="color:#888;font-size:12px;">🆔 Código de Reserva: </span>
          <span style="color:#c9a962;font-size:14px;font-family:monospace;">${booking.id}</span>
        </div>
      </div>
      
      <!-- Tips -->
      <div style="background:#1a1a1a;border-left:4px solid #c9a962;padding:16px 20px;border-radius:0 12px 12px 0;margin-bottom:30px;">
        <h4 style="margin:0 0 10px;color:#c9a962;font-size:14px;">Recomendaciones para tu sesión</h4>
        <ul style="margin:0;padding-left:20px;color:#888;font-size:14px;line-height:1.8;">
          <li>Llega 10-15 minutos antes</li>
          <li>Trae diferentes outfits (2-3)</li>
          <li>Evita ropa con logos grandes</li>
          <li>Estás hidratado y descansado/a</li>
        </ul>
      </div>
      
      <!-- Contact -->
      <p style="margin:0 0 20px;color:#aaa;font-size:16px;text-align:center;">¿Tienes alguna pregunta? ¡Escríbenos!</p>
      <div style="text-align:center;">
        <a href="https://wa.me/17863184596" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-size:14px;font-weight:500;">Chatear en WhatsApp</a>
      </div>
      
      <p style="margin-top:30px;color:#666;font-size:14px;text-align:center;">
        Gracias por confiar en <strong style="color:#c9a962;">Angel Photography Miami</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background:#0a0a0a;padding:24px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">© 2026 Angel Photography Miami. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

  const mailOptions = {
    from: `"Angel Photography Miami" <${GMAIL_USER}>`,
    to: booking.clientEmail,
    subject: `📸 Depósito Recibido - Reserva para ${formatDate(booking.sessionDate)}`,
    html,
  };

  // Get transporter at runtime
  const transporter = getTransporter();

  // Check if transporter is configured
  if (!transporter) {
    console.log('Email not configured - GMAIL_APP_PASSWORD missing in environment');
    return { success: false, error: 'Email not configured' };
  }

  try {
    console.log('Sending email to:', booking.clientEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}
