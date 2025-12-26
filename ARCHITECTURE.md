# Architecture Documentation

## System Overview

NexusFeed is a distributed social media platform following microservices architecture principles. Each service is independently deployable, scalable, and maintains its own data.

## Service Responsibilities

### API Gateway (Port 3000)
**Purpose**: Single entry point for all client requests

**Responsibilities**:
- Request routing to downstream services
- Global rate limiting (100 req/15min)
- CORS and security headers (Helmet)
- Error handling and logging

**Dependencies**: Redis (rate limiting state)

---

### Identity Service (Port 3001)
**Purpose**: User authentication and authorization

**Responsibilities**:
- User registration with password hashing (argon2)
- Login with JWT token generation
- Refresh token rotation (7-day expiry)
- Logout with token blacklisting

**Data Models**:
- `User`: userId, email, password (hashed), createdAt
- `RefreshToken`: token, userId, expiresAt

**Dependencies**: MongoDB

---

### Post Service (Port 3002)
**Purpose**: Post CRUD operations with caching

**Responsibilities**:
- Create posts (with optional mediaIds)
- Retrieve posts (paginated, cached)
- Delete posts (owner validation)
- Publish RabbitMQ events on mutations
- Cache invalidation

**Data Models**:
- `Post`: postId, userId, content, mediaIds[], createdAt, updatedAt

**Caching Strategy**:
```
posts:${page}:${limit}  → 300s TTL
post:${postId}          → 3600s TTL
```

**Dependencies**: MongoDB, Redis, RabbitMQ

---

### Media Service (Port 3003)
**Purpose**: File upload and CDN integration

**Responsibilities**:
- Process file uploads via Multer
- Upload to Cloudinary CDN
- Store media metadata
- Listen to post deletion events (cleanup media)

**Data Models**:
- `Media`: mediaId, publicId (Cloudinary), url, userId, createdAt

**Dependencies**: MongoDB, Cloudinary, RabbitMQ

---

### Search Service (Port 3004)
**Purpose**: Full-text search with real-time indexing

**Responsibilities**:
- Full-text MongoDB search ($text operator)
- Pagination with result ranking
- Event-driven indexing (post.created/deleted)
- Redis caching of search results
- Cache invalidation on post events

**Data Models**:
- `Search`: postId, userId, content, createdAt (denormalized from Post)

**Indexes**:
```javascript
{ content: "text" }  // Text index for full-text search
{ userId: 1 }        // B-tree for user queries
{ createdAt: -1 }    // Sort by date
```

**Caching Strategy**:
```
search:${query}:${page}:${limit}  → 300s TTL
```

**Dependencies**: MongoDB, Redis, RabbitMQ

---

## Communication Patterns

### Synchronous (HTTP)
- API Gateway → Identity Service (auth verification)
- API Gateway → Post Service (CRUD operations)
- API Gateway → Media Service (uploads)
- API Gateway → Search Service (queries)

### Asynchronous (RabbitMQ)
```
Post Service → [post.created] → Search Service (index post)
Post Service → [post.deleted] → Search Service (remove from index)
Post Service → [post.deleted] → Media Service (cleanup files)
```

---

## Data Flow Examples

### Create Post with Media
1. Client uploads media → Media Service → Cloudinary
2. Media Service returns `mediaId`
3. Client creates post with `mediaIds: [mediaId]`
4. Post Service saves post
5. Post Service publishes `post.created` event
6. Search Service indexes post
7. Cache invalidated: all `posts:*` and `search:*` keys

### Search Posts
1. Client sends `GET /v1/search?query=nodejs&page=1`
2. Search Service checks cache: `search:nodejs:1:10`
3. If miss: MongoDB $text search with pagination
4. Cache result with 300s TTL
5. Return ranked results

---

## Eventual Consistency

### Post with Missing Media
- **Problem**: User creates post with `mediaId`, but media doesn't exist
- **Solution**: Service independence; Post Service doesn't validate mediaId
- **Frontend Handling**: Show alt text or placeholder if media fetch fails
- **Trade-off**: Consistency for availability

