import api from './api';

export interface KBDocument {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  category: { id: string; name: string; icon?: string };
  authorId: string;
  author: { displayName: string; avatarSeed: string };
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KBCategory {
  id: string;
  name: string;
  icon?: string;
  documents?: KBDocument[];
  _count?: { documents: number };
}

export const kbService = {
  getCategories: async () => {
    const res = await api.get<KBCategory[]>('/knowledge-base/categories');
    return res.data;
  },
  initializeCategories: async () => {
    const res = await api.post('/knowledge-base/categories/initialize');
    return res.data;
  },
  createCategory: async (data: { name: string; icon?: string }) => {
    const res = await api.post<KBCategory>('/knowledge-base/categories', data);
    return res.data;
  },
  getCategory: async (id: string) => {
    const res = await api.get<KBCategory>(`/knowledge-base/categories/${id}`);
    return res.data;
  },
  getDocuments: async (categoryId?: string) => {
    const res = await api.get<KBDocument[]>(`/knowledge-base/documents${categoryId ? `?categoryId=${categoryId}` : ''}`);
    return res.data;
  },
  getRecentDocuments: async (limit: number = 5) => {
    const res = await api.get<KBDocument[]>('/knowledge-base/recent', {
      params: { limit },
    });
    return res.data;
  },
  getDocument: async (id: string) => {
    const res = await api.get<KBDocument>(`/knowledge-base/documents/${id}`);
    return res.data;
  },
  deleteCategory: async (id: string) => {
    const res = await api.delete(`/knowledge-base/categories/${id}`);
    return res.data;
  },
  createDocument: async (data: { title: string; content: string; categoryId: string }) => {
    const res = await api.post<KBDocument>('/knowledge-base/documents', data);
    return res.data;
  },
  updateDocument: async (id: string, data: any) => {
    const res = await api.patch<KBDocument>(`/knowledge-base/documents/${id}`, data);
    return res.data;
  },
  deleteDocument: async (id: string) => {
    const res = await api.delete(`/knowledge-base/documents/${id}`);
    return res.data;
  },
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    // Silent log
    const res = await api.post<{ url: string }>('/knowledge-base/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  }
};
