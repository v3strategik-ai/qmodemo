import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Bell, 
  BellOff, 
  Zap, 
  Battery, 
  Signal,
  Download,
  Settings,
  Palette,
  Gauge,
  RefreshCw,
  Globe,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const MobileOptimization = ({ currentUser }) => {
  const [mobileConfig, setMobileConfig] = useState({
    push_notifications_enabled: true,
    offline_sync_enabled: true,
    mobile_theme: 'dark',
    compact_mode: false,
    gesture_controls: true,
    auto_sync_interval: 300
  });
  const [deviceInfo, setDeviceInfo] = useState({
    type: 'desktop',
    online: true,
    installable: false,
    installed: false
  });
  const [pwStats, setPwStats] = useState({
    cacheSize: 0,
    offlineCapable: false,
    syncPending: 0
  });
  const [loading, setLoading] = useState(false);

  const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (currentUser) {
      loadMobileConfig();
      detectDevice();
      checkPWAStatus();
      registerServiceWorker();
    }
  }, [currentUser]);

  const loadMobileConfig = async () => {
    try {
      const response = await axios.get(`${API}/api/mobile/config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      setMobileConfig(response.data);
    } catch (error) {
      console.error('Failed to load mobile config:', error);
    }
  };

  const saveMobileConfig = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/api/mobile/config`, mobileConfig, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      toast.success('Mobile settings saved successfully!');
    } catch (error) {
      console.error('Failed to save mobile config:', error);
      toast.error('Failed to save mobile settings');
    } finally {
      setLoading(false);
    }
  };

  const detectDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    
    setDeviceInfo(prev => ({
      ...prev,
      type: isMobile ? (isTablet ? 'tablet' : 'mobile') : 'desktop',
      online: navigator.onLine
    }));

    // Listen for online/offline events
    window.addEventListener('online', () => {
      setDeviceInfo(prev => ({ ...prev, online: true }));
      toast.success('Connection restored');
    });

    window.addEventListener('offline', () => {
      setDeviceInfo(prev => ({ ...prev, online: false }));
      toast.error('Connection lost - working offline');
    });
  };

  const checkPWAStatus = () => {
    // Check if app is installable
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeviceInfo(prev => ({ ...prev, installable: true }));
    });

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppIOS = window.navigator.standalone === true;
    
    setDeviceInfo(prev => ({ 
      ...prev, 
      installed: isStandalone || isInWebAppIOS 
    }));
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        
        // Check cache status
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          let totalSize = 0;
          
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            totalSize += keys.length;
          }
          
          setPwStats(prev => ({
            ...prev,
            cacheSize: totalSize,
            offlineCapable: true
          }));
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const installPWA = async () => {
    const deferredPrompt = window.deferredPrompt;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
        setDeviceInfo(prev => ({ ...prev, installed: true, installable: false }));
      }
      
      window.deferredPrompt = null;
    }
  };

  const enablePushNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Push notifications not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Register for push notifications
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'your-vapid-public-key' // Replace with actual VAPID key
          });
          
          // Send subscription to server
          await axios.post(`${API}/api/mobile/push/subscribe`, {
            endpoint: subscription.endpoint,
            p256dh_key: subscription.keys.p256dh,
            auth_key: subscription.keys.auth
          }, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          });
          
          toast.success('Push notifications enabled!');
          setMobileConfig(prev => ({ ...prev, push_notifications_enabled: true }));
        }
      } else {
        toast.error('Push notification permission denied');
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        setPwStats(prev => ({ ...prev, cacheSize: 0 }));
        toast.success('Cache cleared successfully!');
      }
    } catch (error) {
      console.error('Cache clear failed:', error);
      toast.error('Failed to clear cache');
    }
  };

  const getDeviceIcon = () => {
    switch (deviceInfo.type) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const getThemeColors = (theme) => {
    switch (theme) {
      case 'light': return 'from-blue-400 to-purple-500';
      case 'dark': return 'from-gray-600 to-blue-800';
      case 'auto': return 'from-green-400 to-blue-600';
      default: return 'from-blue-500 to-purple-600';
    }
  };

  const DeviceIcon = getDeviceIcon();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Mobile & PWA Settings</h2>
          <p className="text-gray-400">Optimize your mobile experience and offline capabilities</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={deviceInfo.online ? 'default' : 'destructive'}>
            {deviceInfo.online ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {deviceInfo.online ? 'Online' : 'Offline'}
          </Badge>
          <Badge variant="secondary">
            <DeviceIcon className="w-3 h-3 mr-1" />
            {deviceInfo.type}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PWA Status */}
        <Card className="glass neon-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Progressive Web App
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Install modQ as a native app
                </CardDescription>
              </div>
              {deviceInfo.installed && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Installed
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Offline Capable:</span>
                <span className={`ml-2 ${pwStats.offlineCapable ? 'text-green-400' : 'text-red-400'}`}>
                  {pwStats.offlineCapable ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Cache Size:</span>
                <span className="text-white ml-2">{pwStats.cacheSize} items</span>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {deviceInfo.installable && !deviceInfo.installed && (
                <Button
                  onClick={installPWA}
                  className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
              )}
              
              <Button
                onClick={clearCache}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Theme */}
        <Card className="glass neon-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Mobile Theme
            </CardTitle>
            <CardDescription className="text-gray-400">
              Customize your mobile interface
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300">Theme Mode</label>
              <Select 
                value={mobileConfig.mobile_theme} 
                onValueChange={(value) => setMobileConfig({...mobileConfig, mobile_theme: value})}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark Theme</SelectItem>
                  <SelectItem value="light">Light Theme</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-300">Compact Mode</p>
                <p className="text-sm text-gray-400">Reduce spacing for mobile</p>
              </div>
              <Switch 
                checked={mobileConfig.compact_mode}
                onCheckedChange={(value) => setMobileConfig({...mobileConfig, compact_mode: value})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-300">Gesture Controls</p>
                <p className="text-sm text-gray-400">Swipe gestures for navigation</p>
              </div>
              <Switch 
                checked={mobileConfig.gesture_controls}
                onCheckedChange={(value) => setMobileConfig({...mobileConfig, gesture_controls: value})}
              />
            </div>
            
            {/* Theme Preview */}
            <div className={`p-3 rounded-lg bg-gradient-to-r ${getThemeColors(mobileConfig.mobile_theme)} opacity-20`}>
              <p className="text-sm text-white">Theme Preview</p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="glass neon-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Push Notifications
            </CardTitle>
            <CardDescription className="text-gray-400">
              Stay updated with real-time notifications
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-300">Enable Notifications</p>
                <p className="text-sm text-gray-400">Receive updates and alerts</p>
              </div>
              <Switch 
                checked={mobileConfig.push_notifications_enabled}
                onCheckedChange={(value) => {
                  if (value) {
                    enablePushNotifications();
                  } else {
                    setMobileConfig({...mobileConfig, push_notifications_enabled: false});
                  }
                }}
              />
            </div>
            
            {!mobileConfig.push_notifications_enabled && (
              <Button
                onClick={enablePushNotifications}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Push Notifications
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Offline & Sync */}
        <Card className="glass neon-border">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Offline & Sync
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure offline capabilities and data sync
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-300">Offline Sync</p>
                <p className="text-sm text-gray-400">Sync data when connection available</p>
              </div>
              <Switch 
                checked={mobileConfig.offline_sync_enabled}
                onCheckedChange={(value) => setMobileConfig({...mobileConfig, offline_sync_enabled: value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300">
                Auto Sync Interval: {mobileConfig.auto_sync_interval}s
              </label>
              <Slider
                value={[mobileConfig.auto_sync_interval]}
                onValueChange={(value) => setMobileConfig({...mobileConfig, auto_sync_interval: value[0]})}
                max={3600}
                min={60}
                step={60}
                className="w-full mt-2"
              />
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Pending Sync:</span>
              <span>{pwStats.syncPending} items</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button
          onClick={saveMobileConfig}
          disabled={loading}
          className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
        >
          <Settings className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default MobileOptimization;