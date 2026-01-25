// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { PartialType } from '@nestjs/mapped-types';

import { CreateSystemRoleDto } from './create-system-role.dto';

export class UpdateSystemRoleDto extends PartialType(CreateSystemRoleDto) {}
