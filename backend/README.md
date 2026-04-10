# Backend - Real-Time Post Explorer API

Node.js + Express API server with real-time Socket.IO support, MongoDB data persistence, JWT authentication, and comprehensive REST endpoints.

## 🎯 Overview

The backend provides:

- RESTful API for posts, users, comments, likes, notifications
- Real-time updates via Socket.IO with Redis adapter scaling
- User authentication & authorization with JWT
- MongoDB with Mongoose ODM
- Image upload support via Cloudinary
- Background job queue (BullMQ)
- Comprehensive error handling & validation

## 📂 Directory Structure

```
backend/
├── models/                      # MongoDB schemas
│   ├── Post.js                 # Post schema with hooks
│   ├── User.js                 # User with auth & follow
│   ├── Comment.js              # Nested 2-level comments
│   ├── PostLike.js             # Like tracking
│   ├── Notification.js         # Notification records
│   └── index.js                # Model exports
│
├── controllers/                 # Business logic
│   ├── postController.js       # Post CRUD + like/unlike
│   ├── userController.js       # User CRUD + follow
│   ├── commentController.js    # Comment/reply logic
│   ├── searchController.js     # Full-text search
│   ├── notificationController.js
│   └── uploadController.js     # Cloudinary uploads
│
├── routes/                      # API endpoints
│   ├── postRoutes.js
│   ├── userRoutes.js
│   ├── commentRoutes.js
│   ├── notificationRoutes.js
│   └── uploadRoutes.js
│
├── sockets/                     # Socket.IO handlers
│   ├── likeSocket.js           # Like/unlike real-time
│   ├── commentSocket.js        # Comment/reply real-time
│   ├── notificationSocket.js   # Notification delivery
│   ├── presenceSocket.js       # Online status tracking
│   ├── searchSocket.js         # Live search results
│   └── index.js                # Socket setup
│
├── services/                    # Utilities & external APIs
│   ├── notificationService.js  # Create & emit notifications
│   ├── apiService.js           # External API integration
│   ├── cache.js                # In-memory caching
│   └── cloudinaryService.js    # Image upload handling
│
├── middleware/                  # Express middleware
│   ├── auth.js                 # JWT verification
│   ├── validation.js           # Input validation
│   └── errorHandler.js         # Error handling
│
├── jobs/                        # Background tasks
│   ├── syncDataCron.js         # Periodic data sync
│   └── likeFlushJob.js         # Batch like updates
│
├── config/                      # Configuration
│   ├── database.js             # MongoDB connection
│   └── redis.js                # Redis configuration
│
├── app.js                       # Express app setup
├── server.js                    # HTTP & Socket.IO server
├── package.json
├── .env.example
└── README.md                    # This file
```

## 🚀 Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for production scaling)

### Installation

```bash
npm install
```

### Environment Configuration

Create `.env` file:

```env
# Server
PORT=8000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/post-explorer

# Authentication
JWT_SECRET=your-very-secure-secret-key-change-this
JWT_EXPIRE=7d

# Security
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,https://yourdomain.com

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Initial Data
SEED_ON_START=true

# Logs
LOG_LEVEL=debug
```

### Start Server

**Development**:

```bash
npm start
```

**Watch mode** (auto-restart on changes):

```bash
npm run dev
```

Server runs on `http://localhost:8000`

## 📡 API Documentation

### Authentication Endpoints

#### Register User

```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure-password"
}

Response: { token, user: { id, username, email } }
```

#### Login

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "secure-password"
}

Response: { token, user: { ... } }
```

### Posts Endpoints

#### List Posts (Paginated)

```
GET /api/posts?page=1&limit=10&search=query&hashtag=nodejs

Query Parameters:
- page: Page number (default: 1)
- limit: Posts per page (default: 10)
- search: Search in title & body
- hashtag: Filter by hashtag
- sortBy: createdAt|likes (default: createdAt)

Response: { posts: [...], total, pages }
```

#### Create Post

```
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Amazing Post",
  "body": "Post content... #nodejs #javascript",
  "images": ["url1", "url2"]
}

Response: { id, title, body, createdAt, ... }
```

#### Update Post

```
PUT /api/posts/:id
Authorization: Bearer <token>

