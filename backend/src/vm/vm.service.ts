import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as http from 'node:http';
import * as https from 'node:https';
import {
  Prisma,
  VmVCenterSource,
  VmCriticality,
  VmDiscoveryState,
  VmEnvironment,
  VmLifecycleState,
  VmPowerState,
} from '@prisma/client';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaveVmDraftDto } from './dto/save-vm-draft.dto';
import { SaveVmSourceDto } from './dto/save-vm-source.dto';
import { TestVmSourceConnectionDto } from './dto/test-vm-source-connection.dto';

type VmSourceWithCounts = Prisma.VmVCenterSourceGetPayload<{
  include: {
    discoveries: {
      where: {
        state: {
          not: 'ARCHIVED';
        };
      };
    };
  };
}>;

type VmDiscoveryWithRelations = Prisma.VmDiscoveryGetPayload<{
  include: {
    source: true;
    guestAccounts: true;
  };
}>;

type VmInventoryWithRelations = Prisma.VmInventoryGetPayload<{
  include: {
    source: true;
    guestAccounts: true;
  };
}>;

type VmDisk = {
  label: string;
  sizeGb: number;
  datastore?: string;
};

type VcenterApiFamily = 'api' | 'rest';

type VcenterConnectionResult = {
  success: boolean;
  message: string;
  statusCode?: number;
  detail?: string;
  apiFamily?: VcenterApiFamily;
  version?: string;
};

type VcenterSession = {
  apiFamily: VcenterApiFamily;
  baseUrl: URL;
  sessionId: string;
};

type RequestResult<T> = {
  statusCode: number;
  data: T | null;
  rawBody: string;
};

type VcenterVmSummary = {
  vm: string;
  name: string;
  power_state?: string;
  cpu_count?: number;
  memory_size_mib?: number;
};

type VcenterVmDetail = {
  identity?: { name?: string };
  guest_OS?: string;
  guest_os?: string;
  name?: string;
  power_state?: string;
  cpu?: { count?: number };
  memory?: { size_MiB?: number; size_mib?: number };
  hardware?: {
    version?: string;
    cpu?: { count?: number };
    memory?: { size_MiB?: number; size_mib?: number };
    disks?: Array<{ value?: Record<string, unknown> }> | Record<string, Record<string, unknown>>;
    nics?: Array<{ value?: Record<string, unknown> }> | Record<string, Record<string, unknown>>;
  };
  disks?: Array<{ value?: Record<string, unknown> }> | Record<string, Record<string, unknown>>;
  nics?: Array<{ value?: Record<string, unknown> }> | Record<string, Record<string, unknown>>;
  host?: string;
  host_name?: string;
  cluster?: string;
  cluster_name?: string;
};

type VcenterGuestIdentity = {
  host_name?: string;
  ip_address?: string;
  name?: string;
  full_name?: { localized?: string; default_message?: string };
};

type VcenterHostSummary = {
  host: string;
  name: string;
};

type VcenterClusterSummary = {
  cluster: string;
  name: string;
};

type VcenterApplianceVersion = {
  product?: string;
  type?: string;
  version?: string;
  build?: string;
};

const SYNCED_FIELDS = [
  'VM Name',
  'MoID',
  'Power State',
  'Cluster',
  'Host',
  'Guest OS',
  'Primary IP',
  'CPU',
  'Memory',
  'Storage',
  'Network',
  'vCenter Tags',
];

const MANAGED_FIELDS = [
  'System Name',
  'Environment',
  'Service Role',
  'Service Purpose',
  'Custom Notes',
  'Guest Accounts',
  'Tags',
];

