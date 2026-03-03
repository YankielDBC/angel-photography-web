import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Hardcoded for Vercel - UPDATE HERE TOO
    const adminEmail = 'AngelPro@angel.com'
    const adminPassword = 'AngelPro'

    // Debug log
    console.log('FULL DEBUG - body:', JSON.stringify(body), '| expected:', adminEmail, adminPassword)

    // Simple env-based auth for MVP
    if (email === adminEmail && password === adminPassword) {
      return NextResponse.json({ 
        success: true, 
        token: 'admin-session-token',
        email: adminEmail 
      })
    }

    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
  }
}
