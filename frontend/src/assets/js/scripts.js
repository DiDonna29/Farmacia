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

// document.addEventListener('click', function(e) {
//     if (e.target.matches('.btn')) {
//         e.preventDefault();
        
//         e.target.blur ? e.target.blur() : e.target.closest('.btn')?.blur();
//     }
// });

// document.addEventListener('keydown', function(e) {
//     if (e.key === 'Enter' && e.target.matches('.btn')) {
//         e.preventDefault();
//         e.target.click();
//     }
// });
