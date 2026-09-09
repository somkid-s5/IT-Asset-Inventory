import { BadRequestException } from '@nestjs/common';
import { CredentialsService } from '../credentials/credentials.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaveVmDraftDto } from './dto/save-vm-draft.dto';
import { VmService } from './vm.service';

type ComponentLink = {
  componentId: string;
  relationType: 'PRIMARY' | 'SHARED';
  responsibleParty?: string;
};

type VmRelationInternals = {
  normalizeVmComponentLinks(dto: SaveVmDraftDto): ComponentLink[] | undefined;
  validateVmComponentLinks(
    links: Array<{
      componentId: string;
      relationType: 'PRIMARY' | 'SHARED';
      responsibleParty: string | null;
    }>,
    vmEnvironment: 'PROD' | 'TEST' | 'UAT' | null,
    vmId?: string,
    prisma?: PrismaService,
  ): Promise<void>;
};

describe('VmService Application relationship contract', () => {
  const service = new VmService({} as PrismaService, {} as CredentialsService);
  const internals = service as unknown as VmRelationInternals;

  it('preserves one explicit PRIMARY and additional SHARED relationships', () => {
    expect(
      internals.normalizeVmComponentLinks({
        componentLinks: [
          {
            componentId: ' component-primary ',
            relationType: 'PRIMARY',
            responsibleParty: ' Platform Team ',
          },
          {
            componentId: 'component-shared',
            relationType: 'SHARED',
          },
        ],
      }),
    ).toEqual([
      {
        componentId: 'component-primary',
        relationType: 'PRIMARY',
        responsibleParty: 'Platform Team',
      },
      {
        componentId: 'component-shared',
        relationType: 'SHARED',
        responsibleParty: null,
      },
    ]);
  });

  it('maps legacy componentIds deterministically to one PRIMARY followed by SHARED', () => {
    expect(
      internals.normalizeVmComponentLinks({
        componentIds: ['component-a', 'component-b', 'component-c'],
      }),
    ).toEqual([
      {
        componentId: 'component-a',
        relationType: 'PRIMARY',
        responsibleParty: null,
      },
      {
        componentId: 'component-b',
        relationType: 'SHARED',
        responsibleParty: null,
      },
      {
        componentId: 'component-c',
        relationType: 'SHARED',
        responsibleParty: null,
      },
    ]);
  });

  it('rejects duplicate component relationships', () => {
    expect(() =>
      internals.normalizeVmComponentLinks({
        componentLinks: [
          { componentId: 'component-a', relationType: 'PRIMARY' },
          { componentId: 'component-a', relationType: 'SHARED' },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects more than one PRIMARY relationship', () => {
    expect(() =>
      internals.normalizeVmComponentLinks({
        componentLinks: [
          { componentId: 'component-a', relationType: 'PRIMARY' },
          { componentId: 'component-b', relationType: 'PRIMARY' },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('allows an archived application link when the VM already retains it', async () => {
    const prisma = {
      applicationComponent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'component-archived',
            environment: {
              name: 'PROD',
              application: { status: 'ARCHIVED' },
            },
          },
        ]),
      },
      applicationComponentVm: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { componentId: 'component-archived', relationType: 'SHARED' },
          ]),
      },
    } as unknown as PrismaService;

    await expect(
      internals.validateVmComponentLinks(
        [
          {
            componentId: 'component-archived',
            relationType: 'SHARED',
            responsibleParty: null,
          },
        ],
        'PROD',
        'vm-1',
        prisma,
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects a newly selected archived application link', async () => {
    const prisma = {
      applicationComponent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'component-archived',
            environment: {
              name: 'PROD',
              application: { status: 'ARCHIVED' },
            },
          },
        ]),
      },
      applicationComponentVm: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    await expect(
      internals.validateVmComponentLinks(
        [
          {
            componentId: 'component-archived',
            relationType: 'SHARED',
            responsibleParty: null,
          },
        ],
        'PROD',
        'vm-1',
        prisma,
      ),
    ).rejects.toThrow('cannot be newly selected');
  });
  it('rejects replacing an existing PRIMARY relationship', async () => {
    const prisma = {
      applicationComponent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'component-new-primary',
            environment: {
              name: 'PROD',
              application: { status: 'ACTIVE' },
            },
          },
        ]),
      },
      applicationComponentVm: {
        findMany: jest.fn().mockResolvedValue([
          {
            componentId: 'component-existing-primary',
            relationType: 'PRIMARY',
          },
        ]),
      },
    } as unknown as PrismaService;

    await expect(
      internals.validateVmComponentLinks(
        [
          {
            componentId: 'component-new-primary',
            relationType: 'PRIMARY',
            responsibleParty: null,
          },
        ],
        'PROD',
        'vm-1',
        prisma,
      ),
    ).rejects.toThrow('at most one PRIMARY');
  });
});
