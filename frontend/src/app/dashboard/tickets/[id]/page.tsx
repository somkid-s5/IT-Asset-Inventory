'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsService, TicketStatus, TicketPriority, TicketCommentType } from '@/services/tickets';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ChevronLeft, Clock, User, 
  Send, ShieldAlert, CheckCircle2, PlayCircle, 
  History, Box, HardDrive, 
  ExternalLink, Trash2, LoaderCircle, Activity,
  Search, Shield, CheckCircle, Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import dynamic from 'next/dynamic';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations';

const NotionEditor = dynamic(() => import('@/components/NotionEditor'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-[150px] w-full bg-muted/20 animate-pulse rounded-[24px] border-2 border-dashed border-border/40 flex items-center justify-center">
      <LoaderCircle className="h-6 w-6 animate-spin opacity-20" />
    </div>
  )
});

const priorityColors: Record<TicketPriority, string> = {
  LOW: 'text-low bg-low/10 border-low/20',
  MEDIUM: 'text-medium bg-medium/10 border-medium/20',
  HIGH: 'text-high bg-high/10 border-high/20',
  CRITICAL: 'text-critical bg-critical/10 border-critical/20 animate-pulse',
};

const statusColors: Record<TicketStatus, string> = {
  OPEN: 'text-info bg-info/10 border-info/20',
  IN_PROGRESS: 'text-warning bg-warning/10 border-warning/20',
  WAITING_FOR_CLIENT: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
  RESOLVED: 'text-success bg-success/10 border-success/20',
  CLOSED: 'text-muted-foreground bg-muted/50 border-muted-foreground/20',
};

