import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashierStoreSetting } from '../entities';

interface UpsertCashierStoreSettingBody {
  orgId: string;
  receiptPrinterIp?: string | null;
  receiptPrinterPort?: string | null;
}

@Injectable()
export class CashierStoreSettingService {
  constructor(
    @InjectRepository(CashierStoreSetting)
    private readonly repo: Repository<CashierStoreSetting>,
  ) { }

  async getForOrg(orgId: string) {
    const id = this.reqString(orgId, 'orgId');
    const rec = await this.repo.findOne({
      where: { org: { id } as any },
      relations: ['org'],
    });
    if (!rec) {
      throw new NotFoundException('CashierStoreSetting not found');
    }

    return {
      orgId: rec.org.id,
      receiptPrinterIp: rec.receiptPrinterIp,
      receiptPrinterPort: rec.receiptPrinterPort,
    };
  }

  async upsert(body: UpsertCashierStoreSettingBody) {
    const orgId = this.reqString(body.orgId, 'orgId');
    const receiptPrinterIp = this.optString(body.receiptPrinterIp, 'receiptPrinterIp');
    const receiptPrinterPort = this.optString(body.receiptPrinterPort, 'receiptPrinterPort');

    let rec = await this.repo.findOne({
      where: { org: { id: orgId } as any },
      relations: ['org'],
    });

    if (!rec) {
      rec = this.repo.create({
        org: { id: orgId } as any,
        receiptPrinterIp,
        receiptPrinterPort,
      });
    } else {
      rec.receiptPrinterIp = receiptPrinterIp;
      rec.receiptPrinterPort = receiptPrinterPort;
    }

    const saved = await this.repo.save(rec);

    return {
      orgId: orgId,
      receiptPrinterIp: saved.receiptPrinterIp,
      receiptPrinterPort: saved.receiptPrinterPort,
    };
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new BadRequestException(`field ${field} is required string`);
    }
    return v.trim();
  }

  private optString(v: any, field: string) {
    if (v == null) return null;
    if (typeof v !== 'string') {
      throw new BadRequestException(`field ${field} must be string or null`);
    }
    return v.trim();
  }
}

