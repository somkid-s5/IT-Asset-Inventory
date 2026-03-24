"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var VmService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VmService = void 0;
const common_1 = require("@nestjs/common");
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
const client_1 = require("@prisma/client");
const credentials_service_1 = require("../credentials/credentials.service");
const prisma_service_1 = require("../prisma/prisma.service");
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
let VmService = VmService_1 = class VmService {
    prisma;
    credentialsService;
    logger = new common_1.Logger(VmService_1.name);
    autoSyncTimer = null;
    autoSyncRunning = false;
    constructor(prisma, credentialsService) {
        this.prisma = prisma;
        this.credentialsService = credentialsService;
    }
    onModuleInit() {
        this.startAutoSyncWorker();
    }
    onModuleDestroy() {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
    }
    async ensureSeedData() {
        return;
    }
    toRelativeTime(date) {
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
    sanitizeText(value) {
        return value?.trim() || null;
    }
    parseSyncIntervalMs(syncInterval) {
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
    shouldAutoSyncSource(source, now) {
        if (!source.lastSyncAt) {
            return true;
        }
        const intervalMs = this.parseSyncIntervalMs(source.syncInterval);
        const elapsedMs = now.getTime() - source.lastSyncAt.getTime();
        return elapsedMs >= intervalMs;
    }
    startAutoSyncWorker() {
        if (this.autoSyncTimer) {
            return;
        }
        this.autoSyncTimer = setInterval(() => {
            void this.runAutoSyncCycle();
        }, 60 * 1000);
        void this.runAutoSyncCycle();
    }
    async runAutoSyncCycle() {
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
                }
                catch (error) {
                    const connectionError = this.getHumanConnectionError(error);
                    await this.prisma.vmVCenterSource.update({
                        where: { id: source.id },
                        data: {
                            status: 'Connection failed',
                        },
                    });
                    this.logger.warn(`Auto-sync failed for source ${source.name}: ${connectionError.message}${connectionError.detail ? ` - ${connectionError.detail}` : ''}`);
                }
            }
        }
        finally {
            this.autoSyncRunning = false;
        }
    }
    parseTags(tags) {
        return (tags ?? '')
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
    }
    normalizeDisks(disks) {
        return (disks ?? []).map((disk) => ({
            label: disk.label.trim(),
            sizeGb: disk.sizeGb,
            ...(disk.datastore?.trim() ? { datastore: disk.datastore.trim() } : {}),
        }));
    }
    buildVmGuestAccounts(accounts) {
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
    computeCompleteness(input) {
        const required = [
            ['System Name', input.systemName],
            ['Environment', input.environment],
            ['Service Role', input.serviceRole],
            ['Service Purpose', input.description],
            ['Guest Accounts', (input.guestAccountsCount ?? 0) > 0 ? 'present' : ''],
        ];
        const missingFields = required
            .filter(([, value]) => !value)
            .map(([label]) => label);
        const completeness = Math.round(((required.length - missingFields.length) / required.length) * 100);
        return {
            missingFields,
            completeness,
            state: missingFields.length === 0 ? client_1.VmDiscoveryState.READY_TO_PROMOTE : client_1.VmDiscoveryState.NEEDS_CONTEXT,
        };
    }
    mapSource(source) {
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
    mapDiscovery(discovery) {
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
            disks: discovery.disks ?? [],
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
    mapInventory(inventory) {
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
            disks: inventory.disks ?? [],
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
    normalizeEndpoint(endpoint) {
        const trimmed = endpoint.trim();
        const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        const url = new URL(withProtocol);
        if (!url.pathname || url.pathname === '/') {
            url.pathname = '/ui';
        }
        return url;
    }
    getVcenterApiBase(endpoint) {
        const normalized = this.normalizeEndpoint(endpoint);
        return new URL(normalized.origin);
    }
    requestJson(url, options = {}) {
        const transport = url.protocol === 'http:' ? http : https;
        const timeoutMs = options.timeoutMs ?? 8000;
        return new Promise((resolve, reject) => {
            const request = transport.request({
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port || undefined,
                path: `${url.pathname}${url.search}`,
                method: options.method ?? 'GET',
                headers: options.headers,
                rejectUnauthorized: false,
            }, (response) => {
                const chunks = [];
                response.on('data', (chunk) => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                });
                response.on('end', () => {
                    const rawBody = Buffer.concat(chunks).toString('utf8');
                    let data = null;
                    if (rawBody) {
                        try {
                            data = JSON.parse(rawBody);
                        }
                        catch {
                            data = null;
                        }
                    }
                    resolve({
                        statusCode: response.statusCode ?? 0,
                        data,
                        rawBody,
                    });
                });
            });
            request.setTimeout(timeoutMs, () => {
                request.destroy(new Error(`Timed out after ${timeoutMs}ms`));
            });
            request.on('error', reject);
            request.end();
        });
    }
    extractVcenterPayload(data) {
        if (data && typeof data === 'object' && 'value' in data) {
            return data.value ?? null;
        }
        return data;
    }
    buildBasicAuthHeader(username, password) {
        return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }
    getHumanConnectionError(error) {
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
    async authenticateVcenter(endpoint, username, password) {
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
        const candidates = [
            { apiFamily: 'api', path: '/api/session' },
            { apiFamily: 'rest', path: '/rest/com/vmware/cis/session' },
        ];
        let lastStatusCode = 0;
        for (const candidate of candidates) {
            const response = await this.requestJson(new URL(candidate.path, baseUrl), {
                method: 'POST',
                headers,
            });
            lastStatusCode = response.statusCode;
            const sessionId = this.extractVcenterPayload(response.data);
            if (response.statusCode >= 200 && response.statusCode < 300 && typeof sessionId === 'string' && sessionId) {
                return {
                    apiFamily: candidate.apiFamily,
                    baseUrl,
                    sessionId,
                };
            }
            if (response.statusCode === 401 || response.statusCode === 403) {
                throw new Error('Authentication failed. Check the username, password, and API permissions.');
            }
        }
        throw new Error(`Unable to create a vCenter API session. Last response status: ${lastStatusCode || 'unknown'}.`);
    }
    async requestVcenterResource(session, paths) {
        let lastStatusCode = 0;
        let lastBody = '';
        for (const path of paths) {
            const response = await this.requestJson(new URL(path, session.baseUrl), {
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
    async getVcenterVersion(session) {
        const versionInfo = (await this.requestVcenterResource(session, [
            '/rest/appliance/system/version',
            '/api/appliance/system/version',
        ]).catch((error) => {
            const message = error instanceof Error ? error.message : '';
            if (message.toLowerCase().includes('not authorized') || message.toLowerCase().includes('unauthorized')) {
                return {
                    version: 'Unavailable (insufficient privilege)',
                };
            }
            return null;
        })) ?? null;
        const version = versionInfo?.version?.trim();
        const buildValue = versionInfo;
        const build = typeof buildValue?.build === 'string' ? buildValue.build.trim() : undefined;
        if (version && build) {
            return `${version} (build ${build})`;
        }
        if (version) {
            return version;
        }
        return 'Detected after first sync';
    }
    unwrapDeviceCollection(devices) {
        if (!devices) {
            return [];
        }
        if (Array.isArray(devices)) {
            return devices
                .map((device) => device.value ?? null)
                .filter((device) => Boolean(device));
        }
        return Object.values(devices);
    }
    mapPowerState(powerState) {
        switch ((powerState ?? '').toUpperCase()) {
            case 'POWERED_ON':
            case 'RUNNING':
                return client_1.VmPowerState.RUNNING;
            case 'SUSPENDED':
                return client_1.VmPowerState.SUSPENDED;
            default:
                return client_1.VmPowerState.STOPPED;
        }
    }
    extractMemoryGb(detail, summary) {
        const memoryMiB = detail.memory?.size_MiB ??
            detail.memory?.size_mib ??
            detail.hardware?.memory?.size_MiB ??
            detail.hardware?.memory?.size_mib ??
            summary.memory_size_mib ??
            0;
        return Math.max(1, Math.round(memoryMiB / 1024));
    }
    extractDisks(detail) {
        const disks = this.unwrapDeviceCollection(detail.hardware?.disks ?? detail.disks ?? null);
        return disks.map((disk, index) => {
            const rawDisk = disk;
            const capacityBytes = Number(rawDisk.capacity ?? rawDisk.capacity_bytes ?? 0);
            const capacityMiB = Number(rawDisk.capacity_MiB ?? rawDisk.capacity_mib ?? 0);
            const sizeGb = capacityBytes
                ? Math.max(1, Math.round(capacityBytes / 1024 / 1024 / 1024))
                : capacityMiB
                    ? Math.max(1, Math.round(capacityMiB / 1024))
                    : 0;
            const datastore = typeof rawDisk.datastore === 'string'
                ? rawDisk.datastore
                : typeof rawDisk.backing === 'object' && rawDisk.backing && 'datastore' in rawDisk.backing
                    ? String(rawDisk.backing.datastore ?? '')
                    : typeof rawDisk.backing === 'object' &&
                        rawDisk.backing &&
                        'vmdk_file' in rawDisk.backing &&
                        typeof rawDisk.backing.vmdk_file === 'string'
                        ? String(rawDisk.backing.vmdk_file ?? '')
                            .match(/^\[([^\]]+)\]/)?.[1]
                        : undefined;
            const label = typeof rawDisk.label === 'string' && rawDisk.label.trim()
                ? rawDisk.label
                : `Hard disk ${index + 1}`;
            return {
                label,
                sizeGb,
                ...(datastore ? { datastore } : {}),
            };
        }).filter((disk) => disk.sizeGb > 0);
    }
    extractNetworkLabel(detail) {
        const firstNic = this.unwrapDeviceCollection(detail.hardware?.nics ?? detail.nics ?? null)[0];
        if (!firstNic) {
            return '--';
        }
        const candidates = [
            firstNic.network_name,
            firstNic.network,
            typeof firstNic.backing === 'object' && firstNic.backing ? firstNic.backing.network_name : undefined,
            typeof firstNic.backing === 'object' && firstNic.backing ? firstNic.backing.network : undefined,
            firstNic.label,
        ];
        return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? '--';
    }
    inferEnvironment(sourceName, vmName) {
        const haystack = `${sourceName} ${vmName}`.toLowerCase();
        if (haystack.includes('prod')) {
            return client_1.VmEnvironment.PROD;
        }
        if (haystack.includes('uat')) {
            return client_1.VmEnvironment.UAT;
        }
        if (haystack.includes('test') || haystack.includes('qa')) {
            return client_1.VmEnvironment.TEST;
        }
        return client_1.VmEnvironment.UAT;
    }
    inferCriticality(environment) {
        if (environment === client_1.VmEnvironment.PROD) {
            return client_1.VmCriticality.BUSINESS_CRITICAL;
        }
        return client_1.VmCriticality.STANDARD;
    }
    async fetchSourceInventory(source) {
        const session = await this.authenticateVcenter(source.endpoint, source.username, source.encryptedPassword ? this.credentialsService.decrypt(source.encryptedPassword) : null);
        const version = await this.getVcenterVersion(session);
        const hosts = (await this.requestVcenterResource(session, [
            '/rest/vcenter/host',
            '/api/vcenter/host',
        ]).catch(() => null)) ?? [];
        const clusters = (await this.requestVcenterResource(session, [
            '/rest/vcenter/cluster',
            '/api/vcenter/cluster',
        ]).catch(() => null)) ?? [];
        const fallbackHost = hosts.length === 1 ? hosts[0]?.name ?? '--' : '--';
        const fallbackCluster = clusters.length === 1 ? clusters[0]?.name ?? '--' : '--';
        const summaries = (await this.requestVcenterResource(session, [
            '/api/vcenter/vm',
            '/rest/vcenter/vm',
        ])) ?? [];
        const records = await Promise.all(summaries.map(async (summary) => {
            const detail = (await this.requestVcenterResource(session, [
                `/api/vcenter/vm/${summary.vm}`,
                `/rest/vcenter/vm/${summary.vm}`,
            ]).catch(() => null)) ?? null;
            const guestIdentity = (await this.requestVcenterResource(session, [
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
                clusterResolution: detail?.cluster_name || detail?.cluster
                    ? 'DIRECT_VM'
                    : fallbackCluster !== '--'
                        ? 'SOURCE_SINGLE_CLUSTER'
                        : 'UNKNOWN',
                host: detail?.host_name ?? detail?.host ?? fallbackHost,
                hostResolution: detail?.host_name || detail?.host
                    ? 'DIRECT_VM'
                    : fallbackHost !== '--'
                        ? 'SOURCE_SINGLE_HOST'
                        : 'UNKNOWN',
                computerName: this.sanitizeText(guestIdentity?.host_name ?? guestIdentity?.name) ?? undefined,
                guestOs: guestIdentity?.full_name?.localized ??
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
        }));
        return {
            apiFamily: session.apiFamily,
            version,
            records,
        };
    }
    async syncSourceData(source) {
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
                        state: existingDiscovery?.state === client_1.VmDiscoveryState.ARCHIVED
                            ? client_1.VmDiscoveryState.ARCHIVED
                            : completeness.state,
                    },
                });
                await tx.vmInventory.updateMany({
                    where: {
                        moid: record.moid,
                        sourceId: source.id,
                        lifecycleState: {
                            not: client_1.VmLifecycleState.ARCHIVED,
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
                        not: client_1.VmDiscoveryState.ARCHIVED,
                    },
                    moid: {
                        notIn: Array.from(seenMoids),
                    },
                },
                data: {
                    state: client_1.VmDiscoveryState.DRIFTED,
                },
            });
            await tx.vmInventory.updateMany({
                where: {
                    sourceId: source.id,
                    lifecycleState: {
                        notIn: [client_1.VmLifecycleState.ARCHIVED, client_1.VmLifecycleState.DELETED_IN_VCENTER],
                    },
                    moid: {
                        notIn: Array.from(seenMoids),
                    },
                },
                data: {
                    lifecycleState: client_1.VmLifecycleState.DELETED_IN_VCENTER,
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
                            not: client_1.VmDiscoveryState.ARCHIVED,
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        return sources.map((source) => this.mapSource(source));
    }
    async createSource(dto, userId) {
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
                            not: client_1.VmDiscoveryState.ARCHIVED,
                        },
                    },
                },
            },
        });
        return this.mapSource(source);
    }
    async updateSource(id, dto) {
        await this.ensureSeedData();
        const currentSource = await this.prisma.vmVCenterSource.findUnique({
            where: { id },
        });
        if (!currentSource) {
            throw new common_1.NotFoundException(`VM source ${id} not found`);
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
                            not: client_1.VmDiscoveryState.ARCHIVED,
                        },
                    },
                },
            },
        });
        return this.mapSource(source);
    }
    async removeSource(id) {
        await this.ensureSeedData();
        const source = await this.prisma.vmVCenterSource.findUnique({ where: { id } });
        if (!source) {
            throw new common_1.NotFoundException(`VM source ${id} not found`);
        }
        await this.prisma.vmVCenterSource.delete({ where: { id } });
        return { success: true };
    }
    async syncAllSources() {
        await this.ensureSeedData();
        const sources = await this.prisma.vmVCenterSource.findMany({
            orderBy: { createdAt: 'asc' },
        });
        const results = await Promise.allSettled(sources.map(async (source) => {
            try {
                return await this.syncSourceData(source);
            }
            catch (error) {
                await this.prisma.vmVCenterSource.update({
                    where: { id: source.id },
                    data: {
                        status: 'Connection failed',
                    },
                });
                throw error;
            }
        }));
        const successCount = results.filter((result) => result.status === 'fulfilled').length;
        const failedResults = results.filter((result) => result.status === 'rejected');
        return {
            success: failedResults.length === 0,
            message: failedResults.length === 0
                ? `Synced all ${successCount} vCenter source${successCount === 1 ? '' : 's'}.`
                : `Synced ${successCount} source${successCount === 1 ? '' : 's'}, ${failedResults.length} failed.`,
            successCount,
            failedCount: failedResults.length,
        };
    }
    async testSourceConnection(dto) {
        try {
            const session = await this.authenticateVcenter(dto.endpoint, dto.username, dto.password);
            const version = await this.getVcenterVersion(session);
            return {
                success: true,
                message: `Connected to ${session.baseUrl.origin} successfully`,
                detail: `Authenticated with the ${session.apiFamily.toUpperCase()} endpoint family and detected vCenter version ${version}.`,
                apiFamily: session.apiFamily,
                version,
            };
        }
        catch (error) {
            const connectionError = this.getHumanConnectionError(error);
            return {
                success: false,
                message: connectionError.message,
                detail: connectionError.detail,
            };
        }
    }
    async syncSource(id) {
        await this.ensureSeedData();
        const source = await this.prisma.vmVCenterSource.findUnique({
            where: { id },
        });
        if (!source) {
            throw new common_1.NotFoundException(`VM source ${id} not found`);
        }
        try {
            return await this.syncSourceData(source);
        }
        catch (error) {
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
                    not: client_1.VmDiscoveryState.ARCHIVED,
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
    async findDiscovery(id) {
        await this.ensureSeedData();
        const discovery = await this.prisma.vmDiscovery.findUnique({
            where: { id },
            include: {
                source: true,
                guestAccounts: true,
            },
        });
        if (!discovery) {
            throw new common_1.NotFoundException(`VM discovery ${id} not found`);
        }
        return this.mapDiscovery(discovery);
    }
    async updateDiscovery(id, dto, userId) {
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
                criticality: dto.criticality ?? client_1.VmCriticality.STANDARD,
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
    async promoteDiscovery(id, dto, userId) {
        await this.ensureSeedData();
        const discovery = await this.prisma.vmDiscovery.findUnique({
            where: { id },
            include: {
                source: true,
                guestAccounts: true,
            },
        });
        if (!discovery) {
            throw new common_1.NotFoundException(`VM discovery ${id} not found`);
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
            throw new common_1.BadRequestException(`Complete required VM context before promotion: ${completeness.missingFields.join(', ')}`);
        }
        const normalizedDisks = this.normalizeDisks(dto.disks);
        const promotedDisks = normalizedDisks.length > 0
            ? normalizedDisks
            : (discovery.disks ?? undefined);
        const promoted = await this.prisma.$transaction(async (tx) => {
            await tx.vmDiscovery.update({
                where: { id },
                data: {
                    systemName: dto.systemName.trim(),
                    owner: dto.owner?.trim() ?? '',
                    environment: dto.environment,
                    businessUnit: dto.businessUnit?.trim() ?? '',
                    slaTier: dto.slaTier?.trim() ?? '',
                    serviceRole: dto.serviceRole.trim(),
                    criticality: dto.criticality ?? client_1.VmCriticality.STANDARD,
                    description: dto.description.trim(),
                    notes: dto.notes.trim(),
                    tags: this.parseTags(dto.tags),
                    disks: normalizedDisks,
                    guestAccountsCount: guestAccounts.length,
                    completeness: completeness.completeness,
                    missingFields: completeness.missingFields,
                    state: client_1.VmDiscoveryState.ARCHIVED,
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
                    lifecycleState: dto.lifecycleState ?? client_1.VmLifecycleState.ACTIVE,
                    syncState: 'Synced',
                    owner: dto.owner?.trim() ?? '',
                    businessUnit: dto.businessUnit?.trim() ?? '',
                    slaTier: dto.slaTier?.trim() ?? '',
                    serviceRole: dto.serviceRole.trim(),
                    criticality: dto.criticality ?? client_1.VmCriticality.STANDARD,
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
    async archiveDiscovery(id) {
        await this.ensureSeedData();
        await this.prisma.vmDiscovery.update({
            where: { id },
            data: { state: client_1.VmDiscoveryState.ARCHIVED },
        });
        return { success: true };
    }
    async findInventory() {
        await this.ensureSeedData();
        const inventories = await this.prisma.vmInventory.findMany({
            where: {
                lifecycleState: {
                    not: client_1.VmLifecycleState.ARCHIVED,
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
    async findInventoryById(id) {
        await this.ensureSeedData();
        const inventory = await this.prisma.vmInventory.findUnique({
            where: { id },
            include: {
                source: true,
                guestAccounts: true,
            },
        });
        if (!inventory) {
            throw new common_1.NotFoundException(`VM inventory ${id} not found`);
        }
        return this.mapInventory(inventory);
    }
    async updateInventory(id, dto, userId) {
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
                criticality: dto.criticality ?? client_1.VmCriticality.STANDARD,
                description: dto.description.trim(),
                notes: dto.notes.trim(),
                tags: this.parseTags(dto.tags),
                lifecycleState: dto.lifecycleState ?? client_1.VmLifecycleState.ACTIVE,
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
    async archiveInventory(id, lifecycleState) {
        await this.ensureSeedData();
        await this.prisma.vmInventory.update({
            where: { id },
            data: {
                lifecycleState: lifecycleState ?? client_1.VmLifecycleState.ARCHIVED,
            },
        });
        return { success: true };
    }
};
exports.VmService = VmService;
exports.VmService = VmService = VmService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        credentials_service_1.CredentialsService])
], VmService);
//# sourceMappingURL=vm.service.js.map