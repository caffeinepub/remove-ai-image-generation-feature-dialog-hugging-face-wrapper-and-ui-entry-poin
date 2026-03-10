// System Constants for Pixel Economy Configuration

/**
 * Admin principal identifier for system administration
 */
export const ADMIN_PRINCIPAL =
  "qed3y-ibcj7-nfsh6-6wmee-oorik-oitj5-oj6fl-n7k4l-y4clp-dkbee-kae";

/**
 * Pixel price in e8s units (0.1 ICP = 10,000,000 e8s)
 */
export const PIXEL_PRICE_E8S = 10_000_000n;

/**
 * Maximum pixels per purchase transaction (safety cap per individual purchase, NOT a total cap)
 */
export const MAX_PIXELS_PER_PURCHASE = 1_000;
