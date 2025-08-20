const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('🔍 Checking database structure...');
    
    // List all tables in the database
    const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log('\n📊 Database tables:');
    console.log(tables.map(t => `- ${t.name}`).join('\n'));
    
    // Check if users table exists
    if (tables.some(t => t.name === 'users')) {
      const usersCount = await prisma.users.count();
      console.log(`\n✅ Users table exists with ${usersCount} records`);
    } else {
      console.log('\n❌ Users table does not exist');
    }
    
    // Check if id_cards table exists
    if (tables.some(t => t.name === 'id_cards')) {
      const idCardsCount = await prisma.idCards.count();
      console.log(`✅ ID Cards table exists with ${idCardsCount} records`);
    } else {
      console.log('❌ ID Cards table does not exist');
    }
    
    // Check if tokens table exists
    if (tables.some(t => t.name === 'tokens')) {
      const tokensCount = await prisma.tokens.count();
      console.log(`✅ Tokens table exists with ${tokensCount} records`);
    } else {
      console.log('❌ Tokens table does not exist');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking database:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
