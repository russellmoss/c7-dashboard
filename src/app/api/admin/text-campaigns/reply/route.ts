import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TextReplyModel } from "@/lib/models";
import { sendSMS } from "@/lib/sms/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, replies, message } = body;

    if (!campaignId || !replies || replies.length === 0 || !message) {
      return NextResponse.json(
        { error: "Campaign ID, replies, and message are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // Get the replies to send to
    const replyDocuments = await TextReplyModel.find({
      _id: { $in: replies },
    });

    if (replyDocuments.length === 0) {
      return NextResponse.json(
        { error: "No valid replies found" },
        { status: 400 },
      );
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Send reply to each subscriber
    for (const reply of replyDocuments) {
      try {
        await sendSMS(
          reply.fromPhone,
          message,
          "C7 Dashboard"
        );
        
        // Mark reply as read
        reply.isRead = true;
        await reply.save();
        
        successCount++;
        results.push({
          replyId: reply._id,
          fromPhone: reply.fromPhone,
          fromName: reply.fromName,
          status: "success",
        });
      } catch (error) {
        errorCount++;
        results.push({
          replyId: reply._id,
          fromPhone: reply.fromPhone,
          fromName: reply.fromName,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Reply sent successfully. ${successCount} successful, ${errorCount} failed.`,
      results,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("Error sending reply:", error);
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 },
    );
  }
} 