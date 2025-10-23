"use client";

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface VendorSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function VendorSearch({ onSearch, placeholder = "Search vendors by name or email..." }: VendorSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleSearchChange}
        className="pl-10"
      />
    </div>
  );
}