from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
import asyncio
import logging
import os
import tempfile
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Union
import uuid
import asyncio
import json
import hashlib
import secrets
import time
from dotenv import load_dotenv
import aiofiles
from pathlib import Path
import io
import base64

# F1: Performance Optimization
import redis.asyncio as redis
from functools import wraps
import gzip

# F3: Advanced Security  
import bcrypt
import jwt
from passlib.context import CryptContext

# E2: Advanced AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Load environment variables
load_dotenv()

# F1: Performance - Redis Cache Setup
redis_client = None
try:
    redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'), decode_responses=True)
except Exception as e:
    logging.warning(f"Redis connection failed: {e}. Continuing without cache.")

# F3: Security - Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="modQ API", description="Modular Quantum Business Intelligence API", version="1.0")

# F1: Performance - Add middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])  # Configure for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# F3: Security - JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# F1: Performance - Cache decorator
def cache_result(expiration: int = 300):
    """Cache decorator for expensive operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if not redis_client:
                return await func(*args, **kwargs)
            
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{hashlib.md5(str(args + tuple(kwargs.items())).encode()).hexdigest()}"
            
            try:
                # Try to get from cache
                cached_result = await redis_client.get(cache_key)
                if cached_result:
                    return json.loads(cached_result)
                
                # Execute function and cache result
                result = await func(*args, **kwargs)
                await redis_client.setex(cache_key, expiration, json.dumps(result, default=str))
                return result
            except Exception as e:
                logging.warning(f"Cache operation failed: {e}")
                return await func(*args, **kwargs)
        return wrapper
    return decorator

# F3: Security - Authentication functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        # Get user from database
        user = await db.users.find_one({"id": user_id})
        return user
    except jwt.PyJWTError:
        return None

# F1: Performance - Database connection pooling optimization
async def optimize_db_connection():
    """Optimize database connection settings"""
    try:
        # Set connection pool settings
        client.get_io_loop = asyncio.get_event_loop
        await client.admin.command('ping')
        logging.info("Database connection optimized")
    except Exception as e:
        logging.error(f"Database optimization failed: {e}")

# F3: Security - Rate limiting
class RateLimiter:
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def is_allowed(self, identifier: str) -> bool:
        if not redis_client:
            return True
        
        try:
            key = f"rate_limit:{identifier}"
            current = await redis_client.get(key)
            
            if current is None:
                await redis_client.setex(key, self.window_seconds, 1)
                return True
            
            if int(current) >= self.max_requests:
                return False
            
            await redis_client.incr(key)
            return True
        except Exception as e:
            logging.warning(f"Rate limiting failed: {e}")
            return True

# Global rate limiter
rate_limiter = RateLimiter()

# WebSocket endpoint - must be on main app, not API router
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str):
    session_id = str(uuid.uuid4())
    await manager.connect(websocket, user_id, session_id)
    
    try:
        # Send initial connection confirmation
        await manager.send_message({
            "type": "connection_established",
            "session_id": session_id,
            "user_id": user_id
        }, user_id, session_id)
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            message_type = message_data.get("type")
            
            if message_type == "chat_message":
                # Handle streaming chat message
                await handle_streaming_chat(message_data, user_id, session_id)
            
            elif message_type == "voice_transcription":
                # Handle voice input
                await handle_voice_transcription(message_data, user_id, session_id)
            
            elif message_type == "tts_request":
                # Handle text-to-speech request
                await handle_tts_request(message_data, user_id, session_id)
                
    except WebSocketDisconnect:
        manager.disconnect(user_id, session_id)
    except Exception as e:
        logging.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id, session_id)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class UserCreate(BaseModel):
    username: str
    email: str
    role: str = "employee"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_demo: bool = False
    password_hash: Optional[str] = None  # F3: Security - Add password field
    last_login: Optional[datetime] = None
    is_active: bool = True
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None

# F3: Security - Authentication Models
class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    role: str = "employee"

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user_id: str

class PasswordReset(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

# F3: Security - Session Management
class UserSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    is_active: bool = True
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

# F1: Performance - Analytics Models
class PerformanceMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    endpoint: str
    method: str
    response_time_ms: float
    status_code: int
    user_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    memory_usage_mb: Optional[float] = None
    cpu_usage_percent: Optional[float] = None

class CacheMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cache_key: str
    hit: bool
    execution_time_ms: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConversationSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = "New Conversation"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    context_summary: str = ""
    message_count: int = 0

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_id: str
    message: str
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    rating: Optional[str] = None
    feedback: Optional[str] = None
    ai_personality: str = "Professional Assistant"
    response_time_ms: Optional[int] = None
    is_streaming: bool = False

class StreamingChatRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    message: str
    personality: Optional[str] = "Professional Assistant"

class ChatRequest(BaseModel):
    user_id: str
    message: str
    session_id: Optional[str] = None

class VoiceTranscriptionRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    audio_format: str = "webm"

class TTSRequest(BaseModel):
    user_id: str
    text: str
    voice: str = "alloy"
    speed: float = 1.0

class ChatRating(BaseModel):
    message_id: str
    rating: str  # 'helpful' or 'not_helpful'
    feedback: Optional[str] = None

class ChatFeedback(BaseModel):
    message_id: str
    rating: str
    feedback: str

class AIPersonality(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    system_prompt: str
    industry: Optional[str] = None
    traits: List[str] = []
    example_responses: List[str] = []

class WidgetConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_name: str
    industry: str
    ai_personality: str = "Professional Assistant"
    workflow_automations: List[str] = []
    knowledge_base_files: List[str] = []
    integration_settings: dict = {}
    voice_settings: Dict[str, Any] = {
        "enabled": False,
        "voice": "alloy",
        "speech_speed": 1.0,
        "auto_play_responses": True
    }
    streaming_enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WidgetConfigCreate(BaseModel):
    user_id: str
    company_name: str
    industry: str
    ai_personality: str = "Professional Assistant"
    workflow_automations: List[str] = []

class KnowledgeBaseItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    content: str
    file_type: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KnowledgeBaseCreate(BaseModel):
    user_id: str
    title: str
    content: str
    file_type: str = "text"

class UserIntegration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    integration_id: str
    integration_name: str
    status: str = "connecting"  # connecting, connected, error, disconnected
    connected_at: Optional[datetime] = None
    last_sync: Optional[datetime] = None
    configuration: dict = {}
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IntegrationConnect(BaseModel):
    user_id: str
    integration_id: str
    integration_name: str
    configuration: dict = {}

class IntegrationDisconnect(BaseModel):
    user_id: str
    integration_id: str

# Team Collaboration Models
class Team(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    owner_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    settings: Dict[str, Any] = {
        "ai_personality": "Professional Assistant",
        "shared_knowledge_base": True,
        "shared_integrations": True,
        "collaboration_level": "full"  # full, limited, view_only
    }
    is_active: bool = True

class TeamMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    user_id: str
    role: str = "employee"  # owner, admin, manager, employee
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: Optional[datetime] = None
    permissions: Dict[str, bool] = {
        "can_invite_members": False,
        "can_manage_integrations": False,
        "can_edit_team_settings": False,
        "can_view_analytics": True,
        "can_create_shared_sessions": True,
        "can_access_all_conversations": False
    }
    status: str = "active"  # active, inactive, pending

class TeamInvitation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    inviter_id: str
    email: str
    role: str = "employee"
    status: str = "pending"  # pending, accepted, expired, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=7))
    accepted_at: Optional[datetime] = None

class SharedConversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    session_id: str
    title: str = "Shared Team Conversation"
    creator_id: str
    participants: List[str] = []  # user_ids
    is_public: bool = True  # visible to all team members
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TeamActivity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    team_id: str
    user_id: str
    activity_type: str  # conversation_created, member_joined, integration_connected, etc.
    description: str
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Team Management Request Models
class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: str

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class TeamInviteRequest(BaseModel):
    team_id: str
    email: str
    role: str = "employee"
    inviter_id: str

class TeamMemberUpdate(BaseModel):
    role: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = None
    status: Optional[str] = None

class SharedConversationCreate(BaseModel):
    team_id: str
    session_id: str
    title: Optional[str] = "Shared Team Conversation"
    creator_id: str
    is_public: bool = True

# White-Label Customization Models
class BrandCustomization(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  # None for system-wide customization
    team_id: Optional[str] = None  # Team-specific branding
    organization_name: str = "modQ"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#3b82f6"  # Default blue
    secondary_color: str = "#8b5cf6"  # Default purple
    accent_color: str = "#10b981"  # Default green
    background_color: str = "#000000"  # Default black
    text_color: str = "#ffffff"  # Default white
    border_color: str = "#374151"  # Default gray
    theme_mode: str = "dark"  # dark, light, auto
    custom_css: Optional[str] = None
    welcome_message: str = "Welcome to your AI-powered business intelligence platform"
    tagline: str = "Modular Quantum Business Intelligence"
    footer_text: str = "Powered by modQ"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class CustomDomain(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    domain_name: str
    subdomain: Optional[str] = None  # e.g., "app" in app.company.com
    ssl_enabled: bool = False
    ssl_certificate: Optional[str] = None
    dns_configured: bool = False
    verification_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "pending"  # pending, verified, active, error
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified_at: Optional[datetime] = None

class ThemePreset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    border_color: str
    theme_mode: str
    preview_image: Optional[str] = None
    is_system_preset: bool = True
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WhiteLabelConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_name: str
    brand_customization_id: str
    custom_domain_id: Optional[str] = None
    hide_modq_branding: bool = False
    custom_login_page: bool = False
    custom_dashboard_title: str = "Business Intelligence Dashboard"
    custom_support_email: str = "support@company.com"
    custom_documentation_url: Optional[str] = None
    analytics_tracking_id: Optional[str] = None
    is_enterprise_plan: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request Models for White-Label
class BrandCustomizationCreate(BaseModel):
    user_id: Optional[str] = None
    team_id: Optional[str] = None
    organization_name: str
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    welcome_message: Optional[str] = None
    tagline: Optional[str] = None

class BrandCustomizationUpdate(BaseModel):
    organization_name: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    border_color: Optional[str] = None
    theme_mode: Optional[str] = None
    custom_css: Optional[str] = None
    welcome_message: Optional[str] = None
    tagline: Optional[str] = None
    footer_text: Optional[str] = None

class CustomDomainCreate(BaseModel):
    user_id: str
    domain_name: str
    subdomain: Optional[str] = None

class CustomDomainUpdate(BaseModel):
    ssl_enabled: Optional[bool] = None
    dns_configured: Optional[bool] = None
    status: Optional[str] = None
    error_message: Optional[str] = None

class WhiteLabelConfigCreate(BaseModel):
    user_id: str
    organization_name: str
    hide_modq_branding: bool = False
    custom_login_page: bool = False
    custom_dashboard_title: Optional[str] = None
    custom_support_email: Optional[str] = None

class LogoUploadResponse(BaseModel):
    success: bool
    logo_url: str
    message: str

# Workflow Builder Models
class WorkflowNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # Enhanced types: trigger, action, condition, ai_response, integration, database, api_call, loop, parallel, timer, webhook, notification, data_transform, script
    name: str
    description: Optional[str] = None
    position: Dict[str, float] = {"x": 0, "y": 0}  # Canvas position
    configuration: Dict[str, Any] = {}
    inputs: List[str] = []  # Connected input node IDs
    outputs: List[str] = []  # Connected output node IDs
    error_handling: Dict[str, Any] = {"retry_count": 3, "retry_delay": 1, "on_error": "stop"}  # Enhanced error handling
    timeout: Optional[int] = 30  # Timeout in seconds
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkflowConnection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_node_id: str
    target_node_id: str
    source_port: str = "output"  # output port name
    target_port: str = "input"   # input port name
    condition: Optional[str] = None  # Conditional logic
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Workflow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    team_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: str = "general"  # lead_qualification, email_automation, task_management, customer_support
    nodes: List[WorkflowNode] = []
    connections: List[WorkflowConnection] = []
    triggers: List[str] = []  # Trigger types that start this workflow
    is_active: bool = False
    is_template: bool = False
    template_id: Optional[str] = None  # If created from template
    execution_count: int = 0
    last_executed: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkflowTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str
    industry: Optional[str] = None
    use_case: str
    complexity: str = "beginner"  # beginner, intermediate, advanced
    estimated_time: str = "5-10 minutes"
    nodes: List[WorkflowNode] = []
    connections: List[WorkflowConnection] = []
    preview_image: Optional[str] = None
    tags: List[str] = []
    is_system_template: bool = True
    usage_count: int = 0
    rating: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# E2: Advanced AI Integration Models
class AIAgent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str  # sales_agent, support_agent, analytics_agent, custom_agent
    provider: str = "openai"  # openai, anthropic, gemini
    model: str = "gpt-4o"  # Model name
    system_prompt: str
    temperature: float = 0.7
    max_tokens: int = 2000
    capabilities: List[str] = []  # ["lead_qualification", "email_generation", "data_analysis"]
    user_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# E3: Custom Integration Marketplace Models
class CustomIntegration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str  # api, webhook, database, file_processing, notification, custom
    version: str = "1.0.0"
    author: str
    author_id: str
    configuration_schema: Dict[str, Any] = {}  # JSON schema for configuration
    code: str  # Integration code/script
    language: str = "python"  # python, javascript, sql
    requirements: List[str] = []  # Dependencies
    endpoints: List[Dict[str, Any]] = []  # API endpoints this integration provides
    pricing_model: str = "free"  # free, paid, freemium
    price: float = 0.0
    install_count: int = 0
    rating: float = 0.0
    review_count: int = 0
    is_verified: bool = False
    is_active: bool = True
    tags: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IntegrationInstall(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    integration_id: str
    user_id: str
    configuration: Dict[str, Any] = {}
    is_active: bool = True
    install_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used: Optional[datetime] = None
    usage_count: int = 0

class IntegrationReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    integration_id: str
    user_id: str
    rating: int  # 1-5 stars
    review: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# E4: Advanced Analytics & Reporting Models
class AnalyticsDashboard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    user_id: str
    team_id: Optional[str] = None
    layout: Dict[str, Any] = {}  # Dashboard layout configuration
    widgets: List[Dict[str, Any]] = []  # Dashboard widgets
    filters: Dict[str, Any] = {}  # Global filters
    refresh_interval: int = 300  # Auto-refresh interval in seconds
    is_public: bool = False
    is_favorite: bool = False
    view_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReportTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    type: str  # pdf, excel, powerpoint, html, csv
    template_data: Dict[str, Any] = {}  # Template configuration
    parameters: List[Dict[str, Any]] = []  # Report parameters
    schedule: Optional[Dict[str, Any]] = None  # Scheduled report configuration
    recipients: List[str] = []  # Email recipients
    user_id: str
    is_active: bool = True
    last_generated: Optional[datetime] = None
    generation_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AnalyticsKPI(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    calculation: str  # SQL query or calculation formula
    target_value: Optional[float] = None
    unit: Optional[str] = None
    category: str = "general"  # sales, marketing, support, finance, operations
    frequency: str = "daily"  # hourly, daily, weekly, monthly
    threshold_config: Dict[str, Any] = {}  # Alert thresholds
    user_id: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PredictiveModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    model_type: str  # classification, regression, clustering, forecasting
    algorithm: str  # random_forest, linear_regression, neural_network, etc.
    features: List[str] = []  # Input features
    target: Optional[str] = None  # Target variable for supervised learning
    model_data: Dict[str, Any] = {}  # Serialized model and metadata
    accuracy_metrics: Dict[str, Any] = {}  # Model performance metrics
    training_data_size: int = 0
    last_trained: Optional[datetime] = None
    is_production: bool = False
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAgentCreate(BaseModel):
    name: str
    type: str
    provider: str = "openai"
    model: str = "gpt-4o"
    system_prompt: str
    temperature: float = 0.7
    max_tokens: int = 2000
    capabilities: List[str] = []
    user_id: str

# E3: Request Models
class CustomIntegrationCreate(BaseModel):
    name: str
    description: str
    category: str
    code: str
    language: str = "python"
    requirements: List[str] = []
    endpoints: List[Dict[str, Any]] = []
    configuration_schema: Dict[str, Any] = {}
    tags: List[str] = []
    author_id: str

class IntegrationInstallRequest(BaseModel):
    integration_id: str
    user_id: str
    configuration: Dict[str, Any] = {}

class IntegrationReviewCreate(BaseModel):
    integration_id: str
    user_id: str
    rating: int
    review: Optional[str] = None

# E4: Request Models
class DashboardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    user_id: str
    team_id: Optional[str] = None
    layout: Dict[str, Any] = {}
    widgets: List[Dict[str, Any]] = []
    filters: Dict[str, Any] = {}

class ReportTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str
    template_data: Dict[str, Any] = {}
    parameters: List[Dict[str, Any]] = []
    schedule: Optional[Dict[str, Any]] = None
    recipients: List[str] = []
    user_id: str

class KPICreate(BaseModel):
    name: str
    description: Optional[str] = None
    calculation: str
    target_value: Optional[float] = None
    unit: Optional[str] = None
    category: str = "general"
    frequency: str = "daily"
    threshold_config: Dict[str, Any] = {}
    user_id: str

class PredictiveModelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    model_type: str
    algorithm: str
    features: List[str] = []
    target: Optional[str] = None
    user_id: str

class WorkflowExecution(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    trigger_data: Dict[str, Any] = {}
    status: str = "pending"  # pending, running, completed, failed, cancelled
    current_node_id: Optional[str] = None
    execution_path: List[str] = []  # Node IDs in execution order
    results: Dict[str, Any] = {}
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    execution_time_ms: Optional[int] = None
    nodes_executed: int = 0
    nodes_failed: int = 0

class WorkflowMetrics(BaseModel):
    workflow_id: str
    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    average_execution_time_ms: float = 0.0
    last_24h_executions: int = 0
    success_rate: float = 0.0
    most_common_failure: Optional[str] = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request Models for Workflow Builder
class WorkflowCreate(BaseModel):
    user_id: str
    team_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    category: str = "general"
    template_id: Optional[str] = None

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    nodes: Optional[List[WorkflowNode]] = None
    connections: Optional[List[WorkflowConnection]] = None
    triggers: Optional[List[str]] = None
    is_active: Optional[bool] = None

class WorkflowExecuteRequest(BaseModel):
    workflow_id: str
    trigger_data: Dict[str, Any] = {}
    user_id: str

class NodeCreate(BaseModel):
    workflow_id: str
    type: str
    name: str
    description: Optional[str] = None
    position: Dict[str, float] = {"x": 0, "y": 0}
    configuration: Dict[str, Any] = {}

class NodeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    position: Optional[Dict[str, float]] = None
    configuration: Optional[Dict[str, Any]] = None
    inputs: Optional[List[str]] = None
    outputs: Optional[List[str]] = None

class ConnectionCreate(BaseModel):
    workflow_id: str
    source_node_id: str
    target_node_id: str
    source_port: str = "output"
    target_port: str = "input"
    condition: Optional[str] = None

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, str] = {}  # user_id -> session_id
    
    async def connect(self, websocket: WebSocket, user_id: str, session_id: str):
        await websocket.accept()
        connection_id = f"{user_id}_{session_id}"
        self.active_connections[connection_id] = websocket
        self.user_sessions[user_id] = session_id
        logging.info(f"User {user_id} connected to session {session_id}")
    
    def disconnect(self, user_id: str, session_id: str = None):
        if session_id:
            connection_id = f"{user_id}_{session_id}"
        else:
            # Find connection by user_id if session_id not provided
            connection_id = None
            for conn_id in self.active_connections:
                if conn_id.startswith(f"{user_id}_"):
                    connection_id = conn_id
                    break
        
        if connection_id and connection_id in self.active_connections:
            del self.active_connections[connection_id]
            if user_id in self.user_sessions:
                del self.user_sessions[user_id]
            logging.info(f"User {user_id} disconnected from session {session_id}")
    
    async def send_message(self, message: Dict, user_id: str, session_id: str):
        connection_id = f"{user_id}_{session_id}"
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(message))
                return True
            except Exception as e:
                logging.error(f"Error sending message to {connection_id}: {e}")
                self.disconnect(user_id, session_id)
                return False
        return False
    
    async def stream_response(self, response_generator, user_id: str, session_id: str):
        """Stream AI response chunks to client"""
        connection_id = f"{user_id}_{session_id}"
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                async for chunk in response_generator:
                    message = {
                        "type": "response_chunk",
                        "chunk": chunk,
                        "session_id": session_id
                    }
                    await websocket.send_text(json.dumps(message))
                
                # Send completion message
                completion_message = {
                    "type": "response_complete",
                    "session_id": session_id
                }
                await websocket.send_text(json.dumps(completion_message))
                return True
            except Exception as e:
                logging.error(f"Error streaming to {connection_id}: {e}")
                self.disconnect(user_id, session_id)
                return False
        return False

# Global connection manager
manager = ConnectionManager()

# AI Personality definitions
DEFAULT_PERSONALITIES = {
    "Professional Assistant": {
        "name": "Professional Assistant",
        "description": "A knowledgeable and efficient business assistant",
        "system_prompt": """You are modQ - a Modular Quantum Business Intelligence assistant. You are professional, efficient, and provide clear, actionable business advice. You focus on practical solutions and data-driven insights.""",
        "industry": None,
        "traits": ["Professional", "Efficient", "Data-driven", "Clear communication"]
    },
    "Strategic Advisor": {
        "name": "Strategic Advisor",
        "description": "A senior executive advisor focused on strategic planning and growth",
        "system_prompt": """You are a strategic business advisor with decades of executive experience. You think long-term, focus on competitive advantages, market positioning, and strategic growth opportunities. You provide high-level strategic insights and ask probing questions to help executives make better decisions.""",
        "industry": None,
        "traits": ["Strategic thinking", "Executive experience", "Market analysis", "Growth-focused"]
    },
    "Sales Manager": {
        "name": "Sales Manager",
        "description": "An experienced sales professional focused on revenue growth and customer relationships",
        "system_prompt": """You are an expert Sales Manager with extensive experience in B2B and B2C sales. You focus on pipeline management, customer relationships, closing techniques, and revenue optimization. You provide practical sales advice, help with objection handling, and suggest strategies to improve conversion rates.""",
        "industry": "Sales",
        "traits": ["Revenue-focused", "Customer-centric", "Results-driven", "Relationship building"]
    },
    "Tech Innovator": {
        "name": "Tech Innovator", 
        "description": "A technology expert focused on innovation and digital transformation",
        "system_prompt": """You are a technology innovation expert with deep knowledge of emerging technologies, digital transformation, and tech trends. You help businesses leverage technology for competitive advantage, suggest innovative solutions, and guide digital strategy decisions.""",
        "industry": "Technology",
        "traits": ["Innovation-focused", "Tech-savvy", "Future-thinking", "Problem solver"]
    },
    "Financial Analyst": {
        "name": "Financial Analyst",
        "description": "A finance expert focused on analysis, budgeting, and financial strategy",
        "system_prompt": """You are a senior Financial Analyst with expertise in financial modeling, budgeting, investment analysis, and business valuation. You provide data-driven financial insights, help with financial planning, and offer advice on cost optimization and investment decisions.""",
        "industry": "Finance",
        "traits": ["Analytical", "Detail-oriented", "Risk-aware", "Numbers-focused"]
    }
}

async def handle_streaming_chat(message_data: Dict, user_id: str, session_id: str):
    """Handle streaming chat messages with real-time AI responses"""
    try:
        message_text = message_data.get("message", "")
        personality = message_data.get("personality", "Professional Assistant")
        
        # Get or create conversation session
        conversation_session = await get_or_create_session(user_id, session_id)
        
        # Get user config and knowledge base
        user_config = await db.widget_configs.find_one({"user_id": user_id})
        kb_items = await db.knowledge_base.find({"user_id": user_id}).to_list(100)
        
        # Get recent chat history for context
        recent_chats = await db.chat_messages.find(
            {"user_id": user_id, "session_id": session_id}
        ).sort("timestamp", -1).limit(10).to_list(10)
        
        # Build context-aware system message
        system_message = build_personality_prompt(personality, user_config, kb_items, recent_chats)
        
        # Send typing indicator
        await manager.send_message({
            "type": "typing_start",
            "session_id": session_id
        }, user_id, session_id)
        
        # Initialize streaming LLM chat
        
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"modq-{user_id}-{session_id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        user_message = UserMessage(text=message_text)
        
        # Stream AI response
        response_chunks = []
        full_response = ""
        
        # Start streaming response
        await manager.send_message({
            "type": "response_start",
            "session_id": session_id,
            "message": message_text
        }, user_id, session_id)
        
        async def response_generator():
            nonlocal full_response
            response = await chat.send_message(user_message)
            full_response = response
            
            # Simulate streaming by chunking the response
            words = response.split()
            chunk_size = 3  # 3 words per chunk
            
            for i in range(0, len(words), chunk_size):
                chunk = " ".join(words[i:i + chunk_size])
                if i + chunk_size < len(words):
                    chunk += " "
                yield chunk
                await asyncio.sleep(0.1)  # Small delay for realistic streaming
        
        # Stream response to client
        await manager.stream_response(response_generator(), user_id, session_id)
        
        # Save complete message to database
        chat_obj = ChatMessage(
            user_id=user_id,
            session_id=session_id,
            message=message_text,
            response=full_response,
            ai_personality=personality,
            is_streaming=True
        )
        
        await db.chat_messages.insert_one(chat_obj.dict())
        
        # Update session
        await db.conversation_sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "updated_at": datetime.now(timezone.utc),
                    "message_count": await db.chat_messages.count_documents({"session_id": session_id})
                }
            }
        )
        
        # Send completion with message ID for rating
        await manager.send_message({
            "type": "message_complete",
            "session_id": session_id,
            "message_id": chat_obj.id,
            "full_response": full_response
        }, user_id, session_id)
        
    except Exception as e:
        logging.error(f"Streaming chat error: {str(e)}")
        await manager.send_message({
            "type": "error",
            "message": "Failed to process chat message",
            "session_id": session_id
        }, user_id, session_id)

async def handle_voice_transcription(message_data: Dict, user_id: str, session_id: str):
    """Handle voice transcription using OpenAI Whisper"""
    try:
        # Get audio data from message
        audio_data = message_data.get("audio_data")
        if not audio_data:
            await manager.send_message({
                "type": "transcription_error",
                "message": "No audio data provided",
                "session_id": session_id
            }, user_id, session_id)
            return

        # Initialize OpenAI client
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        
        # Convert base64 audio to bytes
        import base64
        audio_bytes = base64.b64decode(audio_data)
        
        # Create a temporary file for the audio
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe audio using OpenAI Whisper
            with open(temp_file_path, 'rb') as audio_file:
                transcript = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            # Send transcription result
            await manager.send_message({
                "type": "transcription_success",
                "transcript": transcript,
                "session_id": session_id
            }, user_id, session_id)
            
            logging.info(f"Voice transcription successful for user {user_id}")
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
    except Exception as e:
        logging.error(f"Voice transcription error: {str(e)}")
        await manager.send_message({
            "type": "transcription_error",
            "message": f"Failed to transcribe audio: {str(e)}",
            "session_id": session_id
        }, user_id, session_id)

async def handle_tts_request(message_data: Dict, user_id: str, session_id: str):
    """Handle text-to-speech requests using OpenAI TTS"""
    try:
        # Get text and voice settings from message
        text = message_data.get("text", "")
        voice = message_data.get("voice", "alloy")
        speed = message_data.get("speed", 1.0)
        
        if not text.strip():
            await manager.send_message({
                "type": "tts_error",
                "message": "No text provided for speech synthesis",
                "session_id": session_id
            }, user_id, session_id)
            return

        # Initialize OpenAI client
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        
        # Generate speech using OpenAI TTS
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            speed=speed
        )
        
        # Convert audio to base64
        audio_bytes = response.content
        import base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Send TTS result
        await manager.send_message({
            "type": "tts_success",
            "audio_data": audio_base64,
            "text": text,
            "voice": voice,
            "session_id": session_id
        }, user_id, session_id)
        
        logging.info(f"TTS generation successful for user {user_id}")
        
    except Exception as e:
        logging.error(f"TTS error: {str(e)}")
        await manager.send_message({
            "type": "tts_error",
            "message": f"Failed to generate speech: {str(e)}",
            "session_id": session_id
        }, user_id, session_id)

async def get_or_create_session(user_id: str, session_id: str):
    """Get existing session or create new one"""
    session = await db.conversation_sessions.find_one({"id": session_id})
    
    if not session:
        # Create new session
        new_session = ConversationSession(
            id=session_id,
            user_id=user_id,
            title="New Conversation"
        )
        await db.conversation_sessions.insert_one(new_session.dict())
        return new_session
    
    return ConversationSession(**session)

def build_personality_prompt(personality: str, user_config: Dict, kb_items: List, recent_chats: List) -> str:
    """Build context-aware system message based on personality and user context"""
    
    # Get personality definition
    personality_def = DEFAULT_PERSONALITIES.get(personality, DEFAULT_PERSONALITIES["Professional Assistant"])
    
    # Start with base personality prompt
    system_message = personality_def["system_prompt"]
    
    # Add company context if available
    if user_config:
        system_message += f"""

