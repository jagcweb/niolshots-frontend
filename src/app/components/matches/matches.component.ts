import { Component, OnInit, Output, EventEmitter, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatchesService } from '../../services/matches.service';
import { FavoritesService } from '../../services/favorites.service';
import { DateService } from '../../services/date.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatchDetailEventsComponent } from '../match-detail-events/match-detail-events.component';
import { getTranslatedTournamentName, getTranslatedCountryName, getCountryFlag } from '../../utils/utils';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-matches',
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.scss'],
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [CommonModule, FormsModule, MatchDetailEventsComponent]
})
export class MatchesComponent implements OnInit, OnDestroy {
  @Output() matchSelected = new EventEmitter<string | number>();
  
  matches: any[] = [];
  filteredMatches: any[] = [];
  loading = true;
  filterType: string = 'all';
  searchText: string = '';
  currentDate: string = '';
  selectedTournamentId: string | null = null;
  private subscription: Subscription = new Subscription();
  private lastRequestedDate: string = '';

  constructor(
    private matchesService: MatchesService,
    private favoritesService: FavoritesService,
    private dateService: DateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentDate = this.dateService.getCurrentDate();
    this.loadMatches(this.currentDate);

    this.subscription.add(
      this.dateService.currentDate$.subscribe(date => {
        this.currentDate = date;
        this.loadMatches(date);
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadMatches(date: string) {
    this.loading = true;
    this.matches = [];
    this.filteredMatches = [];
    this.lastRequestedDate = date;
    this.matchesService.getMatches(date).subscribe({
      next: (data) => {
        if (date === this.lastRequestedDate) { // solo si es la última petición
          this.matches = data;
          this.applyFilters();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  changeDate(days: number) {
    // Usar el servicio de fecha en lugar de manejar la fecha localmente
    if (days < 0) {
      this.dateService.goToPreviousDay();
    } else if (days > 0) {
      this.dateService.goToNextDay();
    }
  }

  getDateDisplay(): string {
    return this.dateService.getDateDisplay();
  }

  applyFilters() {
    let filtered = [...this.matches];

    // --- FILTRO POR FECHA EXACTA UTC ---
    if (this.currentDate) {
      const selectedDateUTC = new Date(this.currentDate + "T00:00:00Z");
      filtered = filtered.filter(match => {
        const matchUTCDate = new Date(match.startTimestamp * 1000);
        return (
          matchUTCDate.getUTCFullYear() === selectedDateUTC.getUTCFullYear() &&
          matchUTCDate.getUTCMonth() === selectedDateUTC.getUTCMonth() &&
          matchUTCDate.getUTCDate() === selectedDateUTC.getUTCDate()
        );
      });
    }
    // -----------------------------------

    // Filtro por torneo seleccionado
    if (this.selectedTournamentId) {
      filtered = filtered.filter(match => match.tournament?.id === this.selectedTournamentId);
    }

    // Filtro por estado
    if (this.filterType === 'live')
      filtered = filtered.filter(m => m.status.type === 'inprogress');
    else if (this.filterType === 'upcoming')
      filtered = filtered.filter(m => m.status.type === 'notstarted');
    else if (this.filterType === 'finished')
      filtered = filtered.filter(m => m.status.type === 'finished');

    // Filtro por búsqueda
    if (this.searchText) {
      const query = this.searchText.toLowerCase();
      filtered = filtered.filter(match =>
        match.homeTeam?.name?.toLowerCase().includes(query) ||
        match.awayTeam?.name?.toLowerCase().includes(query) ||
        match.tournament?.name?.toLowerCase().includes(query)
      );
    }

    // Ordenar por hora de inicio
    filtered.sort((a, b) => a.startTimestamp - b.startTimestamp);

    this.filteredMatches = filtered;
  }

  setFilter(type: string) {
    this.filterType = type;
    this.applyFilters();
  }

  onSearch(text: string) {
    this.searchText = text;
    this.applyFilters();
  }

  onTournamentSelected(tournamentId: string | null) {
    this.selectedTournamentId = tournamentId;
    this.applyFilters();
  }

  selectMatch(matchId: string | number) {
    this.router.navigate(['/match', matchId]);
  }

  toggleFavorite(tournamentName: string, event: Event) {
    event.stopPropagation();
    
    if (!this.favoritesService.isFavorite(tournamentName)) {
      this.favoritesService.addFavorite(tournamentName);
    } else {
      this.favoritesService.removeFavorite(tournamentName);
    }
  }

  isFavorite(tournamentName: string): boolean {
    return this.favoritesService.isFavorite(tournamentName);
  }

  getMatchTime(match: any): string {
    if (match.status.type === 'inprogress') {
      // Si la API proporciona el minuto, úsalo
      if (typeof match.time?.minute === 'number') {
        return `${match.time.minute}'`;
      }

      // Si no, calcula el minuto usando los timestamps
      const periodStart = match.time?.currentPeriodStartTimestamp || match.statusTime?.timestamp;
      if (periodStart) {
        const now = Math.floor(Date.now() / 1000);
        let minute = Math.floor((now - periodStart) / 60) + 1;

        // Suma tiempo extra si existe
        const extraSec = match.statusTime?.extra || match.time?.extra || 0;
        minute += Math.floor(extraSec / 60);

        // Nunca mostrar valores negativos
        return `${Math.max(minute, 0)}'`;
      }

      // Si no hay información suficiente, muestra 0'
      return `0'`;
    }

    if (match.status.type === 'finished') {
      return 'Finalizado';
    }

    // Para partidos no empezados, muestra la hora de inicio local
    const dt = new Date(match.startTimestamp * 1000);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getMatchStatus(match: any): string {
    const isLive = match.status.type === 'inprogress';
    const isFinished = match.status.type === 'finished';
    
    if (isLive) return 'EN DIRECTO';
    if (isFinished) return 'Finalizado';
    return this.getMatchTime(match);
  }

  getGroupedMatches() {
    const tournamentGroups: { [key: string]: any } = {};
    const noTournamentMatches: any[] = [];

    this.filteredMatches.forEach(match => {
      if (match.tournament) {
        const tournamentId = match.tournament.id;
        if (!tournamentGroups[tournamentId]) {
          tournamentGroups[tournamentId] = {
            id: tournamentId,
            name: match.tournament.name || "Torneo sin nombre",
            country: match.tournament.category?.name || "",
            matches: []
          };
        }
        tournamentGroups[tournamentId].matches.push(match);
      } else {
        noTournamentMatches.push(match);
      }
    });

    // Ordenar grupos (favoritos primero)
    const groups = Object.values(tournamentGroups);

    // Añade grupo especial para partidos sin torneo
    if (noTournamentMatches.length > 0) {
      groups.push({
        id: 'no-tournament',
        name: 'Sin torneo',
        country: '',
        matches: noTournamentMatches
      });
      console.warn('Grupo especial "Sin torneo" creado con', noTournamentMatches.length, 'partidos.');
    }

    const favorites = groups.filter(group => this.favoritesService.isFavorite(group.name));
    const nonFavorites = groups.filter(group => !this.favoritesService.isFavorite(group.name));
    
    favorites.sort((a, b) => a.name.localeCompare(b.name));
    nonFavorites.sort((a, b) => a.name.localeCompare(b.name));

    return [...favorites, ...nonFavorites];
  }

  onImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.innerHTML = img.alt?.substring(0, 1) || '?';
      parent.classList.add('team-logo-fallback');
    }
  }

  getTournamentDisplayName(name: string): string {
    return getTranslatedTournamentName(name);
  }

  getCountryDisplayName(name: string): string {
    return getTranslatedCountryName(name);
  }

  getCountryFlagHtml(country: string): string {
    return getCountryFlag(country);
  }

  formatDateGMT(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}