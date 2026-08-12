from django.db import models

class Titular(models.Model):
    cedula = models.CharField(max_length=20, primary_key=True, verbose_name="Cédula")
    nombres = models.CharField(max_length=100, verbose_name="Nombres")
    apellidos = models.CharField(max_length=100, verbose_name="Apellidos")
    nacionalidad = models.CharField(max_length=50, verbose_name="Nacionalidad")
    sexo = models.CharField(max_length=10, choices=[('M', 'Masculino'), ('F', 'Femenino')], verbose_name="Sexo")
    estado_civil = models.CharField(max_length=20, verbose_name="Estado Civil")
    fecha_nacimiento = models.DateField(verbose_name="Fecha de Nacimiento")
    correo = models.EmailField(blank=True, null=True, verbose_name="Correo Electrónico")
    telefono_principal = models.CharField(max_length=20, verbose_name="Teléfono Principal")
    telefono_secundario = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono Secundario")
    direccion = models.TextField(verbose_name="Dirección")
    
    # Datos Laborales
    fecha_ingreso = models.DateField(verbose_name="Fecha de Ingreso")
    fecha_egreso = models.DateField(blank=True, null=True, verbose_name="Fecha de Egreso")
    dependencia = models.CharField(max_length=100, verbose_name="Dependencia")
    tipo_empleado = models.CharField(max_length=50, verbose_name="Tipo de Empleado")
    estado_laboral = models.CharField(max_length=50, verbose_name="Estado Laboral") # Activo, Jubilado, etc.
    cargo = models.CharField(max_length=100, verbose_name="Cargo")
    status_laboral = models.CharField(max_length=50, verbose_name="Status Laboral")
    cuenta_nomina = models.CharField(max_length=50, blank=True, null=True, verbose_name="Cuenta Nómina")
    tipo_nomina = models.CharField(max_length=50, verbose_name="Tipo de Nómina")

    class Meta:
        verbose_name = "Titular"
        verbose_name_plural = "Titulares"

    def __str__(self):
        return f"{self.cedula} - {self.nombres} {self.apellidos}"

class CargaFamiliar(models.Model):
    titular = models.ForeignKey(Titular, on_delete=models.CASCADE, related_name='cargas', verbose_name="Titular")
    cedula = models.CharField(max_length=20, blank=True, null=True, verbose_name="Cédula (si aplica)")
    nombres = models.CharField(max_length=100, verbose_name="Nombres")
    apellidos = models.CharField(max_length=100, verbose_name="Apellidos")
    fecha_nacimiento = models.DateField(verbose_name="Fecha de Nacimiento")
    sexo = models.CharField(max_length=10, choices=[('M', 'Masculino'), ('F', 'Femenino')], verbose_name="Sexo")
    estado_civil = models.CharField(max_length=20, verbose_name="Estado Civil")
    telefono = models.CharField(max_length=20, blank=True, null=True, verbose_name="Teléfono")
    parentesco = models.CharField(max_length=50, verbose_name="Parentesco") # Hijo, Esposa, etc.
    status = models.CharField(max_length=50, verbose_name="Status")
    certificado_medico = models.BooleanField(default=False, verbose_name="Certificado Médico")
    lugar_registro = models.CharField(max_length=100, blank=True, null=True, verbose_name="Lugar de Registro")

    class Meta:
        verbose_name = "Carga Familiar"
        verbose_name_plural = "Cargas Familiares"

    def __str__(self):
        return f"{self.nombres} {self.apellidos} (Carga de {self.titular.cedula})"
