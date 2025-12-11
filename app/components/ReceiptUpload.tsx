'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, CheckCircle, Loader, AlertCircle, Clock } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface ReceiptUploadProps {
  onReceiptSelect: (files: File[]) => void;
  selectedFile: File | null;
  queueInfo?: { 
    current: number; 
    total: number;
    statuses?: Array<'pending' | 'processing' | 'ready' | 'error'>;
  } | null;
}

export default function ReceiptUpload({ onReceiptSelect, selectedFile, queueInfo }: ReceiptUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        alert('Please select valid image files');
        return;
      }

      // Enforce 5-receipt limit
      if (imageFiles.length > 5) {
        alert('You can upload a maximum of 5 receipts at once. Please select up to 5 files.');
        return;
      }

      // Pass all files to parent
      onReceiptSelect(imageFiles);
      
      // Show preview of first file only
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(imageFiles[0]);
    }
  };

  const handleCameraClick = () => cameraInputRef.current?.click();
  const handleUploadClick = () => fileInputRef.current?.click();

  const handleRemove = () => {
    setPreviewUrl(null);
    onReceiptSelect([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getStatusIcon = (status: 'pending' | 'processing' | 'ready' | 'error') => {
    switch (status) {
      case 'ready':
        return <CheckCircle size={16} style={{ color: 'var(--green-main)' }} />;
      case 'processing':
        return <Loader size={16} style={{ color: 'var(--golden-main)', animation: 'spin 1s linear infinite' }} />;
      case 'error':
        return <AlertCircle size={16} style={{ color: 'var(--error-text)' }} />;
      case 'pending':
        return <Clock size={16} style={{ color: 'var(--black-tertiary)' }} />;
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className="card-title" style={{ margin: 0 }}>Upload Receipt</h2>
        {queueInfo && queueInfo.total > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Queue progress badges */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {queueInfo.statuses?.map((status, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 10px',
                    backgroundColor: index === queueInfo.current - 1 
                      ? 'var(--golden-light)' 
                      : 'var(--ivory-darker)',
                    border: `2px solid ${index === queueInfo.current - 1 
                      ? 'var(--golden-main)' 
                      : 'var(--ivory-border)'}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    gap: '4px'
                  }}
                  title={`Receipt ${index + 1}: ${status}`}
                >
                  {getStatusIcon(status)}
                  {index + 1}
                </div>
              ))}
            </div>
            {/* Current count */}
            <div style={{
              padding: '8px 16px',
              backgroundColor: 'var(--golden-main)',
              border: '2px solid var(--black-text)',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--black-text)'
            }}>
              {queueInfo.current} / {queueInfo.total}
            </div>
          </div>
        )}
      </div>
      
      {!previewUrl ? (
        <div className="flex flex-col gap-base">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
              Scan or upload your receipt(s) to get started
            </p>
            <p style={{ color: 'var(--black-tertiary)', fontSize: '14px', marginBottom: '16px' }}>
              You can select up to 5 receipts at once
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
      
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
}
