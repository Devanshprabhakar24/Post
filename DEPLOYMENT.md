# Deployment Guide

This guide covers deploying both the backend and frontend to production.

## Prerequisites

- GitHub account
- Render.com account (for backend)
- Vercel account (for frontend)
- MongoDB Atlas account
- A MongoDB cluster created

## Deployment Strategy

```
┌─────────────────┐
│  Frontend       │  Vercel
│  (React)        │
└────────┬────────┘
         │ REST API
         │ WebSocket
         │
┌────────▼────────┐
│   Backend       │  Render
│   (Express)     │
│   (Socket.io)   │
└────────┬────────┘
         │
┌────────▼────────┐
│    MongoDB      │  MongoDB Atlas
│    Database     │
└─────────────────┘
```

## Step 1: Prepare MongoDB Atlas

1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a cluster
3. Create a database user with secure password
4. Allow network access from anywhere (or specific IPs)
5. Copy connection string as `MONGO_URI`

Example: `mongodb+srv://user:pass@cluster.mongodb.net/database`

## Step 2: Deploy Backend to Render

### Option A: Using render.yaml (Recommended)

1. Push your GitHub repository
2. Go to [render.com](https://render.com)
3. Create an account and connect GitHub
4. Create new Web Service
5. Select your repository
6. Choose the root directory or `backend` directory
7. Set environment variables:
   - `PORT`: `8000`
   - `MONGO_URI`: [Your MongoDB connection string]
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: [A long random secret]
   - `CLOUDINARY_CLOUD_NAME`: [Your cloud name]
   - `CLOUDINARY_API_KEY`: [Your API key]
   - `CLOUDINARY_API_SECRET`: [Your API secret]
   - `PUBLIC_MEDIA_URL`: `https://<your-render-service>.onrender.com`
8. Deploy

### Option B: Manual Render Setup

1. In Render dashboard, create new **Web Service**
2. Connect to GitHub repository
3. Configure:
   - **Name**: `posts-explorer-backend`
   - **Runtime**: Node
   - **Build command**: `npm install`
   - **Start command**: `npm start`
   - **Plan**: Free or Paid (Free has 750 hours/month)
4. Set environment variables in Settings tab
5. Deploy

### Verification

After deployment, test the health endpoint:

```bash
curl https://posts-explorer-backend.onrender.com/api/health
```

Expected response:

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Step 3: Deploy Frontend to Vercel

### Setup

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Import your repository

### Configuration

1. Select Import
2. Choose project name: `posts-explorer-frontend`
3. Under Framework Preset, select **Vite**
4. Root Directory: `frontend/`
5. Build command: `npm run build`
6. Output directory: `dist`
7. Environment variables:
   - `VITE_API_URL`: `https://posts-explorer-backend.onrender.com`
   - `VITE_WS_URL`: `wss://posts-explorer-backend.onrender.com` (use secure WebSocket)
8. Deploy

### Deployment Considerations

- **WebSocket**: Vercel frontend can connect to Socket.io running on Render backend via `wss://<render-service>.onrender.com`
- Ensure Render backend has CORS enabled and is reachable over HTTPS/WSS

## Step 4: Configure CORS

The backend requires CORS enabled. Verify in `app.js`:

```javascript
app.use(cors());
```

This allows requests from any origin (secure for public APIs).

## Step 5: Verify Deployment

### Health Check

```bash
# Backend
curl https://posts-explorer-backend.onrender.com/api/health

# Stats
curl https://posts-explorer-backend.onrender.com/api/stats

# Posts
curl https://posts-explorer-backend.onrender.com/api/posts?limit=1
```

### Frontend Access

Navigate to your Vercel-deployed frontend URL and test:

1. Posts load on page load
2. Search functionality works
3. Pagination works

## Performance Optimization

### Backend

1. Enable caching on CDN
2. Monitor database query performance
3. Use read replicas for scaling

### Frontend

1. Enable Vercel edge caching
2. Optimize bundle size
3. Use image optimization

## Database Backup

1. In MongoDB Atlas, enable automatic backups
2. Configure backup window to low-traffic period
3. Test restore procedure monthly

## Monitoring

### Backend (Render)

- Check deployment logs in Render dashboard
- Set up email alerts for deployment failures
- Monitor resource usage

### Frontend (Vercel)

- Check deployment logs in Vercel dashboard
- Monitor analytics and performance
- Set up error tracking

## Cost Estimation

### Free Tier (Good for Development)

| Service           | Plan | Cost | Limits           |
| ----------------- | ---- | ---- | ---------------- |
| Render Backend    | Free | $0   | 750 hours/month  |
| Vercel Frontend   | Free | $0   | 100 GB bandwidth |
| MongoDB Atlas     | Free | $0   | 512 MB storage   |
| **Monthly Total** |      | $0   | Perfect for demo |

### Paid Tier (Production)

| Service           | Plan                 | Cost | Benefits           |
| ----------------- | -------------------- | ---- | ------------------ |
| Render Backend    | Starter ($7/month)   | $7   | 24/7 uptime        |
| Vercel Pro        | Pro ($20/month)      | $20  | Advanced analytics |
| MongoDB Atlas     | Shared M2 ($9/month) | $9   | 10 GB storage      |
| **Monthly Total** |                      | ~$36 | Production ready   |

## Troubleshooting

### Backend Won't Start

1. Check mongoDB URI is correct
2. Verify IP whitelist in MongoDB Atlas
3. Check logs in Render dashboard

### Frontend Can't Connect to Backend

1. Verify `VITE_API_URL` in Vercel environment variables
2. Check CORS headers in backend response
3. Verify backend is running (health endpoint)

### WebSocket Connection Fails

1. Ensure backend is on Render (not Vercel)
2. Use `wss://` for secure WebSocket on production
3. Check browser console for connection errors

### Database Performance Issues

1. Check slow query logs in MongoDB
2. Verify text indices are created
3. Consider upgrading to M5 or higher cluster

## Scaling

### Horizontal Scaling

1. **Frontend**: Vercel automatically handles scaling
2. **Backend**:
   - Switch from free to paid plan on Render
   - Configure auto-scaling or upgrade plan
3. **Database**:
   - Upgrade MongoDB cluster tier
   - Enable sharding for horizontal scaling

### Vertical Scaling

1. Increase compute resources on all services
2. Monitor CPU and memory usage
3. Optimize code for efficiency

## Security Checklist

- [ ] Enable HTTPS on all URLs
- [ ] Set secure WebSocket (WSS)
- [ ] Configure CORS appropriately
- [ ] Enable MongoDB encryption at rest
- [ ] Set up database user with strong password
- [ ] Restrict IP whitelist in MongoDB Atlas
- [ ] Enable rate limiting on backend
- [ ] Set up API key authentication (if needed)
- [ ] Configure HTTPS redirects
- [ ] Enable security headers (Helmet middleware)

## Next Steps

1. Test all endpoints in production
2. Set up monitoring and alerting
3. Plan capacity based on projected load
4. Configure automatic backups
5. Document deployment process
6. Set up CI/CD pipeline improvements

---

**Need Help?**

- Render Support: [render.com/support](https://render.com/support)
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- MongoDB Support: [mongodb.com/support](https://mongodb.com/support)
