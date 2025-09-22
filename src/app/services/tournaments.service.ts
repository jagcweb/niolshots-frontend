import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { Tournament } from '../types/types';

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private baseUrl = "https://www.sofascore.com/api/v1/search/suggestions/unique-tournaments?sport=football";
  private cacheKey = 'cachedTournaments';
  private cacheTimestampKey = 'cachedTournamentsTimestamp';

  constructor(private http: HttpClient) {}

  getTournaments(): Observable<Tournament[]> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(this.cacheKey);
      const cachedTimestamp = parseInt(localStorage.getItem(this.cacheTimestampKey) || '0');
      const now = Date.now();
      const cacheAge = now - cachedTimestamp;

      if (cached && cacheAge < 24 * 60 * 60 * 1000) {
        return of(JSON.parse(cached));
      }
    }

    // LA CLAVE: Usa .map aquí para transformar la respuesta
    return this.http.get<any>(this.baseUrl).pipe(
      map(response => {
        const results = response.results || [];
        const mappedResults = results.map((item: any) => {
          if (item.entity && item.entity.name) {
            return {
              id: item.entity.id || `t-${Math.random().toString(36).substring(2, 8)}`,
              name: item.entity.name,
              slug: item.entity.slug || "",
              country: item.entity.category?.country?.name || "",
              countryCode: item.entity.category?.country?.alpha2 || "",
              primaryColor: item.entity.primaryColorHex || "#cccccc",
              secondaryColor: item.entity.secondaryColorHex || "#333333"
            };
          }
          return null;
        }).filter(Boolean);
        return mappedResults;
      }),
      tap(data => {
        if (typeof window !== 'undefined' && window.localStorage && data.length > 0) {
          localStorage.setItem(this.cacheKey, JSON.stringify(data));
          localStorage.setItem(this.cacheTimestampKey, Date.now().toString());
        }
      }),
      catchError(error => {
        console.error("Error en API de torneos:", error);
        return of(this.getBackupTournaments());
      })
    );
  }

  getBackupTournaments(): Tournament[] {
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
}