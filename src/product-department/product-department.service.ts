import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ItemSectionConfig,
  Org,
  ProductDepartment,
  ProductItem,
  ProductItemOrg,
} from '../entities';

interface ListQuery {
  keyWord?: string;
  effective?: string;
}

@Injectable()
export class ProductDepartmentService {
  constructor(
    @InjectRepository(ProductDepartment)
    private readonly deptRepo: Repository<ProductDepartment>,
    @InjectRepository(ItemSectionConfig)
    private readonly configRepo: Repository<ItemSectionConfig>,
    @InjectRepository(ProductItem)
    private readonly itemRepo: Repository<ProductItem>,
    @InjectRepository(ProductItemOrg)
    private readonly itemOrgRepo: Repository<ProductItemOrg>,
    @InjectRepository(Org)
    private readonly orgRepo: Repository<Org>,
  ) { }

  /**
   * List product departments for 商品部門 screen.
   */
  async list(query: ListQuery) {
    const qb = this.deptRepo.createQueryBuilder('d');

    if (query.keyWord) {
      const s = `%${query.keyWord}%`;
      qb.andWhere(
        '(d.itemSectionCode ILIKE :s OR d.itemSectionName ILIKE :s)',
        { s },
      );
    }

    if (query.effective !== undefined && query.effective !== '') {
      const eff = this.parseEffective(query.effective);
      qb.andWhere('d.effective = :eff', { eff });
    }

    qb.orderBy('d.displaySort', 'ASC').addOrderBy('d.itemSectionCode', 'ASC');

    const rows = await qb.getMany();

    return rows.map((d) => ({
      itemSectionId: d.itemSectionId,
      displaySort: d.displaySort,
      itemSectionCode: d.itemSectionCode,
      itemSectionName: d.itemSectionName,
      taxRateType: d.taxRateType,
      effective: d.effective,
    }));
  }

  /**
   * Detail + configured/unconfigured items.
   */
  async detail(itemSectionId: string) {
    const id = this.reqString(itemSectionId, 'itemSectionId');

    const dept = await this.deptRepo.findOne({
      where: { itemSectionId: id },
    });
    if (!dept) {
      throw new NotFoundException('Product department not found');
    }

    const configs = await this.configRepo.find({
      where: { productDepartment: { itemSectionId: id } as any },
      relations: ['productItem', 'org'],
      order: { dispSort: 'ASC' },
    });

    const configuredItems = configs.map((c) => ({
      itemID: (c.productItem as any).itemID,
      itemCode: (c.productItem as any).itemCode,
      itemName: (c.productItem as any).itemName,
      orgId: (c.org as any).id,
      orgName: (c.org as any).orgName,
      dispSort: c.dispSort,
    }));

    // Candidate pairs from ProductItemOrg (all items x orgs)
    const mappingsRaw = await this.itemOrgRepo.find({
      relations: ['productItem', 'org'],
    });

    // Guard against orphan mappings where relations are missing
    const mappings = mappingsRaw.filter(
      (m) => (m.productItem as any) && (m.org as any),
    );

    const configuredKey = new Set(
      configs.map((c) => {
        const itemID = (c.productItem as any).itemID;
        const orgId = (c.org as any).id;
        return `${itemID}::${orgId}`;
      }),
    );

    const unConfiguredItems = mappings
      .filter((m) => {
        const itemID = (m.productItem as any).itemID;
        const orgId = (m.org as any).id;
        const key = `${itemID}::${orgId}`;
        return !configuredKey.has(key);
      })
      .map((m) => ({
        itemID: (m.productItem as any).itemID,
        itemCode: (m.productItem as any).itemCode,
        itemName: (m.productItem as any).itemName,
        orgId: (m.org as any).id,
        orgName: (m.org as any).orgName,
      }));

    return {
      itemSectionId: dept.itemSectionId,
      displaySort: dept.displaySort,
      itemSectionCode: dept.itemSectionCode,
      itemSectionName: dept.itemSectionName,
      taxRateType: dept.taxRateType,
      effective: dept.effective,
      configuredItems,
      unConfiguredItems,
    };
  }

  /**
   * Create new department + initial configs.
   */
  async create(body: any) {
    const displaySort = this.reqInt(body.displaySort, 'displaySort');
    const itemSectionCode = this.reqString(
      body.itemSectionCode,
      'itemSectionCode',
    );
    const itemSectionName = this.reqString(
      body.itemSectionName,
      'itemSectionName',
    );
    const taxRateType = this.reqInt(body.taxRateType ?? 0, 'taxRateType');
    const effective =
      body.effective === undefined
        ? true
        : this.reqBoolean(body.effective, 'effective');

    const dup = await this.deptRepo.findOne({
      where: { itemSectionCode },
    });
    if (dup) {
      throw new ConflictException('itemSectionCode already exists');
    }

    const entity = this.deptRepo.create({
      displaySort,
      itemSectionCode,
      itemSectionName,
      taxRateType,
      effective,
      companyCode: null,
    });

    const saved = await this.deptRepo.save(entity);

    const createdConfigs: any[] = Array.isArray(
      body.createdItemSectionConfigRequests,
    )
      ? body.createdItemSectionConfigRequests
      : [];

    if (createdConfigs.length) {
      await this.applyConfigChanges(saved.itemSectionId, createdConfigs, []);
    }

    return saved;
  }

