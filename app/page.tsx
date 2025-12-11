'use client';

import { useState, useEffect } from 'react';
import { Save, Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ReceiptUpload from './components/ReceiptUpload';
import StoreSelection from './components/StoreSelection';
import DatePicker from './components/DatePicker';
import ExtractedDataDisplay, { ExtractedData } from './components/ExtractedDataDisplay';
import ReceiptHistory from './components/ReceiptHistory';
import Settings from './components/Settings';
import Button from './components/Button';

interface SavedReceipt {
  id: string;
  storeNameScanned: string;
  storeNameSelected: string;
  billingDate: string;      // Date on the receipt
  uploadDate: string;        // Date when uploaded
  extractedData: ExtractedData;
  timestamp: string;
}

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'history' | 'settings'>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [billingDate, setBillingDate] = useState(''); // Empty by default, will be filled from receipt
  const [stores, setStores] = useState<string[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [uploadKey, setUploadKey] = useState(0); // Key to force ReceiptUpload remount

  // Load data from server on mount
  useEffect(() => {
    loadReceipts();
    loadStores();
  }, []);

  const loadReceipts = async () => {
    try {
      const response = await fetch('/api/receipts');
      const data = await response.json();
      if (data.success) {
        setReceipts(data.receipts);
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  const loadStores = () => {
    const savedStores = localStorage.getItem('stores');
    if (savedStores) {
      try {
        setStores(JSON.parse(savedStores));
      } catch (e) {
        setStores(['Walmart', 'Target', 'Costco', 'Whole Foods', 'Kroger']);
      }
    } else {
      setStores(['Walmart', 'Target', 'Costco', 'Whole Foods', 'Kroger']);
    }
  };

  // Save stores to localStorage whenever they change
  useEffect(() => {
    if (stores.length > 0) {
      localStorage.setItem('stores', JSON.stringify(stores));
    }
  }, [stores]);

  // Process receipt when file is selected
  useEffect(() => {
    if (selectedFile) {
      processReceipt(selectedFile);
    }
  }, [selectedFile]);

  const processReceipt = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process receipt');
      }

      const result = await response.json();
      setExtractedData(result.data);
      
      // Auto-populate billing date from extracted receipt date
      if (result.data.receiptDate) {
        setBillingDate(result.data.receiptDate);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing the receipt');
      console.error('Error processing receipt:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddStore = (newStore: string) => {
    setStores([...stores, newStore]);
  };

  const handleDeleteStore = (store: string) => {
    setStores(stores.filter(s => s !== store));
  };

  const handleSaveReceipt = async () => {
    if (!extractedData || !selectedStore) {
      alert('Please select a store and process a receipt first');
      return;
    }

    if (!billingDate) {
      alert('Please enter the billing date from the receipt');
      return;
    }

    // Get current date in Pacific Time
    const now = new Date();
    const pacificTimeString = now.toLocaleString('en-US', { 
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = pacificTimeString.split(/[/, ]/);
    const uploadDate = `${year}-${month}-${day}`;

    const newReceipt: SavedReceipt = {
      id: Date.now().toString(),
      storeNameScanned: extractedData.storeNameScanned || 'Unknown',
      storeNameSelected: selectedStore,
      billingDate: billingDate,        // Date from the receipt
      uploadDate: uploadDate,          // Today's date in Pacific Time
      extractedData,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceipt),
      });

      const result = await response.json();

      if (result.success) {
        alert('Receipt saved successfully!');
        
        // Reload receipts
        await loadReceipts();
        
        // Reset form to default upload screen
        resetForm();
      } else {
        alert('Failed to save receipt: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Failed to save receipt');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setSelectedStore('');
    setBillingDate(''); // Reset to empty
    setError(null);
    setUploadKey(prev => prev + 1); // Force ReceiptUpload to remount
  };

  const handleDeleteReceipt = async (id: string) => {
    try {
      const response = await fetch(`/api/receipts?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await loadReceipts();
      } else {
        alert('Failed to delete receipt: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      alert('Failed to delete receipt');
    }
  };

  const handleUpdateReceipt = async (id: string, updates: any) => {
    try {
      const response = await fetch('/api/receipts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });

      const result = await response.json();

      if (result.success) {
        await loadReceipts();
      } else {
        alert('Failed to update receipt: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating receipt:', error);
      alert('Failed to update receipt');
    }
  };

  const handleExportReceipts = async () => {
    if (receipts.length === 0) {
      alert('No receipts to export');
      return;
    }

    try {
      const response = await fetch('/api/receipts?action=export&format=json');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipts-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting receipts:', error);
      alert('Failed to export receipts');
    }
  };

  const handleClearAllData = () => {
    localStorage.removeItem('stores');
    setStores(['Walmart', 'Target', 'Costco', 'Whole Foods', 'Kroger']);
    alert('Local store settings cleared');
  };

  const handleNavigate = (view: 'home' | 'history' | 'settings') => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  return (
    <div className="app-container">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <Sidebar 
        currentView={currentView}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
      />

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {currentView === 'home' && (
            <>
              <header className="page-header">
                <h1 className="page-title">Receipt Scanner</h1>
                <p className="page-subtitle">
                  Scan, extract, and organize your receipts
                </p>
              </header>

              <div className="content-section">
                <ReceiptUpload 
                  key={uploadKey}
                  onReceiptSelect={setSelectedFile}
                  selectedFile={selectedFile}
                />

                {selectedFile && (
                  <div className="grid-2">
                    <StoreSelection
                      selectedStore={selectedStore}
                      onStoreChange={setSelectedStore}
                      stores={stores}
                      onAddStore={handleAddStore}
                    />
                    <DatePicker
                      selectedDate={billingDate}
                      onDateChange={setBillingDate}
                    />
                  </div>
                )}

                {selectedFile && (
                  <ExtractedDataDisplay
                    data={extractedData}
                    isProcessing={isProcessing}
                    error={error}
                  />
                )}

                {extractedData && !isProcessing && !error && (
                  <div className="flex flex-wrap gap-base justify-center">
                    <Button 
                      variant="success" 
                      onClick={handleSaveReceipt}
                      disabled={!selectedStore}
                    >
                      <Save size={20} />
                      Save Receipt
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => handleNavigate('history')}
                    >
                      View History ({receipts.length})
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {currentView === 'history' && (
            <ReceiptHistory
              receipts={receipts}
              stores={stores}
              onDelete={handleDeleteReceipt}
              onUpdate={handleUpdateReceipt}
              onExport={handleExportReceipts}
            />
          )}

          {currentView === 'settings' && (
            <Settings
              stores={stores}
              onAddStore={handleAddStore}
              onDeleteStore={handleDeleteStore}
              onClearAllData={handleClearAllData}
            />
          )}
        </div>
      </main>
    </div>
  );
}
