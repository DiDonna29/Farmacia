import { Routes } from '@angular/router';
import { BandejaTipo1Component } from './pages/bandeja-tipo1/bandeja-tipo1';
import { BandejaTipo2Component } from './pages/bandeja-tipo2/bandeja-tipo2';
import { BandejaTipo3Component } from './pages/bandeja-tipo3/bandeja-tipo3';


export const ESPECIALISTAS_ROUTES: Routes = [
  { path: 'bandeja-tipo1', component: BandejaTipo1Component },
  { path: 'bandeja-tipo2', component: BandejaTipo2Component },
  { path: 'bandeja-tipo3', component: BandejaTipo3Component }
];
