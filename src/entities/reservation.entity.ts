import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Org } from './org.entity';
import { Customer } from './customer.entity';
import { ContractCourse } from './contract-course.entity';
import { CourseGroup } from './course-group.entity';
import { ReserveFrame } from './reserve-frame.entity';
import { Media } from './media.entity';
import { Staff } from './staff.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string; // reservationInformationId

  @ManyToOne(() => Org, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: Org;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @ManyToOne(() => ContractCourse, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractCourseId' })
  contractCourse: ContractCourse;

  @ManyToOne(() => CourseGroup, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractCourseGroupId' })
  courseGroup: CourseGroup;

  @ManyToOne(() => ReserveFrame, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reserveFrameId' })
  reserveFrame?: ReserveFrame | null;

  @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'mediaId' })
  media?: Media | null;

  @ManyToOne(() => Staff, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsibleStaffId' })
  responsibleStaff?: Staff | null;

  @Column({ type: 'date' })
  reserveDay: string | Date;

  @Column({ type: 'varchar', length: 5 })
  desiredTime: string; // HH:mm

  @Column({ type: 'int' })
  treatmentTime: number;

  @Column({ type: 'varchar', length: 32 })
  reserveStatusCode: string; // maps to ReserveStatus.code

  @Column({ type: 'boolean', default: false })
  cancelFlag: boolean;

  @Column({ type: 'int', default: 0 })
  cancelType: number;

  @Column({ type: 'varchar', length: 64 })
  managementNumber: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  customerClass?: string | null;

  @Column({ type: 'text', nullable: true })
  requests?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

