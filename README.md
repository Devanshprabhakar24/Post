# Real-Time Post Explorer

A comprehensive full-stack application featuring a production-ready backend and responsive frontend for exploring posts, users, and comments from JSONPlaceholder API in real-time.

## 🚀 Features

### Backend

- ✅ RESTful API with pagination, filtering, and full-text search
- ✅ Real-time WebSocket (Socket.io) for instant search updates
- ✅ MongoDB with optimized indexing
- ✅ Data fetching & caching from JSONPlaceholder API
- ✅ Database relations (posts with authors and comments)
- ✅ Rate limiting (100 req/15m per IP)
- ✅ Comprehensive error handling
- ✅ Production-ready deployment configuration

### Frontend

- ✅ Modern React UI with responsive design
- ✅ Real-time search using WebSocket
- ✅ Pagination for large datasets
- ✅ Clean, accessible component architecture
- ✅ Performance optimized bundle

## 📋 Project Structure

```
.
├── backend/
│   ├── models/           # MongoDB schemas (Post, User, Comment)
│   ├── controllers/      # Business logic (post, user, comment)
│   ├── routes/           # API endpoints
│   ├── services/         # External API & helpers
│   ├── sockets/          # WebSocket handlers
│   ├── middleware/       # Error handling & validation
│   ├── utils/            # Caching & utilities
│   ├── config/           # Database configuration
│   ├── app.js            # Express setup
│   ├── server.js         # HTTP & WebSocket server
│   ├── package.json
│   └── README.md         # Backend documentation
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API client
│   │   ├── App.jsx       # Main component
│   │   ├── main.jsx      # Entry point
│   │   └── index.css     # Styling
│   ├── package.json
│   └── README.md         # Frontend documentation
│
└── README.md             # This file
```

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Database**: MongoDB + Mongoose
- **Real-time**: Socket.io
- **HTTP Client**: Axios
- **Middleware**: CORS, Morgan, Rate Limit
- **Environment**: dotenv

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Styling**: Plain CSS
- **State**: React Hooks

## 📦 Installation

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm start
```

**Default**: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with backend URLs
npm run dev
```

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
