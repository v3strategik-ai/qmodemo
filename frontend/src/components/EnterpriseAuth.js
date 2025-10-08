import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { 
  Shield, 
  Key, 
  Lock, 
  Users, 
  QrCode, 
  AlertCircle, 
  CheckCircle,
  Settings,
  Smartphone,
  Database,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import axios from 'axios';

const EnterpriseAuth = () => {
  const [activeTab, setActiveTab] = useState('sso');
  const [ssoProviders, setSsoProviders] = useState([]);
  const [mfaDevices, setMfaDevices] = useState([]);
  const [enterpriseRoles, setEnterpriseRoles] = useState([]);
  const [qrCode, setQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser] = useState({ id: 'user-123', email: 'admin@modq.com' });

  // Form states
  const [ssoForm, setSsoForm] = useState({
    name: '',
    entity_id: '',
    sso_url: '',
    metadata_url: '',
    certificate: ''
  });

  const [mfaForm, setMfaForm] = useState({
    device_name: 'Google Authenticator',
    token: ''
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [],
    department: ''
  });

  const [complianceData, setComplianceData] = useState({
    user_id: currentUser.id,
    requester_email: currentUser.email
  });

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadSsoProviders(),
        loadMfaDevices(),
        loadEnterpriseRoles()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadSsoProviders = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/enterprise/sso/providers`);
      setSsoProviders(response.data.providers || []);
    } catch (error) {
      console.error('Error loading SSO providers:', error);
    }
  };

  const loadMfaDevices = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/enterprise/mfa/devices/${currentUser.id}`);
      setMfaDevices(response.data.devices || []);
    } catch (error) {
      console.error('Error loading MFA devices:', error);
    }
  };

  const loadEnterpriseRoles = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/enterprise/roles`);
      setEnterpriseRoles(response.data.roles || []);
    } catch (error) {
      console.error('Error loading enterprise roles:', error);
    }
  };

  const handleSsoSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${backendUrl}/api/enterprise/sso/configure`, ssoForm);
      
      if (response.data.message) {
        alert('SSO Provider configured successfully!');
        setSsoForm({
          name: '',
          entity_id: '',
          sso_url: '',
          metadata_url: '',
          certificate: ''
        });
        await loadSsoProviders();
      }
    } catch (error) {
      console.error('SSO setup error:', error);
      alert('Error setting up SSO provider: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${backendUrl}/api/enterprise/mfa/setup`, {
        user_id: currentUser.id,
        device_name: mfaForm.device_name
      });
      
      if (response.data.qr_code) {
        setQrCode(response.data.qr_code);
        setMfaSecret(response.data.manual_entry_key);
        setBackupCodes(response.data.backup_codes);
      }
    } catch (error) {
      console.error('MFA setup error:', error);
      alert('Error setting up MFA: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Find the device ID from the current setup
      const deviceId = mfaDevices[0]?.id || 'temp-device-id';
      
      const response = await axios.post(`${backendUrl}/api/enterprise/mfa/verify`, {
        device_id: deviceId,
        token: mfaForm.token
      });
      
      if (response.data.verified) {
        alert('MFA device verified successfully!');
        setQrCode('');
        setMfaForm({ ...mfaForm, token: '' });
        await loadMfaDevices();
      } else {
        alert('Invalid MFA token. Please try again.');
      }
    } catch (error) {
      console.error('MFA verification error:', error);
      alert('Error verifying MFA: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const roleData = {
        ...roleForm,
        permissions: roleForm.permissions.split(',').map(p => p.trim()).filter(p => p)
      };
      
      const response = await axios.post(`${backendUrl}/api/enterprise/roles/create`, roleData);
      
      if (response.data.message) {
        alert('Enterprise role created successfully!');
        setRoleForm({
          name: '',
          description: '',
          permissions: [],
          department: ''
        });
        await loadEnterpriseRoles();
      }
    } catch (error) {
      console.error('Role creation error:', error);
      alert('Error creating role: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGdprDataExport = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post(`${backendUrl}/api/compliance/gdpr/data-export`, complianceData);
      
      // Create and download the data export
      const dataStr = JSON.stringify(response.data.export_data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `gdpr-export-${currentUser.id}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      alert('GDPR data export completed and downloaded!');
    } catch (error) {
      console.error('GDPR export error:', error);
      alert('Error exporting data: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDataDeletion = async () => {
    if (!window.confirm('WARNING: This will permanently delete all your data. This action cannot be undone. Are you sure?')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${backendUrl}/api/compliance/gdpr/data-deletion`, {
        ...complianceData,
        deletion_scope: 'full'
      });
      
      alert('GDPR data deletion completed. All personal data has been permanently removed.');
      console.log('Deletion results:', response.data);
    } catch (error) {
      console.error('GDPR deletion error:', error);
      alert('Error deleting data: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-400" />
          Enterprise Authentication & Security
        </h2>
        <p className="text-gray-400 mt-2">
          Configure SAML SSO, Multi-Factor Authentication, and Enterprise Security Features
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border border-gray-600">
          <TabsTrigger value="sso" className="data-[state=active]:bg-blue-600">
            <Key className="h-4 w-4 mr-2" />
            SAML SSO
          </TabsTrigger>
          <TabsTrigger value="mfa" className="data-[state=active]:bg-blue-600">
            <Smartphone className="h-4 w-4 mr-2" />
            MFA Setup
          </TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-blue-600">
            <Users className="h-4 w-4 mr-2" />
            RBAC
          </TabsTrigger>
          <TabsTrigger value="compliance" className="data-[state=active]:bg-blue-600">
            <FileText className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* SAML SSO Tab */}
        <TabsContent value="sso" className="space-y-6">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <Key className="h-5 w-5" />
                SAML 2.0 Single Sign-On Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSsoSetup} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Provider Name (e.g., Okta, Azure AD)"
                    value={ssoForm.name}
                    onChange={(e) => setSsoForm({...ssoForm, name: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <Input
                    placeholder="Entity ID"
                    value={ssoForm.entity_id}
                    onChange={(e) => setSsoForm({...ssoForm, entity_id: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <Input
                    placeholder="SSO URL"
                    value={ssoForm.sso_url}
                    onChange={(e) => setSsoForm({...ssoForm, sso_url: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <Input
                    placeholder="Metadata URL (optional)"
                    value={ssoForm.metadata_url}
                    onChange={(e) => setSsoForm({...ssoForm, metadata_url: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <textarea
                  placeholder="X.509 Certificate (optional)"
                  value={ssoForm.certificate}
                  onChange={(e) => setSsoForm({...ssoForm, certificate: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 h-32 resize-none"
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? 'Configuring...' : 'Configure SSO Provider'}
                </Button>
              </form>
              
              {/* Configured SSO Providers */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Configured SSO Providers</h3>
                <div className="space-y-2">
                  {ssoProviders.length === 0 ? (
                    <p className="text-gray-400">No SSO providers configured yet.</p>
                  ) : (
                    ssoProviders.map((provider) => (
                      <div key={provider.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{provider.name}</h4>
                          <p className="text-sm text-gray-400">{provider.entity_id}</p>
                        </div>
                        <Badge variant={provider.is_active ? "success" : "secondary"}>
                          {provider.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MFA Setup Tab */}
        <TabsContent value="mfa" className="space-y-6">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-400">
                <Smartphone className="h-5 w-5" />
                Google Authenticator MFA Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* MFA Setup Form */}
              <form onSubmit={handleMfaSetup} className="space-y-4">
                <Input
                  placeholder="Device Name"
                  value={mfaForm.device_name}
                  onChange={(e) => setMfaForm({...mfaForm, device_name: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Setting up...' : 'Setup MFA Device'}
                </Button>
              </form>

              {/* QR Code Display */}
              {qrCode && (
                <div className="bg-gray-700 p-6 rounded-lg text-center space-y-4">
                  <h3 className="text-lg font-semibold text-white">Scan QR Code with Google Authenticator</h3>
                  <div className="flex justify-center">
                    <img 
                      src={`data:image/png;base64,${qrCode}`} 
                      alt="MFA QR Code"
                      className="bg-white p-4 rounded-lg"
                    />
                  </div>
                  <div className="text-sm text-gray-300">
                    <p>Manual entry key: <code className="bg-gray-600 px-2 py-1 rounded">{mfaSecret}</code></p>
                  </div>
                  
                  {/* Verification Form */}
                  <form onSubmit={handleMfaVerify} className="space-y-4">
                    <Input
                      placeholder="Enter 6-digit code from authenticator app"
                      value={mfaForm.token}
                      onChange={(e) => setMfaForm({...mfaForm, token: e.target.value})}
                      className="bg-gray-600 border-gray-500 text-white text-center text-lg"
                      maxLength={6}
                      required
                    />
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? 'Verifying...' : 'Verify & Complete Setup'}
                    </Button>
                  </form>

                  {/* Backup Codes */}
                  {backupCodes.length > 0 && (
                    <div className="mt-4 bg-gray-600 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-400 mb-2">Backup Recovery Codes</h4>
                      <p className="text-sm text-gray-300 mb-2">Save these codes in a secure location. Each code can only be used once.</p>
                      <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="bg-gray-700 p-2 rounded text-center">{code}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Configured MFA Devices */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">MFA Devices</h3>
                <div className="space-y-2">
                  {mfaDevices.length === 0 ? (
                    <p className="text-gray-400">No MFA devices configured yet.</p>
                  ) : (
                    mfaDevices.map((device) => (
                      <div key={device.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <QrCode className="h-5 w-5 text-green-400" />
                          <div>
                            <h4 className="font-medium text-white">{device.device_name}</h4>
                            <p className="text-sm text-gray-400">
                              Type: {device.device_type} • Last used: {device.last_used || 'Never'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={device.is_verified ? "success" : "secondary"}>
                          {device.is_verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RBAC Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Users className="h-5 w-5" />
                Role-Based Access Control (RBAC)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleRoleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Role Name"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  <Input
                    placeholder="Department (optional)"
                    value={roleForm.department}
                    onChange={(e) => setRoleForm({...roleForm, department: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <Input
                  placeholder="Permissions (comma-separated)"
                  value={roleForm.permissions}
                  onChange={(e) => setRoleForm({...roleForm, permissions: e.target.value})}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
                <textarea
                  placeholder="Role Description"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2 h-24 resize-none"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? 'Creating...' : 'Create Enterprise Role'}
                </Button>
              </form>
              
              {/* Enterprise Roles List */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Enterprise Roles</h3>
                <div className="space-y-2">
                  {enterpriseRoles.length === 0 ? (
                    <p className="text-gray-400">No enterprise roles configured yet.</p>
                  ) : (
                    enterpriseRoles.map((role) => (
                      <div key={role.id} className="bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-white">{role.name}</h4>
                            <p className="text-sm text-gray-400">{role.description}</p>
                            {role.department && (
                              <Badge variant="secondary" className="mt-1">
                                {role.department}
                              </Badge>
                            )}
                          </div>
                          <Badge variant={role.is_system_role ? "default" : "success"}>
                            {role.is_system_role ? 'System' : 'Custom'}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-400">
                            Permissions ({role.permissions?.length || 0}): {role.permissions?.join(', ') || 'None'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-400">
                <FileText className="h-5 w-5" />
                Data Privacy & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* GDPR Controls */}
              <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  GDPR Compliance Tools
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleGdprDataExport}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {loading ? 'Exporting...' : 'Export My Data (GDPR Art. 15)'}
                  </Button>
                  
                  <Button
                    onClick={handleDataDeletion}
                    disabled={loading}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    {loading ? 'Deleting...' : 'Delete My Data (GDPR Art. 17)'}
                  </Button>
                </div>
                
                <div className="text-sm text-gray-300 bg-gray-600 p-3 rounded">
                  <p className="font-medium mb-2">GDPR Rights Available:</p>
                  <ul className="space-y-1">
                    <li>• <strong>Article 15</strong>: Right of Access - Export all your personal data</li>
                    <li>• <strong>Article 17</strong>: Right to Erasure - Permanently delete your account and data</li>
                    <li>• <strong>Article 20</strong>: Data Portability - Machine-readable data export</li>
                  </ul>
                </div>
              </div>

              {/* Compliance Frameworks */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Compliance Frameworks</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Badge className="bg-green-600 hover:bg-green-700 justify-center py-2">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    GDPR
                  </Badge>
                  <Badge className="bg-blue-600 hover:bg-blue-700 justify-center py-2">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    SOX
                  </Badge>
                  <Badge className="bg-purple-600 hover:bg-purple-700 justify-center py-2">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    ISO 27001
                  </Badge>
                  <Badge className="bg-orange-600 hover:bg-orange-700 justify-center py-2">
                    <Eye className="h-4 w-4 mr-1" />
                    Audit Ready
                  </Badge>
                </div>
              </div>

              {/* Data Classification Status */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Data Security Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Encryption at Rest</span>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Encryption in Transit</span>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">PII Detection</span>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Access Logging</span>
                    <Badge variant="success">Enabled</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnterpriseAuth;