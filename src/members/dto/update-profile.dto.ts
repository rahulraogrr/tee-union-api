import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  MaxLength,
} from 'class-validator';

/** Marital status options supported by the system. */
export enum MaritalStatus {
  single   = 'single',
  married  = 'married',
  divorced = 'divorced',
  widowed  = 'widowed',
}

/**
 * Fields a member may self-update.
 * All fields are optional — only provided fields are changed.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: '12-3, MG Road, Hyderabad, Telangana 500001',
    description: 'Residential address (max 500 chars)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Mobile number in E.164 format',
    pattern: '^\\+91\\d{10}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+91\d{10}$/, { message: 'mobileNo must be a valid Indian number in +91XXXXXXXXXX format' })
  mobileNo?: string;

  @ApiPropertyOptional({
    enum: MaritalStatus,
    example: MaritalStatus.married,
    description: 'Marital status',
  })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;
}
