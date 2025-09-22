export enum DataType {
  SHOTS_GOALS = "shots_goals",
  FOULS_CARDS = "fouls_cards",
  SAVES = "saves"
}

export interface StatData {
  label: string;
  home: number;
  away: number;
  isPercentage?: boolean;
  homeColor: string;
  awayColor: string;
}

export interface ShotEvent {
  time: number;
  player: { name: string };
  shotType: string;
  xG?: number;
  bodyPart?: string;
  assistPlayer?: { name: string };
  hasAssist?: boolean;
  isHome: boolean;
  x?: number;
  y?: number;
}

export interface FoulEvent {
  time: number;
  player?: { name: string };
  playerName?: string;
  foulType: string;
  description?: string;
  isHome?: boolean;
  team?: string;
}

export interface SaveEvent {
  time: number;
  player?: { name: string };
  playerName?: string;
  saveType?: string;
  isHome?: boolean;
  team?: string;
}