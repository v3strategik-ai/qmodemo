import requests
import json
from datetime import datetime

class FocusedOptionsEFTester:
    def __init__(self, base_url="https://ai-business-intel.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = "test-ef-user-123"
        self.test_user_token = None
        self.failed_tests = []
        self.passed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

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
                response = requests.delete(url, json=data, headers=headers, params=params, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.passed_tests.append(name)
                print(f"✅ PASSED - {name}")
                try:
                    response_data = response.json()
                    print(f"   Response preview: {str(response_data)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                self.failed_tests.append(f"{name} - Expected {expected_status}, got {response.status_code}")
                print(f"❌ FAILED - {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append(f"{name} - Exception: {str(e)}")
            print(f"❌ FAILED - {name} - Error: {str(e)}")
            return False, {}

    def test_e1_endpoints(self):
        """Test E1: Enhanced Workflow Automation endpoints"""
        print("\n" + "="*60)
        print("🔧 E1: ENHANCED WORKFLOW AUTOMATION")
        print("="*60)
        
        # Test enhanced workflow creation
        workflow_data = {
            "user_id": self.test_user_id,
            "name": "Test Enhanced Workflow",
            "description": "Test workflow with enhanced features",
            "category": "lead_qualification",
            "nodes": [],
            "connections": [],
            "triggers": ["webhook"],
            "is_active": True
        }
        self.run_test("E1: Create Enhanced Workflow", "POST", "workflows/enhanced/create", 200, workflow_data)
        
        # Test get enhanced workflows
        self.run_test("E1: Get Enhanced Workflows", "GET", f"workflows/enhanced/{self.test_user_id}", 200)
        
        # Test workflow execution
        execution_data = {
            "workflow_id": "test-workflow-123",
            "user_id": self.test_user_id,
            "trigger_data": {"test": "data"}
        }
        self.run_test("E1: Execute Workflow", "POST", "workflows/execute", 200, execution_data)
        
        # Test execution history
        self.run_test("E1: Get Execution History", "GET", "workflows/test-workflow-123/executions", 200)
        
        # Test AI suggestions
        suggestion_data = {"user_id": self.test_user_id, "context": "test"}
        self.run_test("E1: Generate AI Suggestions", "POST", "workflows/test-workflow-123/suggestions", 200, suggestion_data)
        
        # Test workflow metrics
        self.run_test("E1: Get Workflow Metrics", "GET", "workflows/test-workflow-123/metrics", 200)

    def test_e2_endpoints(self):
        """Test E2: Advanced AI Integrations endpoints"""
        print("\n" + "="*60)
        print("🧠 E2: ADVANCED AI INTEGRATIONS")
        print("="*60)
        
        # Test available AI models
        self.run_test("E2: Get Available AI Models", "GET", "ai/models/available", 200)
        
        # Test multi-LLM chat
        chat_data = {
            "user_id": self.test_user_id,
            "message": "Test message for multi-LLM chat",
            "provider": "openai",
            "model": "gpt-4o"
        }
        self.run_test("E2: Multi-LLM Chat", "POST", "ai/chat/multi-llm", 200, chat_data)
        
        # Test create AI agent
        agent_data = {
            "name": "Test AI Agent",
            "type": "sales_agent",
            "provider": "openai",
            "model": "gpt-4o",
            "system_prompt": "You are a test AI agent",
            "user_id": self.test_user_id
        }
        self.run_test("E2: Create AI Agent", "POST", "ai/agents/create", 200, agent_data)
        
        # Test get user AI agents
        self.run_test("E2: Get User AI Agents", "GET", f"ai/agents/{self.test_user_id}", 200)
        
        # Test chat with AI agent
        agent_chat_data = {
            "user_id": self.test_user_id,
            "message": "Test message for AI agent chat"
        }
        self.run_test("E2: Chat with AI Agent", "POST", "ai/agents/test-agent-123/chat", 200, agent_chat_data)
        
        # Test AI agent templates
        self.run_test("E2: Get AI Agent Templates", "GET", "ai/agents/templates", 200)
        
        # Test create agent from template
        template_data = {
            "template_id": "sales-agent-template",
            "user_id": self.test_user_id,
            "customizations": {"name": "Custom Agent"}
        }
        self.run_test("E2: Create Agent from Template", "POST", "ai/agents/from-template", 200, template_data)

    def test_e3_endpoints(self):
        """Test E3: Custom Integration Marketplace endpoints"""
        print("\n" + "="*60)
        print("🏪 E3: CUSTOM INTEGRATION MARKETPLACE")
        print("="*60)
        
        # Test marketplace integrations
        self.run_test("E3: Get Marketplace Integrations", "GET", "integrations/marketplace", 200)
        
        # Test install integration
        install_data = {
            "integration_id": "test-integration",
            "user_id": self.test_user_id,
            "configuration": {"test": "config"}
        }
        self.run_test("E3: Install Integration", "POST", "integrations/install", 200, install_data)
        
        # Test get user integrations
        self.run_test("E3: Get User Integrations", "GET", f"integrations/user/{self.test_user_id}", 200)
        
        # Test configure integration
        config_data = {
            "user_id": self.test_user_id,
            "configuration": {"updated": "config"}
        }
        self.run_test("E3: Configure Integration", "POST", "integrations/test-integration-123/configure", 200, config_data)

    def test_e4_endpoints(self):
        """Test E4: Advanced Analytics & Reporting endpoints"""
        print("\n" + "="*60)
        print("📊 E4: ADVANCED ANALYTICS & REPORTING")
        print("="*60)
        
        # Test create custom report
        report_data = {
            "name": "Test Report",
            "description": "Test analytics report",
            "type": "pdf",
            "template_data": {"sections": []},
            "user_id": self.test_user_id
        }
        self.run_test("E4: Create Custom Report", "POST", "analytics/reports/create", 200, report_data)
        
        # Test get user reports
        self.run_test("E4: Get User Reports", "GET", f"analytics/reports/{self.test_user_id}", 200)
        
        # Test generate report
        generation_data = {
            "user_id": self.test_user_id,
            "parameters": {"test": "param"}
        }
        self.run_test("E4: Generate Report", "POST", "analytics/reports/test-report-123/generate", 200, generation_data)
        
        # Test create predictive model
        model_data = {
            "name": "Test Predictive Model",
            "model_type": "regression",
            "algorithm": "random_forest",
            "features": ["feature1", "feature2"],
            "user_id": self.test_user_id
        }
        self.run_test("E4: Create Predictive Model", "POST", "analytics/predictive/create-model", 200, model_data)
        
        # Test get user models
        self.run_test("E4: Get User Models", "GET", f"analytics/predictive/models/{self.test_user_id}", 200)
        
        # Test generate predictions
        prediction_data = {
            "user_id": self.test_user_id,
            "input_data": {"test": "data"}
        }
        self.run_test("E4: Generate Predictions", "POST", "analytics/predictive/test-model-123/predict", 200, prediction_data)
        
        # Test AI insights
        self.run_test("E4: Get AI Insights", "GET", f"analytics/insights/{self.test_user_id}", 200)

    def test_f1_endpoints(self):
        """Test F1: Performance Optimization endpoints"""
        print("\n" + "="*60)
        print("⚡ F1: PERFORMANCE OPTIMIZATION")
        print("="*60)
        
        # Test performance metrics
        self.run_test("F1: Get Performance Metrics", "GET", "performance/metrics", 200)
        
        # Test optimization tasks
        optimization_data = {
            "user_id": self.test_user_id,
            "optimization_type": "comprehensive"
        }
        self.run_test("F1: Run Optimization Tasks", "POST", "performance/optimize", 200, optimization_data)
        
        # Test health check
        self.run_test("F1: System Health Check", "GET", "performance/health-check", 200)

    def test_f2_endpoints(self):
        """Test F2: Mobile & PWA endpoints"""
        print("\n" + "="*60)
        print("📱 F2: MOBILE & PWA")
        print("="*60)
        
        # Test mobile config
        mobile_config = {
            "user_id": self.test_user_id,
            "push_notifications_enabled": True,
            "mobile_theme": "dark"
        }
        self.run_test("F2: Update Mobile Config", "POST", "mobile/config", 200, mobile_config)
        
        # Test get mobile config
        self.run_test("F2: Get Mobile Config", "GET", f"mobile/config/{self.test_user_id}", 200)
        
        # Test PWA install tracking
        install_data = {
            "user_id": self.test_user_id,
            "platform": "android"
        }
        self.run_test("F2: Track PWA Install", "POST", "pwa/install", 200, install_data)
        
        # Test offline data sync
        sync_data = {
            "user_id": self.test_user_id,
            "device_id": "test-device",
            "offline_changes": []
        }
        self.run_test("F2: Sync Offline Data", "POST", "mobile/sync/offline-data", 200, sync_data)
        
        # Test lightweight data
        self.run_test("F2: Get Lightweight Data", "GET", f"mobile/data/lightweight/{self.test_user_id}", 200)

    def test_f3_endpoints(self):
        """Test F3: Security Hardening endpoints"""
        print("\n" + "="*60)
        print("🔒 F3: SECURITY HARDENING")
        print("="*60)
        
        # Test security audit log
        audit_data = {
            "user_id": self.test_user_id,
            "action": "test_action",
            "resource": "test_resource",
            "success": True
        }
        self.run_test("F3: Log Security Event", "POST", "security/audit-log", 200, audit_data)
        
        # Test get audit log
        self.run_test("F3: Get Audit Log", "GET", f"security/audit-log/{self.test_user_id}", 200)
        
        # Test encrypt data
        encryption_data = {
            "user_id": self.test_user_id,
            "data": {"sensitive": "information"}
        }
        self.run_test("F3: Encrypt Data", "POST", "security/encrypt-data", 200, encryption_data)
        
        # Test access control
        access_data = {
            "user_id": self.test_user_id,
            "resource_type": "dashboard",
            "permissions": {"read": True}
        }
        self.run_test("F3: Set Access Control", "POST", "security/access-control", 200, access_data)
        
        # Test validate session
        session_data = {
            "user_id": self.test_user_id,
            "session_token": "test-token"
        }
        self.run_test("F3: Validate Session", "POST", "security/validate-session", 200, session_data)

    def test_f4_endpoints(self):
        """Test F4: Documentation endpoints"""
        print("\n" + "="*60)
        print("📚 F4: DOCUMENTATION")
        print("="*60)
        
        # Test API reference
        self.run_test("F4: Get API Reference", "GET", "docs/api-reference", 200)
        
        # Test user guides
        self.run_test("F4: Get User Guides", "GET", "docs/guides", 200)
        
        # Test code examples
        self.run_test("F4: Get Code Examples", "GET", "docs/examples", 200)

    def run_all_tests(self):
        """Run all focused Options E & F tests"""
        print("🚀 Starting Focused Options E & F Backend API Testing...")
        print("=" * 80)
        
        # Run all test categories
        self.test_e1_endpoints()
        self.test_e2_endpoints()
        self.test_e3_endpoints()
        self.test_e4_endpoints()
        self.test_f1_endpoints()
        self.test_f2_endpoints()
        self.test_f3_endpoints()
        self.test_f4_endpoints()
        
        # Final Results
        print("\n" + "=" * 80)
        print("📊 FOCUSED OPTIONS E & F TESTING RESULTS")
        print("=" * 80)
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print(f"\n✅ PASSED TESTS ({len(self.passed_tests)}):")
        for test in self.passed_tests:
            print(f"   • {test}")
        
        print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
        for test in self.failed_tests:
            print(f"   • {test}")
        
        if success_rate >= 80:
            print("\n🎉 Options E & F APIs are working well!")
        elif success_rate >= 60:
            print("\n⚠️ Options E & F APIs have some issues that need attention")
        else:
            print("\n❌ Options E & F APIs have significant issues requiring fixes")
        
        return success_rate >= 60

if __name__ == "__main__":
    tester = FocusedOptionsEFTester()
    tester.run_all_tests()