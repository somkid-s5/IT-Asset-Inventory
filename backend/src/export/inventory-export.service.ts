/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import XlsxPopulate from 'xlsx-populate';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsService } from '../credentials/credentials.service';

@Injectable()
export class InventoryExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: CredentialsService,
  ) {}

  async createWorkbook(passphrase: string, userId: string) {
    const [assets, applications, databases, vms] = await Promise.all([
      this.prisma.asset.findMany({
        include: { ipAllocations: true, credentials: true },
      }),
      this.prisma.application.findMany({
        include: {
          environments: {
            include: {
              components: {
                include: {
                  assetLinks: true,
                  vmLinks: true,
                  logicalDatabases: true,
                },
              },
              access: { include: { credentials: true } },
            },
          },
          access: { include: { credentials: true, environment: true } },
        },
      }),
      this.prisma.databaseInventory.findMany({
        include: {
          accounts: true,
          logicalDatabases: true,
          hostAsset: { select: { id: true, name: true, assetId: true } },
          hostVm: { select: { id: true, name: true, systemName: true } },
        },
      }),
      this.prisma.vmInventory.findMany({
        include: {
          guestAccounts: true,
          source: { select: { id: true, name: true, endpoint: true } },
          componentLinks: true,
        },
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
            'IP Addresses',
            'Responsible Party',
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
            asset.ipAllocations.map((ip) => ip.address).join(', '),
            asset.responsibleParty ?? '',
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
            'Description',
            'Status',
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
            [
              ...app.access,
              ...app.environments.flatMap((environment) => environment.access),
            ]
              .map(
                (access) =>
                  `${access.label} (${access.method}) ${access.address}`,
              )
              .join('; '),
            app.description ?? '',
            app.status,
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
            'Host Asset',
            'Host VM',
            'Status',
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
            db.hostAsset?.name ?? '',
            db.hostVm?.systemName ?? '',
            db.status ?? '',
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
            'Discovery State',
            'Source',
            'Responsible Party',
          ],
          ...vms.map((vm) => [
            vm.name,
            vm.systemName,
            vm.environment ?? '',
            vm.host,
            vm.primaryIp,
            vm.powerState,
            vm.lifecycleState,
            vm.owner,
            vm.discoveryState,
            vm.source?.name ?? '',
            vm.responsibleParty ?? '',
          ]),
        ],
      ],
      [
        'Relationships',
        [
          [
            'Application',
            'Environment',
            'Component',
            'Assets',
            'VMs',
            'Logical Databases',
          ],
          ...applications.flatMap((app) =>
            app.environments.flatMap((environment) =>
              environment.components.map((component) => [
                app.name,
                environment.name,
                component.name,
                component.assetLinks.map((link) => link.assetId).join(', '),
                component.vmLinks.map((link) => link.vmId).join(', '),
                component.logicalDatabases
                  .map((database) => database.name)
                  .join(', '),
              ]),
            ),
          ),
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
              this.credentials.decrypt(credential.encryptedPassword),
            ]),
          ),
          ...applications.flatMap((app) =>
            [
              ...app.access,
              ...app.environments.flatMap((environment) => environment.access),
            ].flatMap((access) =>
              access.credentials.map((credential) => [
                'Application Access',
                `${app.name} / ${access.label}`,
                credential.username,
                this.credentials.decrypt(credential.encryptedPassword),
              ]),
            ),
          ),
          ...databases.flatMap((db) =>
            db.accounts.map((account) => [
              'Database',
              db.name,
              account.username,
              this.credentials.decrypt(account.encryptedPassword),
            ]),
          ),
          ...vms.flatMap((vm) =>
            vm.guestAccounts.map((account) => [
              'VM Guest',
              vm.name,
              account.username,
              this.credentials.decrypt(account.encryptedPassword),
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
