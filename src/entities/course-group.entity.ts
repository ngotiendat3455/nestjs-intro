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

export enum CourseGroupStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('course_groups')
export class CourseGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  groupCode: string;

  @Column({ type: 'varchar', length: 255 })
  groupName: string;

  @ManyToOne(() => CourseGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: CourseGroup | null;

  @ManyToOne(() => Org, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orgId' })
  org?: Org | null;

  @Column({ type: 'enum', enum: CourseGroupStatus, default: CourseGroupStatus.ACTIVE })
  status: CourseGroupStatus;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

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

