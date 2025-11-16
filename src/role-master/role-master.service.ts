import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role as RoleEntity } from '../entities/role.entity';

type RoleStatus = 'ACTIVE' | 'INACTIVE';
export type ModuleKey =
  | 'basicMaster'
  | 'customerManagement'
  | 'commonManagement'
  | 'reservationManagement'
  | 'cashierManagement'
  | 'contractManagement'
  | 'revenueManagement'
  | 'inventoryManagement'
  | 'mailManagement';

export interface ModulePermission {
  moduleKey: ModuleKey;
  scopes: string[];
  config?: any;
  version: number;
  updatedAt: string; // ISO
}

// Persisted Role entity is defined in entities; we keep ModulePermission for JSON shape

interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: RoleStatus;
  sortBy?: 'roleCode' | 'roleName' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

const AllowedScopes: Record<ModuleKey, string[]> = {
  basicMaster: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
  customerManagement: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
  commonManagement: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
  reservationManagement: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'CANCEL'],
  cashierManagement: ['OPEN_DRAWER', 'CLOSE_DRAWER', 'REFUND', 'VOID', 'X_REPORT', 'Z_REPORT'],
  contractManagement: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'TERMINATE'],
  revenueManagement: ['VIEW', 'EXPORT', 'ADJUST'],
  inventoryManagement: ['VIEW', 'RECEIVE', 'ISSUE', 'ADJUST', 'TRANSFER'],
  mailManagement: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'SEND'],
};

@Injectable()
export class RoleMasterService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  async list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;
    const qb = this.roleRepo.createQueryBuilder('r');
    if (query.search) {
      qb.andWhere("(r.roleCode ILIKE :s OR r.roleName ILIKE :s)", { s: `%${query.search}%` });
    }
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    const sortMap: Record<string, string> = { roleCode: 'r.roleCode', roleName: 'r.roleName', updatedAt: 'r.updatedAt' };
    const sortFld = query.sortBy ? sortMap[query.sortBy] : 'r.updatedAt';
    const sortOrd = (query.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortFld, sortOrd).skip((page - 1) * pageSize).take(pageSize);
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, page, pageSize, total, hasMore: (page - 1) * pageSize + rows.length < total };
  }

  async getOne(id: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async add(body: any) {
    const roleCode = this.reqString(body.roleCode, 'roleCode');
    const roleName = this.reqString(body.roleName, 'roleName');
    const status: RoleStatus = body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const description = body.description;
    const authorityLevel = typeof body.authorityLevel === 'number' ? body.authorityLevel : 5;
    const roleType = body.roleType ?? undefined;

    const dup = await this.roleRepo.findOne({ where: { roleCode } });
    if (dup) throw new ConflictException('roleCode already exists');

    const role = this.roleRepo.create({
      roleCode,
      roleName,
      status: status as any,
      description,
      authorityLevel,
      roleType,
      // keep JSON permissions for module-level config
      permissions: {},
    });

    if (body.permissions && typeof body.permissions === 'object') {
      const now = new Date().toISOString();
      const perms: any = {};
      for (const key of Object.keys(body.permissions)) {
        const mk = key as ModuleKey;
        if (!AllowedScopes[mk]) continue;
        const scopes = this.validateScopes(mk, body.permissions[key].scopes ?? []);
        perms[mk] = {
          moduleKey: mk,
          scopes,
          config: body.permissions[key].config,
          version: 1,
          updatedAt: now,
        } as ModulePermission;
      }
      (role as any).permissions = perms;
    }

    const saved = await this.roleRepo.save(role);
    return saved;
  }

  async edit(id: string, body: any) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== role.version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.roleName === 'string' && body.roleName.trim().length > 0) role.roleName = body.roleName.trim();
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') (role as any).status = body.status;
    if (body.description !== undefined) role.description = body.description ?? null;
    if (body.authorityLevel !== undefined) (role as any).authorityLevel = Number(body.authorityLevel);
    if (body.roleType !== undefined) (role as any).roleType = body.roleType;

    const saved = await this.roleRepo.save(role);
    return saved;
  }

  async getPermissions(id: string) {
    const role = await this.getOne(id);
    return (role as any).permissions || {};
  }

  async getPermissionForModule(id: string, moduleKey: ModuleKey) {
    const role = await this.getOne(id);
    const perms = ((role as any).permissions || {}) as Partial<Record<ModuleKey, ModulePermission>>;
    const mod = perms[moduleKey];
    if (mod) return mod;
    return {
      moduleKey,
      scopes: [],
      config: undefined,
      version: 0,
      updatedAt: (role.updatedAt as any)?.toISOString?.() || new Date().toISOString(),
    } as ModulePermission;
  }

  async upsertPermission(id: string, moduleKey: ModuleKey, body: any) {
    const role = await this.getOne(id);
    if (!AllowedScopes[moduleKey]) throw new BadRequestException('Unknown moduleKey');
    const scopes = this.validateScopes(moduleKey, body.scopes ?? []);
    const config = body.config;
    const perms = ((role as any).permissions || {}) as Partial<Record<ModuleKey, ModulePermission>>;
    const existing = perms[moduleKey];
    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (existing && typeof ifMatchVersion === 'number' && ifMatchVersion !== existing.version) {
      throw new ConflictException('Version mismatch');
    }
    const now = new Date().toISOString();
    if (existing) {
      existing.scopes = scopes;
      existing.config = config;
      existing.version += 1;
      existing.updatedAt = now;
      perms[moduleKey] = existing;
    } else {
      perms[moduleKey] = {
        moduleKey,
        scopes,
        config,
        version: 1,
        updatedAt: now,
      } as ModulePermission;
    }
    (role as any).permissions = perms;
    const saved = await this.roleRepo.save(role);
    // return the updated module permission
    return (saved as any).permissions[moduleKey] as ModulePermission;
  }

  private reqString(v: any, field: string) {
    if (typeof v !== 'string' || v.trim().length === 0) throw new BadRequestException(`field ${field} is required string`);
    return v.trim();
  }

  private validateScopes(moduleKey: ModuleKey, scopes: any): string[] {
    if (!Array.isArray(scopes)) throw new BadRequestException('scopes must be array');
    const allowed = AllowedScopes[moduleKey];
    const cleaned = scopes.map((s) => String(s)).filter((s) => allowed.includes(s));
    const invalid = scopes.filter((s: any) => !allowed.includes(String(s)));
    if (invalid.length > 0) throw new BadRequestException(`invalid scopes for ${moduleKey}: ${invalid.join(',')}`);
    return cleaned;
  }
}
