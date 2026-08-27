import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import type {
  TextbookHostingMode,
  TextbookHostingPermission,
  TextbookMedium,
  TextbookStream,
  TextbookType,
  TextbookVerificationStatus,
} from '@edunexa/shared-types';

export class CreateTextbookDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsString()
  @IsNotEmpty()
  subjectSlug!: string;

  @IsInt()
  @Min(6)
  @Max(13)
  grade!: number;

  @IsEnum(['Sinhala', 'Tamil', 'English'])
  medium!: TextbookMedium;

  @IsOptional()
  @IsEnum(['biological-science', 'physical-science', 'commerce', 'arts', 'technology', 'common', 'vocational'])
  stream?: TextbookStream;

  @IsEnum(['textbook', 'resource-book', 'workbook', 'practical-handbook', 'teacher-guide', 'supplementary-reader'])
  bookType!: TextbookType;

  @IsOptional()
  @IsString()
  part?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  syllabusYear?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  editionYear?: number;

  @IsOptional()
  @IsString()
  officialPageUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  officialFileUrl?: string;

  @IsOptional()
  @IsString()
  sourceDomain?: string;

  @IsEnum(['official-link', 'firebase-storage'])
  hostingMode!: TextbookHostingMode;

  @IsEnum(['link-only', 'pending', 'confirmed'])
  hostingPermission!: TextbookHostingPermission;

  @IsOptional()
  @IsEnum(['pending', 'verified', 'broken', 'archived'])
  verificationStatus?: TextbookVerificationStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;
}
