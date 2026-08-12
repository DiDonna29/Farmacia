                                        // DEFAULT PLANTILLA POSIBLE USO
                                        // DEFAULT PLANTILLA POSIBLE USO
                                        // DEFAULT PLANTILLA POSIBLE USO
let camposFaltantes = [];

const isDark = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const getCSRFToken = () => {
    const name = 'csrftoken';
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith(name)).split('=')[1];
    return cookieValue;
}

async function fetchData(params) {
    const {
        url,
        data = {},
        method = 'POST',
        headers = {},
        timeout = 500000
    } = params;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken('csrf_token'),
                ...headers
            },
            body: method !== 'GET' ? JSON.stringify(data) : undefined,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('La solicitud tardó demasiado tiempo');
        }
        throw error;
    }
}

function mostrarToast(icon, title, timer = 1500) {
    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: timer,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.onmouseenter = Swal.stopTimer;
            toast.onmouseleave = Swal.resumeTimer;
        }
    });
    return Toast.fire({
        icon: icon,
        title: title,
        theme: isDark
    });
}

function mostrarAlertaBtn(icon, title, description) {
    Swal.fire({
        theme: isDark,
        position: "center",
        icon: icon,
        title: title,
        text: description,
        showConfirmButton: true,
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#3085d6',
    });
}

function mostrarAlerta(icon, title, description) {
    Swal.fire({
        theme: isDark,
        position: "center",
        icon: icon,
        title: title,
        text: description,
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
    });
}

const resetearValidacion = () => {
    camposFaltantes = [];
}

function validarCampo(selector, valor, esSelect = false) {
    if (!valor || valor === "default") {
        camposFaltantes.push(selector);
        
        if (esSelect) {
            $(`#${selector}`).addClass('is-invalid');
            const select2Container = $(`#${selector}`).next('.select-container');
            if (select2Container.length) {
                select2Container.find('.select-selection').addClass('is-invalid');
            }
        } else {
            $(`#${selector}`).addClass('is-invalid');
            $(`#${selector}-feedback`).text('Este campo es requerido');
        }
    } else {
        if (esSelect) {
            $(`#${selector}`).removeClass('is-invalid');
            const select2Container = $(`#${selector}`).next('.select-container');
            if (select2Container.length) {
                select2Container.find('.select-selection').removeClass('is-invalid');
            }
        } else {
            $(`#${selector}`).removeClass('is-invalid');
            $(`#${selector}-feedback`).text('');
        }
    }
}

$(document).ready(function() {
    // Seleccionamos todos los inputs y textareas con clase 'form-control'
    $('input.form-control, textarea.form-control, select.form-select').on('input change', function() {
        // Obtenemos el elemento actual
        const $currentInput = $(this);
        const inputId = $currentInput.attr('id');
        const $feedback = $(`#${inputId}-feedback`);
        
        // Validación básica (puedes personalizar según cada campo)
        if ($currentInput.val().trim() === '') {
            // $currentInput.addClass('is-invalid');
            // $feedback.text('Este campo es requerido');
        } else {
            $currentInput.removeClass('is-invalid');
            $feedback.text('');
            
            // Validaciones específicas por tipo de campo
            switch(inputId) {
                case 'email':
                    if (!isValidEmail($currentInput.val())) {
                        $currentInput.addClass('is-invalid');
                        $feedback.text('Ingrese un email válido');
                    }
                    break;
                case 'fecha_hecho':
                    if (!isValidDate($currentInput.val())) {
                        $currentInput.addClass('is-invalid');
                        $feedback.text('Ingrese una fecha válida');
                    }
                    break;
                // Agrega más casos según necesites
            }
        }
    });
});
                                        // DEFAULT PLANTILLA POSIBLE USO
                                        // DEFAULT PLANTILLA POSIBLE USO
                                        // DEFAULT PLANTILLA POSIBLE USO


                                        // SCRIPTS DE USO
                                        // SCRIPTS DE USO
                                        // SCRIPTS DE USO

let itemsLote = [];

function agregarAlLote() {
    // IDs EXACTOS de tu inventario.html
    const descripcion = document.getElementById('descripcion');
    const fabricante = document.getElementById('fabricante_medicamento');
    const presentacion_medicamento = document.getElementById('presentacion_medicamento');
    const cantidad_farmacia = document.getElementById('cantidad_farmacia');
    const cantidad_deposito = document.getElementById('cantidad_deposito');

    if(!descripcion.value || !fabricante.value || !presentacion_medicamento.value) {
        mostrarAlerta('error', 'Campos Incompletos', 'La descripción, fabricante y presentación son obligatorios.');;
        return;
    }


    if (parseInt(cantidad_farmacia) <= 0 && parseInt(cantidad_deposito) <= 0) {
        mostrarAlerta('warning', 'Cantidad Inválida', 'Debes asignar al menos una unidad a un destino.');
        return;
    }

    itemsLote.push({
        descripcion: descripcion.value.toUpperCase(),
        fabricante: fabricante.value.toUpperCase() || 'N/A',
        presentacion: presentacion_medicamento.value.toUpperCase() || 'N/A',
        farmacia: cantidad_farmacia.value || 0,
        deposito: cantidad_deposito.value || 0
    });

    mostrarToast('success', 'Producto añadido a la lista');

    render();

    // Limpieza de campos respetando tus IDs
    descripcion.value = ''; fabricante.value = ''; presentacion_medicamento.value = ''; cantidad_farmacia.value = ''; cantidad_deposito.value = '';
}

