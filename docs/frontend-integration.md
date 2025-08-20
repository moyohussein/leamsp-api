# LEAMSP API - Frontend Integration Guide

## Table of Contents
- [Authentication](#authentication)
- [User Profile](#user-profile)
- [ID Cards](#id-cards)
- [Uploads](#uploads)
- [Error Handling](#error-handling)

## Base URL
All API endpoints are relative to the base URL:
- Production: `https://leamsp-api.attendance.workers.dev`
- Development: `http://localhost:8787`

## Authentication

### Login
Authenticate a user and receive an access token.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Success - 200 OK)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    }
  }
}
```

### Registration
Register a new user account.

**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!"
}
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Email Verification
After registration, users must verify their email address.

**Verification Flow**:
1. User registers and receives verification email
2. User clicks verification link in email
3. Frontend handles redirect to verification success page

### Password Reset

**Request Password Reset**:
```
POST /api/auth/forgot-password
{
  "email": "user@example.com"
}
```

**Reset Password**:
```
POST /api/auth/reset-password
{
  "token": "RESET_TOKEN",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

## User Profile

### Get Current User
Retrieve the authenticated user's profile.

**Endpoint**: `GET /api/profile`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "imageUrl": "https://example.com/profile.jpg"
  }
}
```

### Update Profile
Update the authenticated user's profile information.

**Endpoint**: `PUT /api/profile`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "John Updated"
}
```

### Change Password
Change the authenticated user's password.

**Endpoint**: `PUT /api/profile/password`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

## ID Cards

### Generate ID Card
Generate a new ID card for the authenticated user.

**Endpoint**: `POST /api/id-cards/generate`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "displayName": "John Doe",
  "attributes": {
    "department": "Engineering",
    "position": "Senior Developer"
  }
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "displayName": "John Doe",
    "memberId": "LEA-1-202301",
    "memberSince": "2023-01-15T00:00:00.000Z",
    "dateOfGeneration": "2023-06-01T12:00:00.000Z",
    "validUntil": "2024-06-01T12:00:00.000Z",
    "token": "VERIFICATION_TOKEN",
    "tokenExpiresAt": "2023-06-01T12:10:00.000Z"
  }
}
```

### List ID Cards
List all ID cards for the authenticated user.

**Endpoint**: `GET /api/id-cards`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 10, max: 100)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "displayName": "John Doe",
        "memberId": "LEA-1-202301",
        "validUntil": "2024-06-01T12:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### Get ID Card
Get details of a specific ID card.

**Endpoint**: `GET /api/id-cards/:id`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "displayName": "John Doe",
    "memberId": "LEA-1-202301",
    "memberSince": "2023-01-15T00:00:00.000Z",
    "dateOfGeneration": "2023-06-01T12:00:00.000Z",
    "validUntil": "2024-06-01T12:00:00.000Z",
    "attributes": {
      "department": "Engineering",
      "position": "Senior Developer"
    },
    "imageUrl": "https://example.com/id-cards/1/image"
  }
}
```

### Verify ID Card
Verify an ID card using its verification token.

**Endpoint**: `GET /api/id-cards/verify/:token`

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "cardId": "1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "memberSince": "2023-01-15T00:00:00.000Z",
    "dateOfGeneration": "2023-06-01T12:00:00.000Z",
    "validUntil": "2024-06-01T12:00:00.000Z",
    "memberId": "LEA-1-202301"
  }
}
```

**Response (410 Gone - Expired/Invalid Token)**:
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Token expired or invalid"
  }
}
```

## Uploads

The API supports file uploads for user avatars and other media. Uploads are handled through Cloudinary and require authentication.

### Upload File
Upload a file to the server.

**Endpoint**: `POST /api/upload`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data
```

**Form Data**:
- `file`: The file to upload (required)
- `folder`: (optional) The folder to store the file in (default: 'uploads')
- `public_id`: (optional) Custom public ID for the file

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/.../image/upload/v1234567890/filename.jpg",
    "public_id": "folder/filename",
    "format": "jpg",
    "width": 1200,
    "height": 800,
    "bytes": 123456
  }
}
```

### Delete Uploaded File
Delete an uploaded file by its public ID.

**Endpoint**: `DELETE /api/upload`

**Headers**:
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "publicId": "folder/filename"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### Example: Uploading a Profile Picture

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('folder', 'avatars');

try {
  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`
    },
    body: formData
  });
  
  const result = await response.json();
  if (result.success) {
    // Update user profile with the new image URL
    const updateResponse = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        imageUrl: result.data.url
      })
    });
    
    return await updateResponse.json();
  }
} catch (error) {
  console.error('Upload failed:', error);
  throw error;
}
```

## Best Practices

### Authentication
- **Token Management**: Store JWT tokens securely using HTTP-only cookies or secure storage
- **Token Refresh**: Implement token refresh logic to handle expired tokens
- **Logout**: Clear all authentication tokens and user data on logout
- **Session Timeout**: Implement session timeout based on token expiration

### Error Handling
- **User Feedback**: Show user-friendly error messages
- **Error Logging**: Log errors for debugging purposes
- **Retry Logic**: Implement retry logic for failed requests when appropriate
- **Offline Handling**: Handle network errors gracefully with offline support

### Performance
- **Request Caching**: Cache API responses when appropriate
- **Pagination**: Use pagination for large data sets
- **Request Batching**: Batch multiple requests when possible
- **Lazy Loading**: Load data only when needed

### Security
- **Input Validation**: Validate all user input on the client side
- **XSS Protection**: Sanitize user-generated content
- **CSRF Protection**: Include CSRF tokens in state-changing requests
- **Rate Limiting**: Respect rate limits and implement client-side throttling

### State Management
- **Global State**: Use a state management solution (Redux, Context API, etc.)
- **Optimistic Updates**: Update UI optimistically for better user experience
- **Data Normalization**: Normalize data to avoid duplication
- **Loading States**: Show appropriate loading states during API calls

## Example Implementation

### API Client Setup

```typescript
// src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

async function apiRequest<T = void>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.error?.code || 'UNKNOWN_ERROR',
          message: data.error?.message || 'An unknown error occurred',
          details: data.error?.details,
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server',
      },
    };
  }
}

export { apiRequest };
```

### Using the API Client

```typescript
// Example: Authentication Service
import { apiRequest } from './api/client';

export const authService = {
  async login(email: string, password: string) {
    const response = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      localStorage.setItem('token', response.data.token);
    }

    return response;
  },

  logout() {
    localStorage.removeItem('token');
    // Redirect to login
  },
};

// Example: Profile Service
export const profileService = {
  getProfile: () => apiRequest<User>('/api/profile'),
  
  updateProfile: (data: Partial<User>) => 
    apiRequest<User>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Example: Using in a React component
function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      const response = await profileService.getProfile();
      
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        setError(response.error?.message || 'Failed to load profile');
      }
      
      setLoading(false);
    }

    loadProfile();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!user) return <div>No user data</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      {/* Rest of the profile UI */}
    </div>
  );
}
```

## Error Handling

### Standard Error Response Format
All API errors follow this consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `TOKEN_EXPIRED` | 401 | Authentication token has expired |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

### Error Handling Example

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

async function apiRequest<T>(url: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
    ...options.headers
  };

  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = data as ApiError;
      if (error.error.code === 'UNAUTHORIZED') {
        // Handle unauthorized
        window.location.href = '/login';
      }
      throw new Error(error.error.message);
    }

    return data as T;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
```