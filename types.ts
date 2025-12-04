import { Vector3 } from 'three';

export const TRACK_WIDTH = 12;
export const MAX_SPEED = 0.4; // Approx 80km/h
export const ACCELERATION = 0.006;
export const BRAKING = 0.02;
export const FRICTION = 0.002;
export const OFF_ROAD_FRICTION = 0.06;
export const TURN_SPEED = 0.0125; // Reduced by 50% (was 0.025)

// Jump & Gravity
export const GRAVITY = 0.015;
export const JUMP_FORCE = 0.35;

// Quiz & Boost Constants
export const BOOST_MULTIPLIER = 1.5; // 50% faster
export const PENALTY_MULTIPLIER = 0.5; // 50% slower
export const EFFECT_DURATION = 600; // Frames (approx 10 seconds at 60fps)

export const CHUNK_LENGTH = 40;
export const CHUNKS_TO_RENDER = 8;

export enum ChunkType {
  STRAIGHT = 'STRAIGHT',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  U_TURN_LEFT = 'U_TURN_LEFT',
  U_TURN_RIGHT = 'U_TURN_RIGHT',
}

export enum ObstacleType {
  COIN = 'COIN',
  CRATE = 'CRATE',
  RAMP = 'RAMP'
}

export interface ObstacleData {
  id: string;
  type: ObstacleType;
  position: Vector3;
  rotation: number; // Y-axis rotation
  isCollected?: boolean; // For coins
}

export interface ItemBoxData {
  id: string;
  position: Vector3;
  text: string;
  isCorrect: boolean;
  isCollected: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string; // e.g., "「ㄘㄞˇ」虹"
  options: string[]; // e.g., ["採", "彩", "踩"]
  correctIndex: number;
}

export interface TrackChunkData {
  id: number;
  type: ChunkType;
  startPoint: Vector3;
  endPoint: Vector3;
  startAngle: number;
  endAngle: number;
  controlPoints: Vector3[];
  items: ItemBoxData[]; // Quiz Boxes
  obstacles: ObstacleData[]; // Coins, Crates, Ramps
  assignedQuestion?: QuizQuestion; 
}

export enum GameStatus {
  IDLE = 'IDLE',
  RACING = 'RACING',
  FINISHED = 'FINISHED',
}