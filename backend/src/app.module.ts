import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AssetsModule } from './assets/assets.module';
import { CredentialsModule } from './credentials/credentials.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { DatabasesModule } from './databases/databases.module';
import { VmModule } from './vm/vm.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UploadsModule,
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 300,
      },
      {
        name: 'login',
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
    AssetsModule,
    CredentialsModule,
    DashboardModule,
    UsersModule,
    DatabasesModule,
    VmModule,
    AuditLogsModule,
    KnowledgeBaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
