'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { EmailSubscription } from '@/types/kpi';
import { Loader2 } from 'lucide-react';
import { StaffMemberCoaching, DashboardSchedule, SMSCoaching, CoachingSMSHistory } from '@/types/sms';

interface SubscriptionModalProps {
  subscription: EmailSubscription | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (subscription: EmailSubscription) => void;
  onDelete: (id: string) => void;
  onSendReports: (subscription: EmailSubscription) => void;
  onSendSMSCoaching: (subscription: EmailSubscription, periodType?: string) => void;
  onTestSMS: (phoneNumber: string, name: string) => void;
}

export default function SubscriptionModal({ 
  subscription, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  onSendReports,
  onSendSMSCoaching,
  onTestSMS
}: SubscriptionModalProps) {
  const [formData, setFormData] = useState<EmailSubscription>({
    _id: '',
    name: '',
    email: '',
    subscribedReports: [],
    reportSchedules: {
      mtd: { frequency: 'weekly', timeEST: '09:00', dayOfWeek: 3, isActive: true },
      qtd: { frequency: 'monthly', timeEST: '09:00', dayOfWeek: 3, weekOfMonth: 1, isActive: true },
      ytd: { frequency: 'quarterly', timeEST: '09:00', dayOfWeek: 3, monthOfQuarter: 1, isActive: true },
      'all-quarters': { frequency: 'monthly', timeEST: '09:00', dayOfMonth: 1, isActive: true }
    },
    smsCoaching: {
      isActive: false,
      phoneNumber: '',
      staffMembers: [],
      coachingStyle: 'balanced',
      customMessage: ''
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    unsubscribeToken: ''
  });

  const [availableStaffByReport, setAvailableStaffByReport] = useState<Record<ReportKey, string[]>>({
    mtd: [],
    qtd: [],
    ytd: [],
    'all-quarters': []
  });

  const coachingStyleOptions = [
    { value: 'encouraging', label: 'Encouraging' },
    { value: 'analytical', label: 'Analytical' },
    { value: 'motivational', label: 'Motivational' },
    { value: 'balanced', label: 'Balanced' }
  ];

  // Define the allowed report keys as a union type
  const reportKeys = ['mtd', 'qtd', 'ytd', 'all-quarters'] as const;
  type ReportKey = typeof reportKeys[number];

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every Other Week' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  const weeksOfMonth = [
    'First', 'Second', 'Third', 'Fourth', 'Last'
  ];

  const monthsOfYear = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [sendingSMS, setSendingSMS] = useState(false);
  const [smsArchiveOpen, setSmsArchiveOpen] = useState(false);
  const [smsArchive, setSmsArchive] = useState<any[]>([]);
  const [smsArchiveLoading, setSmsArchiveLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  console.log('MTD SMS Dashboard:', formData.smsCoaching?.staffMembers?.[0]?.dashboards?.find(d => d.periodType === 'mtd'));

  useEffect(() => {
    if (subscription) {
      // Ensure smsCoaching.staffMembers is always an array with one entry (if present)
      let staffMembers: StaffMemberCoaching[] = [];
      if (subscription.smsCoaching && Array.isArray(subscription.smsCoaching.staffMembers) && subscription.smsCoaching.staffMembers.length > 0) {
        staffMembers = [subscription.smsCoaching.staffMembers[0]];
      }
      setFormData(prev => ({
        ...prev,
        name: subscription.name,
        email: subscription.email,
        subscribedReports: (subscription.subscribedReports ?? []) as ReportKey[],
        reportSchedules: {
          mtd: subscription.reportSchedules.mtd || {
            frequency: 'weekly',
            timeEST: '09:00',
            dayOfWeek: 3,
            isActive: true
          },
          qtd: subscription.reportSchedules.qtd || {
            frequency: 'monthly',
            timeEST: '09:00',
            weekOfMonth: 1,
            dayOfWeek: 3,
            isActive: true
          },
          ytd: subscription.reportSchedules.ytd || {
            frequency: 'quarterly',
            timeEST: '09:00',
            monthOfQuarter: 1,
            weekOfMonth: 1,
            dayOfWeek: 3,
            isActive: true
          },
          'all-quarters': subscription.reportSchedules['all-quarters'] || {
            frequency: 'monthly',
            timeEST: '09:00',
            dayOfMonth: 1,
            isActive: true
          }
        },
        smsCoaching: {
          isActive: subscription.smsCoaching?.isActive ?? false,
          phoneNumber: subscription.smsCoaching?.phoneNumber ?? '',
          staffMembers,
          coachingStyle: subscription.smsCoaching?.coachingStyle ?? 'balanced',
          customMessage: subscription.smsCoaching?.customMessage ?? ''
        },
        isActive: subscription.isActive,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        unsubscribeToken: subscription.unsubscribeToken
      }));
    }
  }, [subscription]);

  useEffect(() => {
    // Fetch staff for each report type
    async function fetchStaff() {
      const newStaff: Record<ReportKey, string[]> = { mtd: [], qtd: [], ytd: [], 'all-quarters': [] };
      for (const key of reportKeys) {
        try {
          const res = await fetch(`/api/kpi/${key}`);
          if (res.ok) {
            const data = await res.json();
            const staff = Object.keys(data?.data?.current?.associatePerformance || {});
            newStaff[key] = staff;
          }
        } catch (e) {
          // ignore
        }
      }
      setAvailableStaffByReport(newStaff);
    }
    fetchStaff();
  }, [isOpen]);

  // Fetch SMS archive when modal is opened
  useEffect(() => {
    if (smsArchiveOpen && subscription?._id) {
      setSmsArchiveLoading(true);
      fetch(`/api/admin/subscriptions/${subscription._id}/sms-archive`)
        .then(res => res.json())
        .then(data => {
          setSmsArchive(data.messages || []);
          setSmsArchiveLoading(false);
        })
        .catch(() => setSmsArchiveLoading(false));
    }
  }, [smsArchiveOpen, subscription?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    if (subscription) {
      const dataToSave = {
        _id: subscription._id,
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.smsCoaching?.phoneNumber || '',
        subscribedReports: formData.subscribedReports || [],
        reportSchedules: formData.reportSchedules || {},
        smsCoaching: formData.smsCoaching,
        isActive: formData.isActive ?? true,
        createdAt: formData.createdAt || new Date(),
        updatedAt: new Date(),
        unsubscribeToken: subscription.unsubscribeToken,
        admin: isAdmin,
        adminPassword: isAdmin ? adminPassword : undefined
      };
      if (isAdmin && adminPassword) {
        // Call Supabase user creation API
        try {
          const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: dataToSave.name,
              email: dataToSave.email,
              phone: dataToSave.phone,
              password: adminPassword
            })
          });
          const result = await res.json();
          if (!res.ok) {
            setAdminError(result.error || 'Failed to create user');
          } else {
            setAdminSuccess('User created in Supabase!');
          }
        } catch (err: any) {
          setAdminError(err.message || 'Failed to create user');
        }
      }
      onSave(dataToSave as EmailSubscription);
    }
  };

  const handleReportToggle = (report: ReportKey) => {
    setFormData(prev => ({
      ...prev,
      subscribedReports: (prev.subscribedReports ?? []).includes(report)
        ? (prev.subscribedReports ?? []).filter(r => r !== report)
        : [...(prev.subscribedReports ?? []), report]
    }));
  };

  const handleScheduleChange = (reportType: ReportKey, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      reportSchedules: {
        ...(prev.reportSchedules ?? {}),
        [reportType]: {
          ...((prev.reportSchedules ?? {})[reportType as keyof typeof prev.reportSchedules] ?? {}),
          [field]: value
        }
      }
    }));
  };

  const handleDelete = () => {
    if (subscription && confirm('Are you sure you want to delete this subscription?')) {
      onDelete(subscription._id as string || '');
      onClose();
    }
  };

  // Wrap the onSendSMSCoaching to handle loading state
  const handleSendSMS = async () => {
    if (!subscription) return;
    setSendingSMS(true);
    try {
      await onSendSMSCoaching(subscription);
    } finally {
      setSendingSMS(false);
    }
  };

  if (!isOpen || !subscription) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-8 relative overflow-y-auto max-h-[90vh]">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold mb-6">{subscription?._id ? 'Edit Subscriber' : 'Add Subscriber'}</h2>

        <div className="mb-6">
          <Label>Subscriber Name</Label>
          <Input
            type="text"
            value={formData.name ?? ''}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Full name of subscriber"
            required
          />
        </div>
        <div className="mb-6">
          <Label>Email Address</Label>
          <Input
            type="email"
            value={formData.email ?? ''}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="subscriber@email.com"
            required
          />
        </div>
        <div className="mb-6 flex items-center">
          <label className="mr-2 font-medium">Admin</label>
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={e => setIsAdmin(e.target.checked)}
            className="accent-[#a92020]"
          />
        </div>
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium">Password (for dashboard login)</label>
          <div className="relative">
            <input
              type={showAdminPassword ? 'text' : 'password'}
              className="w-full border rounded px-3 py-2 pr-10"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              disabled={!isAdmin}
              placeholder={isAdmin ? 'Enter password for dashboard login' : 'Enable admin to set password'}
              style={{ backgroundColor: isAdmin ? 'white' : '#f3f3f3' }}
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowAdminPassword(v => !v)}
              disabled={!isAdmin}
            >
              {showAdminPassword ? (
                // Eye open SVG
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) : (
                // Eye closed SVG
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.306M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
              )}
            </button>
          </div>
          {adminError && <div className="text-red-600 mb-2">{adminError}</div>}
          {adminSuccess && <div className="text-green-600 mb-2">{adminSuccess}</div>}
        </div>
        <div className="mb-6">
          <Label>Staff Name (for SMS coaching)</Label>
          <Select
            value={formData.smsCoaching?.staffMembers?.[0]?.name ?? ''}
            onValueChange={value => setFormData(prev => {
              // Type-safe period types
              const periodTypes: DashboardSchedule['periodType'][] = ['mtd', 'qtd', 'ytd', 'all-quarters'];
              const defaultDashboards: DashboardSchedule[] = periodTypes.map(periodType => ({
                periodType,
                frequency: 'weekly',
                timeEST: '09:00',
                dayOfWeek: 0,
                weekOfMonth: 1,
                dayOfMonth: 1,
                weekStart: 1,
                monthOfQuarter: 1,
                monthOfYear: 1,
                isActive: true,
                includeMetrics: {
                  wineConversionRate: true,
                  clubConversionRate: true,
                  goalVariance: true,
                  overallPerformance: true
                }
              }));
              return {
                ...prev,
                smsCoaching: {
                  ...prev.smsCoaching,
                  isActive: !!prev.smsCoaching?.isActive,
                  phoneNumber: prev.smsCoaching?.phoneNumber ?? '',
                  coachingStyle: prev.smsCoaching?.coachingStyle ?? 'balanced',
                  staffMembers: value ? [{
                    id: '',
                    name: value,
                    phoneNumber: '',
                    enabled: true,
                    isActive: true,
                    dashboards: defaultDashboards
                  }] : [],
                }
              };
            })}
            required={formData.smsCoaching?.isActive ?? false}
          >
            {(availableStaffByReport.mtd ?? []).map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="mb-6">
          <Label>Mobile Phone Number (for SMS coaching)</Label>
          <Input
            type="tel"
            value={formData.smsCoaching?.phoneNumber ?? ''}
            onChange={e => setFormData(prev => ({
              ...prev,
              smsCoaching: {
                isActive: typeof prev.smsCoaching?.isActive === 'boolean' ? prev.smsCoaching.isActive : false,
                phoneNumber: e.target.value,
                staffMembers: prev.smsCoaching?.staffMembers?.map(staff => ({
                  ...staff,
                  id: staff.id ?? '',
                  name: staff.name ?? '',
                  phoneNumber: staff.phoneNumber ?? '',
                  enabled: typeof staff.enabled === 'boolean' ? staff.enabled : false,
                  isActive: typeof staff.isActive === 'boolean' ? staff.isActive : false,
                  dashboards: staff.dashboards ?? []
                })) ?? [],
                coachingStyle: prev.smsCoaching?.coachingStyle ?? 'balanced',
                customMessage: prev.smsCoaching?.customMessage ?? '',
              }
            }))}
            placeholder="e.g. +15555555555"
            required={formData.smsCoaching?.isActive ?? false}
          />
        </div>

        {/* Email Reports Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Email Reports</h3>
          <div className="grid grid-cols-2 gap-4">
            {reportKeys.map((key) => (
              <div key={key} className="border rounded p-4">
                <label className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    checked={(formData.subscribedReports ?? []).includes(key as ReportKey)}
                    onChange={() => handleReportToggle(key as ReportKey)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">{key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </label>
                {/* Cadence controls for email */}
                {(formData.subscribedReports ?? []).includes(key as ReportKey) && (
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={(formData.reportSchedules ?? {})[key]?.frequency || 'weekly'}
                      onValueChange={value => handleScheduleChange(key as ReportKey, 'frequency', value)}
                    >
                      {frequencyOptions.map(freq => (
                        <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                      ))}
                    </Select>
                    {/* Weekly controls */}
                    {((formData.reportSchedules ?? {})[key]?.frequency === 'weekly') && (
                      <>
                        <Label>Day of Week</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.dayOfWeek ?? 0)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'dayOfWeek', Number(value))}
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={(formData.reportSchedules ?? {})[key]?.timeEST || ''}
                          onChange={e => handleScheduleChange(key as ReportKey, 'timeEST', e.target.value)}
                        />
                      </>
                    )}
                    {/* Biweekly controls */}
                    {((formData.reportSchedules ?? {})[key]?.frequency === 'biweekly') && (
                      <>
                        <Label>Day of Week</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.dayOfWeek ?? 0)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'dayOfWeek', Number(value))}
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={(formData.reportSchedules ?? {})[key]?.timeEST || ''}
                          onChange={e => handleScheduleChange(key as ReportKey, 'timeEST', e.target.value)}
                        />
                        <Label>Start on Week #</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.weekStart ?? 1)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'weekStart', Number(value))}
                        >
                          {[1,2,3,4,5].map((w) => (
                            <SelectItem key={w} value={String(w)}>{w}</SelectItem>
                          ))}
                        </Select>
                      </>
                    )}
                    {/* Monthly controls */}
                    {((formData.reportSchedules ?? {})[key]?.frequency === 'monthly') && (
                      <>
                        <Label>Week of Month</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.weekOfMonth ?? 1)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'weekOfMonth', Number(value))}
                        >
                          {weeksOfMonth.map((w, i) => (
                            <SelectItem key={i} value={String(i+1)}>{w}</SelectItem>
                          ))}
                        </Select>
                        <Label>Day of Week</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.dayOfWeek ?? 0)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'dayOfWeek', Number(value))}
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={(formData.reportSchedules ?? {})[key]?.timeEST || ''}
                          onChange={e => handleScheduleChange(key as ReportKey, 'timeEST', e.target.value)}
                        />
                      </>
                    )}
                    {/* Quarterly controls */}
                    {((formData.reportSchedules ?? {})[key]?.frequency === 'quarterly') && (
                      <>
                        <Label>Week of Quarter</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.weekOfMonth ?? 1)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'weekOfMonth', Number(value))}
                        >
                          <SelectItem value="1">First Week</SelectItem>
                        </Select>
                        <Label>Day of Week</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.dayOfWeek ?? 0)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'dayOfWeek', Number(value))}
                        >
                          {daysOfWeek.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </Select>
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={(formData.reportSchedules ?? {})[key]?.timeEST || ''}
                          onChange={e => handleScheduleChange(key as ReportKey, 'timeEST', e.target.value)}
                        />
                      </>
                    )}
                    {/* Yearly controls */}
                    {((formData.reportSchedules ?? {})[key]?.frequency === 'yearly') && (
                      <>
                        <Label>Month</Label>
                        <Select
                          value={String((formData.reportSchedules ?? {})[key]?.monthOfYear ?? 1)}
                          onValueChange={value => handleScheduleChange(key as ReportKey, 'monthOfYear', Number(value))}
                        >
                          {monthsOfYear.map((m, i) => (
                            <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>
                          ))}
                        </Select>
                        <Label>Day</Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={String((formData.reportSchedules ?? {})[key]?.dayOfMonth ?? 1)}
                          onChange={e => handleScheduleChange(key as ReportKey, 'dayOfMonth', Number(e.target.value))}
                        />
                        <Label>Time (EST)</Label>
                        <Input
                          type="time"
                          value={(formData.reportSchedules ?? {})[key]?.timeEST || ''}
                          onChange={e => handleScheduleChange(key as ReportKey, 'timeEST', e.target.value)}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SMS Coaching Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">SMS Coaching</h3>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="enable-sms-coaching"
              className="mr-2"
              checked={!!formData.smsCoaching?.isActive}
              onChange={e => setFormData(prev => ({
                ...prev,
                smsCoaching: {
                  isActive: e.target.checked,
                  phoneNumber: prev.smsCoaching?.phoneNumber ?? '',
                  staffMembers: prev.smsCoaching?.staffMembers?.map(staff => ({
                    ...staff,
                    id: staff.id ?? '',
                    name: staff.name ?? '',
                    phoneNumber: staff.phoneNumber ?? '',
                    enabled: typeof staff.enabled === 'boolean' ? staff.enabled : false,
                    isActive: typeof staff.isActive === 'boolean' ? staff.isActive : false,
                    dashboards: staff.dashboards ?? []
                  })) ?? [],
                  coachingStyle: prev.smsCoaching?.coachingStyle ?? 'balanced',
                  customMessage: prev.smsCoaching?.customMessage ?? '',
                }
              }))}
            />
            <label htmlFor="enable-sms-coaching" className="font-medium">Enable SMS Coaching</label>
          </div>
          <p className="text-gray-500 mb-4 text-sm">SMS messages are personalized for the selected staff member, using their performance data for the selected report/dashboard and sent on the schedule you set below.</p>
          {formData.smsCoaching?.staffMembers && formData.smsCoaching.staffMembers[0] && (
            <div className="grid grid-cols-2 gap-4">
              {reportKeys.map(key => {
                const staff = formData.smsCoaching!.staffMembers![0];
                const dashboards = staff.dashboards ?? [];
                const dashboard = dashboards.find(d => d.periodType === key);
                const enabled = !!dashboard;
                return (
                  <div key={key} className="border rounded p-4">
                    <label className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={e => {
                          setFormData(prev => {
                            const staff = prev.smsCoaching?.staffMembers?.[0];
                            if (!staff) return prev;
                            let dashboards = staff.dashboards ?? [];
                            if (e.target.checked) {
                              if (!dashboards.find(d => d.periodType === key)) {
                                dashboards = [
                                  ...dashboards,
                                  {
                                    periodType: key,
                                    frequency: 'weekly',
                                    timeEST: '09:00',
                                    dayOfWeek: 0,
                                    weekOfMonth: 1,
                                    dayOfMonth: 1,
                                    weekStart: 1,
                                    monthOfQuarter: 1,
                                    monthOfYear: 1,
                                    isActive: true,
                                    includeMetrics: {
                                      wineConversionRate: true,
                                      clubConversionRate: true,
                                      goalVariance: true,
                                      overallPerformance: true
                                    }
                                  }
                                ];
                              }
                            } else {
                              dashboards = dashboards.filter(d => d.periodType !== key);
                            }
                            return {
                              ...prev,
                              smsCoaching: {
                                ...prev.smsCoaching,
                                staffMembers: [{
                                  ...staff,
                                  dashboards
                                }]
                              }
                            };
                          });
                        }}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">{key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </label>
                    {enabled && dashboard && (
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select
                          value={dashboard.frequency}
                          onValueChange={value => {
                            setFormData(prev => {
                              const staff = prev.smsCoaching?.staffMembers?.[0];
                              if (!staff) return prev;
                              let dashboards = staff.dashboards ?? [];
                              dashboards = dashboards.map(d =>
                                d.periodType === key
                                  ? { ...d, frequency: value as DashboardSchedule["frequency"] }
                                  : d
                              );
                              return {
                                ...prev,
                                smsCoaching: {
                                  ...prev.smsCoaching,
                                  staffMembers: [{
                                    ...staff,
                                    dashboards
                                  }]
                                }
                              };
                            });
                          }}
                        >
                          {frequencyOptions.map(freq => (
                            <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                          ))}
                        </Select>
                        {/* Weekly: day of week and time */}
                        {dashboard.frequency === 'weekly' && (
                          <>
                            <Label>Day of Week</Label>
                            <Select
                              value={String(dashboard.dayOfWeek ?? 0)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, dayOfWeek: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              {daysOfWeek.map((d, i) => (
                                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                              ))}
                            </Select>
                            <Label>Time (EST)</Label>
                            <Input
                              type="time"
                              value={dashboard.timeEST || ''}
                              onChange={e => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, timeEST: e.target.value }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            />
                          </>
                        )}
                        {/* Monthly: week of month, day of week, time */}
                        {dashboard.frequency === 'monthly' && (
                          <>
                            <Label>Week of Month</Label>
                            <Select
                              value={String(dashboard.weekOfMonth ?? 1)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, weekOfMonth: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              {weeksOfMonth.map((w, i) => (
                                <SelectItem key={i} value={String(i+1)}>{w}</SelectItem>
                              ))}
                            </Select>
                            <Label>Day of Week</Label>
                            <Select
                              value={String(dashboard.dayOfWeek ?? 0)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, dayOfWeek: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              {daysOfWeek.map((d, i) => (
                                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                              ))}
                            </Select>
                            <Label>Time (EST)</Label>
                            <Input
                              type="time"
                              value={dashboard.timeEST || ''}
                              onChange={e => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, timeEST: e.target.value }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            />
                          </>
                        )}
                        {/* Quarterly: week of quarter (always 1st), day of week, time */}
                        {dashboard.frequency === 'quarterly' && (
                          <>
                            <Label>Week of Quarter</Label>
                            <Select
                              value={String(dashboard.weekOfMonth ?? 1)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, weekOfMonth: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              <SelectItem value="1">First Week</SelectItem>
                            </Select>
                            <Label>Day of Week</Label>
                            <Select
                              value={String(dashboard.dayOfWeek ?? 0)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, dayOfWeek: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              {daysOfWeek.map((d, i) => (
                                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                              ))}
                            </Select>
                            <Label>Time (EST)</Label>
                            <Input
                              type="time"
                              value={dashboard.timeEST || ''}
                              onChange={e => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, timeEST: e.target.value }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            />
                          </>
                        )}
                        {/* Biweekly: day of week, time, and week start */}
                        {dashboard.frequency === 'biweekly' && (
                          <>
                            <Label>Day of Week</Label>
                            <Select
                              value={String(dashboard.dayOfWeek ?? 0)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  // Fix: Define dashboards BEFORE using it
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, dayOfWeek: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              {daysOfWeek.map((d, i) => (
                                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                              ))}
                            </Select>
                            <Label>Time (EST)</Label>
                            <Input
                              type="time"
                              value={dashboard.timeEST || ''}
                              onChange={e => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, timeEST: e.target.value }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            />
                            <Label>Start on Week #</Label>
                            <Select
                              value={String(dashboard.weekStart ?? 1)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, weekStart: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              {[1,2,3,4,5].map((w) => (
                                <SelectItem key={w} value={String(w)}>{w}</SelectItem>
                              ))}
                            </Select>
                          </>
                        )}
                        {/* Yearly: month, day, time */}
                        {dashboard.frequency === 'yearly' && (
                          <>
                            <Label>Month</Label>
                            <Select
                              value={String(dashboard.monthOfYear ?? 1)}
                              onValueChange={value => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, monthOfYear: Number(value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            >
                              {monthsOfYear.map((m, i) => (
                                <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>
                              ))}
                            </Select>
                            <Label>Day</Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={String(dashboard.dayOfMonth ?? 1)}
                              onChange={e => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, dayOfMonth: Number(e.target.value) }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            />
                            <Label>Time (EST)</Label>
                            <Input
                              type="time"
                              value={dashboard.timeEST || ''}
                              onChange={e => {
                                setFormData(prev => {
                                  const staff = prev.smsCoaching?.staffMembers?.[0];
                                  if (!staff) return prev;
                                  let dashboards = staff.dashboards ?? [];
                                  dashboards = dashboards.map(d =>
                                    d.periodType === key
                                      ? { ...d, timeEST: e.target.value }
                                      : d
                                  );
                                  return {
                                    ...prev,
                                    smsCoaching: {
                                      ...prev.smsCoaching,
                                      staffMembers: [{
                                        ...staff,
                                        dashboards
                                      }]
                                    }
                                  };
                                });
                              }}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coaching Style and Custom Message */}
        <div className="mb-8">
          <Label>Coaching Style</Label>
          <Select
            value={(formData.smsCoaching?.coachingStyle ?? 'balanced')}
            onValueChange={value => setFormData(prev => ({
              ...prev,
              smsCoaching: {
                isActive: typeof prev.smsCoaching?.isActive === 'boolean' ? prev.smsCoaching.isActive : false,
                phoneNumber: prev.smsCoaching?.phoneNumber ?? '',
                staffMembers: prev.smsCoaching?.staffMembers?.map(staff => ({
                  ...staff,
                  id: staff.id ?? '',
                  name: staff.name ?? '',
                  phoneNumber: staff.phoneNumber ?? '',
                  enabled: typeof staff.enabled === 'boolean' ? staff.enabled : false,
                  isActive: typeof staff.isActive === 'boolean' ? staff.isActive : false,
                  dashboards: staff.dashboards ?? []
                })) ?? [],
                coachingStyle: value as any,
                customMessage: prev.smsCoaching?.customMessage ?? '',
              }
            }))}
          >
            {coachingStyleOptions.map(style => (
              <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
            ))}
          </Select>
        </div>
        <div className="mb-8">
          <Label>Custom Message (Optional)</Label>
          <Input
            type="text"
            value={(formData.smsCoaching?.customMessage ?? '')}
            onChange={e => setFormData(prev => ({
              ...prev,
              smsCoaching: {
                isActive: typeof prev.smsCoaching?.isActive === 'boolean' ? prev.smsCoaching.isActive : false,
                phoneNumber: prev.smsCoaching?.phoneNumber ?? '',
                staffMembers: prev.smsCoaching?.staffMembers?.map(staff => ({
                  ...staff,
                  id: staff.id ?? '',
                  name: staff.name ?? '',
                  phoneNumber: staff.phoneNumber ?? '',
                  enabled: typeof staff.enabled === 'boolean' ? staff.enabled : false,
                  isActive: typeof staff.isActive === 'boolean' ? staff.isActive : false,
                  dashboards: staff.dashboards ?? []
                })) ?? [],
                coachingStyle: prev.smsCoaching?.coachingStyle ?? 'balanced',
                customMessage: e.target.value,
              }
            }))}
            placeholder="Enter custom message"
          />
        </div>

        {/* Save/Delete/Send Buttons */}
        <div className="flex space-x-4 mt-8">
          <Button type="button" onClick={handleSubmit}>
            {subscription?._id ? 'Save Changes' : 'Add Subscriber'}
          </Button>
          {subscription?._id && (
            <Button type="button" variant="destructive" onClick={() => onDelete(subscription._id as string || '')}>
              Delete
            </Button>
          )}
          {subscription?._id && (
            <Button type="button" variant="outline" onClick={() => onSendReports(subscription)}>
              Send Email
            </Button>
          )}
          {subscription?._id && formData.smsCoaching?.phoneNumber && formData.smsCoaching?.staffMembers && formData.smsCoaching.staffMembers[0] && (
            <Button type="button" variant="outline" onClick={handleSendSMS} disabled={sendingSMS}>
              {sendingSMS ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {sendingSMS ? 'Sending SMS...' : 'Send SMS'}
            </Button>
          )}
          {subscription?._id && formData.smsCoaching?.phoneNumber && (
            <Button type="button" variant="secondary" onClick={() => setSmsArchiveOpen(true)}>
              SMS Archive
            </Button>
          )}
        </div>
      </div>
      {/* SMS Archive Modal */}
      {smsArchiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">SMS Archive</h2>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setSmsArchiveOpen(false)}>&times;</button>
            </div>
            {smsArchiveLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {smsArchive.length === 0 ? (
                  <div>No SMS messages found.</div>
                ) : (
                  <ul>
                    {smsArchive.map((msg, idx) => (
                      <li key={msg._id || idx} className="border-b py-2 cursor-pointer" onClick={() => setSelectedMessage(msg)}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs text-gray-500">{new Date(msg.sentAt).toLocaleString()}</span>
                          <span className="ml-2 truncate w-64">{msg.coachingMessage.slice(0, 48)}{msg.coachingMessage.length > 48 ? '...' : ''}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {selectedMessage && (
              <div className="mt-4 p-4 border rounded bg-gray-50 max-h-80 overflow-y-auto">
                <div className="font-mono text-xs text-gray-500 mb-2">{new Date(selectedMessage.sentAt).toLocaleString()}</div>
                <div className="whitespace-pre-line">{selectedMessage.coachingMessage}</div>
                <button className="mt-2 px-4 py-2 border rounded bg-white hover:bg-gray-100" onClick={() => setSelectedMessage(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 