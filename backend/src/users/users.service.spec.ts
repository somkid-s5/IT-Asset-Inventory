import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

function makeTransactionMock(
  user: { id: string; role: Role; deletedAt: null },
  adminCount: number,
) {
  const tx = {
    $queryRaw: jest.fn(),
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
      count: jest.fn().mockResolvedValue(adminCount),
      update: jest.fn(),
    },
  };
  return tx;
}

describe('UsersService admin safeguards', () => {
  it('prevents an administrator from removing their own admin role', async () => {
    const tx = makeTransactionMock(
      { id: 'admin-1', role: Role.ADMIN, deletedAt: null },
      2,
    );
    const prisma = {
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    } as unknown as PrismaService;
    const service = new UsersService(prisma);

    await expect(
      service.updateRole('admin-1', Role.EDITOR, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('prevents demoting or deleting the last administrator', async () => {
    const roleTx = makeTransactionMock(
      { id: 'admin-1', role: Role.ADMIN, deletedAt: null },
      1,
    );
    const rolePrisma = {
      $transaction: jest.fn(
        (callback: (transaction: typeof roleTx) => unknown) =>
          Promise.resolve(callback(roleTx)),
      ),
    } as unknown as PrismaService;
    const roleService = new UsersService(rolePrisma);

    await expect(
      roleService.updateRole('admin-1', Role.EDITOR, 'admin-2'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(roleTx.user.update).not.toHaveBeenCalled();

    const deleteUpdate = jest.fn();
    const deletePrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'admin-1',
          role: Role.ADMIN,
          username: 'admin',
          email: null,
          deletedAt: null,
        }),
        count: jest.fn().mockResolvedValue(1),
        update: deleteUpdate,
      },
    } as unknown as PrismaService;
    const deleteService = new UsersService(deletePrisma);

    await expect(
      deleteService.remove('admin-1', 'admin-2'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(deleteUpdate).not.toHaveBeenCalled();
  });
});
