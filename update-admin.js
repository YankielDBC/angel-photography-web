const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.admin.upsert({
    where: { email: 'AngelPro' },
    create: { email: 'AngelPro', password: 'AngelPro' },
    update: { email: 'AngelPro', password: 'AngelPro' }
  })
  console.log('Admin actualizado')
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error)
