# modQ Beta Testing Guide

## 🎯 **Access Credentials & URLs**

### **Live Application URLs:**
- **Landing Page**: https://ai-business-suite.preview.emergentagent.com
- **Widget Demo**: https://ai-business-suite.preview.emergentagent.com/widget-demo
- **Enterprise Dashboard**: https://ai-business-suite.preview.emergentagent.com/dashboard
- **Admin Portal**: https://ai-business-suite.preview.emergentagent.com/admin

### **Admin Portal Credentials:**
```
Username: admin
Password: modQ2024!
```

### **Test User Registration:**
- Anyone can register for the widget demo
- Use any username/email combination
- All registered users appear in the admin portal

---

## 🧪 **Beta Testing Scenarios**

### **Scenario 1: End User Experience**
1. **Registration Flow**:
   - Go to `/widget-demo`
   - Register with: `your-name` / `your-email@test.com`
   - Should immediately access the widget interface

2. **AI Chat Testing**:
   - Try these test messages:
     - "Hello modQ! Can you help me analyze my sales performance?"
     - "What insights can you provide about customer retention?"
     - "Help me automate my workflow processes"
     - "Generate a business report summary"

3. **Configuration Testing**:
   - Click "Configuration" tab
   - Set Company Name: "Test Corp"
   - Choose Industry: "Technology"
   - Select AI Personality: "Strategic Advisor"
   - Click "Save Configuration"

4. **Knowledge Base Testing**:
   - Click "Knowledge Base" tab
   - Add Title: "Company Policies"
   - Add Content: "Our company follows strict quality standards..."
   - Click "Add to Knowledge Base"

### **Scenario 2: Admin Monitoring**
1. **Login to Admin Portal**:
   - Go to `/admin`
   - Use credentials: `admin` / `modQ2024!`

2. **User Management**:
   - View all registered users
   - Check user registration timestamps
   - Monitor user activity

3. **System Monitoring**:
   - Check total users count
   - View system information
   - Export system data

4. **Chat Message Analysis**:
   - Click "Load All Chat Messages"
   - Review AI conversations
   - Monitor AI response quality

### **Scenario 3: Enterprise Presentation**
1. **Dashboard Tour**:
   - Visit `/dashboard`
   - Review all available modules
   - Check pricing plans
   - Test navigation between sections

---

## 🔧 **Implementation Guide for Real Functionality**

### **Phase 1: Core Platform Hardening**

#### **1.1 Enhanced Authentication System**
```javascript
// Implement JWT-based authentication
// Location: /app/backend/server.py

@api_router.post("/auth/login")
async def login_user(credentials: UserLogin):
    user = await authenticate_user(credentials.email, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@api_router.post("/auth/refresh")
async def refresh_token(current_user: User = Depends(get_current_user)):
    access_token = create_access_token(data={"sub": current_user.email})
    return {"access_token": access_token, "token_type": "bearer"}
```

#### **1.2 Password Hashing & Security**
```bash
# Install additional security packages
pip install passlib[bcrypt] python-jose[cryptography]

# Update requirements.txt
pip freeze > requirements.txt
```

#### **1.3 Database Models Enhancement**
```python
# Add to /app/backend/server.py

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "employee"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    hashed_password: str
    role: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
```

### **Phase 2: Advanced AI Features**

#### **2.1 Context-Aware AI Responses**
```python
# Enhanced AI chat with context
@api_router.post("/chat/advanced")
async def advanced_chat(chat_request: ChatRequest):
    # Get user's company configuration
    user_config = await db.widget_configs.find_one({"user_id": chat_request.user_id})
    
    # Get user's knowledge base
    knowledge_items = await db.knowledge_base.find({"user_id": chat_request.user_id}).to_list(100)
    
    # Build comprehensive context
    context = f"""
    Company: {user_config.get('company_name', 'Unknown')}
    Industry: {user_config.get('industry', 'General')}
    
    Knowledge Base:
    {chr(10).join([f"- {item['title']}: {item['content']}" for item in knowledge_items])}
    
    Recent Context: [Last 5 conversations]
    """
    
    # Use context in AI prompt
    system_message = f"{context}\n\nYou are modQ, act as their intelligent business assistant."
```

