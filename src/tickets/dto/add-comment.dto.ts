import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * Payload for adding a comment to an existing ticket.
 * Internal comments are visible only to reps and admins.
 */
export class AddCommentDto {
  @ApiProperty({
    example: 'We have escalated this to the finance department.',
    description: 'Comment text (5–2000 chars)',
    minLength: 5,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  comment: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'If true, the comment is only visible to union reps and admins — not the ticket owner.',
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
