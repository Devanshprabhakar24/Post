# 📱 Real-Time Post Explorer

A modern, full-stack social media application with real-time updates, user authentication, follow system, and live notifications. Built with React 19, Vite, Node.js/Express, and MongoDB.

**Live Demo**: [Deployed on Vercel + Render](https://post-peach-three.vercel.app)

## ✨ Features

### Core Features

- 📝 **Posts** - Create, read, update, delete posts with images
- 👤 **User Authentication** - Register, login with JWT & bcrypt
- 💬 **Comments & Replies** - Nested 2-level comment threads with real-time updates
- ❤️ **Likes** - Real-time like/unlike with instant count updates across all users
- 🔍 **Search** - Full-text search posts by title, body, author with WebSocket live results
- 🏷️ **Hashtags** - Auto-extract hashtags from posts, filter by hashtag
- 👥 **Follow System** - Follow/unfollow users, view followers/following lists
- 🔔 **Notifications** - Real-time notifications for likes, comments, and follows
- 🌙 **Dark/Light Mode** - Theme support with CSS variables

### Real-Time & Socket.IO

- ✅ Live like updates from all users
- ✅ Real-time comment/reply creation & count increments
- ✅ Instant follow/unfollow status across sessions
- ✅ Live notification delivery via Socket.IO namespaces
- ✅ User presence tracking (online status)
- ✅ Automatic reconnection with room re-join on disconnect

### Technical Features

- 🚀 RESTful API with pagination & filtering
- 📊 MongoDB with optimized indexing & caching
- 🔐 JWT authentication with secure token handling
- 📱 Fully responsive mobile-first design
- ⚡ Production-ready error handling & validation
- 🎨 Tailwind CSS with theme system
- 📦 Optimized Vite build with code splitting
- 🗂️ Background data seeding (non-blocking startup)
- 📤 Image uploads via Cloudinary + BullMQ queue

## 🏗️ Project Structure

```
.
├── backend/
│   ├── models/              # MongoDB schemas
│   │   ├── Post.js          # Post with likes, images, hashtags
│   │   ├── User.js          # User with follow/auth
│   │   ├── Comment.js       # Comment with nested replies
│   │   ├── PostLike.js      # Like tracking
│   │   └── Notification.js  # Notification records
│   ├── controllers/         # Business logic
│   │   ├── postController.js
│   │   ├── userController.js
│   │   ├── commentController.js
│   │   └── notificationController.js
│   ├── routes/              # API endpoints
│   ├── sockets/             # Socket.IO handlers
│   │   ├── likeSocket.js
│   │   ├── commentSocket.js
│   │   ├── notificationSocket.js
│   │   ├── presenceSocket.js
│   │   └── searchSocket.js
│   ├── services/            # External APIs & utilities
│   ├── middleware/          # Auth, validation, error handling
│   ├── jobs/                # Background tasks (sync cron, like flush)
│   ├── app.js               # Express app setup
│   ├── server.js            # HTTP & Socket.IO server
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── PostCard.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── LeftSidebar.jsx
│   │   │   ├── RightPanel.jsx
│   │   │   └── NotificationPanel.jsx
│   │   ├── pages/           # Route pages
│   │   │   ├── Home.jsx
│   │   │   ├── PostDetails.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── context/         # React context
│   │   │   ├── AuthContext.jsx
│   │   │   └── SocketContext.jsx
│   │   ├── services/        # API & Socket clients
│   │   ├── hooks/           # Custom React hooks
│   │   ├── App.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
│
└── README.md                # This file
```

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js v5
- **Database**: MongoDB + Mongoose
- **Real-time**: Socket.IO with Redis adapter
- **Authentication**: JWT + bcrypt
- **File Storage**: Cloudinary
- **Task Queue**: BullMQ (Redis)
- **Caching**: In-memory cache utility
- **API Client**: Axios

### Frontend

- **Framework**: React 19
- **Build**: Vite 6
- **HTTP**: Axios with JWT interceptor
- **Real-time**: Socket.IO client
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **UI Components**: Lucide icons
- **Routing**: React Router v7
- **State**: React Hooks + Context API

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for Socket.IO scaling)

### Backend Setup

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
PORT=8000
MONGO_URI=mongodb://localhost:27017/post-explorer
JWT_SECRET=your-secret-key-here
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
SEED_ON_START=true
EOF

# Start server
npm start
```

Server runs on `http://localhost:8000` and WebSocket on `ws://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:8000
VITE_WS_URL=http://localhost:8000
EOF

# Start dev server
npm run dev
```

App runs on `http://localhost:5173`

## � Test Login & Registration

### Register New Account

**Test OTP for Login/Registration**: `otp-123456`

```javascript
// Frontend logout
localStorage.removeItem("token");
// Token automatically removed from all future requests
```

## �📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Posts

