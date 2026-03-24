import api from '@/services/api';
import type { VmDiscoveryItem, VmInventoryDetail, VmInventoryItem, VmVCenterSource } from '@/lib/vm-inventory';

export type SaveVmDraftPayload = {
  systemName: string;
  environment: 'PROD' | 'TEST' | 'UAT';
  owner?: string;
  businessUnit?: string;
  slaTier?: string;
  serviceRole: string;
  criticality?: 'MISSION_CRITICAL' | 'BUSINESS_CRITICAL' | 'STANDARD';
  description: string;
  notes: string;
  lifecycleState?: 'DRAFT' | 'ACTIVE' | 'DELETED_IN_VCENTER' | 'ARCHIVED';
  tags?: string;
  guestAccounts?: Array<{
    username: string;
    password: string;
    accessMethod: string;
    role: string;
    note?: string;
  }>;
};

export type SaveVmSourcePayload = {
  name: string;
  endpoint: string;
  username?: string;
  password?: string;
  syncInterval: string;
  notes?: string;
};

export type TestVmSourceConnectionPayload = {
  endpoint: string;
  username?: string;
  password?: string;
};

export type VmSourceActionResult = {
  success: boolean;
  message: string;
  detail?: string;
  statusCode?: number;
  apiFamily?: 'api' | 'rest';
  version?: string;
  successCount?: number;
  failedCount?: number;
  discoveredCount?: number;
};

export async function getVmSources() {
  const response = await api.get<VmVCenterSource[]>('/vm/sources');
  return response.data;
}

export async function createVmSource(payload: SaveVmSourcePayload) {
  const response = await api.post<VmVCenterSource>('/vm/sources', payload);
  return response.data;
}

export async function updateVmSource(id: string, payload: SaveVmSourcePayload) {
  const response = await api.patch<VmVCenterSource>(`/vm/sources/${id}`, payload);
  return response.data;
}

export async function deleteVmSource(id: string) {
  await api.delete(`/vm/sources/${id}`);
}

export async function syncAllVmSources() {
  const response = await api.post<VmSourceActionResult>('/vm/sources/sync-all');
  return response.data;
}

export async function testVmSourceConnection(payload: TestVmSourceConnectionPayload) {
  const response = await api.post<VmSourceActionResult>('/vm/sources/test-connection', payload);
  return response.data;
}

export async function syncVmSource(id: string) {
  const response = await api.post<VmSourceActionResult>(`/vm/sources/${id}/sync`);
  return response.data;
}

export async function getVmDiscoveries() {
  const response = await api.get<VmDiscoveryItem[]>('/vm/discoveries');
  return response.data;
}

export async function getVmDiscovery(id: string) {
  const response = await api.get<VmDiscoveryItem>(`/vm/discoveries/${id}`);
  return response.data;
}

export async function updateVmDiscovery(id: string, payload: SaveVmDraftPayload) {
  const response = await api.patch<VmDiscoveryItem>(`/vm/discoveries/${id}`, payload);
  return response.data;
}

export async function promoteVmDiscovery(id: string, payload: SaveVmDraftPayload) {
  const response = await api.post<VmInventoryDetail>(`/vm/discoveries/${id}/promote`, payload);
  return response.data;
}

export async function archiveVmDiscovery(id: string) {
  await api.post(`/vm/discoveries/${id}/archive`);
}

export async function getVmInventory() {
  const response = await api.get<VmInventoryItem[]>('/vm/inventory');
  return response.data;
}

export async function getVmInventoryById(id: string) {
  const response = await api.get<VmInventoryDetail>(`/vm/inventory/${id}`);
  return response.data;
}

export async function updateVmInventory(id: string, payload: SaveVmDraftPayload) {
  const response = await api.patch<VmInventoryDetail>(`/vm/inventory/${id}`, payload);
  return response.data;
}

export async function archiveVmInventory(id: string) {
  await api.post(`/vm/inventory/${id}/archive`);
}
