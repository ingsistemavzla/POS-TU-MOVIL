const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const;

export const getMonthAbbrES = (monthIndex: number): string => {
  return MONTHS_ES[monthIndex] ?? 'ENE';
};

export const formatInvoiceNumber = (sequence: number, date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = getMonthAbbrES(date.getMonth());
  const year = date.getFullYear();
  const paddedSeq = String(sequence).padStart(4, '0');

  return `FAC-${day}${month}${year}-${paddedSeq}`;
};

export const getDayKey = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = getMonthAbbrES(date.getMonth());
  const year = date.getFullYear();

  return `${day}${month}${year}`;
};




