"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Send,
  DollarSign,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  vendor_id: number;
  opportunity_id: string;
  vendor_email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  subject: string;
  message_body: string;
  created_at: string;
}

interface Quote {
  id: string;
  conversation_id: string;
  vendor_id: number;
  opportunity_id: string;
  quote_amount: number;
  notes: string | null;
  submitted_at: string;
}

interface ConversationManagerProps {
  opportunityId: string;
  vendors: any[];
}

export default function ConversationManager({ opportunityId, vendors }: ConversationManagerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
    fetchAllQuotes();
  }, [opportunityId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      fetchQuoteForConversation(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch(`/api/conversations?opportunityId=${opportunityId}`);
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    }
  };

  const fetchAllQuotes = async () => {
    try {
      const response = await fetch(`/api/quotes?opportunityId=${opportunityId}`);
      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      setQuotes([]);
    }
  };

  const fetchQuoteForConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/quotes?conversationId=${conversationId}`);
      const data = await response.json();
      if (data.quote) {
        setQuotes(prev => {
          const filtered = prev.filter(q => q.conversation_id !== conversationId);
          return [...filtered, data.quote];
        });
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    }
  };

  const sendEmail = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedConversation.vendor_email,
          subject: 'Re: Opportunity Update',
          html: `<p>${newMessage.replace(/\n/g, '<br>')}</p>`
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Email sent!",
          description: "Your message has been sent to the vendor",
        });
        setNewMessage('');
        fetchMessages(selectedConversation.id);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
      interested: { color: 'bg-blue-500', icon: MessageCircle, label: 'Interested' },
      not_interested: { color: 'bg-gray-500', icon: XCircle, label: 'Not Interested' },
      quoted: { color: 'bg-purple-500', icon: DollarSign, label: 'Quoted' },
      awarded: { color: 'bg-green-500', icon: CheckCircle2, label: 'Awarded' },
      declined: { color: 'bg-red-500', icon: XCircle, label: 'Declined' },
      agreement_signed: { color: 'bg-emerald-600', icon: CheckCircle2, label: 'Agreement Signed' },
      po_issued: { color: 'bg-teal-600', icon: CheckCircle2, label: 'PO Issued' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const approveQuote = async (conversationId: string) => {
    if (approvingQuote) return; // Prevent double-click

    setApprovingQuote(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Quote approved!",
          description: `Agreement sent. ${result.rejectedCount} other vendor(s) notified.`,
        });
        fetchConversations();
        fetchAllQuotes();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error approving quote:', error);
      toast({
        title: "Failed to approve quote",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setApprovingQuote(false);
    }
  };

  const getVendorName = (vendorId: number) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor ? vendor.company_name : 'Unknown Vendor';
  };

  if (loading) {
    return <div className="p-4">Loading conversations...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Conversation List */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>{conversations.length} vendor{conversations.length !== 1 ? 's' : ''} contacted</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm">Email vendors to start</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Card
                    key={conv.id}
                    className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                      selectedConversation?.id === conv.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{getVendorName(conv.vendor_id)}</span>
                        {getStatusBadge(conv.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{conv.vendor_email}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>
            {selectedConversation ? getVendorName(selectedConversation.vendor_id) : 'Select a conversation'}
          </CardTitle>
          {selectedConversation && (
            <CardDescription className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {selectedConversation.vendor_email}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!selectedConversation ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to view messages</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Messages */}
              <ScrollArea className="h-64 border rounded-lg p-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg ${
                          msg.direction === 'outbound'
                            ? 'bg-blue-50 ml-12'
                            : 'bg-gray-50 mr-12'
                        }`}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {msg.direction === 'outbound' ? 'You' : getVendorName(selectedConversation.vendor_id)} • {new Date(msg.created_at).toLocaleString()}
                        </div>
                        {msg.subject && <div className="font-medium text-sm mb-1">{msg.subject}</div>}
                        <div className="text-sm">{msg.message_body}</div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Quote Display */}
              {quotes.find(q => q.conversation_id === selectedConversation.id) && (
                <Card className={`${selectedConversation.status === 'awarded' ? 'bg-emerald-50 border-emerald-200' : 'bg-green-50 border-green-200'}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className={`h-5 w-5 ${selectedConversation.status === 'awarded' ? 'text-emerald-600' : 'text-green-600'}`} />
                        <span className={`font-semibold ${selectedConversation.status === 'awarded' ? 'text-emerald-900' : 'text-green-900'}`}>
                          {selectedConversation.status === 'awarded' ? 'Awarded Quote' : 'Quote Received'}
                        </span>
                      </div>
                      {selectedConversation.status === 'quoted' && (
                        <Button
                          onClick={() => approveQuote(selectedConversation.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={approvingQuote}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {approvingQuote ? 'Approving...' : 'Approve & Award'}
                        </Button>
                      )}
                    </div>
                    {quotes.filter(q => q.conversation_id === selectedConversation.id).map(quote => (
                      <div key={quote.id}>
                        <div className={`text-2xl font-bold mb-2 ${selectedConversation.status === 'awarded' ? 'text-emerald-900' : 'text-green-900'}`}>
                          ${quote.quote_amount.toLocaleString()}
                        </div>
                        {quote.notes && (
                          <p className={`text-sm mb-2 ${selectedConversation.status === 'awarded' ? 'text-emerald-800' : 'text-green-800'}`}>{quote.notes}</p>
                        )}
                        {(quote as any).arrival_date && (
                          <p className={`text-sm ${selectedConversation.status === 'awarded' ? 'text-emerald-800' : 'text-green-800'}`}>
                            <strong>Arrival:</strong> {(quote as any).arrival_date} {(quote as any).arrival_time && `at ${(quote as any).arrival_time}`}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* New Message */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={sendEmail}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingMessage ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
