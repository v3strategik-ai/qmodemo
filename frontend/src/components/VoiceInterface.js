import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Mic, MicOff, Volume2, VolumeX, Play, Pause, Square } from 'lucide-react';
import { toast } from 'sonner';

const VoiceInterface = ({ 
  currentUser, 
  onTranscriptionResult, 
  onTTSResult,
  voiceSettings = {},
  onVoiceSettingsChange 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [permission, setPermission] = useState('default');
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Default voice settings
  const settings = {
    enabled: voiceSettings.enabled || false,
    voice: voiceSettings.voice || 'alloy',
    speech_speed: voiceSettings.speech_speed || 1.0,
    auto_play_responses: voiceSettings.auto_play_responses !== false,
    ...voiceSettings
  };

  // Available voice options
  const voiceOptions = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'fable', label: 'Fable (British Male)' },
    { value: 'onyx', label: 'Onyx (Deep Male)' },
    { value: 'nova', label: 'Nova (Female)' },
    { value: 'shimmer', label: 'Shimmer (Female)' }
  ];

  useEffect(() => {
    // Check microphone permission
    checkMicrophonePermission();
    
    return () => {
      // Cleanup
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      setPermission(result.state);
      
      result.addEventListener('change', () => {
        setPermission(result.state);
      });
    } catch (error) {
      console.log('Permission API not supported:', error);
    }
  };

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      setPermission('granted');
      return stream;
    } catch (error) {
      setPermission('denied');
      toast.error('Microphone access denied. Please enable microphone permissions and try again.');
      throw error;
    }
  };

  const setupAudioAnalyser = (stream) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    // Start level monitoring
    monitorAudioLevel();
  };

  const monitorAudioLevel = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const checkLevel = () => {
      if (isRecording) {
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setRecordingLevel(Math.min(100, (average / 128) * 100));
        animationFrameRef.current = requestAnimationFrame(checkLevel);
      }
    };
    
    checkLevel();
  };

  const startRecording = async () => {
    try {
      if (!settings.enabled) {
        toast.error('Voice features are disabled. Enable them in settings first.');
        return;
      }

      setIsProcessing(true);
      
      // Request microphone access
      const stream = await requestMicrophoneAccess();
      streamRef.current = stream;
      
      // Setup audio analysis
      setupAudioAnalyser(stream);
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processRecording(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setIsProcessing(false);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast.success('Recording started');
      
    } catch (error) {
      console.error('Recording start error:', error);
      setIsProcessing(false);
      toast.error('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingLevel(0);
      
      // Stop timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      toast.success('Recording stopped, processing...');
    }
  };

  const processRecording = async (audioBlob) => {
    try {
      setIsProcessing(true);
      
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        // Send for transcription via callback
        if (onTranscriptionResult) {
          await onTranscriptionResult({
            audio_data: base64Audio,
            duration: recordingTime,
            user_id: currentUser?.id
          });
        }
        
        setIsProcessing(false);
        setRecordingTime(0);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Recording processing error:', error);
      setIsProcessing(false);
      toast.error('Failed to process recording');
    }
  };

  const playTTS = async (text) => {
    try {
      if (!text || !settings.enabled) return;
      
      setIsProcessing(true);
      
      // Request TTS via callback
      if (onTTSResult) {
        await onTTSResult({
          text,
          voice: settings.voice,
          speed: settings.speech_speed,
          user_id: currentUser?.id
        });
      }
      
    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Failed to generate speech');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioFromBase64 = (base64Audio) => {
    try {
      const audioBlob = new Blob([
        Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        toast.error('Failed to play audio');
      };
      
      audio.play().catch(error => {
        console.error('Audio playback error:', error);
        toast.error('Failed to play audio');
      });
      
    } catch (error) {
      console.error('Audio playback error:', error);
      toast.error('Failed to play audio');
    }
  };

  const stopAudioPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    if (onVoiceSettingsChange) {
      onVoiceSettingsChange(newSettings);
    }
  };

  // Expose methods for parent component
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    playTTS,
    playAudioFromBase64,
    stopAudioPlayback
  }));

  return (
    <Card className="holographic p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Voice Interface</h3>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.enabled}
              onCheckedChange={(value) => handleSettingChange('enabled', value)}
            />
            <span className="text-sm text-gray-300">Enable Voice</span>
          </div>
        </div>

        {/* Permission Status */}
        {permission === 'denied' && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              Microphone access is required for voice features. Please enable microphone permissions in your browser settings.
            </p>
          </div>
        )}

        {/* Voice Settings */}
        {settings.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Voice
                </label>
                <Select
                  value={settings.voice}
                  onValueChange={(value) => handleSettingChange('voice', value)}
                >
                  <SelectTrigger className="glass neon-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    {voiceOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Speech Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Speech Speed: {settings.speech_speed}x
                </label>
                <Slider
                  value={[settings.speech_speed]}
                  onValueChange={([value]) => handleSettingChange('speech_speed', value)}
                  min={0.25}
                  max={4.0}
                  step={0.25}
                  className="w-full"
                />
              </div>
            </div>

            {/* Auto-play Setting */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Auto-play AI responses</span>
              <Switch
                checked={settings.auto_play_responses}
                onCheckedChange={(value) => handleSettingChange('auto_play_responses', value)}
              />
            </div>
          </div>
        )}

        {/* Recording Interface */}
        {settings.enabled && permission !== 'denied' && (
          <div className="space-y-4">
            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } transition-colors`}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </Button>

              {isPlaying && (
                <Button
                  onClick={stopAudioPlayback}
                  className="w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-600"
                >
                  <Pause className="w-4 h-4 text-white" />
                </Button>
              )}
            </div>

            {/* Recording Status */}
            {(isRecording || isProcessing) && (
              <div className="text-center space-y-2">
                {isRecording && (
                  <div>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Recording: {formatTime(recordingTime)}
                    </Badge>
                    
                    {/* Audio Level Indicator */}
                    <div className="mt-2">
                      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-100"
                          style={{ width: `${recordingLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {isProcessing && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Processing...
                  </Badge>
                )}
              </div>
            )}

            {/* Instructions */}
            {!isRecording && !isProcessing && (
              <div className="text-center text-gray-400 text-sm">
                Click the microphone to start recording your voice
              </div>
            )}
          </div>
        )}

        {/* Disabled State */}
        {!settings.enabled && (
          <div className="text-center text-gray-500 py-8">
            <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Voice features are disabled</p>
            <p className="text-xs mt-1">Enable voice features above to use speech input/output</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VoiceInterface;