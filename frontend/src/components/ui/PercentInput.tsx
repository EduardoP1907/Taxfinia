import React from 'react';
import { CommitNumberInput, type CommitNumberInputProps } from './CommitNumberInput';
import { formatPercentValue } from '../../utils/percent';

/**
 * Campo único para introducir porcentajes en toda la app.
 * El usuario escribe el porcentaje directo: «5» = 5%, «5,5» o «5.5» = 5,5%.
 * Comportamiento de edición (selección al entrar, Enter / salir para confirmar,
 * Esc para descartar) en CommitNumberInput.
 *
 * `value` y `onCommit` trabajan en puntos porcentuales (5 = 5%), no en decimal.
 */
type PercentInputProps = Omit<CommitNumberInputProps, 'format' | 'normalize' | 'suffix'> & {
  /** Decimales máximos a mostrar (default 2) */
  decimals?: number;
};

export const PercentInput: React.FC<PercentInputProps> = ({ decimals = 2, ...props }) => (
  <CommitNumberInput
    {...props}
    format={(v) => formatPercentValue(v, decimals)}
    normalize={(t) => t.replace(/%/g, '')}
    suffix="%"
  />
);
