import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discount, DiscountOrg, Org, DiscountType } from '../entities';

interface DiscountListQuery {
  orgIds?: string;
  targetDate?: string;
  featureCode?: string;
  effiectiveType?: 'ALL' | 'VALID' | 'INVALID';
  applyForUnderOrg?: string;
}

interface UpsertDiscountBody {
  discountId?: string;
  discountCode: string;
  discountName: string;
  discountType: DiscountType;
  discountAmount: number;
  discountRate: number;
  usePoint: boolean;
  effective: boolean;
  applyStartDate: string;
  origin?: string | null;
  media?: string | null;
  companyCode?: string | null;
  orgIds: string[];
}

@Injectable()
export class DiscountService {
  constructor(
    @InjectRepository(Discount)
    private readonly discountRepo: Repository<Discount>,
    @InjectRepository(DiscountOrg)
    private readonly discountOrgRepo: Repository<DiscountOrg>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
  ) { }

  async list(params: DiscountListQuery) {
    const {
      orgIds,
      targetDate,
      effiectiveType = 'ALL',
    } = params;

    const qb = this.discountRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.orgs', 'do')
      .leftJoinAndSelect('do.org', 'o');

    if (targetDate) {
      qb.andWhere('d.applyStartDate <= :targetDate', { targetDate });
    }

    if (effiectiveType === 'VALID') {
      qb.andWhere('d.effective = :effective', { effective: true });
    } else if (effiectiveType === 'INVALID') {
      qb.andWhere('d.effective = :effective', { effective: false });
    }

    if (orgIds) {
      qb.andWhere('o.id = :orgId', { orgId: orgIds });
    }

    qb.orderBy('d.updatedAt', 'DESC');

    const list = await qb.getMany();

    return list.map((d) => ({
      discountId: d.discountId,
      discountCode: d.discountCode,
      discountName: d.discountName,
      discountType: d.discountType,
      discountAmount: d.discountAmount,
      discountRate: d.discountRate,
      usePoint: d.usePoint,
      origin: d.origin,
      media: d.media,
      effective: d.effective,
      applyStartDate: d.applyStartDate,
      updateDate: d.updatedAt,
      orgList: (d.orgs || []).map((bridge) => ({
        orgId: bridge.org.id,
        orgName: bridge.org.orgName,
      })),
    }));
  }

  async getDetail(discountId: string, targetDate?: string) {
    const qb = this.discountRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.orgs', 'do')
      .leftJoinAndSelect('do.org', 'o')
      .where('d.discountId = :discountId', { discountId });

    if (targetDate) {
      qb.andWhere('d.applyStartDate <= :targetDate', { targetDate });
    }

    const d = await qb.getOne();
    if (!d) {
      return null;
    }

    return {
      discountId: d.discountId,
      discountCode: d.discountCode,
      discountName: d.discountName,
      discountType: d.discountType,
      discountAmount: d.discountAmount,
      discountRate: d.discountRate,
      usePoint: d.usePoint,
      origin: d.origin,
      media: d.media,
      effective: d.effective,
      applyStartDate: d.applyStartDate,
      updateDate: d.updatedAt,
      orgList: (d.orgs || []).map((bridge) => ({
        orgId: bridge.org.id,
        orgName: bridge.org.orgName,
      })),
    };
  }

  async upsert(body: UpsertDiscountBody) {
    const {
      discountId,
      orgIds,
      ...rest
    } = body;

    let discount: Discount;
    if (discountId) {
      discount = await this.discountRepo.findOne({
        where: { discountId },
      }) as Discount;
      if (!discount) {
        discount = this.discountRepo.create();
        discount.discountId = discountId;
      }
      Object.assign(discount, rest);
    } else {
      discount = this.discountRepo.create(rest);
    }

    const saved = await this.discountRepo.save(discount);

    if (orgIds && orgIds.length > 0) {
      await this.discountOrgRepo.delete({
        discount: { discountId: saved.discountId } as any,
      });

      const orgs = await this.orgRepo.findByIds(orgIds);
      const bridges = orgs.map((org) => {
        const bridge = this.discountOrgRepo.create();
        bridge.discount = saved;
        bridge.org = org;
        return bridge;
      });
      await this.discountOrgRepo.save(bridges);
    }

    return this.getDetail(saved.discountId);
  }
}

