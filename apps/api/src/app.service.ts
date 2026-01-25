// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { name: string; version: string; description: string } {
    return {
      name: 'TCRN TMS API',
      version: '0.1.0',
      description: 'Talent Management System API for VTuber/VUP',
    };
  }
}
