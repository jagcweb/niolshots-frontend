import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MatchDetail, MatchSummary } from '../types/types';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private baseUrl = "https://www.sofascore.com/api/v1/event";

  constructor(private http: HttpClient) {}

  getMatchDetail(matchId: string | number): Observable<MatchDetail> {
    // Obtener detalles del partido y estadísticas en paralelo
    return forkJoin({
      match: this.getMatch(matchId),
      summary: this.getMatchSummary(matchId)
    }).pipe(
      map(({ match, summary }) => ({
        ...match,
        summary
      })),
      catchError(error => {
        console.error(`Error fetching match detail for ${matchId}:`, error);
        return throwError(() => new Error(`Error fetching match detail: ${error.message}`));
      })
    );
  }

  private getMatch(matchId: string | number): Observable<any> {
    const url = `${this.baseUrl}/${matchId}`;
    return this.http.get<any>(url).pipe(
      map((response: any) => response.event || {}),
      catchError(error => {
        console.error(`Error fetching match ${matchId}:`, error);
        return throwError(() => error);
      })
    );
  }

  private getMatchSummary(matchId: string | number): Observable<any> {
    return forkJoin({
      shots: this.getShots(matchId),
      fouls: this.getPlayerFouls(matchId),
      saves: this.getPlayerSaves(matchId)
    }).pipe(
      catchError(error => {
        console.error(`Error fetching match summary for ${matchId}:`, error);
        // Retornar objeto vacío en caso de error para no romper la cadena
        return of({
          shots: [],
          fouls: [],
          saves: []
        });
      })
    );
  }

  private getShots(matchId: string | number): Observable<any[]> {
    const shotsUrl = `${this.baseUrl}/${matchId}/shotmap`;

    return forkJoin({
      shotmap: this.http.get<any>(shotsUrl),
      playerStats: this.getPlayerStats(matchId)
    }).pipe(
      map(({ shotmap, playerStats }) => {
        const shotArray = shotmap.shotmap || [];
        const playersWithAssists = playerStats.filter(p => p.goalAssist > 0);

        return shotArray.map((shot: any) => {
          const playerInfo = shot.player || {};
          const player = {
            userCount: playerInfo.userCount || 0,
            name: playerInfo.name || "",
            jerseyNumber: shot.jerseyNumber || "",
            position: playerInfo.position || "",
            id: playerInfo.id || 0,
            shortName: playerInfo.shortName || "",
            slug: playerInfo.slug || ""
          };

          const isHome = shot.isHome || false;
          const isGoal = shot.shotType === "goal";
          let hasAssist = false, assistPlayer = null, assistDescription = null;

          if (isGoal && playersWithAssists.length) {
            const teamAssists = playersWithAssists.filter(a => 
              a.teamFromLineup === (isHome ? "home" : "away")
            );
            if (teamAssists.length) {
              assistPlayer = teamAssists[0].player;
              hasAssist = true;
              assistDescription = `Asistencia de ${assistPlayer.name}`;
            }
          }

          return {
            player,
            time: shot.time || 0,
            teamId: shot.teamId || 0,
            isHome,
            shotType: shot.shotType || "",
            situation: shot.situation || "",
            bodyPart: shot.bodyPart || "",
            goalType: isGoal ? shot.goalType : null,
            xg: shot.xg || 0.0,
            x: shot.x || 0.0,
            y: shot.y || 0.0,
            hasAssist,
            assistPlayer,
            assistDescription,
            timeSeconds: (shot.time || 0) * 60
          };
        }).sort((a: any, b: any) => b.time - a.time);
      }),
      catchError(error => {
        console.error(`Error fetching shots for match ${matchId}:`, error);
        return of([]);
      })
    );
  }

  private getPlayerStats(matchId: string | number): Observable<any[]> {
    const url = `${this.baseUrl}/${matchId}/lineups`;
    
    return this.http.get<any>(url).pipe(
      map((response: any) => {
        const playersStats: any[] = [];
        
        ["home", "away"].forEach(team => {
          const teamObject = response[team];
          if (teamObject && Array.isArray(teamObject.players)) {
            teamObject.players.forEach((playerObject: any) => {
              const playerInfo = playerObject.player || {};
              const stats = playerObject.statistics || {};
              
              const player = {
                userCount: playerInfo.userCount || 0,
                name: playerInfo.name || "",
                jerseyNumber: playerObject.jerseyNumber || "",
                position: playerObject.position || "",
                id: playerInfo.id || 0,
                shortName: playerInfo.shortName || "",
                slug: playerInfo.slug || ""
              };

              playersStats.push({
                player,
                fouls: stats.fouls || 0,
                totalPass: stats.totalPass || 0,
                accuratePass: stats.accuratePass || 0,
                minutesPlayed: stats.minutesPlayed || 0,
                rating: stats.rating || null,
                teamId: playerObject.teamId || 0,
                position: playerObject.position || "",
                totalLongBalls: stats.totalLongBalls || 0,
                accurateLongBalls: stats.accurateLongBalls || 0,
                goalAssist: stats.goalAssist || 0,
                totalCross: stats.totalCross || 0,
                aerialLost: stats.aerialLost || 0,
                aerialWon: stats.aerialWon || 0,
                duelLost: stats.duelLost || 0,
                duelWon: stats.duelWon || 0,
                challengeLost: stats.challengeLost || 0,
                dispossessed: stats.dispossessed || 0,
                bigChanceMissed: stats.bigChanceMissed || 0,
                onTargetScoringAttempt: stats.onTargetScoringAttempt || 0,
                blockedScoringAttempt: stats.blockedScoringAttempt || 0,
                totalClearance: stats.totalClearance || 0,
                totalTackle: stats.totalTackle || 0,
                touches: stats.touches || 0,
                possessionLostCtrl: stats.possessionLostCtrl || 0,
                keyPass: stats.keyPass || 0,
                teamFromLineup: team,
                saves: stats.saves || 0,
                savedShotsFromInsideTheBox: stats.savedShotsFromInsideTheBox || 0,
                goodHighClaim: stats.goodHighClaim || 0,
                totalKeeperSweeper: stats.totalKeeperSweeper || 0,
                accurateKeeperSweeper: stats.accurateKeeperSweeper || 0
              });
            });
          }
        });

        return playersStats;
      }),
      catchError(error => {
        console.error(`Error fetching player stats for match ${matchId}:`, error);
        return of([]);
      })
    );
  }

  private getPlayerFouls(matchId: string | number): Observable<any[]> {
    return forkJoin({
      incidents: this.getMatchIncidents(matchId),
      statsBasedFouls: this.getPlayerFoulsFromStats(matchId),
      playerTeamMap: this.getPlayerTeamMap(matchId)
    }).pipe(
      map(({ incidents, statsBasedFouls, playerTeamMap }) => {
        const playerFouls: any[] = [];
        const cardIncidents = incidents.filter((i: any) => i.incidentType === "card" && i.player);
        
        const playerYellowCards: { [key: string]: number } = {};
        const processedFouls = new Set();

        for (const incident of cardIncidents) {
          const player = incident.player;
          const currentYellowCards = playerYellowCards[player.id] || 0;
          let cardType: string, isSecondYellow: boolean;
          
          switch (incident.cardType) {
            case "yellow":
              playerYellowCards[player.id] = currentYellowCards + 1;
              cardType = "Tarjeta amarilla";
              isSecondYellow = false;
              break;
            case "red":
              cardType = "Tarjeta roja";
              isSecondYellow = false;
              break;
            case "yellowRed":
              cardType = "Tarjeta roja (doble amarilla)";
              isSecondYellow = true;
              break;
            default:
              cardType = "Tarjeta amarilla";
              isSecondYellow = false;
          }

          const team = incident.teamSide || playerTeamMap[player.id] || "unknown";
          if (team !== "unknown") {
            const nearbyFoul = statsBasedFouls.find((foul: any) =>
              foul.playerId === player.id &&
              Math.abs(foul.time - incident.time) <= 2 &&
              !processedFouls.has(foul.incidentId)
            );

            if (nearbyFoul) {
              let combinedType: string;
              if (isSecondYellow) combinedType = "Falta + Tarjeta roja (doble amarilla)";
              else if (cardType.includes("roja")) combinedType = "Falta + Tarjeta roja";
              else combinedType = `Falta + ${cardType}`;

              playerFouls.push({
                playerId: player.id,
                playerName: player.name,
                shirtNumber: parseInt(player.jerseyNumber) || 0,
                team,
                time: incident.time,
                timeSeconds: incident.time * 60,
                foulType: combinedType,
                description: `Falta de ${player.name} - ${cardType}`,
                incidentId: incident.id
              });
              
              processedFouls.add(nearbyFoul.incidentId);
            } else {
              let cardOnlyType = isSecondYellow ? "Tarjeta roja (doble amarilla)" : cardType;
              playerFouls.push({
                playerId: player.id,
                playerName: player.name,
                shirtNumber: parseInt(player.jerseyNumber) || 0,
                team,
                time: incident.time,
                timeSeconds: incident.time * 60,
                foulType: cardOnlyType,
                description: `${cardType} para ${player.name}`,
                incidentId: incident.id
              });
            }
          }
        }

        const remainingFouls = statsBasedFouls.filter((foul: any) => !processedFouls.has(foul.incidentId));
        playerFouls.push(...remainingFouls);

        return playerFouls.sort((a, b) => b.timeSeconds - a.timeSeconds);
      }),
      catchError(error => {
        console.error(`Error fetching player fouls for match ${matchId}:`, error);
        return of([]);
      })
    );
  }

  private getPlayerFoulsFromStats(matchId: string | number): Observable<any[]> {
    return forkJoin({
      playerStats: this.getPlayerStats(matchId),
      playerTeamMap: this.getPlayerTeamMap(matchId)
    }).pipe(
      map(({ playerStats, playerTeamMap }) => {
        const playerFouls: any[] = [];

        playerStats.forEach(playerStat => {
          for (let foulIndex = 0; foulIndex < playerStat.fouls; foulIndex++) {
            let estimatedMinute: number;
            if (playerStat.fouls === 1) {
              estimatedMinute = Math.floor(playerStat.minutesPlayed / 2);
            } else {
              const interval = playerStat.minutesPlayed / playerStat.fouls;
              estimatedMinute = Math.floor((foulIndex + 1) * interval);
            }
            
            const team = playerTeamMap[playerStat.player.id] || "unknown";
            if (team !== "unknown") {
              playerFouls.push({
                playerId: playerStat.player.id,
                playerName: playerStat.player.name,
                shirtNumber: parseInt(playerStat.player.jerseyNumber) || 0,
                team,
                time: estimatedMinute,
                timeSeconds: estimatedMinute * 60,
                foulType: "Falta",
                description: `Falta de ${playerStat.player.name}`,
                incidentId: `${playerStat.player.id}_foul_${foulIndex + 1}`
              });
            }
          }
        });

        return playerFouls.sort((a, b) => b.timeSeconds - a.timeSeconds);
      }),
      catchError(error => {
        console.error(`Error generating fouls from stats for match ${matchId}:`, error);
        return of([]);
      })
    );
  }

  private getPlayerSaves(matchId: string | number): Observable<any[]> {
    return forkJoin({
      playerStats: this.getPlayerStats(matchId),
      playerTeamMap: this.getPlayerTeamMap(matchId)
    }).pipe(
      map(({ playerStats, playerTeamMap }) => {
        const playerSaves: any[] = [];
        
        for (const playerStat of playerStats) {
          if (playerStat.position === "G" && playerStat.saves > 0) {
            const team = playerTeamMap[playerStat.player.id] || "unknown";
            if (team !== "unknown") {
              for (let saveIndex = 0; saveIndex < playerStat.saves; saveIndex++) {
                let estimatedMinute: number;
                if (playerStat.saves === 1) {
                  estimatedMinute = Math.floor(playerStat.minutesPlayed / 2);
                } else {
                  const interval = playerStat.minutesPlayed / playerStat.saves;
                  estimatedMinute = Math.floor((saveIndex + 1) * interval);
                }
                
                playerSaves.push({
                  playerId: playerStat.player.id,
                  playerName: playerStat.player.name,
                  shirtNumber: parseInt(playerStat.player.jerseyNumber) || 1,
                  team,
                  time: estimatedMinute,
                  timeSeconds: estimatedMinute * 60,
                  saveType: "Parada",
                  description: `Parada de ${playerStat.player.name}`,
                  shotBlocked: true
                });
              }
            }
          }
        }

        return playerSaves.sort((a, b) => b.timeSeconds - a.timeSeconds);
      }),
      catchError(error => {
        console.error(`Error fetching player saves for match ${matchId}:`, error);
        return of([]);
      })
    );
  }

  private getMatchIncidents(matchId: string | number): Observable<any[]> {
    const url = `${this.baseUrl}/${matchId}/incidents`;
    return this.http.get<any>(url).pipe(
      map((response: any) => response.incidents || []),
      catchError(error => {
        console.error(`Error fetching match incidents for ${matchId}:`, error);
        return of([]);
      })
    );
  }

  private getPlayerTeamMap(matchId: string | number): Observable<{ [key: string]: string }> {
    return forkJoin({
      shots: this.getShots(matchId),
      stats: this.getPlayerStats(matchId)
    }).pipe(
      map(({ shots, stats }) => {
        const playerTeamMap: { [key: string]: string } = {};
        
        shots.forEach(shot => {
          const team = shot.isHome ? "home" : "away";
          playerTeamMap[shot.player.id] = team;
        });
        
        stats.forEach(playerStat => {
          if (!playerTeamMap[playerStat.player.id]) {
            playerTeamMap[playerStat.player.id] = playerStat.teamFromLineup;
          }
        });
        
        return playerTeamMap;
      }),
      catchError(error => {
        console.error(`Error creating player team map for match ${matchId}:`, error);
        return of({});
      })
    );
  }
}