import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Org, OrgStatus as OrgStatusEnum } from '../entities/org.entity';

type OrgStatus = 'ACTIVE' | 'INACTIVE';

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
  constructor(
    @InjectRepository(Org)
    private readonly repo: Repository<Org>,
  ) { }

  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    const qb = this.repo.createQueryBuilder('o');
    if (query.search) {
      qb.andWhere('(o.orgCode ILIKE :s OR o.orgName ILIKE :s)', { s: `%${query.search}%` });
    }
    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.parentId) qb.andWhere('o.parentId = :parentId', { parentId: query.parentId });
    if (query.effectiveAt) {
      qb.andWhere('o.applyStartDate <= :d AND (o.applyEndDate IS NULL OR :d < o.applyEndDate)', { d: query.effectiveAt });
    }
    const sortMap: Record<string, string> = { orgCode: 'o.orgCode', orgName: 'o.orgName', updatedAt: 'o.updatedAt' };
    const sortFld = query.sortBy ? sortMap[query.sortBy] : 'o.updatedAt';
    const sortOrd = (query.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortFld, sortOrd).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, page, pageSize, total, hasMore: (page - 1) * pageSize + rows.length < total };
  }

  async add(body: any) {
    const orgCode = this.reqString(body.orgCode, 'orgCode');
    const orgName = this.reqString(body.orgName, 'orgName');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');
    const applyEndDate = body.applyEndDate ? this.reqDate(body.applyEndDate, 'applyEndDate') : null;
    if (applyEndDate && !(applyStartDate < applyEndDate)) {
      throw new BadRequestException('applyEndDate must be greater than applyStartDate');
    }
    const status: OrgStatusEnum = body.status === 'INACTIVE' ? OrgStatusEnum.INACTIVE : OrgStatusEnum.ACTIVE;
    const parentId = body.parentId ?? null; // UUID if provided
    const description = body.description;

    const dup = await this.repo.findOne({ where: { orgCode } });
    if (dup) throw new ConflictException('orgCode already exists');

    const entity = this.repo.create({
      orgCode,
      orgName,
      status,
      applyStartDate: applyStartDate as any,
      applyEndDate: (applyEndDate as any) ?? null,
      description,
      parent: parentId ? ({ id: parentId } as any) : null,
    });
    const saved = await this.repo.save(entity);
    return saved;
  }

  async edit(id: string, _applyStartDate: string, body: any) {
    this.reqString(id, 'id');
    // For DB-backed Org, we edit by primary id (UUID). applyStartDate path param is ignored.
    const rec = await this.repo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('Org not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== (rec as any).version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.orgName === 'string' && body.orgName.trim().length > 0) {
      rec.orgName = body.orgName.trim();
    }
    if (body.parentId !== undefined) {
      (rec as any).parent = body.parentId ? ({ id: body.parentId } as any) : null;
    }
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') {
      (rec as any).status = body.status;
    }
    if (body.description !== undefined) {
      rec.description = body.description ?? null;
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
    if (typeof d === 'string') return d;
    const z = new Date(d);
    const y = z.getUTCFullYear();
    const m = String(z.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(z.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
