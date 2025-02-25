import {
  type MonthlyPayment,
  PERIOD,
  type Period,
  type RecurrenceConfig,
  type SinglePayment,
  type WeeklyPayment,
  type YearlyPayment,
} from "./types";

// Type guard utility function
const createTypeGuard =
  <T extends RecurrenceConfig>(period: Period) =>
  (payment: RecurrenceConfig): payment is T =>
    payment.period === period;

/**
 * Type guard for single payment configurations
 * @param {RecurrenceConfig} config - The payment configuration to check
 * @returns {boolean} True if config is a single payment
 */
export const isSinglePayment = createTypeGuard<SinglePayment>(PERIOD.NONE);

/**
 * Type guard for monthly payment configurations
 * @param {RecurrenceConfig} config - The payment configuration to check
 * @returns {boolean} True if config is a monthly payment
 */
export const isMonthlyPayment = createTypeGuard<MonthlyPayment>(PERIOD.MONTH);

/**
 * Type guard for weekly payment configurations
 * @param {RecurrenceConfig} config - The payment configuration to check
 * @returns {boolean} True if config is a weekly payment
 */
export const isWeeklyPayment = createTypeGuard<WeeklyPayment>(PERIOD.WEEK);

/**
 * Type guard for yearly payment configurations
 * @param {RecurrenceConfig} config - The payment configuration to check
 * @returns {boolean} True if config is a yearly payment
 */
export const isYearlyPayment = createTypeGuard<YearlyPayment>(PERIOD.YEAR);
