import { Server, Monitor, Database, AppWindow, Shield, Activity, Lock, Settings, LayoutDashboard, Bug } from "lucide-react";

export type AssetType = "server" | "vm" | "application" | "database";
export type RiskLevel = "critical" | "high" | "medium" | "low";
export type PatchStatus = "outdated" | "current" | "eol" | "unknown";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  ip?: string;
  os?: string;
  status: "online" | "offline" | "degraded";
  riskScore: number;
  riskLevel: RiskLevel;
  lastScan: string;
  owner: string;
  tags: string[];
}

export interface PatchItem {
  id: string;
  assetName: string;
  software: string;
  currentVersion: string;
  latestVersion: string;
  eolDate: string | null;
  status: PatchStatus;
  cve: string[];
  lastChecked: string;
}

export interface Credential {
  id: string;
  label: string;
  type: "ssh" | "rdp" | "api" | "database";
  username: string;
  target: string;
  lastRotated: string;
  expiresAt: string | null;
}

export const assetTypeIcons: Record<AssetType, typeof Server> = {
  server: Server,
  vm: Monitor,
  application: AppWindow,
  database: Database,
};

export const mockAssets: Asset[] = [
  { id: "srv-001", name: "prod-web-01", type: "server", ip: "10.0.1.10", os: "Ubuntu 22.04 LTS", status: "online", riskScore: 82, riskLevel: "critical", lastScan: "2024-01-15T08:30:00Z", owner: "ops-team", tags: ["production", "web"] },
  { id: "srv-002", name: "prod-db-master", type: "server", ip: "10.0.1.20", os: "RHEL 9.2", status: "online", riskScore: 45, riskLevel: "medium", lastScan: "2024-01-15T08:30:00Z", owner: "dba-team", tags: ["production", "database"] },
  { id: "vm-001", name: "staging-api-01", type: "vm", ip: "10.0.2.10", os: "Debian 12", status: "online", riskScore: 23, riskLevel: "low", lastScan: "2024-01-15T06:00:00Z", owner: "dev-team", tags: ["staging", "api"] },
  { id: "vm-002", name: "dev-jenkins", type: "vm", ip: "10.0.3.5", os: "Ubuntu 20.04 LTS", status: "degraded", riskScore: 71, riskLevel: "high", lastScan: "2024-01-14T22:00:00Z", owner: "devops", tags: ["ci-cd", "development"] },
  { id: "app-001", name: "customer-portal", type: "application", status: "online", riskScore: 55, riskLevel: "medium", lastScan: "2024-01-15T09:00:00Z", owner: "product-team", tags: ["production", "frontend"] },
  { id: "app-002", name: "internal-wiki", type: "application", status: "online", riskScore: 12, riskLevel: "low", lastScan: "2024-01-15T09:00:00Z", owner: "it-team", tags: ["internal"] },
  { id: "db-001", name: "postgres-prod", type: "database", ip: "10.0.1.21", status: "online", riskScore: 38, riskLevel: "medium", lastScan: "2024-01-15T08:00:00Z", owner: "dba-team", tags: ["production", "postgresql"] },
  { id: "db-002", name: "redis-cache-01", type: "database", ip: "10.0.1.30", status: "online", riskScore: 8, riskLevel: "low", lastScan: "2024-01-15T08:00:00Z", owner: "ops-team", tags: ["production", "cache"] },
  { id: "srv-003", name: "backup-nas-01", type: "server", ip: "10.0.4.10", os: "TrueNAS 13.0", status: "offline", riskScore: 91, riskLevel: "critical", lastScan: "2024-01-13T12:00:00Z", owner: "ops-team", tags: ["backup", "storage"] },
  { id: "vm-003", name: "monitoring-grafana", type: "vm", ip: "10.0.2.50", os: "Alpine 3.18", status: "online", riskScore: 19, riskLevel: "low", lastScan: "2024-01-15T07:00:00Z", owner: "ops-team", tags: ["monitoring"] },
];

