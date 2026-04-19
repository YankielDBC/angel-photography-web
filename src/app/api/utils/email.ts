import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || 'angelphotollc@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_ADMIN = 'angelphotollc@gmail.com'; // Copia para el administrador

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

// Email de reagendado
export async function sendRescheduleConfirmation(booking: {
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
}, oldDate: string, oldTime: string) {
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
  <title>Reserva Reagendada</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1a1a1a;border-radius:20px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4a90d9 0%,#2d5a8a 100%);padding:40px 40px 50px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">🔄</div>
      <h2 style="margin:0;color:#fff;font-size:28px;font-weight:500;">¡Tu sesión ha sido reagendada!</h2>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Tu nueva fecha y hora están confirmadas</p>
    </div>
    
    <!-- Content -->
    <div style="padding:40px;">
      <p style="margin:0 0 20px;color:#fff;font-size:18px;">Hola <strong>${booking.clientName}</strong>,</p>
      <p style="margin:0 0 30px;color:#aaa;font-size:16px;">Tu sesión de fotos ha sido reagendada. Aquí están los nuevos detalles:</p>
      
      <!-- Cambio Card -->
      <div style="background:#252525;border-radius:16px;padding:24px;margin-bottom:30px;">
        <h3 style="margin:0 0 20px;color:#4a90d9;font-size:18px;border-bottom:1px solid #333;padding-bottom:12px;">📅 Cambio de Fecha</h3>
        
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="flex:1;text-align:center;padding:16px;background:#1a1a1a;border-radius:12px;">
            <p style="margin:0;color:#888;font-size:12px;">❌ Anterior</p>
            <p style="margin:8px 0 0;color:#ff6b6b;font-size:16px;">${formatDate(oldDate)}</p>
            <p style="margin:4px 0 0;color:#ff6b6b;font-size:14px;">${formatTime(oldTime)}</p>
          </div>
          <div style="padding:0 16px;color:#4a90d9;font-size:24px;">→</div>
          <div style="flex:1;text-align:center;padding:16px;background:#1a1a1a;border-radius:12px;">
            <p style="margin:0;color:#888;font-size:12px;">✅ Nueva</p>
            <p style="margin:8px 0 0;color:#4ade80;font-size:16px;">${formatDate(booking.sessionDate)}</p>
            <p style="margin:4px 0 0;color:#4ade80;font-size:14px;">${formatTime(booking.sessionTime)}</p>
          </div>
        </div>
        
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid #333;">
          <table width="100%" style="border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;">📋 Tipo de Sesión</td>
              <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">${serviceNames[booking.serviceType] || booking.serviceType}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;">🎁 Paquete</td>
              <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">${booking.serviceTier}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:14px;">💰 Restante a Pagar</td>
              <td style="padding:8px 0;color:#fff;font-size:16px;text-align:right;">$${booking.remainingPaid}.00 USD</td>
            </tr>
          </table>
        </div>
      </div>
      
      <!-- Contact -->
      <p style="margin:0 0 20px;color:#aaa;font-size:16px;text-align:center;">¿Necesitas hacer algún otro cambio? ¡Escríbenos!</p>
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
    bcc: EMAIL_ADMIN,
    subject: `🔄 Tu sesión ha sido reagendada - ${formatDate(booking.sessionDate)}`,
    html,
  };

  const transporter = getTransporter();
  if (!transporter) {
    console.log('Email not configured - GMAIL_APP_PASSWORD missing');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Reschedule email sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending reschedule email:', error);
    return { success: false, error };
  }
}

