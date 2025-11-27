import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MediaMasterService } from './media-master.service';

@Controller('mediaMaster')
export class MediaMasterController {
  constructor(private readonly service: MediaMasterService) {}

  // GET /mediaMaster?orgIds=&isAppluUnderOrg=&targetDate=&keyWord=&mediaSearchType=
  @Get()
  list(
    @Query('orgIds') orgIds?: string,
    @Query('isAppluUnderOrg') isAppluUnderOrg?: string,
    @Query('targetDate') targetDate?: string,
    @Query('keyWord') keyWord?: string,
    @Query('mediaSearchType') mediaSearchType?: 'ALL' | 'VALID' | 'INVALID',
  ) {
    return this.service.list({
      orgIds: orgIds || '',
      isAppluUnderOrg: isAppluUnderOrg === 'true',
      targetDate: targetDate || '',
      keyWord: keyWord || '',
      mediaSearchType: mediaSearchType || 'ALL',
    });
  }

  // GET /mediaMaster/detail?mediaId=&targetDate=&mediaSearchType=
  @Get('detail')
  detail(
    @Query('mediaId') mediaId: string,
    @Query('targetDate') targetDate?: string,
    @Query('mediaSearchType') mediaSearchType?: 'VALID' | 'INVALID',
  ) {
    return this.service.getDetail({
      mediaId,
      targetDate: targetDate || '',
      mediaSearchType: mediaSearchType || 'VALID',
    });
  }

  // POST /mediaMaster?applyDate=&applyStartDate=&mediaId=&mediaSearchType=&invalidChangeFlag=
  @Post()
  upsert(
    @Query('applyDate') applyDate: string,
    @Query('applyStartDate') applyStartDate: string,
    @Query('mediaId') mediaId: string,
    @Query('mediaSearchType') mediaSearchType: 'VALID' | 'INVALID',
    @Query('invalidChangeFlag') invalidChangeFlag: string,
    @Body() body: any,
  ) {
    return this.service.upsert(
      {
        applyDate,
        applyStartDate,
        mediaId,
        mediaSearchType,
        invalidChangeFlag: Number(invalidChangeFlag || '0') as 0 | 1 | 2,
      },
      body,
    );
  }
}

