import { Body, Controller, Get, Post, Put, Query, Param } from '@nestjs/common';
import { CustomerNumberFormatService } from './customer-number-format.service';

@Controller('customer')
export class CustomerNumberFormatController {
  constructor(private readonly service: CustomerNumberFormatService) {}

  // Settings
  @Get('settings/number-format')
  getEffective(@Query('target') target: 'CUSTOMER_NO' | 'MANAGEMENT_NO', @Query('orgId') orgId?: string) {
    return this.service.getEffective(target, orgId);
  }

  @Post('settings/number-format')
  createSetting(@Body() body: any) {
    return this.service.createSetting(body);
  }

  @Put('settings/number-format/:id')
  updateSetting(@Param('id') id: string, @Body() body: any) {
    return this.service.updateSetting(id, body);
  }

  // Preview
  @Post('settings/number-format/preview')
  preview(@Body() body: any) {
    return this.service.preview(body);
  }

  // Generate value (used when creating customer)
  @Post('settings/number-format/generate')
  generate(@Body() body: any) {
    return this.service.generate(body);
  }

  // List display toggle
  @Get('settings/list-display')
  getListDisplay(@Query('orgId') orgId?: string) {
    return this.service.getListDisplay(orgId);
  }

  @Put('settings/list-display')
  upsertListDisplay(@Body() body: any) {
    return this.service.upsertListDisplay(body);
  }
}

