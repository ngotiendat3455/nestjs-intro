import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CardCompany, CardCompanyOrg, Org } from '../entities';

interface CardCompanyListQuery {
  orgID?: string;
  isApplyUnderOrg?: boolean;
  targetDate?: string; // YYYY-MM-DD
}

interface UpsertCardCompanyBody {
  creditId?: string;
  creditCode: string;
  creditName: string;
  applyStartDate: string; // YYYY-MM-DD
  applyEndDate?: string | null;
  deleted?: boolean;
  orgIds: string[];
}

@Injectable()
export class CardCompanySettingService {
  constructor(
    @InjectRepository(CardCompany)
    private readonly cardCompanyRepo: Repository<CardCompany>,
    @InjectRepository(CardCompanyOrg)
    private readonly cardCompanyOrgRepo: Repository<CardCompanyOrg>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
  ) { }

  /**
   * List card company settings for the HQ screen.
   *
   * - Filter by targetDate (effective on that day).
   * - Optionally narrow by orgID and its descendants (if isApplyUnderOrg=true).
   */
  async list(query: CardCompanyListQuery) {
    const qb = this.cardCompanyRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.orgs', 'co')
      .leftJoinAndSelect('co.org', 'o')
      .where('c.deleted = :deleted', { deleted: false });

    if (query.targetDate) {
      const d = this.reqDate(query.targetDate, 'targetDate');
      qb.andWhere('c.applyStartDate <= :d', { d });
      qb.andWhere('(c.applyEndDate IS NULL OR :d < c.applyEndDate)', { d });
    }

    if (query.orgID) {
      const ids = await this.resolveOrgIds(query.orgID, !!query.isApplyUnderOrg);
      if (ids.length === 0) {
        return [];
      }
      qb.andWhere('o.id IN (:...ids)', { ids });
    }

    qb.orderBy('c.creditCode', 'ASC')
      .addOrderBy('c.applyStartDate', 'ASC');

    const rows = await qb.getMany();

    return rows.map((c) => ({
      creditId: c.creditId,
      creditCode: c.creditCode,
      creditName: c.creditName,
      applyStartDate: this.dateToYMD(c.applyStartDate),
      orgIDs: (c.orgs || []).map((bridge) => bridge.org.id),
      deleted: c.deleted,
    }));
  }

  /**
   * Detail for edit screen.
   */
  async getDetail(creditId: string, applyDate?: string) {
    const id = this.reqString(creditId, 'creditId');

    const qb = this.cardCompanyRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.orgs', 'co')
      .leftJoinAndSelect('co.org', 'o')
      .where('c.creditId = :creditId', { creditId: id });

    if (applyDate) {
      const d = this.reqDate(applyDate, 'applyDate');
      qb.andWhere('c.applyStartDate <= :d', { d });
      qb.andWhere('(c.applyEndDate IS NULL OR :d < c.applyEndDate)', { d });
    }

    const rec = await qb.getOne();
    if (!rec) {
      throw new NotFoundException('Card company not found');
    }

    return {
      creditId: rec.creditId,
      creditCode: rec.creditCode,
      creditName: rec.creditName,
      applyStartDate: this.dateToYMD(rec.applyStartDate),
      applyEndDate: rec.applyEndDate ? this.dateToYMD(rec.applyEndDate) : null,
      deleted: rec.deleted,
      orgIDs: (rec.orgs || []).map((bridge) => bridge.org.id),
    };
  }

  /**
   * Upsert endpoint for add / edit:
   * - without creditId -> create
   * - with creditId -> update
   */
  async upsert(body: UpsertCardCompanyBody) {
    const creditCode = this.reqString(body.creditCode, 'creditCode');
    const creditName = this.reqString(body.creditName, 'creditName');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');
    const applyEndDate =
      body.applyEndDate === undefined || body.applyEndDate === null
        ? null
        : this.reqDate(body.applyEndDate, 'applyEndDate');
    const deleted = !!body.deleted;

    const orgIds = Array.isArray(body.orgIds) ? body.orgIds : [];
    if (!orgIds.length) {
      throw new BadRequestException('orgIds is required and must contain at least one orgId');
    }

    let entity: CardCompany;
    if (body.creditId) {
      const id = this.reqString(body.creditId, 'creditId');
      const found = await this.cardCompanyRepo.findOne({
        where: { creditId: id },
      });
      if (!found) {
        entity = this.cardCompanyRepo.create();
        entity.creditId = id;
      } else {
        entity = found;
      }
      entity.creditCode = creditCode;
      entity.creditName = creditName;
      (entity as any).applyStartDate = applyStartDate as any;
      (entity as any).applyEndDate = applyEndDate as any;
      entity.deleted = deleted;
    } else {
      entity = this.cardCompanyRepo.create({
        creditCode,
        creditName,
        applyStartDate: applyStartDate as any,
        applyEndDate: applyEndDate as any,
        deleted,
      });
    }

    const saved = await this.cardCompanyRepo.save(entity);

    // Update org bridge records
    await this.cardCompanyOrgRepo.delete({
      cardCompany: { creditId: saved.creditId } as any,
    });

    const orgs = await this.orgRepo.findByIds(orgIds);
    if (orgs.length !== orgIds.length) {
      throw new BadRequestException('Some orgIds do not exist');
    }

    const bridges = orgs.map((org) => {
      const bridge = this.cardCompanyOrgRepo.create();
      bridge.cardCompany = saved;
      bridge.org = org;
      return bridge;
    });
    await this.cardCompanyOrgRepo.save(bridges);

    return this.getDetail(saved.creditId);
  }

  /**
   * Delete multiple card companies by creditId.
   */
  async deleteMany(creditIds: string[]) {
    if (!creditIds || !creditIds.length) {
      throw new BadRequestException('creditId is required');
    }

    await this.cardCompanyRepo.manager.transaction(async (manager) => {
      for (const rawId of creditIds) {
        const id = this.reqString(rawId, 'creditId');
        const rec = await manager.findOne(CardCompany, { where: { creditId: id } });
        if (!rec) {
          throw new NotFoundException('Card company not found');
        }
        await manager.remove(rec);
      }
    });

    return { deleted: creditIds.length };
  }

  private async resolveOrgIds(rootId: string, includeUnder: boolean): Promise<string[]> {
    const id = this.reqString(rootId, 'orgID');
    if (!includeUnder) return [id];

    const visited = new Set<string>();
    const queue: string[] = [id];

    while (queue.length) {
      const current = queue.shift() as string;
      if (visited.has(current)) continue;
      visited.add(current);

      const children = await this.orgRepo.find({
        where: { parent: { id: current } as any },
        select: ['id'],
      });

      for (const child of children) {
        if (!visited.has(child.id)) {
          queue.push(child.id);
        }
      }
    }

    return Array.from(visited);
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