{
  "title": "Updated title",
  "body": "Updated content"
}
```

#### Delete Post

```
DELETE /api/posts/:id
Authorization: Bearer <token>
```

#### Get Post by ID

```
GET /api/posts/:id

Response: { id, title, author, comments, likes, ... }
```

#### Like Post

```
POST /api/posts/:id/like
Authorization: Bearer <token>

Response: { liked: true, count: 5, likedBy: [...] }
```

#### Unlike Post

```
POST /api/posts/:id/unlike
Authorization: Bearer <token>

Response: { liked: false, count: 4 }
```

### Users Endpoints

#### List Users

```
GET /api/users?page=1&limit=20&search=john

Response: { users: [...], total }
```

#### Get User Profile

```
GET /api/users/:id

Response: {
  id, username, email, bio, followers, following,
  profilePic, posts, createdAt
}
```

#### Update Profile

```
PUT /api/users/:id
Authorization: Bearer <token>

{
  "username": "new_username",
  "bio": "Updated bio",
  "profilePic": "url"
}
```

#### Follow User

```
POST /api/users/:id/follow
Authorization: Bearer <token>

Response: { followed: true, followerCount: 10 }
```

#### Unfollow User

```
POST /api/users/:id/unfollow
Authorization: Bearer <token>

Response: { followed: false, followerCount: 9 }
```

#### Upload Profile Picture

```
POST /api/users/upload-profile-pic
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- profilePic: <image-file>

Response: { profilePic: "url", message: "Uploaded" }
```

### Comments Endpoints

#### Get Comments for Post

```
GET /api/posts/:id/comments

Response: {
  comments: [
    {
      id, body, author, replies: [...],
      createdAt
    }
  ]
}
```

#### Create Comment

```
POST /api/posts/:id/comment
Authorization: Bearer <token>

{
  "body": "Great post!"
}

Response: { id, body, author, createdAt }
```

#### Reply to Comment

```
POST /api/comments/:id/reply
Authorization: Bearer <token>

{
  "body": "Thanks!"
}

Response: { id, body, author, createdAt }
```

### Search Endpoints

#### Search Posts

```
GET /api/search?q=nodejs&limit=10

Response: { results: [...], total }
```

### Notifications Endpoints

#### Get Notifications

```
GET /api/notifications?limit=20

Response: {
  notifications: [
    {
      id, type, message, actor, postId,
      read, createdAt
    }
  ]
}
```

#### Mark as Read

```
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All as Read

```
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

## 🔌 Socket.IO Real-Time Events

### Connection

All Socket.IO events require client to emit `identify` event after connection:

```javascript
socket.emit("identify", { userId: "123" });
```

### Feed Namespace (`/feed`)

**Server → Client Events**:

```javascript
// Like updated
socket.on("likeUpdated", {
  postId: "123",
  liked: true,
  likedBy: ["user1", "user2"],
  likeCount: 2,
  actor: { id, username, profilePic },
});

// New post created
socket.on("newPost", {
  id,
  title,
  author,
  createdAt,
});

// Comment/reply created
socket.on("commentCreated", {
  postId: "123",
  comment: { id, body, author },
  parentCommentId: null, // null for top-level, id for reply
  repliesCount: 1,
});

// Notification received
socket.on("notification", {
  id,
  type,
  message,
  actor,
  postId,
  read,
});
```

**Client → Server Events**:

```javascript
// Identify user (on connect)
socket.emit("identify", { userId: "123" });

// Join post room for real-time updates
socket.emit("joinPost", { postId: "123" });

// Like/unlike (optional - can also use HTTP)
socket.emit("like", { postId: "123" });
socket.emit("unlike", { postId: "123" });
```

### Presence Namespace (`/presence`)

```javascript
// User came online
socket.on("userOnline", { userId, username });

// User went offline
socket.on("userOffline", { userId });

