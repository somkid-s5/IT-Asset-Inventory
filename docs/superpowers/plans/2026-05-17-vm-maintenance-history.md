# VM Maintenance History and Ticket UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement maintenance history for virtual machines by linking them with tickets and enhance the ticket comment UI with color-coded types.

**Architecture:** Update Prisma schema to add a `vmId` field to the `Ticket` model, forming a relationship with `VmInventory`. Update backend services to handle this relation and frontend pages to display the history and improve comment visualization.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React (Next.js), Tailwind CSS, Lucide icons.

---

### Task 1: Backend Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Update schema to include VM-Ticket relationship**

```prisma
// backend/prisma/schema.prisma

model VmInventory {
  // ... existing fields
  tickets     Ticket[] // Add this line
}

model Ticket {
  // ... existing fields
  vmId        String?
  vm          VmInventory?   @relation(fields: [vmId], references: [id])
}
```

- [ ] **Step 2: Run Prisma migration**

Run in `backend/` directory:
`npx prisma migrate dev --name add_vm_to_ticket`

Expected: Success message and updated `prisma/client`.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(backend): add vmId to Ticket and tickets relation to VmInventory"
```

### Task 2: Backend Service Updates

**Files:**
- Modify: `backend/src/tickets/tickets.service.ts`
- Modify: `backend/src/vm/vm.service.ts`

- [ ] **Step 1: Update TicketsService to handle vmId**

```typescript
// backend/src/tickets/tickets.service.ts

// Update create method to include vmId if provided
async create(createTicketDto: CreateTicketDto, creatorId: string) {
  // ... existing logic
  const ticket = await this.prisma.ticket.create({
    data: {
      ...ticketData,
      ticketNo,
      clientId: client.id,
      creatorId,
      // Ensure vmId is handled if in DTO
    },
    include: {
      // ... existing includes
      asset: { select: { id: true, name: true, type: true } },
      vm: { select: { id: true, name: true } }, // Add this
    },
  });
  // ...
}

// Update findOne to include vm
async findOne(id: string) {
  const ticket = await this.prisma.ticket.findUnique({
    where: { id },
    include: {
      // ... existing includes
      asset: { select: { id: true, name: true, type: true } },
      vm: { select: { id: true, name: true } }, // Add this
      // ...
    },
  });
  // ...
}
```

- [ ] **Step 2: Update VmService to include tickets in inventory response**

```typescript
// backend/src/vm/vm.service.ts

