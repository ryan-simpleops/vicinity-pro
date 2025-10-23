"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Star } from 'lucide-react';

interface FilterState {
  jobTypes: string[];
  minReviewScore: number;
  includeNonRated: boolean;
}

interface VendorFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const VendorFilters = ({ filters, onFiltersChange }: VendorFiltersProps) => {
  const jobTypes = [
    { id: 'waste_removal', label: 'Waste Removal' },
    { id: 'open_top_provider', label: 'Open Top Provider' },
    { id: 'pressure_washer', label: 'Pressure Washing' },
    { id: 'hauler', label: 'Hauling' },
    { id: 'compactor_hauling', label: 'Compactor Hauling' }
  ];

  const handleJobTypeChange = (jobType: string, checked: boolean) => {
    const newJobTypes = checked
      ? [...filters.jobTypes, jobType]
      : filters.jobTypes.filter(type => type !== jobType);
    
    onFiltersChange({
      ...filters,
      jobTypes: newJobTypes
    });
  };

  const handleReviewScoreChange = (value: number[]) => {
    onFiltersChange({
      ...filters,
      minReviewScore: value[0]
    });
  };

  const handleIncludeNonRatedChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      includeNonRated: checked
    });
  };

  return (
    <Card className="p-6 space-y-6 bg-vendor-card">
      <div>
        <h3 className="text-lg font-semibold mb-4">Filter Vendors</h3>
        
        {/* Job Types */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-foreground">Service Types</h4>
          <div className="space-y-3">
            {jobTypes.map((jobType) => (
              <div key={jobType.id} className="flex items-center space-x-2">
                <Checkbox
                  id={jobType.id}
                  checked={filters.jobTypes.includes(jobType.id)}
                  onCheckedChange={(checked) => 
                    handleJobTypeChange(jobType.id, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={jobType.id}
                  className="text-sm font-normal cursor-pointer"
                >
                  {jobType.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Review Score */}
        <div className="space-y-4 pt-6">
          <h4 className="font-medium text-sm text-foreground">Minimum Review Score</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-rating-gold text-rating-gold" />
              <span className="text-sm font-medium">{filters.minReviewScore.toFixed(1)}+</span>
            </div>
            <Slider
              value={[filters.minReviewScore]}
              onValueChange={handleReviewScoreChange}
              max={5}
              min={1}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.0</span>
              <span>5.0</span>
            </div>
            <div className="flex items-center space-x-2 mt-3">
              <Checkbox
                id="includeNonRated"
                checked={filters.includeNonRated}
                onCheckedChange={(checked) => 
                  handleIncludeNonRatedChange(checked as boolean)
                }
              />
              <Label 
                htmlFor="includeNonRated"
                className="text-sm font-normal cursor-pointer"
              >
                Include non-rated vendors
              </Label>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VendorFilters;