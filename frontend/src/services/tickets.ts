import api from './api';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CLIENT' | 'RESOLVED' | 'CLOSED';

export interface Client {
  id: string;
  name: string;
}

export type TicketCommentType = 'GENERAL' | 'INVESTIGATION' | 'ACTION' | 'RESOLUTION';

export interface TicketComment {
  id: string;
  content: string;
  commentType: TicketCommentType;
  isSystem: boolean;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarSeed: string;
  };
}

export interface Ticket {
  id: string;
  ticketNo: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  clientId: string;
  client: Client;
  assetId?: string;
  asset?: { id: string; name: string; type: string };
  assigneeId?: string;
  assignee?: { id: string; displayName: string };
  vmId?: string;
  vm?: { id: string; name: string };
  creatorId: string;
  creator: { id: string; displayName: string };
  comments?: TicketComment[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CreateTicketDto {
  title: string;
  description?: string;
  priority?: TicketPriority;
  clientName: string;
  assetId?: string;
  assigneeId?: string;
}

export const ticketsService = {
  findAll: async () => {
    const res = await api.get<Ticket[]>('/tickets');
    return res.data;
  },
  findOne: async (id: string) => {
    const res = await api.get<Ticket>(`/tickets/${id}`);
    return res.data;
  },
  create: async (data: CreateTicketDto) => {
    const res = await api.post<Ticket>('/tickets', data);
    return res.data;
  },
  update: async (id: string, data: Partial<Ticket>) => {
    const res = await api.patch<Ticket>(`/tickets/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/tickets/${id}`);
    return res.data;
  },
  addComment: async (ticketId: string, content: string, commentType: TicketCommentType = 'GENERAL') => {
    const res = await api.post<TicketComment>(`/tickets/${ticketId}/comments`, { content, commentType });
    return res.data;
  }
};

export const clientsService = {
  search: async (q: string) => {
    const res = await api.get<Client[]>(`/clients/search?q=${q}`);
    return res.data;
  }
};
