from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import os

def create_pdf(output_path):
    doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        spaceAfter=15,
        alignment=1, # Center
        textColor=colors.HexColor("#1A2B4C")
    )
    
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=10,
        spaceAfter=5,
        textColor=colors.HexColor("#2C3E50")
    )
    
    normal_style = styles["Normal"]
    normal_style.fontSize = 10
    normal_style.spaceAfter = 5
    normal_style.leading = 12

    Story = []

    # Logos
    dem_logo = "c:/Users/Usuario/Desktop/Developments/Farmacia-DEM/frontend/src/assets/img/dem-2.png"
    sifarma_logo = "c:/Users/Usuario/Desktop/Developments/Farmacia-DEM/frontend/src/assets/img/logo sifarma - version claro.png"
    
    # Create a table for the header to hold the two logos and empty space
    # Scale logos
    img_width = 1.5 * inch
    img_height = 1.5 * inch
    
    logo_data = []
    if os.path.exists(dem_logo) and os.path.exists(sifarma_logo):
        img_left = Image(dem_logo, width=1.5*inch, height=0.6*inch)
        img_right = Image(sifarma_logo, width=2.5*inch, height=0.6*inch)
        img_right.hAlign = 'RIGHT'
        logo_data = [[img_left, '', img_right]]
        t = Table(logo_data, colWidths=[2.5*inch, 2.5*inch, 2.5*inch])
        t.setStyle(TableStyle([('ALIGN',(0,0),(0,0),'LEFT'),
                               ('ALIGN',(2,0),(2,0),'RIGHT'),
                               ('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
        Story.append(t)
    else:
        Story.append(Paragraph("LOGOS NO ENCONTRADOS", normal_style))
        
    Story.append(Spacer(1, 0.2 * inch))
    
    # Title
    Story.append(Paragraph("Guía de Carga Masiva", title_style))
    
    # Intro
    Story.append(Paragraph("Esta guía detalla el proceso para realizar la carga masiva de lotes de medicamentos en el Sistema de Inventario.", normal_style))
    Story.append(Paragraph("Para iniciar, debe descargar la <b>Plantilla Excel (.csv o .xlsx)</b> provista en el panel de Dotación.", normal_style))

    # Requisitos
    Story.append(Paragraph("Estructura del Archivo Excel", h2_style))
    Story.append(Paragraph("A continuación se muestra un ejemplo de cómo deben lucir las columnas y filas en su archivo:", normal_style))
    
    excel_data = [
        ["medicamento", "presentacion", "componentes", "cantidad", "fecha_vencimiento"],
        ["ACETAMINOFEN", "TABLETA 500 MG", "ACETAMINOFEN 500 MG", "1500", "31-12-2026"],
        ["IBUPROFENO", "GRAGEA 400 MG", "IBUPROFENO 400 MG", "500", "15-05-2027"],
        ["AMOXICILINA", "CAPSULA 500 MG", "AMOXICILINA 500 MG", "300", "10-10-2025"]
    ]
    
    excel_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#27AE60")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#F9F9F9")),
        ('GRID', (0,0), (-1,-1), 1, colors.lightgrey),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ])
    
    t_excel = Table(excel_data, colWidths=[1.3*inch, 1.2*inch, 1.5*inch, 0.8*inch, 1.2*inch])
    t_excel.setStyle(excel_style)
    Story.append(t_excel)
    Story.append(Spacer(1, 0.1 * inch))

    Story.append(Paragraph("Detalle de Columnas", h2_style))
    
    data = [
        ["Columna", "Descripción", "Ejemplo"],
        ["medicamento", "Nombre genérico o comercial exacto según catálogo.", "ACETAMINOFEN"],
        ["presentacion", "Presentación farmacológica exacta.", "TABLETA 500 MG"],
        ["componentes", "Principios activos, concentración y unidades.", "ACETAMINOFEN 500 MG"],
        ["cantidad", "Cantidad total de unidades numéricas.", "1500"],
        ["fecha_vencimiento", "Fecha en formato DD-MM-AAAA.", "31-12-2026"]
    ]
    
    t_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#34495E")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#ECF0F1")),
        ('GRID', (0,0), (-1,-1), 1, colors.white),
        ('FONTSIZE', (0,1), (-1,-1), 9),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ])
    
    t2 = Table(data, colWidths=[1.5*inch, 3.5*inch, 1.5*inch])
    t2.setStyle(t_style)
    Story.append(t2)
    Story.append(Spacer(1, 0.1 * inch))

    # Flujo
    Story.append(Paragraph("Proceso de Validación y Carga", h2_style))
    
    Story.append(Paragraph("<b>1. Modal de Vista Previa:</b> Al seleccionar el archivo, el sistema analizará la información y presentará un modal mostrando la lista de registros detectados. El sistema realiza un proceso de coincidencia inteligente (Fuzzy Match) para encontrar los medicamentos en el catálogo activo.", normal_style))
    
    Story.append(Paragraph("<b>2. Regla de Todo o Nada:</b> Si una sola fila presenta errores (por ejemplo, el medicamento no se encuentra, falta algún dato, o los componentes no coinciden), el sistema bloqueará completamente la carga y mostrará las alertas detalladas.", normal_style))
    
    Story.append(Paragraph("<b>3. Confirmación:</b> Si no existen errores, podrá hacer clic en 'Confirmar Carga' para registrar definitivamente todos los lotes de forma masiva. El sistema asignará automáticamente el código de lote interno (DEM-L-XXXX).", normal_style))
    
    doc.build(Story)

if __name__ == "__main__":
    output = "c:/Users/Usuario/Desktop/Developments/Farmacia-DEM/frontend/src/assets/docs/manual_carga_masiva.pdf"
    create_pdf(output)
    print(f"PDF generado exitosamente en {output}")