// Email de recordatorio
export async function sendReminderEmail(booking: {
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
}, hoursUntilSession: number) {
  const serviceNames: Record<string, string> = {
    pregnant: 'Sesión de Maternidad',
    newborn: 'Sesión Newborn',
    kids: 'Sesión de Niños',
    wedding: 'Sesión de Boda',
    eventos: 'Sesión de Eventos',
    exclusivo: 'Sesión Exclusiva'
  };

  const timeframe = hoursUntilSession <= 12 ? '12 horas' : '24 horas';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de tu Sesión</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1a1a1a;border-radius:20px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:40px 40px 50px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">⏰</div>
      <h2 style="margin:0;color:#fff;font-size:28px;font-weight:500;">¡Tu sesión es pronto!</h2>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Te esperamos en ${hoursUntilSession <= 12 ? '12 horas' : '24 horas'}</p>
    </div>
    
    <!-- Content -->
    <div style="padding:40px;">
      <p style="margin:0 0 20px;color:#fff;font-size:18px;">Hola <strong>${booking.clientName}</strong>,</p>
      <p style="margin:0 0 30px;color:#aaa;font-size:16px;">¡Tu sesión de fotos con Angel Photography Miami está muy cerca! No olvides estos detalles importantes:</p>
      
      <!-- Details Card -->
      <div style="background:#252525;border-radius:16px;padding:24px;margin-bottom:30px;">
        <h3 style="margin:0 0 20px;color:#f59e0b;font-size:18px;border-bottom:1px solid #333;padding-bottom:12px;">📸Detalles de tu Sesión</h3>
        
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
            <td style="padding:12px 0 8px;color:#888;font-size:14px;">💰 Restante a Pagar</td>
            <td style="padding:12px 0 8px;color:#f59e0b;font-size:18px;font-weight:600;text-align:right;">$${booking.remainingPaid}.00 USD</td>
          </tr>
        </table>
      </div>
      
      <!-- Tips -->
      <div style="background:#1a1a1a;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 12px 12px 0;margin-bottom:30px;">
        <h4 style="margin:0 0 10px;color:#f59e0b;font-size:14px;">📝 Recordatorios importantes</h4>
        <ul style="margin:0;padding-left:20px;color:#888;font-size:14px;line-height:1.8;">
          <li>Llega 10-15 minutos antes</li>
          <li>Trae diferentes outfits (2-3)</li>
          <li>Evita ropa con logos grandes</li>
          <li>Estás hidratado y descansado/a</li>
          <li>Si tienes niños, que vengan descansados</li>
        </ul>
      </div>
      
      <!-- Contact -->
      <p style="margin:0 0 20px;color:#aaa;font-size:16px;text-align:center;">¿Tienes alguna pregunta antes de tu sesión?</p>
      <div style="text-align:center;">
        <a href="https://wa.me/17863184596" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-size:14px;font-weight:500;">Chatear en WhatsApp</a>
      </div>
      
      <p style="margin-top:30px;color:#666;font-size:14px;text-align:center;">
        Nos vemos pronto en <strong style="color:#c9a962;">Angel Photography Miami</strong>
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
    bcc: EMAIL_ADMIN,
    subject: `⏰ Recordatorio: Tu sesión de fotos es en ${timeframe}`,
    html,
  };

  const transporter = getTransporter();
  if (!transporter) {
    console.log('Email not configured - GMAIL_APP_PASSWORD missing');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Reminder email sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending reminder email:', error);
    return { success: false, error };
  }
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
    bcc: EMAIL_ADMIN,
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

