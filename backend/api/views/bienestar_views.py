"""Proxy dinámico para búsqueda de beneficiarios (Mock Local o WebServices Reales en Cascada)."""
import json
import os
import requests as http_requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from api.permissions import IsFarmaceuticoOrAbove


def normalizar_datos_bienestar(raw_data):
    """
    Normaliza los datos de cualquier fuente (Mock, WS actual, WS futuro)
    a la estructura de titular y cargas familiares unificada para la app.
    """
    if not raw_data:
        return None

    # Normalizar titular
    cedula_raw = raw_data.get("cedula")
    try:
        cedula = int(cedula_raw) if cedula_raw is not None else 0
    except (ValueError, TypeError):
        cedula = 0

    # Soporte para nombres/apellidos en diferentes formatos
    nombres_titular = raw_data.get("nombres_titular") or raw_data.get("nombres") or ""
    nombres_titular = nombres_titular.strip().upper()

    apellidos_titular = raw_data.get("apellidos_titular") or raw_data.get("apellidos") or ""
    apellidos_titular = apellidos_titular.strip().upper()

    estado_civil = raw_data.get("estado_civil") or "SOLTERO (A)"
    estado_civil = estado_civil.strip().upper()

    dependencia = raw_data.get("dependencia") or "BIENESTAR SOCIAL"
    cargo = raw_data.get("cargo_descripcion") or raw_data.get("cargo") or "FUNCIONARIO"
    status = raw_data.get("status") or "ACTIVO"

    adapted_data = {
        "cedula": cedula,
        "nacionalidad": (raw_data.get("nacionalidad") or "V").strip().upper(),
        "nombres_titular": nombres_titular,
        "apellidos_titular": apellidos_titular,
        "sexo": (raw_data.get("sexo") or "M").strip().upper(),
        "estado_civil": estado_civil,
        "fecha_nacimiento": raw_data.get("fecha_nacimiento") or "",
        "correo_electronico": raw_data.get("correo_electronico") or "",
        "telefono_principal": raw_data.get("telefono_principal") or "",
        "direccion": raw_data.get("direccion") or "",
        "fecha_ingreso": raw_data.get("fecha_ingreso") or "",
        "dependencia": dependencia.strip().upper(),
        "cargo": cargo.strip().upper(),
        "status": status.strip().upper(),
        "cargas_familiares": []
    }

    # Normalizar cargas familiares
    raw_cargas = raw_data.get("cargas_familiares") or raw_data.get("cargas") or []
    for c in raw_cargas:
        c_nombres = (c.get("nombres") or c.get("nombres_beneficiario") or "").strip().upper()
        c_apellidos = (c.get("apellidos") or c.get("apellidos_beneficiario") or "").strip().upper()
        c_sexo = (c.get("sexo") or "F").strip().upper()
        c_parentesco = (c.get("parentesco") or "HIJO (A)").strip().upper()
        c_status = (c.get("status") or "ACTIVO").strip().upper()

        # Determinar cedula de la carga (puede venir como 'cedula' o 'cedula_beneficiario')
        c_cedula_val = c.get("cedula_beneficiario") or c.get("cedula")
        c_cedula_str = str(c_cedula_val).strip() if c_cedula_val is not None else ""
        
        # posee_cedula logic: check if posee_cedula is explicitly in dict, else check if cedula exists
        if "posee_cedula" in c:
            posee_cedula = bool(c.get("posee_cedula"))
        else:
            posee_cedula = bool(c_cedula_str)

        adapted_data["cargas_familiares"].append({
            "cedula_beneficiario": c_cedula_str if c_cedula_str else None,
            "nombres": c_nombres,
            "apellidos": c_apellidos,
            "sexo": c_sexo,
            "parentesco": c_parentesco,
            "posee_cedula": posee_cedula,
            "status": c_status
        })

    return adapted_data


