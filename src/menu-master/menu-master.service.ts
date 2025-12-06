import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ContractMenuMst,
  ContractOptionGroupMst,
} from '../entities';

interface ListQuery {
  keyWord?: string;
  targetDate?: string; // YYYY-MM-DD
}

@Injectable()
export class MenuMasterService {
  constructor(
    @InjectRepository(ContractMenuMst)
    private readonly repo: Repository<ContractMenuMst>,
    @InjectRepository(ContractOptionGroupMst)
    private readonly classRepo: Repository<ContractOptionGroupMst>,
  ) { }

  /**
   * List menus for list page.
   * Filter:
   * - keyWord on menuCode / menuName
   * - targetDate within [applyStartDate, applyEndDate)
   */
  async list(query: ListQuery) {
    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.menuClassification', 'mc');

    if (query.keyWord) {
      const s = `%${query.keyWord}%`;
      qb.andWhere(
        '(m.menuCode ILIKE :s OR m.menuName ILIKE :s)',
        { s },
      );
    }

    if (query.targetDate) {
      const d = this.reqDate(query.targetDate, 'targetDate');
      qb.andWhere(
        'm.applyStartDate <= :d AND :d < m.applyEndDate',
        { d },
      );
    }

    qb.orderBy('m.dispSort', 'ASC').addOrderBy('m.menuCode', 'ASC');

    const rows = await qb.getMany();

    return rows.map((m) => {
      const applyStart =
        m.applyStartDate instanceof Date
          ? this.dateToYMD(m.applyStartDate)
          : (m.applyStartDate as string);

      return {
        contractMenuMstID: m.contractMenuMstID,
        dispSort: m.dispSort,
        menuCode: m.menuCode,
        menuName: m.menuName,
        contractOptionGroupMstID: (m.menuClassification as any)
          ?.contractOptionGroupMstId || '',
        contractOptionGroupName: (m.menuClassification as any)
          ?.groupName || '',
        contractCourseGroupMstId: '',
        contractCourseGroupName: '',
        applyStartDate: applyStart,
        unitPrice: m.unitPrice,
      };
    });
  }

  async add(body: any) {
    const dispSort = this.reqInt(body.dispSort, 'dispSort');
    const menuCode = this.reqString(body.menuCode, 'menuCode');
    const menuName = this.reqString(body.menuName, 'menuName');
    const unitPrice = this.reqInt(body.unitPrice, 'unitPrice');

    const applyStartDateRaw = this.extractDate(
      body.applyStartDate,
      'applyStartDate',
    );
    const applyEndDateRaw = this.extractDate(
      body.applyEndDate,
      'applyEndDate',
    );

    const applyStartDate = this.reqDate(
      applyStartDateRaw,
      'applyStartDate',
    );
    const applyEndDate = this.reqDate(
      applyEndDateRaw,
      'applyEndDate',
    );

    if (!(applyStartDate < applyEndDate)) {
      throw new BadRequestException(
        'applyEndDate must be greater than applyStartDate',
      );
    }

    const optionGroupId = this.reqString(
      body.contractOptionGroupMstID,
      'contractOptionGroupMstID',
    );
    const optionGroup = await this.classRepo.findOne({
      where: { contractOptionGroupMstId: optionGroupId },
    });
    if (!optionGroup) {
      throw new NotFoundException('Menu classification not found');
    }

    // Ensure unique menuCode (simple rule; adjust if versioning needed)
    const dup = await this.repo.findOne({
      where: { menuCode },
    });
    if (dup) {
      throw new ConflictException('menuCode already exists');
    }

    const entity = this.repo.create({
      dispSort,
      menuCode,
      menuName,
      unitPrice,
      applyStartDate: applyStartDate as any,
      applyEndDate: applyEndDate as any,
      menuClassification: optionGroup as any,
    });

    const saved = await this.repo.save(entity);
    return saved;
  }

  async edit(id: string, body: any) {
    const menuId = this.reqString(id, 'contractMenuMstID');

    const rec = await this.repo.findOne({
      where: { contractMenuMstID: menuId },
      relations: ['menuClassification'],
    });
    if (!rec) {
      throw new NotFoundException('Menu not found');
    }

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (
      typeof ifMatchVersion === 'number' &&
      ifMatchVersion !== (rec as any).version
    ) {
      throw new ConflictException('Version mismatch');
    }

    if (body.dispSort !== undefined) {
      rec.dispSort = this.reqInt(body.dispSort, 'dispSort');
    }

    if (body.menuCode !== undefined) {
      const newCode = this.reqString(body.menuCode, 'menuCode');
      const dup = await this.repo.findOne({
        where: { menuCode: newCode },
      });
      if (dup && dup.contractMenuMstID !== rec.contractMenuMstID) {
        throw new ConflictException('menuCode already exists');
      }
      rec.menuCode = newCode;
    }

    if (body.menuName !== undefined) {
      rec.menuName = this.reqString(body.menuName, 'menuName');
    }

    if (body.unitPrice !== undefined) {
      rec.unitPrice = this.reqInt(body.unitPrice, 'unitPrice');
    }

    if (
      body.applyStartDate !== undefined ||
      body.applyEndDate !== undefined
    ) {
      const currentStart = this.dateToYMD(rec.applyStartDate);
      const currentEnd = this.dateToYMD(rec.applyEndDate);

      const nextStart = body.applyStartDate
        ? this.reqDate(
            this.extractDate(body.applyStartDate, 'applyStartDate'),
            'applyStartDate',
          )
        : currentStart;
      const nextEnd = body.applyEndDate
        ? this.reqDate(
            this.extractDate(body.applyEndDate, 'applyEndDate'),
            'applyEndDate',
          )
        : currentEnd;

      if (!(nextStart < nextEnd)) {
        throw new BadRequestException(
          'applyEndDate must be greater than applyStartDate',
        );
      }

      (rec as any).applyStartDate = nextStart as any;
      (rec as any).applyEndDate = nextEnd as any;
    }

    if (body.contractOptionGroupMstID !== undefined) {
      const optionGroupId = this.reqString(
        body.contractOptionGroupMstID,
        'contractOptionGroupMstID',
      );
      const optionGroup = await this.classRepo.findOne({
        where: { contractOptionGroupMstId: optionGroupId },
      });
      if (!optionGroup) {
        throw new NotFoundException('Menu classification not found');
      }
      (rec as any).menuClassification = optionGroup as any;
    }

    const saved = await this.repo.save(rec);
    return saved;
  }

  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('itemSectionIDs is required');
    }

    await this.repo.manager.transaction(async (manager) => {
      for (const id of ids) {
        const menuId = this.reqString(id, 'contractMenuMstID');
        const rec = await manager.findOne(ContractMenuMst, {
          where: { contractMenuMstID: menuId },
        });
        if (!rec) {
          throw new NotFoundException('Menu not found');
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

  private extractDate(v: any, field: string): string {
    if (typeof v !== 'string') {
      throw new BadRequestException(`field ${field} must be string`);
    }
    // Accept ISO with timezone; take date part
    // Example: 2025-01-01T00:00:00+0900
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) {
      throw new BadRequestException(`field ${field} must start with YYYY-MM-DD`);
    }
    return m[1];
  }

  private dateToYMD(d: string | Date | null | undefined): string {
    if (!d) return '';
    if (typeof d === 'string') {
      return d.includes('/') ? d.replace(/\//g, '-') : d;
    }
    const z = new Date(d);
    const y = z.getUTCFullYear();
    const m = String(z.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(z.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
