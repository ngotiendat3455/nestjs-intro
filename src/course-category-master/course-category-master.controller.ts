import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CourseCategoryMasterService } from './course-category-master.service';

@Controller('courseCategoryMaster')
export class CourseCategoryMasterController {
  constructor(private readonly service: CourseCategoryMasterService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('groupId') groupId?: string,
    @Query('orgId') orgId?: string,
    @Query('effectiveAt') effectiveAt?: string,
    @Query('sortBy') sortBy?: 'categoryCode' | 'categoryName' | 'updatedAt' | 'sortOrder',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      status,
      groupId,
      orgId,
      effectiveAt,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
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