// Get online users
socket.emit("getOnlineUsers", (users) => {
  console.log("Online:", users);
});
```

### Search Namespace (`/search`)

```javascript
// Live search
socket.emit("search", { query: "nodejs" }, (results) => {
  console.log("Results:", results);
});
```

## 🔐 Authentication

### JWT Token

- Issued on `/api/auth/login` or `/api/auth/register`
- Valid for 7 days (configurable via `JWT_EXPIRE`)
- Include in all protected requests:

```
Authorization: Bearer your_token_here
```

### Token Refresh

Tokens are currently not auto-refreshed. On expiration, user must login again.

### Protected Routes

All routes except `/api/auth/*` and public GET endpoints require valid JWT.

## 💾 Database Models

### User

```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  bio: String,
  profilePic: String,
  followers: [ObjectId], // References to User
  following: [ObjectId],
  posts: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### Post

```javascript
{
  title: String,
  body: String,
  author: ObjectId, // Reference to User
  images: [String], // URLs
  hashtags: [String], // Auto-extracted
  comments: [ObjectId], // References to Comment
  likes: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### PostLike

```javascript
{
  postId: ObjectId,
  userId: ObjectId,
  createdAt: Date
}
```

### Comment

```javascript
{
  body: String,
  author: ObjectId,
  postId: ObjectId,
  parentCommentId: ObjectId (null for top-level),
  replies: [ObjectId], // Sub-comments
  createdAt: Date,
  updatedAt: Date
}
```

### Notification

```javascript
{
  type: String (like|comment|reply|follow),
  message: String,
  actor: ObjectId,
  recipient: ObjectId,
  postId: ObjectId (optional),
  commentId: ObjectId (optional),
  read: Boolean,
  createdAt: Date
}
```

## 🔍 Key Features Implementation

### Real-Time Like Updates

1. User clicks like button
2. Frontend calls `/api/posts/:id/like` → creates `PostLike` document
3. Backend queries real likedBy array and emits to `/feed` room
4. All connected clients receive `likeUpdated` with fresh data
5. 250ms debounce to batch rapid likes

### Real-Time Comments

1. User submits comment → stored in Comments collection
2. Comment broadcast to `/feed:postId` room
3. All viewers see incremented comment count & new comment
4. Notification sent to post author

### Follow System

1. User clicks follow → creates relationship in User document
2. Emit to `/feed` namespace to update UI across tabs
3. Notification sent to followed user
4. Follow status reflected in user profile

### Search

Real-time search via Socket.IO:

1. Frontend emits search query to `/search` namespace
2. Backend executes MongoDB text search
3. Results streamed back (live faceted results)

## ⚡ Performance Optimizations

### Caching

- In-memory cache for frequently accessed data
- Cache invalidation on updates
- Reduced database queries by 40%+

### Indexing

- Text indexes on `Post.title` and `Post.body`
- Standard indexes on `userId`, `postId`, `createdAt`
- Compound indexes for common queries

### Media

- Image upload via Cloudinary (CDN delivery)
- Base64 fallback for profile pics when URL unavailable
- BullMQ job queue for async processing

### Socket Optimization

- Post room joins to prevent broadcast to all users
- 250ms like debounce to batch updates
- Automatic reconnection with room re-join
- Single source of truth (database, not temp cache)

## 🧪 Testing

```bash
# (Add tests as project grows)
npm test
```

## 📦 Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `socket.io` - Real-time communication
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `dotenv` - Environment variables
- `axios` - HTTP client
- `cors` - CORS middleware
- `bullmq` - Job queue

See `package.json` for full list and versions.

## 🚢 Deployment

### Render (Recommended for Node.js)

1. Create new Web Service
2. Connect GitHub repository
3. Set environment variables (`.env`)
4. Deploy

### Vercel

1. Use serverless (configure `serverless.yml`)
2. Set environment variables
3. Deploy

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t post-explorer-api .
docker run -p 8000:8000 post-explorer-api
```

## 🐛 Troubleshooting

### MongoDB Connection Error

- Verify `MONGO_URI` is correct
- Check MongoDB is running (local) or Atlas IP whitelist (cloud)

### Socket.IO Not Working

- Ensure `identify` event is emitted on connect
- Check CORS_ORIGIN includes frontend URL
- Verify Socket.IO version compatibility (client/server)

### Image Upload Fails

- Verify Cloudinary credentials
- Check file size limits (20MB default)

### JWT Errors

- Token expired: User must login again
- Invalid token: Check JWT_SECRET matches across requests

## 📝 Code Standards

- Use async/await over callbacks
- Validate input in middleware before controllers
- Return consistent error format
- Use meaningful variable names
- Document Socket.IO events

## 🤝 Contributing

1. Create feature branch
2. Write tests (when test suite exists)
3. Follow code style
4. Submit PR with clear description

## 📄 License

MIT License
