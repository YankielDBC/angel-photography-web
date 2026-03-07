import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import jsPDF from 'jspdf'

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = 'angel-bookings'

// Colores de marca - Professional Theme
console.log('Invoice PDF loading - Professional Theme')

// Helper para colores RGB - usando amber de la web
const primary = [217, 119, 6]    // amber-600
const secondary = [60, 60, 60]      // Dark gray
const accent = [251, 191, 36]     // amber-400
const light = [255, 251, 245]      // amber-50 bg
const text = [50, 50, 50]          // Near black
const muted = [128, 128, 128]       // Gray

// GET - Generar factura PDF por ID de reserva
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }
    
    // Obtener reserva
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id }
    }))
    
    const booking = result.Item
    
    if (!booking) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }
    
    // Generar PDF mejorado
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // ===== HEADER CON COLOR =====
    // Barra superior rose gold
    doc.setFillColor(primary[0], primary[1], primary[2])
    doc.rect(0, 0, pageWidth, 35, 'F')
    
    // Título
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURA', pageWidth / 2, 22, { align: 'center' })
    
    // Subtítulo
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Angel Photography Miami', pageWidth / 2, 30, { align: 'center' })
    
    // ===== INFORMACIÓN DE LA EMPRESA (izquierda) =====
    doc.setTextColor(text[0], text[1], text[2])
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Angel Photography Miami', 20, 50)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(muted[0], muted[1], muted[2])
    doc.text('Miami, Florida, USA', 20, 57)
    doc.text('hello@angelphotographymiami.com', 20, 63)
    doc.text('www.angelphotographymiami.com', 20, 69)
    
    // ===== INFORMACIÓN DE LA FACTURA (derecha) =====
    const invoiceX = 130
    doc.setTextColor(text[0], text[1], text[2])
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Factura #: ${booking.id}`, invoiceX, 50)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(muted[0], muted[1], muted[2])
    const invoiceDate = new Date().toLocaleDateString('es-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    })
    doc.text(`Fecha: ${invoiceDate}`, invoiceX, 57)
    
    // Fecha de sesión
    doc.text(`Sesión: ${booking.sessionDate || 'Por definir'}`, invoiceX, 64)
    
    // Estado con badge
    const statusConfig: Record<string, { label: string; color: number[] }> = {
      pending: { label: '[Pendiente]', color: [255, 193, 7] },
      confirmed: { label: '[Confirmada]', color: [40, 167, 69] },
      completed: { label: '[Completada]', color: [22, 160, 133] },
      cancelled: { label: '[Cancelada]', color: [220, 53, 69] }
    }
    const status = statusConfig[booking.status] || { label: booking.status, color: [108, 117, 125] }
    
    doc.setFillColor(status.color[0], status.color[1], status.color[2])
    doc.roundedRect(invoiceX, 70, 50, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(status.label, invoiceX + 25, 75, { align: 'center' })
    
    // ===== SECCIÓN CLIENTE =====
    const sectionY = 90
    
    // Fondo sutil
    doc.setFillColor(light[0], light[1], light[2])
    doc.roundedRect(15, sectionY - 5, pageWidth - 30, 35, 3, 3, 'F')
    
    doc.setTextColor(primary[0], primary[1], primary[2])
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE', 20, sectionY + 5)
    
    doc.setTextColor(text[0], text[1], text[2])
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(booking.clientName || 'Cliente', 20, sectionY + 14)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(muted[0], muted[1], muted[2])
    doc.text(booking.clientEmail || '', 20, sectionY + 21)
    doc.text(booking.clientPhone || '', 20, sectionY + 28)
    
    // ===== SERVICIO (derecha) =====
    doc.setTextColor(primary[0], primary[1], primary[2])
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('SERVICIO', 110, sectionY + 5)
    
    doc.setTextColor(text[0], text[1], text[2])
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(booking.serviceType || 'Sesión Fotográfica', 110, sectionY + 14)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(muted[0], muted[1], muted[2])
    doc.text(booking.serviceTier || '', 110, sectionY + 21)
    doc.text(`${booking.sessionDate || ''} ${booking.sessionTime || ''}`.trim(), 110, sectionY + 28)
    
    // ===== TABLA DE CONCEPTOS =====
    let tableY = 140
    
    // Encabezado de tabla
    doc.setFillColor(primary[0], primary[1], primary[2])
    doc.rect(15, tableY, pageWidth - 30, 10, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Concepto', 20, tableY + 7)
    doc.text('Monto', pageWidth - 25, tableY + 7, { align: 'right' })
    
    tableY += 15
    
    // Prices lookup
    const servicePrices: Record<string, number> = {
      'maternity': 250,
      'newborn': 250,
      'family': 250,
      'portrait': 200,
      'children': 200,
      'pregnant gold': 350,
      'pregnant silver': 250
    }
    const sessionPrice = booking.sessionCost || servicePrices[booking.serviceTier?.toLowerCase()] || 250
    
    // Conceptos
    const concepts: { desc: string; price: number }[] = []
    
    // Servicio principal
    concepts.push({ 
      desc: `Sesión de Fotos - ${booking.serviceType || 'Fotografía'}`, 
      price: sessionPrice 
    })
    
    // Servicios adicionales
    if (booking.family2 || booking.family4) {
      concepts.push({ 
        desc: 'Sesión Familiar (2/4 personas)', 
        price: booking.family4 ? 75 : 50 
      })
    }
    
    if (booking.hairMakeup) {
      concepts.push({ desc: 'Peinado y Maquillaje', price: 75 })
    }
    
    if (booking.outdoor) {
      concepts.push({ desc: 'Locación Exterior', price: 50 })
    }
    
    if (booking.additionalServicesCost > 0) {
      concepts.push({ desc: 'Servicios Adicionales', price: booking.additionalServicesCost })
    }
    
    // Dibujar conceptos
    doc.setTextColor(text[0], text[1], text[2])
    doc.setFont('helvetica', 'normal')
    
    concepts.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? [255, 255, 255] : [250, 250, 250]
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.rect(15, tableY - 4, pageWidth - 30, 12, 'F')
      
      doc.text(item.desc, 20, tableY + 3)
      doc.text(`$${item.price.toFixed(2)}`, pageWidth - 25, tableY + 3, { align: 'right' })
      tableY += 12
    })
    
    // ===== TOTALES =====
    tableY += 10
    
    const deposit = parseFloat(booking.depositPaid) || 100
    const total = parseFloat(booking.totalAmount) || sessionPrice
    const remaining = total - deposit
    
    // Línea
    doc.setDrawColor(primary[0], primary[1], primary[2])
    doc.setLineWidth(0.5)
    doc.line(15, tableY, pageWidth - 15, tableY)
    tableY += 10
    
    // Subtotal
    doc.setTextColor(muted[0], muted[1], muted[2])
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', 120, tableY)
    doc.text(`$${total.toFixed(2)}`, pageWidth - 25, tableY, { align: 'right' })
    tableY += 8
    
    // Deposito
    doc.text('Deposito pagado:', 120, tableY)
    doc.setTextColor(40, 167, 69)
    doc.text(`-$${deposit.toFixed(2)}`, pageWidth - 25, tableY, { align: 'right' })
    tableY += 10
    
    // Total / Pendiente
    doc.setDrawColor(200, 200, 200)
    doc.line(120, tableY - 3, pageWidth - 15, tableY - 3)
    
    if (remaining > 0) {
      doc.setTextColor(200, 100, 0)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('PENDIENTE:', 120, tableY + 5)
      doc.text(`$${remaining.toFixed(2)}`, pageWidth - 25, tableY + 5, { align: 'right' })
    } else {
      doc.setTextColor(40, 167, 69)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('PAGADO', 120, tableY + 5)
    }
    
    // ===== FOOTER =====
    const footerY = 270
    
    // Nota
    doc.setTextColor(muted[0], muted[1], muted[2])
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('Gracias por confiar en nosotros para capturar tus momentos especiales.', pageWidth / 2, footerY, { align: 'center' })
    
    // Footer decorativo
    doc.setFillColor(light[0], light[1], light[2])
    doc.rect(0, footerY + 10, pageWidth, 20, 'F')
    
    doc.setTextColor(primary[0], primary[1], primary[2])
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('ANGEL PHOTOGRAPHY MIAMI', pageWidth / 2, footerY + 22, { align: 'center' })
    
    // Convertir a base64
    const pdfBase64 = doc.output('datauristring')
    
    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `factura-${booking.id}.pdf`
    })
    
  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json({ error: 'Error al generar factura' }, { status: 500 })
  }
}
