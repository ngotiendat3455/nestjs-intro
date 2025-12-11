import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Org,
  ProductDepartment,
  ProductItem,
  ProductItemOrg,
  Supplier,
  SupplierStatusEnum,
} from '../entities';

interface ListQuery {
  orgID?: string;
  isApplyUnderOrg?: string;
  itemSectionID?: string;
  targetDate?: string; // YYYY-MM-DD
  featureCode?: string;
  keyWord?: string;
}

@Injectable()
export class ProductItemService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly repo: Repository<ProductItem>,
    @InjectRepository(ProductItemOrg)
    private readonly orgMapRepo: Repository<ProductItemOrg>,
    @InjectRepository(ProductDepartment)
    private readonly deptRepo: Repository<ProductDepartment>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) { }

  /**
   * List product items for ProductSetting screen.
   */
  async list(query: ListQuery) {
    const targetDate = query.targetDate || this.todayYMD();

    const qb = this.repo
      .createQueryBuilder('pi')
      .leftJoinAndSelect('pi.productDepartment', 'dept')
      .leftJoinAndSelect('pi.orgs', 'pio')
      .leftJoinAndSelect('pio.org', 'org');

    if (query.keyWord) {
      const s = `%${query.keyWord}%`;
      qb.andWhere('(pi.itemCode ILIKE :s OR pi.itemName ILIKE :s)', { s });
    }

    // applyStartDate <= targetDate < applyEndDate (or applyEndDate IS NULL)
    qb.andWhere('pi.applyStartDate <= :d', { d: targetDate });
    qb.andWhere(
      '(pi.applyEndDate IS NULL OR :d < pi.applyEndDate)',
      { d: targetDate },
    );

    if (query.itemSectionID) {
      qb.andWhere('dept.itemSectionId = :sec', {
        sec: query.itemSectionID,
      });
    }

    if (query.orgID) {
      qb.andWhere('org.id = :orgID', { orgID: query.orgID });
    }

    qb.orderBy('pi.itemCode', 'ASC');

    const rows = await qb.getMany();

    const supplierMap = await this.fetchSupplierNames(rows.map((r) => r.supplierMstId));

    return rows.map((pi) => ({
      itemID: pi.itemID,
      itemCode: pi.itemCode,
      itemName: pi.itemName,
      itemSectionID: (pi.productDepartment as any)?.itemSectionId || '',
      itemSectionName: (pi.productDepartment as any)?.itemSectionName || '',
      supplierMstId: pi.supplierMstId,
      supplierName: pi.supplierMstId ? supplierMap.get(pi.supplierMstId)?.supplierName || '' : '',
      cost: pi.cost,
      unitPrice: pi.unitPrice,
      taxationSection: pi.taxationSection,
      orgIDs: Array.isArray(pi.orgs)
        ? pi.orgs
          .map((o) => (o.org as any)?.id)
          .filter((v) => !!v)
        : [],
      applyStartDate: this.dateTimeToISODate(pi.applyStartDate),
    }));
  }

  /**
   * Detail for edit form.
   */
  async getDetail(itemID: string, _applyStartDate?: string) {
    const id = this.reqString(itemID, 'itemID');

    const rec = await this.repo.findOne({
      where: { itemID: id },
      relations: ['productDepartment', 'orgs', 'orgs.org'],
    });

    if (!rec) {
      throw new NotFoundException('Product item not found');
    }

    const supplierName = rec.supplierMstId ? await this.getSupplierName(rec.supplierMstId) : '';

    return {
      itemID: rec.itemID,
      itemCode: rec.itemCode,
      itemName: rec.itemName,
      itemSectionID: (rec.productDepartment as any)?.itemSectionId || '',
      itemSectionName: (rec.productDepartment as any)?.itemSectionName || '',
      supplierMstId: rec.supplierMstId,
      supplierName,
      cost: rec.cost,
      unitPrice: rec.unitPrice,
      taxationSection: rec.taxationSection,
      applyStartDate: rec.applyStartDate,
      applyEndDate: rec.applyEndDate,
      orgIDs: Array.isArray(rec.orgs)
        ? rec.orgs
          .map((o) => (o.org as any)?.id)
          .filter((v) => !!v)
        : [],
    };
  }

  /**
   * Create new product item + applicable stores.
   */
  async create(body: any) {
    const itemCode = this.reqString(body.itemCode, 'itemCode');
    const itemName = this.reqString(body.itemName, 'itemName');
    const cost = this.reqInt(body.cost, 'cost');
    const unitPrice = this.reqInt(body.unitPrice, 'unitPrice');
    const taxationSection = this.reqBoolean(body.taxationSection, 'taxationSection');
    const applyStartDate = this.reqDateTime(
      this.extractDateTime(body.applyStartDate, 'applyStartDate'),
      'applyStartDate',
    );
    const supplierMstId = body.supplierMstId
      ? this.reqString(body.supplierMstId, 'supplierMstId')
      : null;

    if (supplierMstId) {
      await this.ensureActiveSupplier(supplierMstId);
    }

    // unique itemCode check
    const dup = await this.repo.findOne({
      where: { itemCode },
    });
    if (dup) {
      throw new ConflictException('itemCode already exists');
    }

    let department: ProductDepartment | null = null;
    if (body.itemSectionID) {
      const secId = this.reqString(body.itemSectionID, 'itemSectionID');
      department = await this.deptRepo.findOne({
        where: { itemSectionId: secId },
      });
      if (!department) {
        throw new NotFoundException('Product department not found');
      }
    }

    const orgIDs: string[] = Array.isArray(body.orgIDs) ? body.orgIDs : [];
    if (orgIDs.length === 0) {
      throw new BadRequestException('orgIDs is required (non-empty array)');
    }

    const applyEndDate = this.reqDateTime('9999-01-01T00:00:00Z', 'applyEndDate');

    const entity = this.repo.create({
      itemCode,
      itemName,
      cost,
      unitPrice,
      taxationSection,
      applyStartDate,
      applyEndDate,
      supplierMstId,
      productDepartment: department ?? null,
    });

    const saved = await this.repo.save(entity);

    await this.replaceOrgMappings(saved.itemID, orgIDs);

    return saved;
  }

  /**
   * Update existing product item + its applicable stores.
   */
  async update(itemID: string, body: any) {
    const id = this.reqString(itemID, 'itemID');
    const rec = await this.repo.findOne({
      where: { itemID: id },
      relations: ['productDepartment', 'orgs', 'orgs.org'],
    });
    if (!rec) {
      throw new NotFoundException('Product item not found');
    }

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (
      typeof ifMatchVersion === 'number' &&
      ifMatchVersion !== (rec as any).version
    ) {
      throw new ConflictException('Version mismatch');
    }

    if (body.itemCode !== undefined) {
      const newCode = this.reqString(body.itemCode, 'itemCode');
      const dup = await this.repo.findOne({
        where: { itemCode: newCode },
      });
      if (dup && dup.itemID !== rec.itemID) {
        throw new ConflictException('itemCode already exists');
      }
      rec.itemCode = newCode;
    }

    if (body.itemName !== undefined) {
      rec.itemName = this.reqString(body.itemName, 'itemName');
    }

    if (body.cost !== undefined) {
      rec.cost = this.reqInt(body.cost, 'cost');
    }

    if (body.unitPrice !== undefined) {
      rec.unitPrice = this.reqInt(body.unitPrice, 'unitPrice');
    }

    if (body.taxationSection !== undefined) {
      rec.taxationSection = this.reqBoolean(
        body.taxationSection,
        'taxationSection',
      );
    }

    if (body.applyStartDate !== undefined) {
      const dt = this.reqDateTime(
        this.extractDateTime(body.applyStartDate, 'applyStartDate'),
        'applyStartDate',
      );
      rec.applyStartDate = dt;
    }

    if (body.applyEndDate !== undefined) {
      if (body.applyEndDate === null) {
        rec.applyEndDate = null;
      } else {
        const dt = this.reqDateTime(
          this.extractDateTime(body.applyEndDate, 'applyEndDate'),
          'applyEndDate',
        );
        rec.applyEndDate = dt;
      }
    }

    if (body.supplierMstId !== undefined) {
      const newSupplierId = body.supplierMstId
        ? this.reqString(body.supplierMstId, 'supplierMstId')
        : null;
      if (newSupplierId) {
        await this.ensureActiveSupplier(newSupplierId);
      }
      rec.supplierMstId = newSupplierId;
    }

    if (body.itemSectionID !== undefined) {
      if (!body.itemSectionID) {
        (rec as any).productDepartment = null;
      } else {
        const secId = this.reqString(body.itemSectionID, 'itemSectionID');
        const dept = await this.deptRepo.findOne({
          where: { itemSectionId: secId },
        });
        if (!dept) {
          throw new NotFoundException('Product department not found');
        }
        (rec as any).productDepartment = dept as any;
      }
    }

    const saved = await this.repo.save(rec);

    if (body.orgIDs !== undefined) {
      const orgIDs: string[] = Array.isArray(body.orgIDs) ? body.orgIDs : [];
      if (orgIDs.length === 0) {
        throw new BadRequestException('orgIDs is required (non-empty array)');
      }
      await this.replaceOrgMappings(saved.itemID, orgIDs);
    }

    return saved;
  }

  /**
   * Delete multiple items by itemID.
   * (applyStartDate from FE is ignored in this simplified version)
   */
  async deleteMany(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('itemIDs is required');
    }

    await this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ProductItem);
      const found = await repo.find({
        where: { itemID: In(ids) },
      });
      if (found.length !== ids.length) {
        const missing = ids.filter(
          (id) => !found.find((r) => r.itemID === id),
        );
        throw new NotFoundException(
          `Some items not found: ${missing.join(', ')}`,
        );
      }
      await manager.remove(found);
    });

    return { deleted: ids.length };
  }

  private async fetchSupplierNames(ids: (string | null | undefined)[]) {
    const uniqueIds = Array.from(new Set(ids.filter((v): v is string => !!v)));
    if (uniqueIds.length === 0) return new Map<string, Supplier>();
    const rows = await this.supplierRepo.find({ where: { id: In(uniqueIds) } });
    const map = new Map<string, Supplier>();
    rows.forEach((s) => map.set(s.id, s));
    return map;
  }

  private async getSupplierName(id: string) {
    const s = await this.supplierRepo.findOne({ where: { id } });
    return s?.supplierName ?? '';
  }

  private async ensureActiveSupplier(id: string) {
    const s = await this.supplierRepo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Supplier not found');
    if (s.status !== SupplierStatusEnum.ACTIVE) throw new BadRequestException('Supplier is inactive');
    return s;
  }

  private async replaceOrgMappings(itemID: string, orgIDs: string[]) {
    const item = await this.repo.findOne({ where: { itemID } });
    if (!item) {
      throw new NotFoundException('Product item not found');
    }

    const orgs = await this.orgRepo.find({
      where: { id: In(orgIDs) },
    });

    if (orgs.length !== orgIDs.length) {
      const foundIds = new Set(orgs.map((o) => o.id));
      const missing = orgIDs.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Some orgs not found: ${missing.join(', ')}`,
      );
    }

    await this.orgMapRepo.delete({
      productItem: { itemID },
    } as any);

    const newMaps = orgs.map((org) =>
      this.orgMapRepo.create({
        productItem: item,
        org,
        applyStartDate: null,
        applyEndDate: null,
      }),
    );

    if (newMaps.length) {
      await this.orgMapRepo.save(newMaps);
    }
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) {
      throw new BadRequestException(`field ${field} is required string`);
    }
    return v.trim();
  }

  private reqInt(v: any, field: string) {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new BadRequestException(`field ${field} must be integer`);
    }
    return n;
  }

  private reqBoolean(v: any, field: string) {
    if (typeof v === 'boolean') {
      return v;
    }
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    throw new BadRequestException(`field ${field} must be boolean`);
  }

  private reqDateTime(v: any, field: string): Date {
    if (typeof v !== 'string') {
      throw new BadRequestException(`field ${field} must be ISO datetime string`);
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`field ${field} must be valid ISO datetime`);
    }
    return d;
  }

  /**
   * Accepts:
   *  - full ISO: 2025-01-01T00:00:00+0900
   *  - date only: 2025-01-01
   */
  private extractDateTime(v: any, field: string): string {
    if (typeof v !== 'string') {
      throw new BadRequestException(`field ${field} must be string`);
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      return v;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return `${v}T00:00:00Z`;
    }
    throw new BadRequestException(
      `field ${field} must start with YYYY-MM-DD (optionally with time)`,
    );
  }

  private todayYMD(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  private dateTimeToISODate(d: Date | string | null | undefined): string {
    if (!d) return '';
    if (typeof d === 'string') {
      const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : d;
    }
    const z = new Date(d);
    const y = z.getFullYear();
    const m = String(z.getMonth() + 1).padStart(2, '0');
    const dd = String(z.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
}
