# Compact terminal notifications to Delivery Receipts

In-app notifications remain visible for 90 days, and detailed attempts plus rendered email content remain for 30 days after successful delivery or administrator suppression. Unresolved failures remain actionable. Cleanup compacts terminal records to permanent Delivery Receipts containing only event, opaque recipient, channel, outcome, completion time, and optional provider message identifier under the unique event-recipient-channel constraint. Read, archive, expiry, and content cleanup cannot erase deduplication proof.
