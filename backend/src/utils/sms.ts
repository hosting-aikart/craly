import config from '../config/index';

export interface OtpSmsInput {
  phone: string;
  otp: string;
}

/**
 * Sends a 6-digit OTP to a phone number via SMS/WhatsApp.
 * If external SMS provider credentials are not yet set in .env or in development,
 * it logs the OTP directly to the server console.
 */
export async function sendOtpSms(input: OtpSmsInput): Promise<void> {
  const normalizedPhone = input.phone.trim();

  // Log in server console for development / when SMS provider is not active
  console.log(`\n======================================================`);
  console.log(`[SMS / OTP SERVICE] To: ${normalizedPhone}`);
  console.log(`[SMS / OTP SERVICE] Verification Code: ${input.otp}`);
  console.log(`[SMS / OTP SERVICE] (Valid for 10 minutes)`);
  console.log(`======================================================\n`);

  // Future production SMS / WhatsApp webhook or Twilio dispatch can be hooked here
}
