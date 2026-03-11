import jsPDF from 'jspdf';

interface CompanyAnalysis {
  company: {
    name: string;
    taxId?: string;
  };
  years: Array<{
    year: number;
    incomeStatement?: any;
    balanceSheet?: any;
    cashFlow?: any;
    additionalData?: any;
  }>;
  ratios?: any;
}

// Función para formatear números en millones
const formatMillions = (value: number): string => {
  return (value / 1000000).toFixed(1);
};

// Función para formatear porcentajes
const formatPercent = (value: number): string => {
  return value.toFixed(1);
};

// Función para determinar si hubo aumento o disminución
const getChangeText = (current: number, previous: number): string => {
  return current > previous ? 'superior' : 'inferior';
};

const getIncreaseDecreaseText = (current: number, previous: number): string => {
  return current > previous ? 'aumento' : 'disminución';
};

export const generateFinancialReport = (data: CompanyAnalysis) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = 20;

  // Obtener años
  const sortedYears = [...data.years].sort((a, b) => b.year - a.year);
  const currentYear = sortedYears[0];
  const previousYear = sortedYears[1];

  // Función para agregar nueva página si es necesario
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Función para agregar texto justificado
  const addJustifiedText = (text: string, fontSize: number = 10, lineHeight: number = 7) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach((line: string) => {
      checkPageBreak();
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // ENCABEZADO
  doc.setFontSize(10);
  const today = new Date();
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dateStr = `Santiago, ${today.getDate()} de ${months[today.getMonth()]} ${today.getFullYear()}`;
  doc.text(dateStr, margin, yPosition);
  yPosition += 15;

  // TÍTULO
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME ECONÓMICO SERVICIO GESTIÓN FINANCIERA', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // INTRODUCCIÓN
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  addJustifiedText(
    `Este reporte ha sido emitido por SOCIEDAD DE INVERSIONES FM02 LTDA y proveído a ${data.company.name}, y partes relacionadas, bajo todos los términos y condiciones que se expresan en este documento, incluyendo restricciones de revelación y presentación de este reporte a terceras partes.`,
    9, 5
  );
  yPosition += 5;

  // OBJETIVOS
  doc.setFont('helvetica', 'bold');
  addJustifiedText('OBJETIVOS', 11, 7);
  doc.setFont('helvetica', 'normal');
  addJustifiedText(
    `El objetivo es entregar información técnica de gestión financiera de ${data.company.name}, la cual permita los análisis que se determinen.`,
    9, 5
  );
  yPosition += 3;

  // ALCANCE
  doc.setFont('helvetica', 'bold');
  addJustifiedText('ALCANCE', 11, 7);
  doc.setFont('helvetica', 'normal');
  addJustifiedText(
    'Nuestra colaboración se limita a la calidad de asesores externos, por lo que no tomaremos decisiones por parte del cliente.',
    9, 5
  );
  yPosition += 3;

  // LIMITACIONES
  doc.setFont('helvetica', 'bold');
  addJustifiedText('LIMITACIONES AL ALCANCE', 11, 7);
  doc.setFont('helvetica', 'normal');
  addJustifiedText(
    'Las Partes acuerdan expresamente que la solución TAXFIN IA constituye una herramienta de diagnóstico y apoyo financiero desarrollado mediante inteligencia artificial, cuyo uso está destinado únicamente a entregar estimaciones, análisis y proyecciones de carácter referencial. En consecuencia, TAXFIN IA no sustituye la asesoría profesional contable, financiera, tributaria o legal, ni constituye una garantía absoluta sobre los resultados futuros de la empresa usuaria. La información entregada por TAXFIN IA deberá ser interpretada como insumo complementario de gestión, siendo de exclusiva responsabilidad del usuario la adopción de decisiones basadas en dichos resultados.',
    8, 4
  );
  yPosition += 10;

  // Logo/Espacio para firma
  doc.setFont('helvetica', 'italic');
  doc.text('INVERSIONES FM02 LTDA', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // ANÁLISIS DE ESTADO DE RESULTADO
  doc.addPage();
  yPosition = margin;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISIS DE ESTADO DE RESULTADO', margin, yPosition);
  yPosition += 10;

  if (currentYear?.incomeStatement) {
    const curr = currentYear.incomeStatement;
    const prev = previousYear?.incomeStatement || null;
    const hasPrev = !!prev;
    const prevYear = previousYear?.year;

    // Calcular valores necesarios
    const currentRevenue = curr.revenue || 0;
    const prevRevenue = prev?.revenue || 0;
    const revenueChange = hasPrev && prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue * 100) : 0;

    const currentGrossProfit = currentRevenue - (curr.costOfSales || 0);
    const prevGrossProfit = prevRevenue - (prev?.costOfSales || 0);
    const currentGrossMargin = currentRevenue > 0 ? (currentGrossProfit / currentRevenue * 100) : 0;
    const prevGrossMargin = prevRevenue > 0 ? (prevGrossProfit / prevRevenue * 100) : 0;
    const grossMarginChange = currentGrossMargin - prevGrossMargin;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Párrafo de ventas y margen bruto
    if (hasPrev) {
      addJustifiedText(
        `El año ${currentYear.year} tuvo ventas por MM$ ${formatMillions(currentRevenue)}, cifra ${formatPercent(Math.abs(revenueChange))}% ${getChangeText(currentRevenue, prevRevenue)} al año ${prevYear}, cerrando con un margen bruto de MM$ ${formatMillions(currentGrossProfit)}, equivalente a un ${formatPercent(currentGrossMargin)}% sobre la venta, esto implica un ${getIncreaseDecreaseText(currentGrossMargin, prevGrossMargin)} de ${formatPercent(Math.abs(grossMarginChange))} puntos porcentuales respecto al año ${prevYear}.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `El año ${currentYear.year} tuvo ventas por MM$ ${formatMillions(currentRevenue)}, cerrando con un margen bruto de MM$ ${formatMillions(currentGrossProfit)}, equivalente a un ${formatPercent(currentGrossMargin)}% sobre la venta.`,
        9, 5
      );
    }
    yPosition += 3;

    // Gastos de administración
    const currentOpEx = (curr.adminExpenses || 0) + (curr.staffCostsAdmin || 0);
    const prevOpEx = (prev?.adminExpenses || 0) + (prev?.staffCostsAdmin || 0);
    const currentOpExRatio = currentRevenue > 0 ? (currentOpEx / currentRevenue * 100) : 0;
    const prevOpExRatio = prevRevenue > 0 ? (prevOpEx / prevRevenue * 100) : 0;
    const opExChange = currentOpExRatio - prevOpExRatio;
    const opExAbsoluteChange = currentOpEx - prevOpEx;
    const opExPercentChange = prevOpEx > 0 ? (opExAbsoluteChange / prevOpEx * 100) : 0;

    if (hasPrev) {
      addJustifiedText(
        `Los gastos de administración y ventas, tuvieron en el año ${currentYear.year} un factor de ${formatPercent(currentOpExRatio)}% sobre ventas, ${getIncreaseDecreaseText(currentOpExRatio, prevOpExRatio)} ${formatPercent(Math.abs(opExChange))} puntos porcentuales respecto al año ${prevYear}, con un ${getIncreaseDecreaseText(currentOpEx, prevOpEx)} de M$ ${(opExAbsoluteChange / 1000).toFixed(0)}, equivalente a un ${formatPercent(Math.abs(opExPercentChange))}%.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `Los gastos de administración y ventas, tuvieron en el año ${currentYear.year} un factor de ${formatPercent(currentOpExRatio)}% sobre ventas.`,
        9, 5
      );
    }
    yPosition += 3;

    // EBITDA
    const currentEBITDA = currentGrossProfit - currentOpEx + (curr.depreciation || 0);
    const currentEBITDAMargin = currentRevenue > 0 ? (currentEBITDA / currentRevenue * 100) : 0;
    const prevEBITDA = prevGrossProfit - prevOpEx + (prev?.depreciation || 0);
    const prevEBITDAMargin = prevRevenue > 0 ? (prevEBITDA / prevRevenue * 100) : 0;
    const ebitdaMarginChange = currentEBITDAMargin - prevEBITDAMargin;

    if (hasPrev) {
      addJustifiedText(
        `El EBITDA, que es el resumen de los tres puntos anteriores, tuvo un resultado de MM$ ${formatMillions(currentEBITDA)}, esto es un ${formatPercent(currentEBITDAMargin)}% sobre la venta. En comparación con el año ${prevYear}, refleja un ${getIncreaseDecreaseText(currentEBITDAMargin, prevEBITDAMargin)} de ${formatPercent(Math.abs(ebitdaMarginChange))} puntos porcentuales en relación a la venta.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `El EBITDA tuvo un resultado de MM$ ${formatMillions(currentEBITDA)}, esto es un ${formatPercent(currentEBITDAMargin)}% sobre la venta.`,
        9, 5
      );
    }
    yPosition += 3;

    // Resultado de explotación (EBIT)
    const currentEBIT = currentEBITDA - (curr.depreciation || 0) + (curr.exceptionalIncome || 0) - (curr.exceptionalExpenses || 0);
    const currentEBITMargin = currentRevenue > 0 ? (currentEBIT / currentRevenue * 100) : 0;

    addJustifiedText(
      `Resultado de explotación, resulta en un factor de ${formatPercent(currentEBITMargin)}% sobre ventas, equivalente a MM$ ${formatMillions(currentEBIT)}.`,
      9, 5
    );
    yPosition += 3;

    // Resultado Excepcional
    const exceptionalResult = (curr.exceptionalIncome || 0) - (curr.exceptionalExpenses || 0);
    const exceptionalMargin = currentRevenue > 0 ? (exceptionalResult / currentRevenue * 100) : 0;

    addJustifiedText(
      `Resultado Excepcional, con indicadores de ${formatPercent(exceptionalMargin)}%, equivalente a MM$ ${formatMillions(exceptionalResult)}.`,
      9, 5
    );
    yPosition += 3;

    // Resultado financiero
    const financialResult = (curr.financialIncome || 0) - (curr.financialExpenses || 0);
    const financialMargin = currentRevenue > 0 ? (financialResult / currentRevenue * 100) : 0;

    addJustifiedText(
      `Resultado financiero muestra un resultado de M$ ${(financialResult / 1000).toFixed(0)}, equivalente a un ${formatPercent(financialMargin)}% sobre la venta.`,
      9, 5
    );
    yPosition += 3;

    // Beneficio Neto
    const currentEBT = currentEBIT + financialResult;
    const currentNetIncome = currentEBT - (curr.incomeTax || 0);
    const currentNetMargin = currentRevenue > 0 ? (currentNetIncome / currentRevenue * 100) : 0;

    const prevEBIT = prevGrossProfit - prevOpEx - (prev?.depreciation || 0);
    const prevFinancial = (prev?.financialIncome || 0) - (prev?.financialExpenses || 0);
    const prevEBT = prevEBIT + prevFinancial;
    const prevNetIncome = prevEBT - (prev?.incomeTax || 0);
    const prevNetMargin = prevRevenue > 0 ? (prevNetIncome / prevRevenue * 100) : 0;
    const netMarginChange = currentNetMargin - prevNetMargin;

    if (hasPrev) {
      addJustifiedText(
        `En cuanto al Beneficio Neto, ${getIncreaseDecreaseText(currentNetMargin, prevNetMargin)} en comparación con el ejercicio anterior en ${formatPercent(Math.abs(netMarginChange))} puntos porcentuales, esto es de ${formatPercent(prevNetMargin)}% a ${formatPercent(currentNetMargin)}%, siendo el Beneficio Neto ${currentYear.year} de MM$ ${formatMillions(currentNetIncome)}, en comparación con el año ${prevYear} de MM$ ${formatMillions(prevNetIncome)}.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `El Beneficio Neto del año ${currentYear.year} es de MM$ ${formatMillions(currentNetIncome)}, equivalente a un ${formatPercent(currentNetMargin)}% sobre la venta.`,
        9, 5
      );
    }
    yPosition += 5;

    // ROA y ROE (si hay datos de balance)
    if (currentYear?.balanceSheet) {
      const currBalance = currentYear.balanceSheet;
      const prevBalance = previousYear?.balanceSheet || null;

      const currentAssets = (currBalance.tangibleAssets || 0) + (currBalance.intangibleAssets || 0) +
                          (currBalance.financialInvestmentsLp || 0) + (currBalance.otherNoncurrentAssets || 0) +
                          (currBalance.inventory || 0) + (currBalance.accountsReceivable || 0) +
                          (currBalance.otherReceivables || 0) + (currBalance.taxReceivables || 0) +
                          (currBalance.cashEquivalents || 0);

      const currentEquity = (currBalance.shareCapital || 0) + (currBalance.reserves || 0) +
                          (currBalance.retainedEarnings || 0) - (currBalance.treasuryStock || 0);

      const currentROA = currentAssets > 0 ? (currentEBIT / currentAssets * 100) : 0;
      const currentROE = currentEquity > 0 ? (currentNetIncome / currentEquity * 100) : 0;

      if (prevBalance) {
        const prevAssets = (prevBalance.tangibleAssets || 0) + (prevBalance.intangibleAssets || 0) +
                          (prevBalance.financialInvestmentsLp || 0) + (prevBalance.otherNoncurrentAssets || 0) +
                          (prevBalance.inventory || 0) + (prevBalance.accountsReceivable || 0) +
                          (prevBalance.otherReceivables || 0) + (prevBalance.taxReceivables || 0) +
                          (prevBalance.cashEquivalents || 0);
        const prevEquity = (prevBalance.shareCapital || 0) + (prevBalance.reserves || 0) +
                          (prevBalance.retainedEarnings || 0) - (prevBalance.treasuryStock || 0);
        const prevROA = prevAssets > 0 ? (prevEBIT / prevAssets * 100) : 0;
        const prevROE = prevEquity > 0 ? (prevNetIncome / prevEquity * 100) : 0;

        addJustifiedText(
          `ROA, siendo este indicador, la medida en la cual se determina la rentabilidad de la empresa sobre los activos existentes, alcanza para el año ${currentYear.year}, una cifra de ${formatPercent(currentROA)}%. El año ${prevYear} este mismo indicador fue de un ${formatPercent(prevROA)}%.`,
          9, 5
        );
        yPosition += 3;
        addJustifiedText(
          `ROE, que es la rentabilidad sobre el patrimonio, muestra un resultado de ${formatPercent(currentROE)}%, cifra ${getChangeText(currentROE, prevROE)} al año ${prevYear}, que fue de ${formatPercent(prevROE)}%.`,
          9, 5
        );
      } else {
        addJustifiedText(
          `ROA del año ${currentYear.year}: ${formatPercent(currentROA)}%. ROE del año ${currentYear.year}: ${formatPercent(currentROE)}%.`,
          9, 5
        );
      }
      yPosition += 10;
    }
  }

  // ANÁLISIS DE BALANCES
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISIS DE BALANCES (ACTIVOS – PASIVOS – PATRIMONIO)', margin, yPosition);
  yPosition += 10;

  if (currentYear?.balanceSheet) {
    const currBal = currentYear.balanceSheet;
    const prevBal = previousYear?.balanceSheet || null;
    const hasPrevBal = !!prevBal;
    const prevYear = previousYear?.year;

    // Calcular totales actuales
    const currentTotalAssets = (currBal.tangibleAssets || 0) + (currBal.intangibleAssets || 0) +
                              (currBal.financialInvestmentsLp || 0) + (currBal.otherNoncurrentAssets || 0) +
                              (currBal.inventory || 0) + (currBal.accountsReceivable || 0) +
                              (currBal.otherReceivables || 0) + (currBal.taxReceivables || 0) +
                              (currBal.cashEquivalents || 0);

    const prevTotalAssets = prevBal ? (prevBal.tangibleAssets || 0) + (prevBal.intangibleAssets || 0) +
                           (prevBal.financialInvestmentsLp || 0) + (prevBal.otherNoncurrentAssets || 0) +
                           (prevBal.inventory || 0) + (prevBal.accountsReceivable || 0) +
                           (prevBal.otherReceivables || 0) + (prevBal.taxReceivables || 0) +
                           (prevBal.cashEquivalents || 0) : 0;

    const currentCurrentAssets = (currBal.inventory || 0) + (currBal.accountsReceivable || 0) +
                                (currBal.otherReceivables || 0) + (currBal.taxReceivables || 0) +
                                (currBal.cashEquivalents || 0);

    const prevCurrentAssets = prevBal ? (prevBal.inventory || 0) + (prevBal.accountsReceivable || 0) +
                             (prevBal.otherReceivables || 0) + (prevBal.taxReceivables || 0) +
                             (prevBal.cashEquivalents || 0) : 0;

    const currentAssetsRatio = currentTotalAssets > 0 ? (currentCurrentAssets / currentTotalAssets * 100) : 0;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (hasPrevBal && prevTotalAssets > 0) {
      const assetsChange = ((currentTotalAssets - prevTotalAssets) / prevTotalAssets * 100);
      const prevCurrentAssetsRatio = (prevCurrentAssets / prevTotalAssets * 100);
      const currentAssetsChange = currentAssetsRatio - prevCurrentAssetsRatio;
      addJustifiedText(
        `En el año ${currentYear.year} los activos ${getIncreaseDecreaseText(currentTotalAssets, prevTotalAssets)} en un ${formatPercent(Math.abs(assetsChange))}% en relación con el año anterior, siendo las cuentas de activo circulante equivalente a un ${formatPercent(currentAssetsRatio)}% de la estructura de activos totales, ${getIncreaseDecreaseText(currentAssetsRatio, prevCurrentAssetsRatio)} un ${formatPercent(Math.abs(currentAssetsChange))}% respecto al año ${prevYear}.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `En el año ${currentYear.year} los activos totales ascienden a MM$ ${formatMillions(currentTotalAssets)}, siendo las cuentas de activo circulante equivalente a un ${formatPercent(currentAssetsRatio)}% de la estructura de activos totales.`,
        9, 5
      );
    }
    yPosition += 3;

    // Existencias
    const inventoryRatio = currentCurrentAssets > 0 ? ((currBal.inventory || 0) / currentCurrentAssets * 100) : 0;
    if (hasPrevBal && prevCurrentAssets > 0) {
      const prevInventoryRatio = ((prevBal!.inventory || 0) / prevCurrentAssets * 100);
      const inventoryChange = inventoryRatio - prevInventoryRatio;
      addJustifiedText(
        `Las existencias ascienden al cierre del año ${currentYear.year} a M$ ${((currBal.inventory || 0) / 1000).toFixed(0)}, equivalente a un ${formatPercent(inventoryRatio)}% del activo circulante, con ${inventoryChange >= 0 ? 'un alza' : 'una baja'} de ${formatPercent(Math.abs(inventoryChange))} puntos porcentuales.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `Las existencias ascienden al cierre del año ${currentYear.year} a M$ ${((currBal.inventory || 0) / 1000).toFixed(0)}, equivalente a un ${formatPercent(inventoryRatio)}% del activo circulante.`,
        9, 5
      );
    }
    yPosition += 3;

    // Activo fijo
    const currentFixedAssets = (currBal.tangibleAssets || 0) + (currBal.intangibleAssets || 0);
    const currentFixedRatio = currentTotalAssets > 0 ? (currentFixedAssets / currentTotalAssets * 100) : 0;
    if (hasPrevBal && prevTotalAssets > 0) {
      const prevFixedAssets = (prevBal!.tangibleAssets || 0) + (prevBal!.intangibleAssets || 0);
      const prevFixedRatio = (prevFixedAssets / prevTotalAssets * 100);
      addJustifiedText(
        `La cuenta de activo fijo representa el ${formatPercent(currentFixedRatio)}% del total de los activos, en comparación con ${formatPercent(prevFixedRatio)}% del año ${prevYear}.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `La cuenta de activo fijo representa el ${formatPercent(currentFixedRatio)}% del total de los activos del año ${currentYear.year}.`,
        9, 5
      );
    }
    yPosition += 3;

    // Pasivo circulante
    const currentCurrentLiabilities = (currBal.bankDebtSp || 0) + (currBal.accountsPayable || 0) +
                                     (currBal.taxLiabilities || 0) + (currBal.otherLiabilitiesSp || 0);
    const prevCurrentLiabilities = prevBal ? (prevBal.bankDebtSp || 0) + (prevBal.accountsPayable || 0) +
                                  (prevBal.taxLiabilities || 0) + (prevBal.otherLiabilitiesSp || 0) : 0;

    const currentEquity = (currBal.shareCapital || 0) + (currBal.reserves || 0) +
                         (currBal.retainedEarnings || 0) - (currBal.treasuryStock || 0);

    const currentLiabRatio = currentTotalAssets > 0 ? (currentCurrentLiabilities / currentTotalAssets * 100) : 0;

    if (hasPrevBal && prevTotalAssets > 0) {
      const prevLiabRatio = (prevCurrentLiabilities / prevTotalAssets * 100);
      const liabChange = currentLiabRatio - prevLiabRatio;
      addJustifiedText(
        `El pasivo circulante pasó del año ${prevYear} de MM$ ${formatMillions(prevCurrentLiabilities)} a MM$ ${formatMillions(currentCurrentLiabilities)}, representando el año ${currentYear.year} un ${formatPercent(currentLiabRatio)}% del total del patrimonio neto y pasivos, esto es un ${getIncreaseDecreaseText(currentLiabRatio, prevLiabRatio)} de ${formatPercent(Math.abs(liabChange))} puntos porcentuales.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `El pasivo circulante del año ${currentYear.year} asciende a MM$ ${formatMillions(currentCurrentLiabilities)}, representando un ${formatPercent(currentLiabRatio)}% del total del patrimonio neto y pasivos.`,
        9, 5
      );
    }
    yPosition += 3;

    // Patrimonio neto
    if (hasPrevBal) {
      const prevEquity = (prevBal!.shareCapital || 0) + (prevBal!.reserves || 0) +
                        (prevBal!.retainedEarnings || 0) - (prevBal!.treasuryStock || 0);
      const equityChange = prevEquity !== 0 ? ((currentEquity - prevEquity) / Math.abs(prevEquity) * 100) : 0;
      addJustifiedText(
        `El patrimonio neto tuvo una fluctuación de ${formatPercent(Math.abs(equityChange))}% entre el año ${prevYear} y ${currentYear.year}.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `El patrimonio neto del año ${currentYear.year} asciende a MM$ ${formatMillions(currentEquity)}.`,
        9, 5
      );
    }
    yPosition += 3;

    // Capital de trabajo
    const currentWorkingCapital = currentCurrentAssets - currentCurrentLiabilities;
    if (hasPrevBal) {
      const prevWorkingCapital = prevCurrentAssets - prevCurrentLiabilities;
      const wcChange = prevWorkingCapital !== 0 ? ((currentWorkingCapital - prevWorkingCapital) / Math.abs(prevWorkingCapital) * 100) : 0;
      addJustifiedText(
        `El capital de trabajo, que representa el diferencial entre las cuentas de circulante, fue de MM$ ${formatMillions(currentWorkingCapital)}, representando ${currentWorkingCapital > prevWorkingCapital ? 'un aumento' : 'una disminución'} de un ${formatPercent(Math.abs(wcChange))}% respecto del año ${prevYear}.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `El capital de trabajo del año ${currentYear.year} es de MM$ ${formatMillions(currentWorkingCapital)}.`,
        9, 5
      );
    }
  }

  // Nueva página para estructura financiera
  doc.addPage();
  yPosition = margin;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ANÁLISIS DE ESTRUCTURA FINANCIERA', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.text('FINANCIACIÓN', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  if (currentYear?.balanceSheet) {
    const currBal = currentYear.balanceSheet;
    const prevBal = previousYear?.balanceSheet || null;
    const hasPrevBal = !!prevBal;
    const prevYear = previousYear?.year;

    const currentEquity = (currBal.shareCapital || 0) + (currBal.reserves || 0) +
                         (currBal.retainedEarnings || 0) - (currBal.treasuryStock || 0);

    const currentTotalLiabilities = (currBal.bankDebtLp || 0) + (currBal.otherLiabilitiesLp || 0) +
                                   (currBal.bankDebtSp || 0) + (currBal.accountsPayable || 0) +
                                   (currBal.taxLiabilities || 0) + (currBal.otherLiabilitiesSp || 0);

    const currentCapitalization = currentTotalLiabilities > 0 ? currentEquity / currentTotalLiabilities : 0;

    if (hasPrevBal) {
      const prevEquity = (prevBal!.shareCapital || 0) + (prevBal!.reserves || 0) +
                        (prevBal!.retainedEarnings || 0) - (prevBal!.treasuryStock || 0);
      const prevTotalLiabilities = (prevBal!.bankDebtLp || 0) + (prevBal!.otherLiabilitiesLp || 0) +
                                  (prevBal!.bankDebtSp || 0) + (prevBal!.accountsPayable || 0) +
                                  (prevBal!.taxLiabilities || 0) + (prevBal!.otherLiabilitiesSp || 0);
      const prevCapitalization = prevTotalLiabilities > 0 ? prevEquity / prevTotalLiabilities : 0;
      addJustifiedText(
        `En cuanto a la autonomía financiera, cabe mencionar que la capitalización del año ${currentYear.year} fue de ${currentCapitalization.toFixed(2)}, comparado con ${prevCapitalization.toFixed(2)} año anterior. Cabe recordar que el ratio de capitalización, indica el nivel de endeudamiento con capitales propios en comparación con terceros.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `En cuanto a la autonomía financiera, cabe mencionar que la capitalización del año ${currentYear.year} fue de ${currentCapitalization.toFixed(2)}. Cabe recordar que el ratio de capitalización, indica el nivel de endeudamiento con capitales propios en comparación con terceros.`,
        9, 5
      );
    }
    yPosition += 5;

    // Liquidez
    const currentCurrentAssets = (currBal.inventory || 0) + (currBal.accountsReceivable || 0) +
                                (currBal.otherReceivables || 0) + (currBal.taxReceivables || 0) +
                                (currBal.cashEquivalents || 0);
    const currentCurrentLiabilities = (currBal.bankDebtSp || 0) + (currBal.accountsPayable || 0) +
                                     (currBal.taxLiabilities || 0) + (currBal.otherLiabilitiesSp || 0);
    const currentLiquidityRatio = currentCurrentLiabilities > 0 ? currentCurrentAssets / currentCurrentLiabilities : 0;

    if (hasPrevBal) {
      const prevCurrentAssets = (prevBal!.inventory || 0) + (prevBal!.accountsReceivable || 0) +
                               (prevBal!.otherReceivables || 0) + (prevBal!.taxReceivables || 0) +
                               (prevBal!.cashEquivalents || 0);
      const prevCurrentLiabilities = (prevBal!.bankDebtSp || 0) + (prevBal!.accountsPayable || 0) +
                                    (prevBal!.taxLiabilities || 0) + (prevBal!.otherLiabilitiesSp || 0);
      const prevLiquidityRatio = prevCurrentLiabilities > 0 ? prevCurrentAssets / prevCurrentLiabilities : 0;
      addJustifiedText(
        `En cuanto a la seguridad financiera, el año ${currentYear.year}, la empresa muestra un factor de ${currentLiquidityRatio.toFixed(2)}, siendo ${getChangeText(currentLiquidityRatio, prevLiquidityRatio)} al año ${prevYear}, que fue de ${prevLiquidityRatio.toFixed(2)}, siendo este el indicador de cumplimiento sobre las obligaciones de corto plazo con recursos propios.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `En cuanto a la seguridad financiera, el año ${currentYear.year}, la empresa muestra un factor de ${currentLiquidityRatio.toFixed(2)}, siendo este el indicador de cumplimiento sobre las obligaciones de corto plazo con recursos propios.`,
        9, 5
      );
    }
    yPosition += 8;

    // INVERSIONES
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    addJustifiedText('INVERSIONES', 10, 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const currentFixedAssets = (currBal.tangibleAssets || 0) + (currBal.intangibleAssets || 0);
    const currentTotalAssets = currentFixedAssets + currentCurrentAssets;
    const currentFixedRatio = currentTotalAssets > 0 ? currentFixedAssets / currentTotalAssets : 0;

    if (hasPrevBal) {
      const prevCurrentAssets2 = (prevBal!.inventory || 0) + (prevBal!.accountsReceivable || 0) +
                                (prevBal!.otherReceivables || 0) + (prevBal!.taxReceivables || 0) +
                                (prevBal!.cashEquivalents || 0);
      const prevFixedAssets = (prevBal!.tangibleAssets || 0) + (prevBal!.intangibleAssets || 0);
      const prevTotalAssets2 = prevFixedAssets + prevCurrentAssets2;
      const prevFixedRatio = prevTotalAssets2 > 0 ? prevFixedAssets / prevTotalAssets2 : 0;
      addJustifiedText(
        `La inmovilización de recursos de largo plazo, es decir, la porción del activo fijo que no es liquidable en ese tiempo, presenta un factor de ${currentFixedRatio.toFixed(2)}, comparado con ${prevFixedRatio.toFixed(2)} año anterior.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `La inmovilización de recursos de largo plazo, es decir, la porción del activo fijo que no es liquidable en ese tiempo, presenta un factor de ${currentFixedRatio.toFixed(2)}.`,
        9, 5
      );
    }
    yPosition += 5;

    // LIQUIDEZ
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    addJustifiedText('LIQUIDEZ', 10, 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (hasPrevBal) {
      const prevCurrentAssets3 = (prevBal!.inventory || 0) + (prevBal!.accountsReceivable || 0) +
                                (prevBal!.otherReceivables || 0) + (prevBal!.taxReceivables || 0) +
                                (prevBal!.cashEquivalents || 0);
      const prevCurrentLiabilities3 = (prevBal!.bankDebtSp || 0) + (prevBal!.accountsPayable || 0) +
                                     (prevBal!.taxLiabilities || 0) + (prevBal!.otherLiabilitiesSp || 0);
      const prevLiquidityRatio3 = prevCurrentLiabilities3 > 0 ? prevCurrentAssets3 / prevCurrentLiabilities3 : 0;
      addJustifiedText(
        `El ratio de liquidez, que es la capacidad que tiene la empresa de cubrir sus compromisos de corto plazo, es de ${currentLiquidityRatio.toFixed(2)}, ${getChangeText(currentLiquidityRatio, prevLiquidityRatio3)} al año ${prevYear} que fue de ${prevLiquidityRatio3.toFixed(2)}, indicador que expresa la ${currentLiquidityRatio > 1.5 ? 'alta' : 'baja'} solvencia de la empresa.`,
        9, 5
      );
    } else {
      addJustifiedText(
        `El ratio de liquidez, que es la capacidad que tiene la empresa de cubrir sus compromisos de corto plazo, es de ${currentLiquidityRatio.toFixed(2)}, indicador que expresa la ${currentLiquidityRatio > 1.5 ? 'alta' : 'baja'} solvencia de la empresa.`,
        9, 5
      );
    }
    yPosition += 8;

    // ENDEUDAMIENTO
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    addJustifiedText('ENDEUDAMIENTO', 10, 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const currentDebtRatio = currentEquity !== 0 ? currentTotalLiabilities / currentEquity : 0;
    const currentLeverage = currentEquity !== 0 ? currentTotalAssets / currentEquity : 0;

    addJustifiedText(
      `El ratio de endeudamiento ${currentYear.year} fue de ${currentDebtRatio.toFixed(2)}, midiendo de esta forma la relación entre patrimonio neto y pasivo total. De esto se concluye un apalancamiento de ${currentLeverage.toFixed(2)}, que es la relación entre activos totales y patrimonio neto.`,
      9, 5
    );
  }

  // Nueva página para valoración
  doc.addPage();
  yPosition = margin;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROSPECCIÓN VALORACIÓN EMPRESA', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.text('CONSIDERACIONES GENERALES DE LA VALORACIÓN', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const considerations = [
    'El modelo fue construido en pesos chilenos.',
    `Las valorizaciones por flujo fueron realizadas a diciembre de ${currentYear?.year || new Date().getFullYear()}.`,
    `Se construyó un modelo de valorización por flujos que considera proyecciones con un horizonte al año ${(currentYear?.year || new Date().getFullYear()) + 5}, no considera efectos de proyecto adicionales a su actual gestión, considerando un periodo de 5 años para efectos de cálculo.`,
    'El Modelo de Valoración fue preparado considerando el negocio histórico y el negocio actual.',
    'En base a la información anterior y la composición de fondos propios y deuda externa, se determina WACC estimado.',
    'El valor determinado según flujos de caja descontado es una estimación basada en los datos disponibles.'
  ];

  considerations.forEach(text => {
    checkPageBreak(10);
    doc.text('• ' + text, margin + 5, yPosition);
    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin - 10);
    yPosition += lines.length * 5;
  });

  yPosition += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  addJustifiedText(
    '*Es importante mencionar que estos valores son el resultado sin considerar: Contingencias legales y/o tributarias, Valoración actualizada de activos, Responsabilidad y obligaciones ante los pasivos, Contratos vigentes, Contabilidad Financiera.',
    8, 4
  );
  yPosition += 3;

  addJustifiedText(
    'No asumimos ninguna responsabilidad con respecto a la probabilidad de que las proyecciones sean alcanzables, dado que los resultados reales podrían ser diferentes puesto que frecuentemente los acontecimientos y las circunstancias no resultan tal y como se esperaba y el presupuesto abarca un amplio período futuro en el que hay riesgos subyacentes, que se deberían tratar, en consecuencia, pudiendo estas diferencias ser, en algunos casos, significativas. SOCIEDAD DE INVERSIONES FM02 LTDA., no emite una opinión sobre las probabilidades de realización de las premisas y supuestos utilizados en las proyecciones financieras, así como tampoco emite opinión respecto a los valores utilizados.',
    8, 4
  );

  // Guardar el PDF
  doc.save(`Informe_Economico_${data.company.name.replace(/\s+/g, '_')}_${currentYear?.year || new Date().getFullYear()}.pdf`);
};
