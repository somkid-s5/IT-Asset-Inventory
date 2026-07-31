import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { VmService } from './vm.service';

type VmRequestResult<T> = {
  statusCode: number;
  data: T | null;
};

type VmServiceInternals = {
  requestJson<T>(url: URL): Promise<VmRequestResult<T>>;
};

describe('VmService vCenter mock adapter', () => {
  let service: VmService;
  const originalMockFlag = process.env.VCENTER_MOCK_ENABLED;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    service = new VmService({} as PrismaService, {} as CredentialsService);
    delete process.env.VCENTER_MOCK_ENABLED;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    if (originalMockFlag === undefined) {
      delete process.env.VCENTER_MOCK_ENABLED;
    } else {
      process.env.VCENTER_MOCK_ENABLED = originalMockFlag;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('uses sample responses only when explicitly enabled', async () => {
    process.env.VCENTER_MOCK_ENABLED = 'true';
    const requestJson = (
      service as unknown as VmServiceInternals
    ).requestJson.bind(service) as <T>(url: URL) => Promise<VmRequestResult<T>>;

    const response = await requestJson<{ value: string }>(
      new URL('https://infrapilot.local/api/session'),
    );

    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual({ value: 'mock-session-id-12345' });
  });

  it('rejects mock responses in production even when the flag is enabled', async () => {
    process.env.VCENTER_MOCK_ENABLED = 'true';
    process.env.NODE_ENV = 'production';
    const requestJson = (
      service as unknown as VmServiceInternals
    ).requestJson.bind(service) as <T>(url: URL) => Promise<VmRequestResult<T>>;

    await expect(
      requestJson<{ value: string }>(
        new URL('https://infrapilot.local/api/session'),
      ),
    ).rejects.toThrow('Mock vCenter responses are disabled in production');
  });
});
