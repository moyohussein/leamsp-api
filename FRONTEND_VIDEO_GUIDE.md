# Video Upload and Management Guide for Frontend

This guide explains how to interact with the video endpoints from a frontend application.

## Table of Contents
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Endpoints](#endpoints)
  - [Upload a Video](#upload-a-video)
  - [List Videos](#list-videos)
  - [Get Video by ID](#get-video-by-id)
  - [Update Video](#update-video)
  - [Delete Video](#delete-video)
- [Error Handling](#error-handling)
- [Example Components](#example-components)
- [Best Practices](#best-practices)

## Authentication

All video endpoints require authentication. Include the JWT token in the `Authorization` header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## Base URL

- **Production**: `https://leamsp-api.attendance.workers.dev/api/videos`
- **Development**: `http://localhost:8787/api/videos`

## Endpoints

### Upload a Video

Upload a video file with optional thumbnail.

**Endpoint**: `POST /api/videos`

**Headers**:
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN
```

**Form Data**:
- `video` (required): The video file
- `thumbnail` (optional): Thumbnail image file
- `title` (required): Video title
- `description` (optional): Video description
- `isPublic` (optional, default: true): Boolean to set video visibility

**Example Request**:
```javascript
const formData = new FormData();
formData.append('title', 'My Awesome Video');
formData.append('description', 'This is a test video');
formData.append('isPublic', 'true');
formData.append('video', videoFile); // videoFile from file input
formData.append('thumbnail', thumbnailFile); // optional

const response = await fetch('https://leamsp-api.attendance.workers.dev/api/videos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData
});

const data = await response.json();
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "My Awesome Video",
    "description": "This is a test video",
    "url": "https://res.cloudinary.com/.../video.mp4",
    "thumbnail_url": "https://res.cloudinary.com/.../thumb.jpg",
    "is_public": true,
    "user_id": 1,
    "created_at": "2025-08-14T12:00:00Z",
    "updated_at": "2025-08-14T12:00:00Z"
  }
}
```

### List Videos

Get a paginated list of videos.

**Endpoint**: `GET /api/videos`

**Query Parameters**:
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `isPublic` (optional): Filter by public/private status

**Example Request**:
```javascript
const response = await fetch('https://leamsp-api.attendance.workers.dev/api/videos?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});

const data = await response.json();
```

### Get Video by ID

Get details of a specific video.

**Endpoint**: `GET /api/videos/:id`

**Example Request**:
```javascript
const response = await fetch('https://leamsp-api.attendance.workers.dev/api/videos/1', {
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});

const data = await response.json();
```

### Update Video

Update video details.

**Endpoint**: `PATCH /api/videos/:id`

**Example Request**:
```javascript
const response = await fetch('https://leamsp-api.attendance.workers.dev/api/videos/1', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: 'Updated Title',
    description: 'Updated description',
    isPublic: false
  })
});

const data = await response.json();
```

### Delete Video

Delete a video.

**Endpoint**: `DELETE /api/videos/:id`

**Example Request**:
```javascript
const response = await fetch('https://leamsp-api.attendance.workers.dev/api/videos/1', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
  }
});

const data = await response.json();
```

## Error Handling

Handle errors by checking the response status:

```javascript
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message || 'Something went wrong');
}
```

Common error responses:
- `401 Unauthorized`: Invalid or missing token
- `400 Bad Request`: Invalid input data
- `403 Forbidden`: Not authorized to perform the action
- `404 Not Found`: Video not found
- `500 Internal Server Error`: Server error

## Example Components

### React Video Upload Component

```jsx
import { useState } from 'react';

function VideoUpload({ token }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) {
      setError('Please provide a video file and title');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title);
    formData.append('isPublic', 'true');

    try {
      setLoading(true);
      const response = await fetch('https://leamsp-api.attendance.workers.dev/api/videos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('Upload successful:', data);
      // Handle success (e.g., show success message, redirect, etc.)
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <div>
        <label>Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Video File:</label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0])}
          required
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? 'Uploading...' : 'Upload Video'}
      </button>
    </form>
  );
}
```

## Best Practices

1. **File Validation**:
   - Validate file types and sizes before upload
   - Show appropriate error messages for invalid files

2. **Progress Tracking**:
   ```javascript
   const response = await fetch(url, {
     method: 'POST',
     headers: { 'Authorization': `Bearer ${token}` },
     body: formData
   });
   
   const reader = response.body.getReader();
   // Track progress here
   ```

3. **Chunked Uploads**:
   - For large files, implement chunked uploads
   - Resume interrupted uploads

4. **Error Handling**:
   - Handle network errors
   - Show user-friendly error messages
   - Implement retry logic for failed uploads

5. **Performance**:
   - Compress videos before upload when possible
   - Show upload progress to users
   - Implement client-side validation

6. **Security**:
   - Never expose API tokens in client-side code in production
   - Use environment variables for API URLs
   - Implement proper CORS on the server

7. **User Experience**:
   - Show upload progress
   - Provide clear feedback on success/failure
   - Allow users to cancel uploads
   - Show thumbnail previews before upload