async findInventoryById(id: string) {
  this.ensureSeedData();
  const inventory = await this.prisma.vmInventory.findUnique({
    where: { id },
    include: {
      source: true,
      guestAccounts: true,
      tickets: { // Add this
        include: {
          client: { select: { name: true } },
          assignee: { select: { displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!inventory) {
    throw new NotFoundException(`VM inventory ${id} not found`);
  }

  return this.mapInventory(inventory as any); // Update mapping if needed
}

// Update mapInventory to include tickets
private mapInventory(inventory: any) {
  return {
    // ... existing mappings
    tickets: inventory.tickets || [], // Ensure tickets are passed through
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/tickets/tickets.service.ts backend/src/vm/vm.service.ts
git commit -m "feat(backend): support tickets in VM and include VM in Ticket response"
```

### Task 3: VM Detail UI - Ticket History

**Files:**
- Modify: `frontend/src/lib/vm-inventory.ts`
- Modify: `frontend/src/app/dashboard/virtual-machines/[id]/page.tsx`

- [ ] **Step 1: Update VmInventoryDetail interface**

```typescript
// frontend/src/lib/vm-inventory.ts

export interface VmInventoryDetail extends VmInventoryItem {
  notes: string;
  sourceHistory: VmSourceHistoryItem[];
  guestAccounts: VmGuestAccount[];
  tickets: any[]; // Add this
}
```

- [ ] **Step 2: Import History and User icons and Badge**

```tsx
import { ..., History, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
```

- [ ] **Step 2: Define TicketHistorySection component**

```tsx
function TicketHistorySection({ tickets }: { tickets: any[] }) {
  const router = useRouter();
  
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold tracking-tight text-foreground text-opacity-90">Maintenance & Support History</h2>
        {tickets.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {tickets.length}
          </span>
        )}
      </div>
      
      <div className="glass-card divide-y divide-border/40 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground italic">
            No maintenance tickets recorded for this virtual machine
          </div>
        ) : (
          tickets.map((ticket) => (
            <div 
              key={ticket.id} 
              className="group p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-primary">{ticket.ticketNo}</span>
                    <Badge variant="outline" className="text-[9px] h-4.5 font-bold uppercase">{ticket.status.replace(/_/g, ' ')}</Badge>
                 </div>
                 <span className="text-[10px] text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">{ticket.title}</h4>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                 <span className="flex items-center gap-1"><User className="h-3 w-3" /> {ticket.assignee?.displayName || 'Unassigned'}</span>
                 <span>•</span>
                 <span>Client: {ticket.client?.name || 'Unknown'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update Main Page Layout to include sidebar and section**

```tsx
// Wrap the main content and sidebar in a grid
return (
  <motion.div ...>
    {/* ... Header and Hero ... */}
    
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
       <div className="space-y-6">
          {/* Tab Navigation and Content ... */}
          {/* Guest Accounts Table ... */}
       </div>
       
       <div className="space-y-6">
          <TicketHistorySection tickets={(vm as any).tickets || []} />
       </div>
    </div>
  </motion.div>
);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/virtual-machines/[id]/page.tsx
git commit -m "feat(frontend): add TicketHistorySection to VM Detail page"
```

### Task 4: Ticket Detail UI Enhancements

**Files:**
- Modify: `frontend/src/app/dashboard/tickets/[id]/page.tsx`

- [ ] **Step 1: Enhance Comment visualization based on commentType**

```tsx
// frontend/src/app/dashboard/tickets/[id]/page.tsx

{ticket.comments?.map((comment) => (
  <div key={comment.id} className={cn(
    "flex flex-col gap-4 p-5 rounded-[24px] border-2 group transition-all",
    comment.isSystem ? "bg-muted/30 border-border/40" : "bg-card border-border/60 hover:border-primary/20",
    // Add these type-based styles
    !comment.isSystem && comment.commentType === 'INVESTIGATION' && "border-amber-500/30 bg-amber-500/[0.03]",
    !comment.isSystem && comment.commentType === 'ACTION' && "border-blue-500/30 bg-blue-500/[0.03]",
    !comment.isSystem && comment.commentType === 'RESOLUTION' && "border-emerald-500/30 bg-emerald-500/[0.03]"
  )}>
    {/* ... header and badge logic already exists, ensure it matches design ... */}
  </div>
))}
```

- [ ] **Step 2: Add Related VM Card in sidebar**

```tsx
// frontend/src/app/dashboard/tickets/[id]/page.tsx

<div className="space-y-6">
   {/* Existing Asset Card */}
   {/* ... */}
   
   {/* Add Related VM Card */}
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
             className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 border-2"
           >
              View VM Detail <ExternalLink className="h-3 w-3 ml-2" />
           </Button>
        </div>
     </Card>
   )}
   
   {/* ... Management card ... */}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/tickets/[id]/page.tsx
git commit -m "feat(frontend): enhance ticket comments UI and add Related VM card"
```

### Task 5: Verification and Final Checks

- [ ] **Step 1: Verify data flow**
- Check that tickets can be linked to VMs (via manual DB update if UI for linking isn't in scope yet, or check service logic).
- Check that VM detail page correctly lists these tickets.
- [ ] **Step 2: Verify comment UI**
- Add comments with different types (INVESTIGATION, RESOLUTION) and verify colors and icons.
- [ ] **Step 3: Verify navigation**
- Navigate VM -> Ticket -> VM.
- [ ] **Step 4: Commit final verification**

```bash
git commit --allow-empty -m "test: verify VM maintenance history and ticket UI improvements"
```
