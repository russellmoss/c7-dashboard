"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Plus, Archive, MessageSquare, Users, Calendar, Phone, Clock, Check, CheckCheck } from "lucide-react";
import { EmailSubscription } from "@/types/email";

interface TextCampaign {
  _id?: string;
  name: string;
  message: string;
  subscribers: string[];
  status: "active" | "archived";
  createdAt: Date;
  sentAt?: Date;
  replies: TextReply[];
}

interface TextReply {
  _id?: string;
  campaignId: string;
  fromPhone: string;
  fromName: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isSentMessage?: boolean;
}

export default function TextCampaignsPage() {
  const [campaigns, setCampaigns] = useState<TextCampaign[]>([]);
  const [subscribers, setSubscribers] = useState<EmailSubscription[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<TextCampaign | null>(null);
  const [selectedReplies, setSelectedReplies] = useState<TextReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);

  // Form state for new campaign
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message: "",
    selectedSubscribers: [] as string[],
  });

  useEffect(() => {
    fetchCampaigns();
    fetchSubscribers();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchCampaigns, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch("/api/admin/text-campaigns");
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
        
        // Update selected campaign if it's open
        if (selectedCampaign) {
          const updatedCampaign = data.find((c: TextCampaign) => c._id === selectedCampaign._id);
          if (updatedCampaign) {
            setSelectedCampaign(updatedCampaign);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const response = await fetch("/api/admin/subscriptions");
      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.filter((sub: EmailSubscription) => sub.smsCoaching?.isActive));
      }
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    }
  };

  const getCampaignSubscribers = () => {
    if (!selectedCampaign) return [];
    return subscribers.filter(sub => 
      selectedCampaign.subscribers.includes(sub._id!)
    );
  };

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch("/api/admin/text-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaign.name,
          message: newCampaign.message,
          subscribers: newCampaign.selectedSubscribers,
        }),
      });

      if (response.ok) {
        setNewCampaign({ name: "", message: "", selectedSubscribers: [] });
        setIsCreateModalOpen(false);
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/admin/text-campaigns/${campaignId}/send`, {
        method: "POST",
      });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error sending campaign:", error);
    }
  };

  const handleArchiveCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/admin/text-campaigns/${campaignId}/archive`, {
        method: "PUT",
      });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error archiving campaign:", error);
    }
  };

  const handleSendReply = async () => {
    if (!selectedCampaign || selectedReplies.length === 0 || !chatMessage.trim()) return;

    setIsSendingReply(true);
    try {
      const response = await fetch("/api/admin/text-campaigns/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign._id,
          replies: selectedReplies.map(r => r._id),
          message: chatMessage,
        }),
      });

      if (response.ok) {
        setChatMessage("");
        setSelectedReplies([]);
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendToSubscribers = async () => {
    if (!selectedCampaign || !chatMessage.trim()) return;

    setIsSendingReply(true);
    try {
      const response = await fetch("/api/admin/text-campaigns/send-to-subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign._id,
          message: chatMessage,
          sendToAll,
          selectedSubscribers,
        }),
      });

      if (response.ok) {
        setChatMessage("");
        setSelectedSubscribers([]);
        setSendToAll(true);
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error sending to subscribers:", error);
    } finally {
      setIsSendingReply(false);
    }
  };

  const openChatModal = (campaign: TextCampaign) => {
    setSelectedCampaign(campaign);
    setIsChatModalOpen(true);
    setSelectedSubscribers([]);
    setSendToAll(true);
    setChatMessage("");
  };

  const filteredCampaigns = campaigns.filter(campaign => campaign.status === activeTab);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading text campaigns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <div className="flex space-x-4">
              <a
                href="/admin"
                className="inline-flex items-center px-4 py-2 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition font-semibold text-sm shadow"
              >
                📧 Subscriptions
              </a>
              <a
                href="/admin/text-campaigns"
                className="inline-flex items-center px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold text-sm shadow"
              >
                📱 Text Campaigns
              </a>
              <a
                href="/admin/competitions"
                className="inline-flex items-center px-4 py-2 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition font-semibold text-sm shadow"
              >
                🏆 Competitions
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Text Campaign Management
            </h1>
            <p className="text-muted-foreground">
              Create and manage text campaigns, send messages to subscribers, and handle replies.
            </p>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch("/api/admin/test-chat-interface", {
                    method: "POST",
                  });
                  if (response.ok) {
                    fetchCampaigns();
                    alert("Sample replies added! Check your campaigns for the Chat button.");
                  } else {
                    alert("Error adding sample replies. Please create a campaign first.");
                  }
                } catch (error) {
                  console.error("Error:", error);
                  alert("Error adding sample replies.");
                }
              }}
            >
              🧪 Test Chat
            </Button>
                         <Button
               variant="outline"
               onClick={async () => {
                 try {
                   const response = await fetch("/api/admin/test-webhook", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({
                       fromPhone: "+1234567890",
                       message: "This is a test reply from my phone!",
                       subscriberName: "Test User",
                     }),
                   });
                   if (response.ok) {
                     fetchCampaigns();
                     alert("Test SMS received! Check your campaigns for the new message.");
                   } else {
                     alert("Error simulating incoming SMS.");
                   }
                 } catch (error) {
                   console.error("Error:", error);
                   alert("Error simulating incoming SMS.");
                 }
               }}
             >
               📱 Test SMS
             </Button>
             <Button
               variant="outline"
               onClick={async () => {
                 try {
                   const response = await fetch("/api/admin/test-webhook-direct", {
                     method: "POST",
                   });
                   if (response.ok) {
                     const result = await response.json();
                     fetchCampaigns();
                     alert(`Webhook test completed: ${result.message}`);
                   } else {
                     alert("Error testing webhook directly.");
                   }
                 } catch (error) {
                   console.error("Error:", error);
                   alert("Error testing webhook directly.");
                 }
               }}
             >
               🧪 Test Webhook Direct
               </Button>
             <Button
               variant="outline"
               onClick={async () => {
                 try {
                   const response = await fetch("/api/admin/test-fast-webhook", {
                     method: "POST",
                   });
                   if (response.ok) {
                     const result = await response.json();
                     fetchCampaigns();
                     alert(`Fast webhook test completed: ${result.message}`);
                   } else {
                     alert("Error testing fast webhook.");
                   }
                 } catch (error) {
                   console.error("Error:", error);
                   alert("Error testing fast webhook.");
                 }
               }}
             >
                               ⚡ Test Fast Webhook
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/admin/debug-subscriber");
                    if (response.ok) {
                      const result = await response.json();
                      console.log("Subscriber debug info:", result);
                      alert(`Found ${result.subscribers.length} subscribers with SMS coaching. Check console for details.`);
                    } else {
                      alert("Error fetching subscriber debug info.");
                    }
                  } catch (error) {
                    console.error("Error:", error);
                    alert("Error fetching subscriber debug info.");
                  }
                }}
              >
                                 🔍 Debug Subscribers
               </Button>
               <Button
                 variant="outline"
                 onClick={async () => {
                   try {
                     const response = await fetch("/api/admin/enable-sms-coaching", {
                       method: "POST",
                     });
                     if (response.ok) {
                       const result = await response.json();
                       console.log("SMS coaching enabled:", result);
                       alert(`SMS coaching enabled for ${result.subscriber.name}!`);
                     } else {
                       alert("Error enabling SMS coaching.");
                     }
                   } catch (error) {
                     console.error("Error:", error);
                     alert("Error enabling SMS coaching.");
                   }
                 }}
               >
                                   ✅ Enable SMS Coaching
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/admin/test-phone-matching");
                      if (response.ok) {
                        const result = await response.json();
                        console.log("Phone matching test:", result);
                        alert(`Phone matching test completed. Check console for details.`);
                      } else {
                        alert("Error testing phone matching.");
                      }
                    } catch (error) {
                      console.error("Error:", error);
                      alert("Error testing phone matching.");
                    }
                  }}
                >
                                     📞 Test Phone Matching
                 </Button>
                 <Button
                   variant="outline"
                   onClick={async () => {
                     try {
                       const response = await fetch("/api/admin/test-fast-webhook-local", {
                         method: "POST",
                       });
                       if (response.ok) {
                         const result = await response.json();
                         console.log("Local fast webhook test:", result);
                         fetchCampaigns();
                         alert(`Local fast webhook test completed: ${result.message}`);
                       } else {
                         alert("Error testing local fast webhook.");
                       }
                     } catch (error) {
                       console.error("Error:", error);
                       alert("Error testing local fast webhook.");
                     }
                   }}
                 >
                   🧪 Test Local Fast Webhook
                 </Button>
                 <Button
                   variant="outline"
                   onClick={async () => {
                     try {
                       const response = await fetch("/api/test-response-time", {
                         method: "POST",
                         body: new FormData(),
                       });
                       if (response.ok) {
                         const result = await response.json();
                         console.log("Response time test:", result);
                         alert(`Response time test: ${result.responseTime}`);
                       } else {
                         alert("Error testing response time.");
                       }
                     } catch (error) {
                       console.error("Error:", error);
                       alert("Error testing response time.");
                     }
                   }}
                 >
                   ⚡ Test Response Time
                 </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Campaigns ({campaigns.filter(c => c.status === "active").length})
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === "archived"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Archived Campaigns ({campaigns.filter(c => c.status === "archived").length})
            </button>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign._id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                    {campaign.status}
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {campaign.message}
                </p>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {campaign.subscribers.length} subscribers
                  </div>
                  {campaign.replies.length > 0 && (
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {campaign.replies.length} replies
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  {campaign.status === "active" && !campaign.sentAt && (
                    <Button
                      size="sm"
                      onClick={() => handleSendCampaign(campaign._id!)}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openChatModal(campaign)}
                    className="flex-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat {campaign.replies.length > 0 && `(${campaign.replies.filter(r => !r.isRead).length})`}
                  </Button>

                  {campaign.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchiveCampaign(campaign._id!)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No {activeTab} campaigns
            </h3>
            <p className="text-muted-foreground">
              {activeTab === "active" 
                ? "Create your first campaign to get started."
                : "No archived campaigns yet."
              }
            </p>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setIsCreateModalOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>
            
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter campaign name"
                />
              </div>

              <div>
                <Label>Message</Label>
                <textarea
                  value={newCampaign.message}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter your message"
                  className="w-full p-3 border rounded-md min-h-[100px] resize-none"
                  maxLength={160}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {newCampaign.message.length}/160 characters
                </p>
              </div>

              <div>
                <Label>Select Subscribers</Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                  {subscribers.map((subscriber) => (
                    <label key={subscriber._id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                      <input
                        type="checkbox"
                        checked={newCampaign.selectedSubscribers.includes(subscriber._id!)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCampaign(prev => ({
                              ...prev,
                              selectedSubscribers: [...prev.selectedSubscribers, subscriber._id!]
                            }));
                          } else {
                            setNewCampaign(prev => ({
                              ...prev,
                              selectedSubscribers: prev.selectedSubscribers.filter(id => id !== subscriber._id)
                            }));
                          }
                        }}
                      />
                      <span className="text-sm">
                        {subscriber.name} ({subscriber.smsCoaching?.phoneNumber})
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {newCampaign.selectedSubscribers.length} subscribers selected
                </p>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <Button
                onClick={handleCreateCampaign}
                disabled={!newCampaign.name || !newCampaign.message || newCampaign.selectedSubscribers.length === 0}
                className="flex-1"
              >
                Create Campaign
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isChatModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-bold">{selectedCampaign.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCampaign.replies.length} messages • {selectedCampaign.replies.filter(r => !r.isRead).length} unread
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setIsChatModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Chat Interface - iPhone Style */}
            <div className="flex-1 flex flex-col bg-gray-50">
              {/* Messages Canvas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Initial Campaign Message */}
                <div className="flex justify-end">
                  <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-xs">
                    <p className="text-sm">{selectedCampaign.message}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">
                      {formatTime(selectedCampaign.createdAt)}
                    </p>
                  </div>
                </div>
                
                {/* Replies */}
                {selectedCampaign.replies.map((reply) => (
                  <div key={reply._id} className={`flex ${reply.isSentMessage ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-2xl px-4 py-2 max-w-xs ${
                      reply.isSentMessage 
                        ? 'bg-blue-500 text-white rounded-br-md' 
                        : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                    }`}>
                      <p className="text-sm">{reply.message}</p>
                      <p className={`text-xs mt-1 ${reply.isSentMessage ? 'opacity-70 text-right' : 'text-gray-500'}`}>
                        {formatTime(reply.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input - iPhone Style */}
              <div className="border-t bg-white p-3">
                {/* Send Options */}
                <div className="mb-3 flex items-center space-x-4 text-sm">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={sendToAll}
                      onChange={() => setSendToAll(true)}
                      className="text-blue-500"
                    />
                    <span>Send to all</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={!sendToAll}
                      onChange={() => setSendToAll(false)}
                      className="text-blue-500"
                    />
                    <span>Send to selected</span>
                  </label>
                </div>

                {/* Subscriber Selection */}
                {!sendToAll && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Select subscribers:</p>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {getCampaignSubscribers().map((subscriber) => (
                        <label key={subscriber._id} className="flex items-center space-x-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedSubscribers.includes(subscriber._id!)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubscribers(prev => [...prev, subscriber._id!]);
                              } else {
                                setSelectedSubscribers(prev => prev.filter(id => id !== subscriber._id));
                              }
                            }}
                            className="text-blue-500"
                          />
                          <span>{subscriber.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Input Bar */}
                <div className="flex items-end space-x-2">
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2">
                    <textarea
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="iMessage"
                      className="w-full bg-transparent border-none outline-none resize-none text-sm"
                      rows={1}
                      maxLength={160}
                      style={{ minHeight: '20px', maxHeight: '80px' }}
                    />
                  </div>
                  <button
                    onClick={handleSendToSubscribers}
                    disabled={!chatMessage.trim() || (!sendToAll && selectedSubscribers.length === 0) || isSendingReply}
                    className="bg-blue-500 text-white rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingReply ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {chatMessage.length}/160 characters
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 