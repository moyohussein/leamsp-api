// Script to create admin user on production
// Run with: npx tsx scripts/create-production-admin.ts

const API_URL = 'https://leamsp-api.aqmhussein.workers.dev';

async function createAdminOnProduction() {
  const adminData = {
    name: 'Aqm Hussein',
    email: 'aqmhussein@gmail.com',
    password: 'omoakin123Q!',
    password_confirmation: 'omoakin123Q!',
  };

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Creating Admin User on Production');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`- Email: ${adminData.email}`);
  console.log(`- Password: ${'*'.repeat(adminData.password.length)}`);
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // First, try to register
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });

    const registerResult = await registerResponse.json();

    if (registerResponse.ok) {
      console.log('✅ Admin user created successfully on production!');
      console.log(`   Response: ${JSON.stringify(registerResult, null, 2)}`);
    } else if (registerResult.error?.includes('already registered')) {
      console.log('ℹ️  User already exists, updating to admin role...');
      
      // Login to get token
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password,
        }),
      });

      const loginResult = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(`Login failed: ${JSON.stringify(loginResult)}`);
      }

      console.log('✅ Login successful!');
      console.log(`   Token: ${loginResult.data.token.substring(0, 50)}...`);
      
      // Note: We can't update role via API without existing admin
      // This would need to be done manually via database
      console.log('\n⚠️  Note: To set role to ADMIN, run this SQL on Cloudflare D1:');
      console.log(`   UPDATE users SET role = 'ADMIN' WHERE email = '${adminData.email}';`);
      
      return;
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(registerResult)}`);
    }

    console.log('\n✅ Admin user created successfully!');
    console.log('\nLogin URL:');
    console.log('https://leamsp-api.aqmhussein.workers.dev/api/auth/login');

  } catch (error) {
    console.error('❌ Error:');
    console.error(error);
    process.exit(1);
  }
}

createAdminOnProduction();
