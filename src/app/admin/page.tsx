'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SubscriptionModal from '@/components/admin/SubscriptionModal';

interface EmailSubscription {
  _id: string;
  name: string;
  email: string;
  subscribedReports: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  timeEST: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const [subscriptions, setSubscriptions] = useState<EmailSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalSubscription, setModalSubscription] = useState<EmailSubscription | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subscribedReports: [] as string[],
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    timeEST: '09:00'
  });

  const reportOptions = [
    { value: 'mtd', label: 'Month-to-Date' },
    { value: 'qtd', label: 'Quarter-to-Date' },
    { value: 'ytd', label: 'Year-to-Date' },
    { value: 'all-quarters', label: 'All Quarters' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions');
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId 
        ? `/api/admin/subscriptions/${editingId}`
        : '/api/admin/subscriptions';
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({
          name: '',
          email: '',
          subscribedReports: [],
          frequency: 'weekly',
          timeEST: '09:00'
        });
        setEditingId(null);
        fetchSubscriptions();
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        alert('Error saving subscription: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      alert('Error saving subscription. Please try again.');
    }
  };

  const handleEdit = (subscription: EmailSubscription) => {
    setModalSubscription(subscription);
    setIsModalOpen(true);
  };

  const handleModalSave = async (updatedSubscription: EmailSubscription) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${updatedSubscription._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedSubscription.name,
          email: updatedSubscription.email,
          subscribedReports: updatedSubscription.subscribedReports,
          frequency: updatedSubscription.frequency,
          timeEST: updatedSubscription.timeEST
        })
      });

      if (response.ok) {
        fetchSubscriptions();
        setIsModalOpen(false);
        setModalSubscription(null);
      } else {
        const errorData = await response.json();
        alert('Error updating subscription: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error updating subscription. Please try again.');
    }
  };

  const handleModalDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchSubscriptions();
        setIsModalOpen(false);
        setModalSubscription(null);
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  const handleTestEmail = async (subscription: EmailSubscription) => {
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: subscription.email,
          name: subscription.name
        })
      });

      if (response.ok) {
        alert('Test email sent successfully! Check your inbox.');
      } else {
        const errorData = await response.json();
        alert('Failed to send test email: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      alert('Error sending test email. Please try again.');
    }
  };

  const handleTestKPIDashboardEmail = async (subscription: EmailSubscription) => {
    try {
      // Send emails for each subscribed report
      const promises = subscription.subscribedReports.map(async (reportType) => {
        const response = await fetch('/api/admin/test-kpi-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: subscription.email,
            name: subscription.name,
            periodType: reportType
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`${reportType.toUpperCase()}: ${errorData.error || 'Unknown error'}`);
        }

        return response.json();
      });

      await Promise.all(promises);
      alert(`KPI dashboard emails sent successfully for ${subscription.subscribedReports.length} report(s)! Check your inbox.`);
    } catch (error) {
      console.error('Error sending KPI dashboard emails:', error);
      alert('Error sending KPI dashboard emails: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSendComprehensiveEmail = async (subscription: EmailSubscription) => {
    try {
      const response = await fetch('/api/admin/send-kpi-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: subscription.email,
          name: subscription.name,
          subscribedReports: subscription.subscribedReports
        })
      });

      if (response.ok) {
        alert(`Comprehensive KPI dashboard email sent successfully with ${subscription.subscribedReports.length} report(s)! Check your inbox.`);
      } else {
        const errorData = await response.json();
        alert('Failed to send comprehensive KPI email: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending comprehensive KPI email:', error);
      alert('Error sending comprehensive KPI email. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    
    try {
      const response = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchSubscriptions();
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });
      
      if (response.ok) {
        fetchSubscriptions();
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  };

  const handleReportToggle = (report: string) => {
    setFormData(prev => ({
      ...prev,
      subscribedReports: prev.subscribedReports.includes(report)
        ? prev.subscribedReports.filter(r => r !== report)
        : [...prev.subscribedReports, report]
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <Button onClick={() => window.location.href = '/'} variant="outline">
          ← Back to Dashboard
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add/Edit Subscription Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit Subscription' : 'Add New Subscription'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Subscribed Reports</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {reportOptions.map(option => (
                    <label key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.subscribedReports.includes(option.value)}
                        onChange={() => handleReportToggle(option.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: string) => 
                    setFormData(prev => ({ ...prev, frequency: value as 'daily' | 'weekly' | 'monthly' }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {formData.frequency ? frequencyOptions.find(opt => opt.value === formData.frequency)?.label : 'Select frequency'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeEST">Time (EST)</Label>
                <Input
                  id="timeEST"
                  type="time"
                  value={formData.timeEST}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeEST: e.target.value }))}
                  required
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit">
                  {editingId ? 'Update' : 'Add'} Subscription
                </Button>
                {editingId && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        name: '',
                        email: '',
                        subscribedReports: [],
                        frequency: 'weekly',
                        timeEST: '09:00'
                      });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Subscriptions List */}
        <Card>
          <CardHeader>
            <CardTitle>Email Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No subscriptions found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">Name</TableHead>
                        <TableHead className="w-1/2">Email</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((subscription) => (
                        <TableRow 
                          key={subscription._id} 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleEdit(subscription)}
                        >
                          <TableCell className="font-medium truncate" title={subscription.name}>
                            {subscription.name}
                          </TableCell>
                          <TableCell className="truncate" title={subscription.email}>
                            {subscription.email}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={subscription.isActive ? "default" : "secondary"}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActive(subscription._id, subscription.isActive);
                              }}
                            >
                              {subscription.isActive ? 'Active' : 'Inactive'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        subscription={modalSubscription}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalSubscription(null);
        }}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        onTestEmail={handleTestEmail}
        onTestKPIDashboardEmail={handleTestKPIDashboardEmail}
        onSendComprehensiveEmail={handleSendComprehensiveEmail}
      />
    </div>
  );
} 