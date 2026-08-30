import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  url!: string;
}
