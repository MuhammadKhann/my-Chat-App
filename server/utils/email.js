const { Resend } = require('resend');

// Initialize Resend lazily to prevent startup crash if key is missing
const getResendInstance = () => {
    if (!process.env.RESEND_API_KEY) {
        console.error("❌ CRITICAL: RESEND_API_KEY is missing from environment variables.");
        return null;
    }
    return new Resend(process.env.RESEND_API_KEY);
};

const sendOTPEmail = async (targetEmail, otp) => {
    try {
        const resend = getResendInstance();
        if (!resend) {
            return { 
                success: false, 
                error: "RESEND_API_KEY is not configured on the server. Please add it to Azure Application Settings." 
            };
        }

        console.log(`📡 Attempting to send OTP to: ${targetEmail}`);
        const { data, error } = await resend.emails.send({
            from: "Nexus Chat <onboarding@resend.dev>", // Default for free testing
            to: targetEmail,
            subject: "Verify your Nexus Account",
            html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #6366f1; text-align: center;">Nexus Messenger</h2>
          <p>Your verification code is below. It will expire in 10 minutes.</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #1f2937;">
            ${otp}
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
        });

        if (error) {
            console.error("❌ Resend API Error Details:", error);
            // Handle common free tier mistake
            let errorMsg = error.message || "Failed to send email via Resend.";
            if (errorMsg.includes("authorized") || error.name === "validation_error") {
                errorMsg = `Resend Free Tier Limit: You can only send verification emails to your own email address. (${targetEmail} is not authorized).`;
            }
            return { success: false, error: errorMsg };
        }
        
        console.log(`✅ Resend Success! ID: ${data?.id}`);
        return { success: true };
    } catch (err) {
        console.error("❌ Email System Fatal Error:", err.message);
        return { success: false, error: `Internal Email Error: ${err.message}` };
    }
};

module.exports = { sendOTPEmail };
