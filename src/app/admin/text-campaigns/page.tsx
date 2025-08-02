"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  MessageSquare, 
  Send, 
  Archive, 
  Plus, 
  Users, 
  Calendar,
  Search,
  Trash2,
  SortAsc,
  SortDesc,
  X
} from "lucide-react";
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

interface SearchResult {
  type: "campaign" | "reply";
  id: string;
  campaignId?: string;
  campaignName?: string;
  name?: string;
  fromName?: string;
  fromPhone?: string;
  message: string;
  timestamp?: Date;
  createdAt?: Date;
  status?: string;
  matchType: string;
  highlightedText: string;
}

export default function TextCampaignsPage() {
  const [campaigns, setCampaigns] = useState<TextCampaign[]>([]);
  const [subscribers, setSubscribers] = useState<EmailSubscription[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<TextCampaign | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [replyToSpecific, setReplyToSpecific] = useState<{name: string, phone: string} | null>(null);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [alertSubscribers, setAlertSubscribers] = useState<string[]>([]);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "name" | "sentAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [contentSearchTerm, setContentSearchTerm] = useState("");
  const [lastReplyCount, setLastReplyCount] = useState(0);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const [chatScrollRef, setChatScrollRef] = useState<HTMLDivElement | null>(null);

  // Form state for new campaign
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message: "",
    selectedSubscribers: [] as string[],
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      // Fetch all campaigns for accurate counting
      const allCampaignsResponse = await fetch("/api/admin/text-campaigns");
      if (allCampaignsResponse.ok) {
        const allData = await allCampaignsResponse.json();
        const allCampaigns = allData.campaigns || allData;
        setCampaigns(allCampaigns);
        
        // Update selected campaign with fresh data if chat modal is open
        if (selectedCampaign && isChatModalOpen) {
          const updatedCampaign = allCampaigns.find((c: TextCampaign) => c._id === selectedCampaign._id);
          if (updatedCampaign) {
            // Check if there are new replies
            if (updatedCampaign.replies.length > lastReplyCount && lastReplyCount > 0) {
              setShowNewMessageIndicator(true);
              // Auto-hide the indicator after 3 seconds
              setTimeout(() => setShowNewMessageIndicator(false), 3000);
              // Auto-scroll to bottom for new messages
              if (chatScrollRef) {
                setTimeout(() => {
                  chatScrollRef.scrollTop = chatScrollRef.scrollHeight;
                }, 100);
              }
            }
            setSelectedCampaign(updatedCampaign);
            setLastReplyCount(updatedCampaign.replies.length);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCampaign, isChatModalOpen, lastReplyCount, chatScrollRef]);

  useEffect(() => {
    fetchCampaigns();
    fetchSubscribers();
    fetchAlertPhoneNumbers();
    
    // Set up polling for real-time updates
    // More frequent updates when chat modal is open
    const interval = setInterval(fetchCampaigns, isChatModalOpen ? 3000 : 10000);
    return () => clearInterval(interval);
  }, [fetchCampaigns, isChatModalOpen]);

  // Auto-scroll to bottom when chat modal opens
  useEffect(() => {
    if (isChatModalOpen && chatScrollRef) {
      setTimeout(() => {
        chatScrollRef.scrollTop = chatScrollRef.scrollHeight;
      }, 100);
    }
  }, [isChatModalOpen, chatScrollRef]);

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

  const fetchAlertPhoneNumbers = async () => {
    try {
      const response = await fetch("/api/admin/alert-phone-numbers");
      if (response.ok) {
        const data = await response.json();
        setAlertSubscribers(data.subscriberIds || []);
      }
    } catch (error) {
      console.error("Error fetching alert phone numbers:", error);
    }
  };

  const addAlertSubscriber = async (subscriberId: string) => {
    try {
      const response = await fetch("/api/admin/alert-phone-numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId }),
      });
      
      if (response.ok) {
        fetchAlertPhoneNumbers();
      }
    } catch (error) {
      console.error("Error adding alert subscriber:", error);
    }
  };

  const removeAlertSubscriber = async (subscriberId: string) => {
    try {
      const response = await fetch("/api/admin/alert-phone-numbers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriberId }),
      });
      
      if (response.ok) {
        fetchAlertPhoneNumbers();
      }
    } catch (error) {
      console.error("Error removing alert subscriber:", error);
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

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign? This will also delete all associated replies.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/text-campaigns?id=${campaignId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  };

  const handleSendToSubscribers = async () => {
    if (!selectedCampaign || !chatMessage.trim()) return;

    setIsSendingReply(true);
    try {
      // If replying to a specific person, find their subscriber ID
      let subscribersToSendTo: string[] = [];
      
      if (replyToSpecific) {
        // Find the subscriber by phone number
        const specificSubscriber = subscribers.find(sub => 
          sub.smsCoaching?.phoneNumber === replyToSpecific.phone ||
          sub.smsCoaching?.phoneNumber === replyToSpecific.phone.replace(/^\+/, '') ||
          sub.smsCoaching?.phoneNumber === replyToSpecific.phone.replace(/^\+1/, '')
        );
        if (specificSubscriber) {
          subscribersToSendTo = [specificSubscriber._id!];
        }
      } else if (sendToAll) {
        subscribersToSendTo = selectedCampaign.subscribers.map(id => id.toString());
      } else {
        subscribersToSendTo = selectedSubscribers;
      }

      const response = await fetch("/api/admin/text-campaigns/send-to-subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaign._id,
          message: chatMessage,
          sendToAll: !replyToSpecific && sendToAll,
          selectedSubscribers: subscribersToSendTo,
        }),
      });

      if (response.ok) {
        setChatMessage("");
        setSelectedSubscribers([]);
        setSendToAll(true);
        setReplyToSpecific(null);
        // Refresh campaigns and update selected campaign
        fetchCampaigns();
        // Update the selected campaign with fresh data after sending
        if (selectedCampaign) {
          const refreshSelectedCampaign = async () => {
            try {
              const response = await fetch("/api/admin/text-campaigns");
              if (response.ok) {
                const data = await response.json();
                const updatedCampaign = (data.campaigns || data).find((c: TextCampaign) => c._id === selectedCampaign._id);
                if (updatedCampaign) {
                  setSelectedCampaign(updatedCampaign);
                }
              }
            } catch (error) {
              console.error("Error refreshing selected campaign:", error);
            }
          };
          refreshSelectedCampaign();
        }
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
    setReplyToSpecific(null);
    setLastReplyCount(campaign.replies.length);
    setShowNewMessageIndicator(false);
  };

  const closeChatModal = () => {
    setIsChatModalOpen(false);
    // Refresh the selected campaign data when closing the modal
    if (selectedCampaign) {
      const updatedCampaign = campaigns.find((c: TextCampaign) => c._id === selectedCampaign._id);
      if (updatedCampaign) {
        setSelectedCampaign(updatedCampaign);
      }
    }
  };

  const handleContentSearch = async () => {
    if (!contentSearchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/admin/text-campaigns/search-content?q=${encodeURIComponent(contentSearchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setIsSearchModalOpen(true);
      }
    } catch (error) {
      console.error("Error searching content:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const openCampaignFromSearch = async (campaignId: string) => {
    try {
      const response = await fetch("/api/admin/text-campaigns");
      if (response.ok) {
        const data = await response.json();
        const campaign = (data.campaigns || data).find((c: TextCampaign) => c._id === campaignId);
        if (campaign) {
          setSelectedCampaign(campaign);
          setIsChatModalOpen(true);
          setIsSearchModalOpen(false);
        }
      }
    } catch (error) {
      console.error("Error opening campaign from search:", error);
    }
  };

  const filteredCampaigns = campaigns
    .filter(campaign => campaign.status === activeTab)
    .filter(campaign => 
      !searchTerm || 
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.message.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy as keyof TextCampaign];
      const bValue = b[sortBy as keyof TextCampaign];
      
      if (sortBy === "name") {
        return sortOrder === "asc" 
          ? (aValue as string).localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue as string);
      }
      
      if (sortBy === "createdAt" || sortBy === "sentAt") {
        const aDate = new Date(aValue as Date).getTime();
        const bDate = new Date(bValue as Date).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }
      
      return 0;
    });

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
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
                href="/"
                className="inline-flex items-center px-4 py-2 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition font-semibold text-sm shadow"
              >
                🏠 Home
              </a>
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
              onClick={() => setIsAlertsModalOpen(true)}
            >
              🔔 Alert Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsSearchModalOpen(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search Content
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 p-4 bg-card rounded-lg border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search campaigns by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "createdAt" | "name" | "sentAt")}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="sentAt">Date Sent</option>
              </select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
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
                  {campaign.sentAt && (
                    <>
                      <span className="mx-2">•</span>
                      Sent: {new Date(campaign.sentAt).toLocaleDateString()}
                    </>
                  )}
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

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCampaign(campaign._id!)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {/* Content Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Search SMS Content</h2>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setIsSearchModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="flex space-x-2">
                <Input
                  placeholder="Search for messages, replies, or campaign names..."
                  value={contentSearchTerm}
                  onChange={(e) => setContentSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleContentSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={handleContentSearch}
                  disabled={isSearching || !contentSearchTerm.trim()}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="p-6">
              {searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => result.campaignId && openCampaignFromSearch(result.campaignId)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant={result.type === "campaign" ? "default" : "secondary"}>
                              {result.type === "campaign" ? "Campaign" : "Reply"}
                            </Badge>
                            {result.type === "reply" && result.campaignName && (
                              <span className="text-sm text-muted-foreground">
                                in "{result.campaignName}"
                              </span>
                            )}
                          </div>
                          
                          {result.type === "campaign" && (
                            <h3 className="font-semibold text-lg mb-1">{result.name}</h3>
                          )}
                          
                          {result.type === "reply" && (
                            <div className="mb-2">
                              <span className="font-medium">{result.fromName}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({result.fromPhone})
                              </span>
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                          
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Match:</span> {result.highlightedText}
                          </div>
                          
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(result.timestamp || result.createdAt || "").toLocaleString()}
                          </div>
                        </div>
                        
                        {result.type === "reply" && result.campaignId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCampaignFromSearch(result.campaignId!);
                            }}
                          >
                            Open Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : contentSearchTerm && !isSearching ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No results found
                  </h3>
                  <p className="text-muted-foreground">
                    Try searching for different terms or check your spelling.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Search SMS Content
                  </h3>
                  <p className="text-muted-foreground">
                    Enter a search term to find messages and replies across all campaigns.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isChatModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full h-[90vh] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold">{selectedCampaign.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedCampaign.replies.length} messages • {selectedCampaign.replies.filter(r => !r.isRead).length} unread
                </p>
                {showNewMessageIndicator && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="animate-pulse bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      ✨ New message received!
                    </div>
                  </div>
                )}
              </div>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={closeChatModal}
              >
                ✕
              </button>
            </div>

            {/* Chat Interface - iPhone Style */}
            <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
              {/* Messages Canvas */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" ref={setChatScrollRef}>
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
                    <div 
                      className={`rounded-2xl px-4 py-2 max-w-xs cursor-pointer transition-all hover:shadow-md ${
                        reply.isSentMessage 
                          ? 'bg-blue-500 text-white rounded-br-md' 
                          : 'bg-white text-gray-800 rounded-bl-md border border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => {
                        if (!reply.isSentMessage && reply.fromName && reply.fromPhone) {
                          setReplyToSpecific({ name: reply.fromName, phone: reply.fromPhone });
                          setSendToAll(false);
                          setSelectedSubscribers([]);
                        }
                      }}
                    >
                      {/* Show subscriber name for incoming messages */}
                      {!reply.isSentMessage && reply.fromName && (
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          {reply.fromName}
                        </p>
                      )}
                      {/* Show "You" for sent messages */}
                      {reply.isSentMessage && (
                        <p className="text-xs font-semibold text-blue-100 mb-1">
                          You
                        </p>
                      )}
                      <p className="text-sm">{reply.message}</p>
                      <p className={`text-xs mt-1 ${reply.isSentMessage ? 'opacity-70 text-right' : 'text-gray-500'}`}>
                        {formatTime(reply.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input - iPhone Style */}
              <div className="border-t bg-white p-3 flex-shrink-0">
                {/* Send Options */}
                <div className="mb-3 flex items-center space-x-4 text-sm">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={sendToAll && !replyToSpecific}
                      onChange={() => {
                        setSendToAll(true);
                        setReplyToSpecific(null);
                        setSelectedSubscribers([]);
                      }}
                      className="text-blue-500"
                    />
                    <span>Send to all</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={!sendToAll && !replyToSpecific}
                      onChange={() => {
                        setSendToAll(false);
                        setReplyToSpecific(null);
                        setSelectedSubscribers([]);
                      }}
                      className="text-blue-500"
                    />
                    <span>Send to selected</span>
                  </label>
                  {replyToSpecific && (
                    <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                      <span className="text-blue-700 font-medium">
                        Reply to {replyToSpecific.name}
                      </span>
                      <button
                        onClick={() => {
                          setReplyToSpecific(null);
                          setSendToAll(true);
                          setSelectedSubscribers([]);
                        }}
                        className="text-blue-500 hover:text-blue-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
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
                    disabled={!chatMessage.trim() || (!sendToAll && !replyToSpecific && selectedSubscribers.length === 0) || isSendingReply}
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

      {/* Alerts Modal */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Alert Settings</h2>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setIsAlertsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Select subscribers who will receive SMS alerts when replies come in to any campaign.
            </p>

            {/* Subscribers List */}
            <div className="space-y-2 mb-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Available Subscribers:</h3>
              <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
                {subscribers.map((subscriber) => (
                  <div key={subscriber._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{subscriber.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({subscriber.smsCoaching?.phoneNumber})</span>
                    </div>
                    <button
                      onClick={() => {
                        if (alertSubscribers.includes(subscriber._id!)) {
                          removeAlertSubscriber(subscriber._id!);
                        } else {
                          addAlertSubscriber(subscriber._id!);
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded-full ${
                        alertSubscribers.includes(subscriber._id!)
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {alertSubscribers.includes(subscriber._id!) ? 'Remove' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Alert Subscribers */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Current Alert Recipients:</h3>
              {alertSubscribers.length > 0 ? (
                <div className="space-y-2">
                  {subscribers
                    .filter(sub => alertSubscribers.includes(sub._id!))
                    .map((subscriber) => (
                      <div key={subscriber._id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div>
                          <span className="text-sm font-medium">{subscriber.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({subscriber.smsCoaching?.phoneNumber})</span>
                        </div>
                        <button
                          onClick={() => removeAlertSubscriber(subscriber._id!)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No alert recipients configured
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 