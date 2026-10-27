/**
 * Contenido del Manual de Usuario PROMETHEIA (versión interactiva).
 * Fuente: «Manual de usuario PROMETHEIA 261026.pdf» (public/manual-usuario-prometheia.pdf).
 *
 * Marcas dentro de los textos (las interpreta ManualPage):
 *  - «Texto»  → nombre de un botón, campo o mensaje de la pantalla
 *  - [[6.2]]  → enlace a otra sección del manual
 * Los años se calculan con el año en curso para que el manual no quede desactualizado.
 */

export type ManualBlock =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'tip'; text: string }
  | { type: 'warning'; text: string };

export interface ManualSubsection {
  id: string;
  number: string;
  title: string;
  blocks: ManualBlock[];
}

export interface ManualSection {
  id: string;
  number: string;
  title: string;
  summary: string;
  /** Página de la app relacionada (scoped: lleva la empresa activa) */
  link?: { to: string; label: string; scoped?: boolean };
  blocks?: ManualBlock[];
  subsections: ManualSubsection[];
}

export interface FaqItem { q: string; a: string }
export interface GlossaryItem { term: string; definition: string }

export const sectionId = (number: string) => `s-${number.replace(/\./g, '-')}`;

export function buildManual(cy: number) {
  const prev = cy - 1;
  const next = cy + 1;
  const win = `${cy - 5} a ${cy - 1}`;

  const sections: ManualSection[] = [
    {
      id: sectionId('1'), number: '1', title: 'Qué puede hacer',
      summary: 'Resumen de las herramientas de la plataforma y requisitos para usarla.',
      blocks: [
        { type: 'p', text: 'PROMETHEIA es una plataforma web de análisis económico-financiero y valoración de empresas. Toma los estados financieros de una empresa, calcula automáticamente ratios, proyecciones y valoración, y genera informes profesionales redactados con inteligencia artificial.' },
        {
          type: 'table', head: ['Menú', 'Qué obtiene'], rows: [
            ['Datos Financieros', 'Balance clasificado, estado de resultados y datos adicionales de hasta 5 ejercicios'],
            ['Informe Financiero Anual', 'Ratios, riesgo de insolvencia (Altman, Springate) e informe redactado por IA'],
            ['Proyecciones a 10 Años', 'Proyección a 10 años y valoración por flujo de caja descontado (DCF)'],
            ['Proyección Financiera y Presupuesto Financiero', 'Proyección del año en curso y presupuesto del año siguiente, mes a mes'],
            ['Informes Proyectados', 'Informes IA que comparan lo proyectado con los años reales'],
            ['Asistente IA', 'IA que responde preguntas sobre las cifras de su empresa'],
          ],
        },
      ],
      subsections: [
        {
          id: sectionId('1.1'), number: '1.1', title: 'Requisitos',
          blocks: [{
            type: 'list', items: [
              'Un navegador actualizado (Chrome, Edge, Firefox o Safari).',
              'Una cuenta de correo para recibir los códigos de verificación.',
              'Los estados financieros de la empresa a analizar (balance clasificado y estado de resultados como mínimo).',
            ],
          }],
        },
      ],
    },
    {
      id: sectionId('2'), number: '2', title: 'Acceso a la plataforma',
      summary: 'Crear la cuenta, verificar el correo, iniciar y cerrar sesión, recuperar la contraseña.',
      blocks: [{ type: 'p', text: 'Para entrar necesita una cuenta verificada con su correo. El registro toma unos dos minutos y se hace una sola vez.' }],
      subsections: [
        {
          id: sectionId('2.1'), number: '2.1', title: 'Crear una cuenta',
          blocks: [
            {
              type: 'steps', items: [
                'Abra la página de registro («Crear cuenta»).',
                'Si recibió un enlace de invitación, ábralo: trae la invitación incluida.',
                'Complete «Nombre», «Apellido», «Email», «Contraseña» y «Confirmar Contraseña».',
                'Marque la casilla de aceptación de los términos y condiciones. Sin ella no se puede continuar.',
                'Presione el botón de registro. Recibirá un correo con un código de 6 dígitos.',
              ],
            },
            { type: 'tip', text: 'La contraseña debe tener mínimo 10 caracteres, al menos una letra mayúscula y al menos un número.' },
          ],
        },
        {
          id: sectionId('2.2'), number: '2.2', title: 'Verificar el correo',
          blocks: [{
            type: 'steps', items: [
              'Revise su bandeja de entrada (y la carpeta de spam) y busque el correo de PROMETHEIA.',
              'Escriba el código de 6 dígitos en la pantalla «Verifica tu email».',
              'El código vence a los pocos minutos; el plazo exacto aparece en pantalla. Si venció, presione «Reenviar código» cuando termine la cuenta regresiva.',
            ],
          }],
        },
        {
          id: sectionId('2.3'), number: '2.3', title: 'Iniciar sesión',
          blocks: [{
            type: 'steps', items: [
              'Vaya a «Iniciar sesión».',
              'Ingrese su «Email» y «Contraseña».',
              'Entrará al «Panel Principal».',
            ],
          }],
        },
        {
          id: sectionId('2.4'), number: '2.4', title: 'Recuperar la contraseña',
          blocks: [{
            type: 'steps', items: [
              'En la pantalla de inicio de sesión, abra «Recuperar contraseña».',
              'Escriba su email. Recibirá un código de recuperación.',
              'En «Restablecer contraseña» ingrese el email, el «Código de verificación», la «Nueva contraseña» y su confirmación.',
              'Verá «Contraseña actualizada. Inicia sesión.» y podrá entrar con la nueva clave.',
            ],
          }],
        },
        {
          id: sectionId('2.5'), number: '2.5', title: 'Cerrar sesión',
          blocks: [{ type: 'p', text: 'El botón «Cerrar Sesión» está al pie del menú lateral. Al cerrar sesión vuelve a la pantalla de acceso.' }],
        },
      ],
    },
    {
      id: sectionId('3'), number: '3', title: 'Recorrido por la interfaz',
      summary: 'Menú lateral, empresa activa, Panel Principal y el flujo de trabajo recomendado.',
      link: { to: '/dashboard', label: 'Ir al Panel Principal' },
      blocks: [{ type: 'p', text: 'La pantalla tiene dos zonas: el menú lateral oscuro a la izquierda y el área de trabajo a la derecha. En el celular el menú se abre con el botón de tres líneas de la barra superior.' }],
      subsections: [
        {
          id: sectionId('3.1'), number: '3.1', title: 'Menú lateral',
          blocks: [
            { type: 'p', text: 'El menú muestra su nombre, la empresa activa y las opciones de navegación:' },
            {
              type: 'table', head: ['Grupo', 'Opción', 'Para qué sirve'], rows: [
                ['Inicio', 'Panel Principal', 'Resumen de la cuenta y accesos rápidos'],
                ['Inicio', 'Mis Empresas', 'Crear, editar y elegir empresas'],
                ['Análisis Financiero', 'Datos Financieros', 'Cargar los estados financieros de cada ejercicio'],
                ['Análisis Financiero', 'Proyecciones a 10 Años', 'Proyección a 10 años y valoración DCF'],
                ['Análisis Financiero', `Informe Financiero Anual ${prev}`, 'Ratios, análisis y el informe con IA del último ejercicio cerrado'],
                ['Proyecciones Mensuales', `Proyección Financiera ${cy}`, 'Mes a mes del año en curso: meses reales más meses proyectados'],
                ['Proyecciones Mensuales', `Presupuesto Financiero ${next}`, 'Presupuesto mensual del año siguiente'],
                ['Proyecciones Mensuales', 'Informes Proyectados', 'Informes IA de la proyección y del presupuesto'],
                ['Inteligencia Artificial', 'Asistente IA', 'Chat con IA sobre las cifras de la empresa'],
                ['Ayuda', 'Manual de Usuario', 'Este manual interactivo y la descarga del manual en PDF'],
              ],
            },
          ],
        },
        {
          id: sectionId('3.2'), number: '3.2', title: 'Empresa activa',
          blocks: [
            { type: 'p', text: 'El recuadro «Empresa activa» del menú muestra la empresa con la que está trabajando. Todas las opciones de análisis, proyecciones e IA usan esa empresa.' },
            { type: 'tip', text: 'Si tiene más de una empresa, el botón de flechas junto al nombre permite «Cambiar empresa».' },
          ],
        },
        {
          id: sectionId('3.3'), number: '3.3', title: 'Panel Principal',
          blocks: [
            { type: 'p', text: 'El Panel Principal es la página de inicio. Contiene:' },
            {
              type: 'list', items: [
                'Indicadores: «Empresas Activas», «Informes Generados» y «Años con Ratios».',
                'Accesos rápidos a las opciones más usadas del menú.',
                'Estado de la suscripción: «SUSCRIPCIÓN VIGENTE HASTA DD-MM-AAAA», «SUSCRIPCIÓN VENCIDA» o «SUSCRIPCIÓN SIN VENCIMIENTO».',
                'Estado del servidor: si ve «SIN CONEXIÓN CON EL SERVIDOR», recargue la página; si persiste, avise al administrador.',
              ],
            },
          ],
        },
        {
          id: sectionId('3.4'), number: '3.4', title: 'Flujo de trabajo recomendado',
          blocks: [
            { type: 'p', text: 'La primera vez, siga estos pasos en orden:' },
            {
              type: 'steps', items: [
                'Empresa: cree o seleccione una empresa en «Mis Empresas» [[4]].',
                'Datos: ingrese los estados financieros (balance clasificado, estado de resultados) en «Datos Financieros» [[5]].',
                'Ratios: el sistema los calcula solo; revíselos en «Informe Financiero Anual» [[7]].',
                'Informe: genere y descargue el informe en «Informe Financiero Anual» [[11]].',
                'Consultar: resuelva dudas en «Asistente IA» [[13]].',
              ],
            },
            { type: 'p', text: 'Después, cuando lo necesite, complete «Proyecciones a 10 Años» [[9]] y las Proyecciones Mensuales [[10]].' },
          ],
        },
      ],
    },
    {
      id: sectionId('4'), number: '4', title: 'Gestión de empresas',
      summary: 'Crear, editar y eliminar empresas; reglas del RUT y escritura de constitución.',
      link: { to: '/empresas', label: 'Ir a Mis Empresas' },
      blocks: [{ type: 'p', text: 'Todo el análisis se hace sobre una empresa. Cada cuenta puede registrar las empresas que tenga habilitadas (una por defecto); si necesita registrar más, pida al administrador que amplíe su cupo.' }],
      subsections: [
        {
          id: sectionId('4.1'), number: '4.1', title: 'Crear una empresa',
          blocks: [
            {
              type: 'steps', items: [
                'Vaya a «Mis Empresas» y presione «Nueva Empresa».',
                'Complete el formulario (los campos con * son obligatorios).',
                'Guarde. La empresa aparece como tarjeta en la lista y pasa a ser la empresa activa.',
              ],
            },
            {
              type: 'table', head: ['Campo', 'Obligatorio', 'Indicaciones'], rows: [
                ['Nombre de la empresa', 'Sí', 'Razón social completa, por ejemplo ABC Technologies SpA'],
                ['RUT de empresa', 'Sí', 'Con o sin puntos, con guion y dígito verificador: 76.123.456-7'],
                ['Sector / Industria', 'No', 'Elija de la lista; la IA lo usa para contextualizar el análisis'],
                ['Tamaño de empresa', 'No', 'Grande, Mediana o Pequeña'],
                ['País', 'No', 'Si elige Chile, el RUT se valida con su dígito verificador'],
                ['Descripción', 'No', 'Qué hace la empresa, sus productos y clientes. Mientras más claro, mejor el informe IA'],
                ['Sitio web, Número de empleados, Año de fundación', 'No', 'Datos de contexto'],
                ['Año base de análisis', 'Sí', 'El último ejercicio cerrado que va a analizar'],
                ['Moneda', 'Sí', 'EUR, USD, MXN, ARS, COP, CLP, PEN o GBP. Todos los montos se ingresan en esta moneda'],
              ],
            },
          ],
        },
        {
          id: sectionId('4.2'), number: '4.2', title: 'Reglas del RUT',
          blocks: [{
            type: 'list', items: [
              'Para empresas chilenas el RUT debe tener un dígito verificador válido. Si no, verá «El RUT ingresado no es válido. Revisa el dígito verificador.»',
              'Un mismo RUT no puede estar registrado en dos cuentas. Si aparece «Ya existe una empresa registrada con esta identificación fiscal», contacte al administrador.',
            ],
          }],
        },
        {
          id: sectionId('4.3'), number: '4.3', title: 'Documento de escritura',
          blocks: [{ type: 'p', text: 'Al editar una empresa ya creada, puede adjuntar su escritura de constitución en PDF o TXT con «Seleccionar archivo (PDF o TXT)». La IA usa su contenido (objeto social, socios, capital) como contexto al redactar los informes. Puede reemplazarlo o quitarlo con «Eliminar documento».' }],
        },
        {
          id: sectionId('4.4'), number: '4.4', title: 'Editar una empresa',
          blocks: [{ type: 'p', text: 'Use el botón de lápiz («Editar») en la tarjeta. El nombre y el RUT no se pueden cambiar una vez que la empresa tiene un informe generado o un ejercicio consolidado [[6.2]].' }],
        },
        {
          id: sectionId('4.5'), number: '4.5', title: 'Eliminar una empresa',
          blocks: [{ type: 'p', text: 'Use el botón de papelera («Eliminar») y confirme en «¿Eliminar esta empresa?». Una empresa con informes generados o ejercicios consolidados no se puede eliminar; si lo necesita, pídalo al administrador.' }],
        },
      ],
    },
    {
      id: sectionId('5'), number: '5', title: 'Ingreso de datos financieros anuales',
      summary: 'Cargar balance, pérdidas y ganancias y datos adicionales; importar desde plantilla.',
      link: { to: '/datos', label: 'Ir a Datos Financieros', scoped: true },
      blocks: [{ type: 'p', text: 'Los estados financieros se cargan en Análisis Financiero → «Datos Financieros», con un ejercicio por columna. Puede cargar hasta 5 ejercicios; se recomiendan entre 3 y 5 para tener análisis de tendencias y proyecciones confiables.' }],
      subsections: [
        {
          id: sectionId('5.1'), number: '5.1', title: 'Barra de herramientas',
          blocks: [
            {
              type: 'list', items: [
                '«Agregar Año»: añade una columna para un nuevo ejercicio.',
                '«Guardar Todo»: guarda todos los ejercicios editables de una vez. Verá «Datos guardados correctamente».',
              ],
            },
            { type: 'warning', text: 'Los cambios no se guardan solos. Presione «Guardar Todo» antes de salir de la página.' },
          ],
        },
        {
          id: sectionId('5.2'), number: '5.2', title: 'Agregar y quitar años',
          blocks: [{
            type: 'list', items: [
              `Solo se pueden agregar ejercicios cerrados dentro de la ventana permitida [[6.1]]. En ${cy} son los años ${win}.`,
              'Para quitar un año use el botón de la cabecera de su columna. Solo puede quitar el primero o el último, para que los años sigan siendo consecutivos.',
            ],
          }],
        },
        {
          id: sectionId('5.3'), number: '5.3', title: 'Pestaña Balance de Situación',
          blocks: [
            { type: 'p', text: 'Los totales se calculan solos. Al pie, la fila «CUADRATURA» compara Total Activo con Patrimonio Neto + Pasivo:' },
            {
              type: 'list', items: [
                '«Cuadrado»: ambos lados son iguales.',
                '«Descuadrado»: hay una diferencia. Revise las partidas antes de generar informes; un balance descuadrado distorsiona todos los ratios.',
              ],
            },
          ],
        },
        {
          id: sectionId('5.4'), number: '5.4', title: 'Pestaña Pérdidas y Ganancias',
          blocks: [
            { type: 'tip', text: 'Ingrese todos los montos en positivo; el signo (+) o (−) del nombre indica si suma o resta.' },
            { type: 'p', text: 'Los subtotales (Resultado de explotación, excepcional, financiero, antes de impuestos y del ejercicio) se calculan solos.' },
          ],
        },
        {
          id: sectionId('5.5'), number: '5.5', title: 'Pestaña Datos Adicionales',
          blocks: [{ type: 'p', text: 'Estos datos alimentan los ratios de mercado, productividad y actividad. Si no los tiene, déjelos en cero: esos ratios aparecerán como no disponibles.' }],
        },
        {
          id: sectionId('5.6'), number: '5.6', title: 'Importar desde plantilla',
          blocks: [
            {
              type: 'steps', items: [
                'Presione «Importar».',
                'Paso 1 — Descarga la plantilla: presione «Descargar plantilla CSV» (archivo plantilla_importacion_prometheia.csv).',
                'Complete la plantilla en Excel con los datos de cada ejercicio, sin cambiar los nombres de las filas.',
                'Paso 2 — Sube el archivo completado: elija el archivo (.csv, .xlsx o .xls) y presione «Importar».',
                'Revise en la tabla que los valores hayan quedado en su lugar y que el balance cuadre.',
              ],
            },
            { type: 'p', text: 'La importación respeta las mismas reglas que la carga manual: no escribe en años de solo lectura ni fuera de la ventana permitida.' },
          ],
        },
        {
          id: sectionId('5.7'), number: '5.7', title: 'Consejos de carga',
          blocks: [{
            type: 'list', items: [
              'Use los estados financieros auditados o presentados al SII; mezcle lo menos posible fuentes distintas.',
              'Ingrese todos los años en la misma moneda y unidad (pesos, no miles de pesos).',
              'Revise la cuadratura de cada año antes de generar el informe: al generarlo, los años quedan fijos [[6.2]].',
            ],
          }],
        },
      ],
    },
    {
      id: sectionId('6'), number: '6', title: 'Ejercicios editables y consolidación',
      summary: 'Qué años se pueden cargar y cuándo un ejercicio queda en solo lectura.',
      blocks: [{ type: 'p', text: 'Un ejercicio anual se puede editar solo si está dentro de los últimos 5 años cerrados y todavía no ha sido emitido el informe final.' }],
      subsections: [
        {
          id: sectionId('6.1'), number: '6.1', title: 'Ventana de años permitidos',
          blocks: [
            { type: 'p', text: 'La ventana va desde el año actual menos 5 hasta el año anterior. El año en curso no se carga como dato anual porque no está cerrado; para ese año use la Proyección Financiera [[10]].' },
            {
              type: 'table', head: ['Año actual (Chile)', 'Ejercicios que se pueden cargar'], rows: [
                [String(cy), win],
                [String(next), `${next - 5} a ${next - 1}`],
              ],
            },
            { type: 'p', text: 'El ejercicio recién cerrado se habilita el 1 de enero. Los años que quedan fuera de la ventana se conservan en solo lectura.' },
          ],
        },
        {
          id: sectionId('6.2'), number: '6.2', title: 'Consolidación',
          blocks: [
            { type: 'p', text: 'Un ejercicio queda cerrado (fijo, de solo lectura) en cuanto se usa para algo que deja constancia:' },
            {
              type: 'list', items: [
                'Al generar el Informe Financiero Anual de la empresa.',
                'Al hacer una consulta en el Asistente IA.',
              ],
            },
            { type: 'p', text: 'Se consolidan todos los ejercicios anuales con datos. En pantalla, la columna del año consolidado muestra la etiqueta «Solo lectura» y sus celdas no se pueden editar.' },
          ],
        },
        {
          id: sectionId('6.3'), number: '6.3', title: 'Qué hacer si encontró un error en un año cerrado',
          blocks: [
            { type: 'p', text: 'Escriba al administrador indicando la empresa, el año y la corrección. El administrador puede reabrir la edición de los ejercicios de la empresa.' },
            { type: 'tip', text: 'Para evitarlo, revise la cuadratura y las cifras clave antes de generar el informe o usar el asistente.' },
          ],
        },
      ],
    },
    {
      id: sectionId('7'), number: '7', title: 'Análisis financiero y ratios',
      summary: 'Más de 30 ratios por ejercicio, calculados automáticamente.',
      link: { to: '/informe', label: 'Ir a Informe Financiero Anual', scoped: true },
      blocks: [{ type: 'p', text: 'Al guardar los datos, la plataforma calcula más de 30 ratios por ejercicio. Se ven en Análisis Financiero → «Informe Financiero Anual», en las pestañas «Pérdidas y Ganancias», «Balance Consolidado», «Ratios Financieros» y «Analítica».' }],
      subsections: [],
    },
    {
      id: sectionId('8'), number: '8', title: 'Analítica',
      summary: 'Gráficos de evolución de márgenes, liquidez, endeudamiento y riesgo.',
      link: { to: '/informe', label: 'Ir a Informe Financiero Anual', scoped: true },
      blocks: [{ type: 'p', text: 'Muestra en gráficos la evolución de márgenes, liquidez, endeudamiento y los puntajes de riesgo (Z-Score de Altman y Springate).' }],
      subsections: [],
    },
    {
      id: sectionId('9'), number: '9', title: 'Proyecciones a 10 años y valoración DCF',
      summary: 'Crear el escenario, definir tasas, revisar la proyección y valorar la empresa.',
      link: { to: '/proyecciones', label: 'Ir a Proyecciones a 10 Años', scoped: true },
      blocks: [
        { type: 'p', text: 'Análisis Financiero → «Proyecciones a 10 Años» proyecta la empresa a 10 años desde sus datos históricos y calcula su valor por flujo de caja descontado (DCF). Tiene cuatro hojas:' },
        {
          type: 'table', head: ['Hoja', 'Nombre', 'Qué hace'], rows: [
            ['4.0', 'Configurar Tasas', 'Define las tasas de crecimiento anuales. Es el punto de partida («Comenzar aquí»)'],
            ['4.1', 'Proyección Completa', 'Balance, P&G, ratios y flujo de caja libre (FCF) de cada año proyectado'],
            ['4.2', 'Proyección Simplificada', 'Edición manual de cifras y tasas año por año'],
            ['4.3', 'Valoración DCF', 'WACC, valor terminal y valor de la empresa'],
          ],
        },
        { type: 'tip', text: 'Necesita al menos un ejercicio anual cargado; con 3 años las tasas de referencia son más confiables.' },
      ],
      subsections: [
        {
          id: sectionId('9.1'), number: '9.1', title: 'Crear el escenario de proyección',
          blocks: [{ type: 'p', text: 'Si la empresa no tiene proyección, presione «Crear Proyección (10 años)». Se proyectan los 10 años siguientes al último ejercicio cargado.' }],
        },
        {
          id: sectionId('9.2'), number: '9.2', title: 'Hoja 4.0: tasas de crecimiento',
          blocks: [
            { type: 'p', text: 'Defina una tasa anual (%) para cada partida. Junto a cada campo verá como referencia el promedio de sus últimos 3 años.' },
            {
              type: 'table', head: ['Bloque', 'Tasas'], rows: [
                ['P&G', 'Crecimiento de Ventas, Coste de Ventas, Otros Gastos Operativos, Gastos de Administración, Excepcionales Netos y Financieros Netos'],
                ['Balance', 'Crecimiento de Total Activos, Patrimonio Neto y Total Pasivos'],
                ['Impuestos', 'Tasa impositiva (impuesto a la renta)'],
              ],
            },
            { type: 'p', text: 'Presione aplicar para llevar las tasas a todos los años proyectados.' },
            { type: 'tip', text: 'Comience de la referencia histórica y ajústela con criterio; tasas muy altas inflan la valoración.' },
          ],
        },
        {
          id: sectionId('9.3'), number: '9.3', title: 'Hoja 4.1: proyección completa',
          blocks: [{ type: 'p', text: 'Muestra año por año el balance, la cuenta de resultados, los ratios y el flujo de caja libre. Si cambia una cifra proyectada, la tasa de crecimiento se recalcula sola.' }],
        },
        {
          id: sectionId('9.4'), number: '9.4', title: 'Hoja 4.2: proyección simplificada',
          blocks: [{ type: 'p', text: 'Permite ajustar a mano las cifras o tasas de un año en particular (por ejemplo, una inversión grande en el año 3). Guarde los cambios al terminar.' }],
        },
        {
          id: sectionId('9.5'), number: '9.5', title: 'Hoja 4.3: valoración DCF',
          blocks: [{
            type: 'steps', items: [
              'Si es la primera vez, presione «Crear Proyección DCF». Requiere tener creada la proyección de la hoja 4.1.',
              'La plataforma estima el WACC (costo del capital) con IA según el sector y el país de la empresa.',
              'Ingrese la tasa de crecimiento perpetuo (g). La define usted; suele estar entre la inflación esperada y el crecimiento de largo plazo de la economía.',
              'Elija cuántos años de flujos considerar: 5, 6 o 7 años.',
              'Guarde. Verá «Parámetros DCF guardados correctamente».',
            ],
          }],
        },
        {
          id: sectionId('9.6'), number: '9.6', title: 'Lectura del resultado',
          blocks: [
            {
              type: 'list', items: [
                'El «Valor Estimado de la Empresa» (Enterprise Value) aparece al pie, con el desglose por año.',
                'El WACC debe ser mayor que g; si no, la valoración no se calcula.',
                'Si el valor terminal pesa más del 70% del total, la valoración depende casi entera de supuestos lejanos; revise g y las tasas.',
                'Si aparece «No se pudo obtener el WACC con IA», espere unos segundos y recargue la hoja.',
                'Los resultados se incluyen en el Informe Financiero Anual.',
              ],
            },
          ],
        },
      ],
    },
    {
      id: sectionId('10'), number: '10', title: 'Proyecciones mensuales',
      summary: `Proyección Financiera ${cy} (meses reales + proyectados) y Presupuesto Financiero ${next}.`,
      link: { to: '/forecast-mensual', label: `Ir a Proyección Financiera ${cy}`, scoped: true },
      blocks: [
        { type: 'p', text: `Este grupo trabaja mes a mes: la Proyección Financiera cubre el año en curso (Proyección Financiera ${cy}) y el Presupuesto Financiero el año siguiente (Presupuesto Financiero ${next}).` },
        { type: 'tip', text: 'Estos datos nunca se consolidan: puede editarlos mientras su suscripción esté vigente.' },
      ],
      subsections: [
        {
          id: sectionId('10.1'), number: '10.1', title: 'Proyección Financiera del año en curso',
          blocks: [
            { type: 'p', text: 'Combina los meses reales con meses proyectados.' },
            {
              type: 'steps', items: [
                `Abra «Proyección Financiera ${cy}» en el menú.`,
                'En «Meses cerrados» indique hasta qué mes tiene datos reales. Por ejemplo, en octubre elija Septiembre. Si elige «Ninguno (todo editable)», todos los meses quedan para ingreso directo.',
                'Escriba los datos reales de los meses cerrados. Se muestran en verde.',
                'Revise las tasas de crecimiento de la sección inferior; vienen sugeridas con el promedio de sus últimos 3 años.',
                'Presione «Guardar y recalcular».',
              ],
            },
            { type: 'p', text: 'Los meses no cerrados se calculan solos a partir del último mes real y de las tasas. Si la empresa no tiene datos anuales, los 12 meses quedan para ingreso directo.' },
          ],
        },
        {
          id: sectionId('10.2'), number: '10.2', title: 'Pestañas de la Proyección Financiera',
          blocks: [
            {
              type: 'table', head: ['Pestaña', 'Contenido', 'Editable'], rows: [
                ['Proyección P&G', 'Ventas, costos, gastos, resultados excepcional y financiero, impuestos y resultado de cada mes', 'Meses cerrados y tasas'],
                ['Balance Proyectado', 'Activo, patrimonio y pasivo de cada mes, con fila «Descuadratura»', 'No: se calcula desde el P&G y las tasas'],
              ],
            },
            { type: 'p', text: 'Puede reemplazar el valor de un mes cerrado escribiéndolo, o dejar la celda vacía para usar el calculado. Para habilitar más meses, aumente «Meses cerrados».' },
          ],
        },
        {
          id: sectionId('10.3'), number: '10.3', title: 'Presupuesto Financiero del año siguiente',
          blocks: [
            { type: 'p', text: 'El presupuesto parte de la Proyección Financiera del año en curso: cada mes se calcula desde el mismo mes de la proyección, aplicando las tasas del presupuesto.' },
            {
              type: 'steps', items: [
                `Complete primero la «Proyección Financiera ${cy}», con sus meses cerrados y tasas.`,
                `Abra «Presupuesto Financiero ${next}».`,
                'Ajuste las tasas de crecimiento del presupuesto.',
                'Presione «Guardar y recalcular».',
              ],
            },
          ],
        },
        {
          id: sectionId('10.4'), number: '10.4', title: 'Consejos',
          blocks: [{
            type: 'list', items: [
              'Actualice «Meses cerrados» cada mes, al cerrar la contabilidad.',
              'Revise la fila «Descuadratura» del balance: si no es cero, ajuste las tasas de activos, patrimonio y pasivos.',
              'Con ambos listos, genere los Informes Proyectados [[12]].',
            ],
          }],
        },
      ],
    },
    {
      id: sectionId('11'), number: '11', title: 'Informe Financiero Anual con IA',
      summary: 'Generar, ver y descargar el informe económico-financiero redactado por IA.',
      link: { to: '/informe', label: 'Ir a Informe Financiero Anual', scoped: true },
      blocks: [{ type: 'p', text: 'Es un análisis económico-financiero redactado por IA con las cifras de la empresa: resultados, balance, liquidez, solvencia, valoración, alertas y recomendaciones priorizadas. Se genera en Análisis Financiero → «Informe Financiero Anual» y tarda alrededor de un minuto.' }],
      subsections: [
        {
          id: sectionId('11.1'), number: '11.1', title: 'Antes de generar',
          blocks: [
            { type: 'warning', text: 'Generar el informe consolida los ejercicios anuales [[6.2]]: después ya no podrá corregirlos.' },
            { type: 'p', text: 'Revise antes:' },
            {
              type: 'list', items: [
                'El balance de cada año muestra «Cuadrado».',
                'Ventas, EBITDA y resultado neto coinciden con los estados financieros oficiales.',
                'La empresa tiene sector, país y descripción (mejoran el contexto del análisis).',
                'Si quiere valoración en el informe, la hoja 4.3 (DCF) tiene sus parámetros guardados.',
              ],
            },
          ],
        },
        {
          id: sectionId('11.2'), number: '11.2', title: 'Generar el informe',
          blocks: [
            {
              type: 'steps', items: [
                'Abra «Informe Financiero Anual» con la empresa activa.',
                'Presione «Generar Informe IA».',
                'Espere alrededor de un minuto. Puede seguir usando otras páginas.',
                'El informe aparece en la lista «Informes Generados». Si no lo ve, presione «Actualizar».',
              ],
            },
            { type: 'p', text: 'Con una cuenta de prueba, junto al botón se muestra cuántos informes gratuitos le quedan. Con la suscripción vencida el botón queda deshabilitado («Requiere una suscripción vigente»).' },
          ],
        },
        {
          id: sectionId('11.3'), number: '11.3', title: 'Estados del informe',
          blocks: [{
            type: 'table', head: ['Estado', 'Significado'], rows: [
              ['Pendiente', 'En cola para generarse'],
              ['Generando...', 'La IA está redactando el análisis'],
              ['Completado', 'Listo para ver y descargar'],
              ['Error', 'No se pudo generar; el motivo aparece bajo el informe. Revise que los datos estén completos y vuelva a intentarlo'],
            ],
          }],
        },
        {
          id: sectionId('11.4'), number: '11.4', title: 'Ver y descargar',
          blocks: [
            { type: 'p', text: 'Cada informe completado tiene tres botones. Las descargas son directas, incluso con la suscripción vencida:' },
            {
              type: 'table', head: ['Botón', 'Qué hace'], rows: [
                ['Informe Prometheia', 'Abre una vista previa de solo lectura durante 15 minutos. No permite descargar, imprimir ni copiar'],
                ['Descargar Prometheia', 'Descarga el informe completo en Word (.docx)'],
                ['Ejecutivo', 'Descarga un resumen ejecutivo de 2 a 3 páginas para el directorio (PDF)'],
              ],
            },
          ],
        },
        {
          id: sectionId('11.5'), number: '11.5', title: 'Volver a generar',
          blocks: [{ type: 'p', text: 'Puede generar un informe nuevo cuando quiera; los anteriores se conservan en la lista con su fecha.' }],
        },
      ],
    },
    {
      id: sectionId('12'), number: '12', title: 'Informes Proyectados',
      summary: 'Informes IA que comparan la proyección y el presupuesto con los años reales.',
      link: { to: '/informes-comparativos', label: 'Ir a Informes Proyectados', scoped: true },
      blocks: [{ type: 'p', text: 'Proyecciones Mensuales → «Informes Proyectados» genera dos informes con IA que comparan lo proyectado con los años reales. Generarlos no consolida los ejercicios anuales.' }],
      subsections: [
        {
          id: sectionId('12.1'), number: '12.1', title: 'Los dos informes',
          blocks: [
            {
              type: 'table', head: ['Informe', 'Compara', 'Requisitos'], rows: [
                [`Proyección Financiera ${cy}`, 'El año en curso contra los 3 años reales anteriores', `3 años anuales completos y la Proyección Financiera ${cy} guardada`],
                [`Presupuesto Financiero ${next}`, 'El presupuesto contra la proyección en curso y los 2 años reales anteriores', `2 años anuales completos, la Proyección Financiera ${cy} y el Presupuesto Financiero ${next} guardados`],
              ],
            },
            { type: 'p', text: 'Si falta algún requisito, el panel lo indica.' },
          ],
        },
        {
          id: sectionId('12.2'), number: '12.2', title: 'Generar y descargar',
          blocks: [{
            type: 'steps', items: [
              'Abra «Informes Proyectados» con la empresa activa.',
              'En el panel del informe que necesita, presione «Generar Informe».',
              'Espere alrededor de un minuto; el informe aparece en «Informes Generados».',
              'Descargue el informe en PDF o el resumen ejecutivo para el directorio.',
            ],
          }],
        },
      ],
    },
    {
      id: sectionId('13'), number: '13', title: 'Asistente IA',
      summary: 'Analista virtual que responde preguntas sobre las cifras de su empresa.',
      link: { to: '/asistente', label: 'Ir al Asistente IA', scoped: true },
      blocks: [{ type: 'p', text: 'Es un analista virtual que responde preguntas sobre su empresa con sus ejercicios, ratios, proyecciones y último informe. Está en Inteligencia Artificial → «Asistente IA».' }],
      subsections: [
        {
          id: sectionId('13.1'), number: '13.1', title: 'Antes de usarlo',
          blocks: [{ type: 'warning', text: 'La primera consulta consolida los ejercicios anuales [[6.2]]. Termine de corregir los datos antes de preguntar.' }],
        },
        {
          id: sectionId('13.2'), number: '13.2', title: 'Cómo preguntar',
          blocks: [{
            type: 'steps', items: [
              'Abra el asistente con la empresa activa.',
              'Escriba su pregunta o elija una de las preguntas sugeridas en pantalla.',
              'Presione Enter para enviar; Shift+Enter agrega una línea nueva.',
            ],
          }],
        },
        {
          id: sectionId('13.3'), number: '13.3', title: 'Buenas prácticas',
          blocks: [{
            type: 'list', items: [
              `Sea específico: "¿Por qué bajó el margen EBITDA de ${prev - 1} a ${prev}?" da una respuesta mejor que "¿Cómo vamos?".`,
              'Contraste las cifras importantes con las pestañas de ratios antes de usarlas en una decisión.',
            ],
          }],
        },
        {
          id: sectionId('13.4'), number: '13.4', title: 'Límites',
          blocks: [{
            type: 'table', head: ['Límite', 'Detalle'], rows: [
              ['Largo de la pregunta', 'Máximo 2.000 caracteres («Mensaje demasiado largo»)'],
              ['Largo de la respuesta', 'Respuestas breves y directas; para un análisis completo use el Informe Financiero Anual'],
              ['Alcance', 'Solo conoce los datos de la empresa activa'],
              ['Suscripción', 'Con la suscripción vencida verá «Asistente no disponible»'],
            ],
          }],
        },
        {
          id: sectionId('13.5'), number: '13.5', title: 'Historial',
          blocks: [{ type: 'p', text: 'La conversación se guarda en su navegador, por empresa. Si cambia de computador o borra los datos del navegador, el historial no aparece. El botón «Limpiar conversación» la borra y empieza de cero.' }],
        },
      ],
    },
    {
      id: sectionId('14'), number: '14', title: 'Mensajes frecuentes',
      summary: 'Qué significa cada mensaje de la plataforma y qué hacer.',
      subsections: [
        {
          id: sectionId('14.1'), number: '14.1', title: 'Mensajes y soluciones',
          blocks: [{
            type: 'table', head: ['Mensaje', 'Causa', 'Qué hacer'], rows: [
              ['Credenciales inválidas', 'Email o contraseña incorrectos', 'Revíselos o use «Recuperar contraseña»'],
              ['El código OTP ha expirado', 'Pasó el plazo del código', 'Presione «Reenviar código»'],
              ['Tu cuenta permite registrar una sola empresa / N empresas', 'Alcanzó el cupo de empresas de su cuenta', 'Use una empresa existente o pida al administrador que amplíe su cupo'],
              ['El RUT ingresado no es válido', 'Dígito verificador incorrecto', 'Revise el RUT en un documento oficial'],
              ['Ya existe una empresa registrada con esta identificación fiscal', 'El RUT está en otra cuenta', 'Contacte al administrador'],
              ['La razón social y el RUT no se pueden modificar...', 'La empresa ya tiene informes o años consolidados', 'Pida el cambio al administrador'],
              ['Solo se pueden cargar ejercicios cerrados entre AAAA y AAAA', 'Año fuera de la ventana', 'Cargue solo años de la ventana [[6.1]]'],
              ['El ejercicio AAAA ya fue incluido en un informe...', 'Año consolidado', 'Pida al administrador que habilite la edición'],
              ['Tu suscripción venció... modo solo lectura', 'Pasó el 31 de diciembre', 'Pida la renovación al administrador'],
              ['Error al generar el informe. Verifica que haya datos financieros completos', 'Faltan datos clave del año', 'Complete balance y resultados, guarde y reintente'],
              ['No se pudo obtener el WACC con IA', 'Falla temporal del servicio de IA', 'Espere unos segundos y recargue la hoja 4.3'],
              ['SIN CONEXIÓN CON EL SERVIDOR', 'Sin internet o servidor caído', 'Revise su conexión y recargue; si persiste, avise al administrador'],
            ],
          }],
        },
      ],
    },
  ];

  const faq: FaqItem[] = [
    { q: '¿Por qué no puedo cargar el año en curso?', a: 'Porque no está cerrado. Se trabaja en la Proyección Financiera [[10]] y se carga como dato anual desde el 1 de enero siguiente.' },
    { q: 'El balance me sale descuadrado, ¿qué reviso?', a: 'Que el resultado del ejercicio esté incluido en el patrimonio neto, que la depreciación acumulada esté restada del activo fijo y que no haya partidas duplicadas entre corto y largo plazo.' },
    { q: '¿Los datos se guardan solos?', a: 'No. En Datos Financieros presione «Guardar Todo»; en las Proyecciones Mensuales, «Guardar y recalcular».' },
    { q: '¿Puedo ver los ratios sin consolidar los años?', a: 'Sí. Solo generar el informe IA o consultar al asistente consolida [[6.2]].' },
    { q: 'Un ratio dice "No disponible".', a: 'Falta un dato o el divisor es cero. Por ejemplo, los ratios por empleado necesitan el personal medio en Datos Adicionales [[5.5]].' },
    { q: '¿La vista previa del informe se cierra sola?', a: 'Sí, a los 15 minutos. Vuelva a abrirla con «Informe Prometheia».' },
    { q: '¿Pierdo mis datos si vence la suscripción?', a: 'No. Quedan en modo solo lectura y vuelven a ser editables al renovar.' },
    { q: '¿Puedo registrar más de una empresa?', a: 'Sí, si el administrador amplió el cupo de su cuenta (por ejemplo, una empresa por cada suscripción contratada). Pídalo al administrador.' },
    { q: '¿El informe IA puede equivocarse?', a: 'La IA redacta sobre las cifras calculadas por la plataforma, pero puede interpretar mal un contexto. Revise el informe antes de entregarlo y complemente con su juicio profesional.' },
    { q: '¿En qué dispositivos funciona?', a: 'En cualquier navegador moderno; para cargar datos se recomienda un computador.' },
  ];

  const glossary: GlossaryItem[] = [
    { term: 'Año base', definition: 'Último ejercicio cerrado desde el que parten las proyecciones.' },
    { term: 'Ciclo de caja', definition: 'Días que pasan entre pagar a proveedores y cobrar a clientes: DSO + DIO − DPO.' },
    { term: 'Consolidación', definition: 'Estado de solo lectura de un ejercicio anual tras usarse en un informe o en el asistente.' },
    { term: 'Cuadratura', definition: 'Comprobación de que Total Activo = Patrimonio Neto + Pasivo.' },
    { term: 'DCF', definition: 'Flujo de caja descontado: valora la empresa trayendo a valor presente sus flujos futuros.' },
    { term: 'DIO, DSO, DPO', definition: 'Días de inventario, de cobro y de pago.' },
    { term: 'EBIT', definition: 'Resultado antes de intereses e impuestos (incluye partidas excepcionales).' },
    { term: 'EBITDA', definition: 'Resultado antes de intereses, impuestos, depreciaciones y amortizaciones.' },
    { term: 'EBT', definition: 'Resultado antes de impuestos.' },
    { term: 'Enterprise Value', definition: 'Valor de la empresa: suma del valor presente de los flujos y del valor terminal.' },
    { term: 'FCF', definition: 'Flujo de caja libre: caja que genera la operación después de inversiones.' },
    { term: 'Meses cerrados', definition: 'Meses de la Proyección Financiera con datos reales ya contabilizados.' },
    { term: 'Presupuesto Financiero', definition: 'Presupuesto mensual del año siguiente, construido sobre la Proyección Financiera.' },
    { term: 'Proyección Financiera', definition: 'Proyección mensual del año en curso que combina meses reales y proyectados.' },
    { term: 'ROA / ROE', definition: 'Rentabilidad sobre activos / sobre patrimonio.' },
    { term: 'Solo lectura (modo)', definition: 'Estado de una cuenta con suscripción vencida: puede ver y descargar, pero no modificar.' },
    { term: 'Springate (S-Score)', definition: 'Modelo de predicción de insolvencia; bajo 0,862 indica riesgo.' },
    { term: 'Tasa de crecimiento perpetuo (g)', definition: 'Crecimiento anual que se supone para siempre después del período proyectado.' },
    { term: 'Valor terminal', definition: 'Valor de todos los flujos posteriores al último año proyectado.' },
    { term: 'WACC', definition: 'Costo promedio ponderado del capital; la tasa con que se descuentan los flujos.' },
    { term: 'Z-Score de Altman', definition: 'Modelo de predicción de quiebra; para empresas no cotizadas, bajo 1,23 indica peligro y sobre 2,9 zona segura.' },
  ];

  return { sections, faq, glossary };
}

export const MANUAL_PDF_URL = '/manual-usuario-prometheia.pdf';
export const MANUAL_PDF_FILENAME = 'Manual de usuario PROMETHEIA.pdf';
