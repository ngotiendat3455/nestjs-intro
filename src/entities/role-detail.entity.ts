import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Role } from './role.entity';

export enum AccessLevel {
  OWN_STORE = 'OWN_STORE',
  UNDER_ORG = 'UNDER_ORG',
  UNDER_OWN_ORG = 'UNDER_OWN_ORG',
  ALL_STORES = 'ALL_STORES',
}

@Entity('role_details')
export class RoleDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role!: Role;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  featureCode: string;

  @Column({ type: 'enum', enum: AccessLevel, default: AccessLevel.OWN_STORE })
  accessLevel: AccessLevel;

  @Column({ type: 'boolean', default: false })
  edit: boolean;

  // Flags and options
  @Column({ type: 'boolean', default: false })
  useMailSend: boolean;
  @Column({ type: 'boolean', default: false })
  mailSend: boolean;
  @Column({ type: 'boolean', default: false })
  useOutput: boolean;
  @Column({ type: 'boolean', default: false })
  possibleToOutput: boolean;
  @Column({ type: 'boolean', default: false })
  useImport: boolean;
  @Column({ type: 'boolean', default: false })
  possibleToImport: boolean;
  @Column({ type: 'boolean', default: false })
  useOrganize: boolean;
  @Column({ type: 'varchar', length: 64, nullable: true })
  followOrgId?: string | null;
  @Column({ type: 'boolean', default: false })
  isDisabled: boolean;
  @Column({ type: 'boolean', default: false })
  possibleToManagerItem: boolean;
  @Column({ type: 'boolean', default: false })
  possibleToOutputExcel: boolean;
  @Column({ type: 'boolean', default: false })
  possibleToOutputPdf: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

