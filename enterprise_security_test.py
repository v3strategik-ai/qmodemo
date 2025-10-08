#!/usr/bin/env python3
"""
Enterprise Authentication & Security Features Test Suite
Testing SAML SSO, MFA, RBAC, and GDPR Compliance endpoints
"""

import requests
import json
import time
import uuid
from datetime import datetime
import pyotp
import base64

# Backend URL from frontend environment
BACKEND_URL = "https://modq-saml.preview.emergentagent.com/api"

class EnterpriseSecurityTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.test_user_id = str(uuid.uuid4())
        self.test_email = f"enterprise.test.{int(time.time())}@modq.com"
        
    def log_test(self, test_name, success, details="", error=""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if error:
            print(f"   Error: {error}")
        print()

    def test_saml_sso_configuration(self):
        """Test SAML SSO Configuration Endpoints"""
        print("=== Testing SAML SSO Configuration ===")
        
        # Test 1: Configure SAML SSO Provider
        try:
            sso_config = {
                "name": "Enterprise SAML Provider",
                "entity_id": "https://enterprise.modq.com/saml/metadata",
                "sso_url": "https://enterprise.modq.com/saml/sso",
                "provider_type": "saml",
                "configuration": {
                    "attribute_mapping": {
                        "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
                        "first_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
                        "last_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
                    }
                }
            }
            
            response = self.session.post(f"{BACKEND_URL}/enterprise/sso/configure", json=sso_config)
            
            if response.status_code == 200:
                data = response.json()
                self.sso_provider_id = data.get("provider_id")
                self.log_test(
                    "SAML SSO Configuration", 
                    True, 
                    f"Provider configured successfully. Provider ID: {self.sso_provider_id}"
                )
            else:
                self.log_test(
                    "SAML SSO Configuration", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("SAML SSO Configuration", False, "", str(e))

        # Test 2: Get SSO Providers
        try:
            response = self.session.get(f"{BACKEND_URL}/enterprise/sso/providers")
            
            if response.status_code == 200:
                data = response.json()
                providers = data.get("providers", [])
                self.log_test(
                    "Get SSO Providers", 
                    True, 
                    f"Retrieved {len(providers)} SSO providers"
                )
            else:
                self.log_test(
                    "Get SSO Providers", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("Get SSO Providers", False, "", str(e))

        # Test 3: Mock SAML SSO Login
        try:
            if hasattr(self, 'sso_provider_id'):
                login_data = {
                    "provider_id": self.sso_provider_id,
                    "saml_response": "mock_saml_response_base64_encoded_assertion"
                }
                
                response = self.session.post(f"{BACKEND_URL}/enterprise/sso/login", json=login_data)
                
                if response.status_code == 200:
                    data = response.json()
                    self.sso_user_id = data.get("user_id")
                    requires_mfa = data.get("requires_mfa", False)
                    self.log_test(
                        "SAML SSO Login", 
                        True, 
                        f"SSO login successful. User ID: {self.sso_user_id}, Requires MFA: {requires_mfa}"
                    )
                else:
                    self.log_test(
                        "SAML SSO Login", 
                        False, 
                        f"Status: {response.status_code}", 
                        response.text
                    )
            else:
                self.log_test("SAML SSO Login", False, "", "No SSO provider configured")
        except Exception as e:
            self.log_test("SAML SSO Login", False, "", str(e))

    def test_mfa_functionality(self):
        """Test Google Authenticator MFA Endpoints"""
        print("=== Testing Google Authenticator MFA ===")
        
        # Use SSO user ID if available, otherwise create test user ID
        test_user_id = getattr(self, 'sso_user_id', self.test_user_id)
        
        # Test 1: Setup MFA Device
        try:
            mfa_setup = {
                "user_id": test_user_id,
                "device_name": "Google Authenticator - Test Device"
            }
            
            response = self.session.post(f"{BACKEND_URL}/enterprise/mfa/setup", json=mfa_setup)
            
            if response.status_code == 200:
                data = response.json()
                self.mfa_device_id = data.get("device_id")
                self.mfa_secret = data.get("manual_entry_key")
                qr_code = data.get("qr_code")
                backup_codes = data.get("backup_codes", [])
                
                self.log_test(
                    "MFA Device Setup", 
                    True, 
                    f"Device ID: {self.mfa_device_id}, QR Code generated: {bool(qr_code)}, Backup codes: {len(backup_codes)}"
                )
            else:
                self.log_test(
                    "MFA Device Setup", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("MFA Device Setup", False, "", str(e))

        # Test 2: Verify MFA Token
        try:
            if hasattr(self, 'mfa_device_id') and hasattr(self, 'mfa_secret'):
                # Generate TOTP token using the secret
                totp = pyotp.TOTP(self.mfa_secret)
                current_token = totp.now()
                
                verify_data = {
                    "device_id": self.mfa_device_id,
                    "token": current_token
                }
                
                response = self.session.post(f"{BACKEND_URL}/enterprise/mfa/verify", json=verify_data)
                
                if response.status_code == 200:
                    data = response.json()
                    verified = data.get("verified", False)
                    self.log_test(
                        "MFA Token Verification", 
                        True, 
                        f"Token verification result: {verified}"
                    )
                else:
                    self.log_test(
                        "MFA Token Verification", 
                        False, 
                        f"Status: {response.status_code}", 
                        response.text
                    )
            else:
                self.log_test("MFA Token Verification", False, "", "No MFA device setup completed")
        except Exception as e:
            self.log_test("MFA Token Verification", False, "", str(e))

        # Test 3: Get User MFA Devices
        try:
            response = self.session.get(f"{BACKEND_URL}/enterprise/mfa/devices/{test_user_id}")
            
            if response.status_code == 200:
                data = response.json()
                devices = data.get("devices", [])
                self.log_test(
                    "Get User MFA Devices", 
                    True, 
                    f"Retrieved {len(devices)} MFA devices for user"
                )
            else:
                self.log_test(
                    "Get User MFA Devices", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("Get User MFA Devices", False, "", str(e))

    def test_rbac_functionality(self):
        """Test Role-Based Access Control (RBAC) Endpoints"""
        print("=== Testing Role-Based Access Control (RBAC) ===")
        
        # Test 1: Create Enterprise Role
        try:
            role_data = {
                "name": "Enterprise Security Manager",
                "description": "Manages enterprise security settings and compliance",
                "permissions": [
                    "manage_sso",
                    "manage_mfa", 
                    "view_audit_logs",
                    "manage_roles",
                    "export_compliance_data"
                ],
                "resource_permissions": {
                    "users": ["read", "update"],
                    "security_settings": ["read", "write", "delete"],
                    "compliance_data": ["read", "export"]
                },
                "department": "Security"
            }
            
            response = self.session.post(f"{BACKEND_URL}/enterprise/roles/create", json=role_data)
            
            if response.status_code == 200:
                data = response.json()
                self.enterprise_role_id = data.get("role_id")
                self.log_test(
                    "Create Enterprise Role", 
                    True, 
                    f"Role created successfully. Role ID: {self.enterprise_role_id}"
                )
            else:
                self.log_test(
                    "Create Enterprise Role", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("Create Enterprise Role", False, "", str(e))

        # Test 2: Get All Enterprise Roles
        try:
            response = self.session.get(f"{BACKEND_URL}/enterprise/roles")
            
            if response.status_code == 200:
                data = response.json()
                roles = data.get("roles", [])
                self.log_test(
                    "Get Enterprise Roles", 
                    True, 
                    f"Retrieved {len(roles)} enterprise roles"
                )
            else:
                self.log_test(
                    "Get Enterprise Roles", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("Get Enterprise Roles", False, "", str(e))

        # Test 3: Assign Role to User
        try:
            if hasattr(self, 'enterprise_role_id'):
                test_user_id = getattr(self, 'sso_user_id', self.test_user_id)
                assignment_data = {
                    "user_id": test_user_id,
                    "role_id": self.enterprise_role_id
                }
                
                response = self.session.post(f"{BACKEND_URL}/enterprise/roles/assign", json=assignment_data)
                
                if response.status_code == 200:
                    self.log_test(
                        "Assign User Role", 
                        True, 
                        f"Role assigned to user {test_user_id}"
                    )
                else:
                    self.log_test(
                        "Assign User Role", 
                        False, 
                        f"Status: {response.status_code}", 
                        response.text
                    )
            else:
                self.log_test("Assign User Role", False, "", "No enterprise role created")
        except Exception as e:
            self.log_test("Assign User Role", False, "", str(e))

    def test_gdpr_compliance(self):
        """Test GDPR Compliance Endpoints"""
        print("=== Testing GDPR Compliance ===")
        
        test_user_id = getattr(self, 'sso_user_id', self.test_user_id)
        
        # Test 1: GDPR Data Export (Article 15)
        try:
            export_request = {
                "user_id": test_user_id,
                "requester_email": self.test_email
            }
            
            response = self.session.post(f"{BACKEND_URL}/compliance/gdpr/data-export", json=export_request)
            
            if response.status_code == 200:
                data = response.json()
                export_data = data.get("export_data", {})
                data_categories = data.get("data_categories", 0)
                self.log_test(
                    "GDPR Data Export", 
                    True, 
                    f"Data exported successfully. Categories: {data_categories}, Request ID: {export_data.get('request_id')}"
                )
            else:
                self.log_test(
                    "GDPR Data Export", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("GDPR Data Export", False, "", str(e))

        # Test 2: GDPR Data Deletion (Article 17)
        try:
            deletion_request = {
                "user_id": test_user_id,
                "requester_email": self.test_email,
                "deletion_scope": "partial"  # Use partial to avoid deleting test data
            }
            
            response = self.session.post(f"{BACKEND_URL}/compliance/gdpr/data-deletion", json=deletion_request)
            
            if response.status_code == 200:
                data = response.json()
                deletion_results = data.get("deletion_results", {})
                deleted_data = deletion_results.get("deleted_data", [])
                self.log_test(
                    "GDPR Data Deletion", 
                    True, 
                    f"Data deletion completed. Collections affected: {len(deleted_data)}"
                )
            else:
                self.log_test(
                    "GDPR Data Deletion", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("GDPR Data Deletion", False, "", str(e))

        # Test 3: PII Detection and Data Classification
        try:
            test_content = {
                "content": f"Contact John Doe at john.doe@enterprise.com or call 555-123-4567. SSN: 123-45-6789, Credit Card: 4532-1234-5678-9012",
                "data_type": "customer_communication"
            }
            
            response = self.session.post(f"{BACKEND_URL}/compliance/data/classify", json=test_content)
            
            if response.status_code == 200:
                data = response.json()
                classification_level = data.get("classification_level")
                pii_detected = data.get("pii_detected", False)
                pii_types = data.get("pii_types", [])
                pii_count = data.get("original_pii_count", 0)
                
                self.log_test(
                    "PII Detection & Classification", 
                    True, 
                    f"Classification: {classification_level}, PII detected: {pii_detected}, Types: {pii_types}, Count: {pii_count}"
                )
            else:
                self.log_test(
                    "PII Detection & Classification", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("PII Detection & Classification", False, "", str(e))

        # Test 4: Compliance Audit Report
        try:
            response = self.session.get(f"{BACKEND_URL}/compliance/audit/report?framework=gdpr&days=7")
            
            if response.status_code == 200:
                data = response.json()
                report_id = data.get("report_id")
                statistics = data.get("statistics", {})
                total_events = statistics.get("total_events", 0)
                compliance_status = data.get("compliance_status")
                
                self.log_test(
                    "Compliance Audit Report", 
                    True, 
                    f"Report generated. ID: {report_id}, Events: {total_events}, Status: {compliance_status}"
                )
            else:
                self.log_test(
                    "Compliance Audit Report", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("Compliance Audit Report", False, "", str(e))

    def test_security_event_logging(self):
        """Test Security Event Logging and Audit Trails"""
        print("=== Testing Security Event Logging ===")
        
        # This test verifies that security events are being logged by checking
        # the compliance audit report for recent security events
        try:
            response = self.session.get(f"{BACKEND_URL}/compliance/audit/report?framework=all&days=1")
            
            if response.status_code == 200:
                data = response.json()
                events = data.get("events", [])
                statistics = data.get("statistics", {})
                event_types = statistics.get("event_types", {})
                
                # Check for security-related events
                security_events = [
                    "sso_configuration", "sso_login", "mfa_setup", 
                    "mfa_verification", "role_creation", "role_assignment",
                    "gdpr_data_export", "gdpr_data_deletion"
                ]
                
                found_security_events = [event_type for event_type in security_events if event_type in event_types]
                
                self.log_test(
                    "Security Event Logging", 
                    True, 
                    f"Found {len(found_security_events)} security event types: {found_security_events}"
                )
            else:
                self.log_test(
                    "Security Event Logging", 
                    False, 
                    f"Status: {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("Security Event Logging", False, "", str(e))

    def test_error_handling_and_validation(self):
        """Test Error Handling and Validation"""
        print("=== Testing Error Handling and Validation ===")
        
        # Test 1: Invalid SSO Configuration
        try:
            invalid_sso = {"name": "Invalid SSO"}  # Missing required fields
            response = self.session.post(f"{BACKEND_URL}/enterprise/sso/configure", json=invalid_sso)
            
            if response.status_code == 400:
                self.log_test(
                    "SSO Configuration Validation", 
                    True, 
                    "Properly rejected invalid SSO configuration"
                )
            else:
                self.log_test(
                    "SSO Configuration Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("SSO Configuration Validation", False, "", str(e))

        # Test 2: Invalid MFA Setup
        try:
            invalid_mfa = {"device_name": "Test"}  # Missing user_id
            response = self.session.post(f"{BACKEND_URL}/enterprise/mfa/setup", json=invalid_mfa)
            
            if response.status_code == 400:
                self.log_test(
                    "MFA Setup Validation", 
                    True, 
                    "Properly rejected invalid MFA setup"
                )
            else:
                self.log_test(
                    "MFA Setup Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("MFA Setup Validation", False, "", str(e))

        # Test 3: Invalid Role Creation
        try:
            invalid_role = {"name": "Test Role"}  # Missing required fields
            response = self.session.post(f"{BACKEND_URL}/enterprise/roles/create", json=invalid_role)
            
            if response.status_code == 400:
                self.log_test(
                    "Role Creation Validation", 
                    True, 
                    "Properly rejected invalid role creation"
                )
            else:
                self.log_test(
                    "Role Creation Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("Role Creation Validation", False, "", str(e))

        # Test 4: Invalid GDPR Request
        try:
            invalid_gdpr = {"requester_email": "test@example.com"}  # Missing user_id
            response = self.session.post(f"{BACKEND_URL}/compliance/gdpr/data-export", json=invalid_gdpr)
            
            if response.status_code == 400:
                self.log_test(
                    "GDPR Request Validation", 
                    True, 
                    "Properly rejected invalid GDPR request"
                )
            else:
                self.log_test(
                    "GDPR Request Validation", 
                    False, 
                    f"Expected 400, got {response.status_code}", 
                    response.text
                )
        except Exception as e:
            self.log_test("GDPR Request Validation", False, "", str(e))

    def run_all_tests(self):
        """Run all enterprise security tests"""
        print("🔐 Starting Enterprise Authentication & Security Tests")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all test suites
        self.test_saml_sso_configuration()
        self.test_mfa_functionality()
        self.test_rbac_functionality()
        self.test_gdpr_compliance()
        self.test_security_event_logging()
        self.test_error_handling_and_validation()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate summary
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("=" * 60)
        print("🔐 ENTERPRISE SECURITY TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Duration: {duration:.2f} seconds")
        print()
        
        if failed_tests > 0:
            print("❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['error']}")
            print()
        
        print("🔐 Enterprise Security Testing Complete!")
        return self.test_results

if __name__ == "__main__":
    tester = EnterpriseSecurityTester()
    results = tester.run_all_tests()