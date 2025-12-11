'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface ReceiptUploadProps {
  onReceiptSelect: (file: File) => void;
  selectedFile: File | null;
}

export default function ReceiptUpload({ onReceiptSelect, selectedFile }: ReceiptUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onReceiptSelect(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraClick = () => cameraInputRef.current?.click();
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleRemove = () => {
    setPreviewUrl(null);
    onReceiptSelect(null as any);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Card>
      <h2 className="card-title">Upload Receipt</h2>
      
      {!previewUrl ? (
        <div className="flex flex-col gap-base">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div style={{
            border: '2px dashed var(--black-tertiary)',
            borderRadius: '4px',
            padding: '32px',
            textAlign: 'center',
            backgroundColor: 'var(--ivory-bg)'
          }}>
            <p style={{ color: 'var(--black-secondary)', marginBottom: '16px' }}>
              Scan or upload your receipt to get started
            </p>
            <div className="flex flex-wrap gap-md justify-center">
              <Button variant="primary" onClick={handleCameraClick}>
                <Camera size={20} />
                Scan Receipt
              </Button>
              <Button variant="secondary" onClick={handleUploadClick}>
                <Upload size={20} />
                Upload Image
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-base">
          <div style={{ position: 'relative' }}>
            <img 
              src={previewUrl} 
              alt="Receipt preview" 
              style={{
                width: '100%',
                maxHeight: '384px',
                objectFit: 'contain',
                border: '2px solid var(--black-text)',
                borderRadius: '4px'
              }}
            />
            <button
              onClick={handleRemove}
              className="btn-danger"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '8px',
                borderRadius: '4px'
              }}
              aria-label="Remove receipt"
            >
              <X size={20} />
            </button>
          </div>
          
          {selectedFile && (
            <p style={{ fontSize: '14px', color: 'var(--black-secondary)' }}>
              <strong>File:</strong> {selectedFile.name}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