  /**
   * Update department + configs.
   */
  async update(itemSectionId: string, body: any) {
    const id = this.reqString(itemSectionId, 'itemSectionId');

    const dept = await this.deptRepo.findOne({
      where: { itemSectionId: id },
    });
    if (!dept) {
      throw new NotFoundException('Product department not found');
    }

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (
      typeof ifMatchVersion === 'number' &&
      ifMatchVersion !== (dept as any).version
    ) {
      throw new ConflictException('Version mismatch');
    }

    if (body.displaySort !== undefined) {
      dept.displaySort = this.reqInt(body.displaySort, 'displaySort');
    }
    if (body.itemSectionCode !== undefined) {
      const code = this.reqString(body.itemSectionCode, 'itemSectionCode');
      const dup = await this.deptRepo.findOne({
        where: { itemSectionCode: code },
      });
      if (dup && dup.itemSectionId !== dept.itemSectionId) {
        throw new ConflictException('itemSectionCode already exists');
      }
      dept.itemSectionCode = code;
    }
    if (body.itemSectionName !== undefined) {
      dept.itemSectionName = this.reqString(
        body.itemSectionName,
        'itemSectionName',
      );
    }
    if (body.taxRateType !== undefined) {
      dept.taxRateType = this.reqInt(body.taxRateType, 'taxRateType');
    }
    if (body.effective !== undefined) {
      dept.effective = this.reqBoolean(body.effective, 'effective');
    }

    const saved = await this.deptRepo.save(dept);

    const createdConfigs: any[] = Array.isArray(
      body.createdItemSectionConfigRequests,
    )
      ? body.createdItemSectionConfigRequests
      : [];
    const deletedConfigs: any[] = Array.isArray(
      body.deletedItemSectionConfigRequests,
    )
      ? body.deletedItemSectionConfigRequests
      : [];

    if (createdConfigs.length || deletedConfigs.length) {
      await this.applyConfigChanges(
        saved.itemSectionId,
        createdConfigs,
        deletedConfigs,
      );
    }

    return saved;
  }

  private async applyConfigChanges(
    itemSectionId: string,
    created: { dispSort: number; itemID: string; itemOrgID: string }[],
    deleted: { dispSort?: number; itemID: string; itemOrgID: string }[],
  ) {
    await this.configRepo.manager.transaction(async (manager) => {
      const dept = await manager.findOne(ProductDepartment, {
        where: { itemSectionId },
      });
      if (!dept) {
        throw new NotFoundException('Product department not found');
      }

      const itemIds = Array.from(
        new Set([...created, ...deleted].map((c) => c.itemID)),
      );
      const orgIds = Array.from(
        new Set([...created, ...deleted].map((c) => c.itemOrgID)),
      );

      const [items, orgs] = await Promise.all([
        itemIds.length
          ? manager.find(ProductItem, { where: { itemID: In(itemIds) } })
          : [],
        orgIds.length
          ? manager.find(Org, { where: { id: In(orgIds) } })
          : [],
      ]);

      const itemMap = new Map<string, ProductItem>(
        items.map((i) => [i.itemID, i] as [string, ProductItem]),
      );
      const orgMap = new Map<string, Org>(
        orgs.map((o) => [o.id, o] as [string, Org]),
      );

      // create / upsert
      for (const c of created) {
        const item = itemMap.get(c.itemID);
        const org = orgMap.get(c.itemOrgID);
        if (!item) {
          throw new NotFoundException(`Product item not found: ${c.itemID}`);
        }
        if (!org) {
          throw new NotFoundException(`Org not found: ${c.itemOrgID}`);
        }

        const existing = await manager.findOne(ItemSectionConfig, {
          where: {
            productDepartment: { itemSectionId } as any,
            productItem: { itemID: c.itemID } as any,
            org: { id: c.itemOrgID } as any,
          },
        });

        if (existing) {
          existing.dispSort = c.dispSort;
          await manager.save(existing);
        } else {
          const entity = manager.create(ItemSectionConfig, {
            productDepartment: dept,
            productItem: item,
            org,
            dispSort: c.dispSort,
          });
          await manager.save(entity);
        }
      }

      // delete
      for (const d of deleted) {
        await manager.delete(ItemSectionConfig, {
          productDepartment: { itemSectionId } as any,
          productItem: { itemID: d.itemID } as any,
          org: { id: d.itemOrgID } as any,
        });
      }
    });
  }

  private parseEffective(v: string): boolean {
    if (v === 'true' || v === 'VALID' || v === '1') return true;
    if (v === 'false' || v === 'INVALID' || v === '0') return false;
    throw new BadRequestException(
      'effective must be one of true|false|VALID|INVALID',
    );
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
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    throw new BadRequestException(`field ${field} must be boolean`);
  }
}
