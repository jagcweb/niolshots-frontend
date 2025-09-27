import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StatsService } from '../../services/stats.service';
import { MatchDetail, MatchStatsDetail } from '../../types/types';
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
  detail: MatchStatsDetail | null = null;
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
  scoreboardGradient: string = 'linear-gradient(to right, #f0f0f0, #d0d0d0)';
  searchResultsText: string = '';

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
            this.detail = {
              id: data.id || 0,
              status: data.status || { code: 0, description: 'Unknown', type: 'notstarted' },
              startTimestamp: data.startTimestamp || Math.floor(Date.now() / 1000),
              homeTeam: data.homeTeam,
              awayTeam: data.awayTeam,
              time: data.time,
              homeScore: data.homeScore,
              awayScore: data.awayScore,
              tournament: data.tournament,
              summary: {
                shots: data.summary?.shots || [],
                stats: data.summary?.stats || [],
                fouls: data.summary?.fouls || [],
                saves: data.summary?.saves || [],
                incidents: data.summary?.incidents || []
              }
            };
            
            this.cacheDetail(this.matchId as string | number, this.detail);
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
              this.detail.summary = {
                shots: data.summary.shots || [],
                stats: data.summary.stats || [],
                fouls: data.summary.fouls || [],
                saves: data.summary.saves || [],
                incidents: data.summary.incidents || []
              };
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
    if (!this.detail) {
      return;
    }
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
      if (this.secondsUntilRefresh < 0) this.secondsUntilRefresh = 30;
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
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  goBack() {
    this.stopAutoRefresh();
    this.router.navigate(['/matches']);
  }

  private cacheDetail(matchId: string | number, data: MatchDetail) {
    localStorage.setItem(this.cacheKey, JSON.stringify({ matchId, data, timestamp: Date.now() }));
  }

  private getCachedDetail(matchId: string | number): MatchStatsDetail | null {
    const cache = localStorage.getItem(this.cacheKey);
    if (!cache) return null;
    try {
      const parsed = JSON.parse(cache);
      if (parsed.matchId == matchId && (Date.now() - parsed.timestamp) < 60 * 60 * 1000) {
        const data = parsed.data as MatchStatsDetail;

        data.summary = {
          shots: data.summary?.shots || [],
          stats: data.summary?.stats || [],
          fouls: data.summary?.fouls || [],
          saves: data.summary?.saves || [],
          incidents: data.summary?.incidents || []
        };

        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ----------------------------
  // Getters
  // ----------------------------
  get matchTitle(): string {
    const title = !this.detail ? 'Detalles del partido' : 
      `${this.detail.homeTeam?.name || 'Local'} vs ${this.detail.awayTeam?.name || 'Visitante'}`;
    return title;
  }

  get homeTeamName(): string {
    const name = this.detail?.homeTeam?.name || 'Local';
    return name;
  }

  get awayTeamName(): string {
    const name = this.detail?.awayTeam?.name || 'Visitante';
    return name;
  }

  get homeScore(): number {
    const score = typeof this.detail?.homeScore === 'number' ? this.detail.homeScore : 0;
    return score;
  }

  get awayScore(): number {
    const score = typeof this.detail?.awayScore === 'number' ? this.detail.awayScore : 0;
    return score;
  }

  get matchTime(): string {
    if (!this.detail) return '';
    if (this.detail.status?.type === 'inprogress') {
      const minute = this.detail.time?.minute;
      if (typeof minute === 'number') return `${minute}'`;
      const periodStart = this.detail.time?.currentPeriodStartTimestamp || this.detail.statusTime?.timestamp;
      if (periodStart) {
        const now = Math.floor(Date.now() / 1000);
        let calcMinute = Math.floor((now - periodStart) / 60) + 1;
        const extraSec = this.detail.time?.extra || 0;
        calcMinute += Math.floor(extraSec / 60);
        return `${Math.max(calcMinute, 0)}'`;
      }
      return `0'`;
    }
    if (this.detail.status?.type === 'finished') return 'FT';
    return '';
  }

  get matchState(): string {
    if (!this.detail) return '';
    switch (this.detail.status?.type) {
      case 'inprogress': return 'En directo';
      case 'finished': return 'Finalizado';
      default: return 'Programado';
    }
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
    return this.detail?.homeTeam?.slug?.[0]?.toUpperCase() || '?';
  }

  get awayTeamInitial(): string {
    return this.detail?.awayTeam?.slug?.[0]?.toUpperCase() || '?';
  }

  get homeTeamColor(): string {
    return this.detail?.homeTeam?.teamColors?.primary || '#1a78cf';
  }

  get awayTeamColor(): string {
    return this.detail?.awayTeam?.teamColors?.secondary || '#e74c3c';
  }

  // ----------------------------
  // Stats, shots, fouls, saves
  // ----------------------------
  private calculateStatsData(): StatData[] {
    if (!this.detail?.summary) {
      return [];
    }
    const summary = this.detail.summary;
    const homeColor = this.homeTeamColor;
    const awayColor = this.awayTeamColor;

    const stats = [
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

    return stats;
  }

  private getShotsData(): ShotEvent[] {
    return this.detail?.summary?.shots ?? [];
  }

  private getFoulsData(): FoulEvent[] {
    return this.detail?.summary?.fouls ?? [];
  }

  private getSavesData(): SaveEvent[] {
    return this.detail?.summary?.saves ?? [];
  }

  calculateBarWidth(home: number, away: number, isPercentage: boolean = false): { homeWidth: number, awayWidth: number } {
    if (isPercentage) return { homeWidth: home, awayWidth: away };
    const total = home + away;
    if (total === 0) return { homeWidth: 50, awayWidth: 50 };
    const homeWidth = Math.round((home / total) * 100);
    return { homeWidth, awayWidth: 100 - homeWidth };
  }

  // Métodos auxiliares de visualización
  getShotTypeText(shotType: string | undefined): string {
    switch ((shotType || '').toLowerCase()) {
      case 'goal': return '⚽ Gol';
      case 'ontarget': case 'on_target': case 'save': return '🎯 Tiro a puerta';
      case 'miss': case 'offtarget': case 'off_target': return '❌ Tiro fuera';
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
    return value != null && !isNaN(parseFloat(value)) ? parseFloat(value).toFixed(2) : '-';
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
    if (foul.foulType?.toLowerCase().includes('doble amarilla')) return 'Expulsión por doble amonestación';
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