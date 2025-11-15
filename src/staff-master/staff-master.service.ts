import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

type OrgStatus = 'ACTIVE' | 'INACTIVE';
type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
type WorkType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN';

export interface StaffMaster {
  id: string; // stable across versions
  staffCode: string; // unique and immutable per id
  fullName: string;
  orgId: string | null;
  managerId: string | null;
  position: string | null;
  grade?: string | null;
  email?: string | null;
  phone?: string | null;
  status: OrgStatus;
  employmentStatus: EmploymentStatus;
  workType: WorkType;
  hireDate?: string | null; // YYYY-MM-DD
  terminateDate?: string | null; // YYYY-MM-DD
  applyStartDate: string; // YYYY-MM-DD
  applyEndDate: string | null; // YYYY-MM-DD or null
  description?: string;
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
  private store: StaffMaster[] = [];
  private idCounter = 1;

  list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    let data = [...this.store];

    if (query.search) {
      const s = query.search.toLowerCase();
      data = data.filter(
        (x) =>
          x.staffCode.toLowerCase().includes(s) ||
          x.fullName.toLowerCase().includes(s) ||
          (x.email ?? '').toLowerCase().includes(s) ||
          (x.phone ?? '').toLowerCase().includes(s),
      );
    }
    if (query.orgId) data = data.filter((x) => x.orgId === query.orgId);
    if (query.managerId) data = data.filter((x) => x.managerId === query.managerId);
    if (query.position) data = data.filter((x) => (x.position ?? '') === query.position);
    if (query.status) data = data.filter((x) => x.status === query.status);
    if (query.employmentStatus) data = data.filter((x) => x.employmentStatus === query.employmentStatus);

    if (query.effectiveAt) {
      data = data.filter((x) => this.isEffectiveAt(x.applyStartDate, x.applyEndDate, query.effectiveAt!));
    }

    if (query.sortBy) {
      const dir = query.sortOrder === 'desc' ? -1 : 1;
      const key = query.sortBy;
      data.sort((a, b) => {
        const va = (a as any)[key] ?? '';
        const vb = (b as any)[key] ?? '';
        if (va === vb) return 0;
        return va > vb ? dir : -dir;
      });
    }

