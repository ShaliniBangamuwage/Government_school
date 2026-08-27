import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type {
  TextbookMedium,
  TextbookStream,
  TextbookType,
  TextbookVerificationStatus,
} from '@edunexa/shared-types';

export class TextbookFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(13)
  grade?: number;

  @IsOptional()
  @IsEnum(['Sinhala', 'Tamil', 'English', 'all'])
  medium?: TextbookMedium | 'all';

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  subjectSlug?: string;

  @IsOptional()
  @IsEnum(['biological-science', 'physical-science', 'commerce', 'arts', 'technology', 'common', 'vocational', 'all'])
  stream?: TextbookStream | 'all';

  @IsOptional()
  @IsEnum(['textbook', 'resource-book', 'workbook', 'practical-handbook', 'teacher-guide', 'supplementary-reader', 'all'])
  bookType?: TextbookType | 'all';

  @IsOptional()
  @IsEnum(['pending', 'verified', 'broken', 'archived', 'all'])
  verificationStatus?: TextbookVerificationStatus | 'all';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}
