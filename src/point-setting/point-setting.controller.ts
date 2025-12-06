import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PointSettingService } from './point-setting.service';

@Controller('points')
export class PointSettingController {
  constructor(
    private readonly service: PointSettingService,
  ) { }

  // List all point settings for HQ screen
  @Get()
  list() {
    return this.service.list();
  }

  // Create new point definition
  @Post()
  create(
    @Body() body: any,
  ) {
    return this.service.create(body);
  }

  // Toggle deleted / active flag
  @Patch(':pointMstID')
  updateDeleted(
    @Param('pointMstID') pointMstID: string,
    @Body() body: any,
  ) {
    return this.service.updateDeleted(pointMstID, body);
  }
}

