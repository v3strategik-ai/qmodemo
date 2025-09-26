from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
import aiofiles
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import io
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
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

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    message: str
    response: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    rating: Optional[str] = None
    feedback: Optional[str] = None

class ChatRequest(BaseModel):
    user_id: str
    message: str

class ChatRating(BaseModel):
    message_id: str
    rating: str  # 'helpful' or 'not_helpful'
    feedback: Optional[str] = None

class ChatFeedback(BaseModel):
    message_id: str
    rating: str
    feedback: str

class WidgetConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_name: str
    industry: str
    ai_personality: str = "Professional Assistant"
    workflow_automations: List[str] = []
    knowledge_base_files: List[str] = []
    integration_settings: dict = {}
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

# Chat routes
@api_router.post("/chat", response_model=ChatMessage)
async def chat_with_ai(chat_request: ChatRequest):
    try:
        # Import here to avoid startup issues
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Get user config for context
        user_config = await db.widget_configs.find_one({"user_id": chat_request.user_id})
        
        # Get user's knowledge base
        kb_items = await db.knowledge_base.find({"user_id": chat_request.user_id}).to_list(100)
        
        # Build system message based on config and knowledge base
        system_message = f"""You are modQ - a Modular Quantum Business Intelligence assistant. You are an ultra-intelligent AI agent that acts as a personal assistant, regional manager, and CEO all in one.

Your capabilities include:
- Providing intelligent business insights and analytics
- Automating workflows and processes
- Offering strategic recommendations
- Analyzing data and trends
- Managing tasks and projects
- Creating business reports and frameworks
- Optimizing operations and efficiency

"""
        
        if user_config:
            system_message += f"""
Company Context: {user_config.get('company_name', 'Unknown')}
Industry: {user_config.get('industry', 'General')}
AI Personality: {user_config.get('ai_personality', 'Professional Assistant')}

Available Automations: {', '.join(user_config.get('workflow_automations', []))}
"""

        if kb_items:
            system_message += f"""
Company Knowledge Base:
{chr(10).join([f"- {item['title']}: {item['content'][:200]}..." for item in kb_items])}
"""

        system_message += """
Provide practical, actionable advice. Be specific and include metrics, frameworks, or step-by-step guidance when possible. Focus on business value and ROI."""

        # Get recent chat history for context
        recent_chats = await db.chat_messages.find(
            {"user_id": chat_request.user_id}
        ).sort("timestamp", -1).limit(5).to_list(5)
        
        # Initialize LLM chat
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"modq-{chat_request.user_id}",
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        user_message = UserMessage(text=chat_request.message)
        
        # Get AI response
        ai_response = await chat.send_message(user_message)
        
        # Save to database
        chat_obj = ChatMessage(
            user_id=chat_request.user_id,
            message=chat_request.message,
            response=ai_response
        )
        
        await db.chat_messages.insert_one(chat_obj.dict())
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