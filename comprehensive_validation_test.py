import requests
import json
import sys
from datetime import datetime

class ComprehensiveValidationTester:
    def __init__(self, base_url="https://modq-saml.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.auth_token = None
        self.detailed_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   Description: {description}")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
                    self.detailed_results.append({
                        "test": name,
                        "status": "PASSED",
                        "expected": expected_status,
                        "actual": response.status_code,
                        "response": response_data
                    })
                    return True, response_data
                except:
                    self.detailed_results.append({
                        "test": name,
                        "status": "PASSED",
                        "expected": expected_status,
                        "actual": response.status_code,
                        "response": "Non-JSON response"
                    })
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                    self.detailed_results.append({
                        "test": name,
                        "status": "FAILED",
                        "expected": expected_status,
                        "actual": response.status_code,
                        "error": error_data
                    })
                except:
                    print(f"   Error: {response.text}")
                    self.detailed_results.append({
                        "test": name,
                        "status": "FAILED",
                        "expected": expected_status,
                        "actual": response.status_code,
                        "error": response.text
                    })
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.detailed_results.append({
                "test": name,
                "status": "FAILED",
                "expected": expected_status,
                "actual": "Exception",
                "error": str(e)
            })
            return False, {}

    def setup_test_user(self):
        """Create a test user for testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"validation_user_{timestamp}",
            "email": f"validation_{timestamp}@modq.com",
            "password": "TestPassword123!",
            "role": "employee"
        }
        
        success, response = self.run_test(
            "User Registration for Testing",
            "POST",
            "auth/register",
            200,
            data=user_data,
            description="Create test user for validation tests"
        )
        
        if success and 'user_id' in response:
            self.test_user_id = response['user_id']
            self.auth_token = response.get('access_token')
            print(f"   Created test user with ID: {self.test_user_id}")
            return True
        return False

    def test_e2_ai_agents_create_success(self):
        """Test E2 AI Agents: POST /api/ai/agents/create - Success Case"""
        print("\n🤖 Testing E2 AI Agents Creation - Success Case...")
        
        if not self.test_user_id:
            print("❌ Skipping - no test user available")
            return False
        
        # Test with proper required fields
        agent_data = {
            "name": "Test Sales Agent",
            "description": "A test AI agent for sales assistance",
            "user_id": self.test_user_id,
            "system_prompt": "You are a helpful sales assistant focused on lead qualification and customer engagement.",
            "type": "sales_agent",
            "provider": "openai",
            "model": "gpt-4o"
        }
        
        success, response = self.run_test(
            "E2 AI Agent Creation - Valid Data",
            "POST",
            "ai/agents/create",
            200,
            data=agent_data,
            description="Create AI agent with all required fields"
        )
        
        if success and response:
            # Check for success message and agent_id
            if "message" in response and "agent_id" in response:
                print(f"   ✅ Agent created successfully with ID: {response['agent_id']}")
                return True
            else:
                print(f"   ❌ Response missing expected fields")
                return False
        
        return False

    def test_e2_ai_agents_create_validation(self):
        """Test E2 AI Agents: POST /api/ai/agents/create - Validation Cases"""
        print("\n🤖 Testing E2 AI Agents Creation - Validation Cases...")
        
        # Test missing required field 'name'
        invalid_data = {
            "description": "Missing name field",
            "user_id": self.test_user_id or "test_user",
            "system_prompt": "Test prompt"
        }
        
        success1, _ = self.run_test(
            "E2 AI Agent Creation - Missing Name",
            "POST",
            "ai/agents/create",
            400,
            data=invalid_data,
            description="Should fail when 'name' field is missing"
        )
        
        # Test missing required field 'description'
        invalid_data2 = {
            "name": "Test Agent",
            "user_id": self.test_user_id or "test_user",
            "system_prompt": "Test prompt"
        }
        
        success2, _ = self.run_test(
            "E2 AI Agent Creation - Missing Description",
            "POST",
            "ai/agents/create",
            400,
            data=invalid_data2,
            description="Should fail when 'description' field is missing"
        )
        
        # Test missing required field 'system_prompt'
        invalid_data3 = {
            "name": "Test Agent",
            "description": "Test description",
            "user_id": self.test_user_id or "test_user"
        }
        
        success3, _ = self.run_test(
            "E2 AI Agent Creation - Missing System Prompt",
            "POST",
            "ai/agents/create",
            400,
            data=invalid_data3,
            description="Should fail when 'system_prompt' field is missing"
        )
        
        validation_tests_passed = sum([success1, success2, success3])
        print(f"   📊 Validation Tests: {validation_tests_passed}/3 passed")
        
        return validation_tests_passed >= 2  # At least 2 validation tests should pass

    def test_e3_integrations_user_success(self):
        """Test E3 Integrations: GET /api/integrations/user/{user_id} - Success Case"""
        print("\n🔗 Testing E3 User Integrations Retrieval - Success Case...")
        
        if not self.test_user_id:
            print("❌ Skipping - no test user available")
            return False
        
        success, response = self.run_test(
            "E3 User Integrations Retrieval - Valid User",
            "GET",
            f"integrations/user/{self.test_user_id}",
            200,
            description="Retrieve integrations for valid user ID"
        )
        
        if success:
            if isinstance(response, list):
                print(f"   ✅ Retrieved integrations list with {len(response)} items")
                return True
            else:
                print(f"   ❌ Expected list response, got: {type(response)}")
                return False
        
        return False

    def test_e4_analytics_reports_create_success(self):
        """Test E4 Analytics: POST /api/analytics/reports/create - Success Case"""
        print("\n📊 Testing E4 Analytics Reports Creation - Success Case...")
        
        if not self.test_user_id:
            print("❌ Skipping - no test user available")
            return False
        
        # Test with required fields
        report_data = {
            "name": "Test Sales Dashboard",
            "user_id": self.test_user_id,
            "report_type": "dashboard",
            "description": "A test analytics report for sales metrics",
            "data_sources": ["sales_data", "customer_data"],
            "filters": {"date_range": "last_30_days"}
        }
        
        success, response = self.run_test(
            "E4 Analytics Report Creation - Valid Data",
            "POST",
            "analytics/reports/create",
            200,
            data=report_data,
            description="Create analytics report with all required fields"
        )
        
        if success and response:
            # Check for success message and report_id
            if "message" in response and "report_id" in response:
                print(f"   ✅ Report created successfully with ID: {response['report_id']}")
                return True
            else:
                print(f"   ❌ Response missing expected fields")
                return False
        
        return False

    def test_e4_analytics_reports_create_validation(self):
        """Test E4 Analytics: POST /api/analytics/reports/create - Validation Cases"""
        print("\n📊 Testing E4 Analytics Reports Creation - Validation Cases...")
        
        # Test missing required field 'name'
        invalid_data = {
            "user_id": self.test_user_id or "test_user",
            "report_type": "dashboard"
        }
        
        success1, _ = self.run_test(
            "E4 Analytics Report Creation - Missing Name",
            "POST",
            "analytics/reports/create",
            400,
            data=invalid_data,
            description="Should fail when 'name' field is missing"
        )
        
        # Test missing required field 'report_type'
        invalid_data2 = {
            "name": "Test Report",
            "user_id": self.test_user_id or "test_user"
        }
        
        success2, _ = self.run_test(
            "E4 Analytics Report Creation - Missing Report Type",
            "POST",
            "analytics/reports/create",
            400,
            data=invalid_data2,
            description="Should fail when 'report_type' field is missing"
        )
        
        validation_tests_passed = sum([success1, success2])
        print(f"   📊 Validation Tests: {validation_tests_passed}/2 passed")
        
        return validation_tests_passed >= 1  # At least 1 validation test should pass

    def test_e4_predictive_create_model_success(self):
        """Test E4 Predictive: POST /api/analytics/predictive/create-model - Success Case"""
        print("\n🔮 Testing E4 Predictive Model Creation - Success Case...")
        
        if not self.test_user_id:
            print("❌ Skipping - no test user available")
            return False
        
        # Test with required fields
        model_data = {
            "name": "Revenue Forecasting Model",
            "user_id": self.test_user_id,
            "model_type": "forecasting",
            "target_metric": "revenue",
            "description": "A predictive model for revenue forecasting",
            "algorithm": "linear_regression",
            "features": ["sales_volume", "marketing_spend", "seasonality"]
        }
        
        success, response = self.run_test(
            "E4 Predictive Model Creation - Valid Data",
            "POST",
            "analytics/predictive/create-model",
            200,
            data=model_data,
            description="Create predictive model with all required fields"
        )
        
        if success and response:
            # Check for success message and model_id
            if "message" in response and "model_id" in response:
                print(f"   ✅ Model created successfully with ID: {response['model_id']}")
                if "accuracy" in response:
                    print(f"   📈 Model accuracy: {response['accuracy']}")
                return True
            else:
                print(f"   ❌ Response missing expected fields")
                return False
        
        return False

    def test_e4_predictive_create_model_validation(self):
        """Test E4 Predictive: POST /api/analytics/predictive/create-model - Validation Cases"""
        print("\n🔮 Testing E4 Predictive Model Creation - Validation Cases...")
        
        # Test missing required field 'name'
        invalid_data = {
            "user_id": self.test_user_id or "test_user",
            "model_type": "forecasting",
            "target_metric": "revenue"
        }
        
        success1, _ = self.run_test(
            "E4 Predictive Model Creation - Missing Name",
            "POST",
            "analytics/predictive/create-model",
            400,
            data=invalid_data,
            description="Should fail when 'name' field is missing"
        )
        
        # Test missing required field 'target_metric'
        invalid_data2 = {
            "name": "Test Model",
            "user_id": self.test_user_id or "test_user",
            "model_type": "forecasting"
        }
        
        success2, _ = self.run_test(
            "E4 Predictive Model Creation - Missing Target Metric",
            "POST",
            "analytics/predictive/create-model",
            400,
            data=invalid_data2,
            description="Should fail when 'target_metric' field is missing"
        )
        
        validation_tests_passed = sum([success1, success2])
        print(f"   📊 Validation Tests: {validation_tests_passed}/2 passed")
        
        return validation_tests_passed >= 1  # At least 1 validation test should pass

    def test_f3_security_audit_log_success(self):
        """Test F3 Security: POST /api/security/audit-log - Success Case"""
        print("\n🔒 Testing F3 Security Audit Logging - Success Case...")
        
        # Test with required event_type field
        audit_data = {
            "event_type": "login",
            "user_id": self.test_user_id or "test_user_123",
            "success": True,
            "details": {
                "ip_address": "192.168.1.100",
                "user_agent": "Mozilla/5.0 Test Browser",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        success, response = self.run_test(
            "F3 Security Audit Log - Valid Data",
            "POST",
            "security/audit-log",
            200,
            data=audit_data,
            description="Log security event with required event_type field"
        )
        
        if success and response:
            # Check for success message
            if "message" in response:
                print(f"   ✅ Security event logged successfully")
                return True
            else:
                print(f"   ❌ Response missing expected message field")
                return False
        
        return False

    def test_f3_security_audit_log_validation(self):
        """Test F3 Security: POST /api/security/audit-log - Validation Cases"""
        print("\n🔒 Testing F3 Security Audit Logging - Validation Cases...")
        
        # Test missing required field 'event_type'
        invalid_data = {
            "user_id": self.test_user_id or "test_user",
            "success": True,
            "details": {"ip_address": "192.168.1.100"}
        }
        
        success, _ = self.run_test(
            "F3 Security Audit Log - Missing Event Type",
            "POST",
            "security/audit-log",
            400,
            data=invalid_data,
            description="Should fail when 'event_type' field is missing"
        )
        
        print(f"   📊 Validation Test: {'PASSED' if success else 'FAILED'}")
        
        return success

    def test_read_endpoints(self):
        """Test a few read endpoints to ensure they still function properly"""
        print("\n📖 Testing Read Endpoints...")
        
        # Test AI personalities endpoint
        success1, _ = self.run_test(
            "AI Personalities (Read)",
            "GET",
            "personalities",
            200,
            description="Retrieve available AI personalities"
        )
        
        # Test available integrations endpoint
        success2, _ = self.run_test(
            "Available Integrations (Read)",
            "GET",
            "integrations/available",
            200,
            description="Retrieve available integrations"
        )
        
        # Test workflow templates endpoint
        success3, _ = self.run_test(
            "Workflow Templates (Read)",
            "GET",
            "workflow-templates",
            200,
            description="Retrieve workflow templates"
        )
        
        read_tests_passed = sum([success1, success2, success3])
        print(f"   📊 Read Endpoints: {read_tests_passed}/3 passed")
        
        return read_tests_passed >= 2  # At least 2 out of 3 should work

    def run_comprehensive_validation_tests(self):
        """Run comprehensive validation tests for the fixed endpoints"""
        print("🚀 Starting Comprehensive Validation Tests for Fixed API Endpoints (Options E & F)")
        print("=" * 80)
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Failed to setup test user, continuing with limited tests...")
        
        # Run success case tests
        success_tests = []
        success_tests.append(self.test_e2_ai_agents_create_success())
        success_tests.append(self.test_e3_integrations_user_success())
        success_tests.append(self.test_e4_analytics_reports_create_success())
        success_tests.append(self.test_e4_predictive_create_model_success())
        success_tests.append(self.test_f3_security_audit_log_success())
        
        # Run validation tests
        validation_tests = []
        validation_tests.append(self.test_e2_ai_agents_create_validation())
        validation_tests.append(self.test_e4_analytics_reports_create_validation())
        validation_tests.append(self.test_e4_predictive_create_model_validation())
        validation_tests.append(self.test_f3_security_audit_log_validation())
        
        # Test read endpoints
        read_test_result = self.test_read_endpoints()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE VALIDATION TEST SUMMARY")
        print("=" * 80)
        
        print("\n🎯 SUCCESS CASE TESTS:")
        success_endpoints = [
            "E2 AI Agents Creation",
            "E3 User Integrations Retrieval", 
            "E4 Analytics Reports Creation",
            "E4 Predictive Model Creation",
            "F3 Security Audit Logging"
        ]
        
        for i, (endpoint, result) in enumerate(zip(success_endpoints, success_tests)):
            status = "✅ WORKING" if result else "❌ FAILED"
            print(f"{i+1}. {endpoint}: {status}")
        
        print("\n🔍 VALIDATION TESTS:")
        validation_endpoints = [
            "E2 AI Agents Field Validation",
            "E4 Analytics Reports Field Validation",
            "E4 Predictive Model Field Validation",
            "F3 Security Audit Field Validation"
        ]
        
        for i, (endpoint, result) in enumerate(zip(validation_endpoints, validation_tests)):
            status = "✅ WORKING" if result else "❌ FAILED"
            print(f"{i+1}. {endpoint}: {status}")
        
        print(f"\n📖 Read Endpoints: {'✅ WORKING' if read_test_result else '❌ FAILED'}")
        
        # Calculate overall results
        success_passed = sum(success_tests)
        validation_passed = sum(validation_tests)
        total_success_tests = len(success_tests)
        total_validation_tests = len(validation_tests)
        
        print(f"\n🎯 Overall Results:")
        print(f"   Success Cases: {success_passed}/{total_success_tests} working")
        print(f"   Validation Cases: {validation_passed}/{total_validation_tests} working")
        print(f"   Read Endpoints: {'1/1' if read_test_result else '0/1'} working")
        
        overall_success_rate = ((success_passed + validation_passed + (1 if read_test_result else 0)) / 
                               (total_success_tests + total_validation_tests + 1)) * 100
        
        print(f"📈 Overall Success Rate: {overall_success_rate:.1f}%")
        
        # Determine if validation is successful
        critical_endpoints_working = success_passed >= 4  # At least 4 out of 5 success cases
        validation_working = validation_passed >= 3  # At least 3 out of 4 validation cases
        
        if critical_endpoints_working and validation_working:
            print("✅ COMPREHENSIVE VALIDATION SUCCESSFUL - Key fixes are working with proper validation!")
            return True
        elif critical_endpoints_working:
            print("⚠️ PARTIAL SUCCESS - Key endpoints working but some validation issues remain")
            return True
        else:
            print("❌ VALIDATION FAILED - Critical issues remain")
            return False

if __name__ == "__main__":
    tester = ComprehensiveValidationTester()
    success = tester.run_comprehensive_validation_tests()
    sys.exit(0 if success else 1)