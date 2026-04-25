import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
await prisma.user.create({
  data: {
    id: '6239133f-f8db-484e-9f23-eff786856029',
    email: 'vanguardwatersystems@gmail.com',
    name: 'Admin',
    role: 'OWNER',
    isActive: true,
  }
});
console.log('User created!');