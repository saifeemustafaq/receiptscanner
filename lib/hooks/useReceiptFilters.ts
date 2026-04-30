'use client';

import { useState, useMemo } from 'react';
import { SavedReceipt } from '@/lib/types';

export type SortOption =
  | 'billingDateDesc'
  | 'billingDateAsc'
  | 'uploadDateDesc'
  | 'uploadDateAsc'
  | 'totalDesc'
  | 'totalAsc'
  | 'storeAsc'
  | 'storeDesc';

export interface ReceiptFiltersState {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  selectedStores: string[];
  toggleStoreFilter: (store: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  minAmount: string;
  setMinAmount: (v: string) => void;
  maxAmount: string;
  setMaxAmount: (v: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  filteredAndSortedReceipts: SavedReceipt[];
}

export function useReceiptFilters(receipts: SavedReceipt[]): ReceiptFiltersState {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('billingDateDesc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const filteredAndSortedReceipts = useMemo(() => {
    let filtered = [...receipts];

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.storeNameSelected.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.storeNameScanned.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedStores.length > 0) {
      filtered = filtered.filter(r => selectedStores.includes(r.storeNameSelected));
    }
    if (dateFrom) filtered = filtered.filter(r => r.billingDate >= dateFrom);
    if (dateTo) filtered = filtered.filter(r => r.billingDate <= dateTo);
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) filtered = filtered.filter(r => r.extractedData.total >= min);
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) filtered = filtered.filter(r => r.extractedData.total <= max);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'billingDateDesc': return new Date(b.billingDate).getTime() - new Date(a.billingDate).getTime();
        case 'billingDateAsc':  return new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime();
        case 'uploadDateDesc':  return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        case 'uploadDateAsc':   return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
        case 'totalDesc':  return b.extractedData.total - a.extractedData.total;
        case 'totalAsc':   return a.extractedData.total - b.extractedData.total;
        case 'storeAsc':   return a.storeNameSelected.localeCompare(b.storeNameSelected);
        case 'storeDesc':  return b.storeNameSelected.localeCompare(a.storeNameSelected);
        default: return 0;
      }
    });

    return filtered;
  }, [receipts, searchTerm, sortBy, selectedStores, dateFrom, dateTo, minAmount, maxAmount]);

  const toggleStoreFilter = (store: string) => {
    setSelectedStores(prev =>
      prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStores([]);
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
  };

  const hasActiveFilters = Boolean(searchTerm || selectedStores.length || dateFrom || dateTo || minAmount || maxAmount);

  return {
    searchTerm, setSearchTerm,
    sortBy, setSortBy,
    showFilters, setShowFilters,
    selectedStores, toggleStoreFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    clearFilters,
    hasActiveFilters,
    filteredAndSortedReceipts,
  };
}
