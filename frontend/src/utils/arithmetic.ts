/**
 * Evaluates a simple arithmetic expression typed into a numeric input,
 * e.g. "1+1" → 2, "100*1.05" → 105. Falls back to a plain parseFloat when
 * the string isn't an expression (or can't be parsed as one).
 *
 * Only +, -, *, /, parentheses and decimal numbers are supported — no eval().
 */
export function evaluateArithmeticExpression(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '.');
  if (trimmed === '') return null;

  if (!/^[0-9+\-*/(). ]+$/.test(trimmed)) {
    const plain = parseFloat(trimmed);
    return isNaN(plain) ? null : plain;
  }

  try {
    const result = parseArithmeticExpression(trimmed);
    return isFinite(result) ? result : null;
  } catch {
    const plain = parseFloat(trimmed);
    return isNaN(plain) ? null : plain;
  }
}

// Recursive-descent parser:
//   expr   := term (('+'|'-') term)*
//   term   := factor (('*'|'/') factor)*
//   factor := ('+'|'-')* (number | '(' expr ')')
function parseArithmeticExpression(src: string): number {
  let pos = 0;

  const skipSpace = () => { while (src[pos] === ' ') pos++; };

  const parseFactor = (): number => {
    skipSpace();
    let sign = 1;
    while (src[pos] === '+' || src[pos] === '-') {
      if (src[pos] === '-') sign *= -1;
      pos++;
      skipSpace();
    }
    if (src[pos] === '(') {
      pos++;
      const value = parseExpr();
      skipSpace();
      if (src[pos] !== ')') throw new Error('Paréntesis sin cerrar');
      pos++;
      return sign * value;
    }
    const start = pos;
    while (pos < src.length && /[0-9.]/.test(src[pos])) pos++;
    if (start === pos) throw new Error('Número esperado');
    return sign * parseFloat(src.slice(start, pos));
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    skipSpace();
    while (src[pos] === '*' || src[pos] === '/') {
      const op = src[pos];
      pos++;
      const rhs = parseFactor();
      value = op === '*' ? value * rhs : value / rhs;
      skipSpace();
    }
    return value;
  };

  const parseExpr = (): number => {
    let value = parseTerm();
    skipSpace();
    while (src[pos] === '+' || src[pos] === '-') {
      const op = src[pos];
      pos++;
      const rhs = parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
      skipSpace();
    }
    return value;
  };

  const result = parseExpr();
  skipSpace();
  if (pos !== src.length) throw new Error('Expresión inválida');
  return result;
}
