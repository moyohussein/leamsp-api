import { PrismaClient } from '@prisma/client';

async function checkDatabase() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    // Check if users table exists and has data
    const usersCount = await prisma.users.count();
    console.log(`✅ Users table exists with ${usersCount} records`);
    
    // Check if id_cards table exists and has data
    const idCardsCount = await prisma.idCards.count();
    console.log(`✅ ID Cards table exists with ${idCardsCount} records`);
    
    // Check if tokens table exists and has data
    const tokensCount = await prisma.tokens.count();
    console.log(`✅ Tokens table exists with ${tokensCount} records`);
    
    // List all tables in the database
    const result: any = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('\n📊 Database tables:');
    console.log(result.map((r: any) => `- ${r.name}`).join('\n'));
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
