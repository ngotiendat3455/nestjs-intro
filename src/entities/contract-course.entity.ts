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
import { CourseGroup } from './course-group.entity';
import { CourseCategory } from './course-category.entity';

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

  // Optional relation to course group master (contractCourseGroupId on FE)
  @ManyToOne(() => CourseGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractCourseGroupId' })
  courseGroup?: CourseGroup | null;

  // Optional relation to course category master (contractCourseCategoryId on FE)
  @ManyToOne(() => CourseCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractCourseCategoryId' })
  courseCategory?: CourseCategory | null;

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
