import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ReservationNewCustomerCourseService } from './reservation-new-customer-course.service';

@Controller('reservation/new-customer-courses')
export class ReservationNewCustomerCourseController {
  constructor(private readonly service: ReservationNewCustomerCourseService) {}

  @Get()
  list(@Query('keyword') keyword?: string) {
    return this.service.list({
      keyword: keyword || '',
    });
  }

  @Get('detail')
  detail(@Query('courseId') courseId: string) {
    return this.service.detail(courseId);
  }

  @Post()
  upsert(@Body() body: any) {
    return this.service.upsert(body);
  }

  @Delete()
  delete(@Query('courseIds') courseIds: string | string[]) {
    const ids = Array.isArray(courseIds) ? courseIds : [courseIds];
    return this.service.delete(ids);
  }
}

