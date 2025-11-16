import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum RoleType {
  MASTER = 'MASTER',
  CUSTOMER = 'CUSTOMER',
  RESERVATION = 'RESERVATION',
  COMMON = 'COMMON',
  REGISTER = 'REGISTER',
  CONTRACT = 'CONTRACT',
  REVENUE = 'REVENUE',
  INVENTORY = 'INVENTORY',
  MAGAZINE = 'MAGAZINE',
  CASHIER = 'CASHIER',
}

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  roleCode: string;

  @Column({ type: 'varchar', length: 255 })
  roleName: string;

  @Column({ type: 'enum', enum: RoleStatus, default: RoleStatus.ACTIVE })
  status: RoleStatus;

  // Lower number means stronger authority (e.g., 0=SystemAdmin, 3=Manager, 5=Staff)
  @Column({ type: 'int', default: 5 })
  authorityLevel: number;

  @Column({ type: 'enum', enum: RoleType, default: RoleType.MASTER })
  roleType: RoleType;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // Store per-module permission object as JSON (PostgreSQL jsonb)
  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