export const mockPatches: PatchItem[] = [
  { id: "p-001", assetName: "prod-web-01", software: "OpenSSL", currentVersion: "1.1.1t", latestVersion: "3.2.0", eolDate: "2023-09-11", status: "eol", cve: ["CVE-2023-5678", "CVE-2023-5363"], lastChecked: "2024-01-15T08:30:00Z" },
  { id: "p-002", assetName: "prod-web-01", software: "nginx", currentVersion: "1.24.0", latestVersion: "1.25.3", eolDate: null, status: "outdated", cve: [], lastChecked: "2024-01-15T08:30:00Z" },
  { id: "p-003", assetName: "prod-db-master", software: "PostgreSQL", currentVersion: "15.4", latestVersion: "16.1", eolDate: null, status: "outdated", cve: ["CVE-2023-39417"], lastChecked: "2024-01-15T08:30:00Z" },
  { id: "p-004", assetName: "dev-jenkins", software: "Jenkins", currentVersion: "2.401.3", latestVersion: "2.440", eolDate: null, status: "outdated", cve: ["CVE-2024-23897"], lastChecked: "2024-01-14T22:00:00Z" },
  { id: "p-005", assetName: "staging-api-01", software: "Node.js", currentVersion: "20.10.0", latestVersion: "20.11.0", eolDate: null, status: "current", cve: [], lastChecked: "2024-01-15T06:00:00Z" },
  { id: "p-006", assetName: "backup-nas-01", software: "TrueNAS Core", currentVersion: "13.0-U5", latestVersion: "13.0-U6.1", eolDate: null, status: "outdated", cve: ["CVE-2023-44487"], lastChecked: "2024-01-13T12:00:00Z" },
  { id: "p-007", assetName: "redis-cache-01", software: "Redis", currentVersion: "7.2.3", latestVersion: "7.2.4", eolDate: null, status: "current", cve: [], lastChecked: "2024-01-15T08:00:00Z" },
  { id: "p-008", assetName: "monitoring-grafana", software: "Grafana", currentVersion: "10.2.3", latestVersion: "10.2.3", eolDate: null, status: "current", cve: [], lastChecked: "2024-01-15T07:00:00Z" },
];

export interface AssetCredential {
  assetId: string;
  credentialId: string;
  purpose: string;
}

export const mockAssetCredentials: AssetCredential[] = [
  { assetId: "srv-001", credentialId: "c-001", purpose: "deploy" },
  { assetId: "srv-001", credentialId: "c-005", purpose: "root access" },
  { assetId: "srv-002", credentialId: "c-002", purpose: "database admin" },
  { assetId: "vm-002", credentialId: "c-003", purpose: "CI/CD automation" },
  { assetId: "srv-003", credentialId: "c-004", purpose: "remote admin" },
  { assetId: "vm-001", credentialId: "c-005", purpose: "deploy" },
  { assetId: "db-001", credentialId: "c-002", purpose: "replication" },
  { assetId: "vm-003", credentialId: "c-006", purpose: "monitoring read" },
];

export const mockCredentials: Credential[] = [
  { id: "c-001", label: "prod-web SSH", type: "ssh", username: "deploy", target: "10.0.1.10", lastRotated: "2024-01-10T00:00:00Z", expiresAt: "2024-04-10T00:00:00Z" },
  { id: "c-002", label: "prod-db master", type: "database", username: "admin", target: "10.0.1.20:5432", lastRotated: "2024-01-01T00:00:00Z", expiresAt: null },
  { id: "c-003", label: "Jenkins API", type: "api", username: "ci-bot", target: "jenkins.internal", lastRotated: "2023-12-15T00:00:00Z", expiresAt: "2024-03-15T00:00:00Z" },
  { id: "c-004", label: "NAS admin RDP", type: "rdp", username: "administrator", target: "10.0.4.10", lastRotated: "2023-11-01T00:00:00Z", expiresAt: "2024-02-01T00:00:00Z" },
  { id: "c-005", label: "shared SSH key", type: "ssh", username: "ops", target: "10.0.0.0/8", lastRotated: "2024-01-05T00:00:00Z", expiresAt: "2024-07-05T00:00:00Z" },
  { id: "c-006", label: "Grafana viewer", type: "api", username: "viewer-bot", target: "grafana.internal", lastRotated: "2024-01-12T00:00:00Z", expiresAt: null },
];
