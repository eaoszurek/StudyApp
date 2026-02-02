/**
 * Email Service
 * Sends magic link emails
 */

const EMAIL_API_URL = process.env.EMAIL_API_URL || "https://api.resend.com/emails";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@peakprep.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Send magic link email
 * Returns the magic link URL in development mode (when EMAIL_API_KEY is not set)
 */
export async function sendMagicLink(email: string, token: string, isSignUp: boolean = false): Promise<string | null> {
  const verifyUrl = `${APP_URL}/api/auth/verify?token=${token}`;
  
  if (!EMAIL_API_KEY) {
    // In development, log the magic link instead of sending email
    console.log("=== MAGIC LINK (Development) ===");
    console.log(`Email: ${email}`);
    console.log(`Link: ${verifyUrl}`);
    console.log("================================");
    // Return the link so it can be shown in the API response
    return verifyUrl;
  }

  const emailContent = {
    from: EMAIL_FROM,
    to: email,
    subject: isSignUp ? "Welcome to Peak Prep - Verify your email" : "Sign in to Peak Prep",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E5532, #4A90E2); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Peak Prep</h1>
          </div>
          <div style="background: #f9fafb; padding: 40px; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1e293b; margin-top: 0;">
              ${isSignUp ? "Welcome! Verify your email" : "Sign in to your account"}
            </h2>
            <p style="color: #475569; font-size: 16px;">
              ${isSignUp 
                ? "Thanks for signing up! Click the button below to verify your email and get started." 
                : "Click the button below to sign in to your Peak Prep account. This link will expire in 24 hours."}
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" 
                 style="display: inline-block; background: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ${isSignUp ? "Verify Email" : "Sign In"}
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #0ea5e9; word-break: break-all;">${verifyUrl}</a>
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              This link will expire in 24 hours. If you didn't request this email, you can safely ignore it.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `${isSignUp ? "Welcome to Peak Prep! Verify your email" : "Sign in to Peak Prep"} by clicking this link: ${verifyUrl}`,
  };

  try {
    const response = await fetch(EMAIL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${EMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailContent),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to send email:", error);
      throw new Error("Failed to send email");
    }
    
    // Return null in production when email is successfully sent
    return null;
  } catch (error) {
    console.error("Email service error:", error);
    // In production, throw error
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    // In development, return the link even if email sending fails
    return verifyUrl;
  }
}