#### **2.2 File Upload for Knowledge Base**
```python
@api_router.post("/knowledge-base/upload")
async def upload_knowledge_file(
    user_id: str,
    file: UploadFile = File(...)
):
    # Process different file types
    if file.content_type == "application/pdf":
        content = extract_pdf_text(file)
    elif file.content_type == "text/plain":
        content = await file.read()
    
    # Save to knowledge base
    kb_item = KnowledgeBaseItem(
        user_id=user_id,
        title=file.filename,
        content=content,
        file_type=file.content_type
    )
    
    await db.knowledge_base.insert_one(kb_item.dict())
    return kb_item
```

### **Phase 3: Enterprise Features**

#### **3.1 Multi-Tenant Architecture**
```python
class Organization(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    domain: str
    subscription_plan: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    settings: dict = {}

class User(BaseModel):
    # Add organization reference
    organization_id: Optional[str] = None
    # ... existing fields
```

#### **3.2 Role-Based Access Control (RBAC)**
```python
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    ORG_ADMIN = "org_admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"
    VIEWER = "viewer"

def require_role(required_role: UserRole):
    def decorator(func):
        def wrapper(*args, **kwargs):
            current_user = get_current_user()
            if not has_permission(current_user.role, required_role):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

#### **3.3 API Rate Limiting**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@api_router.post("/chat")
@limiter.limit("30/minute")  # 30 requests per minute
async def chat_with_ai(request: Request, chat_request: ChatRequest):
    # ... existing code
```

### **Phase 4: Production Integrations**

#### **4.1 Email Service Integration**
```python
# Add to requirements.txt
# sendgrid==6.9.7

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

@api_router.post("/notifications/email")
async def send_notification_email(email_data: EmailRequest):
    message = Mail(
        from_email='noreply@modq.com',
        to_emails=email_data.to_email,
        subject=email_data.subject,
        html_content=email_data.content
    )
    
    sg = SendGridAPIClient(api_key=os.environ.get('SENDGRID_API_KEY'))
    response = sg.send(message)
    return {"status": "sent", "message_id": response.headers.get('X-Message-Id')}
```

#### **4.2 Webhook System**
```python
@api_router.post("/webhooks/user-registered")
async def handle_user_registration(user_data: User):
    # Send welcome email
    await send_welcome_email(user_data.email)
    
    # Update analytics
    await track_event("user_registered", {
        "user_id": user_data.id,
        "timestamp": datetime.now(timezone.utc)
    })
    
    # Trigger onboarding workflow
    await start_onboarding_flow(user_data.id)
```

#### **4.3 Payment Integration (Stripe)**
```python
import stripe

stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

@api_router.post("/payments/create-subscription")
async def create_subscription(payment_data: SubscriptionRequest):
    try:
        # Create customer
        customer = stripe.Customer.create(
            email=payment_data.email,
            name=payment_data.name
        )
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": payment_data.price_id}],
            payment_behavior="default_incomplete",
            expand=["latest_invoice.payment_intent"]
        )
        
        return {
            "subscription_id": subscription.id,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

## 🚀 **Deployment Guide**

### **Current Status: Deployed on Emergent Platform**
Your application is already deployed and running on the Emergent platform. Here's how it works:

#### **Emergent Platform Architecture:**
- **Frontend**: Automatically deployed from `/app/frontend/`
- **Backend**: Automatically deployed from `/app/backend/`
- **Database**: MongoDB instance provided by platform
- **SSL/HTTPS**: Automatically handled
- **Domain**: `ai-business-suite.preview.emergentagent.com`

#### **Hot Reload System:**
- Code changes are automatically detected
- Frontend and backend restart automatically
- No manual deployment steps needed during development

### **Production Deployment Steps**

#### **Step 1: Environment Configuration**
```bash
# Production environment variables
# Add to /app/backend/.env

# Database
MONGO_URL="mongodb://production-cluster/modq_production"
DB_NAME="modq_production"

# Security
JWT_SECRET_KEY="your-super-secure-jwt-secret-key-here"
JWT_ALGORITHM="HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# External Services
SENDGRID_API_KEY="your-sendgrid-api-key"
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"

# AI Integration
EMERGENT_LLM_KEY="your-production-llm-key"

