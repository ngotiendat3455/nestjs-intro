import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { StaffMasterService } from './staff-master.service';

@Controller('staffMaster')
export class StaffMasterController {
  constructor(private readonly service: StaffMasterService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('orgId') orgId?: string,
    @Query('managerId') managerId?: string,
    @Query('position') position?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('employmentStatus') employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED',
    @Query('effectiveAt') effectiveAt?: string,
    @Query('sortBy') sortBy?: 'staffCode' | 'fullName' | 'updatedAt' | 'hireDate',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      orgId,
      managerId,
      position,
      status,
      employmentStatus,
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

