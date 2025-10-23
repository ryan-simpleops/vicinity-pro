"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, MapPin, Phone, Globe, Truck, Mail } from 'lucide-react';
import { VendorEditDialog } from '@/components/VendorEditDialog';
import { useToast } from '@/hooks/use-toast';

interface Vendor {
  id: number;
  company_name: string;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  website: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  review_score: number;
  distance: number;
  services?: string[];
  number_of_trucks?: number;
  notes?: string;
  isSubmittedForCurrentOpportunity?: boolean;
}

interface VendorListProps {
  vendors: Vendor[];
  selectedVendors: number[];
  onVendorSelect: (vendorId: number, selected: boolean) => void;
  onVendorUpdated?: () => void;
}

const VendorList = ({ vendors, selectedVendors, onVendorSelect, onVendorUpdated }: VendorListProps) => {
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const { toast } = useToast();

  const serviceLabels: Record<string, string> = {
    waste_removal: 'Waste Removal',
    open_top_provider: 'Open Top',
    pressure_washer: 'Pressure Washing',
    hauler: 'Hauling',
    compactor_hauling: 'Compactor Hauling'
  };

  const sendEmail = async (vendor: Vendor) => {
    setSendingEmail(vendor.id);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: vendor.email,
          subject: 'New Opportunity from Simple Ops',
          html: `
            <h2>Hello ${vendor.name} ${vendor.last_name},</h2>
            <p>We have a new opportunity that matches your services at <strong>${vendor.company_name}</strong>.</p>
            <p>Please reply to this email if you're interested in learning more.</p>
            <br/>
            <p>Best regards,<br/>Simple Ops Team</p>
          `
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Email sent!",
          description: `Successfully sent email to ${vendor.company_name}`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const getVendorServices = (v: any): string[] => {
    if (Array.isArray(v?.services)) return v.services as string[];
    const keys = ['waste_removal','open_top_provider','pressure_washer','hauler','compactor_hauling'] as const;
    return keys.filter((k) => Boolean((v as any)?.[k]));
  };

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(score)
            ? 'fill-rating-gold text-rating-gold'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Available Vendors ({vendors?.length || 0})
        </h3>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {vendors?.map((vendor) => (
          <Card
            key={vendor.id}
            className={`p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
              selectedVendors.includes(vendor.id)
                ? 'bg-vendor-selected border-map-primary'
                : vendor.review_score === null
                ? 'bg-vendor-card border-dashed border-muted-foreground/40'
                : 'bg-vendor-card'
            }`}
            onClick={() => setEditingVendor(vendor)}
          >
            <div className="flex items-start gap-3">
              <Checkbox
                checked={selectedVendors.includes(vendor.id)}
                onChange={() => {}}
                className="mt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onVendorSelect(vendor.id, !selectedVendors.includes(vendor.id));
                }}
              />
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                     <div>
                      <h4 className="font-semibold text-foreground">
                        {vendor.company_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {vendor.name} {vendor.last_name}
                       </p>
                     </div>
                    <div className="flex items-center gap-2">
                     <div className="text-right">
                      <div className="flex items-center gap-1">
                        {renderStars(vendor.review_score || 0)}
                        <span className={`text-sm font-medium ml-1 ${vendor.review_score === null ? 'text-muted-foreground' : ''}`}>
                          {vendor.review_score || 'No rating'}
                        </span>
                      </div>
                       <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                         <MapPin className="h-3 w-3" />
                         {vendor.distance ? `${vendor.distance.toFixed(1)} miles` : 'Distance N/A'}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {getVendorServices(vendor).map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {serviceLabels[service] || service}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {vendor.city}, {vendor.state}
                  </div>
                  {vendor.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {vendor.phone}
                    </div>
                  )}
                  {vendor.website && (
                    <a 
                      href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-map-primary hover:text-map-primary/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="h-3 w-3" />
                      Website
                    </a>
                  )}
                  {vendor.number_of_trucks && (
                    <div className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {vendor.number_of_trucks} trucks
                    </div>
                   )}
                 </div>

                 {/* Show notes if available */}
                 {vendor.notes && (
                   <div className="mt-2 p-2 bg-secondary/50 rounded text-sm">
                     <strong>Notes:</strong> {vendor.notes}
                   </div>
                 )}

                 {/* Email button */}
                 {vendor.email && (
                   <Button
                     variant="outline"
                     size="sm"
                     className="mt-2 w-full"
                     onClick={(e) => {
                       e.stopPropagation();
                       sendEmail(vendor);
                     }}
                     disabled={sendingEmail === vendor.id}
                   >
                     <Mail className="h-4 w-4 mr-2" />
                     {sendingEmail === vendor.id ? 'Sending...' : 'Send Email'}
                   </Button>
                 )}
               </div>
             </div>
           </Card>
        ))}
      </div>

      {(!vendors || vendors.length === 0) && (
        <Card className="p-8 text-center bg-vendor-card">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-medium text-foreground mb-2">No vendors found</h4>
          <p className="text-sm text-muted-foreground">
            Enter a jobsite address to find vendors within 100 miles
          </p>
        </Card>
      )}

      {editingVendor && (
        <VendorEditDialog
          vendor={editingVendor}
          open={!!editingVendor}
          onOpenChange={(open) => !open && setEditingVendor(null)}
          onVendorUpdated={() => {
            onVendorUpdated?.();
            setEditingVendor(null);
          }}
        />
      )}
    </div>
  );
};

export default VendorList;