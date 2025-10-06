// Math Operations Module
const MATH_OPERATIONS = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '÷': (a, b) => {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
    },
    '^': (a, b) => Math.pow(a, b)
};

// Main Calculation Function
function calculateMathExpression(expression) {
    try {
        // Check for "Maths" prefix
        if (!expression.toLowerCase().startsWith('maths ')) {
            throw new Error('Please use the format "Maths [expression]" (e.g., Maths 4-6)');
        }

        // Extract expression after "Maths "
        const expr = expression.slice(6).trim();

        // Handle root queries
        if (expr.toLowerCase().startsWith('root of')) {
            const numbers = expr
                .replace(/root of/i, '')
                .replace(/etc\./i, '')
                .split(',')
                .map(num => num.trim())
                .filter(num => num)
                .map(num => {
                    const n = parseFloat(num);
                    if (isNaN(n)) throw new Error(`Invalid number "${num}" in root query`);
                    return Math.sqrt(n).toFixed(2);
                });
            return `Square roots: ${numbers.join(', ')}`;
        }

        // Handle standard arithmetic
        const tokens = expr.replace('÷', '/').match(/(\d+\.?\d*|[+\-*/^])/g);
        if (!tokens) throw new Error('Invalid expression format');

        const numbers = [];
        const operators = [];

        for (const token of tokens) {
            if (Object.keys(MATH_OPERATIONS).includes(token)) {
                operators.push(token);
            } else {
                numbers.push(parseFloat(token));
            }
        }

        if (numbers.length !== operators.length + 1) throw new Error('Invalid expression: check operator and number count');

        let result = numbers[0];
        for (let i = 0; i < operators.length; i++) {
            const op = operators[i];
            const nextNum = numbers[i + 1];
            result = MATH_OPERATIONS[op](result, nextNum);
        }

        return `Result: ${result.toFixed(2)}`;
    } catch (error) {
        return `Error: ${error.message}`;
    }
}

// Export for use in script.js
export { calculateMathExpression };