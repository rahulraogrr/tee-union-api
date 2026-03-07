import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';

/**
 * Payload used by admins to create a union news article.
 * Setting `publish: true` immediately makes the article public and broadcasts to all members.
 */
export class CreateNewsDto {
  @ApiProperty({
    example: 'Annual General Body Meeting – January 2026',
    description: 'Article headline in English (5–255 chars)',
    minLength: 5,
    maxLength: 255,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  titleEn: string;

  @ApiPropertyOptional({
    example: 'వార్షిక సాధారణ సభ – జనవరి 2026',
    description: 'Article headline in Telugu (optional)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleTe?: string;

  @ApiProperty({
    example: 'The Annual General Body Meeting will be held on 15 January 2026 at 10:00 AM at the Union Hall.',
    description: 'Full article body in English (min 20 chars)',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  bodyEn: string;

  @ApiPropertyOptional({
    example: 'వార్షిక సాధారణ సభ 15 జనవరి 2026న ఉదయం 10:00 గంటలకు యూనియన్ హాల్‌లో జరుగుతుంది.',
    description: 'Full article body in Telugu (optional)',
  })
  @IsOptional()
  @IsString()
  bodyTe?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Publish immediately and broadcast to all active members via FCM / Telegram / SMS.',
  })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
