import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Upload, File, FileText, Image, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FileUploadZone = ({ userId, onUploadComplete, className = "" }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const supportedFileTypes = {
    'text/plain': { icon: <FileText className="w-4 h-4" />, label: 'Text', color: 'text-blue-400' },
    'application/pdf': { icon: <File className="w-4 h-4" />, label: 'PDF', color: 'text-red-400' },
    'application/msword': { icon: <FileText className="w-4 h-4" />, label: 'DOC', color: 'text-blue-400' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: <FileText className="w-4 h-4" />, label: 'DOCX', color: 'text-blue-400' },
    'text/csv': { icon: <FileText className="w-4 h-4" />, label: 'CSV', color: 'text-green-400' },
    'application/json': { icon: <FileText className="w-4 h-4" />, label: 'JSON', color: 'text-yellow-400' }
  };

  const getFileIcon = (fileType) => {
    return supportedFileTypes[fileType] || { icon: <File className="w-4 h-4" />, label: 'FILE', color: 'text-gray-400' };
  };

  const processFile = async (file) => {
    const fileId = Date.now() + Math.random();
    
    // Add to uploading files
    setUploadingFiles(prev => [...prev, {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading'
    }]);

    try {
      // Simulate file processing and extraction
      let extractedContent = '';
      
      if (file.type === 'text/plain') {
        extractedContent = await file.text();
      } else if (file.type === 'application/json') {
        const jsonContent = await file.text();
        try {
          const parsed = JSON.parse(jsonContent);
          extractedContent = `JSON Data:\n${JSON.stringify(parsed, null, 2)}`;
        } catch (e) {
          extractedContent = jsonContent;
        }
      } else if (file.type === 'text/csv') {
        extractedContent = await file.text();
        // Basic CSV processing - convert to readable format
        const lines = extractedContent.split('\n');
        const headers = lines[0];
        extractedContent = `CSV Data with headers: ${headers}\n\n${extractedContent}`;
      } else if (file.type === 'application/pdf') {
        // For demo purposes, simulate PDF text extraction
        extractedContent = `PDF Document: ${file.name}\n\nThis is extracted content from the PDF file. In a production environment, this would contain the actual text extracted from the PDF using a library like pdf-parse or similar.\n\nThe file contains business information that will be used to enhance AI responses with company-specific context.`;
      } else {
        // For other file types, create a description
        extractedContent = `Document: ${file.name}\nFile Type: ${file.type}\nSize: ${(file.size / 1024).toFixed(2)} KB\n\nThis document has been uploaded to the knowledge base and will be processed to extract relevant business information for AI context.`;
      }

      // Update progress
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 50 } : f
      ));

      // Save to knowledge base via API
      const response = await axios.post(`${API}/knowledge-base`, {
        user_id: userId,
        title: file.name,
        content: extractedContent,
        file_type: file.type
      });

      // Complete upload
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f
      ));

      // Move to uploaded files
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        setUploadedFiles(prev => [...prev, {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          knowledgeBaseId: response.data.id
        }]);
      }, 1000);

      if (onUploadComplete) {
        onUploadComplete(response.data);
      }

      toast.success(`${file.name} uploaded successfully!`);

    } catch (error) {
      console.error('File upload error:', error);
      
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error', progress: 0 } : f
      ));

      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(processFile);
    e.target.value = ''; // Reset input
  };

  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <Card 
        className={`p-8 border-2 border-dashed transition-all duration-200 cursor-pointer ${
          isDragOver 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-gray-600 hover:border-gray-500 glass'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-400' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold text-white mb-2">
            {isDragOver ? 'Drop files here' : 'Upload Documents'}
          </h3>
          <p className="text-gray-400 mb-4">
            Drag and drop files here, or click to browse
          </p>
          
          {/* Supported File Types */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {Object.entries(supportedFileTypes).map(([type, info]) => (
              <Badge key={type} className="bg-gray-700/50 text-gray-300 border-gray-600">
                {info.icon}
                <span className="ml-1">{info.label}</span>
              </Badge>
            ))}
          </div>
          
          <p className="text-xs text-gray-500">
            Max file size: 10MB • Supported: PDF, DOC, DOCX, TXT, CSV, JSON
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.csv,.json"
          onChange={handleFileSelect}
        />
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Uploading...</h4>
          {uploadingFiles.map((file) => (
            <Card key={file.id} className="glass p-3 border border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className={getFileIcon(file.type).color}>
                  {getFileIcon(file.type).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{file.progress}%</span>
                  </div>
                </div>
                {file.status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Recently Uploaded</h4>
          {uploadedFiles.map((file) => (
            <Card key={file.id} className="glass p-3 border border-green-500/30">
              <div className="flex items-center gap-3">
                <div className={getFileIcon(file.type).color}>
                  {getFileIcon(file.type).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB • {new Date(file.uploadedAt).toLocaleTimeString()}
                  </p>
                </div>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadedFile(file.id)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;