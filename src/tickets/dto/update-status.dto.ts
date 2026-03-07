import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { TicketStatus } from '@prisma/client';

/**
 * Payload used by reps and admins to change a ticket's status.
 */
export class UpdateStatusDto {
  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.in_progress,
    description: 'New status to apply to the ticket',
  })
  @IsEnum(TicketStatus)
  status: TicketStatus;

  @ApiPropertyOptional({
    example: 'Referred to the district zonal officer for review.',
    description: 'Optional note explaining the status change (max 500 chars)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
