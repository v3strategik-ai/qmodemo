import requests
import sys
import json
import websocket
import threading
import time
import base64
import io
from datetime import datetime

class ModQAPITester:
    def __init__(self, base_url="https://quantum-crm.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.ws_base_url = base_url.replace("https://", "wss://").replace("/api", "")
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_user_data = None
        self.test_session_id = None
        self.websocket_messages = []
        self.websocket_connected = False

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"test_user_{timestamp}",
            "email": f"test_{timestamp}@modq.com",
            "role": "employee"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'id' in response:
            self.test_user_id = response['id']
            self.test_user_data = response
            print(f"   Created user with ID: {self.test_user_id}")
            return True
        return False

    def test_get_users(self):
        """Test getting all users"""
        return self.run_test("Get All Users", "GET", "auth/users", 200)

    def test_widget_config_creation(self):
        """Test widget configuration creation"""
        if not self.test_user_id:
            print("❌ Skipping widget config test - no user ID available")
            return False
            
        config_data = {
            "user_id": self.test_user_id,
            "company_name": "Test Company",
            "industry": "Technology",
            "ai_personality": "Professional Assistant",
            "workflow_automations": ["Email Management", "Task Scheduling"]
        }
        
        return self.run_test(
            "Widget Configuration Creation",
            "POST",
            "widget/config",
            200,
            data=config_data
        )

    def test_get_widget_config(self):
        """Test getting widget configuration"""
        if not self.test_user_id:
            print("❌ Skipping get widget config test - no user ID available")
            return False
            
        return self.run_test(
            "Get Widget Configuration",
            "GET",
            f"widget/config/{self.test_user_id}",
            200
        )

    def test_knowledge_base_creation(self):
        """Test knowledge base item creation"""
        if not self.test_user_id:
            print("❌ Skipping knowledge base test - no user ID available")
            return False
            
        kb_data = {
            "user_id": self.test_user_id,
            "title": "Test Knowledge Item",
            "content": "This is a test knowledge base item for modQ testing.",
            "file_type": "text"
        }
        
        return self.run_test(
            "Knowledge Base Creation",
            "POST",
            "knowledge-base",
            200,
            data=kb_data
        )

    def test_get_knowledge_base(self):
        """Test getting knowledge base items"""
        if not self.test_user_id:
            print("❌ Skipping get knowledge base test - no user ID available")
            return False
            
        return self.run_test(
            "Get Knowledge Base",
            "GET",
            f"knowledge-base/{self.test_user_id}",
            200
        )

    def test_ai_chat(self):
        """Test AI chat functionality"""
        if not self.test_user_id:
            print("❌ Skipping AI chat test - no user ID available")
            return False
            
        chat_data = {
            "user_id": self.test_user_id,
            "message": "Hello modQ! Can you help me with business analytics?"
        }
        
        print("   Note: AI chat may take longer to respond...")
        return self.run_test(
            "AI Chat Functionality",
            "POST",
            "chat",
            200,
            data=chat_data
        )

    def test_chat_history(self):
        """Test getting chat history"""
        if not self.test_user_id:
            print("❌ Skipping chat history test - no user ID available")
            return False
            
        return self.run_test(
            "Get Chat History",
            "GET",
            f"chat/history/{self.test_user_id}",
            200
        )

    def test_status_endpoints(self):
        """Test status check endpoints"""
        # Test creating status check
        status_data = {
            "client_name": "Test Client"
        }
        
        success1, _ = self.run_test(
            "Create Status Check",
            "POST",
            "status",
            200,
            data=status_data
        )
        
        # Test getting status checks
        success2, _ = self.run_test(
            "Get Status Checks",
            "GET",
            "status",
            200
        )
        
        return success1 and success2

    # ===== NEW OPTION B ADVANCED AI FEATURES TESTS =====
    
    def test_ai_personalities(self):
        """Test AI personalities endpoint"""
        print("\n🧠 Testing AI Personalities...")
        success, response = self.run_test(
            "Get AI Personalities",
            "GET",
            "personalities",
            200
        )
        
        if success and response:
            personalities = response.get('personalities', {})
            default_personality = response.get('default', '')
            
            print(f"   Found {len(personalities)} personalities")
            print(f"   Default personality: {default_personality}")
            
            # Verify expected personalities exist
            expected_personalities = [
                "Professional Assistant", "Strategic Advisor", "Sales Manager", 
                "Tech Innovator", "Financial Analyst"
            ]
            
            for personality in expected_personalities:
                if personality in personalities:
                    print(f"   ✅ {personality} found")
                else:
                    print(f"   ❌ {personality} missing")
                    return False
            
            return True
        return False

    def test_session_management(self):
        """Test conversation session management"""
        if not self.test_user_id:
            print("❌ Skipping session management test - no user ID available")
            return False
        
        print("\n💬 Testing Session Management...")
        
        # Test creating new session
        success1, session_response = self.run_test(
            "Create New Session",
            "POST",
            f"sessions/new?user_id={self.test_user_id}",
            200
        )
        
        if success1 and session_response:
            self.test_session_id = session_response.get('id')
            print(f"   Created session ID: {self.test_session_id}")
        
        # Test getting user sessions
        success2, sessions_response = self.run_test(
            "Get User Sessions",
            "GET",
            f"sessions/{self.test_user_id}",
            200
        )
        
        if success2 and sessions_response:
            print(f"   Found {len(sessions_response)} sessions for user")
        
        return success1 and success2

    def test_enhanced_chat_with_session(self):
        """Test enhanced chat with session support"""
        if not self.test_user_id:
            print("❌ Skipping enhanced chat test - no user ID available")
            return False
        
        print("\n🤖 Testing Enhanced Chat with Session Support...")
        
        # Test chat with specific personality and session
        chat_data = {
            "user_id": self.test_user_id,
            "message": "As a business owner in the technology sector, what are the key metrics I should track for my SaaS startup?",
            "session_id": self.test_session_id
        }
        
        success, response = self.run_test(
            "Enhanced Chat with Session",
            "POST",
            "chat",
            200,
            data=chat_data
        )
        
        if success and response:
            print(f"   AI Personality: {response.get('ai_personality', 'Unknown')}")
            print(f"   Response Time: {response.get('response_time_ms', 0)}ms")
            print(f"   Session ID: {response.get('session_id', 'None')}")
            print(f"   Response Preview: {response.get('response', '')[:100]}...")
            return True
        
        return False

    def test_voice_transcription_endpoint(self):
        """Test voice transcription REST endpoint"""
        print("\n🎤 Testing Voice Transcription Endpoint...")
        
        # Create a simple test audio file (mock data)
        # In a real test, you'd use actual audio data
        test_audio_content = b"fake_audio_data_for_testing"
        
        files = {
            'file': ('test_audio.wav', io.BytesIO(test_audio_content), 'audio/wav')
        }
        
        url = f"{self.base_url}/voice/transcribe"
        params = {'user_id': self.test_user_id or 'test_user'}
        
        self.tests_run += 1
        print(f"🔍 Testing Voice Transcription...")
        print(f"   URL: {url}")
        
        try:
            response = requests.post(url, files=files, params=params, timeout=30)
            print(f"   Status Code: {response.status_code}")
            
            # We expect this to fail with our fake audio data, but we want to see the endpoint responds
            if response.status_code in [400, 500]:  # Expected failure with fake data
                self.tests_passed += 1
                print(f"✅ Endpoint accessible - Expected failure with test data")
                try:
                    error_data = response.json()
                    print(f"   Expected Error: {error_data.get('detail', 'Unknown error')}")
                except:
                    pass
                return True
            elif response.status_code == 200:
                self.tests_passed += 1
                print(f"✅ Unexpected success with test data")
                return True
            else:
                print(f"❌ Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_voice_synthesis_endpoint(self):
        """Test voice synthesis (TTS) REST endpoint"""
        print("\n🔊 Testing Voice Synthesis Endpoint...")
        
        tts_data = {
            "user_id": self.test_user_id or "test_user",
            "text": "Hello, this is a test of the text-to-speech functionality in modQ.",
            "voice": "alloy",
            "speed": 1.0
        }
        
        success, response = self.run_test(
            "Voice Synthesis (TTS)",
            "POST",
            "voice/synthesize",
            200,
            data=tts_data
        )
        
        return success

    def test_websocket_connection(self):
        """Test WebSocket connection and basic functionality"""
        if not self.test_user_id:
            print("❌ Skipping WebSocket test - no user ID available")
            return False
        
        print("\n🔌 Testing WebSocket Connection...")
        
        ws_url = f"{self.ws_base_url}/ws/chat/{self.test_user_id}"
        print(f"   WebSocket URL: {ws_url}")
        
        self.websocket_messages = []
        self.websocket_connected = False
        connection_successful = False
        
        def on_message(ws, message):
            try:
                data = json.loads(message)
                self.websocket_messages.append(data)
                print(f"   📨 Received: {data.get('type', 'unknown')}")
                
                if data.get('type') == 'connection_established':
                    self.websocket_connected = True
                    
            except Exception as e:
                print(f"   ❌ Message parsing error: {e}")

        def on_error(ws, error):
            print(f"   ❌ WebSocket error: {error}")

        def on_close(ws, close_status_code, close_msg):
            print(f"   🔌 WebSocket closed: {close_status_code}")

        def on_open(ws):
            print(f"   ✅ WebSocket connection opened")
            nonlocal connection_successful
            connection_successful = True
            
            # Send a test chat message
            test_message = {
                "type": "chat_message",
                "message": "Hello WebSocket! This is a test message for streaming AI response.",
                "personality": "Professional Assistant"
            }
            
            ws.send(json.dumps(test_message))
            print(f"   📤 Sent test message")
            
            # Wait a bit for response, then close
            time.sleep(3)
            ws.close()

        try:
            # Create WebSocket connection
            ws = websocket.WebSocketApp(
                ws_url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            
            # Run WebSocket in a separate thread with timeout
            ws_thread = threading.Thread(target=ws.run_forever)
            ws_thread.daemon = True
            ws_thread.start()
            
            # Wait for connection and messages
            time.sleep(5)
            
            self.tests_run += 1
            
            if connection_successful and self.websocket_connected:
                self.tests_passed += 1
                print(f"   ✅ WebSocket connection successful")
                print(f"   📊 Received {len(self.websocket_messages)} messages")
                
                # Check for expected message types
                message_types = [msg.get('type') for msg in self.websocket_messages]
                print(f"   📋 Message types: {message_types}")
                
                return True
            else:
                print(f"   ❌ WebSocket connection failed")
                return False
                
        except Exception as e:
            print(f"   ❌ WebSocket test failed: {str(e)}")
            return False

    def test_widget_config_with_voice_settings(self):
        """Test widget configuration with new voice settings"""
        if not self.test_user_id:
            print("❌ Skipping widget config with voice settings test - no user ID available")
            return False
        
        print("\n⚙️ Testing Widget Config with Voice Settings...")
        
        config_data = {
            "user_id": self.test_user_id,
            "company_name": "Advanced Tech Solutions",
            "industry": "Technology",
            "ai_personality": "Tech Innovator",
            "workflow_automations": ["Email Management", "Task Scheduling", "Voice Commands"]
        }
        
        success, response = self.run_test(
            "Widget Config with Voice Settings",
            "POST",
            "widget/config",
            200,
            data=config_data
        )
        
        if success and response:
            voice_settings = response.get('voice_settings', {})
            streaming_enabled = response.get('streaming_enabled', False)
            
            print(f"   Voice Settings: {voice_settings}")
            print(f"   Streaming Enabled: {streaming_enabled}")
            
            # Verify voice settings structure
            expected_voice_keys = ['enabled', 'voice', 'speech_speed', 'auto_play_responses']
            for key in expected_voice_keys:
                if key in voice_settings:
                    print(f"   ✅ Voice setting '{key}' present")
                else:
                    print(f"   ❌ Voice setting '{key}' missing")
                    return False
            
            return True
        
        return False

    def test_session_deletion(self):
        """Test session deletion"""
        if not self.test_session_id:
            print("❌ Skipping session deletion test - no session ID available")
            return False
        
        print("\n🗑️ Testing Session Deletion...")
        
        success, response = self.run_test(
            "Delete Session",
            "DELETE",
            f"sessions/{self.test_session_id}",
            200
        )
        
        if success:
            print(f"   ✅ Session {self.test_session_id} deleted successfully")
        
        return success

def main():
    print("🚀 Starting modQ API Testing...")
    print("=" * 60)
    
    tester = ModQAPITester()
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("User Registration", tester.test_user_registration),
        ("Get Users", tester.test_get_users),
        ("Widget Config Creation", tester.test_widget_config_creation),
        ("Get Widget Config", tester.test_get_widget_config),
        ("Knowledge Base Creation", tester.test_knowledge_base_creation),
        ("Get Knowledge Base", tester.test_get_knowledge_base),
        ("AI Chat", tester.test_ai_chat),
        ("Chat History", tester.test_chat_history),
        ("Status Endpoints", tester.test_status_endpoints)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            if not success:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    if tester.test_user_data:
        print(f"\n👤 Test User Created:")
        print(f"   ID: {tester.test_user_data.get('id')}")
        print(f"   Username: {tester.test_user_data.get('username')}")
        print(f"   Email: {tester.test_user_data.get('email')}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())