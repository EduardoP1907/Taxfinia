import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convierte recursivamente BigInt y Decimal a string/number en objetos para serialización JSON
 */
export function convertBigIntToString(obj: any, depth = 0, path = 'root'): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    console.log(`[BIGINT] Converting BigInt at ${path}:`, obj);
    return obj.toString();
  }

  // Handle Prisma Decimal objects - use instanceof for proper detection
  if (obj instanceof Decimal) {
    const converted = parseFloat(obj.toString());
    console.log(`[DECIMAL] Converting Decimal at ${path}:`, obj.toString(), '→', converted);
    return converted;
  }

  // Fallback: check by constructor name (in case instanceof doesn't work)
  if (obj && typeof obj === 'object' && obj.constructor) {
    const constructorName = obj.constructor.name;
    // Prisma Decimal can be named 'Decimal' or 'i' (minified)
    if (constructorName === 'Decimal' || constructorName === 'i') {
      const converted = parseFloat(obj.toString());
      console.log(`[DECIMAL FALLBACK] Converting ${constructorName} at ${path}:`, obj.toString(), '→', converted);
      return converted;
    }
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => convertBigIntToString(item, depth + 1, `${path}[${index}]`));
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Only log at shallow depths to avoid too much output
        if (depth < 3 && key !== 'createdAt' && key !== 'updatedAt' && key !== 'id') {
          const value = obj[key];
          if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
            console.log(`[DECIMAL FOUND] At ${path}.${key}:`, value.constructor.name);
          }
        }
        converted[key] = convertBigIntToString(obj[key], depth + 1, `${path}.${key}`);
      }
    }
    return converted;
  }

  return obj;
}

// Alias para compatibilidad
export const bigIntToJSON = convertBigIntToString;
