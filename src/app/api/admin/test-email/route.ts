import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Test email content
    const testEmailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #a92020;">Milea Estate Vineyard - Test Email</h1>
        <p>Hello ${name || "there"},</p>
        <p>This is a test email from your KPI Dashboard system to verify that email functionality is working correctly.</p>
        <p>If you received this email, it means:</p>
        <ul>
          <li>✅ Resend API is configured correctly</li>
          <li>✅ Email templates are working</li>
          <li>✅ Your subscription is active</li>
        </ul>
        <p>You will receive regular KPI reports based on your subscription settings.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This is a test email from the Milea Estate Vineyard KPI Dashboard system.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: "Milea Estate Vineyard <onboarding@resend.dev>",
      to: [email],
      subject: "Test Email - KPI Dashboard System",
      html: testEmailContent,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    console.log("Test email sent successfully:", data);
    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      data,
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 },
    );
  }
}
