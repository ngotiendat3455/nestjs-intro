import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID, scryptSync } from 'crypto';
import { Repository } from 'typeorm';
import { EmploymentStatus as EmploymentStatusEnum, Staff, StaffStatus as StaffStatusEnum, WorkType as WorkTypeEnum } from '../entities/staff.entity';

type OrgStatus = 'ACTIVE' | 'INACTIVE';
type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
type WorkType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN';

export interface StaffMaster {
  id: string; // stable across versions
  staffCode: string; // unique and immutable per id
  fullName: string; // computed if not provided from name parts
  orgId: string | null;
  managerId: string | null;
  position: string | null;
  grade?: string | null;
  email?: string | null;
  phone?: string | null;
  mobileMailAddress?: string | null;
  orgCode?: string | null;
  orgName?: string | null;
  companyCode?: string | null;
  // Name details (JP)
  staffName?: string | null;
  staffNameKana?: string | null;
  staffSei?: string | null;
  staffSeiKana?: string | null;
  staffMei?: string | null;
  staffMeiKana?: string | null;
  status: OrgStatus;
  employmentStatus: EmploymentStatus;
  workType: WorkType;
  hireDate?: string | null; // YYYY-MM-DD
  terminateDate?: string | null; // YYYY-MM-DD
  applyStartDate: string; // YYYY-MM-DD
  applyEndDate: string | null; // YYYY-MM-DD or null
  description?: string;
  // UI/aux fields
  beforeStaffCode?: string | null;
  beforeStaffId?: string | null;
  createDate?: string | null; // free format from UI
  createUser?: string | null;
  dispOrgApplyDate?: string | null;
  editStaffId?: string | null;
  employmentId?: string | null;
  enterdDate?: string | null; // as-is from UI
  executiveCode?: string | null;
  executiveId?: string | null;
  executiveName?: string | null;
  loginId?: string | null;
  username?: string | null;
  password?: string | null;
  stateType?: number | null;
  updateDate?: string | null;
  updateUser?: string | null;
  // Role linkage
  masterRoleId?: string | null;
  saleRoleId?: string | null;
  customerRoleId?: string | null;
  reservationRoleId?: string | null;
  commonRoleId?: string | null;
  registerRoleId?: string | null;
  contractRoleId?: string | null;
  revenueRoleId?: string | null;
  inventoryRoleId?: string | null;
  mailMagazineRoleId?: string | null;
  administratorFlag?: boolean;
  // Collections
  organizationDataList?: any[];
  employmentDataList?: any[];
  combineStoreSetting?: any[];
  combinedStore?: any[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
  version: number;
}

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  orgId?: string;
  managerId?: string;
  position?: string;
  status?: OrgStatus;
  employmentStatus?: EmploymentStatus;
  effectiveAt?: string; // YYYY-MM-DD
  sortBy?: 'staffCode' | 'fullName' | 'updatedAt' | 'hireDate';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class StaffMasterService {
  constructor(
    @InjectRepository(Staff)
    private readonly repo: Repository<Staff>,
  ) { }

  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;
    const qb = this.repo.createQueryBuilder('s');
    if (query.search) {
      qb.andWhere(
        "(s.staffCode ILIKE :s OR s.fullName ILIKE :s OR COALESCE(s.email,'') ILIKE :s OR COALESCE(s.phone,'') ILIKE :s)",
        { s: `%${query.search}%` },
      );
    }
    if (query.orgId) qb.andWhere('s.orgId = :orgId', { orgId: query.orgId });
    if (query.managerId) qb.andWhere('s.managerId = :managerId', { managerId: query.managerId });
    if (query.position) qb.andWhere('s.position = :position', { position: query.position });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.employmentStatus) qb.andWhere('s.employmentStatus = :employmentStatus', { employmentStatus: query.employmentStatus });
    if (query.effectiveAt) {
      qb.andWhere('s.applyStartDate <= :d AND (s.applyEndDate IS NULL OR :d < s.applyEndDate)', { d: query.effectiveAt });
    }
    const sortByMap: Record<string, string> = {
      staffCode: 's.staffCode',
      fullName: 's.fullName',
      updatedAt: 's.updatedAt',
      hireDate: 's.hireDate',
    };
    const sortFld = query.sortBy ? sortByMap[query.sortBy] : 's.updatedAt';
    const sortOrd = (query.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortFld, sortOrd).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, page, pageSize, total, hasMore: (page - 1) * pageSize + rows.length < total };
  }

  async add(body: any) {
    const staffCode = this.reqString(body.staffCode, 'staffCode');
    // Compute fullName if not provided
    const fullName = ((): string => {
      if (typeof body.fullName === 'string' && body.fullName.trim()) return body.fullName.trim();
      const name = typeof body.staffName === 'string' ? body.staffName.trim() : '';
      const sei = typeof body.staffSei === 'string' ? body.staffSei.trim() : '';
      const mei = typeof body.staffMei === 'string' ? body.staffMei.trim() : '';
      const computed = name || [sei, mei].filter(Boolean).join(' ');
      return this.reqString(computed || staffCode, 'fullName');
    })();
    const rawStart = body.applyStartDate ?? body.orgApplyDate;
    const applyStartDate = this.reqDateFlexible(rawStart, 'applyStartDate');
    const status: StaffStatusEnum = body.status === 'INACTIVE' ? StaffStatusEnum.INACTIVE : StaffStatusEnum.ACTIVE;
    const employmentStatus: EmploymentStatusEnum = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(body.employmentStatus)
      ? (body.employmentStatus as EmploymentStatusEnum)
      : EmploymentStatusEnum.ACTIVE;
    const workType: WorkTypeEnum = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'].includes(body.workType)
      ? (body.workType as WorkTypeEnum)
      : WorkTypeEnum.FULL_TIME;

    const orgId = body.orgId ?? null;
    const managerId = body.managerId ?? null;
    const position = body.position ?? null;
    const grade = body.grade ?? null;
    const emailRaw = body.email ?? body.emailAddress;
    const email = emailRaw ? this.optEmail(emailRaw) : null;
    const mobileMailAddress = body.mobileMailAddress ?? null;
    const orgCode = body.orgCode ?? null;
    const orgName = body.orgName ?? null;
    const companyCode = body.companyCode ?? null;
    const phone = body.phone ? this.optPhone(body.phone) : null;
    const hireDate = body.hireDate ? this.reqDateFlexible(body.hireDate, 'hireDate') : null;
    const terminateDate = body.terminateDate ? this.reqDateFlexible(body.terminateDate, 'terminateDate') : null;
    const applyEndDate = body.applyEndDate ? this.reqDateFlexible(body.applyEndDate, 'applyEndDate') : null;
    const description = body.description;
    const beforeStaffCode = body.beforeStaffCode ?? null;
    const beforeStaffId = body.beforeStaffId ?? null;
    const createDate = body.createDate ?? null;
    const createUser = body.createUser ?? null;
    const dispOrgApplyDate = body.dispOrgApplyDate ?? null;
    const editStaffId = body.editStaffId ?? null;
    const employmentId = body.employmentId ?? null;
    const enterdDate = body.enterdDate ?? null;
    const executiveCode = body.executiveCode ?? null;
    const executiveId = body.executiveId ?? null;
    const executiveName = body.executiveName ?? null;
    const loginId = body.loginId ?? null;
    const username = body.username ?? null;
    const stateType = typeof body.stateType === 'number' ? body.stateType : null;
    const updateDate = body.updateDate ?? null;
    const updateUser = body.updateUser ?? null;
    // role ids handled directly in entity creation below
    const administratorFlag = Boolean(body.administratorFlag);
    const organizationDataList = Array.isArray(body.organizationDataList) ? body.organizationDataList : undefined;
    const employmentDataList = Array.isArray(body.employmentDataList) ? body.employmentDataList : undefined;
    const combineStoreSetting = Array.isArray(body.combineStoreSetting) ? body.combineStoreSetting : undefined;
    const combinedStore = Array.isArray(body.combinedStore) ? body.combinedStore : undefined;

    const authorityLevel = typeof body.authorityLevel === 'number' ? body.authorityLevel : 5;
    const isActive = body.isActive === false ? false : true;
    let passwordHash: string | null = null;
    if (body.password) {
      passwordHash = this.hashPassword(String(body.password));
    }

    if (hireDate && terminateDate && !(hireDate < terminateDate)) {
      throw new BadRequestException('terminateDate must be greater than hireDate');
    }
    if (applyEndDate && !(applyStartDate < applyEndDate)) {
      throw new BadRequestException('applyEndDate must be greater than applyStartDate');
    }

    // Determine stable staffId group
    let staffId: string = body.id ?? body.staffId;
    if (staffId) {
      const existing = await this.repo.find({ where: { staffId } });
      if (existing.length === 0) {
        throw new BadRequestException('Unknown staff id. Omit id to create new staff.');
      }
      const existingCode = existing[0].staffCode;
      if (existingCode !== staffCode) {
        throw new ConflictException('staffCode must remain the same for the same id');
      }
      for (const v of existing) {
        const aStart = this.dateToYMD(v.applyStartDate);
        const aEnd = v.applyEndDate ? this.dateToYMD(v.applyEndDate) : null;
        if (this.rangesOverlap(aStart, aEnd, applyStartDate, applyEndDate)) {
          throw new ConflictException('Date range overlap for this id');
        }
      }
      if (!applyEndDate) {
        // auto-close previous open
        const open = existing
          .filter((v) => !v.applyEndDate && this.dateToYMD(v.applyStartDate) < applyStartDate)
          .sort((a, b) => (this.dateToYMD(a.applyStartDate) > this.dateToYMD(b.applyStartDate) ? -1 : 1))[0];
        if (open) {
          open.applyEndDate = applyStartDate as any;
          await this.repo.save(open);
        }
      }
    } else {
      // new staff: enforce staffCode uniqueness across all staff
      const conflict = await this.repo.findOne({ where: { staffCode } });
      if (conflict) throw new ConflictException('staffCode already exists');
      staffId = randomUUID();
    }

    if (loginId) {
      const idDup = await this.repo.findOne({ where: { loginId } });
      if (idDup) throw new ConflictException('loginId already exists');
    }

    const entity = this.repo.create({
      staffId,
      staffCode,
      fullName,
      org: orgId ? ({ id: orgId } as any) : null,
      manager: managerId ? ({ id: managerId } as any) : null,
      position,
      grade,
      email,
      mobileMailAddress,
      orgCode,
      orgName,
      companyCode,
      staffName: typeof body.staffName === 'string' ? body.staffName : null,
      staffNameKana: typeof body.staffNameKana === 'string' ? body.staffNameKana : null,
      staffSei: typeof body.staffSei === 'string' ? body.staffSei : null,
      staffSeiKana: typeof body.staffSeiKana === 'string' ? body.staffSeiKana : null,
      staffMei: typeof body.staffMei === 'string' ? body.staffMei : null,
      staffMeiKana: typeof body.staffMeiKana === 'string' ? body.staffMeiKana : null,
      phone,
      status,
      employmentStatus,
      workType,
      hireDate: hireDate as any,
      terminateDate: terminateDate as any,
      applyStartDate: applyStartDate as any,
      applyEndDate: (applyEndDate as any) ?? null,
      description,
      loginId,
      passwordHash,
      passwordUpdatedAt: passwordHash ? (new Date() as any) : null,
      isActive,
      authorityLevel,
      beforeStaffCode,
      beforeStaffId,
      createDate,
      createUser,
      dispOrgApplyDate,
      editStaffId,
      employmentId,
      enterdDate,
      executiveCode,
      executiveId,
      executiveName,
      username,
      stateType,
      updateDate,
      updateUser,
      // Role linkage placeholders (persist as-is)
      // You may want to normalize these to separate tables later
      organizationDataList,
      employmentDataList,
      combineStoreSetting,
      combinedStore,
      administratorFlag,
      // role links
      masterRole: body.masterRoleId ? ({ id: body.masterRoleId } as any) : null,
      saleRole: body.saleRoleId ? ({ id: body.saleRoleId } as any) : null,
      customerRole: body.customerRoleId ? ({ id: body.customerRoleId } as any) : null,
      reservationRole: body.reservationRoleId ? ({ id: body.reservationRoleId } as any) : null,
      commonRole: body.commonRoleId ? ({ id: body.commonRoleId } as any) : null,
      registerRole: body.registerRoleId ? ({ id: body.registerRoleId } as any) : null,
      contractRole: body.contractRoleId ? ({ id: body.contractRoleId } as any) : null,
      revenueRole: body.revenueRoleId ? ({ id: body.revenueRoleId } as any) : null,
      inventoryRole: body.inventoryRoleId ? ({ id: body.inventoryRoleId } as any) : null,
      magazineRole: body.mailMagazineRoleId ? ({ id: body.mailMagazineRoleId } as any) : null,
    });
    const saved = await this.repo.save(entity);
    return saved;
  }

  async edit(id: string, applyStartDate: string, body: any) {
    this.reqString(id, 'id');
    const normStart = this.reqDateFlexible(applyStartDate, 'applyStartDate');

    const rec = await this.repo.findOne({ where: { staffId: id, applyStartDate: normStart as any } });
    if (!rec) throw new NotFoundException('Staff version not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== rec.version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.fullName === 'string' && body.fullName.trim().length > 0) rec.fullName = body.fullName.trim();
    if (body.loginId !== undefined) {
      if (body.loginId) {
        const idDup = await this.repo.findOne({ where: { loginId: body.loginId } });
        if (idDup && idDup.id !== rec.id) throw new ConflictException('loginId already exists');
        rec.loginId = body.loginId;
      } else {
        rec.loginId = null;
      }
    }
    if (body.password !== undefined) {
      if (body.password) {
        rec.passwordHash = this.hashPassword(String(body.password));
        (rec as any).passwordUpdatedAt = new Date() as any;
      } else {
        rec.passwordHash = null;
        (rec as any).passwordUpdatedAt = null;
      }
    }
    if (body.authorityLevel !== undefined) rec.authorityLevel = Number(body.authorityLevel);
    if (body.isActive !== undefined) rec.isActive = Boolean(body.isActive);
    if (body.staffName !== undefined) rec.staffName = body.staffName ?? null;
    if (body.staffNameKana !== undefined) rec.staffNameKana = body.staffNameKana ?? null;
    if (body.staffSei !== undefined) rec.staffSei = body.staffSei ?? null;
    if (body.staffSeiKana !== undefined) rec.staffSeiKana = body.staffSeiKana ?? null;
    if (body.staffMei !== undefined) rec.staffMei = body.staffMei ?? null;
    if (body.staffMeiKana !== undefined) rec.staffMeiKana = body.staffMeiKana ?? null;
    if (body.orgId !== undefined) rec.org = body.orgId ? ({ id: body.orgId } as any) : null;
    if (body.orgCode !== undefined) rec.orgCode = body.orgCode ?? null;
    if (body.orgName !== undefined) rec.orgName = body.orgName ?? null;
    if (body.companyCode !== undefined) rec.companyCode = body.companyCode ?? null;
    if (body.managerId !== undefined) rec.manager = body.managerId ? ({ id: body.managerId } as any) : null;
    if (body.position !== undefined) rec.position = body.position ?? null;
    if (body.grade !== undefined) rec.grade = body.grade ?? null;
    if (body.email !== undefined || body.emailAddress !== undefined) {
      const raw = body.email ?? body.emailAddress;
      rec.email = raw ? this.optEmail(raw) : null;
    }
    if (body.mobileMailAddress !== undefined) rec.mobileMailAddress = body.mobileMailAddress ?? null;
    if (body.phone !== undefined) rec.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') rec.status = body.status as StaffStatusEnum;
    if (['ACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(body.employmentStatus)) rec.employmentStatus = body.employmentStatus as EmploymentStatusEnum;
    if (['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'].includes(body.workType)) rec.workType = body.workType as WorkTypeEnum;
    if (body.hireDate !== undefined) rec.hireDate = body.hireDate ? (this.reqDateFlexible(body.hireDate, 'hireDate') as any) : null;
    if (body.terminateDate !== undefined)
      rec.terminateDate = body.terminateDate ? (this.reqDateFlexible(body.terminateDate, 'terminateDate') as any) : null;
    if (rec.hireDate && rec.terminateDate && !(rec.hireDate < rec.terminateDate)) {
      throw new BadRequestException('terminateDate must be greater than hireDate');
    }

    if (body.applyEndDate !== undefined) {
      const newEnd = body.applyEndDate === null ? null : this.reqDateFlexible(body.applyEndDate, 'applyEndDate');
      if (newEnd && !(this.dateToYMD(rec.applyStartDate) < newEnd)) {
        throw new BadRequestException('applyEndDate must be greater than applyStartDate');
      }
      // overlap check with other versions of same id
      const others = await this.repo.find({ where: { staffId: id } });
      for (const v of others) {
        if (v.id === rec.id) continue;
        const aStart = this.dateToYMD(v.applyStartDate);
        const aEnd = v.applyEndDate ? this.dateToYMD(v.applyEndDate) : null;
        if (this.rangesOverlap(aStart, aEnd, this.dateToYMD(rec.applyStartDate), newEnd)) {
          throw new ConflictException('Date range overlap after applyEndDate change');
        }
      }
      (rec as any).applyEndDate = (newEnd as any) ?? null;
    }
    if (body.beforeStaffCode !== undefined) rec.beforeStaffCode = body.beforeStaffCode ?? null;
    if (body.beforeStaffId !== undefined) rec.beforeStaffId = body.beforeStaffId ?? null;
    if (body.createDate !== undefined) rec.createDate = body.createDate ?? null;
    if (body.createUser !== undefined) rec.createUser = body.createUser ?? null;
    if (body.dispOrgApplyDate !== undefined) rec.dispOrgApplyDate = body.dispOrgApplyDate ?? null;
    if (body.editStaffId !== undefined) rec.editStaffId = body.editStaffId ?? null;
    if (body.employmentId !== undefined) rec.employmentId = body.employmentId ?? null;
    if (body.enterdDate !== undefined) rec.enterdDate = body.enterdDate ?? null;
    if (body.executiveCode !== undefined) rec.executiveCode = body.executiveCode ?? null;
    if (body.executiveId !== undefined) rec.executiveId = body.executiveId ?? null;
    if (body.executiveName !== undefined) rec.executiveName = body.executiveName ?? null;
    if (body.username !== undefined) rec.username = body.username ?? null;
    if (body.stateType !== undefined)
      rec.stateType = typeof body.stateType === 'number' ? body.stateType : Number(body.stateType) || 0;
    if (body.updateDate !== undefined) rec.updateDate = body.updateDate ?? null;
    if (body.updateUser !== undefined) rec.updateUser = body.updateUser ?? null;
    // Role FK ids are handled by relation setters below
    // mailMagazineRole handled via magazineRole relation below
    // Role relations
    if (body.masterRoleId !== undefined) (rec as any).masterRole = body.masterRoleId ? ({ id: body.masterRoleId } as any) : null;
    if (body.saleRoleId !== undefined) (rec as any).saleRole = body.saleRoleId ? ({ id: body.saleRoleId } as any) : null;
    if (body.customerRoleId !== undefined)
      (rec as any).customerRole = body.customerRoleId ? ({ id: body.customerRoleId } as any) : null;
    if (body.reservationRoleId !== undefined)
      (rec as any).reservationRole = body.reservationRoleId ? ({ id: body.reservationRoleId } as any) : null;
    if (body.commonRoleId !== undefined) (rec as any).commonRole = body.commonRoleId ? ({ id: body.commonRoleId } as any) : null;
    if (body.registerRoleId !== undefined)
      (rec as any).registerRole = body.registerRoleId ? ({ id: body.registerRoleId } as any) : null;
    if (body.contractRoleId !== undefined)
      (rec as any).contractRole = body.contractRoleId ? ({ id: body.contractRoleId } as any) : null;
    if (body.revenueRoleId !== undefined)
      (rec as any).revenueRole = body.revenueRoleId ? ({ id: body.revenueRoleId } as any) : null;
    if (body.inventoryRoleId !== undefined)
      (rec as any).inventoryRole = body.inventoryRoleId ? ({ id: body.inventoryRoleId } as any) : null;
    if (body.mailMagazineRoleId !== undefined)
      (rec as any).magazineRole = body.mailMagazineRoleId ? ({ id: body.mailMagazineRoleId } as any) : null;
    if (body.administratorFlag !== undefined) rec.administratorFlag = Boolean(body.administratorFlag);
    if (body.organizationDataList !== undefined)
      rec.organizationDataList = Array.isArray(body.organizationDataList) ? body.organizationDataList : [];
    if (body.employmentDataList !== undefined)
      rec.employmentDataList = Array.isArray(body.employmentDataList) ? body.employmentDataList : [];
    if (body.combineStoreSetting !== undefined)
      rec.combineStoreSetting = Array.isArray(body.combineStoreSetting) ? body.combineStoreSetting : [];
    if (body.combinedStore !== undefined)
      rec.combinedStore = Array.isArray(body.combinedStore) ? body.combinedStore : [];

    const saved = await this.repo.save(rec);
    return saved;
  }

  // Helpers
  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) throw new BadRequestException(`field ${field} is required string`);
    return v.trim();
  }

  private reqDate(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    }
    return v;
  }

  private reqDateFlexible(v: any, field: string) {
    if (typeof v !== 'string') throw new BadRequestException(`field ${field} must be date string`);
    const s = v.trim();
    const normalized = s.includes('/') ? s.replace(/\//g, '-') : s;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw new BadRequestException(`field ${field} must be YYYY-MM-DD or YYYY/MM/DD`);
    }
    return normalized;
  }

  private dateToYMD(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') {
      return d.includes('/') ? d.replace(/\//g, '-') : d;
    }
    const dt = new Date(d);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private hashPassword(plain: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plain, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  private optEmail(v: any) {
    if (typeof v !== 'string') throw new BadRequestException('email must be string');
    const s = v.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(s)) throw new BadRequestException('email is invalid');
    return s;
  }

  private optPhone(v: any) {
    if (typeof v !== 'string') throw new BadRequestException('phone must be string');
    const s = v.trim();
    const re = /^\+?[0-9]{7,15}$/; // simple E.164-like
    if (!re.test(s)) throw new BadRequestException('phone is invalid');
    return s;
  }

  private isEffectiveAt(start: string, end: string | null, d: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const startOk = start <= d;
    const endOk = end ? d < end : true;
    return startOk && endOk;
  }

  private rangesOverlap(aStart: string, aEnd: string | null, bStart: string, bEnd: string | null) {
    const aE = aEnd ?? '9999-12-31';
    const bE = bEnd ?? '9999-12-31';
    return aStart < bE && bStart < aE; // [aStart, aEnd) overlaps [bStart, bEnd)
  }
}
