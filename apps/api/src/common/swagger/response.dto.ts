// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Common Swagger Response DTOs
 * Used for documenting API responses in OpenAPI specification
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =============================================================================
// Pagination Meta
// =============================================================================

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  pageSize: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  totalCount: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  hasPrev: boolean;
}

export class ResponseMetaDto {
  @ApiPropertyOptional({ type: PaginationMetaDto })
  pagination?: PaginationMetaDto;
}

// =============================================================================
// Success Response
// =============================================================================

export class ApiSuccessResponseDto<T> {
  @ApiProperty({ description: 'Indicates successful operation', example: true })
  success: true;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiPropertyOptional({ type: ResponseMetaDto })
  meta?: ResponseMetaDto;
}

// =============================================================================
// Error Response
// =============================================================================

export class ErrorDetailDto {
  @ApiPropertyOptional({ description: 'Field name that caused the error', example: 'email' })
  field?: string;

  @ApiProperty({ description: 'Error code', example: 'VALIDATION_FAILED' })
  code: string;

  @ApiProperty({ description: 'Human-readable error message', example: 'Email is required' })
  message: string;
}

export class ErrorBodyDto {
  @ApiProperty({ description: 'Error code', example: 'AUTH_INVALID_CREDENTIALS' })
  code: string;

  @ApiProperty({ description: 'Human-readable error message', example: 'Invalid username or password' })
  message: string;

  @ApiPropertyOptional({ 
    description: 'Additional error details',
    type: [ErrorDetailDto],
  })
  details?: ErrorDetailDto[];

  @ApiPropertyOptional({ description: 'Request ID for tracking', example: 'req-abc123' })
  requestId?: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ description: 'Indicates failed operation', example: false })
  success: false;

  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;
}

// =============================================================================
// Common Response Examples
// =============================================================================

export const COMMON_RESPONSES = {
  UNAUTHORIZED: {
    description: 'Unauthorized - Invalid or missing authentication token',
    schema: {
      example: {
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
    },
  },
  FORBIDDEN: {
    description: 'Forbidden - Insufficient permissions',
    schema: {
      example: {
        success: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'You do not have permission to perform this action',
        },
      },
    },
  },
  NOT_FOUND: {
    description: 'Not Found - Resource does not exist',
    schema: {
      example: {
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'The requested resource was not found',
        },
      },
    },
  },
  BAD_REQUEST: {
    description: 'Bad Request - Invalid input data',
    schema: {
      example: {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: [
            { field: 'email', code: 'INVALID_EMAIL', message: 'Invalid email format' },
          ],
        },
      },
    },
  },
  CONFLICT: {
    description: 'Conflict - Resource already exists or version mismatch',
    schema: {
      example: {
        success: false,
        error: {
          code: 'RESOURCE_CONFLICT',
          message: 'Resource already exists or has been modified',
        },
      },
    },
  },
  INTERNAL_ERROR: {
    description: 'Internal Server Error',
    schema: {
      example: {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          requestId: 'req-abc123',
        },
      },
    },
  },
};

// =============================================================================
// Generic Response Type Helpers
// =============================================================================

/**
 * Use this helper to define response schema with data type
 * Example: @ApiOkResponse(createSuccessResponse(CustomerDto))
 */
export function createSuccessResponse<T>(dataType: new () => T) {
  return {
    schema: {
      allOf: [
        {
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: `#/components/schemas/${dataType.name}` },
          },
        },
      ],
    },
  };
}

/**
 * Create paginated response schema
 */
export function createPaginatedResponse<T>(dataType: new () => T) {
  return {
    schema: {
      allOf: [
        {
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: `#/components/schemas/${dataType.name}` },
            },
            meta: {
              type: 'object',
              properties: {
                pagination: { $ref: '#/components/schemas/PaginationMetaDto' },
              },
            },
          },
        },
      ],
    },
  };
}
