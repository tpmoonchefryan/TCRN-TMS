// SPDX-License-Identifier: Apache-2.0
import { SetMetadata } from '@nestjs/common';

export const CAPABILITIES_KEY = 'required_capabilities';

export const RequireCapabilities = (...capabilityCodes: string[]) =>
  SetMetadata(CAPABILITIES_KEY, capabilityCodes);
