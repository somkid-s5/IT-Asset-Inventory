# Design Specification: VM Maintenance History and Ticket UI Enhancements

## Overview
This specification details the implementation of a maintenance history section for virtual machines (VMs) and visual improvements to the ticket comment system. It bridges the gap between VM management and the support ticketing system.

## 1. Backend: Linking Tickets and VMs

### 1.1 Schema Updates (`backend/prisma/schema.prisma`)
- Add `vmId` (String?) to the `Ticket` model.
- Define a relation between `Ticket.vmId` and `VmInventory.id`.
- Add `tickets` (Ticket[]) to the `VmInventory` model.

### 1.2 Service Updates
- **TicketsService**:
    - Update `create` and `update` methods to handle `vmId`.
    - Update `findOne` to include the `vm` relation in the response.
- **VmService**:
    - Update `findInventoryById` to include `tickets` in the response.
    - Map the `tickets` field in the `mapInventory` helper to match the structure used by assets.

## 2. Frontend: VM Detail Page Enhancements

### 2.1 UI Component Porting
- Adapt `TicketHistorySection` from `assets/[id]/page.tsx` for use in `virtual-machines/[id]/page.tsx`.
- Place the component in the right sidebar of the VM Detail page, consistent with the Asset Detail layout.

### 2.2 Data Integration
- Ensure the VM data query fetches the `tickets` array.
- Pass the tickets to the `TicketHistorySection`.

## 3. Frontend: Ticket Detail Page Enhancements

### 3.1 Comment Visualization
- Update the comment rendering logic to use `commentType` for visual differentiation.
- Apply color-coded borders and backgrounds to comment cards:
    - **INVESTIGATION**: Yellow (`amber-500`) with `Search` icon.
    - **ACTION**: Blue (`blue-500`) with `Shield` icon.
    - **RESOLUTION**: Green (`emerald-500`) with `CheckCircle` icon.
    - **GENERAL**: Neutral/Gray.

### 3.2 Related VM Card
- Add a "Related VM" card to the right sidebar, similar to the existing "Related Asset" card.
- Show VM name, type (Virtual Machine), and a link to the VM Detail page.

## 4. Navigation & Flow
- Verify "Back to VM" link in VM Detail page.
- Ensure clicking a ticket from the VM page correctly navigates to the Ticket Detail.
- Ensure clicking the "View VM Detail" link from the Ticket page correctly navigates back to the VM.

## 5. Verification Plan
- **Backend**: Run Prisma migration and verify API responses for `/api/tickets` and `/api/vm/inventory/:id`.
- **Frontend**:
    - Manually verify the Maintenance History section appears on the VM page.
    - Create a test ticket linked to a VM and verify it appears in the history.
    - Add different types of comments and verify color/icon coding.
    - Test navigation links between VM and Ticket pages.