- `GET /api/posts` - Get posts (paginated)
- `POST /api/posts` - Create post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts/:id/like` - Like post
- `POST /api/posts/:id/unlike` - Unlike post
- `GET /api/posts/:id/likes` - Get like status

### Users

- `GET /api/users` - Get users list
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/follow` - Follow user
- `POST /api/users/:id/unfollow` - Unfollow user
- `GET /api/users/:id/posts` - Get posts by user
- `POST /api/users/upload-profile-pic` - Upload avatar

### Comments

- `GET /api/posts/:id/comments` - Get comments for post
- `POST /api/posts/:id/comment` - Create comment
- `POST /api/comments/:id/reply` - Reply to comment

### Search & Notifications

- `GET /api/search?q=query` - Search posts
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark notification read
- `PUT /api/notifications/read-all` - Mark all as read

## 🔌 Socket.IO Events

### Feed Namespace (`/feed`)

- `likeUpdated` - Real-time like count & status
- `newPost` - New post created
- `commentCreated` - New comment/reply
- `notification` - Notification received
- `identify` - Identify user (emit on connect)
- `joinPost` - Join post room for live updates

### Presence Namespace (`/presence`)

- `userOnline` - User came online
- `userOffline` - User went offline
- `identify` - Identify user

### Search Namespace (`/search`)

- `search` - Start search query
- `results` - Search results (live)

## 🔐 Authentication

### Registration Flow

```
User Registration Process:
1. Navigate to /register
2. Enter username, email, password
3. Frontend validates:
   ✓ Username: 3+ characters, unique
   ✓ Email: valid format, unique
   ✓ Password: 6+ characters
4. POST /api/auth/register
5. Backend processes:
   ├─ Hash password with bcrypt
   ├─ Create user in MongoDB
   ├─ Generate JWT token
   └─ Return token + user data
6. Frontend stores token in localStorage
7. Redirect to /home (authenticated)
```

### Login Flow

```
User Login Process:
1. Navigate to /login
2. Enter email and password
3. POST /api/auth/login
4. Backend validates:
   ├─ Find user by email
   ├─ Compare password with bcrypt
   ├─ If valid, generate JWT
   └─ Return token + user data
5. Frontend receives token
6. Store in localStorage
7. Axios interceptor adds to all requests
8. Redirect to /home (authenticated)
```

### JWT Token Lifecycle

```
Token Structure:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Token Contents:
├─ Header: Algorithm (HS256)
├─ Payload: { userId, iat, exp }
├─ Signature: Verified with JWT_SECRET
└─ Expires: 7 days from creation

Token Validation:
1. Every protected request includes token
2. Backend verifies signature
3. Checks expiration date
4. Extracts userId for authorization
5. Invalid/expired → 401 Unauthorized
```

### Authentication Requests

**All API calls automatically include token:**

```
Authorization: Bearer <token>
```

**Token is:**

- Stored in `localStorage` → persists across tabs/refresh
- Attached by Axios interceptor to all requests
- Removed on logout
- Never exposed in cookies (CSRF protection)

**Protected Routes:**

- All `/api/*` endpoints except `/api/auth/register` and `/api/auth/login`
- Frontend guards routes (redirects to /login if no token)
- Backend validates token on every request

### Frontend Implementation

**Login/Register Pages** (`src/pages/Login.jsx`, `src/pages/Register.jsx`):

```javascript
// User types credentials
const handleRegister = async (username, email, password) => {
  const response = await axios.post("/api/auth/register", {
    username,
    email,
    password,
  });

  // Store token
  localStorage.setItem("token", response.data.token);

  // Redirect to home
  navigate("/home");
};
```

**Axios Interceptor** (`src/services/api.js`):

```javascript
// Every request automatically includes token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
```

**Auth Context** (`src/context/AuthContext.jsx`):

```javascript
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if token exists on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Verify token is still valid
      api
        .get("/api/users/profile")
        .then((res) => setCurrentUser(res.data))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setCurrentUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Protected Route** (`src/components/ProtectedRoute.jsx`):

```javascript
function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <Skeleton />;

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
}

// Usage
<Routes>
  <Route path="/login" element={<Login />} />
  <Route
    path="/home"
    element={
      <ProtectedRoute>
        <Home />
      </ProtectedRoute>
    }
  />
