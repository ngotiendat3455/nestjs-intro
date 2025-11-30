import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum OrgStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('orgs')
export class Org {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  orgCode: string;

  // Logical tenant key. Nullable for now to avoid breaking existing data;
  // can be enforced as NOT NULL once multi-tenant data is prepared.
  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  @Column({ type: 'varchar', length: 255 })
  orgName: string;

  @ManyToOne(() => Org, (o) => o.children, { nullable: true, onDelete: 'SET NULL' })
  parent?: Org | null;

  @OneToMany(() => Org, (o) => o.parent)
  children?: Org[];

  @Column({ type: 'enum', enum: OrgStatus, default: OrgStatus.ACTIVE })
  status: OrgStatus;

  @Column({ type: 'date' })
  applyStartDate: string | Date;

  @Column({ type: 'date', nullable: true })
  applyEndDate?: string | Date | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
