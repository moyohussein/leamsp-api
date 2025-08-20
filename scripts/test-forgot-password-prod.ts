
import axios from 'axios';

const API_URL = 'https://leamsp-api.attendance.workers.dev/auth/forgot-password';
const TEST_EMAIL = 'testuser@example.com';

async function testForgotPasswordProduction() {
  console.log(`🚀 Testing forgot password endpoint on: ${API_URL}`);
  console.log(`🔑 Requesting password reset for email: ${TEST_EMAIL}`);

  try {
    const response = await axios.post(API_URL, {
      email: TEST_EMAIL,
    });

    if (response.status === 200) {
      console.log('✅ Success: Password reset email sent successfully!');
      console.log('Response:', response.data);
    } else {
      console.error('❌ Failure: Received a non-200 status code.');
      console.error('Status:', response.status);
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error: An exception occurred while testing the endpoint.');
    if (axios.isAxiosError(error) && error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error Details:', error);
    }
  } finally {
    console.log('🏁 Test finished.');
  }
}

testForgotPasswordProduction();
