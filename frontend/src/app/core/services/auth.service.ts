import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, fromEvent, merge, Subscription, timer } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User, AuthResponse } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private inactivitySub?: Subscription;
  private readonly INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutos

  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
    if (this.isAuthenticated()) {
      this.startInactivityTimer();
    }
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/auth/login/`, { username, password }).pipe(
      tap(res => {
        // Si la contraseña ha expirado, guardamos el token de acceso temporal pero no como login completo aún
        if (res.code === 'PASSWORD_EXPIRED') {
          localStorage.setItem('access_token', res.access);
        } else {
          localStorage.setItem('access_token', res.access);
          localStorage.setItem('refresh_token', res.refresh!);
          localStorage.setItem('current_user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
          this.startInactivityTimer();
        }
      })
    );
  }

  verifyReset(cedula: string, email: string): Observable<any> {
    return this.http.post(`${this.API}/auth/reset-verify/`, { cedula, email });
  }

  confirmReset(data: any): Observable<any> {
    return this.http.post(`${this.API}/auth/reset-confirm/`, data);
  }

  changePassword(data: any): Observable<any> {
    return this.http.post(`${this.API}/auth/change-password/`, data);
  }

  getProfileDetailed(): Observable<any> {
    return this.http.get(`${this.API}/auth/profile/`);
  }

  updateProfileContact(email: string, phone: string): Observable<any> {
    return this.http.patch(`${this.API}/auth/profile/`, { email, phone }).pipe(
      tap(() => {
        // Actualizar el correo en el usuario local también
        const user = this.currentUserSubject.value;
        if (user) {
          user.email = email;
          localStorage.setItem('current_user', JSON.stringify(user));
          this.currentUserSubject.next({ ...user });
        }
      })
    );
  }

  logout(manual = true): void {
    this.stopInactivityTimer();
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      this.http.post(`${this.API}/auth/logout/`, { refresh, manual }).subscribe();
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('sifarmaOnboardingTourDismissed');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private startInactivityTimer(): void {
    this.stopInactivityTimer();
    
    const activity$ = merge(
      fromEvent(window, 'mousemove'),
      fromEvent(window, 'mousedown'),
      fromEvent(window, 'keypress'),
      fromEvent(window, 'scroll'),
      fromEvent(window, 'touchstart')
    );

    this.inactivitySub = activity$.pipe(
      switchMap(() => timer(this.INACTIVITY_TIME))
    ).subscribe(() => {
      console.warn('Inactividad detectada. Cerrando sesión...');
      this.logout(false);
    });

    // Iniciar timer inicial
    this.inactivitySub = timer(this.INACTIVITY_TIME).subscribe(() => {
      this.logout(false);
    });
    
    // Combinar ambos:
    this.inactivitySub?.unsubscribe();
    this.inactivitySub = activity$.pipe(
      startWith(null),
      switchMap(() => timer(this.INACTIVITY_TIME))
    ).subscribe(() => this.logout(false));
  }

  private stopInactivityTimer(): void {
    if (this.inactivitySub) {
      this.inactivitySub.unsubscribe();
    }
  }

  refreshToken(): Observable<{ access: string }> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http.post<{ access: string }>(`${this.API}/auth/refresh/`, { refresh }).pipe(
      tap(res => localStorage.setItem('access_token', res.access))
    );
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token') && !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(...roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    if (!user || !user.rol) return false;

    const userRoleStr = user.rol.toUpperCase().trim();
    return roles.some(r => r.toUpperCase().trim() === userRoleStr);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('current_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        console.log('AuthService: Usuario cargado:', user.username, 'Rol:', user.rol);
        this.currentUserSubject.next(user);
      } catch {
        localStorage.clear();
      }
    }
  }
}