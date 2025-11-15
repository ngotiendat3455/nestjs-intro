import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

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

export interface Role {
  id: string;
  roleCode: string; // unique, immutable
  roleName: string;
  status: RoleStatus;
  description?: string;
  permissions: Partial<Record<ModuleKey, ModulePermission>>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

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
  private store: Role[] = [];
  private idCounter = 1;

  list(query: ListQuery) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 20;

    let data = [...this.store];

    if (query.search) {
      const s = query.search.toLowerCase();
      data = data.filter(
        (x) => x.roleCode.toLowerCase().includes(s) || x.roleName.toLowerCase().includes(s),
      );
    }
    if (query.status) data = data.filter((x) => x.status === query.status);

    if (query.sortBy) {
      const dir = query.sortOrder === 'desc' ? -1 : 1;
      const key = query.sortBy;
      data.sort((a, b) => {
        const va = (a as any)[key] ?? '';
        const vb = (b as any)[key] ?? '';
        if (va === vb) return 0;
        return va > vb ? dir : -dir;
      });
    }

    const total = data.length;
    const start = (page - 1) * pageSize;
    const pageData = data.slice(start, start + pageSize);
    return { data: pageData, page, pageSize, total, hasMore: start + pageSize < total };
  }

  getOne(id: string) {
    const role = this.store.find((x) => x.id === id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  add(body: any) {
    const roleCode = this.reqString(body.roleCode, 'roleCode');
    const roleName = this.reqString(body.roleName, 'roleName');
    const status: RoleStatus = body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const description = body.description;

    const dup = this.store.find((x) => x.roleCode === roleCode);
    if (dup) throw new ConflictException('roleCode already exists');

    const now = new Date().toISOString();
    const role: Role = {
      id: this.genId(),
      roleCode,
      roleName,
      status,
      description,
      permissions: {},
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Optional seed permissions
    if (body.permissions && typeof body.permissions === 'object') {
      for (const key of Object.keys(body.permissions)) {
        const mk = key as ModuleKey;
        if (!AllowedScopes[mk]) continue;
        const scopes = this.validateScopes(mk, body.permissions[key].scopes ?? []);
        role.permissions[mk] = {
          moduleKey: mk,
          scopes,
          config: body.permissions[key].config,
          version: 1,
          updatedAt: now,
        };
      }
    }

    this.store.push(role);
    return role;
  }

  edit(id: string, body: any) {
    const role = this.store.find((x) => x.id === id);
    if (!role) throw new NotFoundException('Role not found');

    const ifMatchVersion: number | undefined = body.ifMatchVersion;
    if (typeof ifMatchVersion === 'number' && ifMatchVersion !== role.version) {
      throw new ConflictException('Version mismatch');
    }

    if (typeof body.roleName === 'string' && body.roleName.trim().length > 0) role.roleName = body.roleName.trim();
    if (body.status === 'ACTIVE' || body.status === 'INACTIVE') role.status = body.status;
    if (body.description !== undefined) role.description = body.description;

    role.updatedAt = new Date().toISOString();
    role.version += 1;
    return role;
  }

  getPermissions(id: string) {
    const role = this.getOne(id);
    return role.permissions;
  }

  getPermissionForModule(id: string, moduleKey: ModuleKey) {
    const role = this.getOne(id);
    const mod = role.permissions[moduleKey];
    if (mod) return mod;
    // Return empty default instead of 404 for easier form init
    return { moduleKey, scopes: [], config: undefined, version: 0, updatedAt: role.updatedAt } as ModulePermission;
  }

  upsertPermission(id: string, moduleKey: ModuleKey, body: any) {
    const role = this.getOne(id);
    if (!AllowedScopes[moduleKey]) throw new BadRequestException('Unknown moduleKey');

    const scopes = this.validateScopes(moduleKey, body.scopes ?? []);
    const config = body.config;

    const existing = role.permissions[moduleKey];
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
    } else {
      role.permissions[moduleKey] = {
        moduleKey,
        scopes,
        config,
        version: 1,
        updatedAt: now,
      };
    }
    // bump role version too
    role.version += 1;
    role.updatedAt = now;
    return role.permissions[moduleKey]!;
  }

  // Helpers
  private genId() {
    const id = `ROL-${String(this.idCounter).padStart(3, '0')}`;
    this.idCounter += 1;
    return id;
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