export default function TicketDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { setHeader } = usePageHeader();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState('');
  const [commentType, setCommentType] = useState<TicketCommentType>('GENERAL');

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsService.findOne(id as string),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: TicketStatus) => ticketsService.update(id as string, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      toast.success('Ticket status updated');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update ticket status';
      toast.error(msg);
    }
  });

  const commentMutation = useMutation({
    mutationFn: ({ content, type }: { content: string; type: TicketCommentType }) => ticketsService.addComment(id as string, content, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setCommentContent('');
      setCommentType('GENERAL');
      toast.success('Activity log added');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || error?.message || 'Failed to add activity log';
      toast.error(msg);
    }
  });


  useEffect(() => {
    if (ticket) {
      setHeader({
        title: `Ticket ${ticket.ticketNo}`,
        breadcrumbs: [
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Tickets', href: '/dashboard/tickets' },
          { label: ticket.ticketNo },
        ],
      });
    }
  }, [ticket, setHeader]);

  if (isLoading) return <TicketSkeleton />;
  if (!ticket) return <div>Ticket not found</div>;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-6xl mx-auto space-y-6 pb-20"
    >
      {/* Top Action Bar */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-xl font-bold text-xs w-fit">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Workspace
        </Button>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl h-10 px-5 font-black uppercase text-[10px] tracking-widest border-2 shadow-sm">
                 Update Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-2">
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate('IN_PROGRESS')} className="font-bold text-xs gap-2">
                 <PlayCircle className="h-4 w-4 text-warning" /> Start Working
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate('WAITING_FOR_CLIENT')} className="font-bold text-xs gap-2">
                 <Clock className="h-4 w-4 text-purple-500" /> Waiting for Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate('RESOLVED')} className="font-bold text-xs gap-2 text-success focus:text-success focus:bg-success/5">
                 <CheckCircle2 className="h-4 w-4" /> Resolve Ticket
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate('CLOSED')} className="font-bold text-xs gap-2 text-muted-foreground focus:text-muted-foreground focus:bg-muted/5">
                 <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Close Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Left) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <Card className="p-8 rounded-[32px] border-2 shadow-xl bg-card/50 backdrop-blur-sm space-y-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldAlert className="h-40 w-40 rotate-12" />
             </div>

             <div className="space-y-4 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                   <Badge variant="outline" className={cn("px-3 py-0.5 rounded-full font-black text-[10px] uppercase tracking-widest border-2", priorityColors[ticket.priority])}>
                      {ticket.priority}
                   </Badge>
                   <Badge variant="outline" className={cn("px-3 py-0.5 rounded-full font-black text-[10px] uppercase tracking-widest border-2", statusColors[ticket.status])}>
                      {ticket.status.replace(/_/g, ' ')}
                   </Badge>
                </div>
                <h1 className="text-4xl font-black tracking-tight leading-tight">{ticket.title}</h1>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-border/40">
                <div className="space-y-1">
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Requested By</p>
                   <p className="text-sm font-bold">{ticket.client.name}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Assignee</p>
                   <p className={cn("text-sm font-bold", ticket.assigneeId === user?.id && "text-primary")}>
                      {ticket.assignee?.displayName || 'Unassigned'}
                   </p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Created</p>
                   <p className="text-sm font-bold">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Time Active</p>
                   <p className="text-sm font-bold">{formatDistanceToNow(new Date(ticket.createdAt))}</p>
                </div>
             </div>
          </Card>

          {/* Activity Log Area */}
          <div className="space-y-6">
             <h2 className="text-xl font-black px-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Activity & Work Logs
             </h2>
             
             <div className="space-y-4">
                {ticket.comments?.length === 0 ? (
                  <div className="p-10 text-center rounded-[32px] border-2 border-dashed bg-muted/5 opacity-40">
                     <p className="text-sm font-medium">No activity logged yet. Start the investigation!</p>
                  </div>
                ) : (
                  ticket.comments?.map((comment) => (
                    <div key={comment.id} className={cn(
                      "flex flex-col gap-4 p-5 rounded-[24px] border-2 group transition-all",
                      comment.isSystem ? "bg-muted/30 border-border/40" : cn(
                        "bg-card border-border/60 hover:border-primary/20",
                        comment.commentType === 'INVESTIGATION' && "border-warning/30 bg-warning/[0.03]",
                        comment.commentType === 'ACTION' && "border-low/30 bg-low/[0.03]",
                        comment.commentType === 'RESOLUTION' && "border-success/30 bg-success/[0.03]"
                      )
                    )}>
                       <div className="flex items-center justify-between border-b border-border/40 pb-3">
                         <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                              {comment.isSystem ? <History className="h-4 w-4 opacity-40" /> : <User className="h-4 w-4 opacity-40" />}
                           </div>
                           <div className="flex flex-col">
                             <span className="text-xs font-black uppercase tracking-tight">{comment.user?.displayName || 'System'}</span>
                             <span className="text-[10px] text-muted-foreground font-medium">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                           </div>
                         </div>
                         {!comment.isSystem && (
                            <Badge variant="outline" className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0 h-5 border-2",
                              comment.commentType === 'INVESTIGATION' && "text-warning border-warning/20 bg-warning/5",
                              comment.commentType === 'ACTION' && "text-low border-low/20 bg-low/5",
                              comment.commentType === 'RESOLUTION' && "text-success border-success/20 bg-success/5",
                              comment.commentType === 'GENERAL' && "text-muted-foreground border-border/40"
                            )}>
                             {comment.commentType === 'INVESTIGATION' && <Search className="w-3 h-3 mr-1" />}
                             {comment.commentType === 'ACTION' && <Shield className="w-3 h-3 mr-1" />}
                             {comment.commentType === 'RESOLUTION' && <CheckCircle className="w-3 h-3 mr-1" />}
                             {comment.commentType}
                           </Badge>
                         )}
                       </div>
                       <div className="text-sm leading-relaxed text-foreground/90 overflow-hidden">
                          {comment.isSystem ? (
                            <p>{comment.content}</p>
                          ) : (
                             <MarkdownRenderer content={comment.content} className="prose-sm text-xs prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/40 prose-img:rounded-xl" />
                          )}
                       </div>
                    </div>
                  ))
                )}
             </div>

             <div className="p-6 rounded-[32px] border-2 bg-card/30 backdrop-blur-md shadow-lg space-y-4 border-primary/10">
                <div className="flex items-center justify-between mb-2">
                   <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Add Work Log</Label>
                   <Select value={commentType} onValueChange={(val: string) => setCommentType(val as TicketCommentType)}>
                      <SelectTrigger className="w-[180px] h-8 text-xs font-bold rounded-lg border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        <SelectItem value="GENERAL">General Update</SelectItem>
                        <SelectItem value="INVESTIGATION">Investigation</SelectItem>
                        <SelectItem value="ACTION">Action Taken</SelectItem>
                        <SelectItem value="RESOLUTION">Resolution</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                
                <div className="min-h-[150px] bg-card rounded-2xl border-2 border-border/40 overflow-hidden">
                   <NotionEditor 
                      onChange={(markdown) => setCommentContent(markdown)}
                   />
                </div>

                <div className="flex justify-between items-center px-1 pt-2">
                   <p className="text-[10px] text-muted-foreground italic font-medium uppercase tracking-tighter">Support staff will be notified via Line.</p>
                   <Button 
                      onClick={() => commentMutation.mutate({ content: commentContent, type: commentType })}
                      disabled={!commentContent.trim() || commentMutation.isPending}
                      className="rounded-xl px-6 font-bold shadow-xl shadow-primary/20"
                   >
                      {commentMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Post Update
                   </Button>
                </div>
             </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
           {(ticket as any).slaDeadline && (
             <Card className="p-6 rounded-[32px] border-2 bg-muted/30 border-border/50 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                   <Clock className="h-3 w-3" /> SLA Target
                </h3>
                {(() => {
                   const t = ticket as any;
                   const deadline = new Date(t.slaDeadline);
                   const resolved = t.resolvedAt ? new Date(t.resolvedAt) : null;
                   const now = new Date();
                   const created = new Date(t.createdAt);

                   const totalSla = (t.slaLimitHours || 24) * 60 * 60 * 1000;
                   const elapsed = (resolved ? resolved.getTime() : now.getTime()) - created.getTime();
                   const percent = Math.min(100, Math.max(0, (elapsed / totalSla) * 100));

                   const isBreached = t.slaStatus === 'BREACHED';
                   const isCompleted = ['RESOLVED', 'CLOSED'].includes(t.status);

                   let colorClass = 'bg-success';
                   let borderClass = 'border-success/10 bg-success/[0.01]';
                   let textClass = 'text-success';

                   if (isBreached) {
                     colorClass = 'bg-critical';
                     borderClass = 'border-critical/10 bg-critical/[0.01]';
                     textClass = 'text-critical';
                   } else if (percent > 75) {
                     colorClass = 'bg-warning animate-pulse';
                     borderClass = 'border-warning/10 bg-warning/[0.01]';
                     textClass = 'text-warning';
                   } else if (percent > 50) {
                     colorClass = 'bg-high';
                     borderClass = 'border-high/10 bg-high/[0.01]';
                     textClass = 'text-high';
                   }

                   return (
                     <div className={cn("rounded-2xl border p-4 space-y-3", borderClass)}>
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-muted-foreground uppercase">Status</span>
                           <Badge className={cn("text-[9px] font-black tracking-widest uppercase border-2", isBreached ? "bg-critical/10 text-critical border-critical/20" : isCompleted ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20")}>
                              {isBreached ? 'SLA Breached' : isCompleted ? 'Met SLA' : 'Active SLA'}
                           </Badge>
                        </div>
                        <div className="space-y-1">
                           <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/10">
                              <div
                                className={cn("h-full transition-all duration-500", colorClass)}
                                style={{ width: `${isCompleted && !isBreached ? 100 : percent}%` }}
                              />
                           </div>
                           <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground tracking-tight">
                              <span>{isCompleted ? 'Resolved' : `${Math.round(100 - percent)}% left`}</span>
                              <span>Limit: {t.slaLimitHours || 24} hours</span>
                           </div>
                        </div>
                        <div className="pt-2 border-t border-border/40 text-[10px] space-y-1 font-medium text-muted-foreground/80 leading-relaxed">
                           <div className="flex justify-between">
                              <span>Deadline:</span>
                              <span className="font-bold text-foreground">{deadline.toLocaleString()}</span>
                           </div>
                           {resolved && (
                             <div className="flex justify-between">
                                <span>Resolved in:</span>
                                <span className="font-bold text-foreground">{Math.round(elapsed / (60 * 60 * 1000) * 10) / 10} hours</span>
                             </div>
                           )}
                        </div>
                     </div>
                   );
                })()}
             </Card>
           )}

           <Card className="p-6 rounded-[32px] border-2 bg-primary/[0.02] border-primary/10 space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 flex items-center gap-2">
                 <Box className="h-3 w-3" /> Related Asset
              </h3>
              {ticket.asset ? (
                <div className="space-y-4">
                   <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                         <HardDrive className="h-6 w-6" />
                      </div>
                      <div className="overflow-hidden">
                         <p className="text-sm font-black truncate">{ticket.asset.name}</p>
                         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{ticket.asset.type}</p>
                      </div>
                   </div>
                   <Button 
                     variant="outline" 
                     onClick={() => router.push(`/dashboard/assets/${ticket.assetId}?returnTo=/dashboard/tickets/${id}`)}
                     className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 border-2"
                   >
                      View Inventory Detail <ExternalLink className="h-3 w-3 ml-2" />
                   </Button>
                </div>
              ) : (
                <div className="space-y-3">
                   <p className="text-xs text-muted-foreground italic leading-relaxed">No asset linked to this ticket yet.</p>
                   <Button variant="outline" className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 border-dashed border-2 opacity-60">
                      Link Asset Inventory
                   </Button>
                </div>
              )}
           </Card>

           {ticket.vm && (
             <Card className="p-6 rounded-[32px] border-2 bg-indigo-500/[0.02] border-indigo-500/10 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60 flex items-center gap-2">
                   <Monitor className="h-3 w-3" /> Related VM
                </h3>
                <div className="space-y-4">
                   <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-sm">
                         <Monitor className="h-6 w-6" />
                      </div>
                      <div className="overflow-hidden">
                         <p className="text-sm font-black truncate">{ticket.vm.name}</p>
                         <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Virtual Machine</p>
                      </div>
                   </div>
                   <Button 
                     variant="outline" 
                     onClick={() => router.push(`/dashboard/virtual-machines/${ticket.vmId}?returnTo=/dashboard/tickets/${id}`)}
                     className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 border-2 hover:bg-indigo-500/5 hover:text-indigo-600 hover:border-indigo-500/20"
                   >
                      View VM Detail <ExternalLink className="h-3 w-3 ml-2" />
                   </Button>
                </div>
             </Card>
           )}

           <Card className="p-6 rounded-[32px] border-2 space-y-4 bg-muted/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Management</h3>
              <div className="grid grid-cols-1 gap-2">
                 <Button variant="outline" className="w-full justify-start rounded-xl text-[11px] font-bold h-10 border-2">
                    <History className="h-3.5 w-3.5 mr-2 opacity-60" /> View History
                 </Button>
                 <Button variant="outline" className="w-full justify-start rounded-xl text-[11px] font-bold h-10 border-2 text-critical hover:text-critical/90 hover:bg-critical/5 border-critical/10">
                    <Trash2 className="h-3.5 w-3.5 mr-2 opacity-60" /> Delete Ticket
                 </Button>
              </div>
           </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function TicketSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-[400px] rounded-[32px]" />
        <Skeleton className="h-[200px] rounded-[32px]" />
      </div>
    </div>
  );
}
