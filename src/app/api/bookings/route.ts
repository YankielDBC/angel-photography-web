import { NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
})

const docClient = DynamoDBDocumentClient.from(client)
const TABLE_NAME = 'angel-bookings'

export async function GET() {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME
    }))
    
    return NextResponse.json(result.Items || [])
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Add createdAt if not present
    if (!body.createdAt) {
      body.createdAt = new Date().toISOString()
    }
    
    // Add default status if not present
    if (!body.status) {
      body.status = 'pending'
    }
    
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: body
    }))
    
    return NextResponse.json({ success: true, id: body.id })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Error al crear reserva' }, { status: 500 })
  }
}
