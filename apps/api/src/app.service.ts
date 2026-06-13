// SPDX-License-Identifier: Apache-2.0
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
