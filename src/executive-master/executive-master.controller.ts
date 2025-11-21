import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ExecutiveMasterService } from './executive-master.service';

@Controller('executiveMaster')
export class ExecutiveMasterController {
  constructor(private readonly service: ExecutiveMasterService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('orgId') orgId?: string,
    @Query('effectiveAt') effectiveAt?: string,
    @Query('sortBy') sortBy?: 'executiveCode' | 'executiveName' | 'updatedAt' | 'position',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      status,
      orgId,
      effectiveAt,
      sortBy,
      sortOrder,
    });
  }

  @Post('add')
  add(@Body() body: any) {
    return this.service.add(body);
  }

  @Put('edit/:id')
  edit(@Param('id') id: string, @Body() body: any) {
    return this.service.edit(id, body);
  }
}

