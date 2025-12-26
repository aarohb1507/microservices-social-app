# NexusFeed v0 🚀

A production-grade microservices social media platform built with Node.js, featuring event-driven architecture, distributed caching, and real-time search capabilities.

## 🏗️ Architecture

```
┌─────────────┐
│ API Gateway │ :3000
└──────┬──────┘
       │
   ┌───┴────────────────────────────────┐
   │                                    │
┌──▼──────────┐  ┌──────────┐  ┌──────▼─────┐
│  Identity   │  │   Post   │  │   Media    │
│  Service    │  │ Service  │  │  Service   │
│    :3001    │  │  :3002   │  │   :3003    │
└─────────────┘  └────┬─────┘  └────────────┘
                      │
              ┌───────▼────────┐
              │     Search     │
              │    Service     │
              │     :3004      │
              └────────────────┘

        ┌──────────────────────┐
        │   Infrastructure     │
        ├──────────────────────┤
        │  MongoDB  │  Redis   │
        │  RabbitMQ │ Cloudinary│
        └──────────────────────┘
```

## 🎯 Features

### Core Microservices
- **API Gateway**: Single entry point, request routing, global rate limiting
- **Identity Service**: JWT authentication, refresh tokens, user management
- **Post Service**: CRUD operations, pagination, Redis caching
- **Media Service**: File uploads, Cloudinary CDN integration
- **Search Service**: Full-text search with real-time event indexing

### Technical Highlights
- ✅ Event-driven messaging with RabbitMQ (ACK/NACK, DLQ, retries)
- ✅ Redis caching with intelligent invalidation
- ✅ Pagination-aware cache keys for infinite scroll
- ✅ Rate limiting (global + per-endpoint)
- ✅ Database indexing for performance
- ✅ JWT with refresh token rotation
- ✅ Service independence & eventual consistency

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | Node.js, Express.js |
| **Databases** | MongoDB (with text indexing), Redis |
| **Message Queue** | RabbitMQ |
| **Media** | Multer, Cloudinary CDN |
| **Auth** | JWT (jsonwebtoken), argon2 |
| **Rate Limiting** | express-rate-limit, rate-limit-redis |

## 📦 Project Structure

```
social-media-microservices/
├── api-gateway/
│   └── src/
│       ├── middleware/
│       ├── utils/
│       └── server.js
├── identity-service/
│   └── src/
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       └── utils/
├── post-service/
│   └── src/
│       ├── controller/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── utils/
├── media-service/
│   └── src/
│       ├── controller/
│       ├── eventHandler/
│       ├── middleware/
│       ├── models/
│       └── routes/
└── search-service/
    └── src/
        ├── controller/
        ├── eventHandler/
        ├── middleware/
        ├── models/
        └── routes/
```

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ 
- MongoDB (local or Atlas)
- Redis
- RabbitMQ
- Cloudinary account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/social-media-microservices.git
cd social-media-microservices
```

2. **Install dependencies for each service**
```bash
cd api-gateway && npm install
cd ../identity-service && npm install
cd ../post-service && npm install
cd ../media-service && npm install
cd ../search-service && npm install
```

3. **Set up environment variables**

Create `.env` files in each service directory:

**identity-service/.env**
```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

**post-service/.env**
```env
PORT=3002
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost
```

**media-service/.env**
```env
PORT=3003
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RABBITMQ_URL=amqp://localhost
```

**search-service/.env**
```env
PORT=3004
MONGODB_URI=your_mongodb_connection_string
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost
```

**api-gateway/.env**
```env
PORT=3000
IDENTITY_SERVICE_URL=http://localhost:3001
POST_SERVICE_URL=http://localhost:3002
MEDIA_SERVICE_URL=http://localhost:3003
SEARCH_SERVICE_URL=http://localhost:3004
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
```

4. **Start infrastructure services**
```bash
# MongoDB (if running locally)
mongod

# Redis
redis-server

# RabbitMQ
rabbitmq-server
```

5. **Run all microservices** (in separate terminals)
```bash
# Terminal 1: API Gateway
cd api-gateway && npm run dev

# Terminal 2: Identity Service
cd identity-service && npm run dev

# Terminal 3: Post Service
cd post-service && npm run dev

# Terminal 4: Media Service
cd media-service && npm run dev

# Terminal 5: Search Service
cd search-service && npm run dev
```

## 🔌 API Endpoints

### Authentication
```
POST   /v1/auth/register    - Register new user
POST   /v1/auth/login       - Login user
POST   /v1/auth/refresh     - Refresh access token
POST   /v1/auth/logout      - Logout user
```

### Posts
```
POST   /v1/posts/create-post    - Create new post
GET    /v1/posts/all-posts      - Get all posts (paginated)
GET    /v1/posts/:id            - Get single post
DELETE /v1/posts/:id            - Delete post
```

### Media
```
POST   /v1/media/upload         - Upload media file
GET    /v1/media/:id            - Get media metadata
```

### Search
```
GET    /v1/search?query=        - Full-text search posts
```

## 📊 Rate Limits

| Endpoint | Limit |
|----------|-------|
| **Global** | 100 requests / 15 minutes |
| **Create Post** | 20 requests / minute |
| **Delete Post** | 20 requests / 10 minutes |
| **Search** | 30 requests / minute |

## 🔄 Event-Driven Architecture

### RabbitMQ Events
- `post.created` - Published when a post is created, triggers search indexing
- `post.deleted` - Published when a post is deleted, triggers cache invalidation

### Message Reliability
- ACK/NACK pattern for guaranteed delivery
- Exponential backoff retries (1s, 2s, 4s, 8s, 16s)
- Dead Letter Queue for failed messages

## 💾 Caching Strategy

### Redis Cache Keys
```
posts:${page}:${limit}           # Paginated posts cache
post:${postId}                   # Single post cache
search:${query}:${page}:${limit} # Search results cache
```

### Cache Invalidation
- Post creation/deletion → Clear all `posts:*` keys
- Search events → Clear all `search:*` keys
- Cache TTL: 300 seconds (5 minutes)

## 🎯 Roadmap

- [ ] Docker containerization
- [ ] GitHub Actions CI/CD
- [ ] AWS EC2 deployment
- [ ] React/Next.js frontend
- [ ] WebSocket real-time updates
- [ ] Unit & integration tests
- [ ] API documentation (Swagger)

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

MIT License - feel free to use this project for learning and portfolio purposes.

## 👨‍💻 Author

Built by [Your Name]
- LinkedIn: [your-profile]
- GitHub: [@yourusername]
- Portfolio: [your-website]

---

⭐ Star this repo if you find it useful!
