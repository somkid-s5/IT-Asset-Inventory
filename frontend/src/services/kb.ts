import api from './api';

export interface KBArticle {
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
  articles?: KBArticle[];
  _count?: { articles: number };
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
  getArticles: async (categoryId?: string) => {
    const res = await api.get<KBArticle[]>(`/knowledge-base/articles${categoryId ? `?categoryId=${categoryId}` : ''}`);
    return res.data;
  },
  getRecentArticles: async (limit: number = 5) => {
    const res = await api.get<KBArticle[]>('/knowledge-base/recent', {
      params: { limit },
    });
    return res.data;
  },
  getArticle: async (id: string) => {
    const res = await api.get<KBArticle>(`/knowledge-base/articles/${id}`);
    return res.data;
  },
  deleteCategory: async (id: string) => {
    const res = await api.delete(`/knowledge-base/categories/${id}`);
    return res.data;
  },
  createArticle: async (data: { title: string; content: string; categoryId: string }) => {
    const res = await api.post<KBArticle>('/knowledge-base/articles', data);
    return res.data;
  },
  updateArticle: async (id: string, data: any) => {
    const res = await api.patch<KBArticle>(`/knowledge-base/articles/${id}`, data);
    return res.data;
  },
  deleteArticle: async (id: string) => {
    const res = await api.delete(`/knowledge-base/articles/${id}`);
    return res.data;
  },
  uploadImage: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    console.log('📤 Uploading image to:', `${api.defaults.baseURL}/knowledge-base/upload`);
    const res = await api.post<{ url: string }>('/knowledge-base/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  }
};
