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
app = FastAPI(title="modQ API", description="Modular Quantum Business Intelligence API", version="1.0")

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
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
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
    """Handle voice transcription - currently disabled due to API key incompatibility"""
    try:
        await manager.send_message({
            "type": "transcription_error",
            "message": "Voice transcription temporarily disabled. OpenAI API key required for Whisper integration.",
            "session_id": session_id
        }, user_id, session_id)
        
    except Exception as e:
        logging.error(f"Voice transcription error: {str(e)}")
        await manager.send_message({
            "type": "transcription_error",
            "message": f"Failed to transcribe audio: {str(e)}",
            "session_id": session_id
        }, user_id, session_id)

async def handle_tts_request(message_data: Dict, user_id: str, session_id: str):
    """Handle text-to-speech requests - currently disabled due to API key incompatibility"""
    try:
        await manager.send_message({
            "type": "tts_error",
            "message": "Text-to-speech temporarily disabled. OpenAI API key required for TTS integration.",
            "session_id": session_id
        }, user_id, session_id)
        
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

# WebSocket endpoint for real-time streaming
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
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
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
        # Get audio data (base64 encoded)
        audio_data = message_data.get("audio_data")
        if not audio_data:
            raise ValueError("No audio data provided")
        
        # Decode audio data
        audio_bytes = base64.b64decode(audio_data)
        
        # Save temporary file
        temp_file_path = f"/tmp/audio_{user_id}_{session_id}.webm"
        
        async with aiofiles.open(temp_file_path, 'wb') as f:
            await f.write(audio_bytes)
        
        # Use OpenAI Whisper for transcription
        import openai
        client = openai.OpenAI(api_key=os.environ.get('EMERGENT_LLM_KEY'))
        
        with open(temp_file_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        
        # Clean up temp file
        os.remove(temp_file_path)
        
        # Send transcription result
        await manager.send_message({
            "type": "transcription_result",
            "session_id": session_id,
            "text": transcript,
            "audio_duration": message_data.get("duration", 0)
        }, user_id, session_id)
        
        # Automatically process as chat message if requested
        if message_data.get("auto_process", True):
            chat_message_data = {
                "type": "chat_message",
                "message": transcript,
                "personality": message_data.get("personality", "Professional Assistant")
            }
            await handle_streaming_chat(chat_message_data, user_id, session_id)
        
    except Exception as e:
        logging.error(f"Voice transcription error: {str(e)}")
        await manager.send_message({
            "type": "transcription_error",
            "message": f"Failed to transcribe audio: {str(e)}",
            "session_id": session_id
        }, user_id, session_id)

async def handle_tts_request(message_data: Dict, user_id: str, session_id: str):
    """Handle text-to-speech requests"""
    try:
        text = message_data.get("text", "")
        voice = message_data.get("voice", "alloy")
        speed = message_data.get("speed", 1.0)
        
        if not text:
            raise ValueError("No text provided for TTS")
        
        # Use OpenAI TTS
        import openai
        client = openai.OpenAI(api_key=os.environ.get('EMERGENT_LLM_KEY'))
        
        response = client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            speed=speed
        )
        
        # Get audio data and encode as base64
        audio_data = response.content
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Send TTS result
        await manager.send_message({
            "type": "tts_result",
            "session_id": session_id,
            "audio_data": audio_base64,
            "text": text,
            "voice": voice
        }, user_id, session_id)
        
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
    """Fallback endpoint for audio transcription when WebSocket is not available"""
    try:
        if not file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Invalid audio file")
        
        # Save uploaded file temporarily
        temp_file_path = f"/tmp/upload_{uuid.uuid4()}.{file.filename.split('.')[-1]}"
        
        async with aiofiles.open(temp_file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Use OpenAI Whisper for transcription
        import openai
        client = openai.OpenAI(api_key=os.environ.get('EMERGENT_LLM_KEY'))
        
        with open(temp_file_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
        
        # Clean up temp file
        os.remove(temp_file_path)
        
        return {
            "transcript": transcript,
            "user_id": user_id,
            "status": "success"
        }
        
    except Exception as e:
        logging.error(f"Audio transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@api_router.post("/voice/synthesize")
async def synthesize_speech(request: TTSRequest):
    """Fallback endpoint for text-to-speech when WebSocket is not available"""
    try:
        import openai
        client = openai.OpenAI(api_key=os.environ.get('EMERGENT_LLM_KEY'))
        
        response = client.audio.speech.create(
            model="tts-1",
            voice=request.voice,
            input=request.text,
            speed=request.speed
        )
        
        # Return audio as streaming response
        audio_data = response.content
        
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
        
    except Exception as e:
        logging.error(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Speech synthesis failed: {str(e)}")

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
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
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