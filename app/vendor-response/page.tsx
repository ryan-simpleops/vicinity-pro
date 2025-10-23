"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VendorResponse = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  const vendorId = searchParams.get('vendor');
  const response = searchParams.get('response');
  const opportunityId = searchParams.get('opportunity');

  useEffect(() => {
    const handleResponse = async () => {
      if (!vendorId || !response || !opportunityId) {
        setStatus('error');
        setMessage('Invalid response link');
        return;
      }

      try {
        // Call edge function to handle the response
        const res = await fetch(`/api/vendor-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${""}`,
          },
          body: JSON.stringify({
            vendorId: parseInt(vendorId),
            response: response,
            opportunityId: opportunityId
          })
        });

        const result = await res.json();

        if (result.success) {
          setStatus('success');
          if (response === 'yes') {
            setMessage(result.message || 'Thank you for your interest! Check your email for the bid request form.');
          } else {
            setMessage(result.message || 'Thank you for your response. We\'ll keep you in mind for future opportunities.');
          }
        } else {
          throw new Error(result.error || 'Failed to process response');
        }
      } catch (error) {
        console.error('Error handling vendor response:', error);
        setStatus('error');
        setMessage('Failed to process your response. Please try again or contact us directly.');
      }
    };

    handleResponse();
  }, [vendorId, response, opportunityId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Processing your response...</h1>
            <p className="text-muted-foreground">Please wait a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            {response === 'yes' ? (
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            ) : (
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-blue-500" />
            )}
            <h1 className="text-2xl font-bold mb-4">
              {response === 'yes' ? 'Great News!' : 'Response Recorded'}
            </h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            {response === 'yes' && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Next Steps:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 text-left list-disc list-inside">
                  <li>Check your email for the bid request form link</li>
                  <li>Review the project details carefully</li>
                  <li>Submit your quote by the deadline</li>
                </ul>
              </div>
            )}
            <Button onClick={() => router.push('/')} className="mt-4">
              Return to Home
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-4">Oops!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Return to Home
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default VendorResponse;
