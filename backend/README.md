# Real-Time Post Explorer Backend

Production-ready Node.js backend for a real-time post exploration application using JSONPlaceholder API, Express, MongoDB, and Socket.io.

## Features

- ✅ Fetch & store posts, users, comments from JSONPlaceholder API
- ✅ JWT authentication (register/login) with bcrypt password hashing
- ✅ User-generated post CRUD with ownership and external-data safeguards
- ✅ REST API with pagination, filtering, and searching
- ✅ Real-time WebSocket (Socket.io) search
- ✅ Database relations (posts with authors and comments)
- ✅ Comprehensive error handling
- ✅ Rate limiting (100 requests per 15 minutes per IP)
- ✅ Clean architecture with modular code
- ✅ MongoDB indexing for fast queries

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Authentication**: JWT + bcrypt
- **HTTP Client**: Axios
- **Middleware**: CORS, Morgan, Rate Limit
- **Environment**: dotenv

## Installation

```bash
npm install
```

## Configuration

Create `.env` file from `.env.example`:

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

## Running

```bash
npm start
```

Server will start on `http://localhost:8000` and WebSocket on `ws://localhost:8000`.

## API Endpoints

### Health & Stats

- **Health Check**

  ```
  GET /api/health
  ```

  Returns server status.

- **Statistics**
  ```
  GET /api/stats
  ```
  Returns total counts of posts, users, and comments.

### Data Management

- **Fetch & Store Data**
  ```
  GET /api/data/fetch
  ```
  Fetches posts, users, and comments from JSONPlaceholder API and stores in database.

### Authentication

- **Register User**

  ```
  POST /api/auth/register
  ```

  Body:

  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "StrongPass123!"
  }
  ```

- **Login User**

  ```
  POST /api/auth/login
  ```

  Returns JWT token.

### Posts

- **Get All Posts** (with pagination, filtering, search)

  ```
  GET /api/posts?page=1&limit=10&userId=1&keyword=react
  ```

  Query Parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `userId`: Filter by user ID
  - `keyword`: Search in title and body

- **Get Single Post with Author & Comments**

  ```
  GET /api/posts/:id
  ```

  Returns post with populated user (author) and comments.

- **Get Comments for a Post**

  ```
  GET /api/posts/:id/comments
  ```

  Returns all comments for a specific post.

- **Search Posts**

  ```
  GET /api/posts/search?q=react
  ```

  Search across posts, users, and comments.

- **Create Post** (Protected)

  ```
  POST /api/posts
  ```

- **Update Post** (Protected)

  ```
  PUT /api/posts/:id
  ```

- **Delete Post** (Protected)

  ```
  DELETE /api/posts/:id
  ```

- **Like / Unlike** (Protected)

  ```
  POST /api/posts/:id/like
  POST /api/posts/:id/unlike
  ```

### Users

- **Get All Users**

  ```
  GET /api/users
  ```

- **Get Single User**

  ```
  GET /api/users/:id
  ```

- **Get User's Posts**
  ```
  GET /api/users/:id/posts
  ```

### Comments

- **Get All Comments** (with pagination)

  ```
  GET /api/comments?page=1&limit=10&postId=5
  ```

- **Get Single Comment**
  ```
  GET /api/comments/:id
  ```

## WebSocket (Socket.io) Usage

Connect to WebSocket server and listen for real-time search results.

### Client Example (JavaScript)

```javascript
import io from "socket.io-client";