class BienestarBeneficiarioView(APIView):
    """
    Consulta información del titular y sus cargas familiares.
    Soporta búsqueda en cascada:
    1. Futura Bienestar (POST)
    2. Actual Bienestar (GET)
    3. Simulador Local (Mock JSON)
    """
    permission_classes = [IsFarmaceuticoOrAbove]

    def get(self, request, cedula):
        data = None
        source_used = None

        # -------------------------------------------------------------
        # 1. Intentar con el WebService de Bienestar Viejo (GET)
        # -------------------------------------------------------------
        actual_ws_url = getattr(settings, 'BIENESTAR_ACTUAL_URL', '')
        if actual_ws_url and actual_ws_url.startswith(('http://', 'https://')):
            try:
                clean_url = actual_ws_url.rstrip('/')
                response = http_requests.get(f"{clean_url}/{cedula}/", timeout=2, proxies={"http": None, "https": None})
                if response.status_code == 200:
                    raw_data = response.json()
                    if raw_data and (raw_data.get('nombres_titular') or raw_data.get('nombres')):
                        data = normalizar_datos_bienestar(raw_data)
                        source_used = 'WebService Bienestar Viejo (GET)'
            except Exception:
                pass

        # -------------------------------------------------------------
        # 2. Intentar con el WebService de Bienestar Nuevo (POST / GET)
        # -------------------------------------------------------------
        if not data:
            future_ws_url = getattr(settings, 'BIENESTAR_FUTURO_URL', '')
            if not future_ws_url:
                old_ws_url = getattr(settings, 'BIENESTAR_WS_URL', '')
                if old_ws_url and old_ws_url.startswith(('http://', 'https://')):
                    future_ws_url = old_ws_url

            if future_ws_url and future_ws_url.startswith(('http://', 'https://')):
                try:
                    clean_url = future_ws_url.rstrip('/')
                    raw_data = None
                    
                    # Intentar primero con POST enviando la cédula como entero
                    try:
                        cedula_val = int(cedula)
                        payload = {'cedula': cedula_val}
                        response = http_requests.post(clean_url, json=payload, timeout=2, proxies={"http": None, "https": None})
                        if response.status_code == 200:
                            raw_data = response.json()
                    except Exception:
                        pass

                    # Fallback a GET si POST falló o no retornó un diccionario/lista válido
                    if not raw_data or not isinstance(raw_data, (dict, list)):
                        connector = '&' if '?' in clean_url else '?'
                        response = http_requests.get(f"{clean_url}{connector}cedula={cedula}", timeout=2, proxies={"http": None, "https": None})
                        if response.status_code == 200:
                            raw_data = response.json()

                    if raw_data:
                        # Si es una lista, tomar el primer elemento
                        if isinstance(raw_data, list):
                            raw_data = raw_data[0] if len(raw_data) > 0 else None
                        
                        if raw_data and (raw_data.get('nombres_titular') or raw_data.get('nombres')):
                            data = normalizar_datos_bienestar(raw_data)
                            source_used = 'WebService Bienestar Nuevo'
                except Exception:
                    pass

        # -------------------------------------------------------------
        # 3. Intentar con el archivo Mock Local (Fallback)
        # -------------------------------------------------------------
        if not data:
            # Intentamos con BIENESTAR_MOCK_PATH; fallback a BIENESTAR_WS_URL si parece una ruta de archivo local
            mock_path_rel = getattr(settings, 'BIENESTAR_MOCK_PATH', '')
            if not mock_path_rel:
                old_ws_url = getattr(settings, 'BIENESTAR_WS_URL', '')
                if old_ws_url and not old_ws_url.startswith(('http://', 'https://')):
                    mock_path_rel = old_ws_url
            
            if not mock_path_rel:
                mock_path_rel = 'api/mocks/bienestar_mock.json'
            
            mock_path = os.path.join(settings.BASE_DIR, mock_path_rel)
            if os.path.exists(mock_path):
                try:
                    with open(mock_path, 'r', encoding='utf-8') as f:
                        mocks = json.load(f)
                        raw_data = next((t for t in mocks if str(t['cedula']) == str(cedula)), None)
                        if raw_data:
                            data = normalizar_datos_bienestar(raw_data)
                            source_used = 'Mock Local (Archivo Simulación)'
                except Exception:
                    pass

        # Retornar respuesta unificada
        if data:
            return Response({
                **data,
                'disponible': True,
                'mensaje': f'Información recuperada exitosamente desde: {source_used}'
            })

        return Response({
            'cedula': int(cedula) if cedula.isdigit() else 0,
            'nombres_titular': '',
            'apellidos_titular': '',
            'disponible': False,
            'mensaje': 'No se encontró información para esta cédula en ninguna de las fuentes de Bienestar Social.'
        })
