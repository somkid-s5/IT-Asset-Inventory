import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  AssetStatus,
  DatabaseStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string) {
    const q = query.trim();
    if (!q) {
      return {
        applications: [],
        assets: [],
        virtualMachines: [],
        databases: [],
        logicalDatabases: [],
        documents: [],
      };
    }

    const contains = {
      contains: q,
      mode: Prisma.QueryMode.insensitive,
    } as const;

    const [
      applications,
      assets,
      virtualMachines,
      databases,
      logicalDatabases,
      documents,
    ] = await Promise.all([
      this.prisma.application.findMany({
        where: {
          status: ApplicationStatus.ACTIVE,
          OR: [
            { name: contains },
            { technicalOwner: contains },
            { businessUnit: contains },
          ],
        },
        select: {
          id: true,
          name: true,
          technicalOwner: true,
          businessUnit: true,
        },
        take: 8,
      }),
      this.prisma.asset.findMany({
        where: {
          status: { not: AssetStatus.ARCHIVED },
          OR: [
            { name: contains },
            { assetId: contains },
            { sn: contains },
            { location: contains },
            { ipAllocations: { some: { address: contains } } },
          ],
        },
        select: {
          id: true,
          name: true,
          assetId: true,
          sn: true,
          type: true,
          location: true,
          ipAllocations: {
            select: { address: true },
            take: 2,
          },
        },
        take: 8,
      }),
      this.prisma.vmInventory.findMany({
        where: {
          lifecycleState: { not: 'ARCHIVED' },
          OR: [
            { name: contains },
            { systemName: contains },
            { primaryIp: contains },
            { host: contains },
          ],
        },
        select: {
          id: true,
          name: true,
          systemName: true,
          primaryIp: true,
          host: true,
        },
        take: 8,
      }),
      this.prisma.databaseInventory.findMany({
        where: {
          status: { not: DatabaseStatus.ARCHIVED },
          OR: [
            { name: contains },
            { host: contains },
            { ipAddress: contains },
            { serviceName: contains },
            {
              hostAsset: {
                is: {
                  OR: [{ name: contains }, { assetId: contains }],
                },
              },
            },
            {
              hostVm: {
                is: {
                  OR: [
                    { name: contains },
                    { systemName: contains },
                    { primaryIp: contains },
                    { host: contains },
                  ],
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          engine: true,
          host: true,
          ipAddress: true,
          serviceName: true,
          hostAsset: { select: { name: true, assetId: true } },
          hostVm: {
            select: {
              name: true,
              systemName: true,
              primaryIp: true,
            },
          },
        },
        take: 8,
      }),
      this.prisma.logicalDatabase.findMany({
        where: {
          status: { not: DatabaseStatus.ARCHIVED },
          databaseInventory: {
            status: { not: DatabaseStatus.ARCHIVED },
          },
          OR: [{ name: contains }, { databaseInventory: { name: contains } }],
        },
        select: {
          id: true,
          name: true,
          databaseInventory: {
            select: { id: true, name: true, engine: true },
          },
        },
        take: 8,
      }),
      this.prisma.knowledgeDocument.findMany({
        where: { OR: [{ title: contains }, { content: contains }] },
        select: {
          id: true,
          title: true,
          category: { select: { name: true } },
        },
        take: 8,
      }),
    ]);

    return {
      applications,
      assets,
      virtualMachines,
      databases,
      logicalDatabases,
      documents,
    };
  }
}
