import PQueue from "p-queue";

// Centralized queue manager for API rate limiting
export class QueueManager {
  // SMS Queue: 1 SMS every 2 seconds (Twilio recommended rate)
  static smsQueue = new PQueue({
    interval: 2000,
    intervalCap: 1,
    concurrency: 1,
  });

  // Email Queue: 1 email per second (Resend recommended rate)
  static emailQueue = new PQueue({
    interval: 1000,
    intervalCap: 1,
    concurrency: 1,
  });

  // Claude API Queue: 1 request every 3 seconds (to be safe)
  static claudeQueue = new PQueue({
    interval: 3000,
    intervalCap: 1,
    concurrency: 1,
  });

  // Batch processing queue for multiple messages
  static batchQueue = new PQueue({
    concurrency: 1,
  });

  /**
   * Add SMS to queue with rate limiting
   */
  static async queueSms(operation: () => Promise<any>): Promise<any> {
    return this.smsQueue.add(operation);
  }

  /**
   * Add email to queue with rate limiting
   */
  static async queueEmail(operation: () => Promise<any>): Promise<any> {
    return this.emailQueue.add(operation);
  }

  /**
   * Add Claude API call to queue with rate limiting
   */
  static async queueClaude(operation: () => Promise<any>): Promise<any> {
    return this.claudeQueue.add(operation);
  }

  /**
   * Process batch of messages with delays
   */
  static async processBatch(
    items: any[],
    processor: (item: any, index: number) => Promise<any>,
    delayMs: number = 1000,
  ): Promise<any[]> {
    const results = [];

    for (let i = 0; i < items.length; i++) {
      const result = await this.batchQueue.add(async () => {
        console.log(`[QueueManager] Processing item ${i + 1}/${items.length}`);
        const itemResult = await processor(items[i], i);

        // Add delay between items (except for the last one)
        if (i < items.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        return itemResult;
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Get queue statistics
   */
  static getStats() {
    return {
      sms: {
        size: this.smsQueue.size,
        pending: this.smsQueue.pending,
        isPaused: this.smsQueue.isPaused,
      },
      email: {
        size: this.emailQueue.size,
        pending: this.emailQueue.pending,
        isPaused: this.emailQueue.isPaused,
      },
      claude: {
        size: this.claudeQueue.size,
        pending: this.claudeQueue.pending,
        isPaused: this.claudeQueue.isPaused,
      },
      batch: {
        size: this.batchQueue.size,
        pending: this.batchQueue.pending,
        isPaused: this.batchQueue.isPaused,
      },
    };
  }

  /**
   * Clear all queues (useful for testing)
   */
  static clearAllQueues() {
    this.smsQueue.clear();
    this.emailQueue.clear();
    this.claudeQueue.clear();
    this.batchQueue.clear();
    console.log("[QueueManager] All queues cleared");
  }
}
