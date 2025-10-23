"use client";

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Image, Check, Eye, Download, Upload, Plus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VendorMapProps {
  mapboxToken: string;
  onJobsiteSelected: (location: { lat: number; lng: number; address: string }) => void;
  onJobsiteCleared: () => void;
  filteredVendors: any[];
}

const VendorMap = ({ mapboxToken, onJobsiteSelected, onJobsiteCleared, filteredVendors }: VendorMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [jobsiteAddress, setJobsiteAddress] = useState('');
  const [jobsiteLocation, setJobsiteLocation] = useState<[number, number] | null>(null);
  const jobsiteMarker = useRef<mapboxgl.Marker | null>(null);
  const vendorMarkers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Prevent re-initialization

    // Set token globally before creating map
    mapboxgl.accessToken = mapboxToken;

    // Create map instance
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-95.7129, 37.0902],
      zoom: 4,
      attributionControl: true,
    });

    // Add navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Wait for style to load
    mapInstance.on('style.load', () => {
      console.log('Style loaded');
    });

    mapInstance.on('load', () => {
      console.log('Map ready');
      mapInstance.resize();
    });

    mapInstance.on('error', (e) => {
      console.error('Mapbox error:', e.error);
    });

    map.current = mapInstance;

    return () => {
      mapInstance.remove();
      map.current = null;
    };
  }, []);


  // Show filtered vendors on map
  useEffect(() => {
    if (filteredVendors && filteredVendors.length >= 0) {
      showVendorsOnMap(filteredVendors);
    }
  }, [filteredVendors]);


  const showVendorsOnMap = (vendors: any[]) => {
    if (!map.current) return;

    // Clear existing vendor markers
    vendorMarkers.current.forEach(marker => marker.remove());
    vendorMarkers.current = [];

    // Add markers for vendors with valid locations
    vendors.forEach(vendor => {
      // Add markers for all service areas (1-6)
      for (let i = 1; i <= 6; i++) {
        const latKey = `service_area_${i}_lat`;
        const lngKey = `service_area_${i}_lng`;
        const areaKey = `service_area_${i}`;
        
        if (vendor[latKey] && vendor[lngKey]) {
          const isPrimary = i === 1;
          const marker = new mapboxgl.Marker({ 
            color: '#10B981', // All vendor pins same green color
            scale: 0.8 // All vendor pins same size
          })
            .setLngLat([vendor[lngKey], vendor[latKey]])
            .setPopup(new mapboxgl.Popup().setHTML(`
              <div class="p-2">
                <h3 class="font-semibold">${vendor.company_name}</h3>
                <p class="text-sm text-gray-600">${vendor.phone || 'No phone'}</p>
                <p class="text-sm text-gray-600">${vendor.email || 'No email'}</p>
              </div>
            `))
            .addTo(map.current);
          
          vendorMarkers.current.push(marker);
        }
      }
    });
  };

  const searchJobsite = async () => {
    if (!jobsiteAddress.trim()) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(jobsiteAddress)}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        selectJobsite(lat, lng, jobsiteAddress);
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
    }
  };

  const selectJobsite = (lat: number, lng: number, name: string) => {
    setJobsiteLocation([lng, lat]);
    setJobsiteAddress(name);

    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 12,
        duration: 2000
      });

      if (jobsiteMarker.current) {
        jobsiteMarker.current.remove();
      }

      jobsiteMarker.current = new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-semibold">Jobsite Location</h3>
            <p class="text-sm text-gray-600">${name}</p>
          </div>
        `))
        .addTo(map.current);
    }

    onJobsiteSelected({ lat, lng, address: name });
  };

  const clearJobsite = () => {
    setJobsiteAddress('');
    setJobsiteLocation(null);
    
    if (jobsiteMarker.current) {
      jobsiteMarker.current.remove();
      jobsiteMarker.current = null;
    }
    
    onJobsiteCleared();
  };

  return (
    <div className="relative w-full h-full">
      {/* Jobsite Search Interface */}
      <Card className="absolute top-4 left-4 z-10 p-4 w-80 bg-vendor-card shadow-lg">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Search Jobsite Address</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter address..."
                value={jobsiteAddress}
                onChange={(e) => setJobsiteAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchJobsite()}
              />
              <Button onClick={searchJobsite} size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {jobsiteLocation && (
            <div className="bg-vendor-card border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Selected Jobsite
                </h4>
                <Button onClick={clearJobsite} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
              <p className="text-sm text-muted-foreground break-words">{jobsiteAddress}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ position: 'absolute', inset: 0 }}
      />
    </div>
  );
};

export default VendorMap;