    const total = data.length;
    const start = (page - 1) * pageSize;
    const pageData = data.slice(start, start + pageSize);
    return { data: pageData, page, pageSize, total, hasMore: start + pageSize < total };
  }

  add(body: any) {
    const staffCode = this.reqString(body.staffCode, 'staffCode');
    const fullName = this.reqString(body.fullName, 'fullName');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');
    const status: OrgStatus = body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const employmentStatus: EmploymentStatus = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(body.employmentStatus)
      ? body.employmentStatus
      : 'ACTIVE';
    const workType: WorkType = ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'].includes(body.workType)
      ? body.workType
      : 'FULL_TIME';

    const orgId = body.orgId ?? null;
    const managerId = body.managerId ?? null;
    const position = body.position ?? null;
    const grade = body.grade ?? null;
    const email = body.email ? this.optEmail(body.email) : null;
    const phone = body.phone ? this.optPhone(body.phone) : null;
    const hireDate = body.hireDate ? this.reqDate(body.hireDate, 'hireDate') : null;
    const terminateDate = body.terminateDate ? this.reqDate(body.terminateDate, 'terminateDate') : null;
    const applyEndDate = body.applyEndDate ? this.reqDate(body.applyEndDate, 'applyEndDate') : null;
    const description = body.description;

    if (hireDate && terminateDate && !(hireDate < terminateDate)) {
      throw new BadRequestException('terminateDate must be greater than hireDate');
    }
    if (applyEndDate && !(applyStartDate < applyEndDate)) {
      throw new BadRequestException('applyEndDate must be greater than applyStartDate');
    }

    let id: string = body.id;
    if (id) {
      const existing = this.store.filter((x) => x.id === id);
      if (existing.length === 0) {
        throw new BadRequestException('Unknown staff id. Omit id to create new staff.');
      }
      const existingCode = existing[0].staffCode;
      if (existingCode !== staffCode) {
        throw new ConflictException('staffCode must remain the same for the same id');
      }
      // overlap within same id
      for (const v of existing) {
        if (this.rangesOverlap(v.applyStartDate, v.applyEndDate, applyStartDate, applyEndDate)) {
          throw new ConflictException('Date range overlap for this id');
        }
      }
      // auto-close previous open
      if (!applyEndDate) {
        const open = existing
          .filter((v) => v.applyEndDate === null && v.applyStartDate < applyStartDate)
          .sort((a, b) => (a.applyStartDate > b.applyStartDate ? -1 : 1))[0];
        if (open) {
          open.applyEndDate = applyStartDate;
          open.updatedAt = new Date().toISOString();
          open.version += 1;
        }
      }
    } else {
      // new staff: enforce staffCode uniqueness across all ids
      const conflict = this.store.find((x) => x.staffCode === staffCode);
      if (conflict) {
        throw new ConflictException('staffCode already exists');
      }
      id = this.genId();
    }

    const now = new Date().toISOString();
    const record: StaffMaster = {
      id,
      staffCode,
      fullName,
      orgId,
      managerId,
      position,
      grade,
      email,
      phone,
      status,
      employmentStatus,
      workType,
      hireDate,
      terminateDate,
      applyStartDate,
      applyEndDate,
      description,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    this.store.push(record);
    return record;
  }

  edit(id: string, applyStartDate: string, body: any) {
    this.reqString(id, 'id');
    this.reqDate(applyStartDate, 'applyStartDate');

    const rec = this.store.find((x) => x.id === id && x.applyStartDate === applyStartDate);
    if (!rec) throw new NotFoundException('Staff version not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== rec.version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.fullName === 'string' && body.fullName.trim().length > 0) rec.fullName = body.fullName.trim();
    if (body.orgId !== undefined) rec.orgId = body.orgId ?? null;
    if (body.managerId !== undefined) rec.managerId = body.managerId ?? null;
    if (body.position !== undefined) rec.position = body.position ?? null;
    if (body.grade !== undefined) rec.grade = body.grade ?? null;
    if (body.email !== undefined) rec.email = body.email ? this.optEmail(body.email) : null;
    if (body.phone !== undefined) rec.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') rec.status = body.status;
    if (['ACTIVE', 'ON_LEAVE', 'TERMINATED'].includes(body.employmentStatus)) rec.employmentStatus = body.employmentStatus;
    if (['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'].includes(body.workType)) rec.workType = body.workType;
    if (body.hireDate !== undefined) rec.hireDate = body.hireDate ? this.reqDate(body.hireDate, 'hireDate') : null;
    if (body.terminateDate !== undefined)
      rec.terminateDate = body.terminateDate ? this.reqDate(body.terminateDate, 'terminateDate') : null;
    if (rec.hireDate && rec.terminateDate && !(rec.hireDate < rec.terminateDate)) {
      throw new BadRequestException('terminateDate must be greater than hireDate');
    }

    if (body.applyEndDate !== undefined) {
      const newEnd = body.applyEndDate === null ? null : this.reqDate(body.applyEndDate, 'applyEndDate');
      if (newEnd && !(rec.applyStartDate < newEnd)) {
        throw new BadRequestException('applyEndDate must be greater than applyStartDate');
      }
      // overlap check with other versions of same id
      for (const v of this.store) {
        if (v === rec) continue;
        if (v.id !== id) continue;
        if (this.rangesOverlap(v.applyStartDate, v.applyEndDate, rec.applyStartDate, newEnd)) {
          throw new ConflictException('Date range overlap after applyEndDate change');
        }
      }
      rec.applyEndDate = newEnd;
    }

    rec.updatedAt = new Date().toISOString();
    rec.version += 1;
    return rec;
  }

  // Helpers
  private genId() {
    const id = `STF-${String(this.idCounter).padStart(3, '0')}`;
    this.idCounter += 1;
    return id;
  }

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