// Email para reservas manuales (pendiente de pago)
export async function sendManualBookingEmail(booking: {
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
  <title>Reserva Pendiente de Pago</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1a1a1a;border-radius:20px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#c9a962 0%,#a88b4a 100%);padding:40px;text-align:center;">
      <h2 style="margin:0;color:#fff;font-size:28px;">¡Reserva Creada!</h2>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);">Tu sesión de fotos está programada</p>
    </div>
    
    <div style="padding:40px;">
      <p style="color:#fff;font-size:18px;">Hola <strong>${booking.clientName}</strong>,</p>
      <p style="color:#aaa;font-size:16px;">Tu reserva ha sido creada. El pago completo ($ ${booking.totalAmount}) está <strong style="color:#c9a962;">PENDIENTE</strong>.</p>
      
      <div style="background:#252525;border-radius:16px;padding:24px;margin:20px 0;">
        <h3 style="color:#c9a962;font-size:18px;margin:0 0 16px;border-bottom:1px solid #333;padding-bottom:12px;">Detalles de tu Reserva</h3>
        
        <table width="100%">
          <tr><td style="padding:8px 0;color:#888;">Fecha</td><td style="padding:8px 0;color:#fff;text-align:right;">${formatDate(booking.sessionDate)}</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Hora</td><td style="padding:8px 0;color:#fff;text-align:right;">${formatTime(booking.sessionTime)}</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Tipo</td><td style="padding:8px 0;color:#fff;text-align:right;">${serviceNames[booking.serviceType] || booking.serviceType}</td></tr>
          <tr><td style="padding:8px 0;color:#888;">Paquete</td><td style="padding:8px 0;color:#fff;text-align:right;">${booking.serviceTier}</td></tr>
          <tr style="border-top:1px solid #333;"><td style="padding:12px 0;color:#888;">Total a Pagar</td><td style="padding:12px 0;color:#c9a962;font-weight:600;text-align:right;">$${booking.totalAmount}.00 USD</td></tr>
          <tr><td style="padding:8px 0;color:#ff6b6b;">Estado</td><td style="padding:8px 0;color:#ff6b6b;font-weight:600;text-align:right;">PENDIENTE</td></tr>
        </table>
        
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #333;text-align:center;">
          <span style="color:#888;font-size:12px;">Código: </span>
          <span style="color:#c9a962;font-size:14px;font-family:monospace;">${booking.id}</span>
        </div>
      </div>
      
      <p style="color:#666;font-size:14px;text-align:center;">
        Contacto: <a href="mailto:angelphotollc@gmail.com" style="color:#c9a962;">angelphotollc@gmail.com</a>
      </p>
    </div>
    
    <div style="background:#0a0a0a;padding:24px;text-align:center;">
      <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">© 2026 Angel Photography Miami</p>
    </div>
  </div>
</body>
</html>
`;

  const mailOptions = {
    from: `"Angel Photography Miami" <${GMAIL_USER}>`,
    to: booking.clientEmail,
    bcc: EMAIL_ADMIN,
    subject: `📸 Reserva Creada - Pendiente de Pago para ${formatDate(booking.sessionDate)}`,
    html,
  };

  const transporter = getTransporter();
  if (!transporter) {
    console.log('Email not configured');
    return { success: false, error: 'Email not configured' };
  }

  try {
    console.log('Sending manual booking email to:', booking.clientEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: String(error) };
  }
}

// Email de cancelación de reserva
export async function sendCancellationEmail(booking: {
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
  <title>Reserva Cancelada</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#1a1a1a;border-radius:20px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:40px 40px 50px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">😔</div>
      <h2 style="margin:0;color:#fff;font-size:28px;font-weight:500;">Tu sesión ha sido cancelada</h2>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Lamentamos que no puedas asistir</p>
    </div>
    
    <!-- Content -->
    <div style="padding:40px;">
      <p style="margin:0 0 20px;color:#fff;font-size:18px;">Hola <strong>${booking.clientName}</strong>,</p>
      <p style="margin:0 0 30px;color:#aaa;font-size:16px;">Tu reserva ha sido cancelada. El depósito de $100 no será reembolsado. Si tienes alguna pregunta o quieres reprogramar, por favor contáctanos.</p>
      
      <!-- Details Card -->
      <div style="background:#252525;border-radius:16px;padding:24px;margin-bottom:30px;">
        <h3 style="margin:0 0 20px;color:#ef4444;font-size:18px;border-bottom:1px solid #333;padding-bottom:12px;">📋 Detalles de la Reserva Cancelada</h3>
        
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
            <td style="padding:12px 0 8px;color:#888;font-size:14px;">💵 Depósito (no reembolsable)</td>
            <td style="padding:12px 0 8px;color:#ef4444;font-size:16px;font-weight:600;text-align:right;">$${booking.depositPaid || 100}.00 USD</td>
          </tr>
        </table>
      </div>
      
      <!-- Contact -->
      <p style="margin:0 0 20px;color:#aaa;font-size:16px;text-align:center;">¿Quieres reagendar tu sesión?</p>
      <div style="text-align:center;">
        <a href="https://wa.me/17863184596" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:14px 28px;border-radius:50px;font-size:14px;font-weight:500;">Chatear en WhatsApp</a>
      </div>
      
      <p style="margin-top:30px;color:#666;font-size:14px;text-align:center;">
        Gracias por tu comprensión. Esperamos verte pronto en <strong style="color:#c9a962;">Angel Photography Miami</strong>
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
    bcc: EMAIL_ADMIN,
    subject: `😔 Reserva Cancelada - ${formatDate(booking.sessionDate)}`,
    html,
  };

  const transporter = getTransporter();
  if (!transporter) {
    console.log('Email not configured - GMAIL_APP_PASSWORD missing');
    return { success: false, error: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Cancellation email sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    return { success: false, error };
  }
}
