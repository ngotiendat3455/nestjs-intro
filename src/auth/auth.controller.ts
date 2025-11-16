import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
  ) {}

  // POST /users/login/:companyCode
  @Post('users/login/:companyCode')
  async login(
    @Param('companyCode') companyCode: string,
    @Body('loginCode') loginCode: string,
    @Body('password') password: string,
  ) {
    const res = await this.authService.login(companyCode, loginCode, password);
    // Include legacy token for compatibility if needed (same as accessToken)
    return { ...res, token: res.accessToken };
  }

  // GET /v1/staffs/:companyCode?staffId=...
  @Get('v1/staffs/:companyCode')
  async getStaffDetail(
    @Param('companyCode') companyCode: string,
    @Query('staffId') staffId: string,
    @Headers('authorization') authHeader?: string,
  ) {
    // Optional: verify token if provided
    try {
      const token = (authHeader || '').startsWith('Bearer ')
        ? (authHeader || '').slice('Bearer '.length)
        : undefined;
      if (token) this.authService.verifyToken(token);
    } catch {}

    const today = new Date();
    const y = today.getUTCFullYear();
    const m = String(today.getUTCMonth() + 1).padStart(2, '0');
    const d = String(today.getUTCDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const staff = await this.staffRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.org', 'o')
      .leftJoinAndSelect('s.masterRole', 'masterRole')
      .leftJoinAndSelect('s.customerRole', 'customerRole')
      .leftJoinAndSelect('s.reservationRole', 'reservationRole')
      .leftJoinAndSelect('s.commonRole', 'commonRole')
      .leftJoinAndSelect('s.registerRole', 'registerRole')
      .leftJoinAndSelect('s.contractRole', 'contractRole')
      .leftJoinAndSelect('s.revenueRole', 'revenueRole')
      .leftJoinAndSelect('s.inventoryRole', 'inventoryRole')
      .leftJoinAndSelect('s.magazineRole', 'magazineRole')
      .where('s.companyCode = :companyCode AND s.staffId = :staffId', { companyCode, staffId })
      .andWhere('s.applyStartDate <= :today AND (s.applyEndDate IS NULL OR :today < s.applyEndDate)', { today: todayStr })
      .orderBy('s.applyStartDate', 'DESC')
      .limit(1)
      .getOne();

    if (!staff) return {};

    const detail: any = {
      staffName: staff.fullName,
      staffId: staff.staffId,
      staffSei: staff.staffSei,
      staffMei: staff.staffMei,
      orgId: (staff as any).org?.id || null,
      orgName: staff.orgName || ((staff as any).org?.orgName ?? null),
      roles: [], // populate from role details if needed
      staffOrganizationData: (staff as any).staffOrganizationData ?? [],
      authorityLevel: staff.authorityLevel,
      administratorFlag: staff.administratorFlag,
      featureSettings: [],
      roleAuthorityLevelResponses: [],
      masterRoleLevel: (staff as any).masterRole?.authorityLevel ?? staff.authorityLevel,
      customerRoleLevel: (staff as any).customerRole?.authorityLevel ?? staff.authorityLevel,
      reservationRoleLevel: (staff as any).reservationRole?.authorityLevel ?? staff.authorityLevel,
      commonRoleLevel: (staff as any).commonRole?.authorityLevel ?? staff.authorityLevel,
      combinedStoreDataList: (staff as any).combinedStoreDataList ?? [],
      registerRoleLevel: (staff as any).registerRole?.authorityLevel ?? null,
      contractRoleLevel: (staff as any).contractRole?.authorityLevel ?? null,
      revenueRoleLevel: (staff as any).revenueRole?.authorityLevel ?? null,
      magazineRoleLevel: (staff as any).magazineRole?.authorityLevel ?? null,
      inventoryRoleLevel: (staff as any).inventoryRole?.authorityLevel ?? null,
    };

    return detail;
  }
}

