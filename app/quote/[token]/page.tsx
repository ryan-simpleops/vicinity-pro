"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2, DollarSign } from 'lucide-react';

export default function Quote() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<any>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');

  useEffect(() => {
    loadConversation();
  }, [token]);

  const loadConversation = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid quote link');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/quotes?conversationId=${token}`);
      const result = await res.json();

      if (!result.success || !result.conversation) {
        throw new Error('Conversation not found');
      }

      if (result.hasQuote) {
        setStatus('error');
        setMessage('You have already submitted a quote for this opportunity');
        setLoading(false);
        return;
      }

      setConversation(result.conversation);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
      setStatus('error');
      setMessage('Failed to load quote form. Please contact us directly.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quoteAmount || parseFloat(quoteAmount) <= 0) {
      setMessage('Please enter a valid quote amount');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: token,
          quoteAmount: parseFloat(quoteAmount),
          notes: notes || null,
          arrivalDate: arrivalDate || null,
          arrivalTime: arrivalTime || null
        })
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit quote');
      }

      setStatus('success');
      setMessage('Your quote has been submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting quote:', error);
      setStatus('error');
      setMessage('Failed to submit quote. Please try again or contact us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        {loading ? (
          <div className="text-center">
            <Loader2 className="h-16 w-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Loading quote form...</h1>
            <p className="text-muted-foreground">Please wait a moment</p>
          </div>
        ) : status === 'form' ? (
          <>
            <div className="text-center mb-6">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-blue-500" />
              <h1 className="text-3xl font-bold mb-2">Submit Your Quote</h1>
              <p className="text-muted-foreground">
                Please provide your quote amount and any additional details
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="quoteAmount">Quote Amount ($) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="quoteAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    className="pl-8"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arrivalDate">Expected Arrival Date</Label>
                  <Input
                    id="arrivalDate"
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrivalTime">Expected Arrival Time</Label>
                  <Input
                    id="arrivalTime"
                    type="time"
                    step="900"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    placeholder="--:--"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Include any relevant details about your quote, timeline, or terms..."
                  rows={4}
                />
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
                    Submitting...
                  </>
                ) : (
                  'Submit Quote'
                )}
              </Button>
            </form>
          </>
        ) : status === 'success' ? (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h1 className="text-2xl font-bold mb-4">Quote Submitted!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                What happens next?
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 text-left list-disc list-inside">
                <li>We'll review your quote along with other submissions</li>
                <li>You'll be notified if your bid is selected</li>
                <li>Feel free to reach out if you have any questions</li>
              </ul>
            </div>
            <Button onClick={() => router.push('/')} className="mt-4">
              Return to Home
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-4">Unable to Load Form</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Return to Home
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
