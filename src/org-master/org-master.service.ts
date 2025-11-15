import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

type OrgStatus = 'ACTIVE' | 'INACTIVE';

export interface OrgMaster {
  id: string;
  orgCode: string;
  orgName: string;
  parentId: string | null;
  status: OrgStatus;
  applyStartDate: string; // YYYY-MM-DD
  applyEndDate: string | null; // YYYY-MM-DD or null
  description?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  createdBy?: string;
  updatedBy?: string;
  version: number;
}

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrgStatus;
  parentId?: string;
  includeInactive?: boolean;
  effectiveAt?: string; // YYYY-MM-DD
  sortBy?: 'orgCode' | 'orgName' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class OrgMasterService {
  private store: OrgMaster[] = [];
  private idCounter = 1;

  list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    let data = [...this.store];

    if (query.search) {
      const s = query.search.toLowerCase();
      data = data.filter(
        (x) => x.orgCode.toLowerCase().includes(s) || x.orgName.toLowerCase().includes(s),
      );
    }

    if (query.status) {
      data = data.filter((x) => x.status === query.status);
    }

    if (query.parentId) {
      data = data.filter((x) => x.parentId === query.parentId);
    }

    if (!query.includeInactive) {
      // keep as-is; status filter above applies when provided
    }

    if (query.effectiveAt) {
      data = data.filter((x) => this.isEffectiveAt(x, query.effectiveAt!));
    }

    if (query.sortBy) {
      const dir = query.sortOrder === 'desc' ? -1 : 1;
      const key = query.sortBy;
      data.sort((a, b) => {
        const va = (a as any)[key];
        const vb = (b as any)[key];
        if (va === vb) return 0;
        return va > vb ? dir : -dir;
      });
    }

    const total = data.length;
    const start = (page - 1) * pageSize;
    const pageData = data.slice(start, start + pageSize);

    return {
      data: pageData,
      page,
      pageSize,
      total,
      hasMore: start + pageSize < total,
    };
  }

  add(body: any) {
    // Minimal validations
    const orgCode = this.reqString(body.orgCode, 'orgCode');
    const orgName = this.reqString(body.orgName, 'orgName');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');
    const status: OrgStatus = body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const parentId = body.parentId ?? null;
    const applyEndDate = body.applyEndDate ? this.reqDate(body.applyEndDate, 'applyEndDate') : null;
    const description = body.description;

    let id: string = body.id;
    if (!id) {
      id = this.genId();
    }

    // Overlap check within same id
    const versions = this.store.filter((x) => x.id === id);
    for (const v of versions) {
      if (this.rangesOverlap(v.applyStartDate, v.applyEndDate, applyStartDate, applyEndDate)) {
        throw new ConflictException('Date range overlap for this id');
      }
    }

    // Auto-close the latest open-ended version if same id and earlier start
    if (!applyEndDate) {
      const open = versions
        .filter((v) => v.applyEndDate === null && v.applyStartDate < applyStartDate)
        .sort((a, b) => (a.applyStartDate > b.applyStartDate ? -1 : 1))[0];
      if (open) {
        open.applyEndDate = applyStartDate; // close at new start
        open.updatedAt = new Date().toISOString();
        open.version += 1;
      }
    }

    const now = new Date().toISOString();
    const record: OrgMaster = {
      id,
      orgCode,
      orgName,
      parentId,
      status,
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
    if (!rec) {
      throw new NotFoundException('Org version not found');
    }

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== rec.version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.orgName === 'string' && body.orgName.trim().length > 0) {
      rec.orgName = body.orgName.trim();
    }
    if (body.parentId !== undefined) {
      rec.parentId = body.parentId ?? null;
    }
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') {
      rec.status = body.status;
    }
    if (body.description !== undefined) {
      rec.description = body.description;
    }
    if (body.applyEndDate !== undefined) {
      const newEnd = body.applyEndDate === null ? null : this.reqDate(body.applyEndDate, 'applyEndDate');
      // check that new range does not overlap others of same id (excluding this record)
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
    const id = `ORG-${String(this.idCounter).padStart(3, '0')}`;
    this.idCounter += 1;
    return id;
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new BadRequestException(`field ${field} is required string`);
    }
    return v.trim();
  }

  private reqDate(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    }
    return v;
  }

  private isEffectiveAt(rec: OrgMaster, d: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const startOk = rec.applyStartDate <= d;
    const endOk = rec.applyEndDate ? d < rec.applyEndDate : true;
    return startOk && endOk;
  }

  private rangesOverlap(aStart: string, aEnd: string | null, bStart: string, bEnd: string | null) {
    const aE = aEnd ?? '9999-12-31';
    const bE = bEnd ?? '9999-12-31';
    return aStart < bE && bStart < aE; // [aStart, aEnd) overlaps [bStart, bEnd)
  }
}
