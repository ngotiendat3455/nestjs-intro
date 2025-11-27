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
import { ReserveFrame } from './reserve-frame.entity';

// Time ranges within a frame where reservation is not possible.
@Entity('reserve_frame_not_possible_times')
export class ReserveFrameNotPossibleTime {
  @PrimaryGeneratedColumn('uuid')
  id: string; // reserveImpossibleId

  @ManyToOne(() => ReserveFrame, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reserveFrameId' })
  reserveFrame: ReserveFrame;

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

