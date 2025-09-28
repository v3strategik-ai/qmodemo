import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const useWebSocket = (userId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const messageQueue = useRef([]);
  const eventListeners = useRef({});

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000;

  // Generate WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (!userId) return null;
    
    // For production deployment, use the backend URL with correct WebSocket path
    if (BACKEND_URL && BACKEND_URL.includes('emergentagent.com')) {
      const wsProtocol = BACKEND_URL.startsWith('https://') ? 'wss://' : 'ws://';
      const baseUrl = BACKEND_URL.replace(/^https?:\/\//, '');
      return `${wsProtocol}${baseUrl}/api/ws/chat/${userId}`;
    }
    
    // For local development, use localhost:8001
    return `ws://localhost:8001/api/ws/chat/${userId}`;
  }, [userId]);

  // Add event listener
  const addEventListener = useCallback((event, callback) => {
    if (!eventListeners.current[event]) {
      eventListeners.current[event] = [];
    }
    eventListeners.current[event].push(callback);
  }, []);

  // Remove event listener
  const removeEventListener = useCallback((event, callback) => {
    if (eventListeners.current[event]) {
      eventListeners.current[event] = eventListeners.current[event].filter(cb => cb !== callback);
    }
  }, []);

  // Emit event to listeners
  const emitEvent = useCallback((event, data) => {
    if (eventListeners.current[event]) {
      eventListeners.current[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }, []);

  // Send message
  const sendMessage = useCallback((message) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        return false;
      }
    } else {
      // Queue message for when connection is established
      messageQueue.current.push(message);
      if (!isConnected) {
        connect();
      }
      return false;
    }
  }, [isConnected]);

  // Process message queue
  const processMessageQueue = useCallback(() => {
    while (messageQueue.current.length > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
      const message = messageQueue.current.shift();
      try {
        socketRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send queued message:', error);
        // Put message back at the front of queue
        messageQueue.current.unshift(message);
        break;
      }
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (isConnecting || (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (!userId) {
      console.warn('Cannot connect WebSocket without userId');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Process any queued messages
        processMessageQueue();
        
        emitEvent('connected', { userId });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          
          // Handle different message types
          switch (data.type) {
            case 'connection_established':
              setSessionId(data.session_id);
              emitEvent('session_established', data);
              break;
              
            case 'response_start':
              emitEvent('response_start', data);
              break;
              
            case 'response_chunk':
              emitEvent('response_chunk', data);
              break;
              
            case 'response_complete':
              emitEvent('response_complete', data);
              break;
              
            case 'message_complete':
              emitEvent('message_complete', data);
              break;
              
            case 'typing_start':
              emitEvent('typing_start', data);
              break;
              
            case 'transcription_result':
              emitEvent('transcription_result', data);
              break;
              
            case 'transcription_error':
              emitEvent('transcription_error', data);
              break;
              
            case 'tts_result':
              emitEvent('tts_result', data);
              break;
              
            case 'tts_error':
              emitEvent('tts_error', data);
              break;
              
            case 'error':
              emitEvent('error', data);
              toast.error(data.message || 'WebSocket error occurred');
              break;
              
            default:
              emitEvent('message', data);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        setSessionId(null);
        
        if (event.code !== 1000) { // Not a normal close
          setConnectionError(`Connection closed: ${event.reason || 'Unknown reason'}`);
          scheduleReconnect();
        }
        
        emitEvent('disconnected', { code: event.code, reason: event.reason });
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
        setIsConnecting(false);
        emitEvent('error', { error: 'WebSocket connection error' });
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnecting(false);
      setConnectionError('Failed to create connection');
    }
  }, [userId, isConnecting, getWebSocketUrl, processMessageQueue, emitEvent]);

  // Schedule reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnection attempts reached');
      setConnectionError('Unable to reconnect after multiple attempts');
      return;
    }

    const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current);
    console.log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttempts.current++;
      connect();
    }, delay);
  }, [connect]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close(1000, 'User disconnected');
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setSessionId(null);
    setConnectionError(null);
    reconnectAttempts.current = 0;
    messageQueue.current = [];
  }, []);

  // Send chat message
  const sendChatMessage = useCallback((message, personality = 'Professional Assistant') => {
    return sendMessage({
      type: 'chat_message',
      message,
      personality,
      session_id: sessionId
    });
  }, [sendMessage, sessionId]);

  // Send voice transcription
  const sendVoiceTranscription = useCallback((audioData, duration, autoProcess = true) => {
    return sendMessage({
      type: 'voice_transcription',
      audio_data: audioData,
      duration: duration,
      auto_process: autoProcess,
      session_id: sessionId
    });
  }, [sendMessage, sessionId]);

  // Request TTS
  const requestTTS = useCallback((text, voice = 'alloy', speed = 1.0) => {
    return sendMessage({
      type: 'tts_request',
      text,
      voice,
      speed,
      session_id: sessionId
    });
  }, [sendMessage, sessionId]);

  // Initialize connection when userId is available
  useEffect(() => {
    if (userId) {
      connect();
    }

    // Cleanup on unmount or userId change
    return () => {
      disconnect();
    };
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    sessionId,
    
    // Connection methods
    connect,
    disconnect,
    
    // Messaging methods
    sendMessage,
    sendChatMessage,
    sendVoiceTranscription,
    requestTTS,
    
    // Event handling
    addEventListener,
    removeEventListener
  };
};

export default useWebSocket;