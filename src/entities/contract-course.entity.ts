import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

export enum ContractCourseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('contract_courses')
export class ContractCourse {
  @PrimaryGeneratedColumn('uuid')
  contractCourseId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  courseCode: string;

  @Column({ type: 'varchar', length: 255 })
  courseName: string;

  @Column({ type: 'enum', enum: ContractCourseStatus, default: ContractCourseStatus.ACTIVE })
  status: ContractCourseStatus;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

