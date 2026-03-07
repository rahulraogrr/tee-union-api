import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { PlatformType } from '@prisma/client';

/**
 * Payload sent by the mobile app when a new FCM push token is obtained
 * (on install, re-install, or when the OS rotates the token).
 */
export class RegisterTokenDto {
  @ApiProperty({
    example: 'fDa9kX3z:APA91bH...',
    description: 'FCM registration token from Firebase SDK',
    maxLength: 4096,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  token: string;

  @ApiProperty({
    enum: PlatformType,
    example: PlatformType.android,
    description: 'Device platform — used for platform-specific FCM options',
  })
  @IsEnum(PlatformType)
  platform: PlatformType;
}
