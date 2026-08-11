import { Routes } from '@angular/router';
import { VerificarUsuarioComponent } from './pages/verificar-usuario/verificar-usuario';
import { SolicitudTipo2Component } from './pages/solicitud-tipo2/solicitud-tipo2';
import { SolicitudTipo3Component } from './pages/solicitud-tipo3/solicitud-tipo3';
import { SolicitudTipo1Component } from './pages/solicitud-tipo1/solicitud-tipo1';
import { BandejaDevueltosComponent } from './pages/bandeja-devueltos/bandeja-devueltos';


export const OPERACIONES_ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: 'verificar', component: VerificarUsuarioComponent },
      { path: 'solicitud-tipo1', component: SolicitudTipo1Component },
      { path: 'solicitud-tipo2', component: SolicitudTipo2Component },
      { path: 'solicitud-tipo3', component: SolicitudTipo3Component },
      { path: 'devueltos', component: BandejaDevueltosComponent },
      { path: '', redirectTo: 'verificar', pathMatch: 'full' },
    ],
  },
];
