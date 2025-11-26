import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CourseMasterService } from './course-master.service';

@Controller('courseMaster')
export class CourseMasterController {
  constructor(private readonly service: CourseMasterService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      status,
    });
  }

  @Get(':contractCourseId')
  getOne(@Param('contractCourseId') contractCourseId: string) {
    return this.service.getOne(contractCourseId);
  }

  @Post('add')
  add(@Body() body: any) {
    return this.service.add(body);
  }

  @Put('edit/:contractCourseId')
  edit(@Param('contractCourseId') contractCourseId: string, @Body() body: any) {
    return this.service.edit(contractCourseId, body);
  }
}
