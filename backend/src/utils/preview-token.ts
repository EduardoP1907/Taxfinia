import jwt from 'jsonwebtoken';
import { config } from '../config/env';

const PREVIEW_SECRET = config.jwtSecret + '_preview';
const PREVIEW_TTL_SECONDS = 5 * 60; // 5 minutes

export function generatePreviewToken(reportId: string): string {
  return jwt.sign(
    { reportId, type: 'report_preview' },
    PREVIEW_SECRET,
    { expiresIn: PREVIEW_TTL_SECONDS }
  );
}

export function verifyPreviewToken(token: string): { reportId: string } {
  const payload = jwt.verify(token, PREVIEW_SECRET) as any;
  if (payload.type !== 'report_preview') throw new Error('Invalid token type');
  return { reportId: payload.reportId };
}

export const PREVIEW_TTL = PREVIEW_TTL_SECONDS;
