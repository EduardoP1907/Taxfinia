import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageOrientation,
  Header,
  Footer,
  PageNumber,
} from 'docx';
import fs from 'fs';
import type { AIAnalysisResult } from '../services/ai-analysis.service';

// ─── Color palette (PROMETHEIA: navy + amber) ────────────────────────────────
const NAVY_DARK = '0f172a';
const AMBER = 'f59e0b';
const AMBER_LIGHT = 'fef3c7';
const GRAY_LIGHT = 'f9fafb';
const WHITE = 'ffffff';

// ─── Helper: styled paragraph ───────────────────────────────────────────────
function styledParagraph(text: string, options?: {
  bold?: boolean;
  size?: number;  // half-points
  color?: string;
  spacing?: number;
  indent?: number;
  align?: typeof AlignmentType[keyof typeof AlignmentType];
}): Paragraph {
  return new Paragraph({
    alignment: options?.align || AlignmentType.JUSTIFIED,
    spacing: { after: options?.spacing ?? 120, before: 0 },
    indent: options?.indent ? { left: options.indent } : undefined,
    children: [
      new TextRun({
        text,
        bold: options?.bold ?? false,
        size: options?.size ?? 20,
        color: options?.color ?? '374151',
        font: 'Calibri',
      }),
    ],
  });
}

// ─── Section heading ────────────────────────────────────────────────────────
function sectionHeading(number: string, title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    shading: { type: ShadingType.SOLID, color: AMBER },
    children: [
      new TextRun({
        text: `  ${number}  `,
        bold: true,
        size: 24,
        color: WHITE,
        font: 'Calibri',
      }),
      new TextRun({
        text: `  ${title.toUpperCase()}`,
        bold: true,
        size: 24,
        color: WHITE,
        font: 'Calibri',
      }),
    ],
  });
}

// ─── Sub-section heading ────────────────────────────────────────────────────
function subSectionHeading(number: string, title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: AMBER },
    },
    children: [
      new TextRun({
        text: `${number}. ${title}`,
        bold: true,
        size: 22,
        color: NAVY_DARK,
        font: 'Calibri',
      }),
    ],
  });
}

// ─── Multi-paragraph text ───────────────────────────────────────────────────
function bodyText(text: string): Paragraph[] {
  // Normalize literal \n escape sequences that AI may produce as text (e.g. ".\n\n .")
  const normalized = text
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  return normalized
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 100, before: 0 },
        children: [
          new TextRun({
            text: line.trim().replace(/[\n\r]/g, ' '),
            size: 20,
            color: '374151',
            font: 'Calibri',
          }),
        ],
      }),
    );
}

// ─── Info box ───────────────────────────────────────────────────────────────
function infoBox(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: AMBER_LIGHT },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, size: 20, color: NAVY_DARK, font: 'Calibri' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: value, size: 20, color: '374151', font: 'Calibri' }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ─── Main generator ─────────────────────────────────────────────────────────
export interface DocxReportData {
  company: {
    name: string;
    taxId?: string;
    industry?: string;
    businessActivity?: string;
    country?: string;
    currency?: string;
  };
  latestYear: number;
  years: number[];
  dcfData?: {
    wacc?: number | null;
    equityValue?: number | null;
    terminalGrowthRate?: number | null;
  };
  aiAnalysis: AIAnalysisResult;
}