@Injectable()
export class VmService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VmService.name);
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private autoSyncRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: CredentialsService,
  ) {}

  onModuleInit() {
    this.startAutoSyncWorker();
  }

  onModuleDestroy() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  private async ensureSeedData() {
    return;
  }

  private toRelativeTime(date: Date | null | undefined) {
    if (!date) {
      return '--';
    }

    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) {
      return 'Just now';
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  private sanitizeText(value?: string | null) {
    return value?.trim() || null;
  }

  private parseSyncIntervalMs(syncInterval?: string | null) {
    const raw = syncInterval?.trim().toLowerCase();

    if (!raw) {
      return 15 * 60 * 1000;
    }

    const match = raw.match(/^(\d+)\s*(min|mins|minute|minutes|hour|hours)$/);
    if (!match) {
      return 15 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    if (unit.startsWith('hour')) {
      return amount * 60 * 60 * 1000;
    }

    return amount * 60 * 1000;
  }

  private shouldAutoSyncSource(source: VmVCenterSource, now: Date) {
    if (!source.lastSyncAt) {
      return true;
    }

    const intervalMs = this.parseSyncIntervalMs(source.syncInterval);
    const elapsedMs = now.getTime() - source.lastSyncAt.getTime();

    return elapsedMs >= intervalMs;
  }

  private startAutoSyncWorker() {
    if (this.autoSyncTimer) {
      return;
    }

    this.autoSyncTimer = setInterval(() => {
      void this.runAutoSyncCycle();
    }, 60 * 1000);

    void this.runAutoSyncCycle();
  }

  private async runAutoSyncCycle() {
    if (this.autoSyncRunning) {
      return;
    }

    this.autoSyncRunning = true;

    try {
      const sources = await this.prisma.vmVCenterSource.findMany({
        orderBy: { createdAt: 'asc' },
      });
      const now = new Date();
      const dueSources = sources.filter((source) => this.shouldAutoSyncSource(source, now));

      for (const source of dueSources) {
        try {
          this.logger.log(`Auto-syncing source ${source.name} (${source.syncInterval})`);
          await this.syncSourceData(source);
        } catch (error) {
          const connectionError = this.getHumanConnectionError(error);

          await this.prisma.vmVCenterSource.update({
            where: { id: source.id },
            data: {
              status: 'Connection failed',
            },
          });

          this.logger.warn(
            `Auto-sync failed for source ${source.name}: ${connectionError.message}${connectionError.detail ? ` - ${connectionError.detail}` : ''}`,
          );
        }
      }
    } finally {
      this.autoSyncRunning = false;
    }
  }

  private parseTags(tags?: string) {
    return (tags ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  private normalizeDisks(disks?: SaveVmDraftDto['disks']) {
    return (disks ?? []).map((disk) => ({
      label: disk.label.trim(),
      sizeGb: disk.sizeGb,
      ...(disk.datastore?.trim() ? { datastore: disk.datastore.trim() } : {}),
    }));
  }

  private buildVmGuestAccounts(accounts?: SaveVmDraftDto['guestAccounts']) {
    return (accounts ?? [])
      .filter((account) => account.username.trim())
      .map((account) => ({
        username: account.username.trim(),
        encryptedPassword: this.credentialsService.encrypt(account.password ?? ''),
        accessMethod: account.accessMethod.trim(),
        role: account.role.trim(),
        note: this.sanitizeText(account.note),
      }));
  }

  private computeCompleteness(input: {
    systemName?: string | null;
    environment?: VmEnvironment | null;
    serviceRole?: string | null;
    description?: string | null;
    guestAccountsCount?: number;
  }) {
    const required = [
      ['System Name', input.systemName],
      ['Environment', input.environment],
      ['Service Role', input.serviceRole],
      ['Service Purpose', input.description],
      ['Guest Accounts', (input.guestAccountsCount ?? 0) > 0 ? 'present' : ''],
    ] as const;

    const missingFields = required
      .filter(([, value]) => !value)
      .map(([label]) => label);
    const completeness = Math.round(((required.length - missingFields.length) / required.length) * 100);

    return {
      missingFields,
      completeness,
      state: missingFields.length === 0 ? VmDiscoveryState.READY_TO_PROMOTE : VmDiscoveryState.NEEDS_CONTEXT,
    };
  }

  private mapSource(source: VmSourceWithCounts) {
    return {
      id: source.id,
      name: source.name,
      version: source.version,
      endpoint: source.endpoint,
      vmCount: source.discoveries.length,
      status: source.status,
      syncInterval: source.syncInterval,
      lastSyncAt: this.toRelativeTime(source.lastSyncAt),
      notes: source.notes,
    };
  }

  private mapDiscovery(discovery: VmDiscoveryWithRelations) {
    return {
      id: discovery.id,
      name: discovery.name,
      systemName: discovery.systemName,
      moid: discovery.moid,
      sourceName: discovery.source.name,
      sourceVersion: discovery.source.version,
      cluster: discovery.cluster,
      clusterResolution: discovery.clusterResolution,
      host: discovery.host,
      hostResolution: discovery.hostResolution,
      computerName: discovery.computerName,
      guestOs: discovery.guestOs,
      primaryIp: discovery.primaryIp,
      cpuCores: discovery.cpuCores,
      memoryGb: discovery.memoryGb,
      storageGb: discovery.storageGb,
      disks: (discovery.disks as VmDisk[] | null) ?? [],
      networkLabel: discovery.networkLabel,
      powerState: discovery.powerState,
      state: discovery.state,
      completeness: discovery.completeness,
      missingFields: discovery.missingFields,
      lastSeen: this.toRelativeTime(discovery.lastSeenAt),
      tags: discovery.tags,
      guestAccountsCount: discovery.guestAccounts.length,
      owner: discovery.owner,
      environment: discovery.environment,
      businessUnit: discovery.businessUnit,
      slaTier: discovery.slaTier,
      serviceRole: discovery.serviceRole,
      criticality: discovery.criticality,
      description: discovery.description,
      notes: discovery.notes ?? '',
      suggestedOwner: discovery.suggestedOwner,
      suggestedEnvironment: discovery.suggestedEnvironment,
      suggestedServiceRole: discovery.suggestedServiceRole,
      suggestedCriticality: discovery.suggestedCriticality,
      note: discovery.notes,
      guestAccounts: discovery.guestAccounts.map((account) => ({
        username: account.username,
        password: this.credentialsService.decrypt(account.encryptedPassword),
        accessMethod: account.accessMethod,
        role: account.role,
        note: account.note,
      })),
    };
  }

  private mapInventory(inventory: VmInventoryWithRelations) {
    return {
      id: inventory.id,
      name: inventory.name,
      systemName: inventory.systemName,
      moid: inventory.moid,
      vcenterName: inventory.source?.name ?? '--',
      vcenterVersion: inventory.source?.version ?? '--',
      environment: inventory.environment,
      cluster: inventory.cluster,
      clusterResolution: inventory.clusterResolution,
      host: inventory.host,
      hostResolution: inventory.hostResolution,
      computerName: inventory.computerName,
      guestOs: inventory.guestOs,
      primaryIp: inventory.primaryIp,
      cpuCores: inventory.cpuCores,
      memoryGb: inventory.memoryGb,
      storageGb: inventory.storageGb,
      disks: (inventory.disks as VmDisk[] | null) ?? [],
      networkLabel: inventory.networkLabel,
      powerState: inventory.powerState,
      lifecycleState: inventory.lifecycleState,
      syncState: inventory.syncState,
      owner: inventory.owner,
      businessUnit: inventory.businessUnit,
      slaTier: inventory.slaTier,
      serviceRole: inventory.serviceRole,
      criticality: inventory.criticality,
      description: inventory.description,
      tags: inventory.tags,
      lastSyncAt: this.toRelativeTime(inventory.lastSyncAt),
      syncedFields: inventory.syncedFields,
      managedFields: inventory.managedFields,
      guestAccountsCount: inventory.guestAccounts.length,
      notes: inventory.notes,
      guestAccounts: inventory.guestAccounts.map((account) => ({
        username: account.username,
        password: this.credentialsService.decrypt(account.encryptedPassword),
        accessMethod: account.accessMethod,
        role: account.role,
        note: account.note,
      })),
      sourceHistory: inventory.source
        ? [
            {
              label: inventory.source.name,
              version: inventory.source.version,
              lastSeen: this.toRelativeTime(inventory.lastSyncAt),
              status: inventory.syncState,
            },
          ]
        : [],
    };
  }

  private normalizeEndpoint(endpoint: string) {
    const trimmed = endpoint.trim();
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/ui';
    }
    return url;
  }

  private getVcenterApiBase(endpoint: string) {
    const normalized = this.normalizeEndpoint(endpoint);
    return new URL(normalized.origin);
  }

  private requestJson<T>(
    url: URL,
    options: {
      method?: 'GET' | 'POST';
      headers?: Record<string, string>;
      timeoutMs?: number;
    } = {},
  ) {
    const transport = url.protocol === 'http:' ? http : https;
    const timeoutMs = options.timeoutMs ?? 8000;

    return new Promise<RequestResult<T>>((resolve, reject) => {
      const request = transport.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || undefined,
          path: `${url.pathname}${url.search}`,
          method: options.method ?? 'GET',
          headers: options.headers,
          rejectUnauthorized: false,
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on('data', (chunk: Buffer | string) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          response.on('end', () => {
            const rawBody = Buffer.concat(chunks).toString('utf8');
            let data: T | null = null;

            if (rawBody) {
              try {
                data = JSON.parse(rawBody) as T;
              } catch {
                data = null;
              }
            }

            resolve({
              statusCode: response.statusCode ?? 0,
              data,
              rawBody,
            });
          });
        },
      );

      request.setTimeout(timeoutMs, () => {
        request.destroy(new Error(`Timed out after ${timeoutMs}ms`));
      });
      request.on('error', reject);
      request.end();
    });
  }

  private extractVcenterPayload<T>(data: T | { value?: T } | null) {
    if (data && typeof data === 'object' && 'value' in data) {
      return (data as { value?: T }).value ?? null;
    }

    return data as T | null;
  }

  private buildBasicAuthHeader(username: string, password: string) {
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  private getHumanConnectionError(error: unknown) {
    if (!(error instanceof Error)) {
      return {
        message: 'Connection failed',
        detail: 'Unknown connection error',
      };
    }

    const detail = error.message;
    const lower = detail.toLowerCase();

    if (lower.includes('timed out')) {
      return {
        message: 'Connection timed out',
        detail: 'The vCenter endpoint did not respond before the timeout window closed.',
      };
    }

    if (lower.includes('self-signed') || lower.includes('certificate')) {
      return {
        message: 'TLS certificate validation failed',
        detail: detail,
      };
    }

    if (lower.includes('econnrefused')) {
      return {
        message: 'Connection refused',
        detail: 'The server refused the TCP connection. Check the host, port, and firewall rules.',
      };
    }

    if (lower.includes('enotfound') || lower.includes('getaddrinfo')) {
      return {
        message: 'Host not found',
        detail: 'DNS could not resolve the vCenter hostname.',
      };
    }

    return {
      message: 'Connection failed',
      detail,
    };
  }

  private async authenticateVcenter(endpoint: string, username?: string | null, password?: string | null) {
    const trimmedUsername = username?.trim();
    const trimmedPassword = password ?? '';

    if (!trimmedUsername || !trimmedPassword) {
      throw new Error('Username and password are required to connect to vCenter.');
    }

    const baseUrl = this.getVcenterApiBase(endpoint);
    const headers = {
      Authorization: this.buildBasicAuthHeader(trimmedUsername, trimmedPassword),
      Accept: 'application/json',
    };

    const candidates: Array<{ apiFamily: VcenterApiFamily; path: string }> = [
      { apiFamily: 'api', path: '/api/session' },
      { apiFamily: 'rest', path: '/rest/com/vmware/cis/session' },
    ];

    let lastStatusCode = 0;

    for (const candidate of candidates) {
      const response = await this.requestJson<string | { value?: string }>(
        new URL(candidate.path, baseUrl),
        {
          method: 'POST',
          headers,
        },
      );

      lastStatusCode = response.statusCode;
      const sessionId = this.extractVcenterPayload(response.data);

      if (response.statusCode >= 200 && response.statusCode < 300 && typeof sessionId === 'string' && sessionId) {
        return {
          apiFamily: candidate.apiFamily,
          baseUrl,
          sessionId,
        } satisfies VcenterSession;
      }

      if (response.statusCode === 401 || response.statusCode === 403) {
        throw new Error('Authentication failed. Check the username, password, and API permissions.');
      }
    }

    throw new Error(`Unable to create a vCenter API session. Last response status: ${lastStatusCode || 'unknown'}.`);
  }

  private async requestVcenterResource<T>(session: VcenterSession, paths: string[]) {
    let lastStatusCode = 0;
    let lastBody = '';

    for (const path of paths) {
      const response = await this.requestJson<T | { value?: T }>(new URL(path, session.baseUrl), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'vmware-api-session-id': session.sessionId,
        },
      });

      lastStatusCode = response.statusCode;
      lastBody = response.rawBody;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return this.extractVcenterPayload(response.data);
      }

      if (response.statusCode === 404) {
        continue;
      }

      if (response.statusCode === 401 || response.statusCode === 403) {
        throw new Error('The vCenter session is not authorized to read this resource.');
      }
    }

    throw new Error(`vCenter API request failed with status ${lastStatusCode || 'unknown'}${lastBody ? `: ${lastBody}` : ''}`);
  }

  private async getVcenterVersion(session: VcenterSession) {
    const versionInfo =
      (await this.requestVcenterResource<VcenterApplianceVersion>(session, [
        '/rest/appliance/system/version',
        '/api/appliance/system/version',
      ]).catch((error) => {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('not authorized') || message.toLowerCase().includes('unauthorized')) {
          return {
            version: 'Unavailable (insufficient privilege)',
          } satisfies VcenterApplianceVersion;
        }

        return null;
      })) ?? null;

    const version = versionInfo?.version?.trim();
    const buildValue = versionInfo as VcenterApplianceVersion | null;
    const build = typeof buildValue?.build === 'string' ? buildValue.build.trim() : undefined;

    if (version && build) {
      return `${version} (build ${build})`;
    }

    if (version) {
      return version;
    }

    return 'Detected after first sync';
  }

  private unwrapDeviceCollection(
    devices?: Array<{ value?: Record<string, unknown> }> | Record<string, Record<string, unknown>> | null,
  ) {
    if (!devices) {
      return [] as Record<string, unknown>[];
    }

    if (Array.isArray(devices)) {
      return devices
        .map((device) => device.value ?? null)
        .filter((device): device is Record<string, unknown> => Boolean(device));
    }

    return Object.values(devices);
  }

  private mapPowerState(powerState?: string | null) {
    switch ((powerState ?? '').toUpperCase()) {
      case 'POWERED_ON':
      case 'RUNNING':
        return VmPowerState.RUNNING;
      case 'SUSPENDED':
        return VmPowerState.SUSPENDED;
      default:
        return VmPowerState.STOPPED;
    }
  }

  private extractMemoryGb(detail: VcenterVmDetail, summary: VcenterVmSummary) {
    const memoryMiB =
      detail.memory?.size_MiB ??
      detail.memory?.size_mib ??
      detail.hardware?.memory?.size_MiB ??
      detail.hardware?.memory?.size_mib ??
      summary.memory_size_mib ??
      0;

    return Math.max(1, Math.round(memoryMiB / 1024));
  }

  private extractDisks(detail: VcenterVmDetail) {
    const disks = this.unwrapDeviceCollection(detail.hardware?.disks ?? detail.disks ?? null);

    return disks.map((disk, index) => {
      const rawDisk = disk as {
        capacity?: number;
        capacity_bytes?: number;
        capacity_MiB?: number;
        capacity_mib?: number;
        datastore?: string;
        label?: string;
        backing?: { datastore?: string } | null;
        vmdk_file?: string;
      };
      const capacityBytes = Number(rawDisk.capacity ?? rawDisk.capacity_bytes ?? 0);
      const capacityMiB = Number(rawDisk.capacity_MiB ?? rawDisk.capacity_mib ?? 0);
      const sizeGb = capacityBytes
        ? Math.max(1, Math.round(capacityBytes / 1024 / 1024 / 1024))
        : capacityMiB
          ? Math.max(1, Math.round(capacityMiB / 1024))
          : 0;

      const datastore =
        typeof rawDisk.datastore === 'string'
          ? rawDisk.datastore
          : typeof rawDisk.backing === 'object' && rawDisk.backing && 'datastore' in rawDisk.backing
            ? String(rawDisk.backing.datastore ?? '')
            : typeof rawDisk.backing === 'object' &&
                rawDisk.backing &&
                'vmdk_file' in rawDisk.backing &&
                typeof (rawDisk.backing as { vmdk_file?: string }).vmdk_file === 'string'
              ? String((rawDisk.backing as { vmdk_file?: string }).vmdk_file ?? '')
                  .match(/^\[([^\]]+)\]/)?.[1]
            : undefined;

      const label =
        typeof rawDisk.label === 'string' && rawDisk.label.trim()
          ? rawDisk.label
          : `Hard disk ${index + 1}`;

      return {
        label,
        sizeGb,
        ...(datastore ? { datastore } : {}),
      } satisfies VmDisk;
    }).filter((disk) => disk.sizeGb > 0);
  }

  private extractNetworkLabel(detail: VcenterVmDetail) {
    const firstNic = this.unwrapDeviceCollection(detail.hardware?.nics ?? detail.nics ?? null)[0] as
      | {
          network_name?: string;
          network?: string;
          label?: string;
          backing?: { network_name?: string; network?: string } | null;
        }
      | undefined;

    if (!firstNic) {
      return '--';
    }

    const candidates = [
      firstNic.network_name,
      firstNic.network,
      typeof firstNic.backing === 'object' && firstNic.backing ? (firstNic.backing as { network_name?: string }).network_name : undefined,
      typeof firstNic.backing === 'object' && firstNic.backing ? (firstNic.backing as { network?: string }).network : undefined,
      firstNic.label,
    ];

    return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? '--';
  }

  private inferEnvironment(sourceName: string, vmName: string) {
    const haystack = `${sourceName} ${vmName}`.toLowerCase();
    if (haystack.includes('prod')) {
      return VmEnvironment.PROD;
    }
    if (haystack.includes('uat')) {
      return VmEnvironment.UAT;
    }
    if (haystack.includes('test') || haystack.includes('qa')) {
      return VmEnvironment.TEST;
    }
    return VmEnvironment.UAT;
  }

  private inferCriticality(environment: VmEnvironment) {
    if (environment === VmEnvironment.PROD) {
      return VmCriticality.BUSINESS_CRITICAL;
    }
    return VmCriticality.STANDARD;
  }

  private async fetchSourceInventory(source: VmVCenterSource) {
    const session = await this.authenticateVcenter(
      source.endpoint,
      source.username,
      source.encryptedPassword ? this.credentialsService.decrypt(source.encryptedPassword) : null,
    );
    const version = await this.getVcenterVersion(session);
    const hosts =
      (await this.requestVcenterResource<VcenterHostSummary[]>(session, [
        '/rest/vcenter/host',
        '/api/vcenter/host',
      ]).catch(() => null)) ?? [];
    const clusters =
      (await this.requestVcenterResource<VcenterClusterSummary[]>(session, [
        '/rest/vcenter/cluster',
        '/api/vcenter/cluster',
      ]).catch(() => null)) ?? [];
    const fallbackHost = hosts.length === 1 ? hosts[0]?.name ?? '--' : '--';
    const fallbackCluster = clusters.length === 1 ? clusters[0]?.name ?? '--' : '--';

    const summaries = (await this.requestVcenterResource<VcenterVmSummary[]>(session, [
      '/api/vcenter/vm',
      '/rest/vcenter/vm',
    ])) ?? [];

    const records = await Promise.all(
      summaries.map(async (summary) => {
        const detail =
          (await this.requestVcenterResource<VcenterVmDetail>(session, [
            `/api/vcenter/vm/${summary.vm}`,
            `/rest/vcenter/vm/${summary.vm}`,
          ]).catch(() => null)) ?? null;

        const guestIdentity =
          (await this.requestVcenterResource<VcenterGuestIdentity>(session, [
            `/api/vcenter/vm/${summary.vm}/guest/identity`,
            `/rest/vcenter/vm/${summary.vm}/guest/identity`,
          ]).catch(() => null)) ?? null;

        const disks = detail ? this.extractDisks(detail) : [];
        const storageGb = disks.reduce((total, disk) => total + disk.sizeGb, 0);
        const environment = this.inferEnvironment(source.name, summary.name);

        return {
          moid: summary.vm,
          name: summary.name,
          cluster: detail?.cluster_name ?? detail?.cluster ?? fallbackCluster,
          clusterResolution:
            detail?.cluster_name || detail?.cluster
              ? 'DIRECT_VM'
              : fallbackCluster !== '--'
                ? 'SOURCE_SINGLE_CLUSTER'
                : 'UNKNOWN',
          host: detail?.host_name ?? detail?.host ?? fallbackHost,
          hostResolution:
            detail?.host_name || detail?.host
              ? 'DIRECT_VM'
              : fallbackHost !== '--'
                ? 'SOURCE_SINGLE_HOST'
                : 'UNKNOWN',
          computerName: this.sanitizeText(guestIdentity?.host_name ?? guestIdentity?.name) ?? undefined,
          guestOs:
            guestIdentity?.full_name?.localized ??
            guestIdentity?.full_name?.default_message ??
            detail?.guest_os ??
            detail?.guest_OS ??
            '--',
          primaryIp: guestIdentity?.ip_address ?? '--',
          cpuCores: detail?.cpu?.count ?? detail?.hardware?.cpu?.count ?? summary.cpu_count ?? 1,
          memoryGb: detail ? this.extractMemoryGb(detail, summary) : Math.max(1, Math.round((summary.memory_size_mib ?? 0) / 1024)),
          storageGb,
          disks,
          networkLabel: detail ? this.extractNetworkLabel(detail) : '--',
          powerState: this.mapPowerState(detail?.power_state ?? summary.power_state),
          environment,
          criticality: this.inferCriticality(environment),
        };
      }),
    );

    return {
      apiFamily: session.apiFamily,
      version,
      records,
    };
  }

  private async syncSourceData(source: VmVCenterSource) {
    const startedAt = new Date();
    const { records, version } = await this.fetchSourceInventory(source);
    const seenMoids = new Set(records.map((record) => record.moid));

    await this.prisma.$transaction(async (tx) => {
      for (const record of records) {
        const existingDiscovery = await tx.vmDiscovery.findUnique({
          where: { moid: record.moid },
          include: { guestAccounts: true },
        });

        const discoveryGuestAccountCount = existingDiscovery?.guestAccountsCount ?? 0;
        const completeness = this.computeCompleteness({
          systemName: existingDiscovery?.systemName,
          environment: existingDiscovery?.environment ?? record.environment,
          serviceRole: existingDiscovery?.serviceRole,
          description: existingDiscovery?.description,
          guestAccountsCount: discoveryGuestAccountCount,
        });

        await tx.vmDiscovery.upsert({
          where: { moid: record.moid },
          create: {
            name: record.name,
            moid: record.moid,
            sourceId: source.id,
            cluster: record.cluster,
            clusterResolution: record.clusterResolution,
            host: record.host,
            hostResolution: record.hostResolution,
            computerName: record.computerName,
            guestOs: record.guestOs,
            primaryIp: record.primaryIp,
            cpuCores: record.cpuCores,
            memoryGb: record.memoryGb,
            storageGb: record.storageGb,
            disks: record.disks,
            networkLabel: record.networkLabel,
            powerState: record.powerState,
            state: completeness.state,
            completeness: completeness.completeness,
            missingFields: completeness.missingFields,
            lastSeenAt: startedAt,
            tags: [],
            guestAccountsCount: 0,
            suggestedEnvironment: record.environment,
            suggestedCriticality: record.criticality,
            notes: 'Imported from vCenter sync.',
          },
          update: {
            sourceId: source.id,
            name: record.name,
            cluster: record.cluster,
            clusterResolution: record.clusterResolution,
            host: record.host,
            hostResolution: record.hostResolution,
            computerName: record.computerName,
            guestOs: record.guestOs,
            primaryIp: record.primaryIp,
            cpuCores: record.cpuCores,
            memoryGb: record.memoryGb,
            storageGb: record.storageGb,
            disks: record.disks,
            networkLabel: record.networkLabel,
            powerState: record.powerState,
            lastSeenAt: startedAt,
            suggestedEnvironment: record.environment,
            suggestedCriticality: record.criticality,
            completeness: completeness.completeness,
            missingFields: completeness.missingFields,
            state:
              existingDiscovery?.state === VmDiscoveryState.ARCHIVED
                ? VmDiscoveryState.ARCHIVED
                : completeness.state,
          },
        });

        await tx.vmInventory.updateMany({
          where: {
            moid: record.moid,
            sourceId: source.id,
            lifecycleState: {
              not: VmLifecycleState.ARCHIVED,
            },
          },
          data: {
            name: record.name,
            cluster: record.cluster,
            clusterResolution: record.clusterResolution,
            host: record.host,
            hostResolution: record.hostResolution,
            computerName: record.computerName,
            guestOs: record.guestOs,
            primaryIp: record.primaryIp,
            cpuCores: record.cpuCores,
            memoryGb: record.memoryGb,
            storageGb: record.storageGb,
            disks: record.disks,
            networkLabel: record.networkLabel,
            powerState: record.powerState,
            lastSyncAt: startedAt,
            syncState: 'Synced',
          },
        });
      }

      await tx.vmDiscovery.updateMany({
        where: {
          sourceId: source.id,
          state: {
            not: VmDiscoveryState.ARCHIVED,
          },
          moid: {
            notIn: Array.from(seenMoids),
          },
        },
        data: {
          state: VmDiscoveryState.DRIFTED,
        },
      });

      await tx.vmInventory.updateMany({
        where: {
          sourceId: source.id,
          lifecycleState: {
            notIn: [VmLifecycleState.ARCHIVED, VmLifecycleState.DELETED_IN_VCENTER],
          },
          moid: {
            notIn: Array.from(seenMoids),
          },
        },
        data: {
          lifecycleState: VmLifecycleState.DELETED_IN_VCENTER,
          syncState: 'Missing from source',
          lastSyncAt: startedAt,
        },
      });

      await tx.vmVCenterSource.update({
        where: { id: source.id },
        data: {
          version,
          status: 'Healthy',
          lastSyncAt: startedAt,
        },
      });
    });

    return {
      success: true,
      message: `Synced ${records.length} VM${records.length === 1 ? '' : 's'} from ${source.name}`,
      discoveredCount: records.length,
    };
  }

  async findSources() {
    await this.ensureSeedData();
    const sources = await this.prisma.vmVCenterSource.findMany({
      include: {
        discoveries: {
          where: {
            state: {
              not: VmDiscoveryState.ARCHIVED,
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return sources.map((source) => this.mapSource(source));
  }

  async createSource(dto: SaveVmSourceDto, userId: string) {
    await this.ensureSeedData();
    const session = await this.authenticateVcenter(dto.endpoint, dto.username, dto.password);
    const version = await this.getVcenterVersion(session);
    const source = await this.prisma.vmVCenterSource.create({
      data: {
        name: dto.name.trim(),
        endpoint: dto.endpoint.trim(),
        version,
        username: this.sanitizeText(dto.username),
        encryptedPassword: dto.password ? this.credentialsService.encrypt(dto.password) : null,
        syncInterval: dto.syncInterval.trim(),
        notes: this.sanitizeText(dto.notes),
        status: 'Ready to sync',
        lastSyncAt: null,
        createdByUserId: userId,
      },
      include: {
        discoveries: {
          where: {
            state: {
              not: VmDiscoveryState.ARCHIVED,
            },
          },
        },
      },
    });

    return this.mapSource(source);
  }

  async updateSource(id: string, dto: SaveVmSourceDto) {
    await this.ensureSeedData();
    const currentSource = await this.prisma.vmVCenterSource.findUnique({
      where: { id },
    });

    if (!currentSource) {
      throw new NotFoundException(`VM source ${id} not found`);
    }

    const username = this.sanitizeText(dto.username) ?? currentSource.username;
    const password = dto.password
      ? dto.password
      : currentSource.encryptedPassword
        ? this.credentialsService.decrypt(currentSource.encryptedPassword)
        : null;
    const session = await this.authenticateVcenter(dto.endpoint, username, password);
    const version = await this.getVcenterVersion(session);

    const source = await this.prisma.vmVCenterSource.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        endpoint: dto.endpoint.trim(),
        version,
        username,
        ...(dto.password ? { encryptedPassword: this.credentialsService.encrypt(dto.password) } : {}),
        syncInterval: dto.syncInterval.trim(),
        notes: this.sanitizeText(dto.notes),
        status: 'Ready to sync',
      },
      include: {
        discoveries: {
          where: {
            state: {
              not: VmDiscoveryState.ARCHIVED,
            },
          },
        },
      },
    });

    return this.mapSource(source);
  }

  async removeSource(id: string) {
    await this.ensureSeedData();
    const source = await this.prisma.vmVCenterSource.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`VM source ${id} not found`);
    }

    await this.prisma.vmVCenterSource.delete({ where: { id } });
    return { success: true };
  }

  async syncAllSources() {
    await this.ensureSeedData();
    const sources = await this.prisma.vmVCenterSource.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const results = await Promise.allSettled(
      sources.map(async (source) => {
        try {
          return await this.syncSourceData(source);
        } catch (error) {
          await this.prisma.vmVCenterSource.update({
            where: { id: source.id },
            data: {
              status: 'Connection failed',
            },
          });

          throw error;
        }
      }),
    );
    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedResults = results.filter((result) => result.status === 'rejected');

    return {
      success: failedResults.length === 0,
      message:
        failedResults.length === 0
          ? `Synced all ${successCount} vCenter source${successCount === 1 ? '' : 's'}.`
          : `Synced ${successCount} source${successCount === 1 ? '' : 's'}, ${failedResults.length} failed.`,
      successCount,
      failedCount: failedResults.length,
    };
  }

  async testSourceConnection(dto: TestVmSourceConnectionDto) {
    try {
      const session = await this.authenticateVcenter(dto.endpoint, dto.username, dto.password);
      const version = await this.getVcenterVersion(session);

      return {
        success: true,
        message: `Connected to ${session.baseUrl.origin} successfully`,
        detail: `Authenticated with the ${session.apiFamily.toUpperCase()} endpoint family and detected vCenter version ${version}.`,
        apiFamily: session.apiFamily,
        version,
      } satisfies VcenterConnectionResult;
    } catch (error) {
      const connectionError = this.getHumanConnectionError(error);

      return {
        success: false,
        message: connectionError.message,
        detail: connectionError.detail,
      } satisfies VcenterConnectionResult;
    }
  }

  async syncSource(id: string) {
    await this.ensureSeedData();
    const source = await this.prisma.vmVCenterSource.findUnique({
      where: { id },
    });

    if (!source) {
      throw new NotFoundException(`VM source ${id} not found`);
    }

    try {
      return await this.syncSourceData(source);
    } catch (error) {
      const connectionError = this.getHumanConnectionError(error);

      await this.prisma.vmVCenterSource.update({
        where: { id: source.id },
        data: {
          status: 'Connection failed',
        },
      });

      return {
        success: false,
        message: connectionError.message,
        detail: connectionError.detail,
      };
    }
  }

  async findDiscoveries() {
    await this.ensureSeedData();
    const discoveries = await this.prisma.vmDiscovery.findMany({
      where: {
        state: {
          not: VmDiscoveryState.ARCHIVED,
        },
      },
      include: {
        source: true,
        guestAccounts: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return discoveries.map((discovery) => this.mapDiscovery(discovery));
  }

  async findDiscovery(id: string) {
    await this.ensureSeedData();
    const discovery = await this.prisma.vmDiscovery.findUnique({
      where: { id },
      include: {
        source: true,
        guestAccounts: true,
      },
    });

    if (!discovery) {
      throw new NotFoundException(`VM discovery ${id} not found`);
    }

    return this.mapDiscovery(discovery);
  }

  async updateDiscovery(id: string, dto: SaveVmDraftDto, userId: string) {
    await this.ensureSeedData();
    await this.findDiscovery(id);

    const guestAccounts = this.buildVmGuestAccounts(dto.guestAccounts);
    const completeness = this.computeCompleteness({
      systemName: dto.systemName,
      environment: dto.environment,
      serviceRole: dto.serviceRole,
      description: dto.description,
      guestAccountsCount: guestAccounts.length,
    });

    const updated = await this.prisma.vmDiscovery.update({
      where: { id },
      data: {
        systemName: dto.systemName.trim(),
        owner: dto.owner?.trim() ?? '',
        environment: dto.environment,
        businessUnit: dto.businessUnit?.trim() ?? '',
        slaTier: dto.slaTier?.trim() ?? '',
        serviceRole: dto.serviceRole.trim(),
        criticality: dto.criticality ?? VmCriticality.STANDARD,
        description: dto.description.trim(),
        notes: dto.notes.trim(),
        tags: this.parseTags(dto.tags),
        disks: this.normalizeDisks(dto.disks),
        guestAccountsCount: guestAccounts.length,
        state: completeness.state,
        completeness: completeness.completeness,
        missingFields: completeness.missingFields,
        createdByUserId: userId,
        guestAccounts: {
          deleteMany: {},
          create: guestAccounts,
        },
      },
      include: {
        source: true,
        guestAccounts: true,
      },
    });

    return this.mapDiscovery(updated);
  }

  async promoteDiscovery(id: string, dto: SaveVmDraftDto, userId: string) {
    await this.ensureSeedData();
    const discovery = await this.prisma.vmDiscovery.findUnique({
      where: { id },
      include: {
        source: true,
        guestAccounts: true,
      },
    });

    if (!discovery) {
      throw new NotFoundException(`VM discovery ${id} not found`);
    }

    const guestAccounts = this.buildVmGuestAccounts(dto.guestAccounts);
    const completeness = this.computeCompleteness({
      systemName: dto.systemName,
      environment: dto.environment,
      serviceRole: dto.serviceRole,
      description: dto.description,
      guestAccountsCount: guestAccounts.length,
    });

    if (completeness.missingFields.length > 0) {
      throw new BadRequestException(
        `Complete required VM context before promotion: ${completeness.missingFields.join(', ')}`,
      );
    }

    const normalizedDisks = this.normalizeDisks(dto.disks);
    const promotedDisks =
      normalizedDisks.length > 0
        ? normalizedDisks
        : ((discovery.disks ?? undefined) as Prisma.InputJsonValue | undefined);

    const promoted = await this.prisma.$transaction<VmInventoryWithRelations>(async (tx) => {
      await tx.vmDiscovery.update({
        where: { id },
        data: {
          systemName: dto.systemName.trim(),
          owner: dto.owner?.trim() ?? '',
          environment: dto.environment,
          businessUnit: dto.businessUnit?.trim() ?? '',
          slaTier: dto.slaTier?.trim() ?? '',
          serviceRole: dto.serviceRole.trim(),
          criticality: dto.criticality ?? VmCriticality.STANDARD,
          description: dto.description.trim(),
          notes: dto.notes.trim(),
          tags: this.parseTags(dto.tags),
          disks: normalizedDisks,
          guestAccountsCount: guestAccounts.length,
          completeness: completeness.completeness,
          missingFields: completeness.missingFields,
          state: VmDiscoveryState.ARCHIVED,
          createdByUserId: userId,
          guestAccounts: {
            deleteMany: {},
            create: guestAccounts,
          },
        },
      });

      await tx.vmInventory.deleteMany({
        where: { discoveryId: id },
      });

      const inventory = await tx.vmInventory.create({
        data: {
          discoveryId: id,
          sourceId: discovery.sourceId,
          name: discovery.name,
          systemName: dto.systemName.trim(),
          moid: discovery.moid,
          environment: dto.environment,
          cluster: discovery.cluster,
          clusterResolution: discovery.clusterResolution,
          host: discovery.host,
          hostResolution: discovery.hostResolution,
          computerName: discovery.computerName,
          guestOs: discovery.guestOs,
          primaryIp: discovery.primaryIp,
          cpuCores: discovery.cpuCores,
          memoryGb: discovery.memoryGb,
          storageGb: discovery.storageGb,
          disks: promotedDisks,
          networkLabel: discovery.networkLabel,
          powerState: discovery.powerState,
          lifecycleState: dto.lifecycleState ?? VmLifecycleState.ACTIVE,
          syncState: 'Synced',
          owner: dto.owner?.trim() ?? '',
          businessUnit: dto.businessUnit?.trim() ?? '',
          slaTier: dto.slaTier?.trim() ?? '',
          serviceRole: dto.serviceRole.trim(),
          criticality: dto.criticality ?? VmCriticality.STANDARD,
          description: dto.description.trim(),
          tags: this.parseTags(dto.tags),
          lastSyncAt: new Date(),
          syncedFields: SYNCED_FIELDS,
          managedFields: MANAGED_FIELDS,
          notes: dto.notes.trim(),
          createdByUserId: userId,
          guestAccounts: {
            create: guestAccounts,
          },
        },
        include: {
          source: true,
          guestAccounts: true,
        },
      });

      return inventory;
    });

    return this.mapInventory(promoted);
  }

  async archiveDiscovery(id: string) {
    await this.ensureSeedData();
    await this.prisma.vmDiscovery.update({
      where: { id },
      data: { state: VmDiscoveryState.ARCHIVED },
    });
    return { success: true };
  }

  async findInventory() {
    await this.ensureSeedData();
    const inventories = await this.prisma.vmInventory.findMany({
      where: {
        lifecycleState: {
          not: VmLifecycleState.ARCHIVED,
        },
      },
      include: {
        source: true,
        guestAccounts: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return inventories.map((inventory) => this.mapInventory(inventory));
  }

  async findInventoryById(id: string) {
    await this.ensureSeedData();
    const inventory = await this.prisma.vmInventory.findUnique({
      where: { id },
      include: {
        source: true,
        guestAccounts: true,
      },
    });

    if (!inventory) {
      throw new NotFoundException(`VM inventory ${id} not found`);
    }

    return this.mapInventory(inventory);
  }

  async updateInventory(id: string, dto: SaveVmDraftDto, userId: string) {
    await this.ensureSeedData();
    await this.findInventoryById(id);

    const guestAccounts = this.buildVmGuestAccounts(dto.guestAccounts);
    const updated = await this.prisma.vmInventory.update({
      where: { id },
      data: {
        systemName: dto.systemName.trim(),
        environment: dto.environment,
        owner: dto.owner?.trim() ?? '',
        businessUnit: dto.businessUnit?.trim() ?? '',
        slaTier: dto.slaTier?.trim() ?? '',
        serviceRole: dto.serviceRole.trim(),
        criticality: dto.criticality ?? VmCriticality.STANDARD,
        description: dto.description.trim(),
        notes: dto.notes.trim(),
        tags: this.parseTags(dto.tags),
        lifecycleState: dto.lifecycleState ?? VmLifecycleState.ACTIVE,
        disks: this.normalizeDisks(dto.disks),
        lastSyncAt: new Date(),
        createdByUserId: userId,
        guestAccounts: {
          deleteMany: {},
          create: guestAccounts,
        },
      },
      include: {
        source: true,
        guestAccounts: true,
      },
    });

    return this.mapInventory(updated);
  }

  async archiveInventory(id: string, lifecycleState?: VmLifecycleState) {
    await this.ensureSeedData();
    await this.prisma.vmInventory.update({
      where: { id },
      data: {
        lifecycleState: lifecycleState ?? VmLifecycleState.ARCHIVED,
      },
    });
    return { success: true };
  }
}
