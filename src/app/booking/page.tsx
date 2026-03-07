'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function BookingPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [calendarData, setCalendarData] = useState<Record<string, any>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [packages, setPackages] = useState<any>({});
  const [sessionTypes, setSessionTypes] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    packageType: '',
    packageTier: '',
    name: '',
    email: '',
    phone: '',
    clientAge: '',
    clientNotes: '',
    family2: false,
    family4: false,
    hairMakeup: false,
    outdoor: false,
    outdoorLocation: 'near'
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const timeSlots = ['9:30', '11:30', '14:00', '16:00', '18:00'];

  // Servicios adicionales
  const additionalServices = [
    { id: 'family2', name: '+2 Familiares', price: 50 },
    { id: 'family4', name: '+4 Familiares', price: 80 },
    { id: 'hairMakeup', name: 'Peluqueria y Maquillaje', price: 90 },
    { id: 'outdoor', name: 'Sesion Outdoor', priceNear: 100, priceFar: 200 }
  ];

  const showAgeField = formData.packageType === 'newborn' || formData.packageType === 'kids';
  const showAdditionalServices = formData.packageType === 'newborn' || formData.packageType === 'kids' || formData.packageType === 'pregnant';

  const getAdditionalServicesCost = () => {
    let cost = 0;
    if (formData.family2) cost += 50;
    if (formData.family4) cost += 80;
    if (formData.hairMakeup) cost += 90;
    if (formData.outdoor) {
      cost += formData.outdoorLocation === 'near' ? 100 : 200;
    }
    return cost;
  };

  useEffect(() => {
    // Simple background - Canvas 2D
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some stars
    ctx.fillStyle = 'rgba(201, 169, 98, 0.3)';
    for(let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 123.456) * 0.5 + 0.5) * canvas.width;
      const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * canvas.height;
      const size = (Math.sin(i * 345.678) * 0.5 + 0.5) * 2 + 1;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0a0a');
      grad.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadCalendarData();
    loadPackages();
  }, [currentMonth, currentYear]);

  async function loadCalendarData() {
    const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    try {
      const res = await fetch(`/api/calendar?month=${monthStr}`);
      const data = await res.json();
      setCalendarData(data.availability || {});
    } catch (e) {
      console.error('Failed to load calendar:', e);
      setCalendarData({});
    }
  }

  async function loadPackages() {
    try {
      const res = await fetch('/api/packages');
      const data = await res.json();
      setSessionTypes(data.sessionTypes);
      setPackages(data.packages);
    } catch (e) {
      console.error('Failed to load packages:', e);
    }
  }

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDateSelect = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(currentYear, currentMonth, day);
    if (dateObj < today) return; // Past dates disabled
    
    const dayData = calendarData[dateStr];
    if (dayData?.status === 'blocked') return;
    
    setSelectedDate(dateStr);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    const dayData = calendarData[selectedDate];
    const slot = dayData?.slots?.find((s: any) => s.time === time);
    if (slot?.status === 'booked' || slot?.status === 'blocked') return;
    setSelectedTime(time);
  };

  const getDayStatus = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(currentYear, currentMonth, day);
    if (dateObj < today) return 'past';
    const dayData = calendarData[dateStr];
    if (dayData?.status === 'blocked') return 'blocked';
    if (dayData?.status === 'full') return 'full';
    if (dayData?.status === 'has_bookings') return 'has_bookings';
    return 'available';
  };

  const getSelectedTierPrice = () => {
    if (!formData.packageType || !formData.packageTier) return 0;
    const tiers = packages[formData.packageType];
    if (!tiers) return 0;
    const tier = tiers.find((t: any) => t.id === formData.packageTier);
    return tier?.price || 0;
  };

  const getTotalPrice = () => {
    return getSelectedTierPrice() + getAdditionalServicesCost();
  };

  const handleSubmit = async () => {
    const price = getTotalPrice();
    const bookingData = {
      clientName: formData.name,
      clientEmail: formData.email,
      clientPhone: formData.phone,
      serviceType: formData.packageType,
      serviceTier: formData.packageTier,
      sessionDate: selectedDate,
      sessionTime: selectedTime,
      clientAge: formData.clientAge || null,
      clientNotes: formData.clientNotes || null,
      family2: formData.family2,
      family4: formData.family4,
      hairMakeup: formData.hairMakeup,
      outdoor: formData.outdoor,
      outdoorLocation: formData.outdoor ? formData.outdoorLocation : null,
      additionalServicesCost: getAdditionalServicesCost(),
      totalAmount: price,
      depositPaid: 100,
      remainingPaid: price - 100,
      status: 'pending',
      termsAccepted: termsAccepted ? {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        ipAddress: 'web'
      } : null
    };

    try {
      // 1. Create booking in database
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Error al crear reserva');
      }
      
      if (!result.id) {
        throw new Error('No se recibió ID de reserva');
      }

      // 2. Create Stripe checkout session
      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId: result.id, 
          amount: 100 // $100 deposit
        })
      });
      const checkoutData = await checkoutRes.json();

      if (!checkoutRes.ok) {
        // Si Stripe falla, aún así guardar la reserva como pending
        console.error('Stripe checkout failed:', checkoutData.error);
        alert('Reserva creada, pero el pago no está disponible ahora. Te contactaremos pronto.');
        router.push('/success?booking_id=' + result.id);
        return;
      }

      // 3. Redirect to Stripe checkout
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        // Fallback if no checkout URL
        window.location.href = '/success?booking_id=' + result.id;
      }
    } catch (e) {
      console.error('Booking failed:', e);
      alert('Error al procesar la reserva. Intenta de nuevo.');
    }
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: 0 }} />
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', color: '#c9a962', marginBottom: '8px' }}>Angel Photography Miami</h1>
          <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '4px' }}>Reserva tu Sesión</h2>
          <p style={{ color: '#888' }}>Elige fecha y hora para tu sesión de fotos</p>
        </header>

        {/* Progress Steps */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', gap: '8px' }}>
          {[1, 2, 3].map(step => (
            <div key={step} style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: currentStep >= step ? '#c9a962' : '#333',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>

        {/* Step 1: Date & Time */}
        {currentStep === 1 && (
          <div style={{ background: 'rgba(30,30,30,0.9)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>Selecciona la Fecha</h3>
            
            {/* Calendar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button onClick={() => { setCurrentMonth(m => m === 0 ? 11 : m - 1); if(currentMonth === 0) setCurrentYear(y => y - 1); }} style={{ background: 'none', border: '1px solid #444', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>←</button>
              <span style={{ color: '#fff', fontSize: '18px' }}>{months[currentMonth]} {currentYear}</span>
              <button onClick={() => { setCurrentMonth(m => m === 11 ? 0 : m + 1); if(currentMonth === 11) setCurrentYear(y => y + 1); }} style={{ background: 'none', border: '1px solid #444', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>→</button>
            </div>

            {/* Weekdays */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
              {weekdays.map(day => (
                <div key={day} style={{ textAlign: 'center', color: '#888', fontSize: '12px', padding: '8px 0' }}>{day}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array(getFirstDayOfMonth(currentMonth, currentYear)).fill(null).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array(getDaysInMonth(currentMonth, currentYear)).fill(null).map((_, i) => {
                const day = i + 1;
                const status = getDayStatus(day);
                const isSelected = selectedDate === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isDisabled = status === 'past' || status === 'blocked';
                
                let bg = 'transparent';
                let borderColor = '#333';
                if (isSelected) { bg = '#c9a962'; borderColor = '#c9a962'; }
                else if (status === 'past') bg = '#222';
                else if (status === 'blocked') bg = '#333';
                else if (status === 'full') bg = '#4a2020';
                else if (status === 'has_bookings') bg = '#4a4020';
                else bg = '#2a2a2a';
                
                return (
                  <button key={day} onClick={() => handleDateSelect(day)} disabled={isDisabled}
                    style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: bg, border: `1px solid ${borderColor}`, borderRadius: '8px', color: isDisabled ? '#555' : '#fff',
                      cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div style={{ marginTop: '24px' }}>
                <h4 style={{ color: '#fff', marginBottom: '12px' }}>Selecciona la Hora</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {timeSlots.map(time => {
                    const dayData = calendarData[selectedDate];
                    const slot = dayData?.slots?.find((s: any) => s.time === time);
                    const isBooked = slot?.status === 'booked' || slot?.status === 'blocked';
                    const isSelected = selectedTime === time;
                    
                    return (
                      <button key={time} onClick={() => handleTimeSelect(time)} disabled={isBooked}
                        style={{ padding: '14px 12px', minHeight: '48px', background: isSelected ? '#c9a962' : isBooked ? '#333' : '#2a2a2a',
                          border: `1px solid ${isSelected ? '#c9a962' : '#333'}`, borderRadius: '8px', color: isBooked ? '#555' : '#fff',
                          cursor: isBooked ? 'not-allowed' : 'pointer', fontSize: '14px', width: '100%' }}>
                        {formatTime(time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button onClick={() => setCurrentStep(2)} disabled={!selectedDate || !selectedTime}
              style={{ width: '100%', marginTop: '24px', padding: '16px', background: selectedDate && selectedTime ? '#c9a962' : '#333',
                border: 'none', borderRadius: '12px', color: selectedDate && selectedTime ? '#000' : '#666',
                fontSize: '14px', fontWeight: '600', cursor: selectedDate && selectedTime ? 'pointer' : 'not-allowed', minHeight: '48px' }}>
              Continuar
            </button>
          </div>
        )}

        {/* Step 2: Package & Info */}
        {currentStep === 2 && (
          <div style={{ background: 'rgba(30,30,30,0.9)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>Tu Paquete</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Tipo de Sesión</label>
              <select value={formData.packageType} onChange={(e) => setFormData({...formData, packageType: e.target.value, packageTier: ''})}
                style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '16px' }}>
                <option value="">Selecciona tipo de sesión...</option>
                {sessionTypes.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.nameEs}</option>
                ))}
              </select>
            </div>

            {formData.packageType && packages[formData.packageType] && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Selecciona el Paquete</label>
                <select value={formData.packageTier} onChange={(e) => setFormData({...formData, packageTier: e.target.value})}
                  style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '16px' }}>
                  <option value="">Selecciona un paquete...</option>
                  {packages[formData.packageType].map((tier: any) => (
                    <option key={tier.id} value={tier.id}>{tier.name} - ${tier.price}</option>
                  ))}
                </select>
              </div>
            )}

            <h3 style={{ color: '#fff', marginTop: '24px', marginBottom: '20px' }}>Tus Datos</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Nombre Completo</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Tu nombre" style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Correo Electrónico</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="tu@email.com" style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Teléfono</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(555) 123-4567" style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
            </div>

            {showAgeField && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Edad del nino/a</label>
                <input type="text" value={formData.clientAge} onChange={(e) => setFormData({...formData, clientAge: e.target.value})}
                  placeholder="Ej: 6 meses" style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '16px' }} />
              </div>
            )}

            {showAdditionalServices && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#c9a962', fontSize: '14px', display: 'block', marginBottom: '12px' }}>Servicios Adicionales</label>
                {additionalServices.map(service => (
                  <div key={service.id} style={{ marginBottom: '10px' }}>
                    {service.id === 'outdoor' ? (
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={formData.outdoor}
                            onChange={(e) => setFormData({...formData, outdoor: e.target.checked})}
                            style={{ accentColor: '#c9a962' }} />
                          <span style={{ color: '#fff', fontSize: '14px' }}>{service.name}</span>
                          <span style={{ color: '#c9a962', fontSize: '14px', marginLeft: 'auto' }}>+${formData.outdoorLocation === 'near' ? service.priceNear : service.priceFar}</span>
                        </label>
                        {formData.outdoor && (
                          <div style={{ marginTop: '8px', marginLeft: '24px', display: 'flex', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                              <input type="radio" name="outdoorLocation" checked={formData.outdoorLocation === 'near'}
                                onChange={() => setFormData({...formData, outdoorLocation: 'near'})}
                                style={{ accentColor: '#c9a962' }} />
                              <span style={{ color: '#aaa', fontSize: '13px' }}>Cerca (Miami Beach/Coral Gables) - $100</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                              <input type="radio" name="outdoorLocation" checked={formData.outdoorLocation === 'far'}
                                onChange={() => setFormData({...formData, outdoorLocation: 'far'})}
                                style={{ accentColor: '#c9a962' }} />
                              <span style={{ color: '#aaa', fontSize: '13px' }}>Lejos - $200</span>
                            </label>
                          </div>
                        )}
                      </div>
                    ) : (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={formData[service.id as keyof typeof formData] as boolean}
                          onChange={(e) => setFormData({...formData, [service.id]: e.target.checked})}
                          style={{ accentColor: '#c9a962' }} />
                        <span style={{ color: '#fff', fontSize: '14px' }}>{service.name}</span>
                        <span style={{ color: '#c9a962', fontSize: '14px', marginLeft: 'auto' }}>+${service.price}</span>
                      </label>
                    )}
                  </div>
                ))}
                {getAdditionalServicesCost() > 0 && (
                  <div style={{ paddingTop: '10px', borderTop: '1px solid #333', marginTop: '8px' }}>
                    <span style={{ color: '#888', fontSize: '13px' }}>Total servicios: </span>
                    <span style={{ color: '#c9a962', fontWeight: '600' }}>${getAdditionalServicesCost()}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#888', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Notas adicionales (opcional)</label>
              <textarea value={formData.clientNotes} onChange={(e) => setFormData({...formData, clientNotes: e.target.value})}
                placeholder="Solicitud especial..." rows={2}
                style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setCurrentStep(1)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #444', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontSize: '14px', minHeight: '48px' }}>← Volver</button>
              <button onClick={() => setCurrentStep(3)} disabled={!formData.packageType || !formData.packageTier || !formData.name || !formData.email || !formData.phone}
                style={{ flex: 2, padding: '14px', background: formData.packageType && formData.packageTier && formData.name && formData.email && formData.phone ? '#c9a962' : '#333',
                  border: 'none', borderRadius: '12px', color: formData.packageType && formData.packageTier && formData.name && formData.email && formData.phone ? '#000' : '#666', fontSize: '14px', cursor: 'pointer', minHeight: '48px' }}>
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {currentStep === 3 && (
          <div style={{ background: 'rgba(30,30,30,0.9)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>Resumen de Reserva</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#888' }}>Fecha</span>
                <span style={{ color: '#fff' }}>{selectedDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#888' }}>Hora</span>
                <span style={{ color: '#fff' }}>{selectedTime ? formatTime(selectedTime) : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#888' }}>Paquete</span>
                <span style={{ color: '#fff' }}>{formData.packageTier}</span>
              </div>
              
              {formData.clientAge && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#888' }}>Edad del nino/a</span>
                  <span style={{ color: '#fff' }}>{formData.clientAge}</span>
                </div>
              )}

              {/* Servicios adicionales */}
              {(formData.family2 || formData.family4 || formData.hairMakeup || formData.outdoor) && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                  <div style={{ color: '#c9a962', fontSize: '13px', marginBottom: '8px' }}>Servicios adicionales:</div>
                  {formData.family2 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#aaa', fontSize: '13px' }}>+2 Familiares</span>
                      <span style={{ color: '#fff', fontSize: '13px' }}>$50</span>
                    </div>
                  )}
                  {formData.family4 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#aaa', fontSize: '13px' }}>+4 Familiares</span>
                      <span style={{ color: '#fff', fontSize: '13px' }}>$80</span>
                    </div>
                  )}
                  {formData.hairMakeup && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#aaa', fontSize: '13px' }}>Peluqueria y Maquillaje</span>
                      <span style={{ color: '#fff', fontSize: '13px' }}>$90</span>
                    </div>
                  )}
                  {formData.outdoor && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: '#aaa', fontSize: '13px' }}>Outdoor ({formData.outdoorLocation === 'near' ? 'Cerca' : 'Lejos'})</span>
                      <span style={{ color: '#fff', fontSize: '13px' }}>${formData.outdoorLocation === 'near' ? '100' : '200'}</span>
                    </div>
                  )}
                </div>
              )}

              {formData.clientNotes && (
                <div style={{ marginTop: '12px', padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                  <div style={{ color: '#c9a962', fontSize: '13px', marginBottom: '4px' }}>Notas:</div>
                  <div style={{ color: '#aaa', fontSize: '13px' }}>{formData.clientNotes}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #444' }}>
                <span style={{ color: '#888' }}>Total Paquete</span>
                <span style={{ color: '#fff' }}>${getSelectedTierPrice()}</span>
              </div>
              {getAdditionalServicesCost() > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ color: '#888' }}>Servicios adicionales</span>
                  <span style={{ color: '#c9a962' }}>+${getAdditionalServicesCost()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ color: '#888' }}>Deposito (se descuenta)</span>
                <span style={{ color: '#c9a962' }}>-$100</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #c9a962', fontWeight: '600' }}>
                <span style={{ color: '#fff' }}>Restante a pagar</span>
                <span style={{ color: '#fff' }}>${getTotalPrice() - 100}</span>
              </div>
            </div>

            {/* Nota destacada de pago */}
            <div style={{ marginBottom: '20px', padding: '16px', background: 'linear-gradient(135deg, #c9a962 0%, #a88b4a 100%)', borderRadius: '12px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#0a0a0a', fontSize: '15px', fontWeight: '600' }}>Ahora solo pagaras $100</p>
              <p style={{ margin: '8px 0 0', color: '#0a0a0a', fontSize: '13px' }}>El resto se paga el dia de la sesion</p>
            </div>

            {/* Terms Checkbox */}
            <div style={{ marginBottom: '20px', padding: '16px', background: '#1a1a1a', borderRadius: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: '#c9a962' }} />
                <span style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.5' }}>
                  Acepto los <a href="/terminos.html" target="_blank" style={{ color: '#c9a962' }}>Términos y Condiciones</a> y la <a href="/privacidad.html" target="_blank" style={{ color: '#c9a962' }}>Política de Privacidad</a>. Confirmo que la información proporcionada es correcta.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setCurrentStep(2)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #444', borderRadius: '12px', color: '#fff', cursor: 'pointer', fontSize: '14px', minHeight: '48px' }}>← Volver</button>
              <button onClick={handleSubmit} disabled={!termsAccepted}
                style={{ flex: 2, padding: '14px', background: termsAccepted ? '#c9a962' : '#333', border: 'none', borderRadius: '12px', color: termsAccepted ? '#000' : '#666', fontSize: '14px', fontWeight: '600', cursor: termsAccepted ? 'pointer' : 'not-allowed', minHeight: '48px' }}>
                Confirmar y pagar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Float */}
      <a href="https://wa.me/17863184596" style={{ position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px', background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 30px rgba(37,211,102,0.5)', zIndex: 9999 }}>
        <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.075-.149-.025-.52-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    </div>
  );
}
