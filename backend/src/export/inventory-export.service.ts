/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { AuditAction, ApplicationStatus, AssetStatus } from '@prisma/client';
import XlsxPopulate from 'xlsx-populate';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryExportService {
  constructor(private readonly prisma: PrismaService) {}

  async createWorkbook(passphrase: string, userId: string) {
    const [assets, applications, databases, vms] = await Promise.all([
      this.prisma.asset.findMany({
        where: { status: { not: AssetStatus.DECOMMISSIONED } },
        include: { ipAllocations: true, credentials: true },
      }),
      this.prisma.application.findMany({
        where: { status: ApplicationStatus.ACTIVE },
        include: {
          environments: { include: { components: true } },
          access: { include: { credentials: true } },
        },
      }),
      this.prisma.databaseInventory.findMany({
        include: { accounts: true, logicalDatabases: true },
      }),
      this.prisma.vmInventory.findMany({
        where: { lifecycleState: { not: 'ARCHIVED' } },
        include: { guestAccounts: true },
      }),
    ]);
    const workbook = await XlsxPopulate.fromBlankAsync();
    const sheets: Array<[string, string[][]]> = [
      [
        'Assets',
        [
          [
            'Name',
            'Asset ID',
            'Type',
            'Environment',
            'Status',
            'Location',
            'Owner',
            'Serial Number',
          ],
          ...assets.map((asset) => [
            asset.name,
            asset.assetId ?? '',
            asset.type,
            asset.environment ?? '',
            asset.status,
            asset.location ?? '',
            asset.owner ?? '',
            asset.sn ?? '',
          ]),
        ],
      ],
      [
        'Applications',
        [
          [
            'Name',
            'Technical Owner',
            'Business Unit',
            'Environment',
            'Components',
            'Access Points',
          ],
          ...applications.map((app) => [
            app.name,
            app.technicalOwner ?? '',
            app.businessUnit ?? '',
            app.environments.map((env) => env.name).join(', '),
            app.environments
              .flatMap((env) =>
                env.components.map(
                  (component) => `${env.name}: ${component.name}`,
                ),
              )
              .join('; '),
            app.access
              .map(
                (access) =>
                  `${access.label} (${access.method}) ${access.address}`,
              )
              .join('; '),
          ]),
        ],
      ],
      [
        'Databases',
        [
          [
            'Instance',
            'Engine',
            'Version',
            'Host',
            'IP',
            'Port',
            'Logical Databases',
            'Accounts',
          ],
          ...databases.map((db) => [
            db.name,
            db.engine,
            db.version ?? '',
            db.host,
            db.ipAddress,
            db.port ?? '',
            db.logicalDatabases.map((logical) => logical.name).join(', '),
            db.accounts
              .map((account) => `${account.username} [${account.scope}]`)
              .join(', '),
          ]),
        ],
      ],
      [
        'Virtual Machines',
        [
          [
            'Name',
            'System Name',
            'Environment',
            'Host',
            'Primary IP',
            'Power State',
            'Lifecycle',
            'Owner',
          ],
          ...vms.map((vm) => [
            vm.name,
            vm.systemName,
            vm.environment,
            vm.host,
            vm.primaryIp,
            vm.powerState,
            vm.lifecycleState,
            vm.owner,
          ]),
        ],
      ],
      [
        'Credentials',
        [
          ['Record Type', 'Record Name', 'Username', 'Password'],
          ...assets.flatMap((asset) =>
            asset.credentials.map((credential) => [
              'Asset',
              asset.name,
              credential.username,
              credential.encryptedPassword,
            ]),
          ),
          ...applications.flatMap((app) =>
            app.access.flatMap((access) =>
              access.credentials.map((credential) => [
                'Application Access',
                `${app.name} / ${access.label}`,
                credential.username,
                credential.encryptedPassword,
              ]),
            ),
          ),
          ...databases.flatMap((db) =>
            db.accounts.map((account) => [
              'Database',
              db.name,
              account.username,
              account.encryptedPassword,
            ]),
          ),
          ...vms.flatMap((vm) =>
            vm.guestAccounts.map((account) => [
              'VM Guest',
              vm.name,
              account.username,
              account.encryptedPassword,
            ]),
          ),
        ],
      ],
    ];
    sheets.forEach(([name, rows], index) => {
      const sheet = index === 0 ? workbook.sheet(0) : workbook.addSheet(name);
      sheet.name(name);
      sheet.cell('A1').value(rows);
      sheet.row(1).style({ bold: true, fill: '1F4E78', fontColor: 'FFFFFF' });
      sheet.usedRange().style({ verticalAlignment: 'center' });
      sheet.column('A').width(26);
      sheet.column('B').width(26);
      sheet.column('C').width(22);
      sheet.column('D').width(32);
    });
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: AuditAction.EXPORT_DATA,
        details: JSON.stringify({
          format: 'xlsx',
          encrypted: true,
          sheets: sheets.map(([name]) => name),
        }),
      },
    });
    return workbook.outputAsync({ password: passphrase });
  }
}
