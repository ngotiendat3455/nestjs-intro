import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Org,
  PaymentMethod,
  PaymentMethodOrg,
} from '../entities';

interface PaymentMethodListQuery {
  orgIds?: string;
  applyForUnderOrg?: string;
  applyDate?: string; // YYYY-MM-DD
  keyWord?: string;
}

interface UpsertPaymentMethodBody {
  paymentId?: string;
  companyCode?: string | null;
  paymentCode: string;
  paymentName: string;
  accounting: number;
  hanging: number;
  processNumber: number;
  moneyScheduleReceipt: number;
  creditCard: number;
  frequency: number;
  applyStartDate: string;
  applyEndDate?: string | null;
  deleted?: boolean;
  orgIds: string[];
}

interface DeletePaymentMethodItem {
  paymentId: string;
  orgId: string;
  applyStartDate?: string;
}

@Injectable()
export class PaymentMethodSettingService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(PaymentMethodOrg)
    private readonly paymentMethodOrgRepo: Repository<PaymentMethodOrg>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
  ) { }

  /**
   * List payment methods for the HQ screen.
   *
   * - Filter by applyDate (effective on that day).
   * - Optionally narrow by orgIds and its descendants (if applyForUnderOrg=true).
   * - Optionally filter by keyWord on paymentCode/paymentName.
   *
   * The result is flattened so that each record corresponds to
   *  one (paymentId, orgId) pair, matching IPaymentMethodApiGetList.
   */
  async list(query: PaymentMethodListQuery) {
    const qb = this.paymentMethodRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.orgs', 'po')
      .leftJoinAndSelect('po.org', 'o')
      .where('p.deleted = :deleted', { deleted: false });

    if (query.applyDate) {
      const d = this.reqDate(query.applyDate, 'applyDate');
      qb.andWhere('p.applyStartDate <= :d', { d });
      qb.andWhere('(p.applyEndDate IS NULL OR :d < p.applyEndDate)', { d });
    }

    if (query.orgIds) {
      const rootId = this.reqString(query.orgIds, 'orgIds');
      const includeUnder =
        query.applyForUnderOrg === 'true' || query.applyForUnderOrg === '1';

      if (includeUnder) {
        const ids = await this.resolveOrgIds(rootId, true);
        if (!ids.length) {
          return [];
        }
        qb.andWhere('o.id IN (:...ids)', { ids });
      } else {
        qb.andWhere('o.id = :orgId', { orgId: rootId });
      }
    }

    if (query.keyWord && query.keyWord.trim().length > 0) {
      const kw = `%${query.keyWord.trim()}%`;
      qb.andWhere(
        '(p.paymentCode ILIKE :kw OR p.paymentName ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('p.paymentCode', 'ASC')
      .addOrderBy('p.applyStartDate', 'ASC');

    const rows = await qb.getMany();

    const result: any[] = [];

    for (const p of rows) {
      const applyStartDate = this.dateToYMD(p.applyStartDate);
      const applyEndDate = p.applyEndDate ? this.dateToYMD(p.applyEndDate) : null;

      if (!p.orgs || p.orgs.length === 0) {
        result.push({
          paymentId: p.paymentId,
          companyCode: p.companyCode ?? null,
          orgId: '',
          paymentCode: p.paymentCode,
          paymentName: p.paymentName,
          accounting: p.accounting,
          hanging: p.hanging,
          processNumber: p.processNumber,
          moneyScheduleReceipt: p.moneyScheduleReceipt,
          creditCard: p.creditCard,
          frequency: p.frequency,
          deleted: p.deleted,
          applyStartDate,
          applyEndDate,
          listOrg: [],
        });
        continue;
      }

      for (const bridge of p.orgs) {
        result.push({
          paymentId: p.paymentId,
          companyCode: p.companyCode ?? null,
          orgId: bridge.org.id,
          paymentCode: p.paymentCode,
          paymentName: p.paymentName,
          accounting: p.accounting,
          hanging: p.hanging,
          processNumber: p.processNumber,
          moneyScheduleReceipt: p.moneyScheduleReceipt,
          creditCard: p.creditCard,
          frequency: p.frequency,
          deleted: p.deleted,
          applyStartDate,
          applyEndDate,
          listOrg: [],
        });
      }
    }

    return result;
  }

  /**
   * Upsert endpoint for add / edit:
   * - without paymentId -> create
   * - with paymentId -> update
   *
   * For simplicity this does not maintain historical versions; it just
   * updates the row identified by paymentId and sets applyStartDate / applyEndDate.
   */
  async upsert(body: UpsertPaymentMethodBody) {
    const paymentCode = this.reqString(body.paymentCode, 'paymentCode');
    const paymentName = this.reqString(body.paymentName, 'paymentName');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');
    const applyEndDate =
      body.applyEndDate === undefined || body.applyEndDate === null
        ? null
        : this.reqDate(body.applyEndDate, 'applyEndDate');

    const companyCode =
      body.companyCode === undefined || body.companyCode === null
        ? null
        : this.reqString(body.companyCode, 'companyCode');

    const orgIds = Array.isArray(body.orgIds) ? body.orgIds : [];
    if (!orgIds.length) {
      throw new BadRequestException('orgIds is required and must contain at least one orgId');
    }

    let entity: PaymentMethod;
    if (body.paymentId) {
      const id = this.reqString(body.paymentId, 'paymentId');
      const found = await this.paymentMethodRepo.findOne({
        where: { paymentId: id },
      });
      if (!found) {
        entity = this.paymentMethodRepo.create();
        entity.paymentId = id;
      } else {
        entity = found;
      }
    } else {
      entity = this.paymentMethodRepo.create();
    }

    entity.paymentCode = paymentCode;
    entity.paymentName = paymentName;
    (entity as any).applyStartDate = applyStartDate as any;
    (entity as any).applyEndDate = applyEndDate as any;
    entity.companyCode = companyCode;
    entity.accounting = body.accounting;
    entity.hanging = body.hanging;
    entity.processNumber = body.processNumber;
    entity.moneyScheduleReceipt = body.moneyScheduleReceipt;
    entity.creditCard = body.creditCard;
    entity.frequency = body.frequency;
    entity.deleted = !!body.deleted;

    const saved = await this.paymentMethodRepo.save(entity);

    // Update org bridge records
    await this.paymentMethodOrgRepo.delete({
      paymentMethod: { paymentId: saved.paymentId } as any,
    });

    const orgs = await this.orgRepo.findByIds(orgIds);
    if (orgs.length !== orgIds.length) {
      throw new BadRequestException('Some orgIds do not exist');
    }

    const bridges = orgs.map((org) => {
      const bridge = this.paymentMethodOrgRepo.create();
      bridge.paymentMethod = saved;
      bridge.org = org;
      return bridge;
    });
    await this.paymentMethodOrgRepo.save(bridges);

    return { paymentId: saved.paymentId };
  }

  /**
   * Delete links between payment methods and orgs.
   *
   * If after deletion a payment method has no orgs, the master row itself
   * is removed as well.
   */
  async deleteMany(items: DeletePaymentMethodItem[]) {
    if (!Array.isArray(items) || !items.length) {
      throw new BadRequestException('Request body must be a non-empty array');
    }

    await this.paymentMethodRepo.manager.transaction(async (manager) => {
      for (const raw of items) {
        const paymentId = this.reqString(raw.paymentId, 'paymentId');
        const orgId = this.reqString(raw.orgId, 'orgId');

        if (raw.applyStartDate) {
          this.reqDate(raw.applyStartDate, 'applyStartDate');
        }

        const pm = await manager.findOne(PaymentMethod, {
          where: { paymentId },
        });
        if (!pm) {
          throw new NotFoundException('PaymentMethod not found');
        }

        await manager.delete(PaymentMethodOrg, {
          paymentMethod: { paymentId } as any,
          org: { id: orgId } as any,
        });

        const remaining = await manager.count(PaymentMethodOrg, {
          where: { paymentMethod: { paymentId } as any },
        });

        if (remaining === 0) {
          await manager.remove(pm);
        }
      }
    });

    return { deleted: items.length };
  }

  private async resolveOrgIds(rootId: string, includeUnder: boolean): Promise<string[]> {
    const id = this.reqString(rootId, 'orgIds');
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

