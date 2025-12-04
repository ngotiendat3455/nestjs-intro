import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxRate } from '../entities';

interface ListQuery {
  keyword?: string;
  targetDate?: string; // YYYY-MM-DD
}

interface UpsertBody {
  taxId?: string;
  taxRateType: number;
  taxRate: number;
  taxationUnit: number;
  round: number;
  applyStartDate: string; // YYYY-MM-DD
}

@Injectable()
export class TaxRateSettingService {
  constructor(
    @InjectRepository(TaxRate)
    private readonly repo: Repository<TaxRate>,
  ) { }

  async list(query: ListQuery) {
    const qb = this.repo.createQueryBuilder('t');

    if (query.keyword) {
      const kw = `%${query.keyword}%`;
      // simple search by rate value
      qb.andWhere('CAST(t.taxRate AS TEXT) ILIKE :kw', { kw });
    }

    if (query.targetDate) {
      const d = this.reqDate(query.targetDate, 'targetDate');
      // show rates whose applyStartDate <= targetDate
      qb.andWhere('t.applyStartDate <= :d', { d });
    }

    qb.orderBy('t.applyStartDate', 'DESC').addOrderBy('t.taxRateType', 'ASC');

    const rows = await qb.getMany();
    return rows;
  }

  async getDetail(taxId: string) {
    const id = this.reqString(taxId, 'taxId');
    const rec = await this.repo.findOne({ where: { taxId: id } });
    if (!rec) {
      throw new NotFoundException('Tax rate not found');
    }
    return rec;
  }

  /**
   * Upsert: if taxId provided -> edit, else create new
   */
  async addOrEdit(body: UpsertBody) {
    const taxRateType = this.reqInt(body.taxRateType, 'taxRateType');
    const taxRateVal = this.reqInt(body.taxRate, 'taxRate');
    const taxationUnit = this.reqInt(body.taxationUnit, 'taxationUnit');
    const round = this.reqInt(body.round, 'round');
    const applyStartDate = this.reqDate(body.applyStartDate, 'applyStartDate');

    if (taxRateVal < 0 || taxRateVal > 100) {
      throw new BadRequestException('taxRate must be between 0 and 100');
    }

    // create
    if (!body.taxId) {
      const entity = this.repo.create({
        taxRateType,
        taxRate: taxRateVal,
        taxationUnit,
        round,
        applyStartDate: applyStartDate as any,
      });

      const saved = await this.repo.save(entity);
      return saved;
    }

    // edit
    const id = this.reqString(body.taxId, 'taxId');
    const rec = await this.repo.findOne({ where: { taxId: id } });
    if (!rec) {
      throw new NotFoundException('Tax rate not found');
    }

    // naive optimistic check (optional) – if provided
    const ifMatchVersion: number | undefined = (body as any).ifMatchVersion;
    if (
      typeof ifMatchVersion === 'number' &&
      ifMatchVersion !== (rec as any).version
    ) {
      throw new ConflictException('Version mismatch');
    }

    rec.taxRateType = taxRateType;
    rec.taxRate = taxRateVal;
    rec.taxationUnit = taxationUnit;
    rec.round = round;
    (rec as any).applyStartDate = applyStartDate as any;

    const saved = await this.repo.save(rec);
    return saved;
  }

  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('taxId is required');
    }

    await this.repo.manager.transaction(async (manager) => {
      for (const id of ids) {
        const taxId = this.reqString(id, 'taxId');
        const rec = await manager.findOne(TaxRate, { where: { taxId } });
        if (!rec) {
          throw new NotFoundException('Tax rate not found');
        }
        await manager.remove(rec);
      }
    });

    return { deleted: ids.length };
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new BadRequestException(`field ${field} is required string`);
    }
    return v.trim();
  }

  private reqInt(v: any, field: string) {
    const n = Number(v);
    if (!Number.isInteger(n)) {
      throw new BadRequestException(`field ${field} must be integer`);
    }
    return n;
  }

  private reqDate(v: any, field: string) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new BadRequestException(`field ${field} must be YYYY-MM-DD`);
    }
    return v;
  }
}

