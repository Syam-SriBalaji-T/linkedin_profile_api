import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { CreateSearchDto } from './dto/create-search.dto';
import { ListSearchesDto } from './dto/list-searches.dto';
import { SearchesService } from './searches.service';

@Controller('searches')
@UseGuards(AuthGuard)
export class SearchesController {
  constructor(private readonly searches: SearchesService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSearchDto,
    @Query('refresh') refresh?: string,
  ) {
    return this.searches.create(user.id, dto.url, refresh === 'true');
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListSearchesDto) {
    return this.searches.list(user.id, query.limit ?? 20, query.offset ?? 0);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.searches.findOne(user.id, id);
  }
}
