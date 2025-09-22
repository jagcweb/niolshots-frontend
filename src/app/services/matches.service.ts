import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Match, MatchApiResponse } from '../types/types';

@Injectable({ providedIn: 'root' })
export class MatchesService {
  private matchesBaseUrl = "https://www.sofascore.com/api/v1/sport/football/scheduled-events";

  constructor(private http: HttpClient) {}

  getMatches(date: string): Observable<Match[]> {
    const url = `${this.matchesBaseUrl}/${date}`;
    
    return this.http.get<any>(url).pipe(
      map((response: any) => {
        const events = response.events || [];
        return events;
      }),
      catchError((error) => {
        return throwError(() => new Error(`Error fetching matches: ${error.message}`));
      })
    );
  }
}