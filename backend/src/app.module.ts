import { Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule, AuthModule, AssetsModule, CredentialsModule, DashboardModule, UsersModule, DatabasesModule, VmModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
