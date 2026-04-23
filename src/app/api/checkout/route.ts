import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('Checkout POST called')
  
  const stripeKey = process.env.STRIPE_SECRET_KEY
  
  if (!stripeKey) {
    console.error('Checkout - STRIPE_SECRET_KEY is missing at runtime!')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  
  console.log('Checkout - STRIPE_SECRET_KEY loaded:', !!stripeKey)
  
  try {
    const body = await request.json()
    const { bookingId, amount = 100 } = body
    console.log('Checkout - bookingId:', bookingId, 'amount:', amount)

    // Calculate amount to cover Stripe fees (2.9% + $0.30)
    // To receive exactly 'amount', we need to charge: (amount + fixed_fee) / (1 - percentage)
    const STRIPE_PERCENTAGE = 0.029
    const STRIPE_FIXED_FEE = 0.30
    const amountWithFees = Math.ceil((amount + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE))
    console.log('Amount with Stripe fees:', amount, '->', amountWithFees)

    const siteUrl = 'https://angelphotographymiami.com'

    // Use direct fetch instead of Stripe SDK
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': 'Angel Photography Miami - Sesión de Fotos',
        'line_items[0][price_data][product_data][description]': 'Depósito de reserva $100 USD',
        'line_items[0][price_data][unit_amount]': String(amountWithFees),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${siteUrl}/booking`,
        'metadata[bookingId]': bookingId
      })
    })

    const session = await response.json()
    
    if (session.error) {
      console.error('Stripe error:', session.error)
      return NextResponse.json({ error: session.error.message }, { status: 400 })
    }

    console.log('Checkout session created:', session.id)
    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create checkout session' }, { status: 500 })
  }
}
