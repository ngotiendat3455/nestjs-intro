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

export enum ExecutiveStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('executives')
export class Executive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  executiveCode: string;

  @Column({ type: 'varchar', length: 255 })
  executiveName: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  position?: string | null;

  @ManyToOne(() => Org, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orgId' })
  org?: Org | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'enum', enum: ExecutiveStatus, default: ExecutiveStatus.ACTIVE })
  status: ExecutiveStatus;

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

