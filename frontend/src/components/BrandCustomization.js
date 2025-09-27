import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { 
  Palette,
  Upload,
  Image,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Download,
  Copy,
  Save,
  Undo,
  Paintbrush,
  Type,
  Globe,
  Shield,
  Zap,
  Sparkles,
  Crown,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BrandCustomization = ({ currentUser }) => {
  const [branding, setBranding] = useState(null);
  const [themePresets, setThemePresets] = useState([]);
  const [customDomains, setCustomDomains] = useState([]);
  const [whiteLabelConfig, setWhiteLabelConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Form states
  const [organizationName, setOrganizationName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [borderColor, setBorderColor] = useState('#374151');
  const [themeMode, setThemeMode] = useState('dark');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [tagline, setTagline] = useState('');
  const [footerText, setFooterText] = useState('');
  const [customCSS, setCustomCSS] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  
  // Logo upload
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef(null);

  const colorInputs = [
    { key: 'primaryColor', label: 'Primary Color', value: primaryColor, setter: setPrimaryColor, description: 'Main brand color used for buttons and highlights' },
    { key: 'secondaryColor', label: 'Secondary Color', value: secondaryColor, setter: setSecondaryColor, description: 'Supporting brand color for accents' },
    { key: 'accentColor', label: 'Accent Color', value: accentColor, setter: setAccentColor, description: 'Success states and positive actions' },
    { key: 'backgroundColor', label: 'Background Color', value: backgroundColor, setter: setBackgroundColor, description: 'Main background color' },
    { key: 'textColor', label: 'Text Color', value: textColor, setter: setTextColor, description: 'Primary text color' },
    { key: 'borderColor', label: 'Border Color', value: borderColor, setter: setBorderColor, description: 'Border and divider color' }
  ];

  useEffect(() => {
    if (currentUser) {
      loadBrandingData();
      loadThemePresets();
      loadCustomDomains();
      loadWhiteLabelConfig();
    }
  }, [currentUser]);

  useEffect(() => {
    // Apply current branding to preview
    applyBrandingPreview();
  }, [primaryColor, secondaryColor, accentColor, backgroundColor, textColor, borderColor, themeMode]);

  const loadBrandingData = async () => {
    try {
      const response = await axios.get(`${API}/branding/user/${currentUser.id}`);
      const brandingData = response.data;
      
      setBranding(brandingData);
      
      // Populate form fields
      setOrganizationName(brandingData.organization_name || '');
      setPrimaryColor(brandingData.primary_color || '#3b82f6');
      setSecondaryColor(brandingData.secondary_color || '#8b5cf6');
      setAccentColor(brandingData.accent_color || '#10b981');
      setBackgroundColor(brandingData.background_color || '#000000');
      setTextColor(brandingData.text_color || '#ffffff');
      setBorderColor(brandingData.border_color || '#374151');
      setThemeMode(brandingData.theme_mode || 'dark');
      setWelcomeMessage(brandingData.welcome_message || '');
      setTagline(brandingData.tagline || '');
      setFooterText(brandingData.footer_text || '');
      setCustomCSS(brandingData.custom_css || '');
      setLogoPreview(brandingData.logo_url);
      
    } catch (error) {
      console.error('Failed to load branding data:', error);
      // Use defaults for new users
    }
  };

  const loadThemePresets = async () => {
    try {
      const response = await axios.get(`${API}/themes/presets`);
      setThemePresets(response.data.presets || []);
    } catch (error) {
      console.error('Failed to load theme presets:', error);
    }
  };

  const loadCustomDomains = async () => {
    try {
      const response = await axios.get(`${API}/domains/user/${currentUser.id}`);
      setCustomDomains(response.data || []);
    } catch (error) {
      console.error('Failed to load custom domains:', error);
      setCustomDomains([]);
    }
  };

  const loadWhiteLabelConfig = async () => {
    try {
      const response = await axios.get(`${API}/white-label/user/${currentUser.id}`);
      setWhiteLabelConfig(response.data);
    } catch (error) {
      // White-label config might not exist for all users
      setWhiteLabelConfig(null);
    }
  };

  const applyBrandingPreview = () => {
    const root = document.documentElement;
    
    // Create CSS custom properties for preview
    root.style.setProperty('--preview-primary', primaryColor);
    root.style.setProperty('--preview-secondary', secondaryColor);
    root.style.setProperty('--preview-accent', accentColor);
    root.style.setProperty('--preview-background', backgroundColor);
    root.style.setProperty('--preview-text', textColor);
    root.style.setProperty('--preview-border', borderColor);
    
    setHasUnsavedChanges(true);
  };

  const applyThemePreset = (preset) => {
    setPrimaryColor(preset.primary_color);
    setSecondaryColor(preset.secondary_color);
    setAccentColor(preset.accent_color);
    setBackgroundColor(preset.background_color);
    setTextColor(preset.text_color);
    setBorderColor(preset.border_color);
    setThemeMode(preset.theme_mode);
    setSelectedPreset(preset.id);
    
    toast.success(`Applied ${preset.name} theme preset`);
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
    
    setHasUnsavedChanges(true);
  };

  const uploadLogo = async () => {
    if (!logoFile || !branding) return;

    try {
      setLogoUploading(true);
      
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('user_id', currentUser.id);
      formData.append('branding_id', branding.id);

      const response = await axios.post(`${API}/branding/upload-logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setLogoPreview(response.data.logo_url);
      setLogoFile(null);
      
      toast.success('Logo uploaded successfully!');
      
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const saveBranding = async () => {
    try {
      setLoading(true);

      const brandingData = {
        organization_name: organizationName,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        background_color: backgroundColor,
        text_color: textColor,
        border_color: borderColor,
        theme_mode: themeMode,
        welcome_message: welcomeMessage,
        tagline: tagline,
        footer_text: footerText,
        custom_css: customCSS
      };

      if (branding && branding.id !== 'system-default') {
        // Update existing branding
        await axios.put(`${API}/branding/${branding.id}`, brandingData);
        toast.success('Branding updated successfully!');
      } else {
        // Create new branding
        const createData = {
          user_id: currentUser.id,
          ...brandingData
        };
        const response = await axios.post(`${API}/branding/create`, createData);
        setBranding(response.data);
        toast.success('Branding created successfully!');
      }

      // Upload logo if provided
      if (logoFile) {
        await uploadLogo();
      }

      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast.error('Failed to save branding');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setPrimaryColor('#3b82f6');
    setSecondaryColor('#8b5cf6');
    setAccentColor('#10b981');
    setBackgroundColor('#000000');
    setTextColor('#ffffff');
    setBorderColor('#374151');
    setThemeMode('dark');
    setWelcomeMessage('Welcome to your AI-powered business intelligence platform');
    setTagline('Modular Quantum Business Intelligence');
    setFooterText('Powered by modQ');
    setSelectedPreset('');
    
    toast.success('Reset to default theme');
  };

  const exportTheme = () => {
    const themeData = {
      name: `${organizationName || 'Custom'} Theme`,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      background_color: backgroundColor,
      text_color: textColor,
      border_color: borderColor,
      theme_mode: themeMode,
      organization_name: organizationName,
      welcome_message: welcomeMessage,
      tagline: tagline,
      footer_text: footerText
    };
    
    const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${organizationName || 'modq'}-theme.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Theme exported successfully');
  };

  const getPreviewClass = () => {
    switch (previewMode) {
      case 'tablet':
        return 'w-full max-w-2xl mx-auto';
      case 'mobile':
        return 'w-full max-w-sm mx-auto';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Brand Customization</h2>
          <p className="text-gray-400 mt-1">Customize your platform's branding and appearance</p>
        </div>
        
        <div className="flex items-center gap-4">
          {hasUnsavedChanges && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
          
          <Button onClick={exportTheme} variant="outline" className="glass neon-border">
            <Download className="w-4 h-4 mr-2" />
            Export Theme
          </Button>
          
          <Button onClick={saveBranding} className="tech-button" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="glass neon-border">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="white-label" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            White Label
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Brand Settings */}
            <div className="lg:col-span-1 space-y-6">
              {/* Logo Upload */}
              <Card className="holographic p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Logo & Assets</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Organization Name</label>
                    <Input
                      value={organizationName}
                      onChange={(e) => {
                        setOrganizationName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Your Organization"
                      className="glass neon-border"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
                    
                    {logoPreview ? (
                      <div className="space-y-3">
                        <div className="w-full h-24 glass rounded-lg flex items-center justify-center">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="max-h-20 max-w-full object-contain"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => fileInputRef.current?.click()}
                            className="glass neon-border"
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Change Logo
                          </Button>
                          {logoFile && (
                            <Button 
                              size="sm" 
                              onClick={uploadLogo}
                              disabled={logoUploading}
                              className="tech-button"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {logoUploading ? 'Uploading...' : 'Upload'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-full h-24 glass rounded-lg border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-white/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="text-center">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-400">Click to upload logo</p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                        </div>
                      </div>
                    )}
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </Card>

              {/* Color Palette */}
              <Card className="holographic p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Color Palette</h3>
                
                <div className="space-y-4">
                  {colorInputs.map((colorInput) => (
                    <div key={colorInput.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {colorInput.label}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={colorInput.value}
                          onChange={(e) => {
                            colorInput.setter(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="w-12 h-10 rounded-lg border-2 border-white/20 bg-transparent cursor-pointer"
                        />
                        <Input
                          value={colorInput.value}
                          onChange={(e) => {
                            colorInput.setter(e.target.value);
                            setHasUnsavedChanges(true);
                          }}
                          className="flex-1 glass neon-border font-mono text-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{colorInput.description}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={resetToDefaults} variant="outline" className="flex-1 glass neon-border">
                    <Undo className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button onClick={() => navigator.clipboard.writeText(JSON.stringify({ primaryColor, secondaryColor, accentColor }))} variant="outline" className="glass neon-border">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              {/* Theme Mode */}
              <Card className="holographic p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Theme Mode</h3>
                
                <Select value={themeMode} onValueChange={(value) => {
                  setThemeMode(value);
                  setHasUnsavedChanges(true);
                }}>
                  <SelectTrigger className="glass neon-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="dark">Dark Mode</SelectItem>
                    <SelectItem value="light">Light Mode</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </Card>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-2">
              <Card className="holographic p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Live Preview</h3>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewMode('tablet')}
                    >
                      <Tablet className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Preview Container */}
                <div className={`bg-gray-900 rounded-lg p-4 ${getPreviewClass()}`}>
                  <div 
                    className="rounded-lg p-6 space-y-4 transition-colors duration-200"
                    style={{
                      backgroundColor: backgroundColor,
                      color: textColor,
                      borderColor: borderColor,
                      border: `1px solid ${borderColor}`
                    }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <div className="flex items-center gap-3">
                        {logoPreview && (
                          <img src={logoPreview} alt="Logo" className="h-8 w-auto" />
                        )}
                        <h1 className="text-xl font-bold">{organizationName || 'Your Organization'}</h1>
                      </div>
                      <Button 
                        className="text-white"
                        style={{ 
                          backgroundColor: primaryColor,
                          borderColor: primaryColor 
                        }}
                      >
                        Primary Button
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                      <p>{welcomeMessage || 'Welcome to your AI-powered business intelligence platform'}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          className="p-4 rounded-lg"
                          style={{ 
                            backgroundColor: `${primaryColor}20`,
                            borderColor: primaryColor,
                            border: `1px solid ${primaryColor}30`
                          }}
                        >
                          <h3 className="font-semibold mb-2" style={{ color: primaryColor }}>Primary Card</h3>
                          <p className="text-sm opacity-80">This card uses your primary color scheme</p>
                        </div>
                        
                        <div 
                          className="p-4 rounded-lg"
                          style={{ 
                            backgroundColor: `${secondaryColor}20`,
                            borderColor: secondaryColor,
                            border: `1px solid ${secondaryColor}30`
                          }}
                        >
                          <h3 className="font-semibold mb-2" style={{ color: secondaryColor }}>Secondary Card</h3>
                          <p className="text-sm opacity-80">This card uses your secondary color scheme</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          style={{ 
                            borderColor: borderColor,
                            color: textColor
                          }}
                        >
                          Outline Button
                        </Button>
                        <Button 
                          style={{ 
                            backgroundColor: accentColor,
                            color: backgroundColor 
                          }}
                        >
                          Accent Button
                        </Button>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 mt-4 text-center text-sm opacity-60" style={{ borderTop: `1px solid ${borderColor}` }}>
                      {footerText || 'Powered by modQ'}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Themes Tab */}
        <TabsContent value="themes" className="mt-6">
          <Card className="holographic p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Theme Presets</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {themePresets.map((preset) => (
                <Card 
                  key={preset.id} 
                  className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                    selectedPreset === preset.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => applyThemePreset(preset)}
                >
                  <div className="space-y-3">
                    {/* Theme Preview */}
                    <div 
                      className="h-24 rounded-lg p-3 flex items-end"
                      style={{
                        backgroundColor: preset.background_color,
                        color: preset.text_color,
                        border: `1px solid ${preset.border_color}`
                      }}
                    >
                      <div className="flex gap-1">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: preset.primary_color }}
                        />
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: preset.secondary_color }}
                        />
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: preset.accent_color }}
                        />
                      </div>
                    </div>

                    {/* Theme Info */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-white">{preset.name}</h4>
                        {preset.is_system_preset && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            System
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{preset.description}</p>
                    </div>

                    {/* Apply Button */}
                    <Button 
                      className="w-full tech-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        applyThemePreset(preset);
                      }}
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Apply Theme
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="holographic p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Content Customization</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Welcome Message</label>
                  <Textarea
                    value={welcomeMessage}
                    onChange={(e) => {
                      setWelcomeMessage(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Welcome to your AI-powered business intelligence platform"
                    className="glass neon-border"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tagline</label>
                  <Input
                    value={tagline}
                    onChange={(e) => {
                      setTagline(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Modular Quantum Business Intelligence"
                    className="glass neon-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Footer Text</label>
                  <Input
                    value={footerText}
                    onChange={(e) => {
                      setFooterText(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Powered by modQ"
                    className="glass neon-border"
                  />
                </div>
              </div>
            </Card>

            <Card className="holographic p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Custom CSS</h3>
              
              <div className="space-y-4">
                <Textarea
                  value={customCSS}
                  onChange={(e) => {
                    setCustomCSS(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="/* Add your custom CSS here */
.custom-button {
  background: linear-gradient(45deg, var(--primary), var(--secondary));
  border-radius: 12px;
}"
                  className="glass neon-border font-mono text-sm"
                  rows={12}
                />
                
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Custom CSS will be applied globally to your platform</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Domain Tab */}
        <TabsContent value="domain" className="mt-6">
          <Card className="holographic p-6">
            <h3 className="text-xl font-semibold text-white mb-6">Custom Domain Configuration</h3>
            
            <div className="text-center py-12">
              <Globe className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h4 className="text-lg font-semibold text-white mb-2">Custom Domain Setup</h4>
              <p className="text-gray-400 mb-6">
                Configure your own domain for a fully white-labeled experience
              </p>
              
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 mb-6">
                Enterprise Feature - Coming Soon
              </Badge>
              
              <div className="max-w-md mx-auto space-y-4">
                <Input 
                  placeholder="yourdomain.com"
                  disabled
                  className="glass neon-border"
                />
                <Button disabled className="w-full tech-button opacity-50">
                  <Globe className="w-4 h-4 mr-2" />
                  Configure Domain
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* White Label Tab */}
        <TabsContent value="white-label" className="mt-6">
          <Card className="holographic p-6">
            <h3 className="text-xl font-semibold text-white mb-6">White Label Configuration</h3>
            
            <div className="text-center py-12">
              <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h4 className="text-lg font-semibold text-white mb-2">White Label Platform</h4>
              <p className="text-gray-400 mb-6">
                Remove modQ branding and create a fully branded experience for your organization
              </p>
              
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mb-6">
                <Crown className="w-3 h-3 mr-1" />
                Enterprise Feature
              </Badge>
              
              <Button disabled className="tech-button opacity-50">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Enterprise
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandCustomization;