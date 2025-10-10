#!/usr/bin/env python3
"""
Navigation Tabs Backend API Test Suite
Testing all backend APIs that frontend navigation tabs depend on
Addressing "Failed to load" errors reported by user
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://modq-saml.preview.emergentagent.com/api"

class NavigationTabsTester:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = BACKEND_URL
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_token = None
        self.test_session_id = None
        self.failed_tests = []
        self.successful_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        # Add auth token if available
        if self.test_token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.test_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'DELETE':
                if data:
                    response = requests.delete(url, json=data, headers=headers, params=params, timeout=30)
                else:
                    response = requests.delete(url, headers=headers, params=params, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.successful_tests.append(name)
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}")
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def setup_test_user(self):
        """Create a test user and get authentication token"""
        print("\n🔧 Setting up test user for authentication...")
        
        timestamp = int(time.time())
        user_data = {
            "username": f"navtest_{timestamp}",
            "email": f"navtest_{timestamp}@modq.com",
            "password": "TestPassword123!",
            "role": "admin"  # Use admin role to access all endpoints
        }
        
        # Register user
        success, response = self.run_test(
            "User Registration for Testing",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.test_token = response['access_token']
            self.test_user_id = response['user_id']
            print(f"   ✅ Test user created with ID: {self.test_user_id}")
            print(f"   ✅ Auth token obtained")
            return True
        else:
            print("   ❌ Failed to create test user")
            return False

    # ===== ANALYTICS & PROGRESS APIs =====
    
    def test_analytics_dashboard(self):
        """Test GET /api/analytics/dashboard - Analytics dashboard data"""
        return self.run_test(
            "Analytics Dashboard",
            "GET",
            "analytics/dashboard",
            200
        )

    def test_analytics_metrics(self):
        """Test GET /api/analytics/metrics - User metrics and statistics"""
        return self.run_test(
            "Analytics Metrics",
            "GET",
            "analytics/metrics",
            200
        )

    def test_progress_goals(self):
        """Test GET /api/progress/goals - User goals and progress tracking"""
        return self.run_test(
            "Progress Goals",
            "GET",
            "progress/goals",
            200
        )

    def test_progress_achievements(self):
        """Test GET /api/progress/achievements - Achievement system data"""
        return self.run_test(
            "Progress Achievements",
            "GET",
            "progress/achievements",
            200
        )

    def test_usage_analytics_summary(self):
        """Test GET /api/usage-analytics/summary - Usage analytics summary"""
        return self.run_test(
            "Usage Analytics Summary",
            "GET",
            "usage-analytics/summary",
            200
        )

    # ===== MOBILE & CONFIGURATION APIs =====
    
    def test_mobile_settings_get(self):
        """Test GET /api/mobile/settings - Mobile optimization settings"""
        return self.run_test(
            "Mobile Settings (GET)",
            "GET",
            "mobile/settings",
            200
        )

    def test_mobile_settings_put(self):
        """Test PUT /api/mobile/settings - Update mobile settings"""
        settings_data = {
            "push_notifications_enabled": True,
            "offline_sync_enabled": True,
            "mobile_theme": "dark",
            "compact_mode": False,
            "gesture_controls": True,
            "auto_sync_interval": 300
        }
        
        return self.run_test(
            "Mobile Settings (PUT)",
            "PUT",
            "mobile/settings",
            200,
            data=settings_data
        )

    def test_mobile_performance(self):
        """Test GET /api/mobile/performance - Mobile performance metrics"""
        return self.run_test(
            "Mobile Performance",
            "GET",
            "mobile/performance",
            200
        )

    # ===== API DOCUMENTATION SYSTEM =====
    
    def test_docs_endpoints(self):
        """Test GET /api/docs/endpoints - API endpoint documentation"""
        return self.run_test(
            "API Docs Endpoints",
            "GET",
            "docs/endpoints",
            200
        )

    def test_docs_examples(self):
        """Test GET /api/docs/examples - Code examples and samples"""
        return self.run_test(
            "API Docs Examples",
            "GET",
            "docs/examples",
            200
        )

    def test_docs_authentication(self):
        """Test GET /api/docs/authentication - Authentication documentation"""
        return self.run_test(
            "API Docs Authentication",
            "GET",
            "docs/authentication",
            200
        )

    # ===== USER & SESSION MANAGEMENT =====
    
    def test_auth_me(self):
        """Test GET /api/auth/me - Current user profile"""
        return self.run_test(
            "Current User Profile",
            "GET",
            "auth/me",
            200
        )

    def test_users_by_id(self):
        """Test GET /api/users/{user_id} - User details"""
        if not self.test_user_id:
            print("❌ Skipping user details test - no user ID available")
            return False, {}
            
        return self.run_test(
            "User Details by ID",
            "GET",
            f"users/{self.test_user_id}",
            200
        )

    # ===== CORE APP DATA APIs =====
    
    def test_conversations(self):
        """Test GET /api/conversations - User conversations"""
        return self.run_test(
            "User Conversations",
            "GET",
            "conversations",
            200
        )

    def test_knowledge_base(self):
        """Test GET /api/knowledge-base - Knowledge base items"""
        return self.run_test(
            "Knowledge Base",
            "GET",
            "knowledge-base",
            200
        )

    def test_chat_sessions(self):
        """Test GET /api/chat/sessions - Chat session management"""
        return self.run_test(
            "Chat Sessions",
            "GET",
            "chat/sessions",
            200
        )

    def test_config_user_preferences(self):
        """Test GET /api/config/user-preferences - User configuration"""
        return self.run_test(
            "User Preferences Config",
            "GET",
            "config/user-preferences",
            200
        )

    # ===== ADVANCED FEATURE APIs =====
    
    def test_workflows(self):
        """Test GET /api/workflows - Workflow management"""
        return self.run_test(
            "Workflows",
            "GET",
            "workflows",
            200
        )

    def test_integrations(self):
        """Test GET /api/integrations - Integration marketplace"""
        return self.run_test(
            "Integrations",
            "GET",
            "integrations",
            200
        )

    def test_ai_agents(self):
        """Test GET /api/ai-agents - AI agent management"""
        return self.run_test(
            "AI Agents",
            "GET",
            "ai-agents",
            200
        )

    def test_beta_testing(self):
        """Test GET /api/beta-testing - Beta testing features"""
        return self.run_test(
            "Beta Testing",
            "GET",
            "beta-testing",
            200
        )

    # ===== ALTERNATIVE ENDPOINT VARIATIONS =====
    
    def test_alternative_endpoints(self):
        """Test alternative endpoint patterns that might exist"""
        print("\n🔍 Testing Alternative Endpoint Patterns...")
        
        alternative_tests = [
            # Analytics variations
            ("Analytics Overview", "GET", "analytics/overview", 200),
            ("Analytics Dashboard User", "GET", f"analytics/dashboard/{self.test_user_id}", 200),
            ("Analytics User Metrics", "GET", f"analytics/metrics/{self.test_user_id}", 200),
            
            # Progress variations
            ("User Progress", "GET", f"progress/{self.test_user_id}", 200),
            ("User Goals", "GET", f"progress/goals/{self.test_user_id}", 200),
            ("User Achievements", "GET", f"progress/achievements/{self.test_user_id}", 200),
            
            # Mobile variations
            ("Mobile Config", "GET", "mobile/config", 200),
            ("Mobile User Settings", "GET", f"mobile/settings/{self.test_user_id}", 200),
            
            # Session variations
            ("User Sessions", "GET", f"sessions/{self.test_user_id}", 200),
            ("Chat History", "GET", f"chat/history/{self.test_user_id}", 200),
            
            # Knowledge base variations
            ("User Knowledge Base", "GET", f"knowledge-base/{self.test_user_id}", 200),
            
            # Workflow variations
            ("User Workflows", "GET", f"workflows/user/{self.test_user_id}", 200),
            ("Workflow Templates", "GET", "workflow-templates", 200),
            
            # Integration variations
            ("Available Integrations", "GET", "integrations/available", 200),
            ("User Integrations", "GET", f"integrations/user/{self.test_user_id}", 200),
            
            # AI Agent variations
            ("User AI Agents", "GET", f"ai-agents/user/{self.test_user_id}", 200),
            ("AI Agent Templates", "GET", "ai-agents/templates", 200),
        ]
        
        successful_alternatives = 0
        
        for name, method, endpoint, expected_status in alternative_tests:
            success, _ = self.run_test(name, method, endpoint, expected_status)
            if success:
                successful_alternatives += 1
        
        print(f"\n   📊 Alternative Endpoints: {successful_alternatives}/{len(alternative_tests)} working")
        return successful_alternatives > 0

    # ===== CORS AND CONFIGURATION TESTS =====
    
    def test_cors_configuration(self):
        """Test CORS configuration for frontend access"""
        print("\n🌐 Testing CORS Configuration...")
        
        # Test OPTIONS request (preflight)
        try:
            response = requests.options(
                self.base_url,
                headers={
                    'Origin': 'https://modq-saml.preview.emergentagent.com',
                    'Access-Control-Request-Method': 'GET',
                    'Access-Control-Request-Headers': 'Content-Type,Authorization'
                },
                timeout=10
            )
            
            print(f"   OPTIONS Status: {response.status_code}")
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
                'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
            }
            
            print(f"   CORS Headers: {cors_headers}")
            
            # Check if CORS is properly configured
            if (cors_headers['Access-Control-Allow-Origin'] in ['*', 'https://modq-saml.preview.emergentagent.com'] and
                'GET' in str(cors_headers.get('Access-Control-Allow-Methods', '')) and
                'POST' in str(cors_headers.get('Access-Control-Allow-Methods', ''))):
                print("   ✅ CORS configuration appears correct")
                return True
            else:
                print("   ⚠️ CORS configuration may need adjustment")
                return False
                
        except Exception as e:
            print(f"   ❌ CORS test failed: {str(e)}")
            return False

    def test_root_api_endpoint(self):
        """Test root API endpoint accessibility"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def run_all_tests(self):
        """Run all navigation tab API tests"""
        print("=" * 80)
        print("🚀 NAVIGATION TABS BACKEND API TEST SUITE")
        print("=" * 80)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Setup
        if not self.setup_test_user():
            print("\n❌ CRITICAL: Failed to setup test user. Cannot proceed with authenticated tests.")
            return False
        
        # Test categories
        test_categories = [
            ("🏠 Root & CORS Tests", [
                self.test_root_api_endpoint,
                self.test_cors_configuration,
            ]),
            ("📊 Analytics & Progress APIs", [
                self.test_analytics_dashboard,
                self.test_analytics_metrics,
                self.test_progress_goals,
                self.test_progress_achievements,
                self.test_usage_analytics_summary,
            ]),
            ("📱 Mobile & Configuration APIs", [
                self.test_mobile_settings_get,
                self.test_mobile_settings_put,
                self.test_mobile_performance,
            ]),
            ("📚 API Documentation System", [
                self.test_docs_endpoints,
                self.test_docs_examples,
                self.test_docs_authentication,
            ]),
            ("👤 User & Session Management", [
                self.test_auth_me,
                self.test_users_by_id,
            ]),
            ("💬 Core App Data APIs", [
                self.test_conversations,
                self.test_knowledge_base,
                self.test_chat_sessions,
                self.test_config_user_preferences,
            ]),
            ("🔧 Advanced Feature APIs", [
                self.test_workflows,
                self.test_integrations,
                self.test_ai_agents,
                self.test_beta_testing,
            ]),
            ("🔄 Alternative Endpoints", [
                self.test_alternative_endpoints,
            ])
        ]
        
        # Run tests by category
        for category_name, test_functions in test_categories:
            print(f"\n{category_name}")
            print("-" * 60)
            
            category_passed = 0
            category_total = len(test_functions)
            
            for test_func in test_functions:
                try:
                    success, _ = test_func()
                    if success:
                        category_passed += 1
                except Exception as e:
                    print(f"❌ Test {test_func.__name__} failed with exception: {str(e)}")
            
            print(f"\n   📊 Category Results: {category_passed}/{category_total} tests passed")
        
        # Final results
        print("\n" + "=" * 80)
        print("📋 FINAL TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for i, failed_test in enumerate(self.failed_tests, 1):
                print(f"   {i}. {failed_test}")
        
        if self.successful_tests:
            print(f"\n✅ SUCCESSFUL TESTS ({len(self.successful_tests)}):")
            for i, successful_test in enumerate(self.successful_tests, 1):
                print(f"   {i}. {successful_test}")
        
        print("\n" + "=" * 80)
        
        # Return True if at least 50% of tests pass
        return (self.tests_passed / self.tests_run) >= 0.5

if __name__ == "__main__":
    tester = NavigationTabsTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 Navigation tabs API testing completed successfully!")
    else:
        print("⚠️ Navigation tabs API testing completed with issues.")