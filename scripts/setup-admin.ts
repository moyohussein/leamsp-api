import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Database connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
    },
  },
});

async function createAdminUser(name: string, email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.users.update({
        where: { email: email.toLowerCase() },
        data: {
          role: 'ADMIN',
          password: hashedPassword,
          emailVerified: new Date(),
        },
      });
      console.log(`✅ Updated existing user to admin: ${email}`);
      console.log(`   User ID: ${updatedUser.id}`);
      return updatedUser;
    } else {
      // Create new admin user
      const newUser = await prisma.users.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      console.log(`✅ Created new admin user: ${email}`);
      console.log(`   User ID: ${newUser.id}`);
      return newUser;
    }
  } catch (error) {
    console.error('❌ Error creating admin user:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log('Usage: npx tsx scripts/setup-admin.ts <name> <email> <password>');
  console.log('Example: npx tsx scripts/setup-admin.ts "Admin User" admin@example.com "SecurePassword123!"');
  console.log('\nCreating default admin with provided credentials...\n');
}

// Use provided args or defaults
const name = args[0] || 'Admin User';
const email = args[1] || 'aqmhussein@gmail.com';
const password = args[2] || 'omoakin123Q!';

console.log('═══════════════════════════════════════════════════════');
console.log('  Creating Admin User');
console.log('═══════════════════════════════════════════════════════');
console.log(`- Name: ${name}`);
console.log(`- Email: ${email}`);
console.log(`- Password: ${'*'.repeat(password.length)}`);
console.log('═══════════════════════════════════════════════════════\n');

createAdminUser(name, email, password)
  .then(() => {
    console.log('\n✅ Admin user created successfully!');
    console.log('\nYou can now login at:');
    console.log('https://leamsp-api.aqmhussein.workers.dev/api/auth/login');
  })
  .catch((error) => {
    console.error('\n❌ Failed to create admin user');
    console.error(error);
    process.exit(1);
  });
