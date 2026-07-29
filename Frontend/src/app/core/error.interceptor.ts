import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// API her zaman { success, message, data, errors } zarfıyla döner.
// 401 durumunda oturumu temizleyip kullanıcıyı login ekranına yönlendiriyoruz (kılavuz 12.4).
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err) => {
      if (err.status === 401 && req.url.startsWith('/api') && auth.token !== 'cozyforest_local_token') {
        auth.logout();
        router.navigate(['/login']);
      }

      return throwError(() => err);
    })
  );
};
