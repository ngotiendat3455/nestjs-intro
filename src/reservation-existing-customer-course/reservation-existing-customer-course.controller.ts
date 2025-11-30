import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ReservationExistingCustomerCourseService } from './reservation-existing-customer-course.service';

@Controller('reservation/existing-customer-courses')
export class ReservationExistingCustomerCourseController {
  constructor(private readonly service: ReservationExistingCustomerCourseService) {}

  @Get()
  list(
    @Query('companyCode') companyCode?: string,
    @Query('keyWord') keyWord?: string,
  ) {
    return this.service.list({
      companyCode: companyCode || '',
      keyWord: keyWord || '',
    });
  }

  @Get('detail')
  detail(@Query('courseIds') courseId: string) {
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

