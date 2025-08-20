import { hashSync } from 'bcrypt-ts';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Database connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function createAdminUser(name: string, email: string) {
  const defaultPassword = 'password@123';
  const hashedPassword = hashSync(defaultPassword, 8);
  
  try {
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.users.update({
        where: { email },
        data: {
          role: 'ADMIN',
          password: hashedPassword,
        },
      });
      console.log(`✅ Updated existing user to admin: ${email}`);
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
if (args.length < 2) {
  console.log('Usage: npx ts-node scripts/create-admin.ts <name> <email>');
  console.log('Example: npx ts-node scripts/create-admin.ts "Admin User" admin@example.com');
  process.exit(1);
}

const [name, email] = args;

console.log(`Creating admin user with:`);
console.log(`- Name: ${name}`);
console.log(`- Email: ${email}`);
console.log(`- Default password: password@123\n`);

createAdminUser(name, email);