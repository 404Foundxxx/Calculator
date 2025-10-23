
// Elementos
const currentEl = document.getElementById('current');
const previousEl = document.getElementById('previous');
const buttons = document.querySelectorAll('.btn');
const historyEl = document.getElementById('history');
const toggleHistoryBtn = document.getElementById('toggleHistory');

// Estado
let expression = ''; // expresión en construcción (string)
let previousExpression = '';
const history = []; // {expr, result}

// Utilidades
function updateDisplay() {
    currentEl.textContent = expression || '0';
    previousEl.textContent = previousExpression || '';
}

function pushToExpression(str) {
    // Evitar regiones inválidas: controlar operadores consecutivos
    const last = expression.slice(-1);

    // Si se pulsa un operador y expression vacía y operador es - -> permitir para número negativo
    if (/^[+*\\/%]$/.test(str) && expression === '') return;

    // Si ultimo es operador y nuevo es operador, reemplaza (permitir paréntesis)
    if (/^[+\-*/%]$/.test(last) && /^[+\-*/%]$/.test(str)) {
        // si ambos son '-' y última es '(' entonces permitir; si str es '-' y last '(' allow; else replace
        if (str === '-' && last === '(') {
            expression += str;
        } else {
            // replace last operator by new one
            expression = expression.slice(0, -1) + str;
        }
        updateDisplay();
        return;
    }

    expression += str;
    updateDisplay();
}

function clearEntry() {
    expression = '';
    updateDisplay();
}

function clearAll() {
    expression = '';
    previousExpression = '';
    history.length = 0;
    renderHistory();
    updateDisplay();
}

function backspace() {
    expression = expression.slice(0, -1);
    updateDisplay();
}

function toggleHistory() {
    historyEl.classList.toggle('show');
}

function addHistory(expr, result) {
    history.unshift({ expr, result });
    if (history.length > 20) history.pop();
    renderHistory();
}

function renderHistory() {
    historyEl.innerHTML = '';
    if (history.length === 0) {
        const p = document.createElement('div');
        p.className = 'history-item';
        p.textContent = 'Vacío';
        historyEl.appendChild(p);
        return;
    }
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        const left = document.createElement('div');
        left.className = 'expr';
        left.textContent = item.expr;
        const right = document.createElement('div');
        right.className = 'result';
        right.textContent = item.result;
        div.appendChild(left);
        div.appendChild(right);
        div.title = 'Hacer clic para usar esta expresión';
        div.addEventListener('click', () => {
            expression = item.expr;
            updateDisplay();
        });
        historyEl.appendChild(div);
    });
}

// Evaluador seguro (cliente): sólo permite dígitos, paréntesis, operadores y punto decimal
function sanitizeForEval(input) {
    // Reemplazar porcentajes: "50%" -> "(50/100)"
    input = input.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

    // Reemplazar multiplicación visual '×' por '*', resta '−' por '-'
    input = input.replace(/×/g, '*').replace(/−/g, '-').replace(/÷/g, '/');

    // Comprueba caracteres permitidos
    const allowed = /^[0-9+\-*/().\s%]+$/;
    if (!allowed.test(input)) throw new Error('Caracteres no permitidos');

    // Evitar secuencias peligrosas: //--, ***, etc. (lo anterior ya limita)
    // Además, no permitir "()" vacíos
    if (/\(\s*\)/.test(input)) throw new Error('Paréntesis vacíos');

    return input;
}

function evaluateExpression() {
    if (!expression) return;
    try {
        const sanitized = sanitizeForEval(expression);
        // Para evaluación segura en cliente usamos Function
        // nota: se restringe la entrada con sanitizeForEval
        const result = Function('"use strict"; return (' + sanitized + ')')();
        const displayResult = (typeof result === 'number' && !isFinite(result)) ? 'Error' : String(result);
        previousExpression = expression + ' =';
        addHistory(expression, displayResult);
        expression = displayResult === 'Error' ? '' : displayResult;
        updateDisplay();
        renderHistory();
    } catch (err) {
        previousExpression = '';
        expression = '';
        currentEl.textContent = 'Error';
        setTimeout(updateDisplay, 1000);
    }
}

function applyPlusMinus() {
    // Cambia signo del número actualmente escrito (último token)
    // Buscamos el último número en la expresión
    const match = expression.match(/(-?\d+(\.\d+)?)$/);
    if (!match) {
        // si no hay número: si expression termina con ')' no aplicamos
        return;
    }
    const numStr = match[1];
    const start = match.index;
    const asNumber = parseFloat(numStr);
    const toggled = (asNumber * -1).toString();
    expression = expression.slice(0, start) + toggled;
    updateDisplay();
}

function applyPercent() {
    // Añadimos '%' al final si tiene un número (será procesado por sanitizeForEval)
    const match = expression.match(/(\d+(\.\d+)?)$/);
    if (!match) return;
    expression += '%';
    updateDisplay();
}

// Manejador botones
buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const v = btn.getAttribute('data-value');
        const act = btn.getAttribute('data-action');

        if (act) {
            if (act === 'clear-entry') clearEntry();
            else if (act === 'clear-all') clearAll();
            else if (act === 'backspace') backspace();
            else if (act === 'equals') evaluateExpression();
            else if (act === 'plusminus') applyPlusMinus();
            else if (act === 'percent') applyPercent();
            return;
        }

        if (v) {
            // si es punto: evitar más de un punto en el número actual
            if (v === '.') {
                const match = expression.match(/(\d+\.\d*|\d+)$/);
                if (match && match[0].includes('.')) return; // ya tiene punto
                // si está vacío o último es no dígito -> añadir "0."
                const last = expression.slice(-1);
                if (!last || /[^\d)]/.test(last)) {
                    expression += '0.';
                    updateDisplay();
                    return;
                }
            }
            pushToExpression(v);
        }
    });
});

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    const key = e.key;

    // números y operadores
    if ((/^[0-9]$/).test(key)) {
        pushToExpression(key);
        e.preventDefault();
        return;
    }
    if (key === '.') { buttonsForValue('.')?.click(); e.preventDefault(); return; }
    if (key === ',') { buttonsForValue('.')?.click(); e.preventDefault(); return; } // coma -> punto

    if (key === '+' || key === '-' || key === '*' || key === '/') {
        pushToExpression(key);
        e.preventDefault();
        return;
    }

    if (key === 'Enter') { evaluateExpression(); e.preventDefault(); return; }
    if (key === '=') { evaluateExpression(); e.preventDefault(); return; }
    if (key === 'Backspace') { backspace(); e.preventDefault(); return; }
    if (key === 'Escape') { clearAll(); e.preventDefault(); return; }
    if (key === '%') { applyPercent(); e.preventDefault(); return; }
    if (key === '(' || key === ')') { pushToExpression(key); e.preventDefault(); return; }

    // Mostrar historial con H
    if (key.toLowerCase() === 'h') {
        toggleHistory();
    }
});

function buttonsForValue(v) {
    return Array.from(document.querySelectorAll('[data-value]')).find(b => b.getAttribute('data-value') === v);
}

// Toggle historial (boton)
toggleHistoryBtn.addEventListener('click', () => {
    toggleHistory();
});

// Inicializar
updateDisplay();
renderHistory();

// Accesibilidad: focus outline visible when navigating with keyboard
document.addEventListener('keyup', (e) => {
    if (e.key === 'Tab') document.documentElement.style.scrollBehavior = 'smooth';
});