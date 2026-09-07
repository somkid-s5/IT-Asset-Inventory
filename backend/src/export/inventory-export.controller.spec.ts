import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { ROLES_KEY } from '../auth/roles.decorator';
import { InventoryExportController } from './inventory-export.controller';
import { InventoryExportService } from './inventory-export.service';

function createResponseCapture() {
  const headers = new Map<string, string>();
  let body: unknown;
  const response = {
    setHeader: (name: string, value: string) => {
      headers.set(name, value);
      return response;
    },
    send: (value: unknown) => {
      body = value;
      return response;
    },
  } as unknown as Response;
  return { response, headers, getBody: () => body };
}

describe('InventoryExportController security contract', () => {
  it('is restricted to Administrators at the route metadata level', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      InventoryExportController.prototype,
      'export',
    );
    expect(descriptor?.value).toBeDefined();
    expect(Reflect.getMetadata(ROLES_KEY, descriptor?.value as object)).toEqual(
      [Role.ADMIN],
    );
  });

  it('rejects mismatched passphrase confirmation before re-authentication or generation', async () => {
    const verifyCurrentPassword = jest.fn().mockResolvedValue(true);
    const createWorkbook = jest.fn().mockResolvedValue(Buffer.from('xlsx'));
    const controller = new InventoryExportController(
      { createWorkbook } as unknown as InventoryExportService,
      { verifyCurrentPassword } as unknown as AuthService,
    );
    const { response } = createResponseCapture();

    await expect(
      controller.export(
        {
          passphrase: 'Workbook-Key-2026',
          confirmPassphrase: 'Different-Key-2026',
          currentPassword: 'current-account-secret',
        },
        { user: { id: 'admin-1' } },
        response,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verifyCurrentPassword).not.toHaveBeenCalled();
    expect(createWorkbook).not.toHaveBeenCalled();
  });

  it('re-authenticates the current Administrator before returning encrypted XLSX', async () => {
    const encrypted = Buffer.from('encrypted-xlsx');
    const verifyCurrentPassword = jest.fn().mockResolvedValue(true);
    const createWorkbook = jest.fn().mockResolvedValue(encrypted);
    const controller = new InventoryExportController(
      { createWorkbook } as unknown as InventoryExportService,
      { verifyCurrentPassword } as unknown as AuthService,
    );
    const { response, headers, getBody } = createResponseCapture();

    await controller.export(
      {
        passphrase: 'Workbook-Key-2026',
        confirmPassphrase: 'Workbook-Key-2026',
        currentPassword: 'current-account-secret',
      },
      { user: { id: 'admin-1' } },
      response,
    );

    expect(verifyCurrentPassword).toHaveBeenCalledWith(
      'admin-1',
      'current-account-secret',
    );
    expect(createWorkbook).toHaveBeenCalledWith('Workbook-Key-2026', 'admin-1');
    expect(headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(headers.get('Content-Disposition')).toContain(
      'inventory-export.xlsx',
    );
    expect(headers.get('Cache-Control')).toBe('no-store, private');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(getBody()).toBe(encrypted);
  });
});