const socket = io("http://localhost:8000", {
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Connected to WebSocket");

  // Send search query
  socket.emit("search", { query: "react" });

  // Listen for results
  socket.on("results", (data) => {
    console.log("Search results:", data);
    // data: { success: true, query: 'react', results: [...], count: 5 }
  });

  // Listen for errors
  socket.on("results", (error) => {
    if (!error.success) {
      console.error("Search error:", error.message);
    }
  });
});
```

### Payload Format

**Request**:

```json
{
  "query": "javascript"
}
```

**Response**:

```json
{
  "success": true,
  "query": "javascript",
  "results": [
    {
      "_id": "...",
      "postId": 1,
      "userId": 1,
      "title": "...",
      "body": "...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 25
}
```

## Response Format

All API responses follow a consistent format:

**Success**:

```json
{
    "success": true,
    "data": [...],
    "message": "Optional message"
}
```

**Error**:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Database Schema

### Posts

```javascript
{
    postId: Number (unique, indexed),
    userId: Number (indexed),
    title: String (indexed for text search),
    body: String (indexed for text search),
    createdAt: Date,
    updatedAt: Date
}
```

Text index on: `title`, `body`

### Users

```javascript
{
    userId: Number (unique, indexed),
    name: String (indexed),
    username: String (unique),
    email: String (unique, lowercase),
    address: Object,
    phone: String,
    website: String,
    company: Object,
    createdAt: Date,
    updatedAt: Date
}
```

### Comments

```javascript
{
    commentId: Number (unique, indexed),
    postId: Number (indexed),
    name: String,
    email: String,
    body: String,
    createdAt: Date,
    updatedAt: Date
}
```

## Performance Features

### Caching

- Database caching: Data is fetched once and stored in MongoDB
- Subsequent requests serve from database, avoiding external API calls

### Pagination

- All list endpoints support `page` and `limit` parameters
- Maximum limit: 100 items per page

### Indexing

- `postId`, `userId`: Indexed for fast lookups
- `title`, `body`: Text-indexed for full-text search
- Database indices optimize filtering and search operations

### Rate Limiting

- 100 requests per 15 minutes per IP address
- Protects API from abuse

## Deployment

### Environment Variables for Deployment

```env
PORT=8000
MONGO_URI=your_production_mongodb_uri
NODE_ENV=production
```

### Render.com Deployment

1. Create a new Web Service
2. Connect GitHub repo
3. Set environment variables in Render dashboard
4. Deploy

### Railway.sh Deployment

1. Link GitHub repo
2. Add environment variables
3. Deploy automatically on push

### Deploying on Vercel (REST only)

For Serverless deployment (WebSocket not supported):

- Use `/api/posts/fetch` endpoint in scheduled function
- Export REST routes only

## Troubleshooting

### MongoDB Connection Error

Ensure `MONGO_URI` is correct and network access is allowed for your IP.

### WebSocket Connection Failed

Check if the backend is running and CORS is configured properly.

### No Data After Fetch

Run `/api/posts/fetch` endpoint to populate database with JSONPlaceholder data.

## Project Structure

```
backend/
├── app.js                 # Express application setup
├── server.js              # HTTP and Socket.io server
├── config/
│   └── db.js              # MongoDB connection
├── controllers/
│   ├── postController.js  # Post business logic
│   ├── userController.js  # User business logic
│   └── commentController.js # Comment business logic
├── models/
│   ├── Post.js
│   ├── User.js
│   └── Comment.js
├── routes/
│   ├── postRoutes.js
│   ├── userRoutes.js
│   └── commentRoutes.js
├── services/
│   ├── apiService.js      # JSONPlaceholder API client
│   └── postSourceService.js # Legacy support
├── sockets/
│   └── searchSocket.js    # Socket.io real-time search
├── middleware/
│   └── errorHandler.js    # Error handling middleware
├── utils/
│   └── cache.js           # Caching utility
├── .env.example
├── .env
├── package.json
└── README.md
```

## API Examples

### Fetch and seed data

```bash
curl http://localhost:8000/api/posts/fetch
```

### Get paginated posts

```bash
curl "http://localhost:8000/api/posts?page=1&limit=10"
```

### Get posts by user

```bash
curl "http://localhost:8000/api/posts?userId=1"
```

### Search posts

```bash
curl "http://localhost:8000/api/posts?keyword=react"
```

### Get single post with author and comments

```bash
curl http://localhost:8000/api/posts/1
```

### Global search

```bash
curl "http://localhost:8000/api/posts/search?q=test"
```

### Get stats

```bash
curl http://localhost:8000/api/stats
```

## License

MIT