# Security Settings
CORS_ORIGINS="https://your-domain.com,https://app.your-domain.com"
ALLOWED_HOSTS="your-domain.com,app.your-domain.com"
```

#### **Step 2: Domain & SSL Setup**
```bash
# Custom domain configuration
# 1. Point your domain DNS to Emergent platform
# 2. Configure SSL certificate
# 3. Update CORS_ORIGINS in backend/.env
# 4. Update REACT_APP_BACKEND_URL in frontend/.env
```

#### **Step 3: Database Migration**
```python
# Create migration script: /app/scripts/migrate_production.py

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def migrate_database():
    client = AsyncIOMotorClient("your-production-mongo-url")
    db = client["modq_production"]
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("organization_id")
    await db.chat_messages.create_index([("user_id", 1), ("timestamp", -1)])
    await db.widget_configs.create_index("user_id", unique=True)
    
    print("Database migration completed!")

if __name__ == "__main__":
    asyncio.run(migrate_database())
```

#### **Step 4: Production Monitoring**
```python
# Add to /app/backend/server.py

import logging
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=os.environ.get('ALLOWED_HOSTS', 'localhost').split(',')
)

# Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/app.log'),
        logging.StreamHandler()
    ]
)
```

#### **Step 5: Backup Strategy**
```bash
#!/bin/bash
# /app/scripts/backup.sh

# Database backup
mongodump --uri="$MONGO_URL" --out="/backups/$(date +%Y%m%d_%H%M%S)"

# File system backup
tar -czf "/backups/files_$(date +%Y%m%d_%H%M%S).tar.gz" /app/uploads

# Clean old backups (keep last 30 days)
find /backups -name "*.tar.gz" -mtime +30 -delete
find /backups -type d -mtime +30 -exec rm -rf {} +
```

---

## 📊 **Performance Optimization**

### **Frontend Optimizations**
```javascript
// React optimizations
import { lazy, Suspense } from 'react';

// Code splitting
const WidgetDemo = lazy(() => import('./components/WidgetDemo'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));

// Memoization for expensive components
const MemoizedChatMessage = React.memo(ChatMessage);

// Image optimization
const optimizeImage = (src, width = 800) => {
  return `${src}?w=${width}&q=80&f=webp`;
};
```

### **Backend Optimizations**
```python
# Database connection pooling
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=30000
)

# Caching with Redis
import redis.asyncio as redis

redis_client = redis.from_url("redis://localhost:6379")

@api_router.get("/users/{user_id}")
async def get_user_cached(user_id: str):
    # Try cache first
    cached_user = await redis_client.get(f"user:{user_id}")
    if cached_user:
        return json.loads(cached_user)
    
    # Fetch from database
    user = await db.users.find_one({"id": user_id})
    
    # Cache for 1 hour
    await redis_client.setex(f"user:{user_id}", 3600, json.dumps(user, default=str))
    
    return user
```

---

## 🔒 **Security Implementation**

### **Authentication Tokens**
```python
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### **Input Validation**
```python
from pydantic import validator, EmailStr

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    
    @validator('username')
    def username_must_be_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must be alphanumeric with optional _ or -')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v
```

---

## 📈 **Analytics & Monitoring**

### **Event Tracking**
```python
@api_router.post("/analytics/track")
async def track_event(event_data: EventData):
    await db.analytics_events.insert_one({
        "event_type": event_data.event_type,
        "user_id": event_data.user_id,
        "properties": event_data.properties,
        "timestamp": datetime.now(timezone.utc),
        "session_id": event_data.session_id
    })
    
    return {"status": "tracked"}

# Usage examples:
# - User registration: track_event("user_registered", user_id, {})
# - AI chat: track_event("ai_chat_sent", user_id, {"message_length": len(message)})
# - Feature usage: track_event("feature_used", user_id, {"feature": "knowledge_base"})
```

---

## 🧪 **Testing Strategy**

### **Automated Testing Setup**
```bash
# Install testing dependencies
pip install pytest pytest-asyncio httpx

# Create test files
mkdir -p /app/tests/backend
mkdir -p /app/tests/frontend
```

```python
# /app/tests/backend/test_api.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_user_registration():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/auth/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123"
        })
    assert response.status_code == 200
    assert "id" in response.json()
```

---

This comprehensive guide covers everything you need for beta testing and production deployment. The current system is fully functional for beta testing, and these implementation steps will take you to a production-ready enterprise platform.