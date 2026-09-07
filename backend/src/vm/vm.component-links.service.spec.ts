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
});
