"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VendorEditDialogProps {
  vendor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVendorUpdated: () => void;
}

export function VendorEditDialog({ vendor, open, onOpenChange, onVendorUpdated }: VendorEditDialogProps) {
  const [editedVendor, setEditedVendor] = useState(vendor);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: editedVendor.email,
          phone: editedVendor.phone,
          review_score: editedVendor.review_score,
          notes: editedVendor.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update vendor');
      }

      toast({
        title: "Vendor updated",
        description: "Vendor information updated successfully",
      });
      onVendorUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating vendor:', error);
      toast({
        title: "Update failed",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`h-6 w-6 cursor-pointer transition-colors ${
              i < Math.floor(editedVendor.review_score || 0)
                ? 'fill-rating-gold text-rating-gold'
                : 'text-gray-300 hover:text-rating-gold'
            }`}
            onClick={() => setEditedVendor({
              ...editedVendor,
              review_score: i + 1
            })}
          />
        ))}
        <span className="ml-2 text-sm font-medium">
          {editedVendor.review_score || 0}/5
        </span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vendor Review & Notes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Vendor Information (Read-only) */}
          <div className="bg-secondary/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Vendor Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Company:</span> {editedVendor.company_name}
              </div>
              <div>
                <span className="font-medium">Contact:</span> {editedVendor.name} {editedVendor.last_name}
              </div>
              <div>
                <span className="font-medium">Location:</span> {editedVendor.city}, {editedVendor.state}
              </div>
              <div>
                <span className="font-medium">Address:</span> {editedVendor.street_address}
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address..."
                value={editedVendor.email || ''}
                onChange={(e) => setEditedVendor({
                  ...editedVendor,
                  email: e.target.value
                })}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number..."
                value={editedVendor.phone || ''}
                onChange={(e) => setEditedVendor({
                  ...editedVendor,
                  phone: e.target.value
                })}
              />
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="review_score">Review Score</Label>
              {renderStarRating()}
            </div>

            <div className="flex flex-col space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this vendor..."
                rows={4}
                value={editedVendor.notes || ''}
                onChange={(e) => setEditedVendor({
                  ...editedVendor,
                  notes: e.target.value
                })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}