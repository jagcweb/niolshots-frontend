// Tournament interfaces
export interface Tournament {
  id: string;
  name: string;
  slug: string;
  country?: string;
  countryCode?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// Match interfaces
export interface Match {
  id: string | number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: Score;
  awayScore?: Score;
  status: MatchStatus;
  startTimestamp: number;
  tournament?: Tournament;
  time?: MatchTime;
}

export interface Team {
  id: string | number;
  name: string;
  nameCode?: string;
  slug?: string;
  teamColors?: TeamColors;
}

export interface TeamColors {
  primary: string;
  secondary?: string;
  text: string;
}

export interface Score {
  current: number;
  display?: number;
  period1?: number;
  period2?: number;
  normaltime?: number;
  overtime?: number;
  penalties?: number;
}

export interface MatchStatus {
  code: number;
  description: string;
  type: 'notstarted' | 'inprogress' | 'finished' | 'postponed' | 'cancelled' | 'interrupted';
}

export interface MatchTime {
  injuryTime1?: number;
  injuryTime2?: number;
  injuryTime3?: number;
  injuryTime4?: number;
  currentPeriodStartTimestamp?: number;
  minute?: number;
  extra: number;
}

// Player interfaces
export interface Player {
  id: number;
  name: string;
  shortName?: string;
  slug?: string;
  jerseyNumber?: string;
  position?: string;
  userCount?: number;
}

// Shot interfaces
export interface Shot {
  player: Player;
  time: number;
  timeSeconds: number;
  teamId: number;
  isHome: boolean;
  shotType: string;
  situation?: string;
  bodyPart?: string;
  goalType?: string;
  xg: number;
  x: number;
  y: number;
  hasAssist?: boolean;
  assistPlayer?: Player;
  assistDescription?: string;
}

// Foul interfaces
export interface Foul {
  playerId: number;
  playerName: string;
  shirtNumber: number;
  team: string;
  time: number;
  timeSeconds: number;
  foulType: string;
  description: string;
  incidentId: string;
}

// Save interfaces
export interface Save {
  playerId: number;
  playerName: string;
  shirtNumber: number;
  team: string;
  time: number;
  timeSeconds: number;
  saveType: string;
  description: string;
  shotBlocked: boolean;
}

// Match detail interfaces
export interface MatchDetail extends Match {
  summary?: MatchSummary;
  statusTime?: {
    timestamp: number;
    extra?: number;
    initial?: number;
    max?: number;
    prefix?: string;
  };
  time?: MatchTime;
}

export interface MatchSummary {
  shots: Shot[];
  fouls: Foul[];
  saves: Save[];
  possession?: Possession;
}

export interface Possession {
  home: number;
  away: number;
}

// Player stats interfaces
export interface PlayerStats {
  player: Player;
  fouls: number;
  totalPass: number;
  accuratePass: number;
  minutesPlayed: number;
  rating?: number;
  teamId: number;
  position: string;
  totalLongBalls: number;
  accurateLongBalls: number;
  goalAssist: number;
  totalCross: number;
  aerialLost: number;
  aerialWon: number;
  duelLost: number;
  duelWon: number;
  challengeLost: number;
  dispossessed: number;
  bigChanceMissed: number;
  onTargetScoringAttempt: number;
  blockedScoringAttempt: number;
  totalClearance: number;
  totalTackle: number;
  touches: number;
  possessionLostCtrl: number;
  keyPass: number;
  teamFromLineup: string;
  saves: number;
  savedShotsFromInsideTheBox: number;
  goodHighClaim: number;
  totalKeeperSweeper: number;
  accurateKeeperSweeper: number;
}

// Event interfaces for the events component
export interface MatchEvent {
  time: number;
  timeSeconds: number;
  type: 'goal' | 'shot' | 'foul' | 'save';
  subType?: string;
  player?: Player;
  playerName?: string;
  team: 'home' | 'away';
  description?: string;
  situation?: string;
  bodyPart?: string;
  xg?: number;
  x?: number;
  y?: number;
}

// Statistics interfaces
export interface StatItem {
  label: string;
  home: number;
  away: number;
  isPercentage?: boolean;
  homeColor?: string;
  awayColor?: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TournamentApiResponse {
  results: TournamentApiResult[];
}

export interface TournamentApiResult {
  entity: {
    id: string;
    name: string;
    slug?: string;
    category?: {
      country?: {
        name: string;
        alpha2: string;
      };
    };
    primaryColorHex?: string;
    secondaryColorHex?: string;
  };
}

export interface MatchApiResponse {
  events: Match[];
}

export interface IncidentApiResponse {
  incidents: Incident[];
}

export interface Incident {
  id: string;
  time: number;
  incidentType: string;
  player?: Player;
  teamSide?: string;
  cardType?: string;
}

export interface MatchStatsDetail extends MatchDetail {
  summary: MatchSummary & {
    stats: PlayerStats[];
    incidents: Incident[];
  };
}
