import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
await prisma.user.create({
  data: {
    id: '22aed16c-2ff7-46e8-9855-b02d701398b9',
    email: 'vanguardwatersystems@gmail.com',
    name: 'Admin',
    role: 'OWNER',
    isActive: true,
  }
});
console.log('User created!');