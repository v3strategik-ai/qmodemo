import requests
import sys
import json
from datetime import datetime

class E3E4APITester:
    def __init__(self, base_url="https://ai-business-intel.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

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

    # ===== E3: CUSTOM INTEGRATION MARKETPLACE TESTS =====
    
    def test_integration_marketplace_categories(self):
        """Test GET /api/integrations/marketplace/categories"""
        print("\n📂 Testing Integration Marketplace Categories...")
        
        success, response = self.run_test(
            "Get Integration Categories",
            "GET",
            "integrations/marketplace/categories",
            200
        )
        
        if success and response:
            categories = response.get('categories', [])
            print(f"   Found {len(categories)} categories")
            
            # Verify expected categories exist
            expected_categories = ["api", "webhook", "database", "file_processing", "notification", "custom"]
            
            all_found = True
            for category in expected_categories:
                if category in categories:
                    print(f"   ✅ Category '{category}' found")
                else:
                    print(f"   ❌ Category '{category}' missing")
                    all_found = False
            
            return all_found
        
        return False

    def test_create_custom_integration(self):
        """Test POST /api/integrations/marketplace/create"""
        print("\n🔧 Testing Custom Integration Creation...")
        
        # Create test user first
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"integration_creator_{timestamp}",
            "email": f"creator_{timestamp}@modq.com",
            "role": "developer"
        }
        
        user_success, user_response = self.run_test(
            "Create Integration Creator User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if not user_success or 'id' not in user_response:
            print("❌ Failed to create integration creator user")
            return False
        
        creator_id = user_response['id']
        
        # Create custom integration
        integration_data = {
            "name": "Custom CRM Sync",
            "description": "Synchronize customer data with external CRM systems",
            "category": "api",
            "code": "def sync_crm_data(customer_data): return {'status': 'synced', 'records': len(customer_data)}",
            "language": "python",
            "requirements": ["requests", "pandas"],
            "endpoints": [
                {
                    "method": "POST",
                    "path": "/sync",
                    "description": "Sync customer data"
                }
            ],
            "configuration_schema": {
                "type": "object",
                "properties": {
                    "api_key": {"type": "string"},
                    "endpoint_url": {"type": "string"}
                }
            },
            "tags": ["crm", "sync", "api"],
            "author_id": creator_id
        }
        
        success, response = self.run_test(
            "Create Custom Integration",
            "POST",
            "integrations/marketplace/create",
            200,
            data=integration_data
        )
        
        if success and response:
            self.test_integration_id = response.get('id')
            
            # Verify response structure
            required_fields = ['id', 'name', 'description', 'category', 'author_id', 'version', 'created_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Integration field '{field}' present")
                else:
                    print(f"   ❌ Integration field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_get_marketplace_integrations(self):
        """Test GET /api/integrations/marketplace with filtering"""
        print("\n🏪 Testing Marketplace Integrations Retrieval...")
        
        # Test getting all integrations
        success1, response1 = self.run_test(
            "Get All Marketplace Integrations",
            "GET",
            "integrations/marketplace",
            200
        )
        
        if success1 and isinstance(response1, list):
            print(f"   Found {len(response1)} marketplace integrations")
        
        # Test filtering by category
        success2, response2 = self.run_test(
            "Get API Category Integrations",
            "GET",
            "integrations/marketplace?category=api",
            200
        )
        
        if success2 and isinstance(response2, list):
            print(f"   Found {len(response2)} API category integrations")
            
            # Verify all returned integrations are in API category
            all_api_category = True
            for integration in response2:
                if integration.get('category') != 'api':
                    all_api_category = False
                    break
            
            if all_api_category:
                print(f"   ✅ All returned integrations are in API category")
            else:
                print(f"   ❌ Some integrations are not in API category")
        
        return success1 and success2

    def test_get_specific_integration(self):
        """Test GET /api/integrations/marketplace/{integration_id}"""
        if not hasattr(self, 'test_integration_id'):
            print("❌ Skipping specific integration test - no integration ID available")
            return False
        
        print(f"\n🔍 Testing Specific Integration Retrieval: {self.test_integration_id}")
        
        success, response = self.run_test(
            "Get Specific Integration",
            "GET",
            f"integrations/marketplace/{self.test_integration_id}",
            200
        )
        
        if success and response:
            if response.get('id') == self.test_integration_id:
                print(f"   ✅ Retrieved correct integration")
                print(f"   Name: {response.get('name')}")
                print(f"   Category: {response.get('category')}")
                print(f"   Author: {response.get('author')}")
                return True
            else:
                print(f"   ❌ Retrieved wrong integration")
                return False
        
        return False

    def test_install_integration(self):
        """Test POST /api/integrations/marketplace/install"""
        if not hasattr(self, 'test_integration_id'):
            print("❌ Skipping integration installation test - no integration ID available")
            return False
        
        print(f"\n📦 Testing Integration Installation...")
        
        # Create test user for installation
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"integration_user_{timestamp}",
            "email": f"user_{timestamp}@modq.com",
            "role": "employee"
        }
        
        user_success, user_response = self.run_test(
            "Create Integration User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if not user_success or 'id' not in user_response:
            print("❌ Failed to create integration user")
            return False
        
        user_id = user_response['id']
        
        # Install integration
        install_data = {
            "integration_id": self.test_integration_id,
            "user_id": user_id,
            "configuration": {
                "api_key": "test-api-key-123",
                "endpoint_url": "https://api.example.com/crm"
            }
        }
        
        success, response = self.run_test(
            "Install Integration",
            "POST",
            "integrations/marketplace/install",
            200,
            data=install_data
        )
        
        if success and response:
            self.test_install_id = response.get('id')
            self.test_install_user_id = user_id
            
            # Verify installation response
            required_fields = ['id', 'integration_id', 'user_id', 'configuration', 'install_date']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Install field '{field}' present")
                else:
                    print(f"   ❌ Install field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_get_user_installed_integrations(self):
        """Test GET /api/integrations/user/{user_id}/installed"""
        if not hasattr(self, 'test_install_user_id'):
            print("❌ Skipping user installed integrations test - no user ID available")
            return False
        
        print(f"\n📋 Testing User Installed Integrations: {self.test_install_user_id}")
        
        success, response = self.run_test(
            "Get User Installed Integrations",
            "GET",
            f"integrations/user/{self.test_install_user_id}/installed",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                installation = response[0]
                if (installation.get('user_id') == self.test_install_user_id and
                    installation.get('integration_id') == self.test_integration_id):
                    print(f"   ✅ Found installed integration for user")
                    print(f"   Integration ID: {installation.get('integration_id')}")
                    print(f"   Install Date: {installation.get('install_date')}")
                    return True
                else:
                    print(f"   ❌ Installation data doesn't match expected values")
                    return False
            else:
                print(f"   ❌ Expected at least 1 installation, found {len(response)}")
                return False
        
        return False

    def test_create_integration_review(self):
        """Test POST /api/integrations/marketplace/{integration_id}/review"""
        if not hasattr(self, 'test_integration_id') or not hasattr(self, 'test_install_user_id'):
            print("❌ Skipping integration review test - missing required IDs")
            return False
        
        print(f"\n⭐ Testing Integration Review Creation...")
        
        review_data = {
            "integration_id": self.test_integration_id,
            "user_id": self.test_install_user_id,
            "rating": 5,
            "review": "Excellent integration! Works perfectly with our CRM system. Easy to configure and very reliable."
        }
        
        success, response = self.run_test(
            "Create Integration Review",
            "POST",
            f"integrations/marketplace/{self.test_integration_id}/review",
            200,
            data=review_data
        )
        
        if success and response:
            # Verify review response
            required_fields = ['id', 'integration_id', 'user_id', 'rating', 'review', 'created_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Review field '{field}' present")
                else:
                    print(f"   ❌ Review field '{field}' missing")
                    all_fields_present = False
            
            # Verify correct values
            if (response.get('rating') == 5 and 
                response.get('integration_id') == self.test_integration_id and
                response.get('user_id') == self.test_install_user_id):
                print(f"   ✅ Review created with correct data")
                return all_fields_present
            else:
                print(f"   ❌ Review created with incorrect data")
                return False
        
        return False

    # ===== E4: ADVANCED ANALYTICS & REPORTING TESTS =====
    
    def test_create_analytics_dashboard(self):
        """Test POST /api/analytics/dashboards/create"""
        print("\n📊 Testing Analytics Dashboard Creation...")
        
        # Create test user first
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"analytics_user_{timestamp}",
            "email": f"analytics_{timestamp}@modq.com",
            "role": "analyst"
        }
        
        user_success, user_response = self.run_test(
            "Create Analytics User",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if not user_success or 'id' not in user_response:
            print("❌ Failed to create analytics user")
            return False
        
        user_id = user_response['id']
        self.test_analytics_user_id = user_id
        
        # Create analytics dashboard
        dashboard_data = {
            "name": "Sales Performance Dashboard",
            "description": "Track key sales metrics and performance indicators",
            "user_id": user_id,
            "layout": {
                "grid": {"columns": 12, "rows": 8},
                "widgets": [
                    {"id": "revenue_chart", "x": 0, "y": 0, "w": 6, "h": 4},
                    {"id": "conversion_rate", "x": 6, "y": 0, "w": 6, "h": 4}
                ]
            },
            "widgets": [
                {
                    "id": "revenue_chart",
                    "type": "line_chart",
                    "title": "Monthly Revenue",
                    "data_source": "sales_data",
                    "config": {"x_axis": "month", "y_axis": "revenue"}
                },
                {
                    "id": "conversion_rate",
                    "type": "gauge",
                    "title": "Conversion Rate",
                    "data_source": "conversion_data",
                    "config": {"min": 0, "max": 100, "unit": "%"}
                }
            ],
            "filters": {
                "date_range": {"start": "2024-01-01", "end": "2024-12-31"},
                "region": "all"
            }
        }
        
        success, response = self.run_test(
            "Create Analytics Dashboard",
            "POST",
            "analytics/dashboards/create",
            200,
            data=dashboard_data
        )
        
        if success and response:
            self.test_dashboard_id = response.get('id')
            
            # Verify response structure
            required_fields = ['id', 'name', 'description', 'user_id', 'layout', 'widgets', 'created_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Dashboard field '{field}' present")
                else:
                    print(f"   ❌ Dashboard field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_get_user_dashboards(self):
        """Test GET /api/analytics/dashboards/user/{user_id}"""
        if not hasattr(self, 'test_analytics_user_id'):
            print("❌ Skipping user dashboards test - no analytics user ID available")
            return False
        
        print(f"\n📈 Testing User Dashboards Retrieval: {self.test_analytics_user_id}")
        
        success, response = self.run_test(
            "Get User Dashboards",
            "GET",
            f"analytics/dashboards/user/{self.test_analytics_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                dashboard = response[0]
                if (dashboard.get('user_id') == self.test_analytics_user_id and
                    dashboard.get('name') == 'Sales Performance Dashboard'):
                    print(f"   ✅ Found dashboard for user")
                    print(f"   Dashboard Name: {dashboard.get('name')}")
                    print(f"   Widget Count: {len(dashboard.get('widgets', []))}")
                    return True
                else:
                    print(f"   ❌ Dashboard data doesn't match expected values")
                    return False
            else:
                print(f"   ❌ Expected at least 1 dashboard, found {len(response)}")
                return False
        
        return False

    def test_create_kpi(self):
        """Test POST /api/analytics/kpis/create"""
        if not hasattr(self, 'test_analytics_user_id'):
            print("❌ Skipping KPI creation test - no analytics user ID available")
            return False
        
        print("\n📊 Testing KPI Creation...")
        
        kpi_data = {
            "name": "Monthly Recurring Revenue",
            "description": "Track monthly recurring revenue growth",
            "calculation": "SELECT SUM(monthly_amount) FROM subscriptions WHERE status = 'active'",
            "target_value": 100000.0,
            "unit": "USD",
            "category": "sales",
            "frequency": "monthly",
            "threshold_config": {
                "warning": 80000.0,
                "critical": 60000.0,
                "excellent": 120000.0
            },
            "user_id": self.test_analytics_user_id
        }
        
        success, response = self.run_test(
            "Create KPI",
            "POST",
            "analytics/kpis/create",
            200,
            data=kpi_data
        )
        
        if success and response:
            self.test_kpi_id = response.get('id')
            
            # Verify response structure
            required_fields = ['id', 'name', 'description', 'calculation', 'target_value', 'user_id', 'created_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ KPI field '{field}' present")
                else:
                    print(f"   ❌ KPI field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_get_user_kpis(self):
        """Test GET /api/analytics/kpis/user/{user_id}"""
        if not hasattr(self, 'test_analytics_user_id'):
            print("❌ Skipping user KPIs test - no analytics user ID available")
            return False
        
        print(f"\n📊 Testing User KPIs Retrieval: {self.test_analytics_user_id}")
        
        success, response = self.run_test(
            "Get User KPIs",
            "GET",
            f"analytics/kpis/user/{self.test_analytics_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                kpi = response[0]
                if (kpi.get('user_id') == self.test_analytics_user_id and
                    kpi.get('name') == 'Monthly Recurring Revenue'):
                    print(f"   ✅ Found KPI for user")
                    print(f"   KPI Name: {kpi.get('name')}")
                    print(f"   Target Value: {kpi.get('target_value')}")
                    print(f"   Category: {kpi.get('category')}")
                    return True
                else:
                    print(f"   ❌ KPI data doesn't match expected values")
                    return False
            else:
                print(f"   ❌ Expected at least 1 KPI, found {len(response)}")
                return False
        
        return False

    def test_calculate_kpi(self):
        """Test GET /api/analytics/kpis/{kpi_id}/calculate"""
        if not hasattr(self, 'test_kpi_id'):
            print("❌ Skipping KPI calculation test - no KPI ID available")
            return False
        
        print(f"\n🧮 Testing KPI Calculation: {self.test_kpi_id}")
        
        success, response = self.run_test(
            "Calculate KPI Value",
            "GET",
            f"analytics/kpis/{self.test_kpi_id}/calculate",
            200
        )
        
        if success and response:
            # Verify calculation response
            required_fields = ['kpi_id', 'current_value', 'target_value', 'performance_percentage', 'status']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Calculation field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ Calculation field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_create_report_template(self):
        """Test POST /api/analytics/reports/templates/create"""
        if not hasattr(self, 'test_analytics_user_id'):
            print("❌ Skipping report template creation test - no analytics user ID available")
            return False
        
        print("\n📄 Testing Report Template Creation...")
        
        template_data = {
            "name": "Monthly Sales Report",
            "description": "Comprehensive monthly sales performance report",
            "type": "pdf",
            "template_data": {
                "sections": [
                    {"type": "header", "title": "Monthly Sales Report"},
                    {"type": "chart", "chart_id": "revenue_trend"},
                    {"type": "table", "data_source": "top_products"},
                    {"type": "summary", "metrics": ["total_revenue", "conversion_rate"]}
                ],
                "styling": {
                    "theme": "corporate",
                    "colors": ["#3b82f6", "#8b5cf6", "#10b981"]
                }
            },
            "parameters": [
                {
                    "name": "date_range",
                    "type": "date_range",
                    "required": True,
                    "default": "last_month"
                },
                {
                    "name": "region",
                    "type": "select",
                    "options": ["all", "north", "south", "east", "west"],
                    "default": "all"
                }
            ],
            "schedule": {
                "frequency": "monthly",
                "day_of_month": 1,
                "time": "09:00"
            },
            "recipients": ["manager@company.com", "sales@company.com"],
            "user_id": self.test_analytics_user_id
        }
        
        success, response = self.run_test(
            "Create Report Template",
            "POST",
            "analytics/reports/templates/create",
            200,
            data=template_data
        )
        
        if success and response:
            self.test_template_id = response.get('id')
            
            # Verify response structure
            required_fields = ['id', 'name', 'description', 'type', 'template_data', 'user_id', 'created_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Template field '{field}' present")
                else:
                    print(f"   ❌ Template field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_generate_report(self):
        """Test POST /api/analytics/reports/generate/{template_id}"""
        if not hasattr(self, 'test_template_id'):
            print("❌ Skipping report generation test - no template ID available")
            return False
        
        print(f"\n📊 Testing Report Generation: {self.test_template_id}")
        
        generation_data = {
            "parameters": {
                "date_range": {
                    "start": "2024-01-01",
                    "end": "2024-01-31"
                },
                "region": "all"
            },
            "format": "pdf",
            "delivery_method": "download"
        }
        
        success, response = self.run_test(
            "Generate Report",
            "POST",
            f"analytics/reports/generate/{self.test_template_id}",
            200,
            data=generation_data
        )
        
        if success and response:
            # Verify generation response
            required_fields = ['report_id', 'template_id', 'status', 'generated_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Generation field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ Generation field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_create_predictive_model(self):
        """Test POST /api/analytics/models/create"""
        if not hasattr(self, 'test_analytics_user_id'):
            print("❌ Skipping predictive model creation test - no analytics user ID available")
            return False
        
        print("\n🤖 Testing Predictive Model Creation...")
        
        model_data = {
            "name": "Customer Churn Prediction",
            "description": "Predict customer churn probability based on usage patterns",
            "model_type": "classification",
            "algorithm": "random_forest",
            "features": [
                "monthly_usage_hours",
                "support_tickets_count",
                "last_login_days_ago",
                "subscription_length_months",
                "feature_adoption_score"
            ],
            "target": "churned",
            "user_id": self.test_analytics_user_id
        }
        
        success, response = self.run_test(
            "Create Predictive Model",
            "POST",
            "analytics/models/create",
            200,
            data=model_data
        )
        
        if success and response:
            self.test_model_id = response.get('id')
            
            # Verify response structure
            required_fields = ['id', 'name', 'description', 'model_type', 'algorithm', 'features', 'user_id', 'created_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Model field '{field}' present")
                else:
                    print(f"   ❌ Model field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_model_prediction(self):
        """Test POST /api/analytics/models/{model_id}/predict"""
        if not hasattr(self, 'test_model_id'):
            print("❌ Skipping model prediction test - no model ID available")
            return False
        
        print(f"\n🔮 Testing Model Prediction: {self.test_model_id}")
        
        prediction_data = {
            "input_data": {
                "monthly_usage_hours": 45.5,
                "support_tickets_count": 2,
                "last_login_days_ago": 3,
                "subscription_length_months": 18,
                "feature_adoption_score": 0.75
            },
            "return_probabilities": True,
            "explain_prediction": True
        }
        
        success, response = self.run_test(
            "Make Model Prediction",
            "POST",
            f"analytics/models/{self.test_model_id}/predict",
            200,
            data=prediction_data
        )
        
        if success and response:
            # Verify prediction response
            required_fields = ['model_id', 'prediction', 'confidence', 'predicted_at']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Prediction field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ Prediction field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def test_analytics_overview(self):
        """Test GET /api/analytics/overview/{user_id}"""
        if not hasattr(self, 'test_analytics_user_id'):
            print("❌ Skipping analytics overview test - no analytics user ID available")
            return False
        
        print(f"\n📊 Testing Analytics Overview: {self.test_analytics_user_id}")
        
        success, response = self.run_test(
            "Get Analytics Overview",
            "GET",
            f"analytics/overview/{self.test_analytics_user_id}",
            200
        )
        
        if success and response:
            # Verify overview response
            required_fields = ['user_id', 'dashboards_count', 'kpis_count', 'models_count', 'recent_activity']
            all_fields_present = True
            
            for field in required_fields:
                if field in response:
                    print(f"   ✅ Overview field '{field}' present: {response[field]}")
                else:
                    print(f"   ❌ Overview field '{field}' missing")
                    all_fields_present = False
            
            return all_fields_present
        
        return False

    def run_all_tests(self):
        """Run all E3 + E4 tests"""
        print("🚀 Starting E3 + E4 Advanced Platform Backend Testing...")
        print(f"   Base URL: {self.base_url}")
        print("=" * 80)

        # Track different types of failures
        e3_failures = []
        e4_failures = []
        
        # E3: Custom Integration Marketplace Tests
        print("\n🏪 E3: CUSTOM INTEGRATION MARKETPLACE TESTS")
        print("-" * 55)
        
        e3_tests = [
            ("Integration Marketplace Categories", self.test_integration_marketplace_categories),
            ("Create Custom Integration", self.test_create_custom_integration),
            ("Get Marketplace Integrations", self.test_get_marketplace_integrations),
            ("Get Specific Integration", self.test_get_specific_integration),
            ("Install Integration", self.test_install_integration),
            ("Get User Installed Integrations", self.test_get_user_installed_integrations),
            ("Create Integration Review", self.test_create_integration_review)
        ]
        
        for test_name, test_func in e3_tests:
            try:
                result = test_func()
                if not result:
                    e3_failures.append(f"E3: {test_name}")
            except Exception as e:
                e3_failures.append(f"E3: {test_name} - {str(e)}")
        
        # E4: Advanced Analytics & Reporting Tests
        print("\n📊 E4: ADVANCED ANALYTICS & REPORTING TESTS")
        print("-" * 55)
        
        e4_tests = [
            ("Create Analytics Dashboard", self.test_create_analytics_dashboard),
            ("Get User Dashboards", self.test_get_user_dashboards),
            ("Create KPI", self.test_create_kpi),
            ("Get User KPIs", self.test_get_user_kpis),
            ("Calculate KPI", self.test_calculate_kpi),
            ("Create Report Template", self.test_create_report_template),
            ("Generate Report", self.test_generate_report),
            ("Create Predictive Model", self.test_create_predictive_model),
            ("Model Prediction", self.test_model_prediction),
            ("Analytics Overview", self.test_analytics_overview)
        ]
        
        for test_name, test_func in e4_tests:
            try:
                result = test_func()
                if not result:
                    e4_failures.append(f"E4: {test_name}")
            except Exception as e:
                e4_failures.append(f"E4: {test_name} - {str(e)}")
        
        # Final Results Summary
        print("\n" + "=" * 80)
        print("🏁 E3 + E4 ADVANCED PLATFORM TESTING COMPLETED")
        print("=" * 80)
        print(f"📊 RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 SUCCESS RATE: {success_rate:.1f}%")
        
        # Detailed failure analysis
        if len(e3_failures) == 0:
            print("✅ E3 CUSTOM INTEGRATION MARKETPLACE: All features working")
        else:
            print(f"❌ E3 FAILURES ({len(e3_failures)}):")
            for failure in e3_failures:
                print(f"   - {failure}")
        
        if len(e4_failures) == 0:
            print("✅ E4 ADVANCED ANALYTICS & REPORTING: All features working")
        else:
            print(f"❌ E4 FAILURES ({len(e4_failures)}):")
            for failure in e4_failures:
                print(f"   - {failure}")
        
        # Overall assessment
        if success_rate >= 90:
            print("🎉 EXCELLENT: E3 + E4 Advanced Platform is performing exceptionally well!")
        elif success_rate >= 75:
            print("✅ GOOD: E3 + E4 Advanced Platform is performing well with minor issues")
        elif success_rate >= 50:
            print("⚠️ MODERATE: E3 + E4 Advanced Platform has some issues that need attention")
        elif success_rate >= 25:
            print("❌ POOR: E3 + E4 Advanced Platform has significant issues requiring immediate attention")
        else:
            print("🚨 CRITICAL: E3 + E4 Advanced Platform is not functional")
        
        print("=" * 80)
        
        return {
            'success_rate': success_rate,
            'tests_passed': self.tests_passed,
            'tests_run': self.tests_run,
            'e3_failures': e3_failures,
            'e4_failures': e4_failures
        }

if __name__ == "__main__":
    tester = E3E4APITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if results['success_rate'] >= 75 else 1)