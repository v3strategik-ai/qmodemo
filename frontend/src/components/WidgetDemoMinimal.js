import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { ArrowLeft, Bot } from 'lucide-react';

const WidgetDemoMinimal = () => {
  console.log('🚀 WidgetDemoMinimal starting to render...');
  
  const navigate = useNavigate();
  const { currentUser, register } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  console.log('✅ Minimal component state initialized - currentUser:', !!currentUser);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await register(username, email, 'employee');
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <div className="circuit-bg" />
        <div className="bg-grid" />
        
        <Card className="glass p-8 w-full max-w-md relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gradient">Minimal Widget Demo</h2>
            <p className="text-gray-400 mt-2">Testing minimal version</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="glass neon-border"
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass neon-border"
              />
            </div>
            <Button type="submit" className="w-full tech-button" disabled={loading}>
              <Bot className="w-4 h-4 mr-2" />
              Start Minimal Demo
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Landing
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <div className="circuit-bg" />
      <div className="bg-grid" />
      
      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gradient">Minimal Widget Demo</h1>
          </div>
        </div>

        <Card className="glass p-6">
          <h2 className="text-xl text-white mb-4">Success!</h2>
          <p className="text-gray-300">Minimal widget demo loaded successfully.</p>
          <p className="text-gray-400 mt-2">User: {currentUser?.username} ({currentUser?.email})</p>
        </Card>
      </div>
    </div>
  );
};

export default WidgetDemoMinimal;