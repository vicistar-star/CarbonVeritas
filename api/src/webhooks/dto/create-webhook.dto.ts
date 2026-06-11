import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsUrl,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ description: 'Webhook callback URL', example: 'https://api.example.com/carbon-webhook' })
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Event types to subscribe to',
    example: ['credit.submitted', 'credit.approved', 'credit.retired'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayUnique()
  events: string[];
}
