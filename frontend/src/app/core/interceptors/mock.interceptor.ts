import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class MockInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!environment.useMock) {
      return next.handle(req);
    }

    const { url, method } = req;

    // --- LOGIN ---
    if (url.endsWith('/auth/login/') && method === 'POST') {
      const { username } = req.body;
      return of(new HttpResponse({
        status: 200,
        body: {
          access: 'mock-access-token-' + Date.now(),
          refresh: 'mock-refresh-token-' + Date.now(),
          user: {
            id: 1,
            username: username,
            first_name: username.toUpperCase(),
            last_name: 'PROVIONAL',
            email: `${username}@dem.gob.ve`,
            rol: username === 'admin' ? 'ADMINISTRADOR' : 'FARMACEUTICO',
            is_active: true
          }
        }
      })).pipe(delay(500));
    }

    // --- INVENTARIO ---
    if (url.includes('/inventario/') && method === 'GET') {
      return of(new HttpResponse({
        status: 200,
        body: {
          count: 3,
          results: [
            { id_lote: 1, medicamento_detallado: 'ACETAMINOFEN', nombre_presentacion: 'Tabletas 500mg', numero_lote: 'LOT-A1', cantidad_actual: 150, fecha_vencimiento: '2026-12-01', color_clase: 'success', estado_logico: 'ÓPTIMO' },
            { id_lote: 2, medicamento_detallado: 'IBUPROFENO', nombre_presentacion: 'Cápsulas 400mg', numero_lote: 'LOT-B2', cantidad_actual: 10, fecha_vencimiento: '2024-05-01', color_clase: 'warning', estado_logico: 'PRÓXIMO' },
            { id_lote: 3, medicamento_detallado: 'LOSARTAN', nombre_presentacion: 'Tabletas 50mg', numero_lote: 'LOT-C3', cantidad_actual: 0, fecha_vencimiento: '2023-12-01', color_clase: 'danger', estado_logico: 'VENCIDO' }
          ]
        }
      })).pipe(delay(300));
    }

    // --- BUSQUEDA MEDICAMENTO (DESPACHO) ---
    if (url.includes('/medicamentos/buscar/') && method === 'GET') {
        const query = req.params.get('query') || '';
        const mockMed = [
            { id_lote: 1, nombre_generico: 'ACETAMINOFEN', presentacion: '500mg', numero_lote: 'LOT-A1', existencia: 150, color_clase: 'success', estado_logico: 'ÓPTIMO', fecha_vencimiento: '2026-12-01' },
            { id_lote: 2, nombre_generico: 'AMOXICILINA', presentacion: '500mg', numero_lote: 'LOT-X8', existencia: 50, color_clase: 'success', estado_logico: 'ÓPTIMO', fecha_vencimiento: '2026-10-15' },
        ];
        return of(new HttpResponse({ status: 200, body: mockMed })).pipe(delay(300));
    }

    // --- BENEFICIARIO ---
    if (url.includes('/beneficiario/') && method === 'GET') {
      return of(new HttpResponse({
        status: 200,
        body: {
          nombres: 'JUAN',
          apellidos: 'PEREZ',
          mensaje: 'Beneficiario activo en nómina'
        }
      })).pipe(delay(400));
    }

    // --- PROCESAR DESPACHO ---
    if (url.includes('/despacho/') && method === 'POST') {
      return of(new HttpResponse({
        status: 201,
        body: {
          orden_id: 'ACT-' + Math.floor(100000 + Math.random() * 900000),
          mensaje: 'Despacho registrado con éxito'
        }
      })).pipe(delay(800));
    }

    return next.handle(req);
  }
}
