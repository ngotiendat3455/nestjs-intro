import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Org } from './org.entity';
import { Role } from './role.entity';

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum WorkType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACTOR = 'CONTRACTOR',
  INTERN = 'INTERN',
}

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Stable identifier across versions of the same staff
  @Index()
  @Column({ type: 'varchar', length: 64 })
  staffId: string;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  staffCode: string;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  // Extra profile fields
  @Column({ type: 'varchar', length: 255, nullable: true })
  staffName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  staffNameKana?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  staffSei?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  staffSeiKana?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  staffMei?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  staffMeiKana?: string | null;

  @ManyToOne(() => Org, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orgId' })
  org?: Org | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  orgCode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  orgName?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  companyCode?: string | null;

  @ManyToOne(() => Staff, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'managerId' })
  manager?: Staff | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  position?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  grade?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mobileMailAddress?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'enum', enum: StaffStatus, default: StaffStatus.ACTIVE })
  status: StaffStatus;

  @Column({ type: 'enum', enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  employmentStatus: EmploymentStatus;

  @Column({ type: 'enum', enum: WorkType, default: WorkType.FULL_TIME })
  workType: WorkType;

  @Column({ type: 'date', nullable: true })
  hireDate?: string | Date | null;

  @Column({ type: 'date', nullable: true })
  terminateDate?: string | Date | null;

  @Column({ type: 'date' })
  applyStartDate: string | Date;

  @Column({ type: 'date', nullable: true })
  applyEndDate?: string | Date | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // UI/aux fields to align with frontend defaultData
  @Column({ type: 'varchar', length: 64, nullable: true })
  beforeStaffCode?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  beforeStaffId?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  createDate?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  createUser?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  dispOrgApplyDate?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  editStaffId?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  employmentId?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  enterdDate?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  executiveCode?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  executiveId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  executiveName?: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  loginId?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  username?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordUpdatedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 5 })
  authorityLevel: number;

  @Column({ type: 'int', nullable: true })
  stateType?: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  updateDate?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  updateUser?: string | null;

  @Column({ type: 'boolean', default: false })
  administratorFlag: boolean;

  // Staff organization scope & combined store data
  @Column({ type: 'jsonb', nullable: true })
  staffOrganizationData?: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  organizationDataList?: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  employmentDataList?: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  combineStoreSetting?: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  combinedStore?: any[] | null;

  @Column({ type: 'jsonb', nullable: true })
  combinedStoreDataList?: any[] | null;

  // Assigned role links (per module)
  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'masterRoleId' })
  masterRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerRoleId' })
  customerRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reservationRoleId' })
  reservationRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'commonRoleId' })
  commonRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registerRoleId' })
  registerRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractRoleId' })
  contractRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'revenueRoleId' })
  revenueRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventoryRoleId' })
  inventoryRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'magazineRoleId' })
  magazineRole?: Role | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'saleRoleId' })
  saleRole?: Role | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
