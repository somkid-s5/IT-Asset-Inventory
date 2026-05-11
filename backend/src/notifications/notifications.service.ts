import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly lineNotifyToken: string;

  constructor(private configService: ConfigService) {
    this.lineNotifyToken = this.configService.get<string>('LINE_NOTIFY_TOKEN') || '';
  }

  async sendLineNotify(message: string) {
    if (!this.lineNotifyToken) {
      this.logger.warn('LINE_NOTIFY_TOKEN is not set. Skipping notification.');
      return;
    }

    try {
      const response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${this.lineNotifyToken}`,
        },
        body: new URLSearchParams({ message }).toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Failed to send Line Notify: ${error}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error sending Line Notify: ${message}`);
    }
  }

  async notifyNewTicket(ticketNo: string, title: string, clientName: string) {
    const message = `\n🆕 งานใหม่: ${title}\n🎫 เลขที่: ${ticketNo}\n🏢 ลูกค้า: ${clientName}`;
    await this.sendLineNotify(message);
  }

  async notifyTicketAssigned(
    ticketNo: string,
    title: string,
    assigneeName: string,
  ) {
    const message = `\n👤 งานถูกรับผิดชอบแล้ว\n🎫 เลขที่: ${ticketNo}\n📋 หัวข้อ: ${title}\n👨‍💻 ผู้รับผิดชอบ: @${assigneeName}`;
    await this.sendLineNotify(message);
  }

  async notifyTicketResolved(ticketNo: string, title: string) {
    const message = `\n✅ ปิดงานแล้ว\n🎫 เลขที่: ${ticketNo}\n📋 หัวข้อ: ${title}`;
    await this.sendLineNotify(message);
  }
}
