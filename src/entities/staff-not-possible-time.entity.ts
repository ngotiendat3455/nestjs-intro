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
import { StaffDailySetting } from './staff-daily-setting.entity';

// Time ranges where a responsible staff cannot take reservations on a day.
// Maps to reservationResponsibleStaffNotPossibleTimeList on the frontend.
@Entity('staff_not_possible_times')
export class StaffNotPossibleTime {
  @PrimaryGeneratedColumn('uuid')
  id: string; // reserveImpossibleId

  @ManyToOne(() => StaffDailySetting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staffDailySettingId' })
  staffDailySetting: StaffDailySetting;

  @Column({ type: 'varchar', length: 5 })
  timeFrom: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  timeTo: string; // HH:mm

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

