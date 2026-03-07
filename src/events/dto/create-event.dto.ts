import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsPositive,
  IsUUID,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Payload used by admins to create a union event.
 * If `districtId` is omitted the event is union-wide; otherwise it targets that district only.
 * Setting `publish: true` immediately makes the event public and broadcasts to eligible members.
 */
export class CreateEventDto {
  @ApiProperty({
    example: 'District Workers Rally – Hyderabad',
    description: 'Event title in English (5–255 chars)',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  titleEn: string;

  @ApiPropertyOptional({
    example: 'జిల్లా కార్మికుల ర్యాలీ – హైదరాబాద్',
    description: 'Event title in Telugu (optional)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleTe?: string;

  @ApiPropertyOptional({
    example: 'All union members from the Hyderabad district are requested to attend.',
    description: 'Event description in English (optional)',
  })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiPropertyOptional({
    example: 'హైదరాబాద్ జిల్లా నుండి అన్ని యూనియన్ సభ్యులను హాజరవ్వమని కోరుతున్నారు.',
    description: 'Event description in Telugu (optional)',
  })
  @IsOptional()
  @IsString()
  descriptionTe?: string;

  @ApiProperty({
    example: '2026-04-15T10:00:00.000Z',
    description: 'Event date and time (ISO 8601)',
    format: 'date-time',
  })
  @IsDateString()
  eventDate: string;

  @ApiPropertyOptional({
    example: 'NTR Stadium, Hyderabad',
    description: 'Venue name / address (omit for virtual events)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({
    example: 500,
    description: 'Maximum number of registrations allowed (null = unlimited)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxCapacity?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether the event takes place online',
  })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Restrict event to a specific district (null = union-wide)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Publish immediately and broadcast to eligible active members via FCM / Telegram / SMS.',
  })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
