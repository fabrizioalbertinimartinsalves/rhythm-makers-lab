import { differenceInHours, parseISO, isValid } from "date-fns";

/**
 * Checks if an appointment can be cancelled with a replacement credit.
 * Rule: Cancellation must happen more than 24 hours before the start time.
 * 
 * @param dateStr Date of the appointment (YYYY-MM-DD or ISO)
 * @param timeStr Time of the appointment (HH:mm)
 * @returns boolean True if credit should be given
 */
export const canReceiveCredit = (dateStr: string, timeStr?: string): boolean => {
  try {
    // Combine date and time if available
    const dateTimeStr = timeStr ? `${dateStr}T${timeStr}` : dateStr;
    const startTime = parseISO(dateTimeStr);
    
    if (!isValid(startTime)) return false;

    const now = new Date();
    const hoursDiff = differenceInHours(startTime, now);

    return hoursDiff >= 24;
  } catch (error) {
    console.error("Error calculating credit eligibility:", error);
    return false;
  }
};

/**
 * Formatting helper for clarity in the UI
 */
export const getCancellationMessage = (dateStr: string, timeStr?: string): string => {
  const eligible = canReceiveCredit(dateStr, timeStr);
  
  if (eligible) {
    return "✅ Cancelamento antecipado: Você receberá 1 crédito de reposição.";
  }
  
  return "⚠️ Cancelamento tardio: O cancelamento será feito, mas você NÃO terá direito a crédito de reposição (prazo inferior a 24h).";
};
