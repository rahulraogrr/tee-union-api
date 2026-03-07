import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, MaxLength, MinLength } from 'class-validator';
import { TicketPriority } from '@prisma/client';

/**
 * Payload sent by a member to raise a new grievance ticket.
 */
export class CreateTicketDto {
  @ApiProperty({
    example: 'Salary not credited for October',
    description: 'Short title for the grievance (10–200 chars)',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'My salary for the month of October has not been credited as of November 5th.',
    description: 'Detailed description of the issue (max 2000 chars)',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID of the ticket category',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: TicketPriority,
    default: TicketPriority.standard,
    description: 'Priority level — affects SLA deadline (standard=30d, urgent=10d, critical=1d)',
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
