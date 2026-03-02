'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const PORTFOLIO_IMAGES = [
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80',
  'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=800&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
]

const SERVICES = [
  { title: 'Portrait', desc: 'Individual, family & couple sessions.', price: '$150', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80' },
  { title: 'Event', desc: 'Weddings, quinceañeras & corporate.', price: '$300', image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80' },
  { title: 'Editorial', desc: 'Fashion & advertising concepts.', price: '$250', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80' },
]

const VIDEO_BG = 'https://cdn.pixabay.com/video/2023/10/15/185564-878069281_large.mp4'

const STATS = [
  { number: 500, label: 'Sessions', suffix: '+', icon: IconCamera },
  { number: 5, label: 'Years', suffix: '+', icon: IconClock },
  { number: 98, label: 'Satisfied', suffix: '%', icon: IconHeart },
  { number: 24, label: 'Delivery', suffix: 'h', icon: IconStar },
]

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const servicesRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const [animatedStats, setAnimatedStats] = useState<number[]>([0, 0, 0, 0])
  const [transitionMode, setTransitionMode] = useState(false)

  // Fade transition to book
  const handleBookClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setTransitionMode(true)
    setTimeout(() => {
      window.location.href = '/booking'
    }, 2500)
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.fromTo('.hero-title .line', 
        { y: 80, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: 'power3.out', delay: 0.3 }
      )
      
      gsap.fromTo('.hero-subtitle',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.8 }
      )
      
      gsap.fromTo('.hero-cta',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 1 }
      )
      
      gsap.fromTo('.hero-scroll',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 1.2 }
      )

      gsap.to('.scroll-indicator', {
        y: 6,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      })

      // Carousel auto-scroll only (no scrollTrigger)
      if (carouselRef.current) {
        const carousel = carouselRef.current
        const totalWidth = carousel.scrollWidth - window.innerWidth
        
        gsap.to(carousel, {
          x: -totalWidth,
          duration: 25,
          repeat: -1,
          ease: 'none',
        })
      }

      // Services
      gsap.fromTo('.service-card',
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: servicesRef.current,
            start: 'top 75%',
          }
        }
      )

      // CTA
      gsap.fromTo(ctaRef.current,
        { scale: 1.05, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: ctaRef.current,
            start: 'top 80%',
          }
        }
      )

    }, containerRef)

    return () => ctx.revert()
  }, [])

  // Stats counter
  useEffect(() => {
    const handleScroll = () => {
      const statsSection = document.querySelector('.stats-section')
      if (!statsSection) return
      
      const rect = statsSection.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.8) {
        STATS.forEach((stat, i) => {
          gsap.to({}, {
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: function() {
              const progress = this.progress()
              setAnimatedStats(prev => {
                const newStats = [...prev]
                newStats[i] = Math.round(stat.number * progress)
                return newStats
              })
            }
          })
        })
        window.removeEventListener('scroll', handleScroll)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div ref={containerRef} className="bg-[#0a0a0a] text-white">
      {/* Fade Transition to Book */}
      {transitionMode && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] animate-pulse" />
      )}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 py-2.5 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 relative">
              <Image src="/logo.png" alt="Angel Photography Miami" fill className="object-contain" />
            </div>
            <span className="font-light text-[#c9a962] text-[11px]" style={{letterSpacing: '0.15em'}}>ANGEL PHOTOGRAPHY MIAMI</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-7">
            <Link href="#work" className="text-xs text-white/70 hover:text-white transition-colors">Work</Link>
            <Link href="#services" className="text-xs text-white/70 hover:text-white transition-colors">Services</Link>
            <Link href="#contact" className="text-xs text-white/70 hover:text-white transition-colors">Contact</Link>
            <Link href="/booking" onClick={handleBookClick} className="bg-[#c9a962] text-black px-5 py-1.5 rounded-full text-xs font-medium hover:bg-[#d4b872] transition-colors">
              Book Now
            </Link>
          </div>
          
          <Link href="/booking" onClick={handleBookClick} className="lg:hidden bg-[#c9a962] text-black px-4 py-1.5 rounded-full text-xs font-medium">
            Book
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover" poster="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1920&q=80">
            <source src={VIDEO_BG} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/70"></div>
          <div className="absolute inset-0 bg-[#c9a962]/3"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <div className="hero-title overflow-hidden mb-4">
            <div className="line">
              <p className="text-[#c9a962] text-[10px] tracking-[0.4em] uppercase mb-2">Professional Photography</p>
            </div>
          </div>
          
          <div className="hero-title overflow-hidden">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-light leading-tight mb-5">
              <span className="block">Capturing</span>
              <span className="block text-[#c9a962]">Moments</span>
              <span className="block">That Last</span>
            </h1>
          </div>
          
          <div className="hero-subtitle overflow-hidden">
            <p className="text-white/60 text-sm max-w-md mx-auto mb-7">
              Creating timeless images that tell your unique story.
            </p>
          </div>
          
          <div className="hero-cta flex flex-row gap-3 justify-center">
            <Link href="/booking" onClick={handleBookClick} className="bg-[#c9a962] text-black px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#d4b872] transition-all duration-300 hover:scale-105">
              Book a Session
            </Link>
            <Link href="#work" className="border border-white/30 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-white/10 transition-all duration-300">
              View Work
            </Link>
          </div>
        </div>

        <div className="hero-scroll absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => document.getElementById('work')?.scrollIntoView({behavior: 'smooth'})}>
          <span className="text-white/30 text-[9px] uppercase tracking-widest">Scroll</span>
          <div className="scroll-indicator w-5 h-8 rounded-full border border-white/15 flex justify-center pt-1.5">
            <div className="w-1 h-2 bg-[#c9a962] rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Portfolio - Horizontal Carousel */}
      <section id="work" className="py-12 bg-[#0a0a0a] overflow-hidden">
        <div className="mb-6 text-center">
          <p className="text-[#c9a962] text-[10px] tracking-[0.3em] uppercase mb-1.5">Portfolio</p>
          <h2 className="text-2xl md:text-3xl font-light">Recent Work</h2>
        </div>

        <div ref={carouselRef} className="flex gap-3 px-4" style={{ width: 'max-content' }}>
          {PORTFOLIO_IMAGES.map((src, i) => (
            <div key={i} className="flex-shrink-0 w-64 md:w-80 aspect-[3/4] relative rounded-lg overflow-hidden group">
              <Image src={src} alt={`Work ${i + 1}`} fill sizes="320px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-5">
          <Link href="/booking" onClick={handleBookClick} className="inline-flex items-center gap-2 text-[#c9a962] text-xs tracking-wider hover:gap-3 transition-all">
            Book Your Session <IconArrowRight />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-section py-8 bg-[#0f0f0f] border-y border-white/5">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex justify-center gap-5 md:gap-10">
            {STATS.map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <stat.icon />
                <span className="text-lg md:text-xl font-light text-[#c9a962]">{animatedStats[i]}{stat.suffix}</span>
                <span className="text-white/40 text-[9px] uppercase tracking-wider hidden sm:block">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" ref={servicesRef} className="py-14 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-7">
            <p className="text-[#c9a962] text-[10px] tracking-[0.3em] uppercase mb-1.5">Services</p>
            <h2 className="text-2xl md:text-3xl font-light">What I Do</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {SERVICES.map((service, i) => (
              <div key={i} className="service-card group relative overflow-hidden rounded-lg">
                <div className="aspect-[4/5] relative">
                  <Image src={service.image} alt={service.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                </div>
                
                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <p className="text-[#c9a962] text-xs font-medium mb-0.5">{service.price}</p>
                  <h3 className="text-lg font-light mb-1">{service.title}</h3>
                  <p className="text-white/50 text-xs mb-3">{service.desc}</p>
                  <Link href="/booking" onClick={handleBookClick} className="inline-flex items-center gap-1.5 text-[#c9a962] text-xs tracking-wider hover:gap-2.5 transition-all">
                    Book Now <IconArrowRight />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-18 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1920&q=80" alt="CTA" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/80"></div>
        </div>
        
        <div className="relative z-10 max-w-xl mx-auto text-center px-6 py-20">
          <p className="text-[#c9a962] text-[10px] tracking-[0.3em] uppercase mb-2.5">Ready?</p>
          <h2 className="text-3xl md:text-4xl font-light mb-4">
            Let's Create Something Beautiful
          </h2>
          <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto">
            One client per day to guarantee the best experience.
          </p>
          <Link href="/booking" onClick={handleBookClick} className="bg-[#c9a962] text-black px-9 py-3 rounded-full text-sm font-medium hover:bg-[#d4b872] transition-all duration-300 hover:scale-105 inline-block">
            Schedule a Call
          </Link>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-12 bg-[#0f0f0f]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-7">
            <div>
              <p className="text-[#c9a962] text-[10px] tracking-[0.3em] uppercase mb-2.5">Get in Touch</p>
              <h2 className="text-xl font-light mb-4">Let's Talk</h2>
              <p className="text-white/50 text-xs mb-5 leading-relaxed">
                I'm here to answer your questions and help you plan your perfect photo session.
              </p>
              
              <div className="space-y-3.5">
                <a href="https://wa.me/17863184596" target="_blank" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-[#c9a962]/10 flex items-center justify-center group-hover:bg-[#c9a962]/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#c9a962]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">WhatsApp</p>
                    <p className="text-white text-sm">+1 786 318 4596</p>
                  </div>
                </a>
                
                <a href="sms:+17863184596" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full bg-[#c9a962]/10 flex items-center justify-center group-hover:bg-[#c9a962]/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#c9a962]">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/60 text-xs">SMS</p>
                    <p className="text-white text-sm">+1 786 318 4596</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5">
              <h3 className="text-sm font-light mb-3">Hours</h3>
              <div className="space-y-1.5 text-white/50 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5"><span>Mon - Fri</span><span className="text-[#c9a962]">9AM - 7PM</span></div>
                <div className="flex justify-between py-1.5 border-b border-white/5"><span>Saturday</span><span className="text-[#c9a962]">10AM - 5PM</span></div>
                <div className="flex justify-between py-1.5"><span>Sunday</span><span className="text-white/30">Closed</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram */}
      <section className="py-9 bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-[#c9a962] text-[10px] tracking-[0.3em] uppercase mb-1.5">@angelphotographymiami</p>
          <a href="https://instagram.com/angelphotographymiami" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#c9a962] text-black px-5 py-1.5 rounded-full text-xs font-medium hover:bg-[#d4b872] transition-all">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Follow
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-3 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 relative">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-light text-[#c9a962] text-[10px]" style={{letterSpacing: '0.12em'}}>ANGEL PHOTOGRAPHY MIAMI</span>
          </div>
          
          <div className="flex gap-3 text-[9px] text-white/40">
            <Link href="/admin" className="hover:text-white">Admin</Link>
            <span>2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
