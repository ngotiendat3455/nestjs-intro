import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ReservationService } from './reservation.service';

@Controller('reservations')
export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  // Create reservation for existing customer and attach to a frame
  @Post()
  create(@Body() body: any) {
    return this.service.createReservation(body);
  }

  // Create reservation (temporary) for new customer
  @Post('new-customer')
  createForNewCustomer(@Body() body: any) {
    return this.service.createReservationForNewCustomer(body);
  }

  // Simple list endpoint for reservation list page (can be extended)
  @Get()
  list(
    @Query('orgId') orgId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('customerClass') customerClass?: string,
    @Query('keyWord') keyWord?: string,
    @Query('customerBasicDataId') customerBasicDataId?: string,
  ) {
    return this.service.listReservations({
      orgId,
      startDate,
      endDate,
      customerClass,
      keyWord,
      customerBasicDataId,
    });
  }
}
