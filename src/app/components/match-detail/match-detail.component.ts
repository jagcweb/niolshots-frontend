import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StatsService } from '../../services/stats.service';
import { MatchDetail } from '../../types/types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DataType, StatData, ShotEvent, FoulEvent, SaveEvent } from '../../utils/interfaces-enums/match-detail';

@Component({
  selector: 'app-match-detail',
  templateUrl: './match-detail.component.html',
  styleUrls: ['./match-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MatchDetailComponent implements OnInit, OnDestroy {
  matchId: string | number | null = null;
  detail: MatchDetail | null = null;
  loading = true;
  activeTab: string = 'stats';
  secondsUntilRefresh = 30;
  selectedEventType: string = DataType.SHOTS_GOALS;

  statsData: StatData[] = [];
  shotsData: ShotEvent[] = [];
  foulsData: FoulEvent[] = [];
  savesData: SaveEvent[] = [];

  searchQuery = '';
  filteredEvents: any[] = [];
  DataType = DataType;

  private subscriptions = new Subscription();
  private refreshInterval: any;
  private timerInterval: any;

  private readonly cacheKey = 'matchDetailCache';

  constructor(
    private statsService: StatsService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscriptions.add(
      this.route.paramMap.subscribe(params => {
        this.matchId = params.get('id');
        if (this.matchId) {
          const cached = this.getCachedDetail(this.matchId);
          if (cached) {
            this.detail = cached;
            this.loading = false;
            this.updateComputedData();
            this.refreshSummaryOnly();
          } else {
            this.loadDetails();
          }
          this.startAutoRefresh();
        }
      })
    );

    const urlParams = new URLSearchParams(window.location.search);
    const savedEventType = urlParams.get('eventType');
    if (savedEventType && Object.values(DataType).includes(savedEventType as DataType)) {
      this.selectedEventType = savedEventType;
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.stopAutoRefresh();
  }
  loadDetails() {
    if (this.matchId !== null) {
      this.loading = true;
      this.subscriptions.add(
        this.statsService.getMatchDetail(this.matchId as string | number).subscribe({
          next: (data) => {
            this.detail = data;
            this.cacheDetail(this.matchId as string | number, data);
            this.loading = false;
            this.updateComputedData();
          },
          error: (error) => {
            console.error('Error loading match details:', error);
            this.loading = false;
          }
        })
      );
    }
  }

  refreshSummaryOnly() {
    this.loading = true;
    if (this.matchId !== null) {
      this.subscriptions.add(
        this.statsService.getMatchDetail(this.matchId as string | number).subscribe({
          next: (data) => {
            if (this.detail && data.summary) {
              this.detail.summary = data.summary;
              this.updateComputedData();
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error refreshing summary:', error);
            this.loading = false;
          }
        })
      );
    }
  }

  private updateComputedData() {
    if (!this.detail) return;

    this.statsData = this.calculateStatsData();
    this.shotsData = this.getShotsData();
    this.foulsData = this.getFoulsData();
    this.savesData = this.getSavesData();
    this.updateFilteredEvents();
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.updateFilteredEvents();
  }

  onEventTypeChange(eventType: string) {
    this.selectedEventType = eventType;
    this.updateFilteredEvents();
  }

  onSearchQueryChange(query: string) {
    this.searchQuery = query;
    this.updateFilteredEvents();
  }

  clearSearch() {
    this.searchQuery = '';
    this.updateFilteredEvents();
  }

  private updateFilteredEvents() {
    let events: any[] = [];

    switch (this.selectedEventType) {
      case DataType.SHOTS_GOALS:
        events = this.shotsData;
        break;
      case DataType.FOULS_CARDS:
        events = this.foulsData;
        break;
      case DataType.SAVES:
        events = this.savesData;
        break;
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      events = events.filter(event => {
        const playerName = (event.player?.name || event.playerName || '').toLowerCase();
        const assistName = (event.assistPlayer?.name || '').toLowerCase();
        return playerName.includes(query) || assistName.includes(query);
      });
    }

    this.filteredEvents = events.sort((a, b) => b.time - a.time);
  }

  startAutoRefresh() {
    this.stopAutoRefresh();

    this.timerInterval = setInterval(() => {
      this.secondsUntilRefresh--;
      if (this.secondsUntilRefresh < 0) {
        this.secondsUntilRefresh = 30;
      }
    }, 1000);

    this.refreshInterval = setInterval(() => {
      if (this.activeTab === 'stats') {
        if (this.matchId !== null && this.getCachedDetail(this.matchId)) {
          this.detail = this.getCachedDetail(this.matchId);
          this.refreshSummaryOnly();
        } else {
          this.loadDetails();
        }
      }
      this.secondsUntilRefresh = 30;
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  goBack() {
    this.stopAutoRefresh();
    this.router.navigate(['/matches']);
  }

  private cacheDetail(matchId: string | number, data: MatchDetail) {
    const cacheObj = { matchId, data, timestamp: Date.now() };
    localStorage.setItem(this.cacheKey, JSON.stringify(cacheObj));
  }

  private getCachedDetail(matchId: string | number): MatchDetail | null {
    const cache = localStorage.getItem(this.cacheKey);
    if (!cache) return null;
    try {
      const parsed = JSON.parse(cache);
      if (parsed.matchId == matchId && (Date.now() - parsed.timestamp) < 60 * 60 * 1000) {
        return parsed.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  get matchTitle(): string {
    if (!this.detail) return 'Detalles del partido';
    return `${this.detail.homeTeam?.name || 'Local'} vs ${this.detail.awayTeam?.name || 'Visitante'}`;
  }

  get homeTeamName(): string {
    return this.detail?.homeTeam?.nameCode || 'Local';
  }

  get awayTeamName(): string {
    return this.detail?.awayTeam?.nameCode || 'Visitante';
  }

  get homeScore(): number {
    return this.detail?.homeScore?.current || 0;
  }

  get awayScore(): number {
    return this.detail?.awayScore?.current || 0;
  }

get matchTime(): string {
  if (!this.detail) return '';
  if (this.detail.status?.type === 'inprogress') {
    if (typeof this.detail.time?.minute === 'number') {
      return `${this.detail.time.minute}'`;
    }
    const periodStart = this.detail.time?.currentPeriodStartTimestamp || this.detail.statusTime?.timestamp;
    if (periodStart) {
      const now = Math.floor(Date.now() / 1000);
      let minute = Math.floor((now - periodStart) / 60) + 1;
      const extraSec = this.detail.statusTime?.extra || this.detail.time?.extra || 0;
      minute += Math.floor(extraSec / 60);
      return `${Math.max(minute, 0)}'`;
    }
    return `0'`;
  }
  if (this.detail.status?.type === 'finished') {
    return 'FT';
  }
  if (this.detail.startTimestamp) {
    const date = new Date(this.detail.startTimestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return '';
}

get matchState(): string {
  if (!this.detail) return '';
  if (this.detail.status?.type === 'inprogress') {
    return 'En directo';
  }
  if (this.detail.status?.type === 'finished') {
    return 'Finalizado';
  }
  return 'Programado';
}

  get homeTeamLogoUrl(): string | null {
    return this.detail?.homeTeam?.id
      ? `https://img.sofascore.com/api/v1/team/${this.detail.homeTeam.id}/image`
      : null;
  }

  get awayTeamLogoUrl(): string | null {
    return this.detail?.awayTeam?.id
      ? `https://img.sofascore.com/api/v1/team/${this.detail.awayTeam.id}/image`
      : null;
  }

  get homeTeamInitial(): string {
    return this.detail?.homeTeam?.name?.[0] || '?';
  }

  get awayTeamInitial(): string {
    return this.detail?.awayTeam?.name?.[0] || '?';
  }

  get scoreboardGradient(): string {
    if (!this.detail) return '';
    return 'linear-gradient(to right, #1a78cf, #1a78cf)';
  }

  get homeTeamColor(): string {
    return this.detail?.homeTeam?.teamColors?.primary || '#1a78cf';
  }

  get awayTeamColor(): string {
    return this.detail?.awayTeam?.teamColors?.secondary || '#e74c3c';
  }

  get searchResultsText(): string {
    if (!this.searchQuery.trim()) return '';
    const count = this.filteredEvents.length;
    return count > 0
      ? `Se encontraron ${count} coincidencias.`
      : `No se encontraron coincidencias para "${this.searchQuery}".`;
  }

  private calculateStatsData(): StatData[] {
    if (!this.detail?.summary) return [];

    const summary = this.detail.summary;
    const homeColor = this.homeTeamColor;
    const awayColor = this.awayTeamColor;

    console.log('Calculating stats data with summary:', this.detail);

    let homePossession = 50, awayPossession = 50;
    if (summary.possession) {
      homePossession = summary.possession.home ?? 50;
      awayPossession = summary.possession.away ?? 50;
    }

    return [
      /*{
        label: 'Posesión',
        home: homePossession,
        away: awayPossession,
        isPercentage: true,
        homeColor,
        awayColor
      },*/
      {
        label: 'Tiros',
        home: summary.shots?.filter((s: any) => s.isHome).length ?? 0,
        away: summary.shots?.filter((s: any) => !s.isHome).length ?? 0,
        homeColor,
        awayColor
      },
      {
        label: 'Tiros a puerta',
        home: summary.shots?.filter((s: any) => s.isHome && s.shotType === 'OnTarget').length ?? 0,
        away: summary.shots?.filter((s: any) => !s.isHome && s.shotType === 'OnTarget').length ?? 0,
        homeColor,
        awayColor
      },
      {
        label: 'Faltas',
        home: summary.fouls?.filter((f: any) => f.team === 'home').length ?? 0,
        away: summary.fouls?.filter((f: any) => f.team === 'away').length ?? 0,
        homeColor,
        awayColor
      },
      {
        label: 'Paradas',
        home: summary.saves?.filter((s: any) => s.team === 'home').length ?? 0,
        away: summary.saves?.filter((s: any) => s.team === 'away').length ?? 0,
        homeColor,
        awayColor
      }
    ];
  }

  private getShotsData(): ShotEvent[] {
    if (!this.detail?.summary?.shots) return [];
    return this.detail.summary.shots;
  }

  private getFoulsData(): FoulEvent[] {
    if (!this.detail?.summary?.fouls) return [];
    return this.detail.summary.fouls;
  }

  private getSavesData(): SaveEvent[] {
    if (!this.detail?.summary?.saves) return [];
    return this.detail.summary.saves;
  }

  calculateBarWidth(home: number, away: number, isPercentage: boolean = false): { homeWidth: number, awayWidth: number } {
    if (isPercentage) return { homeWidth: home, awayWidth: away };
    const total = home + away;
    if (total === 0) return { homeWidth: 50, awayWidth: 50 };
    const homeWidth = Math.round((home / total) * 100);
    const awayWidth = 100 - homeWidth;
    return { homeWidth, awayWidth };
  }

  getShotTypeText(shotType: string | undefined): string {
    switch ((shotType || '').toLowerCase()) {
      case 'goal': return '⚽ Gol';
      case 'ontarget':
      case 'on_target':
      case 'save': return '🎯 Tiro a puerta';
      case 'miss':
      case 'offtarget':
      case 'off_target': return '❌ Tiro fuera';
      default: return '❌ Tiro fuera';
    }
  }

  getBodyPartText(bodyPart: string | undefined): string {
    if (!bodyPart) return '-';
    const lower = bodyPart.toLowerCase();
    if (lower.includes('right') && lower.includes('foot')) return 'Pie derecho';
    if (lower.includes('left') && lower.includes('foot')) return 'Pie izquierdo';
    if (lower.includes('head')) return 'Cabeza';
    if (lower.includes('other')) return 'Otra parte';
    return bodyPart;
  }

  getXGValue(shot: any): string {
    const value = shot.xG ?? shot.xg ?? shot.expected_goals ?? shot.expectedGoals;
    if (value != null && !isNaN(parseFloat(value))) {
      return parseFloat(value).toFixed(2);
    }
    return '-';
  }

  getFoulTypeText(foulType: string | undefined): string {
    const type = (foulType || '').toLowerCase();
    if (type.includes('roja') && type.includes('doble amarilla')) return '🟨🟥 2ª Amarilla';
    if (type.includes('roja')) return '🟥 Tarjeta roja';
    if (type.includes('amarilla')) return '🟨 Tarjeta amarilla';
    if (type.includes('tarjeta')) return '🟨 Tarjeta';
    return '⚠️ Falta';
  }

  getFoulDetails(foul: any): string {
    if (foul.foulType?.toLowerCase().includes('doble amarilla')) {
      return 'Expulsión por doble amonestación';
    }
    return foul.description || '-';
  }

  getSaveTypeText(saveType: string | undefined): string {
    return saveType || 'Parada';
  }

  isGoalRow(shotType: string | undefined): boolean {
    return (shotType || '').toLowerCase() === 'goal';
  }

  getPlayerName(event: any): string {
    return event.player?.name || event.playerName || 'Desconocido';
  }

  getAssistPlayerName(shot: any): string {
    if (this.isGoalRow(shot.shotType) && shot.hasAssist && shot.assistPlayer) {
      return shot.assistPlayer.name;
    }
    return '-';
  }

  highlightText(text: string, query: string): string {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="highlight-match" style="color: black;">$1</span>');
  }

  trackByTime(index: number, event: any): any {
    return `${event.time}-${index}`;
  }

  onImgError(event: Event, side: 'home' | 'away') {
    const img = event.target as HTMLImageElement | null;
    const parent = img?.parentElement;
    if (img && parent) {
      img.style.display = 'none';
      parent.innerHTML = side === 'home' ? this.homeTeamInitial : this.awayTeamInitial;
      parent.classList.add('fallback-logo');
    }
  }
}