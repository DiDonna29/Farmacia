from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from api.permissions import IsOperativoOrAbove, get_user_role

class PrincipiosActivosView(APIView):
    """CRUD genérico para principios activos."""
    permission_classes = [IsOperativoOrAbove]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT id_principio, nombre_principio FROM farmacia.principios_activos ORDER BY nombre_principio")
            rows = cursor.fetchall()
        return Response([{'id': r[0], 'nombre': r[1]} for r in rows])

    def post(self, request):
        nombre = request.data.get('nombre', '').strip().upper()
        if not nombre:
            return Response({'detail': 'El nombre del principio activo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        with connection.cursor() as cursor:
            try:
                cursor.execute(
                    "INSERT INTO farmacia.principios_activos (nombre_principio) VALUES (%s) RETURNING id_principio",
                    [nombre]
                )
                new_id = cursor.fetchone()[0]
            except Exception as e:
                # Si ya existe por el unique constraint
                return Response({'detail': 'El principio activo ya existe.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'id': new_id, 'nombre': nombre}, status=status.HTTP_201_CREATED)

    def delete(self, request, pk=None):
        role = get_user_role(request.user)
        if role not in ['ADMINISTRADOR', 'DIRECTOR_SERVICIO_MEDICO', 'DIRECTOR_MEDICO']:
            return Response({'detail': 'No tiene permisos para eliminar principios activos.'}, status=status.HTTP_403_FORBIDDEN)
        
        if not pk:
            return Response({'detail': 'ID no proporcionado.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with connection.cursor() as cursor:
            # Check if it's used in medicamento_componentes
            cursor.execute("SELECT 1 FROM farmacia.medicamento_componentes WHERE id_principio = %s", [pk])
            if cursor.fetchone():
                return Response({'detail': 'No se puede eliminar porque está en uso por uno o más medicamentos.'}, status=status.HTTP_400_BAD_REQUEST)
                
            cursor.execute("DELETE FROM farmacia.principios_activos WHERE id_principio = %s", [pk])
            
        return Response({'message': 'Principio activo eliminado exitosamente.'})
