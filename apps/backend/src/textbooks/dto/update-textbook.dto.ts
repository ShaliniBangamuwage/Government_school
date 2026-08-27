import { PartialType } from '@nestjs/mapped-types';
import { CreateTextbookDto } from './create-textbook.dto';

export class UpdateTextbookDto extends PartialType(CreateTextbookDto) {}
