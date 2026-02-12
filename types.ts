export enum UserRole {
  MANAGER = 'MANAGER',
  STAFF = 'STAFF'
}

export enum TaskType {
  ROUTINE_HOUSEKEEPING = 'Routine Housekeeping',
  BROOMING = 'Brooming',
  MOPPING = 'Mopping',
  DRIVEWAY = 'Driveway Cleaning',
  GLASS_CLEANING = 'Glass Cleaning',
  STAIRCASE = 'Staircase Cleaning'
}

export enum Frequency {
  DAILY = 'Daily',
  WEEKLY = 'Weekly'
}

export interface TaskDefinition {
  id: string;
  title: string;
  type: TaskType;
  frequency: Frequency;
  area: string;
  block?: number;
}

export interface TaskLog {
  id: string;
  taskId: string;
  staffId: number;
  timestamp: number;
  status: 'COMPLETED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  imageUrl?: string;
  aiFeedback?: string;
  aiRating?: number;
  block?: number;
  floor?: number;
  flat?: string;
}

export interface SupplyRequest {
  id: string;
  item: string;
  quantity: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'OPEN' | 'FULFILLED' | 'REJECTED';
  requesterId: number;
  timestamp: number;
}

export interface StaffMember {
  id: number;
  name: string;
  role: 'Housekeeper';
  avatar: string;
  blockAssignment: string;
}

export interface PunchLog {
  id: string;
  staffId: number;
  type: 'IN' | 'OUT';
  timestamp: number;
}

export const BLOCKS = [1, 2, 3, 4, 5, 6];
export const FLOORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Building structure from floor plans
// Each block has floors, and each floor has flats
export interface BlockConfig {
  block: number;
  label: string;
  flatsPerFloor: (floor: number) => string[];
}

const makeFlats = (letters: string[]): ((floor: number) => string[]) => () => letters;

export const BUILDING_STRUCTURE: BlockConfig[] = [
  {
    block: 1,
    label: 'Block 1',
    flatsPerFloor: (floor: number) =>
      floor <= 8
        ? ['A', 'B', 'C', 'D', 'E', 'F']
        : ['A', 'B', 'C'],
  },
  {
    block: 2,
    label: 'Block 2',
    flatsPerFloor: makeFlats(['A', 'B', 'C', 'D']),
  },
  {
    block: 3,
    label: 'Block 3',
    flatsPerFloor: makeFlats(['A', 'B', 'C', 'D', 'E']),
  },
  {
    block: 4,
    label: 'Block 4',
    flatsPerFloor: makeFlats(['A', 'B', 'C', 'D', 'E']),
  },
  {
    block: 5,
    label: 'Block 5',
    flatsPerFloor: makeFlats(['A', 'B', 'C', 'D', 'E']),
  },
  {
    block: 6,
    label: 'Block 6',
    flatsPerFloor: makeFlats(['A', 'B', 'C', 'D']),
  },
];

// Floor-level task types that staff can perform
export const FLOOR_TASKS: { type: TaskType; label: string; icon: string; perFlat: boolean }[] = [
  { type: TaskType.ROUTINE_HOUSEKEEPING, label: 'Routine Housekeeping', icon: '🗑️', perFlat: true },
  { type: TaskType.BROOMING, label: 'Lobby Brooming', icon: '🧹', perFlat: false },
  { type: TaskType.MOPPING, label: 'Floor Mopping', icon: '🧼', perFlat: false },
  { type: TaskType.STAIRCASE, label: 'Staircase Cleaning', icon: '🪜', perFlat: false },
];

// Block-level tasks (one per block, not per-floor)
export const BLOCK_TASKS: { id: string; type: TaskType; label: string; icon: string }[] = [
  { id: 'glass-entrance', type: TaskType.GLASS_CLEANING, label: 'Entrance Glass Cleaning', icon: '🪟' },
];

// Common area tasks (not tied to a specific block/floor)
export const COMMON_TASKS: { id: string; type: TaskType; label: string; icon: string; area: string }[] = [
  { id: 'driveway-broom', type: TaskType.DRIVEWAY, label: 'Driveway Cleaning', icon: '🚗', area: 'Society Driveway' },
];
