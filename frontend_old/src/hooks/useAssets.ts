'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/services/api';

export interface AssetIpAllocation {
  id?: string;
  address: string;
  type?: string | null;
}

export interface Asset {
  id: string;
  assetId?: string | null;
  name: string;
  type: 'SERVER' | 'STORAGE' | 'SWITCH' | 'SP' | 'NETWORK';
  ipAllocations?: AssetIpAllocation[];
  rack?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  parentId?: string | null;
  children?: Asset[];
}

export interface CreateAssetDto {
  name: string;
  type: Asset['type'];
  assetId?: string | null;
  rack?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  parentId?: string | null;
  ipAllocations?: AssetIpAllocation[];
}

export interface UpdateAssetDto {
  name?: string;
  type?: Asset['type'];
  assetId?: string | null;
  rack?: string | null;
  brandModel?: string | null;
  sn?: string | null;
  parentId?: string | null;
  ipAllocations?: AssetIpAllocation[];
}

// Query Keys
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: string) => [...assetKeys.lists(), { filters }] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

// Hooks
export function useAssets() {
  return useQuery({
    queryKey: assetKeys.lists(),
    queryFn: async () => {
      const response = await api.get<Asset[]>('/assets');
      return response.data;
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<Asset>(`/assets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssetDto) => {
      const response = await api.post<Asset>('/assets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      toast.success('Asset created successfully');
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to create asset';
      toast.error(message);
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAssetDto }) => {
      const response = await api.patch<Asset>(`/assets/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedAsset) => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      queryClient.setQueryData(assetKeys.detail(updatedAsset.id), updatedAsset);
      toast.success('Asset updated successfully');
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to update asset';
      toast.error(message);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assets/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Optimistic update: remove from cache
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
      
      // Remove from detail cache
      const queries = queryClient.getQueriesData<Asset>({ queryKey: assetKeys.details() });
      queries.forEach(([queryKey, asset]) => {
        if (asset && asset.id === deletedId) {
          queryClient.removeQueries({ queryKey });
        }
      });
      
      toast.success('Asset deleted successfully');
    },
    onError: (error: unknown) => {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to delete asset';
      toast.error(message);
    },
  });
}
