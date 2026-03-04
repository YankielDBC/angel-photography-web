import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = 'angel-bookings'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { id }
    }))
    
    if (!result.Item) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }
    
    return NextResponse.json(result.Item)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener reserva' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, paymentMethod, sessionCost, remainingPaid, notes } = body

    const validStatuses = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Estado invalido' }, { status: 400 })
    }

    const validPaymentMethods = ['stripe', 'paypal', 'cashapp', 'zelle', 'cash']
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json({ error: 'Metodo de pago invalido' }, { status: 400 })
    }

    // Build update expression
    const updateParts: string[] = []
    const expressionValues: Record<string, any> = {}
    const expressionNames: Record<string, string> = {}

    if (status) {
      updateParts.push('#status = :status')
      expressionValues[':status'] = status
      expressionNames['#status'] = 'status'
    }
    if (paymentMethod) {
      updateParts.push('paymentMethod = :paymentMethod')
      expressionValues[':paymentMethod'] = paymentMethod
    }
    if (sessionCost !== undefined) {
      updateParts.push('sessionCost = :sessionCost')
      expressionValues[':sessionCost'] = sessionCost
    }
    if (remainingPaid !== undefined) {
      updateParts.push('remainingPaid = :remainingPaid')
      expressionValues[':remainingPaid'] = remainingPaid
    }
    if (notes !== undefined) {
      updateParts.push('notes = :notes')
      expressionValues[':notes'] = notes
    }

    if (updateParts.length === 0) {
      return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 })
    }

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: 'SET ' + updateParts.join(', '),
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: Object.keys(expressionNames).length > 0 ? expressionNames : undefined,
      ReturnValues: 'ALL_NEW'
    }))

    return NextResponse.json(result.Attributes || {})
  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json({ error: 'Error al actualizar reserva' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id }
    }))

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar reserva' }, { status: 500 })
  }
}
