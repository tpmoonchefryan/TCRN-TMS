// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { SetMetadata } from '@nestjs/common';

export const CAPABILITIES_KEY = 'required_capabilities';

export const RequireCapabilities = (...capabilityCodes: string[]) =>
  SetMetadata(CAPABILITIES_KEY, capabilityCodes);
