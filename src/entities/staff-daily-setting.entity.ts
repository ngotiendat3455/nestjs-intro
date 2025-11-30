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
import { Staff } from './staff.entity';

// Daily schedule/responsible setting for a staff on a given date.
// Maps to IReservationResponsibleStaff / ResponsibleStaffListType (timeFrom/timeTo, flags).
@Entity('staff_daily_settings')
@Index('ix_staff_daily_setting_org_staff_date', ['org', 'staff', 'targetDate'])
export class StaffDailySetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Org, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: Org;

  @ManyToOne(() => Staff, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffId' })
  staff: Staff;

  @Column({ type: 'date' })
  targetDate: string | Date;

  // Working time window for this staff on targetDate.
  @Column({ type: 'varchar', length: 5, nullable: true })
  timeFrom: string | null; // HH:mm

  @Column({ type: 'varchar', length: 5, nullable: true })
  timeTo: string | null; // HH:mm

  // Main responsible flag (responsibleFlg on FE).
  @Column({ type: 'boolean', default: false })
  responsibleFlg: boolean;

  // Help staff flag (helpStaffFlg on FE).
  @Column({ type: 'boolean', default: false })
  helpStaffFlg: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

