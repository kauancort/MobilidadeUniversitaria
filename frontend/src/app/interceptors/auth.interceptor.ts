import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const token = localStorage.getItem('token');
  const authService = inject(AuthService);

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: 'Bearer ' + token
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token) {
        authService.logout();
      }

      return throwError(() => error);
    })
  );
};
