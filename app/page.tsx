"use client";
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VendorMap from '@/components/VendorMap';
import VendorList from '@/components/VendorList';
import VendorFilters from '@/components/VendorFilters';
import { VendorSearch } from '@/components/VendorSearch';
import ConversationManager from '@/components/ConversationManager';
import { MapPin, MessageCircle, Map, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import vendorsData from '@/data/vendors.json';

const tenthRockLogo = '/assets/tenth-rock-logo.png';

interface FilterState {
  jobTypes: string[];
  minReviewScore: number;
  includeNonRated: boolean;
}

const Index = () => {
  const [mapboxToken] = useState(process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwbWF0aXgiLCJhIjoiY21lY3l4bnJlMDRlejJ0cTdxaGhzNDVsbCJ9.Wxn9gxGD4baz_rv2OWJ8bg');
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    jobTypes: [],
    minReviewScore: 1.0,
    includeNonRated: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [jobsiteLocation, setJobsiteLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [opportunityId] = useState('demo-opportunity-id'); // Demo opportunity
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const { toast } = useToast();

  // Distance calculation function
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const applyAllFilters = async () => {
    // Load vendors from JSON file and apply any edits from localStorage
    const vendorEdits = JSON.parse(localStorage.getItem('vendorEdits') || '{}');
    let filtered = vendorsData.map(vendor => {
      const edits = vendorEdits[vendor.id];
      return edits ? { ...vendor, ...edits } : vendor;
    });

    // Apply service type filters
    if (filters.jobTypes.length > 0) {
      filtered = filtered.filter(vendor => {
        const hasRequiredService = filters.jobTypes.some(jobType => vendor[jobType]);
        return hasRequiredService;
      });
    }
    
    // Apply review score filter
    filtered = filtered.filter(vendor => {
      if (vendor.review_score !== null && vendor.review_score < filters.minReviewScore) {
        return false;
      }
      
      if (vendor.review_score === null && !filters.includeNonRated) {
        return false;
      }
      
      return true;
    });
    
    // Apply search query
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(vendor => {
        const matchesName = vendor.company_name?.toLowerCase().includes(searchTerm) ||
                           vendor.name?.toLowerCase().includes(searchTerm) ||
                           vendor.last_name?.toLowerCase().includes(searchTerm);
        const matchesEmail = vendor.email?.toLowerCase().includes(searchTerm);
        
        return matchesName || matchesEmail;
      });
    }
    
    // Apply geographic filter if jobsite is selected
    if (jobsiteLocation) {
      filtered = filtered.filter(vendor => {
        for (let i = 1; i <= 6; i++) {
          const latKey = `service_area_${i}_lat`;
          const lngKey = `service_area_${i}_lng`;
          
          if (vendor[latKey] && vendor[lngKey]) {
            const distance = calculateDistance(
              jobsiteLocation.lat, jobsiteLocation.lng,
              vendor[latKey], vendor[lngKey]
            );
            
            if (distance <= 200) {
              return true;
            }
          }
        }
        return false;
      }).map(vendor => {
        let minDistance = Infinity;
        for (let i = 1; i <= 6; i++) {
          const latKey = `service_area_${i}_lat`;
          const lngKey = `service_area_${i}_lng`;
          
          if (vendor[latKey] && vendor[lngKey]) {
            const distance = calculateDistance(
              jobsiteLocation.lat, jobsiteLocation.lng,
              vendor[latKey], vendor[lngKey]
            );
            minDistance = Math.min(minDistance, distance);
          }
        }
        
        return {
          ...vendor,
          distance: minDistance !== Infinity ? minDistance : null
        };
      });
    }
    
    setVendors(filtered);
  };

  // Event handlers
  const handleJobsiteSelected = (location: {lat: number, lng: number, address: string}) => {
    setJobsiteLocation(location);
  };

  const handleJobsiteCleared = () => {
    setJobsiteLocation(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleVendorSelect = (vendorId: number, selected: boolean) => {
    if (selected) {
      setSelectedVendors([...selectedVendors, vendorId]);
    } else {
      setSelectedVendors(selectedVendors.filter(id => id !== vendorId));
    }
  };

  const refreshVendors = () => {
    applyAllFilters();
  };

  const sendBulkEmail = async () => {
    if (selectedVendors.length === 0) {
      toast({
        title: "No vendors selected",
        description: "Please select vendors to email",
        variant: "destructive",
      });
      return;
    }

    setSendingBulkEmail(true);
    const selectedVendorData = vendorsData.filter(v => selectedVendors.includes(v.id));

    // Get project location
    const projectLocation = jobsiteLocation?.address || 'Location to be determined';

    try {
      // Send emails to all selected vendors
      const emailPromises = selectedVendorData.map(async (vendor) => {
        // Create response tracking URLs
        const baseUrl = window.location.origin;
        const yesUrl = `${baseUrl}/vendor-response?vendor=${vendor.id}&response=yes&opportunity=${opportunityId}`;
        const noUrl = `${baseUrl}/vendor-response?vendor=${vendor.id}&response=no&opportunity=${opportunityId}`;

        // Create conversation record
        await fetch('/api/conversations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendorId: vendor.id,
            opportunityId,
            vendorEmail: vendor.email
          })
        });

        // Send email
        return fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: vendor.email,
            subject: 'New Project Opportunity - Waste Management Services',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Hello ${vendor.name} ${vendor.last_name},</h2>

                <p>We have a new project opportunity that matches your services at <strong>${vendor.company_name}</strong>.</p>

                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #555;">Project Details:</h3>
                  <p><strong>Location:</strong> ${projectLocation}</p>
                  <p><strong>Services Needed:</strong> Waste Removal & Hauling</p>
                  <p><strong>Project Type:</strong> Commercial Property</p>
                </div>

                <p><strong>Are you interested in this opportunity?</strong></p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${yesUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 10px;">
                    ✓ Yes, I'm Interested
                  </a>
                  <a href="${noUrl}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 10px;">
                    ✗ No, Thanks
                  </a>
                </div>

                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                  If you're interested, we'll follow up with complete project specifications, bid request form, and timeline.
                </p>

                <p style="margin-top: 30px;">Best regards,<br/><strong>Simple Ops Team</strong><br/>ryane@trysimpleops.com</p>
              </div>
            `
          })
        });
      });

      await Promise.all(emailPromises);

      toast({
        title: "Emails sent!",
        description: `Successfully sent ${selectedVendors.length} email${selectedVendors.length > 1 ? 's' : ''} with response buttons`,
      });

      // Clear selection
      setSelectedVendors([]);
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast({
        title: "Failed to send emails",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSendingBulkEmail(false);
    }
  };

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyAllFilters();
  }, [filters, searchQuery, jobsiteLocation]);

  // Run cleanup on page load
  useEffect(() => {
    fetch('/api/cleanup').catch(err => console.error('Cleanup failed:', err));
  }, []);


  return (
    <div className="h-screen bg-background flex flex-col">
      <Tabs defaultValue="map" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4 pt-4 pb-2 bg-vendor-card flex-shrink-0">
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-foreground">Vicinity Pro</h1>
            <p className="text-sm text-muted-foreground">Vendor Management Demo</p>
          </div>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="map">
              <Map className="h-4 w-4 mr-2" />
              Vendor Map
            </TabsTrigger>
            <TabsTrigger value="conversations">
              <MessageCircle className="h-4 w-4 mr-2" />
              Conversations
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="flex-1 m-0 overflow-hidden">
          <div className="grid grid-cols-12 h-full">
            {/* Sidebar */}
            <div className="col-span-3 bg-vendor-card border-r border-border overflow-y-auto">
              <div className="p-4 space-y-4">
                <VendorFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                />

                <VendorSearch
                  onSearch={handleSearch}
                  placeholder="Search vendors by name or email..."
                />

                {/* Bulk Email Button */}
                {selectedVendors.length > 0 && (
                  <Button
                    onClick={sendBulkEmail}
                    disabled={sendingBulkEmail}
                    className="w-full"
                    size="lg"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingBulkEmail
                      ? 'Sending...'
                      : `Email ${selectedVendors.length} Vendor${selectedVendors.length > 1 ? 's' : ''}`
                    }
                  </Button>
                )}

                <VendorList
                  vendors={vendors}
                  selectedVendors={selectedVendors}
                  onVendorSelect={handleVendorSelect}
                  onVendorUpdated={refreshVendors}
                />
              </div>
            </div>

            {/* Map */}
            <div className="col-span-9 h-full">
              <VendorMap
                mapboxToken={mapboxToken}
                onJobsiteSelected={handleJobsiteSelected}
                onJobsiteCleared={handleJobsiteCleared}
                filteredVendors={vendors}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="flex-1 m-0 p-4">
          <ConversationManager opportunityId={opportunityId} vendors={vendorsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;