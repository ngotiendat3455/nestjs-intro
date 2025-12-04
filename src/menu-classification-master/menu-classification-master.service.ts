import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractOptionGroupMst } from '../entities';

interface ListQuery {
  companyCode?: string;
  keyWord?: string;
}

@Injectable()
export class MenuClassificationMasterService {
  constructor(
    @InjectRepository(ContractOptionGroupMst)
    private readonly repo: Repository<ContractOptionGroupMst>,
  ) { }

  async list(query: ListQuery) {
    const qb = this.repo.createQueryBuilder('g');

    if (query.companyCode) {
      qb.andWhere('g.companyCode = :companyCode', {
        companyCode: query.companyCode,
      });
    }

    if (query.keyWord) {
      const kw = `%${query.keyWord}%`;
      qb.andWhere(
        '(g.groupCode ILIKE :kw OR g.groupName ILIKE :kw)',
        { kw },
      );
    }

    qb.orderBy('g.dispSort', 'ASC');

    const rows = await qb.getMany();
    return rows;
  }

  async add(body: any) {
    const companyCode = this.reqString(body.companyCode, 'companyCode');
    const dispSort = this.reqInt(body.dispSort, 'dispSort');
    const groupCode = this.reqString(body.groupCode, 'groupCode');
    const groupName = this.reqString(body.groupName, 'groupName');

    const dup = await this.repo.findOne({
      where: { companyCode, groupCode },
    });
    if (dup) {
      throw new ConflictException(
        'groupCode already exists for this company',
      );
    }

    const entity = this.repo.create({
      companyCode,
      dispSort,
      groupCode,
      groupName,
    });

    const saved = await this.repo.save(entity);
    return saved;
  }

  async edit(id: string, body: any) {
    const targetId = this.reqString(id, 'id');

    const rec = await this.repo.findOne({
      where: { contractOptionGroupMstId: targetId },
    });
    if (!rec) {
      throw new NotFoundException('MenuClassification not found');
    }

    if (body.companyCode !== undefined) {
      rec.companyCode = this.reqString(body.companyCode, 'companyCode');
    }

    if (body.dispSort !== undefined) {
      rec.dispSort = this.reqInt(body.dispSort, 'dispSort');
    }

    if (body.groupCode !== undefined) {
      const newCode = this.reqString(body.groupCode, 'groupCode');
      const dup = await this.repo.findOne({
        where: {
          companyCode: rec.companyCode,
          groupCode: newCode,
        },
      });
      if (dup && dup.contractOptionGroupMstId !== rec.contractOptionGroupMstId) {
        throw new ConflictException(
          'groupCode already exists for this company',
        );
      }
      rec.groupCode = newCode;
    }

    if (body.groupName !== undefined) {
      rec.groupName = this.reqString(body.groupName, 'groupName');
    }

    const saved = await this.repo.save(rec);
    return saved;
  }

  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('contractOptionGroupMstIds is required');
    }

    await this.repo.manager.transaction(async (manager) => {
      // If any delete fails (FK constraints, etc.), the transaction will abort.
      for (const id of ids) {
        const targetId = this.reqString(id, 'contractOptionGroupMstId');
        const rec = await manager.findOne(ContractOptionGroupMst, {
          where: { contractOptionGroupMstId: targetId },
        });
        if (!rec) {
          throw new NotFoundException('MenuClassification not found');
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
}

