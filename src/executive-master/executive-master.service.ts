import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Executive, ExecutiveStatus } from '../entities/executive.entity';

type Status = 'ACTIVE' | 'INACTIVE';

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: Status;
  orgId?: string;
  effectiveAt?: string; // YYYY-MM-DD
  sortBy?: 'executiveCode' | 'executiveName' | 'updatedAt' | 'position';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ExecutiveMasterService {
  constructor(
    @InjectRepository(Executive)
    private readonly repo: Repository<Executive>,
  ) {}

  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;
    const qb = this.repo.createQueryBuilder('e');
    if (query.search) {
      qb.andWhere(
        "(e.executiveCode ILIKE :s OR e.executiveName ILIKE :s OR COALESCE(e.email,'') ILIKE :s OR COALESCE(e.phone,'') ILIKE :s)",
        { s: `%${query.search}%` },
      );
    }
    if (query.status) qb.andWhere('e.status = :status', { status: query.status });
    if (query.orgId) qb.andWhere('e.orgId = :orgId', { orgId: query.orgId });
    if (query.effectiveAt) {
      qb.andWhere('e.applyStartDate <= :d AND (e.applyEndDate IS NULL OR :d < e.applyEndDate)', { d: query.effectiveAt });
    }
    const sortMap: Record<string, string> = {
      executiveCode: 'e.executiveCode',
      executiveName: 'e.executiveName',
      updatedAt: 'e.updatedAt',
      position: 'e.position',
    };
    const sortFld = query.sortBy ? sortMap[query.sortBy] : 'e.updatedAt';
    const sortOrd = (query.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortFld, sortOrd).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, page, pageSize, total, hasMore: (page - 1) * pageSize + rows.length < total };
  }

  async add(body: any) {
    const executiveCode = this.reqString(body.executiveCode, 'executiveCode');
    const executiveName = this.reqString(body.executiveName, 'executiveName');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');
    const applyEndDate = body.applyEndDate ? this.reqDate(body.applyEndDate, 'applyEndDate') : null;
    if (applyEndDate && !(applyStartDate < applyEndDate)) {
      throw new BadRequestException('applyEndDate must be greater than applyStartDate');
    }
    const status: ExecutiveStatus = body.status === 'INACTIVE' ? ExecutiveStatus.INACTIVE : ExecutiveStatus.ACTIVE;

    const orgId = body.orgId ?? null;
    const email = body.email ? this.optEmail(body.email) : null;
    const phone = body.phone ? this.optPhone(body.phone) : null;
    const position = body.position ?? null;
    const description = body.description ?? null;

    const dup = await this.repo.findOne({ where: { executiveCode } });
    if (dup) throw new ConflictException('executiveCode already exists');

    const entity = this.repo.create({
      executiveCode,
      executiveName,
      position,
      email,
      phone,
      status,
      org: orgId ? ({ id: orgId } as any) : null,
      applyStartDate: applyStartDate as any,
      applyEndDate: (applyEndDate as any) ?? null,
      description,
    });
    const saved = await this.repo.save(entity);
    return saved;
  }

  async edit(id: string, body: any) {
    this.reqString(id, 'id');
    const rec = await this.repo.findOne({ where: { id } });
    if (!rec) throw new NotFoundException('Executive not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== (rec as any).version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.executiveName === 'string' && body.executiveName.trim().length > 0) rec.executiveName = body.executiveName.trim();
    if (body.position !== undefined) rec.position = body.position ?? null;
    if (body.email !== undefined) rec.email = body.email ? this.optEmail(body.email) : null;
    if (body.phone !== undefined) rec.phone = body.phone ? this.optPhone(body.phone) : null;
    if (body.orgId !== undefined) (rec as any).org = body.orgId ? ({ id: body.orgId } as any) : null;
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') (rec as any).status = body.status as ExecutiveStatus;
    if (body.description !== undefined) rec.description = body.description ?? null;
    if (body.applyEndDate !== undefined) {
      const newEnd = body.applyEndDate === null ? null : this.reqDate(body.applyEndDate, 'applyEndDate');
      const start = this.dateToYMD(rec.applyStartDate);
      if (newEnd && !(start < newEnd)) throw new BadRequestException('applyEndDate must be greater than applyStartDate');
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
    const re = /^\+?[0-9]{7,15}$/;
    if (!re.test(s)) throw new BadRequestException('phone is invalid');
    return s;
  }
}

