import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MatchStatsDetail, Shot, Foul, PlayerStats, Player, Incident } from '../types/types';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private baseUrl = "/api/stats";

  constructor(private http: HttpClient) {}

  getMatchDetail(matchId: string | number): Observable<MatchStatsDetail> {
    if (!matchId) return throwError(() => new Error("matchId is required"));

    const url = `${this.baseUrl}/${matchId}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        const homeTeam = {
          ...response.homeTeam,
          teamColors: response.homeTeam.teamColors || {
            primary: '#1a78cf',
            secondary: '#ffffff', 
            text: '#000000'
          }
        };
        
        const awayTeam = {
          ...response.awayTeam,
          teamColors: response.awayTeam.teamColors || {
            primary: '#e74c3c',
            secondary: '#ffffff',
            text: '#000000'
          }
        };

        const time = response.time || {};
        
        // Los datos están en response.summary
        const summary = response.summary || {};
        const shots = summary.shots || [];
        const stats = summary.stats || {};
        const fouls = summary.fouls || [];
        const saves = summary.saves || [];
        const incidents = summary.incidents || [];
        
        // Crear mapas de jugadores para determinar el equipo
        const homePlayersMap = new Map<number, any>();
        const awayPlayersMap = new Map<number, any>();
        
        if (stats?.home?.players) {
          stats.home.players.forEach((playerData: any) => {
            if (playerData.player?.id) {
              homePlayersMap.set(playerData.player.id, playerData.player);
            }
          });
        }
        
        if (stats?.away?.players) {
          stats.away.players.forEach((playerData: any) => {
            if (playerData.player?.id) {
              awayPlayersMap.set(playerData.player.id, playerData.player);
            }
          });
        }
        
        // Procesar shots con información de equipo
        const processedShots: Shot[] = (shots || []).map((shot: any) => {
          let isHome = false;
          let teamId = 0;
          
          if (shot.player?.id) {
            if (homePlayersMap.has(shot.player.id)) {
              isHome = true;
              teamId = response.homeTeam?.id || 0;
            } else if (awayPlayersMap.has(shot.player.id)) {
              isHome = false;
              teamId = response.awayTeam?.id || 0;
            }
          }

          const player: Player = shot.player || {
            id: 0,
            name: shot.playerName || 'Desconocido',
            shortName: shot.playerName || 'Desconocido',
            slug: '',
            position: '',
            jerseyNumber: ''
          };

          const isGoal = shot.shotType === "goal";
          
          return {
            player,
            time: shot.time || 0,
            timeSeconds: (shot.time || 0) * 60,
            teamId,
            isHome,
            shotType: shot.shotType || "",
            situation: shot.situation || "",
            bodyPart: shot.bodyPart || "",
            xg: shot.xg || shot.expectedGoals || 0,
            x: shot.x || 0,
            y: shot.y || 0,
            goalType: isGoal ? shot.goalType || "" : null,
            hasAssist: shot.hasAssist || false,
            assistPlayer: shot.assistPlayer || null
          };
        }).sort((a: { time: number; }, b: { time: number; }) => b.time - a.time);

        // Procesar fouls
        const processedFouls: Foul[] = (fouls || []).map((foul: any) => {
          let team = 'home';
          let isHome = true;
          
          if (foul.player?.id) {
            if (homePlayersMap.has(foul.player.id)) {
              isHome = true;
              team = 'home';
            } else if (awayPlayersMap.has(foul.player.id)) {
              isHome = false;
              team = 'away';
            }
          } else if (foul.hasOwnProperty('isHome')) {
            isHome = foul.isHome;
            team = foul.isHome ? 'home' : 'away';
          } else if (foul.team) {
            team = foul.team;
            isHome = foul.team === 'home';
          }

          return {
            playerId: foul.playerId || foul.player?.id || 0,
            playerName: foul.playerName || foul.player?.name || 'Desconocido',
            shirtNumber: foul.shirtNumber || 0,
            team,
            isHome,
            time: foul.time || 0,
            timeSeconds: (foul.time || 0) * 60,
            foulType: foul.foulType || 'Falta',
            description: foul.description || '',
            incidentId: foul.incidentId || foul.id || ''
          };
        });

        // Procesar saves
        const processedSaves = (saves || []).map((save: any) => {
          let team = 'home';
          let isHome = true;
          
          if (save.player?.id) {
            if (homePlayersMap.has(save.player.id)) {
              isHome = true;
              team = 'home';
            } else if (awayPlayersMap.has(save.player.id)) {
              isHome = false;
              team = 'away';
            }
          }

          return {
            ...save,
            team,
            isHome,
            player: save.player || {
              id: 0,
              name: save.playerName || 'Desconocido',
              shortName: save.playerName || 'Desconocido',
              slug: '',
              position: '',
              jerseyNumber: ''
            }
          };
        });

        // Procesar player stats
        const playerStats: PlayerStats[] = [];
        if (stats) {
          const homeStats = stats.home?.players || [];
          const awayStats = stats.away?.players || [];
          
          homeStats.forEach((playerData: any) => {
            if (playerData.player && playerData.statistics) {
              const player: Player = {
                id: playerData.player.id || 0,
                name: playerData.player.name || "",
                shortName: playerData.player.shortName || "",
                slug: playerData.player.slug || "",
                position: playerData.player.position || "",
                jerseyNumber: playerData.jerseyNumber || ""
              };
              playerStats.push({ 
                ...playerData.statistics, 
                player, 
                teamFromLineup: 'home'
              });
            }
          });
          
          awayStats.forEach((playerData: any) => {
            if (playerData.player && playerData.statistics) {
              const player: Player = {
                id: playerData.player.id || 0,
                name: playerData.player.name || "",
                shortName: playerData.player.shortName || "",
                slug: playerData.player.slug || "",
                position: playerData.player.position || "",
                jerseyNumber: playerData.jerseyNumber || ""
              };
              playerStats.push({ 
                ...playerData.statistics, 
                player, 
                teamFromLineup: 'away'
              });
            }
          });
        }

        const matchStatsDetail: MatchStatsDetail = {
          id: response.id || 0,
          status: response.status || { code: 0, description: 'Unknown', type: 'notstarted' },
          startTimestamp: response.startTimestamp || 0,
          homeTeam,
          awayTeam,
          time,
          homeScore: response.homeScore?.current || response.homeScore?.display || response.homeScore || 0,
          awayScore: response.awayScore?.current || response.awayScore?.display || response.awayScore || 0,
          tournament: response.tournament || undefined,
          summary: {
            shots: processedShots,
            stats: playerStats,
            fouls: processedFouls,
            saves: processedSaves,
            incidents: incidents || []
          }
        };

        return matchStatsDetail;
      }),
      catchError(error => {
        console.error(`Error fetching match detail for ${matchId}:`, error);
        return throwError(() => new Error(`Error fetching match detail: ${error.message}`));
      })
    );
  }
}