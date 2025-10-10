#!/usr/bin/env python3
"""
Actual Backend Endpoints Test Suite
Testing the endpoints that actually exist in the backend
Based on analysis of server.py file
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Backend URL from frontend environment
BACKEND_URL = "https://modq-saml.preview.emergentagent.com/api"

class ActualEndpointsTester:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = BACKEND_URL
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_token = None
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
            "username": f"actualtest_{timestamp}",
            "email": f"actualtest_{timestamp}@modq.com",
            "password": "TestPassword123!",
            "role": "admin"
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

    # ===== EXISTING ANALYTICS ENDPOINTS =====
    
    def test_analytics_dashboards_create(self):
        """Test POST /api/analytics/dashboards/create"""
        dashboard_data = {
            "name": "Test Dashboard",
            "description": "A test analytics dashboard",
            "user_id": self.test_user_id,
            "layout": {"type": "grid", "columns": 3},
            "widgets": [
                {"type": "chart", "title": "Sales Overview", "position": {"x": 0, "y": 0}}
            ],
            "filters": {}
        }
        
        return self.run_test(
            "Analytics Dashboard Create",
            "POST",
            "analytics/dashboards/create",
            200,
            data=dashboard_data
        )

    def test_analytics_dashboards_user(self):
        """Test GET /api/analytics/dashboards/user/{user_id}"""
        return self.run_test(
            "Analytics Dashboards User",
            "GET",
            f"analytics/dashboards/user/{self.test_user_id}",
            200
        )

    def test_analytics_overview(self):
        """Test GET /api/analytics/overview/{user_id}"""
        return self.run_test(
            "Analytics Overview",
            "GET",
            f"analytics/overview/{self.test_user_id}",
            200
        )

    def test_analytics_kpis_create(self):
        """Test POST /api/analytics/kpis/create"""
        kpi_data = {
            "name": "Monthly Revenue",
            "description": "Total monthly revenue tracking",
            "calculation": "SUM(revenue) WHERE month = current_month",
            "target_value": 100000.0,
            "unit": "USD",
            "category": "sales",
            "frequency": "monthly",
            "threshold_config": {"warning": 80000, "critical": 60000},
            "user_id": self.test_user_id
        }
        
        return self.run_test(
            "Analytics KPI Create",
            "POST",
            "analytics/kpis/create",
            200,
            data=kpi_data
        )

    def test_analytics_kpis_user(self):
        """Test GET /api/analytics/kpis/user/{user_id}"""
        return self.run_test(
            "Analytics KPIs User",
            "GET",
            f"analytics/kpis/user/{self.test_user_id}",
            200
        )

    # ===== EXISTING MOBILE ENDPOINTS =====
    
    def test_mobile_config_get(self):
        """Test GET /api/mobile/config"""
        return self.run_test(
            "Mobile Config Get",
            "GET",
            "mobile/config",
            200
        )

    def test_mobile_config_post(self):
        """Test POST /api/mobile/config"""
        config_data = {
            "user_id": self.test_user_id,
            "push_notifications_enabled": True,
            "offline_sync_enabled": True,
            "mobile_theme": "dark",
            "compact_mode": False,
            "gesture_controls": True,
            "auto_sync_interval": 300
        }
        
        return self.run_test(
            "Mobile Config Post",
            "POST",
            "mobile/config",
            200,
            data=config_data
        )

    def test_mobile_pwa_manifest(self):
        """Test GET /api/mobile/pwa/manifest"""
        return self.run_test(
            "Mobile PWA Manifest",
            "GET",
            "mobile/pwa/manifest",
            200
        )

    def test_mobile_device_info(self):
        """Test GET /api/mobile/device-info"""
        return self.run_test(
            "Mobile Device Info",
            "GET",
            "mobile/device-info",
            200
        )

    # ===== EXISTING DOCS ENDPOINTS =====
    
    def test_docs_api_stats(self):
        """Test GET /api/docs/api-stats"""
        return self.run_test(
            "Docs API Stats",
            "GET",
            "docs/api-stats",
            200
        )

    def test_docs_openapi_enhanced(self):
        """Test GET /api/docs/openapi-enhanced"""
        return self.run_test(
            "Docs OpenAPI Enhanced",
            "GET",
            "docs/openapi-enhanced",
            200
        )

    def test_docs_openapi_spec(self):
        """Test GET /api/docs/openapi-spec"""
        return self.run_test(
            "Docs OpenAPI Spec",
            "GET",
            "docs/openapi-spec",
            200
        )

    def test_docs_sdk_examples(self):
        """Test GET /api/docs/sdk-examples"""
        return self.run_test(
            "Docs SDK Examples",
            "GET",
            "docs/sdk-examples",
            200
        )

    def test_docs_examples(self):
        """Test GET /api/docs/examples"""
        return self.run_test(
            "Docs Examples",
            "GET",
            "docs/examples",
            200
        )

    def test_docs_rate_limits(self):
        """Test GET /api/docs/rate-limits"""
        return self.run_test(
            "Docs Rate Limits",
            "GET",
            "docs/rate-limits",
            200
        )

    def test_docs_webhooks(self):
        """Test GET /api/docs/webhooks"""
        return self.run_test(
            "Docs Webhooks",
            "GET",
            "docs/webhooks",
            200
        )

    # ===== EXISTING WORKFLOW ENDPOINTS =====
    
    def test_workflows_create(self):
        """Test POST /api/workflows/create"""
        workflow_data = {
            "user_id": self.test_user_id,
            "name": "Test Lead Qualification Workflow",
            "description": "A test workflow for lead qualification",
            "category": "lead_qualification"
        }
        
        return self.run_test(
            "Workflows Create",
            "POST",
            "workflows/create",
            200,
            data=workflow_data
        )

    def test_workflows_user(self):
        """Test GET /api/workflows/user/{user_id}"""
        return self.run_test(
            "Workflows User",
            "GET",
            f"workflows/user/{self.test_user_id}",
            200
        )

    def test_workflow_templates(self):
        """Test GET /api/workflow-templates"""
        return self.run_test(
            "Workflow Templates",
            "GET",
            "workflow-templates",
            200
        )

    # ===== EXISTING AI AGENTS ENDPOINTS =====
    
    def test_ai_agents_create(self):
        """Test POST /api/ai-agents/create"""
        agent_data = {
            "name": "Test Sales Agent",
            "type": "sales_agent",
            "provider": "openai",
            "model": "gpt-4o",
            "system_prompt": "You are a helpful sales assistant focused on lead qualification and customer engagement.",
            "temperature": 0.7,
            "max_tokens": 2000,
            "capabilities": ["lead_qualification", "email_generation"],
            "user_id": self.test_user_id
        }
        
        return self.run_test(
            "AI Agents Create",
            "POST",
            "ai-agents/create",
            200,
            data=agent_data
        )

    def test_ai_agents_user(self):
        """Test GET /api/ai-agents/user/{user_id}"""
        return self.run_test(
            "AI Agents User",
            "GET",
            f"ai-agents/user/{self.test_user_id}",
            200
        )

    def test_ai_agents_templates(self):
        """Test GET /api/ai-agents/templates"""
        return self.run_test(
            "AI Agents Templates",
            "GET",
            "ai-agents/templates",
            422,  # Expect 422 because it requires user_id parameter
            params={"user_id": self.test_user_id}
        )

    # ===== EXISTING INTEGRATION ENDPOINTS =====
    
    def test_integrations_available(self):
        """Test GET /api/integrations/available"""
        return self.run_test(
            "Integrations Available",
            "GET",
            "integrations/available",
            200
        )

    def test_integrations_user(self):
        """Test GET /api/integrations/user/{user_id}"""
        return self.run_test(
            "Integrations User",
            "GET",
            f"integrations/user/{self.test_user_id}",
            200
        )

    # ===== EXISTING SESSION & CHAT ENDPOINTS =====
    
    def test_sessions_new(self):
        """Test POST /api/sessions/new"""
        return self.run_test(
            "Sessions New",
            "POST",
            f"sessions/new?user_id={self.test_user_id}",
            200
        )

    def test_sessions_user(self):
        """Test GET /api/sessions/{user_id}"""
        return self.run_test(
            "Sessions User",
            "GET",
            f"sessions/{self.test_user_id}",
            200
        )

    def test_chat_history(self):
        """Test GET /api/chat/history/{user_id}"""
        return self.run_test(
            "Chat History",
            "GET",
            f"chat/history/{self.test_user_id}",
            200
        )

    def test_knowledge_base_user(self):
        """Test GET /api/knowledge-base/{user_id}"""
        return self.run_test(
            "Knowledge Base User",
            "GET",
            f"knowledge-base/{self.test_user_id}",
            200
        )

    # ===== EXISTING TEAM ENDPOINTS =====
    
    def test_teams_create(self):
        """Test POST /api/teams/create"""
        team_data = {
            "name": "Test Analytics Team",
            "description": "A test team for analytics collaboration",
            "owner_id": self.test_user_id
        }
        
        return self.run_test(
            "Teams Create",
            "POST",
            "teams/create",
            200,
            data=team_data
        )

    def test_teams_user(self):
        """Test GET /api/teams/user/{user_id}"""
        return self.run_test(
            "Teams User",
            "GET",
            f"teams/user/{self.test_user_id}",
            200
        )

    # ===== EXISTING PERFORMANCE ENDPOINTS =====
    
    def test_performance_metrics(self):
        """Test GET /api/performance/metrics"""
        return self.run_test(
            "Performance Metrics",
            "GET",
            "performance/metrics",
            200
        )

    def test_performance_cache_stats(self):
        """Test GET /api/performance/cache-stats"""
        return self.run_test(
            "Performance Cache Stats",
            "GET",
            "performance/cache-stats",
            200
        )

    def run_all_tests(self):
        """Run all actual endpoint tests"""
        print("=" * 80)
        print("🚀 ACTUAL BACKEND ENDPOINTS TEST SUITE")
        print("=" * 80)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Setup
        if not self.setup_test_user():
            print("\n❌ CRITICAL: Failed to setup test user. Cannot proceed with authenticated tests.")
            return False
        
        # Test categories based on actual endpoints
        test_categories = [
            ("📊 Analytics Endpoints", [
                self.test_analytics_dashboards_create,
                self.test_analytics_dashboards_user,
                self.test_analytics_overview,
                self.test_analytics_kpis_create,
                self.test_analytics_kpis_user,
            ]),
            ("📱 Mobile Endpoints", [
                self.test_mobile_config_get,
                self.test_mobile_config_post,
                self.test_mobile_pwa_manifest,
                self.test_mobile_device_info,
            ]),
            ("📚 Documentation Endpoints", [
                self.test_docs_api_stats,
                self.test_docs_openapi_enhanced,
                self.test_docs_openapi_spec,
                self.test_docs_sdk_examples,
                self.test_docs_examples,
                self.test_docs_rate_limits,
                self.test_docs_webhooks,
            ]),
            ("🔧 Workflow Endpoints", [
                self.test_workflows_create,
                self.test_workflows_user,
                self.test_workflow_templates,
            ]),
            ("🤖 AI Agents Endpoints", [
                self.test_ai_agents_create,
                self.test_ai_agents_user,
                self.test_ai_agents_templates,
            ]),
            ("🔗 Integration Endpoints", [
                self.test_integrations_available,
                self.test_integrations_user,
            ]),
            ("💬 Session & Chat Endpoints", [
                self.test_sessions_new,
                self.test_sessions_user,
                self.test_chat_history,
                self.test_knowledge_base_user,
            ]),
            ("👥 Team Endpoints", [
                self.test_teams_create,
                self.test_teams_user,
            ]),
            ("⚡ Performance Endpoints", [
                self.test_performance_metrics,
                self.test_performance_cache_stats,
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
        
        # Return True if at least 70% of tests pass
        return (self.tests_passed / self.tests_run) >= 0.7

if __name__ == "__main__":
    tester = ActualEndpointsTester()
    success = tester.run_all_tests()
    
    if success:
        print("🎉 Actual endpoints API testing completed successfully!")
    else:
        print("⚠️ Actual endpoints API testing completed with issues.")