import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Org } from './org.entity';

@Entity('reservation_store_settings')
@Unique('uq_reservation_store_setting_org', ['org'])
export class ReservationStoreSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Org, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: Org;

  @Column({ type: 'varchar', length: 32 })
  possibleDayCode: string;

  @Column({ type: 'varchar', length: 32 })
  possibleMonthCode: string;

  @Column({ type: 'boolean', default: true })
  publicHoliday: boolean;

  @Column({ type: 'boolean', default: false })
  regularHolidayMonday: boolean;

  @Column({ type: 'boolean', default: false })
  regularHolidayTuesday: boolean;

  @Column({ type: 'boolean', default: false })
  regularHolidayWednesday: boolean;

  @Column({ type: 'boolean', default: false })
  regularHolidayThursday: boolean;

  @Column({ type: 'boolean', default: false })
  regularHolidayFriday: boolean;

  @Column({ type: 'boolean', default: false })
  regularHolidaySaturday: boolean;

  @Column({ type: 'boolean', default: false })
  regularHolidaySunday: boolean;

  @Column({ type: 'varchar', length: 5 })
  weekDayBiztimeStart: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  weekDayBiztimeEnd: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  weekendDayBiztimeStart: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  weekendDayBiztimeEnd: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  holidayBiztimeStart: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  holidayBiztimeEnd: string; // HH:mm

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  specialHolidays: any[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  frameRequests: any[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  mailAddress: any[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

