'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

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

interface SubscriptionModalProps {
  subscription: EmailSubscription | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (subscription: EmailSubscription) => void;
  onDelete: (id: string) => void;
  onTestEmail: (subscription: EmailSubscription) => void;
  onTestKPIDashboardEmail: (subscription: EmailSubscription) => void;
  onSendComprehensiveEmail: (subscription: EmailSubscription) => void;
}

export default function SubscriptionModal({ 
  subscription, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  onTestEmail,
  onTestKPIDashboardEmail,
  onSendComprehensiveEmail
}: SubscriptionModalProps) {
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
    if (subscription) {
      setFormData({
        name: subscription.name,
        email: subscription.email,
        subscribedReports: subscription.subscribedReports,
        frequency: subscription.frequency,
        timeEST: subscription.timeEST
      });
    }
  }, [subscription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subscription) {
      onSave({ ...subscription, ...formData });
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

  const handleDelete = () => {
    if (subscription && confirm('Are you sure you want to delete this subscription?')) {
      onDelete(subscription._id);
      onClose();
    }
  };

  if (!isOpen || !subscription) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Edit Subscription</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
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

            <div className="flex justify-between pt-4">
              <div className="flex space-x-2">
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Delete Subscription
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onTestEmail(subscription)}
                >
                  Send Test Email
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onTestKPIDashboardEmail(subscription)}
                >
                  Send Individual Reports
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onSendComprehensiveEmail(subscription)}
                >
                  Send All Reports in One Email
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 