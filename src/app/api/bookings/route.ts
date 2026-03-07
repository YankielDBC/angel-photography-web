import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { sendBookingConfirmation } from '../utils/email'

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = 'angel-bookings'

// GET - Listar todas las reservas
export async function GET() {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'attribute_not_exists(#status) OR #status <> :cancelled',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':cancelled': 'cancelled' }
    }))
    
    return NextResponse.json(result.Items || [])
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 })
  }
}

// PATCH - Actualizar reserva (usa query param id)
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }
    
    // Campos permitidos
    const allowedFields = [
      'clientName', 'clientEmail', 'clientPhone',
      'serviceType', 'serviceTier', 'sessionDate', 'sessionTime',
      'totalAmount', 'depositPaid', 'remainingPaid', 'paymentStatus',
      'status', 'sessionCost', 'stripeSessionId', 'notes',
      'clientAge', 'clientNotes', 'family2', 'family4', 'hairMakeup',
      'outdoor', 'outdoorLocation', 'additionalServicesCost',
      'expenses'
    ]
    
    // Reserved keywords that need escaping in DynamoDB
    const reserved = ['status', 'type', 'date', 'name']
    
    // Filtrar solo campos permitidos
    const updates: Record<string, any> = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates[key] = value
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }
    
    // Construir expresión de actualización
    const updateParts: string[] = []
    const values: Record<string, any> = { ':updatedAt': new Date().toISOString() }
    const attrNames: Record<string, string> = {}
    
    for (const key of Object.keys(updates)) {
      // Escapar reserved keywords
      const exprKey = reserved.includes(key) ? `#${key}` : key
      if (reserved.includes(key)) {
        attrNames[`#${key}`] = key
      }
      updateParts.push(`${exprKey} = :${key}`)
      values[`:${key}`] = updates[key]
    }
    
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: `SET updatedAt = :updatedAt, ${updateParts.join(', ')}`,
      ExpressionAttributeNames: Object.keys(attrNames).length > 0 ? attrNames : undefined,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    }))
    
    return NextResponse.json({ success: true, booking: result.Attributes })
  } catch (error) {
    console.error('Error updating booking:', JSON.stringify(error))
    return NextResponse.json({ error: 'Error al actualizar reserva', details: String(error) }, { status: 500 })
  }
}

// POST - Crear nueva reserva
export async function POST(request: Request) {
  console.log('POST /api/bookings called');
  try {
    const body = await request.json()
    console.log('Request body received:', JSON.stringify(body).substring(0, 200));
    
    // Validar campos requeridos
    const required = ['clientName', 'clientEmail', 'clientPhone', 'serviceType', 'serviceTier', 'sessionDate', 'sessionTime', 'totalAmount']
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Falta campo requerido: ${field}` }, { status: 400 })
      }
    }
    
    // Verificar si ya existe reserva para ese horario (evitar double booking)
    const existingCheck = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'sessionDate = :date AND sessionTime = :time AND #status <> :cancelled',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':date': body.sessionDate,
        ':time': body.sessionTime,
        ':cancelled': 'cancelled'
      }
    }))
    
    if (existingCheck.Items && existingCheck.Items.length > 0) {
      return NextResponse.json({ error: 'Ya existe una reserva para este horario' }, { status: 409 })
    }
    
    // Generar ID único
    const id = 'bk_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
    
    // Calcular pagos
    const totalAmount = parseFloat(body.totalAmount)
    const depositPaid = 100 // Siempre $100
    const remainingPaid = totalAmount - depositPaid
    
    const booking = {
      id,
      // Cliente
      clientName: body.clientName.trim(),
      clientEmail: body.clientEmail.trim().toLowerCase(),
      clientPhone: body.clientPhone.trim(),
      
      // Sesión
      serviceType: body.serviceType,
      serviceTier: body.serviceTier,
      sessionDate: body.sessionDate,
      sessionTime: body.sessionTime,
      
      // Pagos
      totalAmount,
      depositPaid,
      remainingPaid,
      paymentStatus: 'pending',
      
      // Estado
      status: 'pending',
      
      // Términos y condiciones
      termsAccepted: body.termsAccepted || null,
      
      // Costos de sesión
      sessionCost: 0,
      
      // Campos adicionales
      clientAge: body.clientAge || null,
      clientNotes: body.clientNotes || '',
      family2: body.family2 || false,
      family4: body.family4 || false,
      hairMakeup: body.hairMakeup || false,
      outdoor: body.outdoor || false,
      outdoorLocation: body.outdoorLocation || null,
      additionalServicesCost: body.additionalServicesCost || 0,
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stripeSessionId: null,
      notes: ''
    }
    
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: booking
    }))
    
    // No enviamos email aqui - se enviara despues del pago en el webhook de Stripe
    
    return NextResponse.json({ success: true, id, booking })
  } catch (error) {
    console.error('Error creating booking:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json({ error: 'Error al crear reserva', details: errorMessage }, { status: 500 })
  }
}
