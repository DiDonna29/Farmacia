import { Routes } from '@angular/router';
import { HojaRutaComponent } from './hoja-ruta';
import { VerificarUsuarioComponent } from './verificar-usuario/verificar-usuario';
import { SolicitudTipo1Component } from './solicitud-tipo1/solicitud-tipo1';
import { SolicitudTipo2Component } from './solicitud-tipo2/solicitud-tipo2';
import { SolicitudTipo3Component } from './solicitud-tipo3/solicitud-tipo3';
import { authGuard } from '../../../core/guards/auth-guard';


export const HOJA_RUTA_ROUTES: Routes = [
  {
    path: 'hoja-ruta',
    canActivate: [authGuard],
    component: HojaRutaComponent,
    data: { roles: ['ROLE_USER'] },
    children: [
      { path: 'verificar', component: VerificarUsuarioComponent },
      { path: 'solicitud-tipo1', component: SolicitudTipo1Component },
      { path: 'solicitud-tipo2', component: SolicitudTipo2Component },
      { path: 'solicitud-tipo3', component: SolicitudTipo3Component },
      { path: '', redirectTo: 'verificar', pathMatch: 'full' },
    ],
  },
];