### Search Indexing Delay
- **Problem**: Post created but not immediately searchable
- **Solution**: Eventual consistency via RabbitMQ events
- **User Experience**: Sub-second delay (typically <100ms)
- **Reliability**: ACK/NACK pattern ensures delivery

---

## Rate Limiting Architecture

### Global Limiter (API Gateway)
- 100 requests / 15 minutes per IP
- Applies to all routes

### Service-Level Limiters (Post Service)
- Create Post: 20 req/min
- Delete Post: 20 req/10min
- **Skip Logic**: Global limiter skips routes with specific limiters

### Storage
- Redis-backed for distributed rate limiting
- Keys auto-expire via TTL

---

## Caching Strategy

### Cache Invalidation Rules
1. **Post Created/Updated**:
   - Invalidate all `posts:*` keys
   - RabbitMQ event → Search Service invalidates `search:*`

2. **Post Deleted**:
   - Invalidate specific `post:${id}` key
   - Invalidate all `posts:*` keys
   - RabbitMQ event → Search Service invalidates `search:*`

3. **Why Pagination-Aware Keys?**
   - Each page is cached separately
   - `posts:1:10` ≠ `posts:2:10`
   - Supports infinite scroll UX

---

## Message Reliability

### RabbitMQ Patterns

**ACK/NACK**:
```javascript
channel.consume(queue, async (msg) => {
  try {
    await processMessage(msg);
    channel.ack(msg);  // Success
  } catch (error) {
    channel.nack(msg, false, true);  // Retry
  }
});
```

**Exponential Backoff**:
- Attempt 1: 1s delay
- Attempt 2: 2s delay
- Attempt 3: 4s delay
- Attempt 4: 8s delay
- Attempt 5: 16s delay
- After 5 attempts → Dead Letter Queue

**Dead Letter Queue**:
- Failed messages moved to DLQ
- Manual review/replay required
- Prevents infinite retry loops

---

## Security

### Authentication Flow
1. User logs in → Identity Service
2. Identity Service returns:
   - Access Token (15-min expiry)
   - Refresh Token (7-day expiry)
3. Client includes Access Token in requests
4. When Access Token expires:
   - Client sends Refresh Token
   - Identity Service rotates tokens
   - New Access + Refresh Token returned

### Password Security
- argon2 hashing (memory-hard algorithm)
- Pre-save hook in Mongoose schema
- Never store plain passwords

---

## Scalability Considerations

### Horizontal Scaling
- Each service can scale independently
- Redis caching reduces DB load
- RabbitMQ handles message distribution

### Database Indexes
- Text indexes for search performance
- B-tree indexes for common queries (userId, createdAt)
- Compound indexes for pagination

### Future Optimizations
- Read replicas for MongoDB
- Redis Cluster for distributed cache
- CDN for static assets
- Message queue partitioning

---

## Error Handling

### Service Unavailable
- API Gateway logs error, returns 503
- Client retries with exponential backoff

### Message Processing Failure
- NACK message → requeue
- After max retries → DLQ

### Cache Miss
- Fallback to database query
- Populate cache for next request

---

## Monitoring & Observability

### Logging Strategy
- Winston logger in all services
- Log levels: info, warn, error, debug
- Include context: userId, requestId, timestamp

### Key Metrics to Track
- Request latency per service
- Cache hit/miss ratio
- Rate limit violations
- RabbitMQ queue depth
- Database query performance

---

## Deployment Architecture (Planned)

```
GitHub → CI/CD (Actions) → Docker Images → AWS ECR
                              ↓
                        Docker Compose
                              ↓
                         AWS EC2 Instance
                              ↓
                    [5 Services + Infrastructure]
```

---

## Design Decisions

### Why Microservices?
- Independent scaling
- Technology flexibility
- Fault isolation
- Team autonomy

### Why RabbitMQ over HTTP?
- Decouples services
- Guaranteed delivery
- Retry logic built-in
- Better for async operations

### Why Redis for Caching?
- Sub-millisecond latency
- Automatic TTL expiration
- Supports complex data structures
- Easy horizontal scaling

### Why Eventual Consistency?
- Higher availability
- Lower latency
- Resilience to service failures
- Real-world trade-off (social media can tolerate slight delays)

---

For implementation details, see service-specific READMEs in each directory.
