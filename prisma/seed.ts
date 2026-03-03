import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create business hours (9am - 6pm, Monday-Saturday)
  const businessHoursData = [
    { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isActive: false }, // Sunday - closed
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isActive: true },  // Monday
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isActive: true },  // Tuesday
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },  // Wednesday
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isActive: true },  // Thursday
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isActive: true },  // Friday
    { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isActive: true },  // Saturday
  ]

  for (const hours of businessHoursData) {
    await prisma.businessHours.upsert({
      where: { dayOfWeek: hours.dayOfWeek },
      create: hours,
      update: hours
    })
  }

  console.log('Business hours created')

  // Create default admin (email: admin@angelphoto.com, password: admin123)
  const hashedPassword = 'admin123' // In production, use bcrypt
  await prisma.admin.upsert({
    where: { email: 'admin@angelphoto.com' },
    create: {
      email: 'admin@angelphoto.com',
      password: hashedPassword,
      name: 'Admin'
    },
    update: {
      password: hashedPassword
    }
  })

  console.log('Admin user created')
  console.log('Email: admin@angelphoto.com')
  console.log('Password: admin123')

  console.log('Seed completed!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
