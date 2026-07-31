import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/health')
  async getHealth(@Res({ passthrough: true }) response: Response) {
    return this.getReadinessResponse(response);
  }

  @Get('api/health/live')
  getLiveness() {
    return this.appService.getLiveness();
  }

  @Get('api/health/ready')
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    return this.getReadinessResponse(response);
  }

  private async getReadinessResponse(response: Response) {
    const readiness = await this.appService.getReadiness();
    response.status(readiness.ready ? 200 : 503);
    return readiness;
  }
}