</Routes>;
```

## 🎨 Project Highlights

### Real-time Sync

- **Likes**: When any user likes a post, all connected users see instant like count & heart fill state
- **Comments**: New comments immediately increment counter and appear in threads
- **Follows**: Follow state updates across tabs/browsers in real-time
- **Notifications**: Toast + panel updates for post interactions

### Optimizations

- Debounced like flush (250ms) to batch updates
- Lazy socket creation to prevent race conditions
- Post room auto-join on feed load
- Reconnection with automatic room re-join
- Automatic socket re-identification after login/logout
- Optimistic UI updates with rollback on error
- Profile image fallbacks (base64 from DB when URL missing)

### UI/UX

- Dark/light mode with CSS variables
- Responsive grid layout (mobile-first)
- Skeleton loaders for slow networks
- Toast notifications for actions
- Modal preview for post images
- Infinite scroll pagination
- High contrast readable text

## 🚢 Deployment

### Backend (Render)

```bash
# Set environment variables in Render dashboard
PORT=8000
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-secret>
CORS_ORIGIN=<your-frontend-url>
```

### Frontend (Vercel)

```bash
# Set environment variables in Vercel dashboard
VITE_API_URL=<your-backend-url>
VITE_WS_URL=<your-backend-url>
```

## 📝 Environment Variables

### Backend

- `PORT` - Server port (default: 8000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `NODE_ENV` - development/production
- `CORS_ORIGIN` - Allowed origins (comma-separated)
- `SEED_ON_START` - Auto-seed data on startup (default: true)

### Frontend

- `VITE_API_URL` - Backend API base URL
- `VITE_WS_URL` - WebSocket URL (usually same as API_URL)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/feature-name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/feature-name`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙋 Support

For issues, questions, or suggestions, please open an issue on GitHub.

**Default**: `http://localhost:3000`

## 🌐 API Documentation

See [backend/README.md](backend/README.md) for comprehensive API documentation.

### Key Endpoints

#### Posts

- `GET /api/posts` - All posts (with pagination, filtering)
- `GET /api/posts/:id` - Single post with author & comments
- `GET /api/posts/:id/comments` - Comments for post
- `GET /api/posts/search?q=query` - Global search

#### Users

- `GET /api/users` - All users
- `GET /api/users/:id` - Single user
- `GET /api/users/:id/posts` - User's posts

#### Comments

- `GET /api/comments` - All comments (paginated)
- `GET /api/comments/:id` - Single comment

#### Utilities

- `GET /api/health` - Server health
- `GET /api/stats` - Database statistics
- `GET /api/posts/fetch` - Seed data from external API

## 📡 WebSocket (Socket.io)

Real-time search via WebSocket:

```javascript
const socket = io("http://localhost:8000");

socket.emit("search", { query: "javascript" });

socket.on("results", (data) => {
  console.log(`Found ${data.count} results:`, data.results);
});
```

## 🗄️ Database Schema

### Posts

- `postId` (Number, unique, indexed)
- `userId` (Number, indexed)
- `title` (String, text-indexed)
- `body` (String, text-indexed)
- `createdAt`, `updatedAt`

### Users

- `userId` (Number, unique, indexed)
- `name` (String, indexed)
- `username` (String, unique)
- `email` (String, unique)
- `address`, `phone`, `website`, `company`
- `createdAt`, `updatedAt`

### Comments

- `commentId` (Number, unique, indexed)
- `postId` (Number, indexed)
- `name`, `email`, `body`
- `createdAt`, `updatedAt`

## ⚙️ Environment Variables

### Backend (.env)

```env
PORT=8000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Frontend (.env)

```env
# Development (recommended): keep empty and use Vite proxy
VITE_API_URL=
VITE_WS_URL=

# Production (required in Vercel environment variables)
# VITE_API_URL=https://your-backend.onrender.com
# VITE_WS_URL=wss://your-backend.onrender.com
```

## 🚀 Deployment

### Backend

Deploy to **Render.com**:

1. Create a new Web Service
2. Set Root Directory to `backend`
3. Set environment variables
4. Deploy main branch automatically

### Frontend

Deploy to **Vercel**:

1. Connect GitHub repository
2. Set Root Directory to `frontend`
3. Set environment variables:

- `VITE_API_URL`: `https://<your-render-backend>.onrender.com`
- `VITE_WS_URL`: `wss://<your-render-backend>.onrender.com`

4. Deploy automatically on push

### Live URLs

- **Frontend**: Vercel
- **Backend**: Render

## 📊 Performance Features

- **Caching**: Database caching prevents external API re-fetching
- **Pagination**: Limit results per page (max 100)
- **Indexing**: Database text indices on searchable fields
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **WebSocket**: Real-time updates without polling

## 🧪 Testing

Run backend health check:

```bash
curl http://localhost:8000/api/health
```

Get database statistics:

```bash
curl http://localhost:8000/api/stats
```

Fetch and seed data:

```bash
curl http://localhost:8000/api/posts/fetch
```

## 📚 Documentation

- [Backend API Reference](backend/README.md)
- [Frontend Setup](frontend/README.md) (if available)

## 🛠️ Troubleshooting

### MongoDB Connection Error

- Verify `MONGO_URI` in `.env`
- Ensure IP is whitelisted in MongoDB Atlas

### Port Already in Use

- Change `PORT` in `.env` (backend)
- Change port in `vite.config.js` (frontend)

### WebSocket Connection Failed

- Check backend is running on correct port
- Verify CORS configuration in `app.js`
- Check firewall/network settings

### No Data After Startup

- Run `/api/posts/fetch` endpoint manually
- Check MongoDB connectivity
- Review server logs

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please ensure code follows project patterns and includes appropriate error handling.

---

**Built with ❤️ using Node.js, Express, MongoDB, React, and Socket.io**
