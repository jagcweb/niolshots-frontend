import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { TournamentsService } from '../../services/tournaments.service';
import { FavoritesService } from '../../services/favorites.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { getTranslatedTournamentName, getTranslatedCountryName, getCountryFlag, tournamentFlagMapping } from '../../utils/utils';

@Component({
  selector: 'app-tournaments',
  templateUrl: './tournaments.component.html',
  styleUrls: ['./tournaments.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TournamentsComponent implements OnInit {
  @Output() tournamentSelected = new EventEmitter<string | null>();
  
  tournaments: any[] = [];
  filteredTournaments: any[] = [];
  loading = true;
  searchText: string = '';
  selectedTournamentId: string | null = null;

  constructor(
    private tournamentsService: TournamentsService,
    private favoritesService: FavoritesService
  ) {}

  ngOnInit() {
    this.loadTournaments();
  }

  loadTournaments() {
    this.loading = true;
    this.tournamentsService.getTournaments().subscribe({
      next: (data) => {
        this.tournaments = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.tournaments = this.getBackupTournaments();
        this.applyFilters();
      }
    });
  }

  getBackupTournaments() {
    return [
      { id: "8", name: "LaLiga", slug: "laliga", country: "Spain", countryCode: "ES" },
      { id: "17", name: "Premier League", slug: "premier-league", country: "England", countryCode: "EN" },
      { id: "23", name: "Serie A", slug: "serie-a", country: "Italy", countryCode: "IT" },
      { id: "35", name: "Bundesliga", slug: "bundesliga", country: "Germany", countryCode: "DE" },
      { id: "34", name: "Ligue 1", slug: "ligue-1", country: "France", countryCode: "FR" },
      { id: "7", name: "Champions League", slug: "champions-league", country: "Europe", countryCode: "EU" },
      { id: "679", name: "LaLiga 2", slug: "laliga-2", country: "Spain", countryCode: "ES" },
      { id: "2955", name: "LigaPro Serie A, Primera Etapa", slug: "ligapro", country: "Ecuador", countryCode: "EC" }
    ];
  }

  applyFilters() {
    const tournaments = Array.isArray(this.tournaments) ? this.tournaments : [];
    if (this.searchText) {
      const query = this.searchText.toLowerCase();
      this.filteredTournaments = tournaments.filter(t =>
        t.name.toLowerCase().includes(query) ||
        (t.country && t.country.toLowerCase().includes(query))
      );
    } else {
      this.filteredTournaments = [...tournaments];
    }
    this.filteredTournaments = this.getSortedTournaments(this.filteredTournaments);
  }

  getSortedTournaments(tournaments: any[]) {
    if (!tournaments || tournaments.length === 0) return [];
    
    const favorites = tournaments.filter(t => this.favoritesService.isFavorite(t.name));
    const nonFavorites = tournaments.filter(t => !this.favoritesService.isFavorite(t.name));
    
    // Ordenar cada grupo alfabéticamente
    favorites.sort((a, b) => a.name.localeCompare(b.name));
    nonFavorites.sort((a, b) => a.name.localeCompare(b.name));
    
    return [...favorites, ...nonFavorites];
  }

  onSearch(text: string) {
    this.searchText = text;
    this.applyFilters();
  }

  selectTournament(tournamentId: string | null) {
    this.selectedTournamentId = tournamentId;
    this.tournamentSelected.emit(tournamentId);
  }

  toggleFavorite(name: string, event: Event) {
    event.stopPropagation();
    
    if (!this.favoritesService.isFavorite(name)) {
      this.favoritesService.addFavorite(name);
    } else {
      this.favoritesService.removeFavorite(name);
    }
    
    // Re-aplicar filtros para actualizar el orden
    this.applyFilters();
  }

  isFavorite(name: string): boolean {
    return this.favoritesService.isFavorite(name);
  }

  isSelected(tournamentId: string): boolean {
    return this.selectedTournamentId === tournamentId;
  }

  refreshTournaments() {
    this.loadTournaments();
  }

  // --- FUNCIONES DE UTILS PARA EL TEMPLATE ---
  getTournamentDisplayName(name: string): string {
    return getTranslatedTournamentName(name);
  }

  getCountryDisplayName(name: string): string {
    return getTranslatedCountryName(name);
  }

  getCountryFlagHtml(country: string, tournamentName: string): string {
    if (!country || country.trim() === '') {
      // Busca el torneo en el mapping (coincidencia exacta o por inclusión)
      for (const [key, flagCountry] of Object.entries(tournamentFlagMapping)) {
        if (
          tournamentName === key ||
          tournamentName.toLowerCase().includes(key.toLowerCase())
        ) {
          return getCountryFlag(flagCountry) || '';
        }
      }

      // Fallbacks por palabras clave
      if (tournamentName && tournamentName.toLowerCase().includes('africa')) {
        return getCountryFlag('Africa') || '';
      }
      if (tournamentName && tournamentName.toLowerCase().includes('uefa')) {
        return getCountryFlag('Europe') || '';
      }
      if (tournamentName && tournamentName.toLowerCase().includes('conmebol')) {
        return getCountryFlag('South America') || '';
      }
      if (tournamentName && tournamentName.toLowerCase().includes('fifa')) {
        return getCountryFlag('World') || '';
      }

      // Si no se encuentra, retorna vacío
      return '';
    }
    // País definido, retorna bandera normal
    return getCountryFlag(country) || '';
  }
}