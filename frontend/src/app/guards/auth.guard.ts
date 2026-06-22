import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const user = this.authService.user();

    if (!user || !this.authService.hasValidSession()) {
      this.authService.logout();
      return this.router.createUrlTree(['/login']);
    }

    const allowedRoles = route.data['roles'] as Array<'GESTOR' | 'ALUNO' | 'MOTORISTA'>;
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.tipoUsuario)) {
        const redirectPath = this.authService.getRedirectPath(user.tipoUsuario);
        return this.router.createUrlTree([redirectPath]);
      }
    }

    return true;
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.canActivate(route, state);
  }
}