export async function generateNarrativeDocx(data: DocxReportData, outputPath: string): Promise<void> {
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  const currency = data.company.currency || 'CLP';

  const wacc = data.dcfData?.wacc ? `${(data.dcfData.wacc * 100).toFixed(1)}%` : 'N/D';
  const equityValue = data.dcfData?.equityValue
    ? new Intl.NumberFormat('es-CL').format(Math.round(data.dcfData.equityValue))
    : 'N/D';

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20, color: '374151' },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1080, bottom: 720, left: 900, right: 900 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: AMBER } },
                spacing: { after: 100 },
                children: [
                  new TextRun({ text: 'PROMETHEIA  |  Análisis y Valoración Financiera', size: 16, color: '6b7280', font: 'Calibri' }),
                  new TextRun({ text: '  —  CONFIDENCIAL', size: 16, bold: true, color: AMBER, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: AMBER } },
                spacing: { before: 80 },
                children: [
                  new TextRun({ text: `SOCIEDAD DE INVERSIONES FM02 LTDA.  |  ${data.company.name}  |  Pág. `, size: 16, color: '6b7280', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6b7280', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ─── COVER ────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 0 },
            shading: { type: ShadingType.SOLID, color: NAVY_DARK },
            children: [
              new TextRun({ text: '  INFORME ECONÓMICO  ', bold: true, size: 52, color: WHITE, font: 'Calibri' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            shading: { type: ShadingType.SOLID, color: AMBER },
            children: [
              new TextRun({ text: '  ANÁLISIS Y VALORACIÓN FINANCIERA — PROMETHEIA  ', bold: true, size: 24, color: WHITE, font: 'Calibri' }),
            ],
          }),
          styledParagraph(' ', { size: 18, spacing: 40 }),

          // Date and company
          styledParagraph(`Santiago, ${dateStr}`, { align: AlignmentType.RIGHT, size: 20, color: '6b7280', spacing: 80 }),
          styledParagraph(' ', { size: 12, spacing: 20 }),

          // Confidentiality box
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: AMBER_LIGHT },
                    children: [
                      new Paragraph({
                        spacing: { after: 80, before: 80 },
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'DOCUMENTO CONFIDENCIAL', bold: true, size: 22, color: NAVY_DARK, font: 'Calibri' }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 },
                        children: [
                          new TextRun({
                            text: `Preparado por SOCIEDAD DE INVERSIONES FM02 LTDA. para ${data.company.name}`,
                            size: 18, color: '4b5563', font: 'Calibri',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          styledParagraph(' ', { size: 12, spacing: 20 }),

          // Company info table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              infoBox('Empresa', data.company.name),
              infoBox('NIF / RUT', data.company.taxId || 'No especificado'),
              infoBox('Giro / Actividad', data.company.businessActivity || 'No especificado'),
              infoBox('Sector / Industria', data.company.industry || 'No especificado'),
              infoBox('País', data.company.country || 'No especificado'),
              infoBox('Moneda', currency),
              infoBox('Período de Análisis', data.years.slice().sort((a, b) => a - b).join(' — ')),
              infoBox('Año Base', String(data.latestYear)),
            ],
          }),

          styledParagraph(' ', { size: 24, spacing: 200 }),

          // ─── SECTION 1: OBJETIVO ──────────────────────────────
          sectionHeading('1', 'Objetivo del Informe'),
          ...bodyText(
            `El presente informe tiene por objetivo entregar un análisis técnico de gestión económica y financiera de ${data.company.name}, con el fin de evaluar su desempeño económico, estructura financiera, eficiencia operacional y proyección de valor, sirviendo de soporte para la toma de decisiones estratégicas.\n\nEste informe ha sido preparado por SOCIEDAD DE INVERSIONES FM02 LTDA., en su calidad de asesor financiero externo, con base en la información financiera correspondiente al ejercicio ${data.latestYear} y ejercicios anteriores disponibles.`,
          ),

          // ─── SECTION 2: ALCANCE ───────────────────────────────
          sectionHeading('2', 'Alcance del Servicio'),
          ...bodyText(
            `SOCIEDAD DE INVERSIONES FM02 LTDA. actúa exclusivamente en calidad de asesor externo. Su función se limita a la elaboración de análisis, diagnósticos y recomendaciones de carácter financiero, sin asumir función ejecutiva, ni responsabilidad directa sobre la gestión de la empresa.\n\nEl presente análisis es elaborado sobre la base de la información financiera proporcionada por el cliente, no habiéndose realizado auditoría independiente de la misma. La veracidad y completitud de los datos es de exclusiva responsabilidad del cliente.`,
          ),

          // ─── SECTION 3: LIMITACIONES ─────────────────────────
          sectionHeading('3', 'Limitaciones al Alcance y Responsabilidad'),
          ...bodyText(
            `PROMETHEIA es una herramienta de diagnóstico y soporte financiero basada en inteligencia artificial, que entrega estimaciones, análisis y proyecciones de carácter referencial. Los resultados obtenidos NO reemplazan el asesoramiento profesional contable, financiero, tributario o legal.\n\nEl usuario es el único responsable de la interpretación de los resultados y las decisiones que de ellos se deriven. Las proyecciones y valoraciones contenidas en este informe representan estimaciones técnicas basadas en metodologías reconocidas, sujetas a variaciones según el comportamiento real del mercado y la empresa.`,
          ),

          // ─── SECTION 4: ESTADO DE RESULTADOS ─────────────────
          sectionHeading('4', 'Análisis del Estado de Resultados'),
          ...bodyText(data.aiAnalysis.incomeAnalysis),

          // ─── SECTION 5: BALANCE ───────────────────────────────
          sectionHeading('5', 'Análisis de Balance'),
          ...bodyText(data.aiAnalysis.balanceAnalysis),

          // ─── SECTION 6: ESTRUCTURA FINANCIERA ────────────────
          sectionHeading('6', 'Análisis de Estructura Financiera'),

          subSectionHeading('6.1', 'Financiación'),
          ...bodyText(data.aiAnalysis.financingAnalysis),

          subSectionHeading('6.2', 'Inversiones'),
          ...bodyText(data.aiAnalysis.investmentAnalysis),

          subSectionHeading('6.3', 'Liquidez'),
          ...bodyText(data.aiAnalysis.liquidityAnalysis),

          subSectionHeading('6.4', 'Rotación y Eficiencia'),
          ...bodyText(data.aiAnalysis.rotationAnalysis),

          subSectionHeading('6.5', 'Solvencia y Endeudamiento'),
          ...bodyText(data.aiAnalysis.solvencyAnalysis),

          // ─── SECTION 7: VALORACIÓN ────────────────────────────
          sectionHeading('7', 'Prospección y Valoración de la Empresa'),

          subSectionHeading('7.1', 'Significado Técnico'),
          ...bodyText(
            `La valoración de una empresa es el proceso de estimar su valor económico en un momento determinado, tomando en cuenta su capacidad de generación de flujos futuros, estructura financiera, nivel de riesgo y condiciones de mercado. El valor obtenido es de carácter referencial y no constituye un precio de transacción.`,
          ),

          subSectionHeading('7.2', 'Consideraciones Generales del Modelo'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              infoBox('Moneda del análisis', currency),
              infoBox('Información disponible al', `Diciembre ${data.latestYear}`),
              infoBox('Horizonte de proyección', '5 años'),
              infoBox('Metodología principal', 'Flujo de Caja Descontado (DCF)'),
              infoBox('Tasa de descuento (WACC)', wacc),
              infoBox('Valor económico estimado', equityValue !== 'N/D' ? `${currency} ${equityValue}` : 'Ver análisis'),
            ],
          }),
          styledParagraph(' ', { size: 12, spacing: 20 }),
          ...bodyText(data.aiAnalysis.valuationAnalysis),

          // ─── SECTION 8: ANÁLISIS DE TENDENCIAS ───────────────
          sectionHeading('8', 'Análisis de Tendencias y Evolución Histórica'),
          ...bodyText(data.aiAnalysis.trendAnalysis),

          // ─── SECTION 9: ALERTAS ESTRATÉGICAS ─────────────────
          sectionHeading('9', 'Alertas Estratégicas'),
          styledParagraph(
            'Las siguientes alertas han sido identificadas por PROMETHEIA a partir del análisis comparativo y evolutivo de los estados financieros:',
            { spacing: 100 },
          ),
          ...bodyText(data.aiAnalysis.strategicAlerts),

          // ─── SECTION 10: CONSISTENCIA DE DATOS ───────────────
          sectionHeading('10', 'Verificación de Consistencia Financiera'),
          styledParagraph(
            'Resultado del motor de consistencia PROMETHEIA, que verifica la coherencia interna de los estados financieros y detecta anomalías o variaciones atípicas:',
            { spacing: 100 },
          ),
          ...bodyText(data.aiAnalysis.consistencyAlerts),

          // ─── SECTION 11: RECOMENDACIONES ─────────────────────
          sectionHeading('11', 'Recomendaciones Priorizadas para el Directorio'),
          styledParagraph(
            'Las siguientes recomendaciones han sido generadas por PROMETHEIA, ordenadas por prioridad estratégica y basadas en el análisis integral de la posición y tendencia financiera de la empresa:',
            { spacing: 100 },
          ),
          ...bodyText(data.aiAnalysis.prioritizedRecommendations),

          // ─── CIERRE TÉCNICO ───────────────────────────────────
          styledParagraph(' ', { size: 24, spacing: 200 }),
          new Paragraph({
            spacing: { before: 200, after: 120 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 6, color: AMBER },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: AMBER },
            },
            shading: { type: ShadingType.SOLID, color: AMBER_LIGHT },
            children: [
              new TextRun({ text: '  CIERRE TÉCNICO  ', bold: true, size: 22, color: NAVY_DARK, font: 'Calibri' }),
            ],
          }),
          ...bodyText(
            `El presente informe constituye un diagnóstico financiero estructurado, diseñado para entregar visibilidad económica, financiera y patrimonial de la empresa analizada, sirviendo como base objetiva para procesos de evaluación estratégica y planificación financiera.\n\nSu contenido es de carácter estrictamente confidencial y ha sido preparado exclusivamente para el uso interno del destinatario. Cualquier reproducción, divulgación o distribución total o parcial de su contenido requiere autorización expresa de SOCIEDAD DE INVERSIONES FM02 LTDA.\n\nFecha de emisión: ${dateStr}`,
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}
