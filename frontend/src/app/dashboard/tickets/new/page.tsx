'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { ticketsService, TicketPriority } from '@/services/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { ClientAutocomplete } from '@/components/ClientAutocomplete';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Send, AlertCircle, Info, 
  HelpCircle, Server, User as UserIcon
} from 'lucide-react';
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';

export default function NewTicketPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as TicketPriority,
    clientName: '',
    assetId: '',
    assigneeId: '',
  });

  useEffect(() => {
    setHeader({
      title: 'Open New Ticket',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Tickets', href: '/dashboard/tickets' },
        { label: 'New' },
      ],
    });
  }, [setHeader]);

  // Fetch data for dropdowns
  const { data: assets = [] } = useQuery({
    queryKey: ['assets-brief'],
    queryFn: async () => {
      const res = await api.get('/assets');
      return res.data;
    }
  });

  const { data: admins = [] } = useQuery({
    queryKey: ['admins-brief'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.clientName) {
      toast.error('Title and Client Name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await ticketsService.create({
        ...formData,
        assetId: (formData.assetId && formData.assetId !== 'none') ? formData.assetId : undefined,
        assigneeId: (formData.assigneeId && formData.assigneeId !== 'none') ? formData.assigneeId : undefined,
      });
      toast.success('Ticket created successfully and notification sent!');
      router.push('/dashboard/tickets');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Create Support Ticket</h1>
      </motion.div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <Card className="lg:col-span-2 p-6 rounded-[32px] border-2 shadow-lg space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold ml-1">Problem Summary</Label>
              <Input
                id="title"
                placeholder="Briefly describe the issue..."
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="h-12 text-lg font-medium rounded-xl border-border/50 focus-visible:ring-primary/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold ml-1">Detailed Description</Label>
              <Textarea
                id="description"
                placeholder="Provide more context or steps taken..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[200px] rounded-xl border-border/50 focus-visible:ring-primary/20 resize-none"
              />
            </div>
          </Card>

          {/* Sidebar / Metadata */}
          <div className="space-y-6">
            <Card className="p-6 rounded-[32px] border-2 shadow-md space-y-5 bg-muted/30">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <UserIcon className="h-3 w-3" /> Requester / Client
                </Label>
                <ClientAutocomplete 
                  value={formData.clientName}
                  onChange={(val) => setFormData({ ...formData, clientName: val })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" /> Priority Level
                </Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(val: TicketPriority) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="rounded-xl h-10 bg-card/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="LOW">Low (Chill)</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High (Urgent)</SelectItem>
                    <SelectItem value="CRITICAL">Critical (Now!)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Server className="h-3 w-3" /> Related Asset
                </Label>
                <Select 
                  value={formData.assetId} 
                  onValueChange={(val) => setFormData({ ...formData, assetId: val })}
                >
                  <SelectTrigger className="rounded-xl h-10 bg-card/50">
                    <SelectValue placeholder="None / General Issue" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">No Specific Asset</SelectItem>
                    {assets.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.assetId || a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <UserIcon className="h-3 w-3" /> Assign To
                </Label>
                <Select 
                  value={formData.assigneeId} 
                  onValueChange={(val) => setFormData({ ...formData, assigneeId: val })}
                >
                  <SelectTrigger className="rounded-xl h-10 bg-card/50">
                    <SelectValue placeholder="Unassigned (Pool)" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {admins.filter((u: any) => u.role !== 'VIEWER').map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-2xl shadow-xl shadow-primary/20 text-md font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Create Ticket
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Tips Card */}
            <Card className="p-4 rounded-2xl border bg-primary/5 border-primary/10">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary uppercase">Pro Tip</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Linking an asset helps Admins see technical history and documentation immediately.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
