import requests
import sys
import json
from datetime import datetime

class ModQAPITester:
    def __init__(self, base_url="https://ai-business-suite.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_user_data = None

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