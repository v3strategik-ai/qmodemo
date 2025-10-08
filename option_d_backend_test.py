import requests
import sys
import json
from datetime import datetime
import time

class OptionDBetaTestingTester:
    def __init__(self, base_url="https://modq-saml.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_tour_id = None
        self.test_feedback_id = None

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
                if data:
                    response = requests.delete(url, json=data, headers=headers, timeout=30)
                else:
                    response = requests.delete(url, headers=headers, timeout=30)

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

    def create_test_user(self):
        """Create a test user for Option D testing"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"beta_tester_{timestamp}",
            "email": f"beta_{timestamp}@modq.com",
            "password": "TestPassword123!",
            "role": "employee"
        }
        
        success, response = self.run_test(
            "Create Beta Test User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'user_id' in response:
            self.test_user_id = response['user_id']
            print(f"   Created beta test user with ID: {self.test_user_id}")
            return True
        return False

    # ===== D1: ROLE SWITCHER TESTS =====
    
    def test_get_available_roles(self):
        """Test GET /api/beta/roles/available - Get available roles"""
        print("\n🎭 Testing D1: Role Switcher - Available Roles...")
        
        success, response = self.run_test(
            "Get Available Roles",
            "GET",
            "beta/roles/available",
            200
        )
        
        if success and response:
            roles = response.get('roles', [])
            print(f"   Found {len(roles)} available roles")
            
            # Verify expected roles exist
            expected_roles = ["CEO", "Manager", "Employee", "Developer", "Sales Rep", "Customer Success"]
            found_roles = [role['name'] for role in roles]
            
            all_found = True
            for expected_role in expected_roles:
                if expected_role in found_roles:
                    print(f"   ✅ {expected_role} role found")
                else:
                    print(f"   ❌ {expected_role} role missing")
                    all_found = False
            
            # Verify role structure
            if roles:
                sample_role = roles[0]
                required_fields = ['name', 'description']
                for field in required_fields:
                    if field in sample_role:
                        print(f"   ✅ Role field '{field}' present")
                    else:
                        print(f"   ❌ Role field '{field}' missing")
                        all_found = False
            
            return all_found
        
        return False

    def test_switch_user_role(self):
        """Test POST /api/beta/roles/switch - Switch user roles with test data"""
        if not self.test_user_id:
            print("❌ Skipping role switch test - no user ID available")
            return False
        
        print("\n🔄 Testing D1: Role Switcher - Switch User Role...")
        
        # Test switching to CEO role
        role_data = {
            "user_id": self.test_user_id,
            "role_name": "CEO"
        }
        
        success, response = self.run_test(
            "Switch to CEO Role",
            "POST",
            "beta/roles/switch",
            200,
            data=role_data
        )
        
        if success and response:
            role_info = response.get('role', {})
            
            # Verify response structure
            required_fields = ['user_id', 'role_name', 'permissions', 'ui_settings', 'created_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in role_info:
                    print(f"   ✅ Role field '{field}' present")
                else:
                    print(f"   ❌ Role field '{field}' missing")
                    all_fields_present = False
            
            # Verify CEO permissions
            permissions = role_info.get('permissions', [])
            expected_ceo_permissions = ["all_access", "admin", "analytics", "team_management"]
            
            for perm in expected_ceo_permissions:
                if perm in permissions:
                    print(f"   ✅ CEO permission '{perm}' granted")
                else:
                    print(f"   ❌ CEO permission '{perm}' missing")
                    all_fields_present = False
            
            # Verify UI settings
            ui_settings = role_info.get('ui_settings', {})
            if ui_settings.get('show_executive_dashboard') == True:
                print(f"   ✅ CEO UI setting 'show_executive_dashboard' enabled")
            else:
                print(f"   ❌ CEO UI setting 'show_executive_dashboard' not enabled")
                all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_get_current_role(self):
        """Test GET /api/beta/roles/current/{user_id} - Get current user role"""
        if not self.test_user_id:
            print("❌ Skipping get current role test - no user ID available")
            return False
        
        print("\n👤 Testing D1: Role Switcher - Get Current Role...")
        
        success, response = self.run_test(
            "Get Current User Role",
            "GET",
            f"beta/roles/current/{self.test_user_id}",
            200
        )
        
        if success and response:
            # Should return CEO role from previous test
            role_name = response.get('role_name')
            permissions = response.get('permissions', [])
            ui_settings = response.get('ui_settings', {})
            
            if role_name == "CEO":
                print(f"   ✅ Current role is CEO as expected")
            else:
                print(f"   ❌ Expected CEO role, got {role_name}")
                return False
            
            if "all_access" in permissions:
                print(f"   ✅ CEO permissions maintained")
            else:
                print(f"   ❌ CEO permissions not found")
                return False
            
            if ui_settings.get('show_executive_dashboard') == True:
                print(f"   ✅ CEO UI settings maintained")
                return True
            else:
                print(f"   ❌ CEO UI settings not maintained")
                return False
        
        return False

    def test_switch_multiple_roles(self):
        """Test switching between different roles"""
        if not self.test_user_id:
            print("❌ Skipping multiple role switch test - no user ID available")
            return False
        
        print("\n🎭 Testing D1: Role Switcher - Multiple Role Switches...")
        
        roles_to_test = ["Manager", "Developer", "Sales Rep", "Employee"]
        successful_switches = 0
        
        for role in roles_to_test:
            role_data = {
                "user_id": self.test_user_id,
                "role_name": role
            }
            
            success, response = self.run_test(
                f"Switch to {role} Role",
                "POST",
                "beta/roles/switch",
                200,
                data=role_data
            )
            
            if success and response:
                role_info = response.get('role', {})
                if role_info.get('role_name') == role:
                    print(f"   ✅ Successfully switched to {role}")
                    successful_switches += 1
                else:
                    print(f"   ❌ Failed to switch to {role}")
            else:
                print(f"   ❌ Role switch to {role} failed")
        
        print(f"\n   📊 Role Switch Results: {successful_switches}/{len(roles_to_test)} successful")
        return successful_switches >= len(roles_to_test) // 2

    # ===== D2: GUIDED TOURS TESTS =====
    
    def test_create_feature_tour(self):
        """Test POST /api/beta/tours/create - Create feature tours"""
        print("\n🗺️ Testing D2: Guided Tours - Create Feature Tour...")
        
        tour_data = {
            "tour_name": "test_tour",
            "title": "Test Feature Tour",
            "description": "A test tour for beta testing functionality",
            "steps": [
                {
                    "step": 1,
                    "title": "Welcome",
                    "content": "Welcome to the test tour!",
                    "target": "body",
                    "placement": "center"
                },
                {
                    "step": 2,
                    "title": "Feature Demo",
                    "content": "This is a demo of the feature.",
                    "target": ".demo-element",
                    "placement": "bottom"
                }
            ],
            "target_roles": ["Employee", "Manager"],
            "is_active": True
        }
        
        success, response = self.run_test(
            "Create Feature Tour",
            "POST",
            "beta/tours/create",
            200,
            data=tour_data
        )
        
        if success and response:
            tour_id = response.get('tour_id')
            if tour_id:
                self.test_tour_id = tour_id
                print(f"   ✅ Tour created with ID: {tour_id}")
                return True
            else:
                print(f"   ❌ Tour created but no tour_id returned")
                return False
        
        return False

    def test_get_user_tours(self):
        """Test GET /api/beta/tours/user/{user_id} - Get tours for user based on role"""
        if not self.test_user_id:
            print("❌ Skipping get user tours test - no user ID available")
            return False
        
        print("\n📚 Testing D2: Guided Tours - Get User Tours...")
        
        success, response = self.run_test(
            "Get User Tours",
            "GET",
            f"beta/tours/user/{self.test_user_id}",
            200
        )
        
        if success and response:
            tours = response.get('tours', [])
            print(f"   Found {len(tours)} tours for user")
            
            if len(tours) > 0:
                # Check for default tours (should be created on startup)
                tour_names = [tour.get('tour_name', '') for tour in tours]
                
                expected_tours = ["welcome_tour"]  # Default tour should exist
                found_expected = False
                
                for expected_tour in expected_tours:
                    if expected_tour in tour_names:
                        print(f"   ✅ Default tour '{expected_tour}' found")
                        found_expected = True
                    else:
                        print(f"   ⚠️ Default tour '{expected_tour}' not found")
                
                # Check tour structure
                sample_tour = tours[0]
                required_fields = ['id', 'tour_name', 'title', 'description', 'steps', 'target_roles', 'progress']
                
                all_fields_present = True
                for field in required_fields:
                    if field in sample_tour:
                        print(f"   ✅ Tour field '{field}' present")
                    else:
                        print(f"   ❌ Tour field '{field}' missing")
                        all_fields_present = False
                
                # Check progress structure
                progress = sample_tour.get('progress', {})
                progress_fields = ['current_step', 'completed', 'started']
                
                for field in progress_fields:
                    if field in progress:
                        print(f"   ✅ Progress field '{field}' present")
                    else:
                        print(f"   ❌ Progress field '{field}' missing")
                        all_fields_present = False
                
                return all_fields_present or found_expected
            else:
                print(f"   ⚠️ No tours found for user (may be expected for new user)")
                return True  # This might be expected behavior
        
        return False

    def test_start_tour(self):
        """Test POST /api/beta/tours/start - Start a tour for user"""
        if not self.test_user_id:
            print("❌ Skipping start tour test - no user ID available")
            return False
        
        print("\n🚀 Testing D2: Guided Tours - Start Tour...")
        
        # Use the test tour we created, or a default tour
        tour_id = self.test_tour_id if self.test_tour_id else "welcome_tour"
        
        tour_start_data = {
            "user_id": self.test_user_id,
            "tour_id": tour_id
        }
        
        success, response = self.run_test(
            "Start Feature Tour",
            "POST",
            "beta/tours/start",
            200,
            data=tour_start_data
        )
        
        if success and response:
            message = response.get('message', '')
            if "started successfully" in message.lower():
                print(f"   ✅ Tour started successfully")
                return True
            else:
                print(f"   ❌ Unexpected response message: {message}")
                return False
        
        return False

    def test_update_tour_progress(self):
        """Test POST /api/beta/tours/progress - Update tour progress"""
        if not self.test_user_id:
            print("❌ Skipping tour progress test - no user ID available")
            return False
        
        print("\n📈 Testing D2: Guided Tours - Update Progress...")
        
        # Use the test tour we created, or a default tour
        tour_id = self.test_tour_id if self.test_tour_id else "welcome_tour"
        
        # Test updating progress to step 2
        progress_data = {
            "user_id": self.test_user_id,
            "tour_id": tour_id,
            "step": 2,
            "completed": False
        }
        
        success1, response1 = self.run_test(
            "Update Tour Progress (Step 2)",
            "POST",
            "beta/tours/progress",
            200,
            data=progress_data
        )
        
        # Test completing the tour
        completion_data = {
            "user_id": self.test_user_id,
            "tour_id": tour_id,
            "step": 5,
            "completed": True
        }
        
        success2, response2 = self.run_test(
            "Complete Tour",
            "POST",
            "beta/tours/progress",
            200,
            data=completion_data
        )
        
        if success1 and success2:
            message1 = response1.get('message', '')
            message2 = response2.get('message', '')
            
            if ("updated successfully" in message1.lower() and 
                "updated successfully" in message2.lower()):
                print(f"   ✅ Tour progress updated and completed successfully")
                return True
            else:
                print(f"   ❌ Unexpected response messages")
                return False
        
        return False

    # ===== D3: FEEDBACK COLLECTION TESTS =====
    
    def test_submit_feedback(self):
        """Test POST /api/beta/feedback/submit - Submit user feedback"""
        if not self.test_user_id:
            print("❌ Skipping feedback submission test - no user ID available")
            return False
        
        print("\n💬 Testing D3: Feedback Collection - Submit Feedback...")
        
        feedback_data = {
            "user_id": self.test_user_id,
            "feature_name": "guided_tours",
            "feedback_type": "rating",
            "rating": 5,
            "comment": "The guided tours are very helpful for new users!",
            "metadata": {
                "tour_completed": "welcome_tour",
                "time_spent": 120
            }
        }
        
        success, response = self.run_test(
            "Submit Feature Feedback",
            "POST",
            "beta/feedback/submit",
            200,
            data=feedback_data
        )
        
        if success and response:
            feedback_id = response.get('feedback_id')
            message = response.get('message', '')
            
            if feedback_id:
                self.test_feedback_id = feedback_id
                print(f"   ✅ Feedback submitted with ID: {feedback_id}")
            
            if "submitted successfully" in message.lower():
                print(f"   ✅ Feedback submission confirmed")
                return True
            else:
                print(f"   ❌ Unexpected response message: {message}")
                return False
        
        return False

    def test_submit_different_feedback_types(self):
        """Test submitting different types of feedback"""
        if not self.test_user_id:
            print("❌ Skipping different feedback types test - no user ID available")
            return False
        
        print("\n📝 Testing D3: Feedback Collection - Different Feedback Types...")
        
        feedback_types = [
            {
                "type": "comment",
                "data": {
                    "user_id": self.test_user_id,
                    "feature_name": "role_switcher",
                    "feedback_type": "comment",
                    "comment": "The role switcher is intuitive and easy to use."
                }
            },
            {
                "type": "bug_report",
                "data": {
                    "user_id": self.test_user_id,
                    "feature_name": "analytics_dashboard",
                    "feedback_type": "bug_report",
                    "comment": "Dashboard takes too long to load on mobile devices.",
                    "metadata": {"device": "mobile", "browser": "chrome"}
                }
            },
            {
                "type": "suggestion",
                "data": {
                    "user_id": self.test_user_id,
                    "feature_name": "voice_interface",
                    "feedback_type": "suggestion",
                    "comment": "Add support for more languages in voice commands.",
                    "rating": 4
                }
            }
        ]
        
        successful_submissions = 0
        
        for feedback in feedback_types:
            success, response = self.run_test(
                f"Submit {feedback['type']} Feedback",
                "POST",
                "beta/feedback/submit",
                200,
                data=feedback['data']
            )
            
            if success and response:
                feedback_id = response.get('feedback_id')
                if feedback_id:
                    print(f"   ✅ {feedback['type']} feedback submitted: {feedback_id}")
                    successful_submissions += 1
                else:
                    print(f"   ❌ {feedback['type']} feedback failed - no ID returned")
            else:
                print(f"   ❌ {feedback['type']} feedback submission failed")
        
        print(f"\n   📊 Feedback Submission Results: {successful_submissions}/{len(feedback_types)} successful")
        return successful_submissions >= len(feedback_types) // 2

    def test_get_feature_feedback(self):
        """Test GET /api/beta/feedback/feature/{feature_name} - Get feedback for specific feature"""
        print("\n📊 Testing D3: Feedback Collection - Get Feature Feedback...")
        
        feature_name = "guided_tours"
        
        success, response = self.run_test(
            f"Get Feedback for {feature_name}",
            "GET",
            f"beta/feedback/feature/{feature_name}",
            200
        )
        
        if success and response:
            feedback_list = response.get('feedback', [])
            summary = response.get('summary', {})
            
            print(f"   Found {len(feedback_list)} feedback entries for {feature_name}")
            
            # Verify summary structure
            required_summary_fields = ['total_count', 'average_rating', 'rating_count', 'feedback_types']
            all_fields_present = True
            
            for field in required_summary_fields:
                if field in summary:
                    print(f"   ✅ Summary field '{field}' present: {summary[field]}")
                else:
                    print(f"   ❌ Summary field '{field}' missing")
                    all_fields_present = False
            
            # Verify feedback structure if any exists
            if feedback_list:
                sample_feedback = feedback_list[0]
                required_feedback_fields = ['id', 'user_id', 'feature_name', 'feedback_type', 'created_at']
                
                for field in required_feedback_fields:
                    if field in sample_feedback:
                        print(f"   ✅ Feedback field '{field}' present")
                    else:
                        print(f"   ❌ Feedback field '{field}' missing")
                        all_fields_present = False
            
            return all_fields_present
        
        return False

    # ===== D4: USAGE ANALYTICS TESTS =====
    
    def test_track_usage_event(self):
        """Test POST /api/beta/analytics/track - Track usage events"""
        if not self.test_user_id:
            print("❌ Skipping usage tracking test - no user ID available")
            return False
        
        print("\n📈 Testing D4: Usage Analytics - Track Usage Event...")
        
        event_data = {
            "user_id": self.test_user_id,
            "event_type": "feature_click",
            "feature_name": "role_switcher",
            "metadata": {
                "from_role": "Employee",
                "to_role": "CEO",
                "click_location": "header_menu"
            },
            "session_id": "test-session-123"
        }
        
        success, response = self.run_test(
            "Track Usage Event",
            "POST",
            "beta/analytics/track",
            200,
            data=event_data
        )
        
        if success and response:
            message = response.get('message', '')
            if "tracked successfully" in message.lower():
                print(f"   ✅ Usage event tracked successfully")
                return True
            else:
                print(f"   ❌ Unexpected response message: {message}")
                return False
        
        return False

    def test_track_multiple_events(self):
        """Test tracking multiple different usage events"""
        if not self.test_user_id:
            print("❌ Skipping multiple events tracking test - no user ID available")
            return False
        
        print("\n📊 Testing D4: Usage Analytics - Track Multiple Events...")
        
        events = [
            {
                "user_id": self.test_user_id,
                "event_type": "page_view",
                "feature_name": "analytics_dashboard",
                "metadata": {"page_load_time": 1.2}
            },
            {
                "user_id": self.test_user_id,
                "event_type": "time_spent",
                "feature_name": "guided_tours",
                "metadata": {"duration_seconds": 180}
            },
            {
                "user_id": self.test_user_id,
                "event_type": "error",
                "feature_name": "voice_interface",
                "metadata": {"error_type": "microphone_permission_denied"}
            }
        ]
        
        successful_tracks = 0
        
        for event in events:
            success, response = self.run_test(
                f"Track {event['event_type']} Event",
                "POST",
                "beta/analytics/track",
                200,
                data=event
            )
            
            if success and response:
                message = response.get('message', '')
                if "tracked successfully" in message.lower():
                    print(f"   ✅ {event['event_type']} event tracked")
                    successful_tracks += 1
                else:
                    print(f"   ❌ {event['event_type']} event tracking failed")
            else:
                print(f"   ❌ {event['event_type']} event tracking failed")
        
        print(f"\n   📊 Event Tracking Results: {successful_tracks}/{len(events)} successful")
        return successful_tracks >= len(events) // 2

    def test_get_analytics_dashboard_with_permissions(self):
        """Test GET /api/beta/analytics/dashboard/{user_id} - Get analytics dashboard (requires analytics permissions)"""
        if not self.test_user_id:
            print("❌ Skipping analytics dashboard test - no user ID available")
            return False
        
        print("\n📊 Testing D4: Usage Analytics - Analytics Dashboard (With Permissions)...")
        
        # First, ensure user has analytics permissions by switching to CEO role
        role_data = {
            "user_id": self.test_user_id,
            "role_name": "CEO"  # CEO role has analytics permissions
        }
        
        role_success, _ = self.run_test(
            "Switch to CEO for Analytics Access",
            "POST",
            "beta/roles/switch",
            200,
            data=role_data
        )
        
        if not role_success:
            print("   ❌ Failed to switch to CEO role for analytics access")
            return False
        
        # Now test analytics dashboard access
        success, response = self.run_test(
            "Get Analytics Dashboard (With Permissions)",
            "GET",
            f"beta/analytics/dashboard/{self.test_user_id}",
            200
        )
        
        if success and response:
            # Verify analytics structure
            required_fields = ['total_users', 'active_features', 'feedback_summary', 'tour_completion_rates', 'usage_trends']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Analytics field '{field}' present")
                    if field == 'total_users':
                        print(f"      Total users: {response[field]}")
                    elif field == 'active_features':
                        print(f"      Active features: {len(response[field])} features")
                    elif field == 'usage_trends':
                        print(f"      Usage trends: {len(response[field])} data points")
                else:
                    print(f"   ❌ Analytics field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_get_analytics_dashboard_without_permissions(self):
        """Test analytics dashboard access without proper permissions (should return 403)"""
        if not self.test_user_id:
            print("❌ Skipping analytics permission test - no user ID available")
            return False
        
        print("\n🚫 Testing D4: Usage Analytics - Analytics Dashboard (Without Permissions)...")
        
        # Switch to Employee role (no analytics permissions)
        role_data = {
            "user_id": self.test_user_id,
            "role_name": "Employee"  # Employee role has no analytics permissions
        }
        
        role_success, _ = self.run_test(
            "Switch to Employee (No Analytics Access)",
            "POST",
            "beta/roles/switch",
            200,
            data=role_data
        )
        
        if not role_success:
            print("   ❌ Failed to switch to Employee role")
            return False
        
        # Now test analytics dashboard access (should be denied)
        success, response = self.run_test(
            "Get Analytics Dashboard (Without Permissions)",
            "GET",
            f"beta/analytics/dashboard/{self.test_user_id}",
            403  # Expect 403 Forbidden
        )
        
        if success:
            print(f"   ✅ Analytics access correctly denied for Employee role")
            return True
        else:
            print(f"   ❌ Analytics access should have been denied")
            return False

    def test_get_user_activity_analytics(self):
        """Test GET /api/beta/analytics/user-activity/{user_id} - Get user activity data"""
        if not self.test_user_id:
            print("❌ Skipping user activity test - no user ID available")
            return False
        
        print("\n👤 Testing D4: Usage Analytics - User Activity Data...")
        
        success, response = self.run_test(
            "Get User Activity Analytics",
            "GET",
            f"beta/analytics/user-activity/{self.test_user_id}?days=7",
            200
        )
        
        if success and response:
            # Verify activity structure
            required_fields = ['user_id', 'period_days', 'total_events', 'event_breakdown', 'feature_usage', 'recent_events']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Activity field '{field}' present")
                    if field == 'user_id':
                        print(f"      User ID: {response[field]}")
                    elif field == 'total_events':
                        print(f"      Total events: {response[field]}")
                    elif field == 'period_days':
                        print(f"      Period: {response[field]} days")
                    elif field == 'event_breakdown':
                        print(f"      Event types: {len(response[field])} types")
                    elif field == 'feature_usage':
                        print(f"      Features used: {len(response[field])} features")
                    elif field == 'recent_events':
                        print(f"      Recent events: {len(response[field])} events")
                else:
                    print(f"   ❌ Activity field '{field}' missing")
                    all_fields_present = False
            
            # Verify user_id matches
            if response.get('user_id') == self.test_user_id:
                print(f"   ✅ User ID matches request")
            else:
                print(f"   ❌ User ID mismatch")
                all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_error_handling(self):
        """Test error handling for Option D endpoints"""
        print("\n🚨 Testing D: Error Handling...")
        
        error_tests = [
            {
                "name": "Role switch without user_id",
                "endpoint": "beta/roles/switch",
                "method": "POST",
                "data": {"role_name": "CEO"},
                "expected_status": 400
            },
            {
                "name": "Role switch without role_name",
                "endpoint": "beta/roles/switch", 
                "method": "POST",
                "data": {"user_id": "test-user"},
                "expected_status": 400
            },
            {
                "name": "Start tour without user_id",
                "endpoint": "beta/tours/start",
                "method": "POST",
                "data": {"tour_id": "welcome_tour"},
                "expected_status": 400
            },
            {
                "name": "Start tour without tour_id",
                "endpoint": "beta/tours/start",
                "method": "POST", 
                "data": {"user_id": "test-user"},
                "expected_status": 400
            },
            {
                "name": "Get role for non-existent user",
                "endpoint": "beta/roles/current/non-existent-user",
                "method": "GET",
                "data": None,
                "expected_status": 200  # Should return default role
            }
        ]
        
        successful_tests = 0
        
        for test in error_tests:
            success, response = self.run_test(
                test['name'],
                test['method'],
                test['endpoint'],
                test['expected_status'],
                data=test['data']
            )
            
            if success:
                successful_tests += 1
                print(f"   ✅ {test['name']} handled correctly")
            else:
                print(f"   ❌ {test['name']} not handled correctly")
        
        print(f"\n   📊 Error Handling Results: {successful_tests}/{len(error_tests)} tests passed")
        return successful_tests >= len(error_tests) // 2

    def run_all_tests(self):
        """Run all Option D: Beta Testing Optimizers tests"""
        print("🧪 Starting Option D: Beta Testing Optimizers Backend API Tests")
        print("=" * 80)
        
        # Create test user first
        if not self.create_test_user():
            print("❌ Failed to create test user - aborting tests")
            return
        
        # D1: Role Switcher Tests
        print("\n" + "="*50)
        print("🎭 D1: ROLE SWITCHER API TESTS")
        print("="*50)
        
        self.test_get_available_roles()
        self.test_switch_user_role()
        self.test_get_current_role()
        self.test_switch_multiple_roles()
        
        # D2: Guided Tours Tests
        print("\n" + "="*50)
        print("🗺️ D2: GUIDED TOURS API TESTS")
        print("="*50)
        
        self.test_create_feature_tour()
        self.test_get_user_tours()
        self.test_start_tour()
        self.test_update_tour_progress()
        
        # D3: Feedback Collection Tests
        print("\n" + "="*50)
        print("💬 D3: FEEDBACK COLLECTION API TESTS")
        print("="*50)
        
        self.test_submit_feedback()
        self.test_submit_different_feedback_types()
        self.test_get_feature_feedback()
        
        # D4: Usage Analytics Tests
        print("\n" + "="*50)
        print("📈 D4: USAGE ANALYTICS API TESTS")
        print("="*50)
        
        self.test_track_usage_event()
        self.test_track_multiple_events()
        self.test_get_analytics_dashboard_with_permissions()
        self.test_get_analytics_dashboard_without_permissions()
        self.test_get_user_activity_analytics()
        
        # Error Handling Tests
        print("\n" + "="*50)
        print("🚨 ERROR HANDLING TESTS")
        print("="*50)
        
        self.test_error_handling()
        
        # Final Results
        print("\n" + "="*80)
        print("📊 OPTION D: BETA TESTING OPTIMIZERS - FINAL RESULTS")
        print("="*80)
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 EXCELLENT: Option D Beta Testing Optimizers APIs are working well!")
        elif success_rate >= 60:
            print("✅ GOOD: Most Option D APIs are functional with some issues to address")
        elif success_rate >= 40:
            print("⚠️ MODERATE: Option D APIs have significant issues that need attention")
        else:
            print("❌ CRITICAL: Option D APIs have major problems requiring immediate fixes")
        
        return success_rate

if __name__ == "__main__":
    tester = OptionDBetaTestingTester()
    tester.run_all_tests()