function render() {
    const tbody = document.getElementById('tabla-lote-body');
    const btn = document.getElementById('btn-finalizar'); 
    const contenedor_tabla = document.getElementById('contenedor_tabla_lote'); 
    const hiddenInput = document.getElementById('medicamentos_json'); 

    if(hiddenInput) hiddenInput.value = JSON.stringify(itemsLote);
    if(!tbody) return;

    if (itemsLote.length === 0) {
        if (contenedor_tabla) contenedor_tabla.classList.add('d-none'); // Oculta la tabla si está vacía
        if (btn) btn.disabled = true;
        return;
    }

    if (contenedor_tabla) contenedor_tabla.classList.remove('d-none');
    if(btn) btn.disabled = false;

    tbody.innerHTML = itemsLote.map((item, index) => `
        <tr>
            <td class="ps-4 align-middle fw-bold text-1000">${item.descripcion.toUpperCase()}</td>
            <td class="align-middle text-700">${item.fabricante.toUpperCase()}</td>
            <td class="align-middle text-700">${item.presentacion.toUpperCase()}</td>
            <td class="text-center align-middle fw-semi-bold">${item.farmacia}</td>
            <td class="text-center align-middle fw-semi-bold">${item.deposito}</td>
            <td class="text-end pe-4 align-middle">
                <button type="button" class="btn btn-link text-danger p-0" onclick="eliminarDelLote(${index})">
                    <span class="fas fa-trash-alt"></span>
                </button>
            </td>
        </tr>
    `).join('');
}

function eliminarDelLote(index) {
    itemsLote.splice(index, 1);
    render();
}

function quitar(i) {
    itemsLote.splice(i, 1);
    render();
}

function gestionarCamposCantidades() {
    const destino = document.getElementById('destino_carga').value;
    const inputFarmacia = document.getElementById('cantidad_farmacia');
    const inputDeposito = document.getElementById('cantidad_deposito');

    if (destino === 'farmacia') {
        // Activa Farmacia, apaga Depósito
        inputFarmacia.disabled = false;
        inputDeposito.disabled = true;
        inputDeposito.value = 0; 
    } else {
        // Activa Depósito, apaga Farmacia
        inputFarmacia.disabled = true;
        inputDeposito.disabled = false;
        inputFarmacia.value = 0;
    }
}

                                        // // // MODULO FARMACEUTA
                                        // // // MODULO FARMACEUTA
                                        // // // MODULO FARMACEUTA
let despachoLote = [];

function agregarAlDespacho() {
    const medicamento = document.getElementById('f_medicamento');
    const especialidad = document.getElementById('f_especialidad');
    const cantidad = document.getElementById('f_cantidad');

    if(!medicamento.value || !especialidad.value || !cantidad.value) {
        mostrarAlerta("error", "Faltan datos por completar, Por favor revisar el formulario.");
        return;
    }

    const existenciaMax = parseInt(medicamento.options[medicamento.selectedIndex].getAttribute('data-existencia'));
    if(parseInt(cantidad.value) > existenciaMax) {
        mostrarAlerta("error", "Existencia insuficiente. Solo hay " + existenciaMax);
        return;
    }

    despachoLote.push({
        id_med: medicamento.value,
        nombre_med: medicamento.options[medicamento.selectedIndex].text,
        id_esp: especialidad.value,
        nombre_especialidad: especialidad.options[especialidad.selectedIndex].text,
        cantidad: cantidad.value
    });

    renderDespacho();
    cantidad.value = '';
}

function renderDespacho() {
    const tbody = document.getElementById('tabla-despacho-body');
    const btn = document.getElementById('btn-confirmar');
    document.getElementById('despacho_json').value = JSON.stringify(despachoLote);

    if(despachoLote.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5">No hay ítems para despachar</td></tr>';
        btn.disabled = true;
        return;
    }

    btn.disabled = false;
    tbody.innerHTML = despachoLote.map((item, i) => `
        <tr>
            <td class="ps-4 align-middle fw-bold">${item.nombre_med}
            <div class="text-500 fs--2">Lote: ${item.lote} | Reg: ${item.fecha}</div>
            </td>
            <td class="align-middle">${item.nombre_esp}</td>
            <td class="text-center align-middle">${item.cantidad}</td>
            <td class="text-end pe-4">
                <button type="button" class="btn btn-sm text-danger" onclick="quitarDeLote(${i})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function quitarDeLote(i) {
    despachoLote.splice(i, 1);
    renderDespacho();
}

function actualizarDetallesDinamicos() {
    const select = document.getElementById('f_medicamento');
    const panel = document.getElementById('detalle_dinamico');
    const option = select.options[select.selectedIndex];

    if (!option.value) {
        panel.classList.add('d-none');
        return;
    }

    // Extraer datos de los atributos 'data-'
    const fab = option.getAttribute('data-fab');
    const lote = option.getAttribute('data-lote');
    const fecha = option.getAttribute('data-fecha');
    const existencia = parseInt(option.getAttribute('data-existencia'));

    // Llenar el panel
    document.getElementById('txt_fab').innerText = fab || 'No especificado';
    document.getElementById('txt_lote').innerText = lote || 'N/A';
    document.getElementById('txt_fecha').innerText = fecha || 'Sin fecha';
    
    // Alerta visual de existencia crítico
    const alerta = document.getElementById('alerta_existencia');
    if (existencia <= 5) {
        alerta.innerText = "⚠️ EXISTENCIA CRÍTICO: SOLO QUEDAN " + existencia;
        alerta.classList.remove('d-none');
    } else {
        alerta.classList.add('d-none');
    }

    panel.classList.remove('d-none');
}
                                        // SCRIPTS DE USO
                                        // SCRIPTS DE USO
                                        // SCRIPTS DE USO