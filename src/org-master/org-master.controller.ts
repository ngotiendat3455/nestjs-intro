import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { OrgMasterService } from './org-master.service';

@Controller('orgMaster')
export class OrgMasterController {
  constructor(private readonly service: OrgMasterService) { }

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('parentId') parentId?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('effectiveAt') effectiveAt?: string,
    @Query('sortBy') sortBy?: 'orgCode' | 'orgName' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      status,
      parentId,
      includeInactive: includeInactive === 'true' ? true : includeInactive === 'false' ? false : undefined,
      effectiveAt,
      sortBy,
      sortOrder,
    });
  }

  @Post('add')
  add(@Body() body: any) {
    return this.service.add(body);
  }

  @Put('edit/:id/:applyStartDate')
  edit(
    @Param('id') id: string,
    @Param('applyStartDate') applyStartDate: string,
    @Body() body: any,
  ) {
    return this.service.edit(id, applyStartDate, body);
  }
}

