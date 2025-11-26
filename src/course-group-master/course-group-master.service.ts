import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseGroup, CourseGroupStatus } from '../entities';

type Status = 'ACTIVE' | 'INACTIVE';

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: Status;
  parentId?: string;
  orgId?: string;
  effectiveAt?: string; // YYYY-MM-DD
  sortBy?: 'groupCode' | 'groupName' | 'updatedAt' | 'sortOrder';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class CourseGroupMasterService {
  constructor(
    @InjectRepository(CourseGroup)
    private readonly repo: Repository<CourseGroup>,
  ) {}

  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const qb = this.repo.createQueryBuilder('g');
    if (query.search) {
      qb.andWhere('(g.groupCode ILIKE :s OR g.groupName ILIKE :s)', { s: `%${query.search}%` });
    }
    if (query.status) qb.andWhere('g.status = :status', { status: query.status });
    if (query.parentId) qb.andWhere('g.parentId = :parentId', { parentId: query.parentId });
    if (query.orgId) qb.andWhere('g.orgId = :orgId', { orgId: query.orgId });
    if (query.effectiveAt) {
      qb.andWhere('g.applyStartDate <= :d AND (g.applyEndDate IS NULL OR :d < g.applyEndDate)', {
        d: query.effectiveAt,
      });
    }

    const sortMap: Record<string, string> = {
      groupCode: 'g.groupCode',
      groupName: 'g.groupName',
      updatedAt: 'g.updatedAt',
      sortOrder: 'g.sortOrder',
    };
    const sortFld = query.sortBy ? sortMap[query.sortBy] : 'g.sortOrder';
    const sortOrd = (query.sortOrder || 'asc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortFld, sortOrd).skip((page - 1) * pageSize).take(pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, page, pageSize, total, hasMore: (page - 1) * pageSize + rows.length < total };
  }

  async getOne(id: string) {
    this.reqString(id, 'id');
    const rec = await this.repo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('CourseGroup not found');
    return rec;
  }

  async add(body: any) {
    const groupCode = this.reqString(body.groupCode, 'groupCode');
    const groupName = this.reqString(body.groupName, 'groupName');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');
    const applyEndDate = body.applyEndDate ? this.reqDate(body.applyEndDate, 'applyEndDate') : null;
    if (applyEndDate && !(applyStartDate < applyEndDate)) {
      throw new BadRequestException('applyEndDate must be greater than applyStartDate');
    }
    const status: CourseGroupStatus =
      body.status === 'INACTIVE' ? CourseGroupStatus.INACTIVE : CourseGroupStatus.ACTIVE;
    const parentId = body.parentId ?? null;
    const orgId = body.orgId ?? null;
    const sortOrder = body.sortOrder !== undefined ? this.reqInt(body.sortOrder, 'sortOrder') : 0;
    const description = body.description ?? null;

    const dup = await this.repo.findOne({ where: { groupCode } });
    if (dup) throw new ConflictException('groupCode already exists');

    const entity = this.repo.create({
      groupCode,
      groupName,
      status,
      applyStartDate: applyStartDate as any,
      applyEndDate: (applyEndDate as any) ?? null,
      description,
      sortOrder,
      parent: parentId ? ({ id: parentId } as any) : null,
      org: orgId ? ({ id: orgId } as any) : null,
    });
    const saved = await this.repo.save(entity);
    return saved;
  }

  async edit(id: string, body: any) {
    this.reqString(id, 'id');
    const rec = await this.repo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('CourseGroup not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== (rec as any).version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.groupName === 'string' && body.groupName.trim().length > 0) {
      rec.groupName = body.groupName.trim();
    }
    if (body.groupCode !== undefined) {
      const groupCode = this.reqString(body.groupCode, 'groupCode');
      const dup = await this.repo.findOne({ where: { groupCode } });
      if (dup && dup.id !== rec.id) throw new ConflictException('groupCode already exists');
      rec.groupCode = groupCode;
    }
    if (body.parentId !== undefined) {
      (rec as any).parent = body.parentId ? ({ id: body.parentId } as any) : null;
    }
    if (body.orgId !== undefined) {
      (rec as any).org = body.orgId ? ({ id: body.orgId } as any) : null;
    }
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') {
      rec.status = body.status === 'ACTIVE' ? CourseGroupStatus.ACTIVE : CourseGroupStatus.INACTIVE;
    }
    if (body.description !== undefined) {
      rec.description = body.description ?? null;
    }
    if (body.sortOrder !== undefined) {
      rec.sortOrder = this.reqInt(body.sortOrder, 'sortOrder');
    }
    if (body.applyEndDate !== undefined) {
      const newEnd = body.applyEndDate === null ? null : this.reqDate(body.applyEndDate, 'applyEndDate');
      const start = this.dateToYMD(rec.applyStartDate);
      if (newEnd && !(start < newEnd)) {
        throw new BadRequestException('applyEndDate must be greater than applyStartDate');
      }
      (rec as any).applyEndDate = newEnd as any;
    }

    const saved = await this.repo.save(rec);
    return saved;
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

  private dateToYMD(d: string | Date | null | undefined): string {
    if (!d) return '';
    if (typeof d === 'string') return d.includes('/') ? d.replace(/\//g, '-') : d;
    const z = new Date(d);
    const y = z.getUTCFullYear();
    const m = String(z.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(z.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private reqInt(v: any, field: string) {
    const n = Number(v);
    if (!Number.isInteger(n)) {
      throw new BadRequestException(`field ${field} must be integer`);
    }
    return n;
  }
}

