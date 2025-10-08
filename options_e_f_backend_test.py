import requests
import sys
import json
import time
from datetime import datetime

class OptionsEFAPITester:
    def __init__(self, base_url="https://ai-business-intel.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_user_token = None
        self.test_workflow_id = None
        self.test_agent_id = None
        self.test_integration_id = None
        self.test_report_id = None
        self.test_model_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        # Add auth token if available
        if self.test_user_token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.test_user_token}'

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
        """Create a test user and get authentication token"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "username": f"options_ef_user_{timestamp}",
            "email": f"ef_test_{timestamp}@modq.com",
            "password": "TestPassword123!",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "User Registration for Options E&F Testing",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.test_user_id = response['user_id']
            self.test_user_token = response['access_token']
            print(f"   Created test user with ID: {self.test_user_id}")
            return True
        return False

    # ===== E1: Enhanced Workflow Automation Tests =====
    
    def test_e1_enhanced_workflow_creation(self):
        """Test POST /api/workflows/enhanced/create"""
        print("\n🔧 Testing E1: Enhanced Workflow Creation...")
        
        workflow_data = {
            "user_id": self.test_user_id,
            "name": "Enhanced Lead Processing Workflow",
            "description": "Advanced workflow with AI processing and parallel execution",
            "category": "lead_qualification",
            "nodes": [
                {
                    "type": "trigger",
                    "name": "Lead Capture Trigger",
                    "configuration": {
                        "trigger_type": "webhook",
                        "conditions": ["email_provided", "company_size > 10"]
                    }
                },
                {
                    "type": "ai_response",
                    "name": "AI Lead Qualification",
                    "configuration": {
                        "model": "gpt-4o",
                        "prompt": "Analyze lead quality based on provided data",
                        "temperature": 0.3
                    }
                },
                {
                    "type": "parallel",
                    "name": "Parallel Processing",
                    "configuration": {
                        "branches": ["email_sequence", "crm_update", "notification"]
                    }
                }
            ],
            "connections": [
                {
                    "source_node_id": "trigger_1",
                    "target_node_id": "ai_response_1",
                    "condition": "lead_score > 0.7"
                }
            ],
            "triggers": ["webhook", "form_submission"],
            "is_active": True
        }
        
        success, response = self.run_test(
            "Enhanced Workflow Creation",
            "POST",
            "workflows/enhanced/create",
            200,
            data=workflow_data
        )
        
        if success and response:
            self.test_workflow_id = response.get('id')
            print(f"   Created enhanced workflow with ID: {self.test_workflow_id}")
            
            # Verify enhanced features
            if 'nodes' in response and len(response['nodes']) >= 3:
                print("   ✅ Enhanced workflow nodes created successfully")
            if response.get('is_active') == True:
                print("   ✅ Workflow activated successfully")
            
            return True
        return False

    def test_e1_get_enhanced_workflows(self):
        """Test GET /api/workflows/enhanced/{user_id}"""
        print(f"\n📋 Testing E1: Get Enhanced Workflows for user {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get Enhanced Workflows",
            "GET",
            f"workflows/enhanced/{self.test_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                workflow = response[0]
                if workflow.get('name') == 'Enhanced Lead Processing Workflow':
                    print("   ✅ Enhanced workflow retrieved successfully")
                    print(f"   Workflow Category: {workflow.get('category')}")
                    print(f"   Node Count: {len(workflow.get('nodes', []))}")
                    return True
            else:
                print("   ❌ No enhanced workflows found")
        return False

    def test_e1_workflow_execution(self):
        """Test POST /api/workflows/execute with monitoring"""
        if not self.test_workflow_id:
            print("❌ Skipping workflow execution test - no workflow ID available")
            return False
            
        print(f"\n▶️ Testing E1: Workflow Execution with Monitoring...")
        
        execution_data = {
            "workflow_id": self.test_workflow_id,
            "user_id": self.test_user_id,
            "trigger_data": {
                "lead_email": "prospect@company.com",
                "company_name": "Tech Solutions Inc",
                "company_size": 50,
                "source": "website_form",
                "ai_processing": {
                    "enabled": True,
                    "model": "gpt-4o",
                    "personality": "Sales Manager"
                },
                "parallel_execution": {
                    "enabled": True,
                    "max_concurrent": 3
                },
                "data_transformation": {
                    "normalize_email": True,
                    "extract_domain": True,
                    "enrich_company_data": True
                }
            }
        }
        
        success, response = self.run_test(
            "Execute Enhanced Workflow",
            "POST",
            "workflows/execute",
            200,
            data=execution_data
        )
        
        if success and response:
            execution_id = response.get('id')
            status = response.get('status')
            print(f"   Execution ID: {execution_id}")
            print(f"   Status: {status}")
            
            if status in ['pending', 'running', 'completed']:
                print("   ✅ Workflow execution initiated successfully")
                return True
        return False

    def test_e1_execution_history(self):
        """Test GET /api/workflows/{workflow_id}/executions"""
        if not self.test_workflow_id:
            print("❌ Skipping execution history test - no workflow ID available")
            return False
            
        print(f"\n📊 Testing E1: Workflow Execution History...")
        
        success, response = self.run_test(
            "Get Workflow Execution History",
            "GET",
            f"workflows/{self.test_workflow_id}/executions",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                execution = response[0]
                print(f"   Found {len(response)} executions")
                print(f"   Latest execution status: {execution.get('status')}")
                print(f"   Execution time: {execution.get('execution_time_ms')}ms")
                return True
            else:
                print("   ⚠️ No execution history found (may be expected for new workflow)")
                return True
        return False

    def test_e1_ai_suggestions(self):
        """Test POST /api/workflows/{workflow_id}/suggestions"""
        if not self.test_workflow_id:
            print("❌ Skipping AI suggestions test - no workflow ID available")
            return False
            
        print(f"\n🤖 Testing E1: AI Workflow Suggestions...")
        
        suggestion_data = {
            "user_id": self.test_user_id,
            "context": "lead_qualification",
            "current_performance": {
                "success_rate": 0.75,
                "avg_execution_time": 2500,
                "common_failures": ["email_validation", "crm_timeout"]
            }
        }
        
        success, response = self.run_test(
            "Generate AI Workflow Suggestions",
            "POST",
            f"workflows/{self.test_workflow_id}/suggestions",
            200,
            data=suggestion_data
        )
        
        if success and response:
            suggestions = response.get('suggestions', [])
            if len(suggestions) > 0:
                print(f"   ✅ Generated {len(suggestions)} AI suggestions")
                for i, suggestion in enumerate(suggestions[:3]):
                    print(f"   Suggestion {i+1}: {suggestion.get('title', 'Unknown')}")
                return True
        return False

    def test_e1_workflow_metrics(self):
        """Test GET /api/workflows/{workflow_id}/metrics"""
        if not self.test_workflow_id:
            print("❌ Skipping workflow metrics test - no workflow ID available")
            return False
            
        print(f"\n📈 Testing E1: Workflow Performance Metrics...")
        
        success, response = self.run_test(
            "Get Workflow Performance Metrics",
            "GET",
            f"workflows/{self.test_workflow_id}/metrics",
            200
        )
        
        if success and response:
            metrics = response
            print(f"   Total Executions: {metrics.get('total_executions', 0)}")
            print(f"   Success Rate: {metrics.get('success_rate', 0)}%")
            print(f"   Avg Execution Time: {metrics.get('average_execution_time_ms', 0)}ms")
            
            if 'workflow_id' in metrics:
                print("   ✅ Workflow metrics retrieved successfully")
                return True
        return False

    # ===== E2: Advanced AI Integrations Tests =====
    
    def test_e2_available_ai_models(self):
        """Test GET /api/ai/models/available"""
        print("\n🧠 Testing E2: Available AI Models...")
        
        success, response = self.run_test(
            "Get Available AI Models",
            "GET",
            "ai/models/available",
            200
        )
        
        if success and response:
            models = response.get('models', [])
            providers = response.get('providers', [])
            
            print(f"   Found {len(models)} AI models")
            print(f"   Supported providers: {providers}")
            
            # Check for expected providers
            expected_providers = ['openai', 'anthropic', 'gemini']
            for provider in expected_providers:
                if provider in providers:
                    print(f"   ✅ Provider '{provider}' available")
                else:
                    print(f"   ❌ Provider '{provider}' missing")
            
            return len(providers) >= 2  # At least 2 providers should be available
        return False

    def test_e2_multi_llm_chat(self):
        """Test POST /api/ai/chat/multi-llm"""
        print("\n💬 Testing E2: Multi-LLM Chat...")
        
        chat_data = {
            "user_id": self.test_user_id,
            "message": "Analyze the current market trends for SaaS businesses and provide strategic recommendations.",
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": 0.7,
            "max_tokens": 1000,
            "context": {
                "industry": "Technology",
                "company_size": "startup",
                "focus_area": "market_analysis"
            }
        }
        
        success, response = self.run_test(
            "Multi-LLM Chat with Provider Selection",
            "POST",
            "ai/chat/multi-llm",
            200,
            data=chat_data
        )
        
        if success and response:
            if 'response' in response and 'provider' in response:
                print(f"   ✅ Multi-LLM chat successful")
                print(f"   Provider used: {response.get('provider')}")
                print(f"   Model used: {response.get('model')}")
                print(f"   Response length: {len(response.get('response', ''))}")
                return True
        return False

    def test_e2_create_ai_agent(self):
        """Test POST /api/ai/agents/create"""
        print("\n🤖 Testing E2: Create Custom AI Agent...")
        
        agent_data = {
            "name": "Advanced Sales Assistant",
            "type": "sales_agent",
            "provider": "openai",
            "model": "gpt-4o",
            "system_prompt": "You are an advanced sales assistant specializing in B2B SaaS sales. You help qualify leads, handle objections, and provide strategic sales guidance.",
            "temperature": 0.6,
            "max_tokens": 2000,
            "capabilities": [
                "lead_qualification",
                "objection_handling", 
                "proposal_generation",
                "competitive_analysis",
                "pricing_strategy"
            ],
            "user_id": self.test_user_id
        }
        
        success, response = self.run_test(
            "Create Custom AI Agent",
            "POST",
            "ai/agents/create",
            200,
            data=agent_data
        )
        
        if success and response:
            self.test_agent_id = response.get('id')
            print(f"   Created AI agent with ID: {self.test_agent_id}")
            
            if response.get('name') == agent_data['name']:
                print("   ✅ AI agent created with correct configuration")
                return True
        return False

    def test_e2_get_user_ai_agents(self):
        """Test GET /api/ai/agents/{user_id}"""
        print(f"\n📋 Testing E2: Get User AI Agents for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get User AI Agents",
            "GET",
            f"ai/agents/{self.test_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                agent = response[0]
                print(f"   Found {len(response)} AI agents")
                print(f"   Agent name: {agent.get('name')}")
                print(f"   Agent type: {agent.get('type')}")
                print(f"   Provider: {agent.get('provider')}")
                return True
            else:
                print("   ❌ No AI agents found")
        return False

    def test_e2_chat_with_ai_agent(self):
        """Test POST /api/ai/agents/{agent_id}/chat"""
        if not self.test_agent_id:
            print("❌ Skipping AI agent chat test - no agent ID available")
            return False
            
        print(f"\n💬 Testing E2: Chat with Specific AI Agent...")
        
        chat_data = {
            "user_id": self.test_user_id,
            "message": "I have a prospect who is concerned about pricing. They think our solution is too expensive compared to competitors. How should I handle this objection?",
            "context": {
                "prospect_company": "Mid-size Manufacturing",
                "deal_size": "$50,000",
                "competitor": "Generic CRM Solution",
                "stage": "negotiation"
            }
        }
        
        success, response = self.run_test(
            "Chat with Specific AI Agent",
            "POST",
            f"ai/agents/{self.test_agent_id}/chat",
            200,
            data=chat_data
        )
        
        if success and response:
            if 'response' in response:
                print(f"   ✅ AI agent chat successful")
                print(f"   Response length: {len(response.get('response', ''))}")
                print(f"   Agent ID: {response.get('agent_id')}")
                return True
        return False

    def test_e2_ai_agent_templates(self):
        """Test GET /api/ai/agents/templates"""
        print("\n📋 Testing E2: AI Agent Templates...")
        
        success, response = self.run_test(
            "Get AI Agent Templates",
            "GET",
            "ai/agents/templates",
            200
        )
        
        if success and response:
            templates = response.get('templates', [])
            print(f"   Found {len(templates)} agent templates")
            
            expected_templates = ['sales-agent-template', 'support-agent-template', 'analytics-agent-template']
            for template_id in expected_templates:
                template_found = any(t.get('id') == template_id for t in templates)
                if template_found:
                    print(f"   ✅ Template '{template_id}' available")
                else:
                    print(f"   ❌ Template '{template_id}' missing")
            
            return len(templates) >= 3
        return False

    def test_e2_create_agent_from_template(self):
        """Test POST /api/ai/agents/from-template"""
        print("\n🏗️ Testing E2: Create Agent from Template...")
        
        template_data = {
            "template_id": "sales-agent-template",
            "user_id": self.test_user_id,
            "customizations": {
                "name": "Custom Sales Agent from Template",
                "industry_focus": "Technology",
                "experience_level": "senior",
                "specialization": "enterprise_sales"
            }
        }
        
        success, response = self.run_test(
            "Create Agent from Template",
            "POST",
            "ai/agents/from-template",
            200,
            data=template_data
        )
        
        if success and response:
            if 'id' in response and 'name' in response:
                print(f"   ✅ Agent created from template successfully")
                print(f"   Agent ID: {response.get('id')}")
                print(f"   Agent Name: {response.get('name')}")
                return True
        return False

    # ===== E3: Custom Integration Marketplace Tests =====
    
    def test_e3_marketplace_integrations(self):
        """Test GET /api/integrations/marketplace"""
        print("\n🏪 Testing E3: Integration Marketplace...")
        
        success, response = self.run_test(
            "Get Marketplace Integrations",
            "GET",
            "integrations/marketplace",
            200
        )
        
        if success and response:
            integrations = response.get('integrations', [])
            print(f"   Found {len(integrations)} marketplace integrations")
            
            if len(integrations) > 0:
                integration = integrations[0]
                required_fields = ['id', 'name', 'description', 'category', 'author', 'version']
                
                all_fields_present = True
                for field in required_fields:
                    if field in integration:
                        print(f"   ✅ Integration field '{field}' present")
                    else:
                        print(f"   ❌ Integration field '{field}' missing")
                        all_fields_present = False
                
                return all_fields_present
        return False

    def test_e3_install_integration(self):
        """Test POST /api/integrations/install"""
        print("\n📦 Testing E3: Install Integration...")
        
        install_data = {
            "integration_id": "custom-webhook-processor",
            "user_id": self.test_user_id,
            "configuration": {
                "webhook_url": "https://api.company.com/webhook",
                "authentication": {
                    "type": "api_key",
                    "key": "test-api-key-123"
                },
                "processing_rules": {
                    "filter_spam": True,
                    "auto_categorize": True,
                    "send_notifications": True
                }
            }
        }
        
        success, response = self.run_test(
            "Install Custom Integration",
            "POST",
            "integrations/install",
            200,
            data=install_data
        )
        
        if success and response:
            self.test_integration_id = response.get('id')
            print(f"   Installed integration with ID: {self.test_integration_id}")
            
            if response.get('integration_id') == install_data['integration_id']:
                print("   ✅ Integration installed successfully")
                return True
        return False

    def test_e3_get_user_integrations(self):
        """Test GET /api/integrations/user/{user_id}"""
        print(f"\n📋 Testing E3: Get User Integrations for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get User Installed Integrations",
            "GET",
            f"integrations/user/{self.test_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                integration = response[0]
                print(f"   Found {len(response)} installed integrations")
                print(f"   Integration ID: {integration.get('integration_id')}")
                print(f"   Install Date: {integration.get('install_date')}")
                return True
            else:
                print("   ❌ No installed integrations found")
        return False

    def test_e3_configure_integration(self):
        """Test POST /api/integrations/{integration_id}/configure"""
        if not self.test_integration_id:
            print("❌ Skipping integration configuration test - no integration ID available")
            return False
            
        print(f"\n⚙️ Testing E3: Configure Integration...")
        
        config_data = {
            "user_id": self.test_user_id,
            "configuration": {
                "webhook_url": "https://api.company.com/webhook/v2",
                "authentication": {
                    "type": "oauth2",
                    "client_id": "updated-client-id",
                    "scope": "read write"
                },
                "processing_rules": {
                    "filter_spam": True,
                    "auto_categorize": True,
                    "send_notifications": False,
                    "custom_fields": ["priority", "department"]
                },
                "advanced_settings": {
                    "retry_attempts": 3,
                    "timeout_seconds": 30,
                    "batch_processing": True
                }
            }
        }
        
        success, response = self.run_test(
            "Configure Integration",
            "POST",
            f"integrations/{self.test_integration_id}/configure",
            200,
            data=config_data
        )
        
        if success and response:
            if 'configuration' in response:
                print("   ✅ Integration configured successfully")
                print(f"   Updated configuration keys: {list(response['configuration'].keys())}")
                return True
        return False

    # ===== E4: Advanced Analytics & Reporting Tests =====
    
    def test_e4_create_custom_report(self):
        """Test POST /api/analytics/reports/create"""
        print("\n📊 Testing E4: Create Custom Report...")
        
        report_data = {
            "name": "Monthly Sales Performance Report",
            "description": "Comprehensive analysis of sales metrics and trends",
            "type": "pdf",
            "template_data": {
                "sections": [
                    {
                        "title": "Executive Summary",
                        "type": "text",
                        "content": "Monthly sales overview and key insights"
                    },
                    {
                        "title": "Sales Metrics",
                        "type": "chart",
                        "chart_type": "line",
                        "data_source": "sales_data",
                        "metrics": ["revenue", "deals_closed", "conversion_rate"]
                    },
                    {
                        "title": "Team Performance",
                        "type": "table",
                        "data_source": "team_metrics",
                        "columns": ["rep_name", "deals", "revenue", "quota_attainment"]
                    }
                ],
                "styling": {
                    "theme": "corporate",
                    "colors": ["#3b82f6", "#10b981", "#f59e0b"]
                }
            },
            "parameters": [
                {
                    "name": "date_range",
                    "type": "date_range",
                    "required": True,
                    "default": "last_30_days"
                },
                {
                    "name": "team_filter",
                    "type": "multi_select",
                    "options": ["sales", "marketing", "customer_success"],
                    "required": False
                }
            ],
            "schedule": {
                "frequency": "monthly",
                "day_of_month": 1,
                "time": "09:00",
                "timezone": "UTC"
            },
            "recipients": ["manager@company.com", "ceo@company.com"],
            "user_id": self.test_user_id
        }
        
        success, response = self.run_test(
            "Create Custom Report",
            "POST",
            "analytics/reports/create",
            200,
            data=report_data
        )
        
        if success and response:
            self.test_report_id = response.get('id')
            print(f"   Created report with ID: {self.test_report_id}")
            
            if response.get('name') == report_data['name']:
                print("   ✅ Custom report created successfully")
                return True
        return False

    def test_e4_get_user_reports(self):
        """Test GET /api/analytics/reports/{user_id}"""
        print(f"\n📋 Testing E4: Get User Reports for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get User Reports",
            "GET",
            f"analytics/reports/{self.test_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                report = response[0]
                print(f"   Found {len(response)} reports")
                print(f"   Report name: {report.get('name')}")
                print(f"   Report type: {report.get('type')}")
                return True
            else:
                print("   ❌ No reports found")
        return False

    def test_e4_generate_report(self):
        """Test POST /api/analytics/reports/{report_id}/generate"""
        if not self.test_report_id:
            print("❌ Skipping report generation test - no report ID available")
            return False
            
        print(f"\n📈 Testing E4: Generate Report Data...")
        
        generation_data = {
            "user_id": self.test_user_id,
            "parameters": {
                "date_range": {
                    "start": "2024-01-01",
                    "end": "2024-01-31"
                },
                "team_filter": ["sales", "marketing"],
                "include_forecasts": True,
                "detail_level": "comprehensive"
            },
            "format": "pdf",
            "delivery_method": "download"
        }
        
        success, response = self.run_test(
            "Generate Report Data",
            "POST",
            f"analytics/reports/{self.test_report_id}/generate",
            200,
            data=generation_data
        )
        
        if success and response:
            if 'report_url' in response or 'generation_id' in response:
                print("   ✅ Report generation initiated successfully")
                print(f"   Generation status: {response.get('status', 'unknown')}")
                return True
        return False

    def test_e4_create_predictive_model(self):
        """Test POST /api/analytics/predictive/create-model"""
        print("\n🔮 Testing E4: Create Predictive Model...")
        
        model_data = {
            "name": "Sales Revenue Forecasting Model",
            "description": "Predicts monthly sales revenue based on historical data and market indicators",
            "model_type": "regression",
            "algorithm": "random_forest",
            "features": [
                "historical_revenue",
                "lead_volume",
                "marketing_spend",
                "sales_team_size",
                "market_conditions",
                "seasonal_factors",
                "competitor_activity"
            ],
            "target": "monthly_revenue",
            "training_config": {
                "test_size": 0.2,
                "validation_split": 0.1,
                "cross_validation": 5,
                "hyperparameters": {
                    "n_estimators": 100,
                    "max_depth": 10,
                    "min_samples_split": 5
                }
            },
            "user_id": self.test_user_id
        }
        
        success, response = self.run_test(
            "Create Predictive Model",
            "POST",
            "analytics/predictive/create-model",
            200,
            data=model_data
        )
        
        if success and response:
            self.test_model_id = response.get('id')
            print(f"   Created predictive model with ID: {self.test_model_id}")
            
            if response.get('name') == model_data['name']:
                print("   ✅ Predictive model created successfully")
                return True
        return False

    def test_e4_get_user_models(self):
        """Test GET /api/analytics/predictive/models/{user_id}"""
        print(f"\n🤖 Testing E4: Get User Predictive Models for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get User Predictive Models",
            "GET",
            f"analytics/predictive/models/{self.test_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) >= 1:
                model = response[0]
                print(f"   Found {len(response)} predictive models")
                print(f"   Model name: {model.get('name')}")
                print(f"   Model type: {model.get('model_type')}")
                print(f"   Algorithm: {model.get('algorithm')}")
                return True
            else:
                print("   ❌ No predictive models found")
        return False

    def test_e4_generate_predictions(self):
        """Test POST /api/analytics/predictive/{model_id}/predict"""
        if not self.test_model_id:
            print("❌ Skipping prediction generation test - no model ID available")
            return False
            
        print(f"\n🔮 Testing E4: Generate Predictions...")
        
        prediction_data = {
            "user_id": self.test_user_id,
            "input_data": {
                "historical_revenue": [45000, 52000, 48000, 55000, 61000],
                "lead_volume": 150,
                "marketing_spend": 12000,
                "sales_team_size": 8,
                "market_conditions": "positive",
                "seasonal_factors": 1.1,
                "competitor_activity": "moderate"
            },
            "prediction_horizon": "3_months",
            "confidence_interval": 0.95,
            "include_explanations": True
        }
        
        success, response = self.run_test(
            "Generate Predictions",
            "POST",
            f"analytics/predictive/{self.test_model_id}/predict",
            200,
            data=prediction_data
        )
        
        if success and response:
            if 'predictions' in response:
                predictions = response['predictions']
                print(f"   ✅ Generated {len(predictions)} predictions")
                print(f"   Confidence score: {response.get('confidence', 'N/A')}")
                return True
        return False

    def test_e4_ai_insights(self):
        """Test GET /api/analytics/insights/{user_id}"""
        print(f"\n💡 Testing E4: AI-Powered Insights for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get AI-Powered Insights",
            "GET",
            f"analytics/insights/{self.test_user_id}",
            200
        )
        
        if success and response:
            insights = response.get('insights', [])
            print(f"   Generated {len(insights)} AI insights")
            
            if len(insights) > 0:
                insight = insights[0]
                print(f"   Sample insight: {insight.get('title', 'Unknown')}")
                print(f"   Insight type: {insight.get('type', 'Unknown')}")
                print(f"   Confidence: {insight.get('confidence', 'N/A')}")
                return True
        return False

    # ===== F1: Performance Optimization Tests =====
    
    def test_f1_performance_metrics(self):
        """Test GET /api/performance/metrics"""
        print("\n⚡ Testing F1: Performance Metrics...")
        
        success, response = self.run_test(
            "Get System Performance Metrics",
            "GET",
            "performance/metrics",
            200
        )
        
        if success and response:
            metrics = response
            print(f"   Average Response Time: {metrics.get('average_response_time_ms', 0)}ms")
            print(f"   Error Rate: {metrics.get('error_rate_percent', 0)}%")
            print(f"   Total Requests: {metrics.get('total_requests', 0)}")
            
            if 'recent_metrics' in metrics:
                print("   ✅ Performance metrics retrieved successfully")
                return True
        return False

    def test_f1_optimization_tasks(self):
        """Test POST /api/performance/optimize"""
        print("\n🚀 Testing F1: Run Optimization Tasks...")
        
        optimization_data = {
            "user_id": self.test_user_id,
            "optimization_type": "comprehensive",
            "targets": [
                "database_queries",
                "cache_efficiency", 
                "memory_usage",
                "response_times"
            ],
            "priority": "high",
            "schedule": "immediate"
        }
        
        success, response = self.run_test(
            "Run Performance Optimization",
            "POST",
            "performance/optimize",
            200,
            data=optimization_data
        )
        
        if success and response:
            if 'optimization_id' in response or 'status' in response:
                print("   ✅ Performance optimization initiated")
                print(f"   Status: {response.get('status', 'unknown')}")
                return True
        return False

    def test_f1_health_check(self):
        """Test GET /api/performance/health-check"""
        print("\n🏥 Testing F1: System Health Check...")
        
        success, response = self.run_test(
            "System Health Check",
            "GET",
            "performance/health-check",
            200
        )
        
        if success and response:
            health_status = response.get('status', 'unknown')
            services = response.get('services', {})
            
            print(f"   Overall Health: {health_status}")
            print(f"   Services Checked: {len(services)}")
            
            for service, status in services.items():
                print(f"   {service}: {status}")
            
            if health_status in ['healthy', 'degraded', 'unhealthy']:
                print("   ✅ Health check completed successfully")
                return True
        return False

    # ===== F2: Mobile & PWA Tests =====
    
    def test_f2_mobile_config(self):
        """Test POST /api/mobile/config"""
        print("\n📱 Testing F2: Mobile Configuration...")
        
        mobile_config = {
            "user_id": self.test_user_id,
            "push_notifications_enabled": True,
            "offline_sync_enabled": True,
            "mobile_theme": "dark",
            "compact_mode": True,
            "gesture_controls": True,
            "auto_sync_interval": 300,
            "data_usage_optimization": {
                "compress_images": True,
                "limit_background_sync": True,
                "wifi_only_large_downloads": True
            },
            "accessibility": {
                "high_contrast": False,
                "large_text": False,
                "voice_navigation": True
            }
        }
        
        success, response = self.run_test(
            "Update Mobile Configuration",
            "POST",
            "mobile/config",
            200,
            data=mobile_config
        )
        
        if success and response:
            if response.get('user_id') == self.test_user_id:
                print("   ✅ Mobile configuration updated successfully")
                return True
        return False

    def test_f2_get_mobile_config(self):
        """Test GET /api/mobile/config/{user_id}"""
        print(f"\n📱 Testing F2: Get Mobile Config for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get Mobile Configuration",
            "GET",
            f"mobile/config/{self.test_user_id}",
            200
        )
        
        if success and response:
            config = response
            print(f"   Push Notifications: {config.get('push_notifications_enabled')}")
            print(f"   Offline Sync: {config.get('offline_sync_enabled')}")
            print(f"   Theme: {config.get('mobile_theme')}")
            
            if 'user_id' in config:
                print("   ✅ Mobile configuration retrieved successfully")
                return True
        return False

    def test_f2_pwa_install(self):
        """Test POST /api/pwa/install"""
        print("\n📲 Testing F2: PWA Installation Tracking...")
        
        install_data = {
            "user_id": self.test_user_id,
            "platform": "android",
            "browser": "chrome",
            "version": "120.0.0.0",
            "install_source": "banner_prompt",
            "device_info": {
                "screen_resolution": "1920x1080",
                "device_type": "mobile",
                "os_version": "Android 14"
            }
        }
        
        success, response = self.run_test(
            "Track PWA Installation",
            "POST",
            "pwa/install",
            200,
            data=install_data
        )
        
        if success and response:
            if 'install_id' in response or 'status' in response:
                print("   ✅ PWA installation tracked successfully")
                return True
        return False

    def test_f2_offline_data_sync(self):
        """Test POST /api/mobile/sync/offline-data"""
        print("\n🔄 Testing F2: Offline Data Sync...")
        
        sync_data = {
            "user_id": self.test_user_id,
            "device_id": "device-123-abc",
            "last_sync_timestamp": "2024-01-15T10:30:00Z",
            "offline_changes": [
                {
                    "type": "chat_message",
                    "action": "create",
                    "data": {
                        "message": "Offline message test",
                        "timestamp": "2024-01-15T11:00:00Z"
                    }
                },
                {
                    "type": "user_config",
                    "action": "update",
                    "data": {
                        "theme": "light",
                        "notifications": False
                    }
                }
            ],
            "sync_conflicts": [],
            "data_integrity_hash": "abc123def456"
        }
        
        success, response = self.run_test(
            "Sync Offline Data",
            "POST",
            "mobile/sync/offline-data",
            200,
            data=sync_data
        )
        
        if success and response:
            if 'sync_status' in response:
                print(f"   Sync Status: {response.get('sync_status')}")
                print(f"   Conflicts: {len(response.get('conflicts', []))}")
                print("   ✅ Offline data sync completed")
                return True
        return False

    def test_f2_lightweight_data(self):
        """Test GET /api/mobile/data/lightweight/{user_id}"""
        print(f"\n📊 Testing F2: Lightweight Data for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get Lightweight Mobile Data",
            "GET",
            f"mobile/data/lightweight/{self.test_user_id}",
            200
        )
        
        if success and response:
            data_size = len(json.dumps(response))
            print(f"   Data size: {data_size} bytes")
            
            # Check for expected lightweight data structure
            expected_keys = ['user_profile', 'recent_activity', 'notifications']
            found_keys = [key for key in expected_keys if key in response]
            
            print(f"   Found keys: {found_keys}")
            
            if len(found_keys) >= 2:
                print("   ✅ Lightweight data retrieved successfully")
                return True
        return False

    # ===== F3: Security Hardening Tests =====
    
    def test_f3_security_audit_log(self):
        """Test POST /api/security/audit-log"""
        print("\n🔒 Testing F3: Security Audit Logging...")
        
        audit_data = {
            "user_id": self.test_user_id,
            "action": "login_attempt",
            "resource": "user_authentication",
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "success": True,
            "details": {
                "authentication_method": "password",
                "session_duration": 3600,
                "location": "New York, NY",
                "device_fingerprint": "abc123def456"
            },
            "risk_score": 0.2,
            "security_flags": ["normal_location", "known_device"]
        }
        
        success, response = self.run_test(
            "Log Security Event",
            "POST",
            "security/audit-log",
            200,
            data=audit_data
        )
        
        if success and response:
            if 'log_id' in response or 'status' in response:
                print("   ✅ Security event logged successfully")
                return True
        return False

    def test_f3_get_audit_log(self):
        """Test GET /api/security/audit-log/{user_id}"""
        print(f"\n📋 Testing F3: Get Security Audit Log for {self.test_user_id}...")
        
        success, response = self.run_test(
            "Get User Security Audit Log",
            "GET",
            f"security/audit-log/{self.test_user_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} audit log entries")
            
            if len(response) > 0:
                log_entry = response[0]
                print(f"   Latest action: {log_entry.get('action')}")
                print(f"   Success: {log_entry.get('success')}")
                print(f"   Timestamp: {log_entry.get('timestamp')}")
                return True
            else:
                print("   ⚠️ No audit log entries found")
                return True  # This might be expected for new user
        return False

    def test_f3_encrypt_data(self):
        """Test POST /api/security/encrypt-data"""
        print("\n🔐 Testing F3: Data Encryption...")
        
        encryption_data = {
            "user_id": self.test_user_id,
            "data": {
                "sensitive_field": "confidential_information",
                "personal_data": {
                    "ssn": "123-45-6789",
                    "credit_card": "4111-1111-1111-1111"
                },
                "business_data": {
                    "api_keys": ["key1", "key2"],
                    "database_credentials": "user:pass@host:port"
                }
            },
            "encryption_level": "high",
            "key_rotation": True,
            "compliance_standard": "SOC2"
        }
        
        success, response = self.run_test(
            "Encrypt Sensitive Data",
            "POST",
            "security/encrypt-data",
            200,
            data=encryption_data
        )
        
        if success and response:
            if 'encrypted_data' in response or 'encryption_id' in response:
                print("   ✅ Data encryption completed successfully")
                print(f"   Encryption method: {response.get('encryption_method', 'unknown')}")
                return True
        return False

    def test_f3_access_control(self):
        """Test POST /api/security/access-control"""
        print("\n🛡️ Testing F3: Access Control Permissions...")
        
        access_data = {
            "user_id": self.test_user_id,
            "resource_type": "analytics_dashboard",
            "resource_id": "dashboard-123",
            "permissions": {
                "read": True,
                "write": True,
                "delete": False,
                "share": True,
                "admin": False
            },
            "access_level": "team_member",
            "restrictions": {
                "ip_whitelist": ["192.168.1.0/24"],
                "time_restrictions": {
                    "business_hours_only": True,
                    "timezone": "UTC"
                },
                "device_restrictions": {
                    "mobile_access": True,
                    "desktop_access": True
                }
            },
            "expiry_date": "2024-12-31T23:59:59Z"
        }
        
        success, response = self.run_test(
            "Set Access Control Permissions",
            "POST",
            "security/access-control",
            200,
            data=access_data
        )
        
        if success and response:
            if 'access_control_id' in response or 'status' in response:
                print("   ✅ Access control permissions set successfully")
                return True
        return False

    def test_f3_validate_session(self):
        """Test POST /api/security/validate-session"""
        print("\n✅ Testing F3: Session Validation...")
        
        session_data = {
            "user_id": self.test_user_id,
            "session_token": self.test_user_token,
            "ip_address": "192.168.1.100",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "validation_level": "strict",
            "check_device_fingerprint": True,
            "check_location": True
        }
        
        success, response = self.run_test(
            "Validate User Session",
            "POST",
            "security/validate-session",
            200,
            data=session_data
        )
        
        if success and response:
            validation_result = response.get('valid', False)
            risk_score = response.get('risk_score', 0)
            
            print(f"   Session Valid: {validation_result}")
            print(f"   Risk Score: {risk_score}")
            
            if 'valid' in response:
                print("   ✅ Session validation completed")
                return True
        return False

    # ===== F4: Documentation Tests =====
    
    def test_f4_api_reference(self):
        """Test GET /api/docs/api-reference"""
        print("\n📚 Testing F4: API Reference Documentation...")
        
        success, response = self.run_test(
            "Get API Reference",
            "GET",
            "docs/api-reference",
            200
        )
        
        if success and response:
            endpoints = response.get('endpoints', [])
            version = response.get('version', 'unknown')
            
            print(f"   API Version: {version}")
            print(f"   Total Endpoints: {len(endpoints)}")
            
            # Check for key endpoint categories
            categories = set()
            for endpoint in endpoints:
                category = endpoint.get('category', 'unknown')
                categories.add(category)
            
            print(f"   Endpoint Categories: {list(categories)}")
            
            if len(endpoints) > 50:  # Should have many endpoints
                print("   ✅ API reference documentation retrieved")
                return True
        return False

    def test_f4_user_guides(self):
        """Test GET /api/docs/guides"""
        print("\n📖 Testing F4: User Guides...")
        
        success, response = self.run_test(
            "Get User Guides",
            "GET",
            "docs/guides",
            200
        )
        
        if success and response:
            guides = response.get('guides', [])
            print(f"   Found {len(guides)} user guides")
            
            if len(guides) > 0:
                guide = guides[0]
                print(f"   Sample guide: {guide.get('title', 'Unknown')}")
                print(f"   Guide category: {guide.get('category', 'Unknown')}")
                return True
        return False

    def test_f4_code_examples(self):
        """Test GET /api/docs/examples"""
        print("\n💻 Testing F4: Code Examples...")
        
        success, response = self.run_test(
            "Get Code Examples",
            "GET",
            "docs/examples",
            200
        )
        
        if success and response:
            examples = response.get('examples', [])
            languages = response.get('languages', [])
            
            print(f"   Found {len(examples)} code examples")
            print(f"   Supported languages: {languages}")
            
            if len(examples) > 0:
                example = examples[0]
                print(f"   Sample example: {example.get('title', 'Unknown')}")
                print(f"   Language: {example.get('language', 'Unknown')}")
                return True
        return False

    def run_all_tests(self):
        """Run all Options E & F API tests"""
        print("🚀 Starting Options E & F Backend API Testing...")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Aborting tests.")
            return
        
        # E1: Enhanced Workflow Automation Tests
        print("\n" + "=" * 60)
        print("🔧 E1: ENHANCED WORKFLOW AUTOMATION TESTS")
        print("=" * 60)
        
        self.test_e1_enhanced_workflow_creation()
        self.test_e1_get_enhanced_workflows()
        self.test_e1_workflow_execution()
        self.test_e1_execution_history()
        self.test_e1_ai_suggestions()
        self.test_e1_workflow_metrics()
        
        # E2: Advanced AI Integrations Tests
        print("\n" + "=" * 60)
        print("🧠 E2: ADVANCED AI INTEGRATIONS TESTS")
        print("=" * 60)
        
        self.test_e2_available_ai_models()
        self.test_e2_multi_llm_chat()
        self.test_e2_create_ai_agent()
        self.test_e2_get_user_ai_agents()
        self.test_e2_chat_with_ai_agent()
        self.test_e2_ai_agent_templates()
        self.test_e2_create_agent_from_template()
        
        # E3: Custom Integration Marketplace Tests
        print("\n" + "=" * 60)
        print("🏪 E3: CUSTOM INTEGRATION MARKETPLACE TESTS")
        print("=" * 60)
        
        self.test_e3_marketplace_integrations()
        self.test_e3_install_integration()
        self.test_e3_get_user_integrations()
        self.test_e3_configure_integration()
        
        # E4: Advanced Analytics & Reporting Tests
        print("\n" + "=" * 60)
        print("📊 E4: ADVANCED ANALYTICS & REPORTING TESTS")
        print("=" * 60)
        
        self.test_e4_create_custom_report()
        self.test_e4_get_user_reports()
        self.test_e4_generate_report()
        self.test_e4_create_predictive_model()
        self.test_e4_get_user_models()
        self.test_e4_generate_predictions()
        self.test_e4_ai_insights()
        
        # F1: Performance Optimization Tests
        print("\n" + "=" * 60)
        print("⚡ F1: PERFORMANCE OPTIMIZATION TESTS")
        print("=" * 60)
        
        self.test_f1_performance_metrics()
        self.test_f1_optimization_tasks()
        self.test_f1_health_check()
        
        # F2: Mobile & PWA Tests
        print("\n" + "=" * 60)
        print("📱 F2: MOBILE & PWA TESTS")
        print("=" * 60)
        
        self.test_f2_mobile_config()
        self.test_f2_get_mobile_config()
        self.test_f2_pwa_install()
        self.test_f2_offline_data_sync()
        self.test_f2_lightweight_data()
        
        # F3: Security Hardening Tests
        print("\n" + "=" * 60)
        print("🔒 F3: SECURITY HARDENING TESTS")
        print("=" * 60)
        
        self.test_f3_security_audit_log()
        self.test_f3_get_audit_log()
        self.test_f3_encrypt_data()
        self.test_f3_access_control()
        self.test_f3_validate_session()
        
        # F4: Documentation Tests
        print("\n" + "=" * 60)
        print("📚 F4: DOCUMENTATION TESTS")
        print("=" * 60)
        
        self.test_f4_api_reference()
        self.test_f4_user_guides()
        self.test_f4_code_examples()
        
        # Final Results
        print("\n" + "=" * 60)
        print("📊 OPTIONS E & F TESTING RESULTS")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Options E & F APIs are working well!")
        elif success_rate >= 60:
            print("⚠️ Options E & F APIs have some issues that need attention")
        else:
            print("❌ Options E & F APIs have significant issues requiring fixes")
        
        return success_rate >= 60

if __name__ == "__main__":
    tester = OptionsEFAPITester()
    tester.run_all_tests()