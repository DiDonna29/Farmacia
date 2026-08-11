import { Routes } from '@angular/router';
import { BandejaRevision } from './pages/bandeja-revision/bandeja-revision';
import { HistorialRevision } from './pages/historial-revision/historial-revision';

export const ADMINISTRADOR_ROUTES: Routes = [
  { path: 'revision', component: BandejaRevision },
  { path: 'historial', component: HistorialRevision },
  { path: '', redirectTo: 'revision', pathMatch: 'full' }
];