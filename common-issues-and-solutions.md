# Common Development Issues

## Issue: Calculations don't match
Solution: Ensure you're copying the EXACT functions from original script

## Issue: MongoDB connection timeouts
Solution: Use connection pooling, check Atlas whitelist

## Issue: Long-running scripts timeout
Solution: Implement progress tracking, increase timeout limits

## Issue: Rate limit errors from Commerce7
Solution: Maintain 2000ms delay between API calls