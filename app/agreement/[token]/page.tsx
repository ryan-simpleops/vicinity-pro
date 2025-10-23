"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Loader2, FileText, PenTool } from 'lucide-react';

export default function Agreement() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    loadAgreement();
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const loadAgreement = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid agreement link');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/quotes?conversationId=${token}`);
      const result = await res.json();

      if (!result.success || !result.conversation) {
        throw new Error('Agreement not found');
      }

      if (result.conversation.status === 'agreement_signed') {
        setStatus('error');
        setMessage('This agreement has already been signed');
        setLoading(false);
        return;
      }

      if (result.conversation.status !== 'awarded') {
        setStatus('error');
        setMessage('This agreement is not yet available');
        setLoading(false);
        return;
      }

      setConversation(result.conversation);
      setQuote(result.quote);

      // Fetch vendor info
      const vendorRes = await fetch(`/api/vendors/${result.conversation.vendor_id}`);
      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        setVendor(vendorData.vendor);
        setFullName(`${vendorData.vendor.name} ${vendorData.vendor.last_name}`);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading agreement:', error);
      setStatus('error');
      setMessage('Failed to load agreement. Please contact us directly.');
      setLoading(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !title) {
      setMessage('Please fill in all required fields');
      return;
    }

    if (!hasSignature) {
      setMessage('Please provide your signature');
      return;
    }

    setSubmitting(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Signature canvas not found');

      const signatureData = canvas.toDataURL('image/png');

      const res = await fetch('/api/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: token,
          fullName,
          title,
          signature: signatureData
        })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to sign agreement');
      }

      setStatus('success');
      setMessage('Agreement signed successfully! Your purchase order has been generated.');
    } catch (error: any) {
      console.error('Error signing agreement:', error);
      setStatus('error');
      setMessage('Failed to sign agreement. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <Card className="p-8 text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Loading agreement...</h1>
            <p className="text-muted-foreground">Please wait a moment</p>
          </Card>
        ) : status === 'form' ? (
          <form onSubmit={handleSubmit}>
            <Card className="p-8">
              <div className="text-center mb-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                <h1 className="text-3xl font-bold mb-2">Service Agreement</h1>
                <p className="text-muted-foreground">
                  Please review and sign this agreement to proceed
                </p>
              </div>

              <div className="space-y-6">
                {/* Agreement Details */}
                <div className="bg-secondary/20 p-6 rounded-lg space-y-4">
                  <h2 className="text-xl font-semibold">Agreement Details</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor</p>
                      <p className="font-medium">{vendor?.company_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-medium">{vendor?.name} {vendor?.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bid Amount</p>
                      <p className="font-medium text-2xl text-green-600">${quote?.quote_amount.toLocaleString()}</p>
                    </div>
                    {quote?.arrival_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Arrival</p>
                        <p className="font-medium">{quote.arrival_date} {quote.arrival_time && `at ${quote.arrival_time}`}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Agreement Terms */}
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold mb-4">Terms and Conditions</h3>
                  <div className="space-y-3 text-sm">
                    <p>This Service Agreement ("Agreement") is entered into between Simple Ops ("Client") and {vendor?.company_name} ("Vendor").</p>

                    <p><strong>1. Services:</strong> Vendor agrees to provide waste management services as outlined in the project specifications.</p>

                    <p><strong>2. Payment:</strong> Client agrees to pay Vendor the amount of ${quote?.quote_amount.toLocaleString()} upon completion of services to Client's satisfaction.</p>

                    <p><strong>3. Schedule:</strong> Services will be performed on or around {quote?.arrival_date || 'the agreed upon date'}.</p>

                    <p><strong>4. Insurance:</strong> Vendor certifies that they maintain appropriate insurance coverage for all services provided.</p>

                    <p><strong>5. Compliance:</strong> Vendor agrees to comply with all applicable federal, state, and local laws and regulations.</p>

                    <p><strong>6. Termination:</strong> Either party may terminate this agreement with 48 hours written notice.</p>
                  </div>
                </div>

                <Separator />

                {/* Signature Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Signature</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Owner, Manager"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Electronic Signature *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="border-2 border-dashed rounded-lg p-2 bg-white">
                      <canvas
                        ref={canvasRef}
                        width={700}
                        height={150}
                        className="w-full cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <PenTool className="h-3 w-3" />
                      Draw your signature above using your mouse or touchscreen
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      By signing this agreement, you confirm that you are authorized to enter into this agreement on behalf of {vendor?.company_name} and agree to the terms outlined above.
                    </p>
                  </div>
                </div>

                {message && (
                  <div className="bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 p-3 rounded-lg text-sm">
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Sign Agreement
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        ) : status === 'success' ? (
          <Card className="p-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold mb-4">Agreement Signed!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                What happens next?
              </p>
              <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1 text-left list-disc list-inside">
                <li>Your purchase order has been generated</li>
                <li>You'll receive a confirmation email with project details</li>
                <li>We'll contact you to finalize logistics</li>
              </ul>
            </div>
            <Button onClick={() => router.push('/')} className="mt-4">
              Return to Home
            </Button>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-4">Unable to Load Agreement</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Return to Home
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
