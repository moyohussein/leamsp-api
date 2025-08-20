const axios = require('axios');
const API_BASE_URL = 'http://localhost:33337/api';

async function testIdCardFlow() {
  console.log('=== Testing ID Card Generation Flow ===\n');
  
  // 1. Register and login
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPass123!';
  
  try {
    // Register
    await axios.post(`${API_BASE_URL}/auth/register`, {
      name: 'Test User', email, password, password_confirmation: password
    });
    console.log('✅ User registered');
    
    // Login
    const { data: { data: { token } } } = await axios.post(`${API_BASE_URL}/auth/login`, {
      email, password
    });
    console.log('✅ Login successful');
    
    // 2. Create ID card
    const { data: { data: { id: cardId } } } = await axios.post(
      `${API_BASE_URL}/id-card`,
      { displayName: 'Test ID Card', attributes: { department: 'Engineering' } },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log(`✅ ID Card created (ID: ${cardId})`);
    
    // 3. Generate ID card details
    const { data: { data: cardData } } = await axios.post(
      `${API_BASE_URL}/id-card/generate`,
      { cardId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log('✅ ID Card details generated');
    console.log('   Member ID:', cardData.memberId);
    console.log('   Valid Until:', cardData.validUntil);
    
    // 4. Verify token
    if (cardData.verificationToken) {
      const { data: verifyData } = await axios.get(
        `${API_BASE_URL}/id-card/verify/${cardData.verificationToken}`
      );
      console.log('✅ Token verification successful');
      console.log('   Verified Member ID:', verifyData.data.memberId);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    return;
  }
}

testIdCardFlow();
