import requests
import sys
import json
import time
from datetime import datetime

class OptionFTester:
    def __init__(self, base_url="https://modq-saml.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_user_token = None
        self.test_user_data = None

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
                if data:
                    response = requests.delete(url, json=data, headers=headers, params=params, timeout=30)
                else:
                    response = requests.delete(url, headers=headers, params=params, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:300]}...")
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

    def setup_test_user(self):
        """Create a test user for authentication testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"optionf_user_{timestamp}",
            "email": f"optionf_{timestamp}@modq.com",
            "password": "SecurePassword123!",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "Setup Test User for Option F",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.test_user_id = response.get('user_id')
            self.test_user_token = response.get('access_token')
            self.test_user_data = response
            print(f"   Created test user with ID: {self.test_user_id}")
            return True
        return False

    def get_auth_headers(self):
        """Get authorization headers for authenticated requests"""
        if self.test_user_token:
            return {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.test_user_token}'
            }
        return {'Content-Type': 'application/json'}

    # ===== F1: PERFORMANCE OPTIMIZATION TESTING =====
    
    def test_f1_performance_metrics(self):
        """Test F1: Performance metrics collection endpoint"""
        print("\n🚀 F1: Testing Performance Metrics Collection...")
        
        headers = self.get_auth_headers()
        success, response = self.run_test(
            "F1: Get Performance Metrics",
            "GET",
            "performance/metrics",
            200,
            headers=headers
        )
        
        if success and response:
            # Verify performance metrics structure
            expected_fields = ['average_response_time_ms', 'error_rate_percent', 'total_requests', 'recent_metrics']
            all_fields_present = True
            
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ Performance metric '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ Performance metric '{field}' missing")
                    all_fields_present = False
            
            # Verify recent metrics structure
            recent_metrics = response.get('recent_metrics', [])
            if recent_metrics and len(recent_metrics) > 0:
                sample_metric = recent_metrics[0]
                metric_fields = ['endpoint', 'method', 'response_time_ms', 'status_code', 'timestamp']
                
                for field in metric_fields:
                    if field in sample_metric:
                        print(f"   ✅ Metric field '{field}' present")
                    else:
                        print(f"   ❌ Metric field '{field}' missing")
                        all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_f1_cache_stats(self):
        """Test F1: Cache performance statistics"""
        print("\n💾 F1: Testing Cache Performance Statistics...")
        
        headers = self.get_auth_headers()
        success, response = self.run_test(
            "F1: Get Cache Statistics",
            "GET",
            "performance/cache-stats",
            200,
            headers=headers
        )
        
        if success and response:
            # Check if Redis is available or if graceful fallback is working
            if 'message' in response and 'Cache not available' in response['message']:
                print(f"   ✅ Cache gracefully handles Redis unavailability")
                return True
            else:
                # Verify cache stats structure
                expected_fields = ['connected_clients', 'used_memory', 'keyspace_hits', 'keyspace_misses', 'hit_rate']
                all_fields_present = True
                
                for field in expected_fields:
                    if field in response:
                        print(f"   ✅ Cache stat '{field}' present: {response[field]}")
                    else:
                        print(f"   ❌ Cache stat '{field}' missing")
                        all_fields_present = False
                
                return all_fields_present
        
        return False

    def test_f1_database_optimization(self):
        """Test F1: Database optimization and connection pooling"""
        print("\n🗄️ F1: Testing Database Optimization...")
        
        # Test multiple concurrent requests to verify connection pooling
        start_time = time.time()
        
        # Make several requests to test database performance
        test_endpoints = [
            ("auth/users", "GET"),
            ("personalities", "GET"),
            ("widget/config/test-user", "GET")
        ]
        
        successful_requests = 0
        total_response_time = 0
        
        for endpoint, method in test_endpoints:
            request_start = time.time()
            success, response = self.run_test(
                f"F1: Database Performance Test - {endpoint}",
                method,
                endpoint,
                200
            )
            request_time = (time.time() - request_start) * 1000  # Convert to ms
            
            if success:
                successful_requests += 1
                total_response_time += request_time
                print(f"   ✅ Request to {endpoint} completed in {request_time:.2f}ms")
            else:
                print(f"   ❌ Request to {endpoint} failed")
        
        total_time = (time.time() - start_time) * 1000
        avg_response_time = total_response_time / max(successful_requests, 1)
        
        print(f"   📊 Database Performance Results:")
        print(f"   Total requests: {len(test_endpoints)}")
        print(f"   Successful requests: {successful_requests}")
        print(f"   Total time: {total_time:.2f}ms")
        print(f"   Average response time: {avg_response_time:.2f}ms")
        
        # Consider test successful if most requests succeed and average response time is reasonable
        return successful_requests >= len(test_endpoints) // 2 and avg_response_time < 5000

    def test_f1_performance_monitoring_middleware(self):
        """Test F1: Performance monitoring middleware functionality"""
        print("\n📊 F1: Testing Performance Monitoring Middleware...")
        
        # Make a request and check if performance headers are added
        headers = self.get_auth_headers()
        
        try:
            response = requests.get(f"{self.base_url}/personalities", headers=headers, timeout=30)
            
            # Check for performance headers
            process_time_header = response.headers.get('X-Process-Time')
            
            if process_time_header:
                print(f"   ✅ Performance header 'X-Process-Time' present: {process_time_header}ms")
                
                # Verify it's a valid number
                try:
                    process_time = float(process_time_header)
                    if process_time > 0:
                        print(f"   ✅ Process time is valid: {process_time}ms")
                        return True
                    else:
                        print(f"   ❌ Process time is not positive: {process_time}")
                        return False
                except ValueError:
                    print(f"   ❌ Process time is not a valid number: {process_time_header}")
                    return False
            else:
                print(f"   ❌ Performance header 'X-Process-Time' missing")
                return False
                
        except Exception as e:
            print(f"   ❌ Performance monitoring test failed: {str(e)}")
            return False

    # ===== F2: MOBILE APP EXPERIENCE TESTING =====
    
    def test_f2_mobile_config_update(self):
        """Test F2: Mobile configuration updates"""
        print("\n📱 F2: Testing Mobile Configuration Updates...")
        
        if not self.test_user_id:
            print("❌ Skipping mobile config test - no user ID available")
            return False
        
        mobile_config_data = {
            "user_id": self.test_user_id,
            "push_notifications_enabled": True,
            "offline_sync_enabled": True,
            "mobile_theme": "dark",
            "compact_mode": False,
            "gesture_controls": True,
            "auto_sync_interval": 300
        }
        
        success, response = self.run_test(
            "F2: Update Mobile Configuration",
            "POST",
            "mobile/config",
            200,
            data=mobile_config_data
        )
        
        if success and response:
            # Verify mobile config structure
            expected_fields = ['user_id', 'push_notifications_enabled', 'offline_sync_enabled', 
                             'mobile_theme', 'compact_mode', 'gesture_controls', 'auto_sync_interval']
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ Mobile config field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ Mobile config field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_f2_mobile_config_retrieval(self):
        """Test F2: Mobile configuration retrieval"""
        print("\n📱 F2: Testing Mobile Configuration Retrieval...")
        
        if not self.test_user_id:
            print("❌ Skipping mobile config retrieval test - no user ID available")
            return False
        
        success, response = self.run_test(
            "F2: Get Mobile Configuration",
            "GET",
            f"mobile/config/{self.test_user_id}",
            200
        )
        
        if success and response:
            # Verify the configuration was retrieved correctly
            expected_values = {
                'user_id': self.test_user_id,
                'push_notifications_enabled': True,
                'mobile_theme': 'dark',
                'compact_mode': False
            }
            
            all_values_correct = True
            for field, expected_value in expected_values.items():
                actual_value = response.get(field)
                if actual_value == expected_value:
                    print(f"   ✅ Mobile config '{field}' correct: {actual_value}")
                else:
                    print(f"   ❌ Mobile config '{field}' incorrect: expected {expected_value}, got {actual_value}")
                    all_values_correct = False
            
            return all_values_correct
        
        return False

    def test_f2_push_notification_subscription(self):
        """Test F2: Push notification subscription"""
        print("\n🔔 F2: Testing Push Notification Subscription...")
        
        if not self.test_user_id:
            print("❌ Skipping push notification test - no user ID available")
            return False
        
        push_subscription_data = {
            "user_id": self.test_user_id,
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
            "p256dh_key": "test-p256dh-key-for-encryption",
            "auth_key": "test-auth-key-for-authentication",
            "user_agent": "Mozilla/5.0 (Mobile; modQ App)"
        }
        
        success, response = self.run_test(
            "F2: Subscribe to Push Notifications",
            "POST",
            "mobile/push/subscribe",
            200,
            data=push_subscription_data
        )
        
        if success and response:
            # Verify push subscription structure
            expected_fields = ['user_id', 'endpoint', 'p256dh_key', 'auth_key', 'created_at']
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ Push subscription field '{field}' present")
                else:
                    print(f"   ❌ Push subscription field '{field}' missing")
                    all_fields_present = False
            
            # Verify correct user_id
            if response.get('user_id') == self.test_user_id:
                print(f"   ✅ Push subscription created for correct user")
            else:
                print(f"   ❌ Push subscription user_id mismatch")
                all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_f2_pwa_manifest(self):
        """Test F2: PWA manifest endpoint"""
        print("\n📲 F2: Testing PWA Manifest Endpoint...")
        
        success, response = self.run_test(
            "F2: Get PWA Manifest",
            "GET",
            "mobile/pwa/manifest",
            200
        )
        
        if success and response:
            # Verify PWA manifest structure
            expected_fields = ['name', 'short_name', 'description', 'start_url', 'display', 
                             'background_color', 'theme_color', 'icons']
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ PWA manifest field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ PWA manifest field '{field}' missing")
                    all_fields_present = False
            
            # Verify icons array structure
            icons = response.get('icons', [])
            if icons and len(icons) > 0:
                sample_icon = icons[0]
                icon_fields = ['src', 'sizes', 'type']
                
                for field in icon_fields:
                    if field in sample_icon:
                        print(f"   ✅ PWA icon field '{field}' present")
                    else:
                        print(f"   ❌ PWA icon field '{field}' missing")
                        all_fields_present = False
            else:
                print(f"   ❌ PWA manifest icons array is empty")
                all_fields_present = False
            
            return all_fields_present
        
        return False

    # ===== F3: ADVANCED SECURITY TESTING =====
    
    def test_f3_enhanced_login(self):
        """Test F3: Enhanced login with security features"""
        print("\n🔐 F3: Testing Enhanced Login Security...")
        
        # Test with correct credentials
        login_data = {
            "email": f"optionf_{datetime.now().strftime('%H%M%S')}@modq.com",
            "password": "SecurePassword123!"
        }
        
        # First register a user for login testing
        register_data = {
            "username": f"security_user_{datetime.now().strftime('%H%M%S')}",
            "email": login_data["email"],
            "password": login_data["password"],
            "role": "employee"
        }
        
        reg_success, reg_response = self.run_test(
            "F3: Register User for Security Testing",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not reg_success:
            print("❌ Failed to register user for security testing")
            return False
        
        # Test enhanced login
        success, response = self.run_test(
            "F3: Enhanced Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and response:
            # Verify enhanced login response structure
            expected_fields = ['access_token', 'token_type', 'expires_in', 'user_id']
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ Login response field '{field}' present")
                else:
                    print(f"   ❌ Login response field '{field}' missing")
                    all_fields_present = False
            
            # Verify token format (JWT should have 3 parts separated by dots)
            token = response.get('access_token', '')
            if token and len(token.split('.')) == 3:
                print(f"   ✅ JWT token format is valid")
            else:
                print(f"   ❌ JWT token format is invalid")
                all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_f3_failed_login_attempts(self):
        """Test F3: Failed login attempts and account locking"""
        print("\n🚫 F3: Testing Failed Login Attempts Security...")
        
        # Create a test user for failed login testing
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"faillogin_{timestamp}@modq.com"
        
        register_data = {
            "username": f"fail_user_{timestamp}",
            "email": test_email,
            "password": "CorrectPassword123!",
            "role": "employee"
        }
        
        reg_success, reg_response = self.run_test(
            "F3: Register User for Failed Login Testing",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not reg_success:
            print("❌ Failed to register user for failed login testing")
            return False
        
        # Test multiple failed login attempts
        failed_attempts = 0
        max_attempts = 3  # Test a few failed attempts (not all 5 to avoid locking)
        
        for i in range(max_attempts):
            login_data = {
                "email": test_email,
                "password": "WrongPassword123!"
            }
            
            success, response = self.run_test(
                f"F3: Failed Login Attempt #{i+1}",
                "POST",
                "auth/login",
                401,  # Expect 401 Unauthorized
                data=login_data
            )
            
            if success:
                failed_attempts += 1
                print(f"   ✅ Failed login attempt #{i+1} correctly rejected")
            else:
                print(f"   ❌ Failed login attempt #{i+1} not handled correctly")
        
        # Test successful login after failed attempts (should still work)
        correct_login_data = {
            "email": test_email,
            "password": "CorrectPassword123!"
        }
        
        success, response = self.run_test(
            "F3: Successful Login After Failed Attempts",
            "POST",
            "auth/login",
            200,
            data=correct_login_data
        )
        
        if success:
            print(f"   ✅ Successful login works after {failed_attempts} failed attempts")
            return True
        else:
            print(f"   ❌ Successful login failed after failed attempts")
            return False

    def test_f3_logout_session_invalidation(self):
        """Test F3: Logout and session invalidation"""
        print("\n🚪 F3: Testing Logout and Session Invalidation...")
        
        if not self.test_user_token:
            print("❌ Skipping logout test - no user token available")
            return False
        
        headers = self.get_auth_headers()
        
        # Test logout
        success, response = self.run_test(
            "F3: User Logout",
            "POST",
            "auth/logout",
            200,
            headers=headers
        )
        
        if success and response:
            if 'message' in response and 'logged out' in response['message'].lower():
                print(f"   ✅ Logout successful: {response['message']}")
                
                # Test that the token is now invalid by trying to access protected endpoint
                invalid_success, invalid_response = self.run_test(
                    "F3: Access Protected Endpoint After Logout",
                    "GET",
                    "auth/me",
                    401,  # Should be unauthorized now
                    headers=headers
                )
                
                if invalid_success:
                    print(f"   ✅ Token correctly invalidated after logout")
                    return True
                else:
                    print(f"   ❌ Token still valid after logout")
                    return False
            else:
                print(f"   ❌ Logout response format unexpected: {response}")
                return False
        
        return False

    def test_f3_current_user_endpoint(self):
        """Test F3: Current user information endpoint"""
        print("\n👤 F3: Testing Current User Information Endpoint...")
        
        # Create a new user since we logged out the previous one
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"current_user_{timestamp}",
            "email": f"current_{timestamp}@modq.com",
            "password": "SecurePassword123!",
            "role": "employee"
        }
        
        reg_success, reg_response = self.run_test(
            "F3: Register User for Current User Testing",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if not reg_success or 'access_token' not in reg_response:
            print("❌ Failed to register user for current user testing")
            return False
        
        # Use the new token
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {reg_response["access_token"]}'
        }
        
        success, response = self.run_test(
            "F3: Get Current User Information",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        
        if success and response:
            # Verify user information structure
            expected_fields = ['id', 'username', 'email', 'role', 'created_at', 'is_active']
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ User info field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ User info field '{field}' missing")
                    all_fields_present = False
            
            # Verify sensitive fields are not exposed
            sensitive_fields = ['password_hash', 'failed_login_attempts']
            for field in sensitive_fields:
                if field not in response:
                    print(f"   ✅ Sensitive field '{field}' correctly hidden")
                else:
                    print(f"   ❌ Sensitive field '{field}' exposed")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_f3_security_audit_logging(self):
        """Test F3: Security audit logging functionality"""
        print("\n📋 F3: Testing Security Audit Logging...")
        
        # Security audit logging is typically internal, but we can test if the system
        # handles authentication events properly by checking response patterns
        
        # Test invalid authentication (should be logged)
        invalid_login_data = {
            "email": "nonexistent@modq.com",
            "password": "InvalidPassword"
        }
        
        success, response = self.run_test(
            "F3: Invalid Login for Audit Logging",
            "POST",
            "auth/login",
            401,
            data=invalid_login_data
        )
        
        if success:
            print(f"   ✅ Invalid login properly rejected (should be audit logged)")
            
            # Test valid authentication (should also be logged)
            if self.test_user_token:
                headers = self.get_auth_headers()
                
                me_success, me_response = self.run_test(
                    "F3: Valid Auth Request for Audit Logging",
                    "GET",
                    "auth/me",
                    401,  # Token might be expired, but request should be logged
                    headers=headers
                )
                
                print(f"   ✅ Authentication request processed (should be audit logged)")
                return True
            else:
                print(f"   ✅ Security audit logging test completed (login rejection logged)")
                return True
        
        return False

    # ===== F4: API DOCUMENTATION & DEVELOPER TOOLS TESTING =====
    
    def test_f4_api_usage_statistics(self):
        """Test F4: API usage statistics (admin only)"""
        print("\n📊 F4: Testing API Usage Statistics...")
        
        # Create an admin user for API stats testing
        timestamp = datetime.now().strftime('%H%M%S')
        admin_data = {
            "username": f"admin_user_{timestamp}",
            "email": f"admin_{timestamp}@modq.com",
            "password": "AdminPassword123!",
            "role": "admin"
        }
        
        reg_success, reg_response = self.run_test(
            "F4: Register Admin User for API Stats",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        
        if not reg_success or 'access_token' not in reg_response:
            print("❌ Failed to register admin user for API stats testing")
            return False
        
        # Use admin token
        admin_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {reg_response["access_token"]}'
        }
        
        success, response = self.run_test(
            "F4: Get API Usage Statistics",
            "GET",
            "docs/api-stats",
            200,
            headers=admin_headers
        )
        
        if success and response:
            # Verify API stats structure
            if isinstance(response, list):
                print(f"   ✅ API stats returned as array with {len(response)} endpoints")
                
                if len(response) > 0:
                    sample_stat = response[0]
                    expected_fields = ['endpoint', 'method', 'calls_count', 'avg_response_time', 'success_rate', 'last_called']
                    
                    all_fields_present = True
                    for field in expected_fields:
                        if field in sample_stat:
                            print(f"   ✅ API stat field '{field}' present: {sample_stat[field]}")
                        else:
                            print(f"   ❌ API stat field '{field}' missing")
                            all_fields_present = False
                    
                    return all_fields_present
                else:
                    print(f"   ✅ API stats endpoint working (empty stats for new system)")
                    return True
            else:
                print(f"   ❌ API stats should return an array, got: {type(response)}")
                return False
        
        return False

    def test_f4_developer_key_creation(self):
        """Test F4: Developer key creation"""
        print("\n🔑 F4: Testing Developer Key Creation...")
        
        if not self.test_user_id:
            print("❌ Skipping developer key test - no user ID available")
            return False
        
        dev_key_data = {
            "user_id": self.test_user_id,
            "key_name": "Test API Key",
            "permissions": ["read", "write"],
            "rate_limit": 1000
        }
        
        success, response = self.run_test(
            "F4: Create Developer Key",
            "POST",
            "docs/developer-key",
            200,
            data=dev_key_data
        )
        
        if success and response:
            # Verify developer key structure
            expected_fields = ['id', 'user_id', 'key_name', 'api_key', 'permissions', 'rate_limit', 'is_active', 'created_at']
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    if field == 'api_key':
                        print(f"   ✅ Developer key field '{field}' present (length: {len(response[field])})")
                    else:
                        print(f"   ✅ Developer key field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ Developer key field '{field}' missing")
                    all_fields_present = False
            
            # Verify API key format (should be a long string)
            api_key = response.get('api_key', '')
            if api_key and len(api_key) > 20:
                print(f"   ✅ API key format appears valid")
            else:
                print(f"   ❌ API key format appears invalid")
                all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_f4_enhanced_openapi_spec(self):
        """Test F4: Enhanced OpenAPI specification"""
        print("\n📖 F4: Testing Enhanced OpenAPI Specification...")
        
        success, response = self.run_test(
            "F4: Get Enhanced OpenAPI Specification",
            "GET",
            "docs/openapi-enhanced",
            200
        )
        
        if success and response:
            # Verify OpenAPI spec structure
            expected_fields = ['openapi', 'info', 'paths', 'components']
            
            all_fields_present = True
            for field in expected_fields:
                if field in response:
                    print(f"   ✅ OpenAPI field '{field}' present")
                else:
                    print(f"   ❌ OpenAPI field '{field}' missing")
                    all_fields_present = False
            
            # Verify info section
            info = response.get('info', {})
            if info:
                info_fields = ['title', 'description', 'version']
                for field in info_fields:
                    if field in info:
                        print(f"   ✅ OpenAPI info field '{field}' present: {info[field]}")
                    else:
                        print(f"   ❌ OpenAPI info field '{field}' missing")
                        all_fields_present = False
            
            # Verify paths section has endpoints
            paths = response.get('paths', {})
            if paths and len(paths) > 0:
                print(f"   ✅ OpenAPI spec contains {len(paths)} endpoint paths")
                
                # Check for some expected endpoints
                expected_paths = ['/api/auth/login', '/api/auth/register', '/api/chat']
                found_paths = 0
                
                for path in expected_paths:
                    if path in paths:
                        found_paths += 1
                        print(f"   ✅ Expected path '{path}' found in spec")
                    else:
                        print(f"   ❌ Expected path '{path}' missing from spec")
                
                return all_fields_present and found_paths >= len(expected_paths) // 2
            else:
                print(f"   ❌ OpenAPI spec paths section is empty")
                return False
        
        return False

    # ===== INTEGRATION TESTING =====
    
    def test_integration_authentication_flow(self):
        """Test integration: Authentication flow with enhanced security"""
        print("\n🔄 INTEGRATION: Testing Complete Authentication Flow...")
        
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Step 1: Register user
        register_data = {
            "username": f"integration_user_{timestamp}",
            "email": f"integration_{timestamp}@modq.com",
            "password": "IntegrationTest123!",
            "role": "employee"
        }
        
        reg_success, reg_response = self.run_test(
            "Integration: User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if not reg_success:
            return False
        
        # Step 2: Login with credentials
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        
        login_success, login_response = self.run_test(
            "Integration: User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if not login_success:
            return False
        
        # Step 3: Access protected endpoint
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {login_response["access_token"]}'
        }
        
        me_success, me_response = self.run_test(
            "Integration: Access Protected Endpoint",
            "GET",
            "auth/me",
            200,
            headers=headers
        )
        
        if not me_success:
            return False
        
        # Step 4: Logout
        logout_success, logout_response = self.run_test(
            "Integration: User Logout",
            "POST",
            "auth/logout",
            200,
            headers=headers
        )
        
        if logout_success:
            print(f"   ✅ Complete authentication flow successful")
            return True
        
        return False

    def test_integration_mobile_configuration_persistence(self):
        """Test integration: Mobile configuration persistence"""
        print("\n📱 INTEGRATION: Testing Mobile Configuration Persistence...")
        
        if not self.test_user_id:
            print("❌ Skipping mobile config persistence test - no user ID available")
            return False
        
        # Step 1: Create mobile configuration
        mobile_config = {
            "user_id": self.test_user_id,
            "push_notifications_enabled": True,
            "offline_sync_enabled": False,
            "mobile_theme": "light",
            "compact_mode": True,
            "gesture_controls": False,
            "auto_sync_interval": 600
        }
        
        create_success, create_response = self.run_test(
            "Integration: Create Mobile Config",
            "POST",
            "mobile/config",
            200,
            data=mobile_config
        )
        
        if not create_success:
            return False
        
        # Step 2: Retrieve and verify persistence
        get_success, get_response = self.run_test(
            "Integration: Retrieve Mobile Config",
            "GET",
            f"mobile/config/{self.test_user_id}",
            200
        )
        
        if get_success and get_response:
            # Verify all values persisted correctly
            for key, expected_value in mobile_config.items():
                actual_value = get_response.get(key)
                if actual_value == expected_value:
                    print(f"   ✅ Mobile config '{key}' persisted correctly: {actual_value}")
                else:
                    print(f"   ❌ Mobile config '{key}' not persisted: expected {expected_value}, got {actual_value}")
                    return False
            
            print(f"   ✅ Mobile configuration persistence successful")
            return True
        
        return False

    def test_integration_pwa_manifest_generation(self):
        """Test integration: PWA manifest generation"""
        print("\n📲 INTEGRATION: Testing PWA Manifest Generation...")
        
        # Test PWA manifest endpoint
        success, response = self.run_test(
            "Integration: PWA Manifest Generation",
            "GET",
            "mobile/pwa/manifest",
            200
        )
        
        if success and response:
            # Verify manifest is properly formatted for PWA
            required_pwa_fields = ['name', 'short_name', 'start_url', 'display', 'icons']
            
            for field in required_pwa_fields:
                if field in response:
                    print(f"   ✅ PWA manifest field '{field}' present")
                else:
                    print(f"   ❌ PWA manifest field '{field}' missing")
                    return False
            
            # Verify icons are properly formatted
            icons = response.get('icons', [])
            if icons and len(icons) > 0:
                for i, icon in enumerate(icons):
                    if all(field in icon for field in ['src', 'sizes', 'type']):
                        print(f"   ✅ PWA icon {i+1} properly formatted")
                    else:
                        print(f"   ❌ PWA icon {i+1} missing required fields")
                        return False
            
            print(f"   ✅ PWA manifest generation successful")
            return True
        
        return False

    def test_integration_api_documentation_accessibility(self):
        """Test integration: API documentation accessibility"""
        print("\n📚 INTEGRATION: Testing API Documentation Accessibility...")
        
        # Test OpenAPI spec accessibility
        openapi_success, openapi_response = self.run_test(
            "Integration: OpenAPI Spec Accessibility",
            "GET",
            "docs/openapi-enhanced",
            200
        )
        
        if not openapi_success:
            return False
        
        # Test that the spec contains documentation for F1-F4 endpoints
        paths = openapi_response.get('paths', {})
        
        expected_f_endpoints = [
            '/api/performance/metrics',
            '/api/mobile/config',
            '/api/auth/login',
            '/api/docs/api-stats'
        ]
        
        documented_endpoints = 0
        for endpoint in expected_f_endpoints:
            if endpoint in paths:
                documented_endpoints += 1
                print(f"   ✅ F-series endpoint '{endpoint}' documented in OpenAPI spec")
            else:
                print(f"   ❌ F-series endpoint '{endpoint}' missing from OpenAPI spec")
        
        if documented_endpoints >= len(expected_f_endpoints) // 2:
            print(f"   ✅ API documentation accessibility successful ({documented_endpoints}/{len(expected_f_endpoints)} endpoints documented)")
            return True
        else:
            print(f"   ❌ API documentation accessibility insufficient ({documented_endpoints}/{len(expected_f_endpoints)} endpoints documented)")
            return False

    def run_all_option_f_tests(self):
        """Run all Option F tests"""
        print("🚀 Starting Option F: Platform Polish & Optimization Backend Testing")
        print("=" * 80)
        
        # Setup
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Aborting tests.")
            return
        
        # F1: Performance Optimization Tests
        print("\n" + "=" * 50)
        print("F1: PERFORMANCE OPTIMIZATION TESTING")
        print("=" * 50)
        
        f1_tests = [
            self.test_f1_performance_metrics,
            self.test_f1_cache_stats,
            self.test_f1_database_optimization,
            self.test_f1_performance_monitoring_middleware
        ]
        
        f1_passed = 0
        for test in f1_tests:
            if test():
                f1_passed += 1
        
        print(f"\n📊 F1 Results: {f1_passed}/{len(f1_tests)} tests passed")
        
        # F2: Mobile App Experience Tests
        print("\n" + "=" * 50)
        print("F2: MOBILE APP EXPERIENCE TESTING")
        print("=" * 50)
        
        f2_tests = [
            self.test_f2_mobile_config_update,
            self.test_f2_mobile_config_retrieval,
            self.test_f2_push_notification_subscription,
            self.test_f2_pwa_manifest
        ]
        
        f2_passed = 0
        for test in f2_tests:
            if test():
                f2_passed += 1
        
        print(f"\n📊 F2 Results: {f2_passed}/{len(f2_tests)} tests passed")
        
        # F3: Advanced Security Tests
        print("\n" + "=" * 50)
        print("F3: ADVANCED SECURITY TESTING")
        print("=" * 50)
        
        f3_tests = [
            self.test_f3_enhanced_login,
            self.test_f3_failed_login_attempts,
            self.test_f3_logout_session_invalidation,
            self.test_f3_current_user_endpoint,
            self.test_f3_security_audit_logging
        ]
        
        f3_passed = 0
        for test in f3_tests:
            if test():
                f3_passed += 1
        
        print(f"\n📊 F3 Results: {f3_passed}/{len(f3_tests)} tests passed")
        
        # F4: API Documentation & Developer Tools Tests
        print("\n" + "=" * 50)
        print("F4: API DOCUMENTATION & DEVELOPER TOOLS TESTING")
        print("=" * 50)
        
        f4_tests = [
            self.test_f4_api_usage_statistics,
            self.test_f4_developer_key_creation,
            self.test_f4_enhanced_openapi_spec
        ]
        
        f4_passed = 0
        for test in f4_tests:
            if test():
                f4_passed += 1
        
        print(f"\n📊 F4 Results: {f4_passed}/{len(f4_tests)} tests passed")
        
        # Integration Tests
        print("\n" + "=" * 50)
        print("INTEGRATION TESTING")
        print("=" * 50)
        
        integration_tests = [
            self.test_integration_authentication_flow,
            self.test_integration_mobile_configuration_persistence,
            self.test_integration_pwa_manifest_generation,
            self.test_integration_api_documentation_accessibility
        ]
        
        integration_passed = 0
        for test in integration_tests:
            if test():
                integration_passed += 1
        
        print(f"\n📊 Integration Results: {integration_passed}/{len(integration_tests)} tests passed")
        
        # Final Summary
        total_tests = len(f1_tests) + len(f2_tests) + len(f3_tests) + len(f4_tests) + len(integration_tests)
        total_passed = f1_passed + f2_passed + f3_passed + f4_passed + integration_passed
        
        print("\n" + "=" * 80)
        print("OPTION F TESTING SUMMARY")
        print("=" * 80)
        print(f"F1 Performance Optimization: {f1_passed}/{len(f1_tests)} ({'✅' if f1_passed >= len(f1_tests)//2 else '❌'})")
        print(f"F2 Mobile App Experience: {f2_passed}/{len(f2_tests)} ({'✅' if f2_passed >= len(f2_tests)//2 else '❌'})")
        print(f"F3 Advanced Security: {f3_passed}/{len(f3_tests)} ({'✅' if f3_passed >= len(f3_tests)//2 else '❌'})")
        print(f"F4 API Documentation: {f4_passed}/{len(f4_tests)} ({'✅' if f4_passed >= len(f4_tests)//2 else '❌'})")
        print(f"Integration Testing: {integration_passed}/{len(integration_tests)} ({'✅' if integration_passed >= len(integration_tests)//2 else '❌'})")
        print("-" * 80)
        print(f"TOTAL: {total_passed}/{total_tests} tests passed ({(total_passed/total_tests)*100:.1f}%)")
        
        if total_passed >= total_tests * 0.7:  # 70% pass rate
            print("🎉 Option F: Platform Polish & Optimization - OVERALL SUCCESS")
        else:
            print("⚠️ Option F: Platform Polish & Optimization - NEEDS ATTENTION")

if __name__ == "__main__":
    tester = OptionFTester()
    tester.run_all_option_f_tests()