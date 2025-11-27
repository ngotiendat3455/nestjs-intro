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
import { ReservationStoreSetting } from './reservation-store-setting.entity';
import { CourseGroup } from './course-group.entity';

// Represents one time slot (frame) on the reservation dashboard.
@Entity('reserve_frames')
@Index('ix_reserve_frame_store_date_group', ['reservationStoreSetting', 'targetDate', 'courseGroup', 'frameNumber'])
export class ReserveFrame {
  @PrimaryGeneratedColumn('uuid')
  id: string; // reserveFrameId

  @ManyToOne(() => ReservationStoreSetting, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationStoreSettingId' })
  reservationStoreSetting: ReservationStoreSetting;

  @ManyToOne(() => CourseGroup, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseGroupId' })
  courseGroup: CourseGroup;

  @Column({ type: 'date' })
  targetDate: string | Date;

  @Column({ type: 'int' })
  frameNumber: number;

  @Column({ type: 'varchar', length: 5 })
  timeFrom: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  timeTo: string; // HH:mm

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