Company Context:
- Company: {user_config.get('company_name', 'Unknown')}
- Industry: {user_config.get('industry', 'General')}
- Current AI Personality: {personality}

Key Personality Traits: {', '.join(personality_def['traits'])}
"""

    # Add knowledge base context
    if kb_items:
        system_message += f"""

Company Knowledge Base:
{chr(10).join([f"- {item['title']}: {item['content'][:200]}..." for item in kb_items[:5]])}
"""

    # Add conversation context
    if recent_chats:
        system_message += f"""

Recent Conversation Context:
{chr(10).join([f"User: {chat['message']}" for chat in reversed(recent_chats[-3:])])}
"""

    system_message += """

Instructions:
- Maintain your personality throughout the conversation
- Provide practical, actionable advice specific to the user's industry and company context
- Reference the knowledge base when relevant to provide personalized insights  
- Be conversational and engaging while staying professional
- Focus on business value and ROI in your recommendations
- Ask follow-up questions to better understand the user's specific needs
"""

    return system_message

# F3: Security - Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register_user(user_data: UserRegister):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=409, detail="User already exists")
        
        # Hash password
        password_hash = get_password_hash(user_data.password)
        
        # Create user
        user = User(
            username=user_data.username,
            email=user_data.email,
            role=user_data.role,
            password_hash=password_hash
        )
        
        await db.users.insert_one(user.dict())
        
        # Create access token
        access_token = create_access_token(data={"sub": user.id})
        
        # Create session
        session = UserSession(
            user_id=user.id,
            token=access_token,
            expires_at=datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        )
        await db.user_sessions.insert_one(session.dict())
        
        logging.info(f"User registered: {user.email}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=JWT_EXPIRATION_HOURS * 3600,
            user_id=user.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to register user")

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    """Authenticate user and return token"""
    try:
        # Find user
        user = await db.users.find_one({"email": user_data.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check if account is locked
        if user.get("locked_until") and datetime.utcnow() < user["locked_until"]:
            raise HTTPException(status_code=423, detail="Account temporarily locked")
        
        # Verify password
        if not verify_password(user_data.password, user.get("password_hash", "")):
            # Increment failed attempts
            failed_attempts = user.get("failed_login_attempts", 0) + 1
            update_data = {"failed_login_attempts": failed_attempts}
            
            # Lock account after 5 failed attempts
            if failed_attempts >= 5:
                update_data["locked_until"] = datetime.utcnow() + timedelta(minutes=30)
            
            await db.users.update_one({"id": user["id"]}, {"$set": update_data})
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Reset failed attempts on successful login
        await db.users.update_one(
            {"id": user["id"]}, 
            {
                "$set": {
                    "failed_login_attempts": 0,
                    "last_login": datetime.utcnow(),
                    "locked_until": None
                }
            }
        )
        
        # Create access token
        access_token = create_access_token(data={"sub": user["id"]})
        
        # Create session
        session = UserSession(
            user_id=user["id"],
            token=access_token,
            expires_at=datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
        )
        await db.user_sessions.insert_one(session.dict())
        
        logging.info(f"User logged in: {user['email']}")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=JWT_EXPIRATION_HOURS * 3600,
            user_id=user["id"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to authenticate user")

@api_router.post("/auth/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
    """Logout user and invalidate session"""
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Invalidate all user sessions
        await db.user_sessions.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_active": False}}
        )
        
        logging.info(f"User logged out: {current_user['email']}")
        return {"message": "Successfully logged out"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Logout error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to logout user")

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Remove sensitive fields
    user_data = current_user.copy()
    user_data.pop("password_hash", None)
    return User(**user_data)

@api_router.post("/auth/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Verify current password
        if not verify_password(password_data.current_password, current_user.get("password_hash", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash new password
        new_password_hash = get_password_hash(password_data.new_password)
        
        # Update password
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"password_hash": new_password_hash}}
        )
        
        # Invalidate all sessions except current
        await db.user_sessions.update_many(
            {"user_id": current_user["id"]},
            {"$set": {"is_active": False}}
        )
        
        logging.info(f"Password changed for user: {current_user['email']}")
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Change password error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to change password")

# F1: Performance - Monitoring Routes
@api_router.get("/performance/metrics")
async def get_performance_metrics(current_user: dict = Depends(get_current_user)):
    """Get system performance metrics"""
    try:
        if not current_user or current_user.get("role") not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get recent performance metrics
        metrics = await db.performance_metrics.find().sort("timestamp", -1).limit(100).to_list(100)
        
        # Calculate averages
        if metrics:
            avg_response_time = sum(m["response_time_ms"] for m in metrics) / len(metrics)
            error_rate = len([m for m in metrics if m["status_code"] >= 400]) / len(metrics) * 100
        else:
            avg_response_time = 0
            error_rate = 0
        
        return {
            "average_response_time_ms": avg_response_time,
            "error_rate_percent": error_rate,
            "total_requests": len(metrics),
            "recent_metrics": metrics[:20]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Performance metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve performance metrics")

@api_router.get("/performance/cache-stats")
async def get_cache_stats(current_user: dict = Depends(get_current_user)):
    """Get cache performance statistics"""
    try:
        if not current_user or current_user.get("role") not in ["admin", "owner"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if not redis_client:
            return {"message": "Cache not available", "stats": {}}
        
        # Get cache info from Redis
        info = await redis_client.info()
        
        return {
            "connected_clients": info.get("connected_clients", 0),
            "used_memory": info.get("used_memory_human", "0B"),
            "keyspace_hits": info.get("keyspace_hits", 0),
            "keyspace_misses": info.get("keyspace_misses", 0),
            "hit_rate": info.get("keyspace_hits", 0) / max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1) * 100
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Cache stats error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve cache statistics")

# Conversation session management routes
@api_router.post("/sessions/new", response_model=ConversationSession)
async def create_new_session(user_id: str):
    """Create a new conversation session"""
    try:
        session = ConversationSession(user_id=user_id)
        await db.conversation_sessions.insert_one(session.dict())
        return session
    except Exception as e:
        logging.error(f"Session creation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@api_router.get("/sessions/{user_id}", response_model=List[ConversationSession])
async def get_user_sessions(user_id: str):
    """Get all conversation sessions for a user"""
    try:
        sessions = await db.conversation_sessions.find(
            {"user_id": user_id}
        ).sort("updated_at", -1).to_list(50)
        return [ConversationSession(**session) for session in sessions]
    except Exception as e:
        logging.error(f"Session retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sessions")

@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a conversation session and its messages"""
    try:
        # Delete session messages
        await db.chat_messages.delete_many({"session_id": session_id})
        
        # Delete session
        result = await db.conversation_sessions.delete_one({"id": session_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {"status": "success", "message": "Session deleted"}
    except Exception as e:
        logging.error(f"Session deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

# AI Personalities routes
@api_router.get("/personalities")
async def get_ai_personalities():
    """Get available AI personalities"""
    try:
        return {
            "personalities": DEFAULT_PERSONALITIES,
            "default": "Professional Assistant"
        }
    except Exception as e:
        logging.error(f"Personalities retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve personalities")

# Enhanced chat routes with session support
@api_router.get("/chat/history/{user_id}", response_model=List[ChatMessage])
async def get_chat_history(user_id: str, session_id: Optional[str] = None, limit: int = 50):
    """Get chat history for user, optionally filtered by session"""
    try:
        query = {"user_id": user_id}
        if session_id:
            query["session_id"] = session_id
            
        messages = await db.chat_messages.find(query).sort("timestamp", -1).limit(limit).to_list(limit)
        return [ChatMessage(**msg) for msg in messages]
    except Exception as e:
        logging.error(f"Chat history error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve chat history")

# Voice-related REST endpoints for fallback
@api_router.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...), user_id: str = ""):
    """Transcribe audio file using OpenAI Whisper"""
    try:
        # Validate file type
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        
        # Initialize OpenAI client
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        
        # Read file content
        audio_content = await file.read()
        
        # Create temporary file for OpenAI API
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe using OpenAI Whisper
            with open(temp_file_path, 'rb') as audio_file:
                transcript = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            logging.info(f"Voice transcription successful for user {user_id}")
            return {"transcript": transcript, "user_id": user_id}
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to transcribe audio: {str(e)}")

@api_router.post("/voice/synthesize")
async def synthesize_speech(request: TTSRequest):
    """Generate speech from text using OpenAI TTS"""
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text is required for speech synthesis")
        
        # Initialize OpenAI client
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        
        # Generate speech
        response = await client.audio.speech.create(
            model="tts-1",
            voice=request.voice,
            input=request.text,
            speed=request.speed
        )
        
        # Return audio as streaming response
        from fastapi.responses import StreamingResponse
        import io
        
        def generate():
            yield response.content
        
        logging.info(f"TTS generation successful for user {request.user_id}")
        
        return StreamingResponse(
            io.BytesIO(response.content),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=speech.mp3"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate speech: {str(e)}")

# Integration Management routes
@api_router.get("/integrations/user/{user_id}", response_model=List[UserIntegration])
async def get_user_integrations(user_id: str):
    """Get all integrations for a specific user"""
    try:
        integrations = await db.user_integrations.find({"user_id": user_id}).to_list(100)
        return [UserIntegration(**integration) for integration in integrations]
    except Exception as e:
        logging.error(f"Get user integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user integrations")

@api_router.post("/integrations/connect", response_model=UserIntegration)
async def connect_integration(integration_request: IntegrationConnect):
    """Connect a new integration for a user"""
    try:
        # Check if integration already exists
        existing = await db.user_integrations.find_one({
            "user_id": integration_request.user_id,
            "integration_id": integration_request.integration_id
        })
        
        if existing:
            raise HTTPException(status_code=409, detail="Integration already exists")
        
        # Create new integration record
        integration = UserIntegration(
            user_id=integration_request.user_id,
            integration_id=integration_request.integration_id,
            integration_name=integration_request.integration_name,
            configuration=integration_request.configuration,
            status="connecting"
        )
        
        await db.user_integrations.insert_one(integration.dict())
        
        # In a real implementation, this would initiate the OAuth flow or API connection
        # For demo purposes, we'll simulate a successful connection after a delay
        
        logging.info(f"User {integration_request.user_id} connecting to {integration_request.integration_name}")
        
        return integration
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Connect integration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to connect integration")

@api_router.delete("/integrations/disconnect")
async def disconnect_integration(integration_request: IntegrationDisconnect):
    """Disconnect an integration for a user"""
    try:
        result = await db.user_integrations.delete_one({
            "user_id": integration_request.user_id,
            "integration_id": integration_request.integration_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        logging.info(f"User {integration_request.user_id} disconnected from {integration_request.integration_id}")
        
        return {"status": "success", "message": "Integration disconnected"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Disconnect integration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to disconnect integration")

@api_router.post("/integrations/sync/{integration_id}")
async def sync_integration(integration_id: str, user_id: str):
    """Manually trigger synchronization for an integration"""
    try:
        integration = await db.user_integrations.find_one({
            "user_id": user_id,
            "integration_id": integration_id
        })
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        if integration["status"] != "connected":
            raise HTTPException(status_code=400, detail="Integration is not connected")
        
        # Update last sync time
        await db.user_integrations.update_one(
            {"user_id": user_id, "integration_id": integration_id},
            {"$set": {"last_sync": datetime.now(timezone.utc)}}
        )
        
        # In a real implementation, this would trigger the actual sync process
        logging.info(f"Sync triggered for integration {integration_id} by user {user_id}")
        
        return {"status": "success", "message": "Sync initiated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Sync integration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to sync integration")

@api_router.get("/integrations/available")
async def get_available_integrations():
    """Get list of available integrations in the marketplace"""
    try:
        # In a real implementation, this would come from a database
        # For now, returning static data that matches the frontend
        available_integrations = [
            {
                "id": "slack",
                "name": "Slack",
                "category": "communication",
                "description": "Connect your team communication with AI-powered insights and automated responses.",
                "pricing": "Free",
                "popularity": 5,
                "setup_complexity": "Easy",
                "status": "available"
            },
            {
                "id": "salesforce",
                "name": "Salesforce",
                "category": "crm", 
                "description": "Sync customer data and leverage AI insights for better sales performance.",
                "pricing": "Premium",
                "popularity": 5,
                "setup_complexity": "Medium",
                "status": "available"
            },
            {
                "id": "google-workspace",
                "name": "Google Workspace",
                "category": "productivity",
                "description": "Integrate with Gmail, Drive, Calendar, and other Google services.",
                "pricing": "Free",
                "popularity": 4,
                "setup_complexity": "Easy",
                "status": "available"
            },
            {
                "id": "microsoft-365",
                "name": "Microsoft 365",
                "category": "productivity",
                "description": "Connect with Outlook, Teams, OneDrive, and Office applications.",
                "pricing": "Free",
                "popularity": 4,
                "setup_complexity": "Easy", 
                "status": "available"
            },
            {
                "id": "stripe",
                "name": "Stripe",
                "category": "payments",
                "description": "Payment processing with AI-powered fraud detection and revenue insights.",
                "pricing": "Per transaction",
                "popularity": 5,
                "setup_complexity": "Medium",
                "status": "available"
            },
            {
                "id": "zapier",
                "name": "Zapier", 
                "category": "automation",
                "description": "Connect modQ with 5000+ apps through automated workflows.",
                "pricing": "Freemium",
                "popularity": 4,
                "setup_complexity": "Easy",
                "status": "available"
            }
        ]
        
        return {"integrations": available_integrations}
        
    except Exception as e:
        logging.error(f"Get available integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve available integrations")

# Team Collaboration routes
@api_router.post("/teams/create", response_model=Team)
async def create_team(team_data: TeamCreate):
    """Create a new team workspace"""
    try:
        team = Team(**team_data.dict())
        await db.teams.insert_one(team.dict())
        
        # Create team owner membership
        owner_member = TeamMember(
            team_id=team.id,
            user_id=team.owner_id,
            role="owner",
            permissions={
                "can_invite_members": True,
                "can_manage_integrations": True,
                "can_edit_team_settings": True,
                "can_view_analytics": True,
                "can_create_shared_sessions": True,
                "can_access_all_conversations": True
            }
        )
        await db.team_members.insert_one(owner_member.dict())
        
        # Log team creation activity
        activity = TeamActivity(
            team_id=team.id,
            user_id=team.owner_id,
            activity_type="team_created",
            description=f"Created team '{team.name}'",
            metadata={"team_name": team.name}
        )
        await db.team_activities.insert_one(activity.dict())
        
        logging.info(f"Team '{team.name}' created by user {team.owner_id}")
        return team
        
    except Exception as e:
        logging.error(f"Create team error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create team")

@api_router.get("/teams/user/{user_id}", response_model=List[Team])
async def get_user_teams(user_id: str):
    """Get all teams for a user"""
    try:
        # Find teams where user is a member
        memberships = await db.team_members.find({"user_id": user_id, "status": "active"}).to_list(100)
        team_ids = [membership["team_id"] for membership in memberships]
        
        if not team_ids:
            return []
        
        teams = await db.teams.find({"id": {"$in": team_ids}, "is_active": True}).to_list(100)
        return [Team(**team) for team in teams]
        
    except Exception as e:
        logging.error(f"Get user teams error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user teams")

@api_router.get("/teams/{team_id}/members", response_model=List[TeamMember])
async def get_team_members(team_id: str):
    """Get all members of a team"""
    try:
        members = await db.team_members.find({"team_id": team_id}).to_list(100)
        return [TeamMember(**member) for member in members]
        
    except Exception as e:
        logging.error(f"Get team members error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve team members")

@api_router.post("/teams/invite", response_model=TeamInvitation)
async def invite_team_member(invite_data: TeamInviteRequest):
    """Invite a new member to the team"""
    try:
        # Check if user has permission to invite
        inviter_member = await db.team_members.find_one({
            "team_id": invite_data.team_id,
            "user_id": invite_data.inviter_id,
            "status": "active"
        })
        
        if not inviter_member or not inviter_member.get("permissions", {}).get("can_invite_members", False):
            raise HTTPException(status_code=403, detail="No permission to invite members")
        
        # Check if email is already invited or user is already a member
        existing_invite = await db.team_invitations.find_one({
            "team_id": invite_data.team_id,
            "email": invite_data.email,
            "status": "pending"
        })
        
        if existing_invite:
            raise HTTPException(status_code=409, detail="User already invited")
        
        # Check if user with this email is already a team member
        user_with_email = await db.users.find_one({"email": invite_data.email})
        if user_with_email:
            existing_member = await db.team_members.find_one({
                "team_id": invite_data.team_id,
                "user_id": user_with_email["id"]
            })
            if existing_member:
                raise HTTPException(status_code=409, detail="User is already a team member")
        
        # Create invitation
        invitation = TeamInvitation(**invite_data.dict())
        await db.team_invitations.insert_one(invitation.dict())
        
        # Log activity
        activity = TeamActivity(
            team_id=invite_data.team_id,
            user_id=invite_data.inviter_id,
            activity_type="member_invited",
            description=f"Invited {invite_data.email} as {invite_data.role}",
            metadata={"email": invite_data.email, "role": invite_data.role}
        )
        await db.team_activities.insert_one(activity.dict())
        
        # In a real implementation, this would send an email invitation
        logging.info(f"Invitation sent to {invite_data.email} for team {invite_data.team_id}")
        
        return invitation
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Invite team member error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send invitation")

@api_router.post("/teams/accept-invite/{invitation_id}")
async def accept_team_invitation(invitation_id: str, user_id: str):
    """Accept a team invitation"""
    try:
        # Get invitation
        invitation = await db.team_invitations.find_one({"id": invitation_id})
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found")
        
        if invitation["status"] != "pending":
            raise HTTPException(status_code=400, detail="Invitation is not pending")
        
        # Handle timezone comparison properly
        expires_at = invitation["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        elif expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invitation has expired")
        
        # Get user info
        user = await db.users.find_one({"id": user_id})
        if not user or user["email"] != invitation["email"]:
            raise HTTPException(status_code=403, detail="Invitation is not for this user")
        
        # Create team member
        permissions = {
            "can_invite_members": invitation["role"] in ["owner", "admin"],
            "can_manage_integrations": invitation["role"] in ["owner", "admin", "manager"],
            "can_edit_team_settings": invitation["role"] in ["owner", "admin"],
            "can_view_analytics": True,
            "can_create_shared_sessions": True,
            "can_access_all_conversations": invitation["role"] in ["owner", "admin", "manager"]
        }
        
        member = TeamMember(
            team_id=invitation["team_id"],
            user_id=user_id,
            role=invitation["role"],
            permissions=permissions
        )
        await db.team_members.insert_one(member.dict())
        
        # Update invitation status
        await db.team_invitations.update_one(
            {"id": invitation_id},
            {
                "$set": {
                    "status": "accepted",
                    "accepted_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Log activity
        activity = TeamActivity(
            team_id=invitation["team_id"],
            user_id=user_id,
            activity_type="member_joined",
            description=f"{user['username']} joined the team as {invitation['role']}",
            metadata={"username": user["username"], "role": invitation["role"]}
        )
        await db.team_activities.insert_one(activity.dict())
        
        logging.info(f"User {user_id} accepted invitation to team {invitation['team_id']}")
        
        return {"status": "success", "message": "Invitation accepted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Accept invitation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to accept invitation")

@api_router.get("/teams/{team_id}/shared-conversations", response_model=List[SharedConversation])
async def get_shared_conversations(team_id: str, user_id: str):
    """Get shared conversations for a team"""
    try:
        # Verify user is team member
        member = await db.team_members.find_one({
            "team_id": team_id,
            "user_id": user_id,
            "status": "active"
        })
        
        if not member:
            raise HTTPException(status_code=403, detail="Not a team member")
        
        # Get shared conversations
        conversations = await db.shared_conversations.find({"team_id": team_id}).to_list(100)
        
        # Filter based on permissions and visibility
        filtered_conversations = []
        for conv in conversations:
            if conv["is_public"] or user_id in conv["participants"] or member["permissions"]["can_access_all_conversations"]:
                filtered_conversations.append(conv)
        
        return [SharedConversation(**conv) for conv in filtered_conversations]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get shared conversations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve shared conversations")

@api_router.post("/teams/shared-conversations/create", response_model=SharedConversation)
async def create_shared_conversation(conversation_data: SharedConversationCreate):
    """Create a shared conversation for the team"""
    try:
        # Verify user can create shared sessions
        member = await db.team_members.find_one({
            "team_id": conversation_data.team_id,
            "user_id": conversation_data.creator_id,
            "status": "active"
        })
        
        if not member or not member["permissions"]["can_create_shared_sessions"]:
            raise HTTPException(status_code=403, detail="No permission to create shared sessions")
        
        shared_conv = SharedConversation(**conversation_data.dict())
        shared_conv.participants = [conversation_data.creator_id]  # Creator is initial participant
        
        await db.shared_conversations.insert_one(shared_conv.dict())
        
        # Log activity
        activity = TeamActivity(
            team_id=conversation_data.team_id,
            user_id=conversation_data.creator_id,
            activity_type="shared_conversation_created",
            description=f"Created shared conversation '{shared_conv.title}'",
            metadata={"conversation_title": shared_conv.title, "session_id": shared_conv.session_id}
        )
        await db.team_activities.insert_one(activity.dict())
        
        return shared_conv
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create shared conversation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create shared conversation")

@api_router.get("/teams/{team_id}/activities", response_model=List[TeamActivity])
async def get_team_activities(team_id: str, user_id: str, limit: int = 50):
    """Get team activity feed"""
    try:
        # Verify user is team member
        member = await db.team_members.find_one({
            "team_id": team_id,
            "user_id": user_id,
            "status": "active"
        })
        
        if not member:
            raise HTTPException(status_code=403, detail="Not a team member")
        
        activities = await db.team_activities.find(
            {"team_id": team_id}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return [TeamActivity(**activity) for activity in activities]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get team activities error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve team activities")

@api_router.get("/teams/{team_id}/analytics")
async def get_team_analytics(team_id: str, user_id: str):
    """Get team analytics and usage metrics"""
    try:
        # Verify user can view analytics
        member = await db.team_members.find_one({
            "team_id": team_id,
            "user_id": user_id,
            "status": "active"
        })
        
        if not member or not member["permissions"]["can_view_analytics"]:
            raise HTTPException(status_code=403, detail="No permission to view analytics")
        
        # Get team statistics
        team_members_count = await db.team_members.count_documents({"team_id": team_id, "status": "active"})
        shared_conversations_count = await db.shared_conversations.count_documents({"team_id": team_id})
        
        # Get recent activities count
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_activities = await db.team_activities.count_documents({
            "team_id": team_id,
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Get member roles breakdown
        members = await db.team_members.find({"team_id": team_id, "status": "active"}).to_list(100)
        role_breakdown = {}
        for member in members:
            role = member.get("role", "employee")
            role_breakdown[role] = role_breakdown.get(role, 0) + 1
        
        analytics = {
            "team_id": team_id,
            "members_count": team_members_count,
            "shared_conversations_count": shared_conversations_count,
            "recent_activities_count": recent_activities,
            "role_breakdown": role_breakdown,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get team analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve team analytics")

# White-Label Customization routes
@api_router.post("/branding/create", response_model=BrandCustomization)
async def create_brand_customization(brand_data: BrandCustomizationCreate):
    """Create brand customization for user or team"""
    try:
        brand_customization = BrandCustomization(**brand_data.dict())
        await db.brand_customizations.insert_one(brand_customization.dict())
        
        logging.info(f"Brand customization created for user {brand_data.user_id or 'system'}")
        return brand_customization
        
    except Exception as e:
        logging.error(f"Create brand customization error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create brand customization")

@api_router.get("/branding/user/{user_id}", response_model=BrandCustomization)
async def get_user_branding(user_id: str):
    """Get brand customization for a user"""
    try:
        # First check for user-specific branding
        branding = await db.brand_customizations.find_one({
            "user_id": user_id,
            "is_active": True
        })
        
        if not branding:
            # Check for team-specific branding
            user_teams = await db.team_members.find({"user_id": user_id, "status": "active"}).to_list(10)
            for membership in user_teams:
                team_branding = await db.brand_customizations.find_one({
                    "team_id": membership["team_id"],
                    "is_active": True
                })
                if team_branding:
                    branding = team_branding
                    break
        
        if not branding:
            # Return system default branding
            branding = {
                "id": "system-default",
                "user_id": None,
                "team_id": None,
                "organization_name": "modQ",
                "logo_url": None,
                "favicon_url": None,
                "primary_color": "#3b82f6",
                "secondary_color": "#8b5cf6",
                "accent_color": "#10b981",
                "background_color": "#000000",
                "text_color": "#ffffff",
                "border_color": "#374151",
                "theme_mode": "dark",
                "custom_css": None,
                "welcome_message": "Welcome to your AI-powered business intelligence platform",
                "tagline": "Modular Quantum Business Intelligence",
                "footer_text": "Powered by modQ",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "is_active": True
            }
        
        return BrandCustomization(**branding)
        
    except Exception as e:
        logging.error(f"Get user branding error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve brand customization")

@api_router.put("/branding/{branding_id}", response_model=BrandCustomization)
async def update_brand_customization(branding_id: str, brand_updates: BrandCustomizationUpdate):
    """Update brand customization"""
    try:
        # Get existing branding
        existing_branding = await db.brand_customizations.find_one({"id": branding_id})
        if not existing_branding:
            raise HTTPException(status_code=404, detail="Brand customization not found")
        
        # Update fields
        update_data = {k: v for k, v in brand_updates.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.brand_customizations.update_one(
            {"id": branding_id},
            {"$set": update_data}
        )
        
        # Get updated branding
        updated_branding = await db.brand_customizations.find_one({"id": branding_id})
        
        logging.info(f"Brand customization {branding_id} updated")
        return BrandCustomization(**updated_branding)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update brand customization error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update brand customization")

@api_router.post("/branding/upload-logo")
async def upload_logo(file: UploadFile = File(...), user_id: str = "", branding_id: str = ""):
    """Upload logo for brand customization"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Check file size (max 5MB)
        file_size = 0
        content = await file.read()
        file_size = len(content)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="File size must be less than 5MB")
        
        # Save file (in production, this would upload to cloud storage)
        import hashlib
        file_hash = hashlib.md5(content).hexdigest()
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        filename = f"logo_{user_id}_{file_hash}.{file_extension}"
        
        # Create uploads directory if it doesn't exist
        upload_dir = Path("/tmp/uploads")
        upload_dir.mkdir(exist_ok=True)
        
        file_path = upload_dir / filename
        
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Generate URL (in production, this would be a CDN URL)
        logo_url = f"/uploads/{filename}"
        
        # Update branding if branding_id provided
        if branding_id:
            await db.brand_customizations.update_one(
                {"id": branding_id},
                {
                    "$set": {
                        "logo_url": logo_url,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        logging.info(f"Logo uploaded for user {user_id}: {logo_url}")
        
        return LogoUploadResponse(
            success=True,
            logo_url=logo_url,
            message="Logo uploaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Logo upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload logo")

@api_router.get("/themes/presets")
async def get_theme_presets():
    """Get available theme presets"""
    try:
        # System theme presets
        presets = [
            {
                "id": "modq-dark",
                "name": "modQ Dark",
                "description": "Default dark theme with blue and purple accents",
                "primary_color": "#3b82f6",
                "secondary_color": "#8b5cf6",
                "accent_color": "#10b981",
                "background_color": "#000000",
                "text_color": "#ffffff",
                "border_color": "#374151",
                "theme_mode": "dark",
                "preview_image": "/themes/modq-dark-preview.png",
                "is_system_preset": True
            },
            {
                "id": "modq-light",
                "name": "modQ Light",
                "description": "Clean light theme for bright environments",
                "primary_color": "#2563eb",
                "secondary_color": "#7c3aed",
                "accent_color": "#059669",
                "background_color": "#ffffff",
                "text_color": "#111827",
                "border_color": "#e5e7eb",
                "theme_mode": "light",
                "preview_image": "/themes/modq-light-preview.png",
                "is_system_preset": True
            },
            {
                "id": "corporate-blue",
                "name": "Corporate Blue",
                "description": "Professional blue theme for corporate environments",
                "primary_color": "#1e40af",
                "secondary_color": "#3b82f6",
                "accent_color": "#0ea5e9",
                "background_color": "#0f172a",
                "text_color": "#f8fafc",
                "border_color": "#334155",
                "theme_mode": "dark",
                "preview_image": "/themes/corporate-blue-preview.png",
                "is_system_preset": True
            },
            {
                "id": "emerald-professional",
                "name": "Emerald Professional",
                "description": "Sophisticated green theme for modern businesses",
                "primary_color": "#059669",
                "secondary_color": "#10b981",
                "accent_color": "#34d399",
                "background_color": "#064e3b",
                "text_color": "#ecfdf5",
                "border_color": "#065f46",
                "theme_mode": "dark",
                "preview_image": "/themes/emerald-professional-preview.png",
                "is_system_preset": True
            },
            {
                "id": "sunset-orange",
                "name": "Sunset Orange",
                "description": "Warm orange theme for creative teams",
                "primary_color": "#ea580c",
                "secondary_color": "#f97316",
                "accent_color": "#fb923c",
                "background_color": "#7c2d12",
                "text_color": "#fff7ed",
                "border_color": "#9a3412",
                "theme_mode": "dark",
                "preview_image": "/themes/sunset-orange-preview.png",
                "is_system_preset": True
            },
            {
                "id": "royal-purple",
                "name": "Royal Purple",
                "description": "Elegant purple theme for premium brands",
                "primary_color": "#7c3aed",
                "secondary_color": "#8b5cf6",
                "accent_color": "#a78bfa",
                "background_color": "#3c1361",
                "text_color": "#faf5ff",
                "border_color": "#581c87",
                "theme_mode": "dark",
                "preview_image": "/themes/royal-purple-preview.png",
                "is_system_preset": True
            }
        ]
        
        # Get custom presets from database
        custom_presets = await db.theme_presets.find({"is_system_preset": False}).to_list(50)
        
        all_presets = presets + [ThemePreset(**preset).dict() for preset in custom_presets]
        
        return {"presets": all_presets}
        
    except Exception as e:
        logging.error(f"Get theme presets error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve theme presets")

@api_router.post("/domains/create", response_model=CustomDomain)
async def create_custom_domain(domain_data: CustomDomainCreate):
    """Create custom domain configuration"""
    try:
        # Validate domain name format
        import re
        domain_pattern = r'^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})$'
        
        if not re.match(domain_pattern, domain_data.domain_name):
            raise HTTPException(status_code=400, detail="Invalid domain name format")
        
        # Check if domain already exists
        existing_domain = await db.custom_domains.find_one({"domain_name": domain_data.domain_name})
        if existing_domain:
            raise HTTPException(status_code=409, detail="Domain already configured")
        
        custom_domain = CustomDomain(**domain_data.dict())
        await db.custom_domains.insert_one(custom_domain.dict())
        
        logging.info(f"Custom domain created: {domain_data.domain_name} for user {domain_data.user_id}")
        return custom_domain
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create custom domain error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create custom domain")

@api_router.get("/domains/user/{user_id}", response_model=List[CustomDomain])
async def get_user_domains(user_id: str):
    """Get custom domains for a user"""
    try:
        domains = await db.custom_domains.find({"user_id": user_id}).to_list(50)
        return [CustomDomain(**domain) for domain in domains]
        
    except Exception as e:
        logging.error(f"Get user domains error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user domains")

@api_router.post("/white-label/create", response_model=WhiteLabelConfig)
async def create_white_label_config(config_data: WhiteLabelConfigCreate):
    """Create white-label configuration"""
    try:
        # Create brand customization first with proper defaults
        brand_data = BrandCustomizationCreate(
            user_id=config_data.user_id,
            organization_name=config_data.organization_name,
            primary_color="#3b82f6",  # Default blue
            secondary_color="#8b5cf6",  # Default purple
            accent_color="#10b981",  # Default green
            welcome_message="Welcome to your AI-powered business intelligence platform",
            tagline="Modular Quantum Business Intelligence"
        )
        brand_response = await create_brand_customization(brand_data)
        
        # Create white-label config
        white_label_config = WhiteLabelConfig(
            **config_data.dict(),
            brand_customization_id=brand_response.id
        )
        
        await db.white_label_configs.insert_one(white_label_config.dict())
        
        logging.info(f"White-label config created for user {config_data.user_id}")
        return white_label_config
        
    except Exception as e:
        logging.error(f"Create white-label config error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create white-label configuration")

@api_router.get("/white-label/user/{user_id}", response_model=WhiteLabelConfig)
async def get_user_white_label_config(user_id: str):
    """Get white-label configuration for a user"""
    try:
        config = await db.white_label_configs.find_one({"user_id": user_id})
        
        if not config:
            raise HTTPException(status_code=404, detail="White-label configuration not found")
        
        return WhiteLabelConfig(**config)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get white-label config error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve white-label configuration")

# Workflow Builder routes
# E1: Enhanced Workflow Automation - Advanced Node Types
def get_enhanced_node_types():
    """Get enhanced workflow node types with advanced capabilities"""
    return [
        {
            "type": "trigger",
            "name": "Trigger Node",
            "description": "Starts workflow execution",
            "category": "core",
            "inputs": [],
            "outputs": ["output"],
            "subtypes": ["webhook", "schedule", "email", "form_submission", "api_event"]
        },
        {
            "type": "condition",
            "name": "Condition Node", 
            "description": "Conditional logic branching",
            "category": "core",
            "inputs": ["input"],
            "outputs": ["true", "false"],
            "subtypes": ["simple_condition", "complex_condition", "multi_condition"]
        },
        {
            "type": "ai_response",
            "name": "AI Response Node",
            "description": "AI-powered processing and responses",
            "category": "ai",
            "inputs": ["input"],
            "outputs": ["output"],
            "subtypes": ["text_generation", "data_analysis", "classification", "summarization"]
        },
        {
            "type": "database",
            "name": "Database Node",
            "description": "Database operations (read, write, update, delete)",
            "category": "data",
            "inputs": ["input"],
            "outputs": ["output", "error"],
            "subtypes": ["query", "insert", "update", "delete", "bulk_operation"]
        },
        {
            "type": "api_call",
            "name": "API Call Node",
            "description": "External API integrations",
            "category": "integration",
            "inputs": ["input"],
            "outputs": ["output", "error"],
            "subtypes": ["rest_api", "graphql", "webhook", "soap"]
        },
        {
            "type": "loop",
            "name": "Loop Node",
            "description": "Iterate over data collections",
            "category": "control",
            "inputs": ["input", "collection"],
            "outputs": ["item", "complete"],
            "subtypes": ["for_each", "while_loop", "do_while"]
        },
        {
            "type": "parallel",
            "name": "Parallel Node",
            "description": "Execute multiple branches simultaneously",
            "category": "control",
            "inputs": ["input"],
            "outputs": ["branch_1", "branch_2", "branch_3"],
            "subtypes": ["parallel_execution", "race_condition", "all_complete"]
        },
        {
            "type": "timer",
            "name": "Timer Node",
            "description": "Time-based delays and scheduling",
            "category": "control",
            "inputs": ["input"],
            "outputs": ["output"],
            "subtypes": ["delay", "schedule", "timeout", "recurring"]
        },
        {
            "type": "notification",
            "name": "Notification Node",
            "description": "Send notifications (email, SMS, push)",
            "category": "communication",
            "inputs": ["input"],
            "outputs": ["output", "error"],
            "subtypes": ["email", "sms", "push_notification", "slack", "webhook"]
        },
        {
            "type": "data_transform",
            "name": "Data Transform Node",
            "description": "Transform and manipulate data",
            "category": "data",
            "inputs": ["input"],
            "outputs": ["output"],
            "subtypes": ["map", "filter", "reduce", "format", "validate"]
        },
        {
            "type": "script",
            "name": "Script Node",
            "description": "Execute custom JavaScript/Python code",
            "category": "advanced",
            "inputs": ["input"],
            "outputs": ["output", "error"],
            "subtypes": ["javascript", "python", "json_manipulation", "calculation"]
        }
    ]

def get_hardcoded_templates():
    """Get hardcoded workflow templates"""
    return [
        {
            "id": "lead-qualification-basic",
            "name": "Lead Qualification Workflow",
            "description": "Automatically qualify and score incoming leads based on predefined criteria",
            "category": "lead_qualification",
            "industry": "sales",
            "use_case": "Qualify leads from website forms and route to appropriate sales team",
            "complexity": "beginner",
            "estimated_time": "5-10 minutes",
            "tags": ["leads", "qualification", "scoring", "automation"],
            "is_system_template": True,
            "usage_count": 1250,
            "rating": 4.8,
            "nodes": [
                {
                    "id": "trigger-1",
                    "type": "trigger",
                    "name": "Form Submission",
                    "description": "Triggers when a lead form is submitted",
                    "position": {"x": 100, "y": 100},
                    "configuration": {"form_id": "contact_form", "required_fields": ["email", "company"]}
                },
                {
                    "id": "condition-1",
                    "type": "condition",
                    "name": "Check Company Size",
                    "description": "Filter leads by company size",
                    "position": {"x": 300, "y": 100},
                    "configuration": {"field": "company_size", "operator": ">=", "value": 50}
                },
                {
                    "id": "ai-1",
                    "type": "ai_response",
                    "name": "AI Lead Scoring",
                    "description": "Use AI to score lead quality",
                    "position": {"x": 500, "y": 100},
                    "configuration": {"personality": "Sales Manager", "prompt": "Score this lead from 1-100 based on company size, industry, and title"}
                },
                {
                    "id": "action-1",
                    "type": "action",
                    "name": "Route to Sales Team",
                    "description": "Assign lead to appropriate sales representative",
                    "position": {"x": 700, "y": 100},
                    "configuration": {"action_type": "assign_lead", "team": "enterprise_sales"}
                }
            ],
            "connections": [
                {
                    "id": "conn-1",
                    "source_node_id": "trigger-1",
                    "target_node_id": "condition-1",
                    "source_port": "output",
                    "target_port": "input"
                },
                {
                    "id": "conn-2",
                    "source_node_id": "condition-1",
                    "target_node_id": "ai-1",
                    "source_port": "true",
                    "target_port": "input",
                    "condition": "company_size >= 50"
                },
                {
                    "id": "conn-3",
                    "source_node_id": "ai-1",
                    "target_node_id": "action-1",
                    "source_port": "output",
                    "target_port": "input"
                }
            ]
        },
        {
            "id": "email-automation-nurture",
            "name": "Email Nurture Campaign",
            "description": "Automated email sequence for nurturing leads with personalized content",
            "category": "email_automation",
            "industry": "marketing",
            "use_case": "Send targeted email sequences based on user behavior and engagement",
            "complexity": "intermediate",
            "estimated_time": "15-20 minutes",
            "tags": ["email", "nurturing", "personalization", "engagement"],
            "is_system_template": True,
            "usage_count": 890,
            "rating": 4.6,
            "nodes": [
                {
                    "id": "trigger-2",
                    "type": "trigger",
                    "name": "User Registration",
                    "description": "Triggers when user registers or signs up",
                    "position": {"x": 100, "y": 200},
                    "configuration": {"event": "user_registered", "delay_hours": 1}
                },
                {
                    "id": "ai-2",
                    "type": "ai_response",
                    "name": "Personalize Content",
                    "description": "Generate personalized email content",
                    "position": {"x": 300, "y": 200},
                    "configuration": {"personality": "Professional Assistant", "prompt": "Create a personalized welcome email based on user profile"}
                },
                {
                    "id": "action-2",
                    "type": "action",
                    "name": "Send Welcome Email",
                    "description": "Send personalized welcome email",
                    "position": {"x": 500, "y": 200},
                    "configuration": {"action_type": "send_email", "template": "welcome_email"}
                },
                {
                    "id": "condition-2",
                    "type": "condition",
                    "name": "Check Engagement",
                    "description": "Check if user opened the email",
                    "position": {"x": 300, "y": 350},
                    "configuration": {"field": "email_opened", "operator": "==", "value": True, "wait_days": 3}
                },
                {
                    "id": "action-3",
                    "type": "action",
                    "name": "Send Follow-up",
                    "description": "Send follow-up email for engaged users",
                    "position": {"x": 500, "y": 300},
                    "configuration": {"action_type": "send_email", "template": "followup_engaged"}
                },
                {
                    "id": "action-4",
                    "type": "action",
                    "name": "Send Re-engagement",
                    "description": "Send re-engagement email for non-engaged users",
                    "position": {"x": 500, "y": 400},
                    "configuration": {"action_type": "send_email", "template": "reengagement"}
                }
            ],
            "connections": [
                {
                    "id": "conn-4",
                    "source_node_id": "trigger-2",
                    "target_node_id": "ai-2",
                    "source_port": "output",
                    "target_port": "input"
                },
                {
                    "id": "conn-5",
                    "source_node_id": "ai-2",
                    "target_node_id": "action-2",
                    "source_port": "output",
                    "target_port": "input"
                },
                {
                    "id": "conn-6",
                    "source_node_id": "action-2",
                    "target_node_id": "condition-2",
                    "source_port": "output",
                    "target_port": "input"
                },
                {
                    "id": "conn-7",
                    "source_node_id": "condition-2",
                    "target_node_id": "action-3",
                    "source_port": "true",
                    "target_port": "input",
                    "condition": "email_opened == True"
                },
                {
                    "id": "conn-8",
                    "source_node_id": "condition-2",
                    "target_node_id": "action-4",
                    "source_port": "false",
                    "target_port": "input"
                }
            ]
        },
        {
            "id": "task-management-assignment",
            "name": "Smart Task Assignment",
            "description": "Intelligently assign tasks to team members based on workload and skills",
            "category": "task_management",
            "industry": "operations",
            "use_case": "Automatically distribute tasks based on team member availability and expertise",
            "complexity": "intermediate",
            "estimated_time": "10-15 minutes",
            "tags": ["tasks", "assignment", "workload", "skills"],
            "is_system_template": True,
            "usage_count": 654,
            "rating": 4.7,
            "nodes": [
                {
                    "id": "trigger-3",
                    "type": "trigger",
                    "name": "New Task Created",
                    "description": "Triggers when a new task is created",
                    "position": {"x": 100, "y": 300},
                    "configuration": {"event": "task_created", "source": "project_management"}
                },
                {
                    "id": "ai-3",
                    "type": "ai_response",
                    "name": "Analyze Task Requirements",
                    "description": "AI analysis of task complexity and required skills",
                    "position": {"x": 300, "y": 300},
                    "configuration": {"personality": "Strategic Advisor", "prompt": "Analyze task complexity, required skills, and estimated effort"}
                },
                {
                    "id": "condition-3",
                    "type": "condition",
                    "name": "Check Team Availability",
                    "description": "Check which team members are available",
                    "position": {"x": 500, "y": 300},
                    "configuration": {"field": "team_availability", "operator": ">", "value": 0}
                },
                {
                    "id": "action-5",
                    "type": "action",
                    "name": "Assign to Best Match",
                    "description": "Assign task to best matching team member",
                    "position": {"x": 700, "y": 250},
                    "configuration": {"action_type": "assign_task", "criteria": "skills_match"}
                },
                {
                    "id": "action-6",
                    "type": "action",
                    "name": "Add to Queue",
                    "description": "Add to queue if no one available",
                    "position": {"x": 700, "y": 350},
                    "configuration": {"action_type": "queue_task", "priority": "high"}
                }
            ],
            "connections": [
                {
                    "id": "conn-9",
                    "source_node_id": "trigger-3",
                    "target_node_id": "ai-3",
                    "source_port": "output",
                    "target_port": "input"
                },
                {
                    "id": "conn-10",
                    "source_node_id": "ai-3",
                    "target_node_id": "condition-3",
                    "source_port": "output",
                    "target_port": "input"
                },
                {
                    "id": "conn-11",
                    "source_node_id": "condition-3",
                    "target_node_id": "action-5",
                    "source_port": "true",
                    "target_port": "input",
                    "condition": "available_members > 0"
                },
                {
                    "id": "conn-12",
                    "source_node_id": "condition-3",
                    "target_node_id": "action-6",
                    "source_port": "false",
                    "target_port": "input"
                }
            ]
        }
    ]

@api_router.post("/workflows/create", response_model=Workflow)
async def create_workflow(workflow_data: WorkflowCreate):
    """Create a new workflow"""
    try:
        # If template_id provided, load template and create from it
        if workflow_data.template_id:
            # Get hardcoded templates
            templates = get_hardcoded_templates()
            template = next((t for t in templates if t["id"] == workflow_data.template_id), None)
            
            if not template:
                raise HTTPException(status_code=404, detail="Workflow template not found")
            
            # Create workflow from template
            workflow = Workflow(
                **workflow_data.dict(exclude={"template_id"}),
                nodes=[WorkflowNode(**node) for node in template["nodes"]],
                connections=[WorkflowConnection(**conn) for conn in template["connections"]],
                template_id=workflow_data.template_id
            )
        else:
            # Create empty workflow
            workflow = Workflow(**workflow_data.dict())
        
        await db.workflows.insert_one(workflow.dict())
        
        logging.info(f"Workflow '{workflow.name}' created by user {workflow_data.user_id}")
        return workflow
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create workflow")

@api_router.get("/workflows/user/{user_id}", response_model=List[Workflow])
async def get_user_workflows(user_id: str, category: Optional[str] = None, active_only: bool = False):
    """Get workflows for a user"""
    try:
        query = {"user_id": user_id}
        
        if category:
            query["category"] = category
        
        if active_only:
            query["is_active"] = True
        
        workflows = await db.workflows.find(query).sort("updated_at", -1).to_list(100)
        return [Workflow(**workflow) for workflow in workflows]
        
    except Exception as e:
        logging.error(f"Get user workflows error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user workflows")

@api_router.get("/workflows/{workflow_id}", response_model=Workflow)
async def get_workflow(workflow_id: str, user_id: str):
    """Get a specific workflow"""
    try:
        workflow = await db.workflows.find_one({"id": workflow_id})
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Check access permissions (user owns workflow or is team member)
        if workflow["user_id"] != user_id:
            if workflow.get("team_id"):
                team_member = await db.team_members.find_one({
                    "team_id": workflow["team_id"],
                    "user_id": user_id,
                    "status": "active"
                })
                if not team_member:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=403, detail="Access denied")
        
        return Workflow(**workflow)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve workflow")

@api_router.put("/workflows/{workflow_id}", response_model=Workflow)
async def update_workflow(workflow_id: str, workflow_updates: WorkflowUpdate, user_id: str):
    """Update a workflow"""
    try:
        # Check ownership
        workflow = await db.workflows.find_one({"id": workflow_id, "user_id": user_id})
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found or access denied")
        
        # Update fields
        update_data = {k: v for k, v in workflow_updates.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Handle special fields that need conversion
        if "nodes" in update_data:
            update_data["nodes"] = [node.dict() if isinstance(node, WorkflowNode) else node for node in update_data["nodes"]]
        
        if "connections" in update_data:
            update_data["connections"] = [conn.dict() if isinstance(conn, WorkflowConnection) else conn for conn in update_data["connections"]]
        
        await db.workflows.update_one(
            {"id": workflow_id},
            {"$set": update_data}
        )
        
        # Get updated workflow
        updated_workflow = await db.workflows.find_one({"id": workflow_id})
        
        logging.info(f"Workflow {workflow_id} updated by user {user_id}")
        return Workflow(**updated_workflow)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update workflow")

@api_router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str, user_id: str):
    """Delete a workflow"""
    try:
        result = await db.workflows.delete_one({"id": workflow_id, "user_id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Workflow not found or access denied")
        
        # Also delete related executions
        await db.workflow_executions.delete_many({"workflow_id": workflow_id})
        
        logging.info(f"Workflow {workflow_id} deleted by user {user_id}")
        return {"status": "success", "message": "Workflow deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete workflow")

@api_router.get("/workflow-templates")
async def get_workflow_templates(category: Optional[str] = None, industry: Optional[str] = None):
    """Get available workflow templates"""
    try:
        # Get hardcoded templates
        templates = get_hardcoded_templates()
        
        # Filter templates based on query parameters
        filtered_templates = templates
        if category:
            filtered_templates = [t for t in filtered_templates if t["category"] == category]
        if industry:
            filtered_templates = [t for t in filtered_templates if t["industry"] == industry]
        
        return {"templates": filtered_templates}
        
    except Exception as e:
        logging.error(f"Get workflow templates error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve workflow templates")

@api_router.get("/workflow-node-types")
async def get_workflow_node_types(category: Optional[str] = None):
    """Get enhanced workflow node types with advanced capabilities"""
    try:
        node_types = get_enhanced_node_types()
        
        # Filter by category if provided
        if category:
            node_types = [nt for nt in node_types if nt["category"] == category]
        
        return {"node_types": node_types}
        
    except Exception as e:
        logging.error(f"Get workflow node types error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve workflow node types")

async def execute_workflow_node(node: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a single workflow node based on its type"""
    try:
        node_type = node.get("type", "action")
        node_config = node.get("configuration", {})
        
        # Simulate different execution times and behaviors based on node type
        if node_type == "trigger":
            await asyncio.sleep(0.1)
            return {
                "status": "success",
                "output": {"triggered": True, "trigger_data": input_data},
                "execution_time_ms": 100
            }
        
        elif node_type == "ai_response":
            await asyncio.sleep(0.5)  # AI processing takes longer
            prompt = node_config.get("prompt", "Generate a response")
            return {
                "status": "success", 
                "output": {"ai_response": f"AI generated response for: {prompt}"},
                "execution_time_ms": 500
            }
        
        elif node_type == "condition":
            await asyncio.sleep(0.1)
            condition = node_config.get("condition", "true")
            result = eval(condition.replace("input.", "input_data.get('"))  # Simplified evaluation
            return {
                "status": "success",
                "output": {"condition_result": result, "branch": "true" if result else "false"},
                "execution_time_ms": 100
            }
        
        elif node_type == "integration":
            await asyncio.sleep(0.3)
            integration_name = node_config.get("integration", "unknown")
            return {
                "status": "success",
                "output": {"integration_result": f"Data from {integration_name}", "records_processed": 10},
                "execution_time_ms": 300
            }
        
        elif node_type == "database":
            await asyncio.sleep(0.2)
            operation = node_config.get("operation", "read")
            return {
                "status": "success",
                "output": {"database_operation": operation, "affected_rows": 5},
                "execution_time_ms": 200
            }
        
        elif node_type == "api_call":
            await asyncio.sleep(0.4)
            endpoint = node_config.get("endpoint", "/api/data")
            return {
                "status": "success",
                "output": {"api_response": f"Response from {endpoint}", "status_code": 200},
                "execution_time_ms": 400
            }
        
        elif node_type == "notification":
            await asyncio.sleep(0.1)
            message = node_config.get("message", "Notification sent")
            return {
                "status": "success",
                "output": {"notification_sent": True, "message": message},
                "execution_time_ms": 100
            }
        
        elif node_type == "data_transform":
            await asyncio.sleep(0.2)
            transformation = node_config.get("transformation", "identity")
            return {
                "status": "success",
                "output": {"transformed_data": input_data, "transformation": transformation},
                "execution_time_ms": 200
            }
        
        elif node_type == "script":
            await asyncio.sleep(0.3)
            script_name = node_config.get("script", "custom_script.py")
            return {
                "status": "success",
                "output": {"script_result": f"Executed {script_name}", "exit_code": 0},
                "execution_time_ms": 300
            }
        
        else:  # Default action node
            await asyncio.sleep(0.2)
            return {
                "status": "success",
                "output": {"action_completed": True, "node_type": node_type},
                "execution_time_ms": 200
            }
            
    except Exception as e:
        logging.error(f"Node execution error for {node.get('id', 'unknown')}: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "execution_time_ms": 0
        }

@api_router.post("/workflows/execute", response_model=WorkflowExecution)
async def execute_workflow(execution_request: WorkflowExecuteRequest):
    """Execute a workflow (simulation for demo purposes)"""
    try:
        workflow = await db.workflows.find_one({"id": execution_request.workflow_id})
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        if not workflow.get("is_active", False):
            raise HTTPException(status_code=400, detail="Workflow is not active")
        
        # Create execution record
        execution = WorkflowExecution(
            workflow_id=execution_request.workflow_id,
            trigger_data=execution_request.trigger_data,
            status="running"
        )
        
        await db.workflow_executions.insert_one(execution.dict())
        
        # Enhanced execution engine for advanced node types
        execution_start = datetime.now()
        execution_path = []
        execution_results = {}
        nodes_executed = 0
        nodes_failed = 0
        
        try:
            # Process nodes in execution order (simplified for demo)
            for node in workflow.get("nodes", []):
                node_start = datetime.now()
                execution_path.append(node["id"])
                
                # Execute node based on type
                node_result = await execute_workflow_node(node, execution_request.input_data)
                execution_results[node["id"]] = node_result
                
                if node_result.get("status") == "success":
                    nodes_executed += 1
                else:
                    nodes_failed += 1
                
                node_duration = (datetime.now() - node_start).total_seconds() * 1000
                logging.info(f"Node {node['id']} ({node.get('type')}) executed in {node_duration}ms")
        
        except Exception as node_error:
            logging.error(f"Node execution error: {str(node_error)}")
            nodes_failed += 1
        
        execution_duration = (datetime.now() - execution_start).total_seconds() * 1000
        
        # Update execution as completed
        await db.workflow_executions.update_one(
            {"id": execution.id},
            {
                "$set": {
                    "status": "completed",
                    "execution_path": execution_path,
                    "results": execution_results,
                    "completed_at": datetime.now(timezone.utc),
                    "execution_time_ms": int(execution_duration),
                    "nodes_executed": nodes_executed,
                    "nodes_failed": nodes_failed
                }
            }
        )
        
        # Update workflow execution count
        await db.workflows.update_one(
            {"id": execution_request.workflow_id},
            {
                "$inc": {"execution_count": 1},
                "$set": {"last_executed": datetime.now(timezone.utc)}
            }
        )
        
        # Get updated execution
        updated_execution = await db.workflow_executions.find_one({"id": execution.id})
        
        logging.info(f"Workflow {execution_request.workflow_id} executed by user {execution_request.user_id}")
        return WorkflowExecution(**updated_execution)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Execute workflow error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to execute workflow")

@api_router.get("/workflows/{workflow_id}/executions", response_model=List[WorkflowExecution])
async def get_workflow_executions(workflow_id: str, user_id: str, limit: int = 50):
    """Get execution history for a workflow"""
    try:
        # Verify user has access to workflow
        workflow = await db.workflows.find_one({"id": workflow_id, "user_id": user_id})
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found or access denied")
        
        executions = await db.workflow_executions.find(
            {"workflow_id": workflow_id}
        ).sort("started_at", -1).limit(limit).to_list(limit)
        
        return [WorkflowExecution(**execution) for execution in executions]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get workflow executions error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve workflow executions")

@api_router.get("/workflows/{workflow_id}/metrics")
async def get_workflow_metrics(workflow_id: str, user_id: str):
    """Get workflow performance metrics"""
    try:
        # Verify user has access to workflow
        workflow = await db.workflows.find_one({"id": workflow_id, "user_id": user_id})
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found or access denied")
        
        # Calculate metrics from executions
        total_executions = await db.workflow_executions.count_documents({"workflow_id": workflow_id})
        successful_executions = await db.workflow_executions.count_documents({
            "workflow_id": workflow_id,
            "status": "completed"
        })
        failed_executions = await db.workflow_executions.count_documents({
            "workflow_id": workflow_id,
            "status": "failed"
        })
        
        # Calculate average execution time
        executions_with_time = await db.workflow_executions.find({
            "workflow_id": workflow_id,
            "execution_time_ms": {"$exists": True}
        }).to_list(1000)
        
        avg_execution_time = 0.0
        if executions_with_time:
            total_time = sum(ex.get("execution_time_ms", 0) for ex in executions_with_time)
            avg_execution_time = total_time / len(executions_with_time)
        
        # Last 24 hours executions
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        last_24h_executions = await db.workflow_executions.count_documents({
            "workflow_id": workflow_id,
            "started_at": {"$gte": twenty_four_hours_ago}
        })
        
        success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0.0
        
        metrics = WorkflowMetrics(
            workflow_id=workflow_id,
            total_executions=total_executions,
            successful_executions=successful_executions,
            failed_executions=failed_executions,
            average_execution_time_ms=avg_execution_time,
            last_24h_executions=last_24h_executions,
            success_rate=success_rate
        )
        
        return metrics.dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get workflow metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve workflow metrics")

# Auth routes
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_dict = user_data.dict()
    user_obj = User(**user_dict)
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/auth/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(100)
    return [User(**user) for user in users]

# Widget Configuration routes
@api_router.post("/widget/config", response_model=WidgetConfig)
async def create_widget_config(config_data: WidgetConfigCreate):
    config_dict = config_data.dict()
    # Add default voice settings for new configs
    config_dict["voice_settings"] = {
        "enabled": False,
        "voice": "alloy", 
        "speech_speed": 1.0,
        "auto_play_responses": True
    }
    config_dict["streaming_enabled"] = True
    config_obj = WidgetConfig(**config_dict)
    await db.widget_configs.insert_one(config_obj.dict())
    return config_obj

@api_router.get("/widget/config/{user_id}", response_model=WidgetConfig)
async def get_widget_config(user_id: str):
    config = await db.widget_configs.find_one({"user_id": user_id})
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return WidgetConfig(**config)

# Knowledge Base routes
@api_router.post("/knowledge-base", response_model=KnowledgeBaseItem)
async def create_knowledge_item(kb_data: KnowledgeBaseCreate):
    kb_dict = kb_data.dict()
    kb_obj = KnowledgeBaseItem(**kb_dict)
    await db.knowledge_base.insert_one(kb_obj.dict())
    return kb_obj

@api_router.get("/knowledge-base/{user_id}", response_model=List[KnowledgeBaseItem])
async def get_knowledge_base(user_id: str):
    items = await db.knowledge_base.find({"user_id": user_id}).to_list(100)
    return [KnowledgeBaseItem(**item) for item in items]

# Enhanced chat route with backward compatibility
@api_router.post("/chat", response_model=ChatMessage)
async def chat_with_ai(chat_request: ChatRequest):
    try:
        # Import here to avoid startup issues
        
        # Get or create session if not provided
        session_id = chat_request.session_id
        if not session_id:
            # Create new session for backward compatibility
            session = ConversationSession(user_id=chat_request.user_id)
            await db.conversation_sessions.insert_one(session.dict())
            session_id = session.id
        
        # Get user config for context
        user_config = await db.widget_configs.find_one({"user_id": chat_request.user_id})
        
        # Get user's knowledge base
        kb_items = await db.knowledge_base.find({"user_id": chat_request.user_id}).to_list(100)
        
        # Get recent chat history for context
        recent_chats = await db.chat_messages.find(
            {"user_id": chat_request.user_id, "session_id": session_id}
        ).sort("timestamp", -1).limit(5).to_list(5)
        
        # Determine personality from config or default
        personality = "Professional Assistant"
        if user_config and user_config.get('ai_personality'):
            personality = user_config['ai_personality']
        
        # Build system message with personality and context
        system_message = build_personality_prompt(personality, user_config, kb_items, recent_chats)

        # Initialize LLM chat
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"modq-{chat_request.user_id}-{session_id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        user_message = UserMessage(text=chat_request.message)
        
        # Get AI response
        start_time = datetime.now()
        ai_response = await chat.send_message(user_message)
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Save to database
        chat_obj = ChatMessage(
            user_id=chat_request.user_id,
            session_id=session_id,
            message=chat_request.message,
            response=ai_response,
            ai_personality=personality,
            response_time_ms=int(response_time),
            is_streaming=False
        )
        
        await db.chat_messages.insert_one(chat_obj.dict())
        
        # Update session
        await db.conversation_sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "updated_at": datetime.now(timezone.utc),
                    "message_count": await db.chat_messages.count_documents({"session_id": session_id})
                }
            }
        )
        
        return chat_obj
        
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat service error: {str(e)}")

@api_router.get("/chat/history/{user_id}", response_model=List[ChatMessage])
async def get_chat_history(user_id: str, limit: int = 50):
    messages = await db.chat_messages.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return [ChatMessage(**msg) for msg in messages]

# Rating and feedback routes
@api_router.post("/chat/rate")
async def rate_chat_response(rating_data: ChatRating):
    try:
        result = await db.chat_messages.update_one(
            {"id": rating_data.message_id},
            {"$set": {
                "rating": rating_data.rating,
                "feedback": rating_data.feedback,
                "rated_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return {"status": "success", "message": "Rating submitted"}
    except Exception as e:
        logging.error(f"Rating error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit rating")

@api_router.post("/chat/feedback")
async def submit_chat_feedback(feedback_data: ChatFeedback):
    try:
        result = await db.chat_messages.update_one(
            {"id": feedback_data.message_id},
            {"$set": {
                "rating": feedback_data.rating,
                "feedback": feedback_data.feedback,
                "feedback_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        
        return {"status": "success", "message": "Feedback submitted"}
    except Exception as e:
        logging.error(f"Feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")

# E2: Advanced AI Integration - AI Agent Management
@api_router.post("/ai-agents/create", response_model=AIAgent)
async def create_ai_agent(agent_data: AIAgentCreate):
    """Create a new AI agent with custom configuration"""
    try:
        agent = AIAgent(**agent_data.dict())
        await db.ai_agents.insert_one(agent.dict())
        
        logging.info(f"AI Agent '{agent.name}' created by user {agent_data.user_id}")
        return agent
        
    except Exception as e:
        logging.error(f"Create AI agent error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create AI agent")

@api_router.get("/ai-agents/user/{user_id}", response_model=List[AIAgent])
async def get_user_ai_agents(user_id: str):
    """Get all AI agents for a user"""
    try:
        agents = await db.ai_agents.find({"user_id": user_id}).to_list(length=None)
        return [AIAgent(**agent) for agent in agents]
        
    except Exception as e:
        logging.error(f"Get user AI agents error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get AI agents")

@api_router.get("/ai-agents/{agent_id}", response_model=AIAgent)
async def get_ai_agent(agent_id: str, user_id: str):
    """Get a specific AI agent"""
    try:
        agent = await db.ai_agents.find_one({"id": agent_id, "user_id": user_id})
        if not agent:
            raise HTTPException(status_code=404, detail="AI agent not found")
        
        return AIAgent(**agent)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get AI agent error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get AI agent")

@api_router.put("/ai-agents/{agent_id}", response_model=AIAgent)
async def update_ai_agent(agent_id: str, agent_data: AIAgentCreate):
    """Update an AI agent"""
    try:
        update_data = agent_data.dict()
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        result = await db.ai_agents.update_one(
            {"id": agent_id, "user_id": agent_data.user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="AI agent not found")
        
        updated_agent = await db.ai_agents.find_one({"id": agent_id})
        logging.info(f"AI Agent {agent_id} updated")
        return AIAgent(**updated_agent)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Update AI agent error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update AI agent")

@api_router.delete("/ai-agents/{agent_id}")
async def delete_ai_agent(agent_id: str, user_id: str):
    """Delete an AI agent"""
    try:
        result = await db.ai_agents.delete_one({"id": agent_id, "user_id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="AI agent not found")
        
        logging.info(f"AI Agent {agent_id} deleted")
        return {"status": "success", "message": "AI agent deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Delete AI agent error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete AI agent")

@api_router.post("/ai-agents/{agent_id}/chat")
async def chat_with_ai_agent(agent_id: str, user_id: str, message: str):
    """Chat with a specific AI agent"""
    try:
        # Get the AI agent
        agent = await db.ai_agents.find_one({"id": agent_id, "user_id": user_id})
        if not agent:
            raise HTTPException(status_code=404, detail="AI agent not found")
        
        agent_obj = AIAgent(**agent)
        
        # Initialize LLM chat with agent configuration
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"agent-{agent_id}-{user_id}",
            system_message=agent_obj.system_prompt
        ).with_model(agent_obj.provider, agent_obj.model)
        
        # Create user message
        user_message = UserMessage(text=message)
        
        # Get AI response
        start_time = datetime.now()
        ai_response = await chat.send_message(user_message)
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            "agent_id": agent_id,
            "agent_name": agent_obj.name,
            "agent_type": agent_obj.type,
            "message": message,
            "response": ai_response,
            "response_time_ms": int(response_time)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Chat with AI agent error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to chat with AI agent")

@api_router.get("/ai-agents/templates")
async def get_ai_agent_templates():
    """Get pre-built AI agent templates"""
    templates = [
        {
            "id": "sales-agent-template",
            "name": "Sales Agent",
            "type": "sales_agent",
            "description": "Specialized in lead qualification, sales conversations, and deal closing",
            "system_prompt": "You are a professional sales agent with expertise in lead qualification, objection handling, and closing deals. Your goal is to understand customer needs, qualify leads effectively, and guide prospects through the sales process. Be persuasive but helpful, and always focus on providing value to the customer.",
            "capabilities": ["lead_qualification", "objection_handling", "sales_conversation", "deal_closing"],
            "recommended_model": "gpt-4o",
            "temperature": 0.7
        },
        {
            "id": "support-agent-template",
            "name": "Support Agent",
            "type": "support_agent",
            "description": "Expert in customer support, troubleshooting, and problem resolution",
            "system_prompt": "You are a customer support specialist with deep knowledge of troubleshooting, problem resolution, and customer service best practices. Your goal is to help customers resolve issues quickly and efficiently while maintaining a positive, helpful attitude. Always ask clarifying questions and provide step-by-step solutions.",
            "capabilities": ["troubleshooting", "problem_resolution", "customer_service", "technical_support"],
            "recommended_model": "gpt-4o",
            "temperature": 0.5
        },
        {
            "id": "analytics-agent-template",
            "name": "Analytics Agent",
            "type": "analytics_agent",
            "description": "Specialized in data analysis, insights generation, and business intelligence",
            "system_prompt": "You are a data analytics expert with expertise in business intelligence, data interpretation, and insight generation. Your goal is to analyze data, identify trends, and provide actionable business insights. Always support your conclusions with data and provide clear, concise recommendations.",
            "capabilities": ["data_analysis", "trend_identification", "business_intelligence", "reporting"],
            "recommended_model": "gpt-4o",
            "temperature": 0.3
        },
        {
            "id": "marketing-agent-template",
            "name": "Marketing Agent",
            "type": "marketing_agent",
            "description": "Expert in content creation, campaign planning, and marketing strategy",
            "system_prompt": "You are a marketing professional with expertise in content creation, campaign planning, and digital marketing strategy. Your goal is to create compelling marketing content, develop effective campaigns, and provide strategic marketing advice. Be creative but data-driven in your approach.",
            "capabilities": ["content_creation", "campaign_planning", "marketing_strategy", "social_media"],
            "recommended_model": "gpt-4o",
            "temperature": 0.8
        }
    ]
    
    return {"templates": templates}

# E3: Custom Integration Marketplace - Integration Management
@api_router.post("/integrations/marketplace/create", response_model=CustomIntegration)
async def create_custom_integration(integration_data: CustomIntegrationCreate):
    """Create a new custom integration"""
    try:
        integration = CustomIntegration(
            **integration_data.dict(),
            author=f"User {integration_data.author_id}"  # In production, get actual username
        )
        await db.custom_integrations.insert_one(integration.dict())
        
        logging.info(f"Custom integration '{integration.name}' created by user {integration_data.author_id}")
        return integration
        
    except Exception as e:
        logging.error(f"Create custom integration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create custom integration")

@api_router.get("/integrations/marketplace", response_model=List[CustomIntegration])
async def get_marketplace_integrations(category: Optional[str] = None, search: Optional[str] = None, limit: int = 50):
    """Get available integrations from marketplace"""
    try:
        query = {"is_active": True}
        
        if category:
            query["category"] = category
        
        integrations = await db.custom_integrations.find(query).limit(limit).to_list(limit)
        
        # Filter by search term if provided
        if search:
            search_term = search.lower()
            integrations = [
                integration for integration in integrations
                if search_term in integration.get("name", "").lower() or 
                   search_term in integration.get("description", "").lower() or
                   any(search_term in tag.lower() for tag in integration.get("tags", []))
            ]
        
        return [CustomIntegration(**integration) for integration in integrations]
        
    except Exception as e:
        logging.error(f"Get marketplace integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get marketplace integrations")

@api_router.get("/integrations/marketplace/{integration_id}", response_model=CustomIntegration)
async def get_integration_details(integration_id: str):
    """Get detailed information about a specific integration"""
    try:
        integration = await db.custom_integrations.find_one({"id": integration_id})
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        # Increment view count
        await db.custom_integrations.update_one(
            {"id": integration_id},
            {"$inc": {"view_count": 1}}
        )
        
        return CustomIntegration(**integration)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get integration details error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get integration details")

@api_router.post("/integrations/marketplace/install", response_model=IntegrationInstall)
async def install_integration(install_request: IntegrationInstallRequest):
    """Install an integration for a user"""
    try:
        # Check if integration exists
        integration = await db.custom_integrations.find_one({"id": install_request.integration_id})
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        # Check if already installed
        existing_install = await db.integration_installs.find_one({
            "integration_id": install_request.integration_id,
            "user_id": install_request.user_id
        })
        
        if existing_install:
            raise HTTPException(status_code=400, detail="Integration already installed")
        
        # Create installation record
        install = IntegrationInstall(**install_request.dict())
        await db.integration_installs.insert_one(install.dict())
        
        # Update integration install count
        await db.custom_integrations.update_one(
            {"id": install_request.integration_id},
            {"$inc": {"install_count": 1}}
        )
        
        logging.info(f"Integration {install_request.integration_id} installed for user {install_request.user_id}")
        return install
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Install integration error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to install integration")

@api_router.get("/integrations/user/{user_id}/installed", response_model=List[IntegrationInstall])
async def get_user_installed_integrations(user_id: str):
    """Get integrations installed by a user"""
    try:
        installs = await db.integration_installs.find(
            {"user_id": user_id, "is_active": True}
        ).to_list(length=None)
        
        return [IntegrationInstall(**install) for install in installs]
        
    except Exception as e:
        logging.error(f"Get user installed integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user integrations")

@api_router.post("/integrations/marketplace/{integration_id}/review", response_model=IntegrationReview)
async def create_integration_review(integration_id: str, review_data: IntegrationReviewCreate):
    """Create a review for an integration"""
    try:
        # Verify integration exists
        integration = await db.custom_integrations.find_one({"id": integration_id})
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        # Create review
        review = IntegrationReview(
            integration_id=integration_id,
            **review_data.dict(exclude={"integration_id"})
        )
        await db.integration_reviews.insert_one(review.dict())
        
        # Update integration rating
        reviews = await db.integration_reviews.find({"integration_id": integration_id}).to_list(length=None)
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        
        await db.custom_integrations.update_one(
            {"id": integration_id},
            {
                "$set": {"rating": round(avg_rating, 1)},
                "$inc": {"review_count": 1}
            }
        )
        
        logging.info(f"Review created for integration {integration_id}")
        return review
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Create integration review error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create review")

@api_router.get("/integrations/marketplace/categories")
async def get_integration_categories():
    """Get available integration categories"""
    categories = [
        {
            "id": "api",
            "name": "API Integrations",
            "description": "Connect to external APIs and services",
            "icon": "api"
        },
        {
            "id": "webhook",
            "name": "Webhooks",
            "description": "Receive real-time notifications from external systems",
            "icon": "webhook"
        },
        {
            "id": "database",
            "name": "Database Connectors",
            "description": "Connect to various database systems",
            "icon": "database"
        },
        {
            "id": "file_processing",
            "name": "File Processing",
            "description": "Process and transform various file formats",
            "icon": "file"
        },
        {
            "id": "notification",
            "name": "Notifications",
            "description": "Send notifications via email, SMS, or messaging platforms",
            "icon": "bell"
        },
        {
            "id": "analytics",
            "name": "Analytics",
            "description": "Custom analytics and reporting integrations",
            "icon": "chart"
        },
        {
            "id": "ai_ml",
            "name": "AI & Machine Learning",
            "description": "AI and ML model integrations",
            "icon": "brain"
        },
        {
            "id": "custom",
            "name": "Custom",
            "description": "Custom business logic and workflows",
            "icon": "code"
        }
    ]
    
    return {"categories": categories}

# E4: Advanced Analytics & Reporting - Dashboard Management
@api_router.post("/analytics/dashboards/create", response_model=AnalyticsDashboard)
async def create_analytics_dashboard(dashboard_data: DashboardCreate):
    """Create a new analytics dashboard"""
    try:
        dashboard = AnalyticsDashboard(**dashboard_data.dict())
        await db.analytics_dashboards.insert_one(dashboard.dict())
        
        logging.info(f"Analytics dashboard '{dashboard.name}' created by user {dashboard_data.user_id}")
        return dashboard
        
    except Exception as e:
        logging.error(f"Create analytics dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create analytics dashboard")

@api_router.get("/analytics/dashboards/user/{user_id}", response_model=List[AnalyticsDashboard])
async def get_user_dashboards(user_id: str):
    """Get analytics dashboards for a user"""
    try:
        dashboards = await db.analytics_dashboards.find(
            {"user_id": user_id}
        ).sort("updated_at", -1).to_list(length=None)
        
        return [AnalyticsDashboard(**dashboard) for dashboard in dashboards]
        
    except Exception as e:
        logging.error(f"Get user dashboards error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user dashboards")

@api_router.get("/analytics/dashboards/{dashboard_id}", response_model=AnalyticsDashboard)
async def get_dashboard(dashboard_id: str, user_id: str):
    """Get a specific analytics dashboard"""
    try:
        dashboard = await db.analytics_dashboards.find_one({"id": dashboard_id})
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Check access permissions (user owns dashboard or it's public)
        if dashboard["user_id"] != user_id and not dashboard.get("is_public", False):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Increment view count
        await db.analytics_dashboards.update_one(
            {"id": dashboard_id},
            {"$inc": {"view_count": 1}}
        )
        
        return AnalyticsDashboard(**dashboard)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Get dashboard error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get dashboard")

@api_router.post("/analytics/reports/templates/create", response_model=ReportTemplate)
async def create_report_template(template_data: ReportTemplateCreate):
    """Create a new report template"""
    try:
        template = ReportTemplate(**template_data.dict())
        await db.report_templates.insert_one(template.dict())
        
        logging.info(f"Report template '{template.name}' created by user {template_data.user_id}")
        return template
        
    except Exception as e:
        logging.error(f"Create report template error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create report template")

@api_router.get("/analytics/reports/templates/user/{user_id}", response_model=List[ReportTemplate])
async def get_user_report_templates(user_id: str):
    """Get report templates for a user"""
    try:
        templates = await db.report_templates.find(
            {"user_id": user_id, "is_active": True}
        ).sort("created_at", -1).to_list(length=None)
        
        return [ReportTemplate(**template) for template in templates]
        
    except Exception as e:
        logging.error(f"Get user report templates error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get report templates")

@api_router.post("/analytics/reports/generate/{template_id}")
async def generate_report(template_id: str, user_id: str, parameters: Dict[str, Any] = {}):
    """Generate a report from a template"""
    try:
        # Get template
        template = await db.report_templates.find_one({"id": template_id, "user_id": user_id})
        if not template:
            raise HTTPException(status_code=404, detail="Report template not found")
        
        # Simulate report generation (in production, this would generate actual reports)
        report_data = {
            "template_id": template_id,
            "template_name": template["name"],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "parameters": parameters,
            "status": "completed",
            "file_size": "2.5 MB",
            "download_url": f"/api/reports/download/{template_id}",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        }
        
        # Update template generation count
        await db.report_templates.update_one(
            {"id": template_id},
            {
                "$set": {"last_generated": datetime.now(timezone.utc)},
                "$inc": {"generation_count": 1}
            }
        )
        
        logging.info(f"Report generated from template {template_id}")
        return report_data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Generate report error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@api_router.post("/analytics/kpis/create", response_model=AnalyticsKPI)
async def create_kpi(kpi_data: KPICreate):
    """Create a new KPI"""
    try:
        kpi = AnalyticsKPI(**kpi_data.dict())
        await db.analytics_kpis.insert_one(kpi.dict())
        
        logging.info(f"KPI '{kpi.name}' created by user {kpi_data.user_id}")
        return kpi
        
    except Exception as e:
        logging.error(f"Create KPI error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create KPI")

@api_router.get("/analytics/kpis/user/{user_id}", response_model=List[AnalyticsKPI])
async def get_user_kpis(user_id: str, category: Optional[str] = None):
    """Get KPIs for a user"""
    try:
        query = {"user_id": user_id, "is_active": True}
        if category:
            query["category"] = category
        
        kpis = await db.analytics_kpis.find(query).sort("created_at", -1).to_list(length=None)
        return [AnalyticsKPI(**kpi) for kpi in kpis]
        
    except Exception as e:
        logging.error(f"Get user KPIs error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user KPIs")

@api_router.get("/analytics/kpis/{kpi_id}/calculate")
async def calculate_kpi_value(kpi_id: str, user_id: str, time_range: str = "7d"):
    """Calculate current value of a KPI"""
    try:
        # Get KPI definition
        kpi = await db.analytics_kpis.find_one({"id": kpi_id, "user_id": user_id})
        if not kpi:
            raise HTTPException(status_code=404, detail="KPI not found")
        
        # Simulate KPI calculation (in production, this would execute actual queries)
        import random
        current_value = round(random.uniform(50, 1000), 2)
        target_value = kpi.get("target_value", 0)
        
        # Calculate performance metrics
        performance_pct = ((current_value / target_value) * 100) if target_value > 0 else 0
        trend = random.choice(["up", "down", "stable"])
        trend_pct = round(random.uniform(-20, 20), 1)
        
        result = {
            "kpi_id": kpi_id,
            "kpi_name": kpi["name"],
            "current_value": current_value,
            "target_value": target_value,
            "unit": kpi.get("unit", ""),
            "performance_percentage": round(performance_pct, 1),
            "trend": trend,
            "trend_percentage": trend_pct,
            "time_range": time_range,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
            "status": "healthy" if performance_pct >= 80 else "warning" if performance_pct >= 60 else "critical"
        }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Calculate KPI value error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to calculate KPI value")

@api_router.post("/analytics/models/create", response_model=PredictiveModel)
async def create_predictive_model(model_data: PredictiveModelCreate):
    """Create a new predictive model"""
    try:
        model = PredictiveModel(**model_data.dict())
        await db.predictive_models.insert_one(model.dict())
        
        logging.info(f"Predictive model '{model.name}' created by user {model_data.user_id}")
        return model
        
    except Exception as e:
        logging.error(f"Create predictive model error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create predictive model")

@api_router.get("/analytics/models/user/{user_id}", response_model=List[PredictiveModel])
async def get_user_predictive_models(user_id: str, model_type: Optional[str] = None):
    """Get predictive models for a user"""
    try:
        query = {"user_id": user_id}
        if model_type:
            query["model_type"] = model_type
        
        models = await db.predictive_models.find(query).sort("created_at", -1).to_list(length=None)
        return [PredictiveModel(**model) for model in models]
        
    except Exception as e:
        logging.error(f"Get user predictive models error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user predictive models")

@api_router.post("/analytics/models/{model_id}/predict")
async def make_prediction(model_id: str, user_id: str, input_data: Dict[str, Any]):
    """Make a prediction using a trained model"""
    try:
        # Get model
        model = await db.predictive_models.find_one({"id": model_id, "user_id": user_id})
        if not model:
            raise HTTPException(status_code=404, detail="Predictive model not found")
        
        if not model.get("is_production", False):
            raise HTTPException(status_code=400, detail="Model is not in production")
        
        # Simulate prediction (in production, this would use actual trained models)
        import random
        
        if model["model_type"] == "classification":
            prediction = random.choice(["High Risk", "Medium Risk", "Low Risk"])
            confidence = round(random.uniform(0.6, 0.95), 3)
        elif model["model_type"] == "regression":
            prediction = round(random.uniform(100, 10000), 2)
            confidence = round(random.uniform(0.7, 0.9), 3)
        else:
            prediction = "Cluster A"
            confidence = round(random.uniform(0.8, 0.95), 3)
        
        result = {
            "model_id": model_id,
            "model_name": model["name"],
            "model_type": model["model_type"],
            "prediction": prediction,
            "confidence": confidence,
            "input_data": input_data,
            "features_used": model.get("features", []),
            "prediction_time": datetime.now(timezone.utc).isoformat()
        }
        
        logging.info(f"Prediction made using model {model_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Make prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to make prediction")

@api_router.get("/analytics/overview/{user_id}")
async def get_analytics_overview(user_id: str):
    """Get analytics overview for a user"""
    try:
        # Get counts of user's analytics assets
        dashboards_count = await db.analytics_dashboards.count_documents({"user_id": user_id})
        kpis_count = await db.analytics_kpis.count_documents({"user_id": user_id, "is_active": True})
        models_count = await db.predictive_models.count_documents({"user_id": user_id})
        reports_count = await db.report_templates.count_documents({"user_id": user_id, "is_active": True})
        
        # Get recent activity (simplified)
        recent_dashboards = await db.analytics_dashboards.find(
            {"user_id": user_id}
        ).sort("updated_at", -1).limit(3).to_list(3)
        
        overview = {
            "user_id": user_id,
            "summary": {
                "dashboards": dashboards_count,
                "kpis": kpis_count,
                "predictive_models": models_count,
                "report_templates": reports_count
            },
            "recent_dashboards": [
                {
                    "id": d["id"],
                    "name": d["name"],
                    "updated_at": d["updated_at"],
                    "view_count": d.get("view_count", 0)
                }
                for d in recent_dashboards
            ],
            "quick_stats": {
                "total_dashboard_views": sum(d.get("view_count", 0) for d in recent_dashboards),
                "active_kpis": kpis_count,
                "production_models": await db.predictive_models.count_documents({
                    "user_id": user_id, 
                    "is_production": True
                })
            }
        }
        
        return overview
        
    except Exception as e:
        logging.error(f"Get analytics overview error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get analytics overview")

# Analytics routes for admin
@api_router.get("/admin/analytics")
async def get_admin_analytics():
    try:
        # Get basic counts
        total_users = await db.users.count_documents({})
        total_messages = await db.chat_messages.count_documents({})
        total_configs = await db.widget_configs.count_documents({})
        total_kb_items = await db.knowledge_base.count_documents({})
        
        # Get recent activity
        recent_users = await db.users.find().sort("created_at", -1).limit(5).to_list(5)
        recent_messages = await db.chat_messages.find().sort("timestamp", -1).limit(10).to_list(10)
        
        # Rating statistics
        helpful_ratings = await db.chat_messages.count_documents({"rating": "helpful"})
        not_helpful_ratings = await db.chat_messages.count_documents({"rating": "not_helpful"})
        
        return {
            "totals": {
                "users": total_users,
                "messages": total_messages,
                "configs": total_configs,
                "knowledge_items": total_kb_items
            },
            "recent_activity": {
                "users": [User(**user).dict() for user in recent_users],
                "messages": [ChatMessage(**msg).dict() for msg in recent_messages]
            },
            "ratings": {
                "helpful": helpful_ratings,
                "not_helpful": not_helpful_ratings,
                "total_rated": helpful_ratings + not_helpful_ratings
            }
        }
    except Exception as e:
        logging.error(f"Analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get analytics")

# Original routes
@api_router.get("/")
async def root():
    return {"message": "modQ - Modular Quantum Business Intelligence API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()