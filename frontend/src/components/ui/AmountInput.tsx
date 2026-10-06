import React from 'react';
import { CommitNumberInput, type CommitNumberInputProps } from './CommitNumberInput';

/**
 * Campo para montos: se muestra como entero con separador de miles
 * («1.234.567»), pero el valor interno conserva sus decimales mientras el
 * usuario no lo edite. Comportamiento de edición en CommitNumberInput.
 */
type AmountInputProps = Omit<CommitNumberInputProps, 'format' | 'normalize'>;

const formatAmount = (value: number): string =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(value));

// «1.234.567» → «1234567»; la coma pasa a ser el separador decimal
const normalizeAmount = (text: string): string => text.replace(/\./g, '');

export const AmountInput: React.FC<AmountInputProps> = (props) => (
  <CommitNumberInput {...props} format={formatAmount} normalize={normalizeAmount} />
);
