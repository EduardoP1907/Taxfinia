import React, { useEffect, useRef, useState } from 'react';
import { evaluateArithmeticExpression } from '../../utils/arithmetic';

/**
 * Base de los campos numéricos editables (PercentInput, AmountInput).
 *
 * - Al entrar en el campo se selecciona todo el valor para sobrescribirlo.
 * - El valor se confirma al salir del campo o al pulsar Enter; Esc lo descarta.
 * - Acepta coma o punto decimal y expresiones simples («3+2», «100*1,05»).
 * - Sin flechas de incremento; sufijo opcional fijo a la derecha (p.ej. «%»).
 * - Si el usuario no modifica el texto no se emite ningún cambio, así el valor
 *   interno conserva toda su precisión aunque se muestre redondeado.
 */
export interface CommitNumberInputProps {
  value: number | null | undefined;
  onCommit: (value: number | null) => void;
  /** Texto mostrado cuando el campo no está en edición */
  format: (value: number) => string;
  /** Limpia el texto antes de evaluarlo (p.ej. quitar separadores de miles) */
  normalize?: (text: string) => string;
  suffix?: string;
  /** Si es true, un campo vacío emite null; si no, emite 0 */
  allowEmpty?: boolean;
  disabled?: boolean;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md';
  align?: 'left' | 'center' | 'right';
  className?: string;
  title?: string;
  'aria-label'?: string;
}

const SIZE_CLASSES = {
  xs: 'text-xs px-1 py-0.5 rounded',
  sm: 'text-sm px-2 py-1 rounded-md',
  md: 'text-sm px-3 py-2 rounded-lg',
};

const SUFFIX_PADDING = { xs: 'pr-4', sm: 'pr-6', md: 'pr-8' };

const SUFFIX_CLASSES = {
  xs: 'right-1 text-[10px]',
  sm: 'right-2 text-xs',
  md: 'right-3 text-sm',
};

export const CommitNumberInput: React.FC<CommitNumberInputProps> = ({
  value,
  onCommit,
  format,
  normalize = (t) => t,
  suffix,
  allowEmpty = false,
  disabled,
  placeholder = '0',
  size = 'md',
  align = 'right',
  className = '',
  title,
  'aria-label': ariaLabel,
}) => {
  const formatted = value === null || value === undefined || isNaN(value) ? '' : format(value);
  const [text, setText] = useState(formatted);
  const dirty = useRef(false);
  const justFocused = useRef(false);

  // Sincroniza con cambios externos mientras el usuario no está editando
  useEffect(() => {
    if (!dirty.current) setText(formatted);
  }, [formatted]);

  const commit = () => {
    if (!dirty.current) return;
    dirty.current = false;
    const cleaned = normalize(text).trim();
    if (cleaned === '') {
      onCommit(allowEmpty ? null : 0);
      setText(allowEmpty ? '' : format(0));
      return;
    }
    const parsed = evaluateArithmeticExpression(cleaned);
    if (parsed === null) {
      // Entrada no válida: se descarta y se vuelve al valor anterior
      setText(formatted);
      return;
    }
    onCommit(parsed);
    setText(format(parsed));
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={text}
        placeholder={placeholder}
        title={title}
        aria-label={ariaLabel}
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
        }}
        onFocus={(e) => {
          justFocused.current = true;
          e.currentTarget.select();
        }}
        onMouseUp={(e) => {
          // El mouseup del clic que dio el foco deshace la selección en algunos
          // navegadores; se ignora solo ese primero.
          if (justFocused.current) {
            e.preventDefault();
            justFocused.current = false;
          }
        }}
        onBlur={() => {
          justFocused.current = false;
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur(); // dispara commit vía onBlur
          } else if (e.key === 'Escape') {
            dirty.current = false;
            setText(formatted);
            e.currentTarget.blur();
          }
        }}
        className={[
          'w-full border border-slate-300 bg-white font-mono tabular-nums',
          'focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400',
          'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
          SIZE_CLASSES[size],
          suffix ? SUFFIX_PADDING[size] : '',
        ].join(' ')}
      />
      {suffix && (
        <span
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 ${SUFFIX_CLASSES[size]}`}
        >
          {suffix}
        </span>
      )}
    </div>
  );
};
