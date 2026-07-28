# Deliver notifications through durable idempotent intents

The platform creates one durable Notification Intent per originating event, recipient, and channel, then processes it at least once with a stable idempotency key. In-app delivery means a uniquely keyed notification exists in the recipient's inbox; email delivery means the replaceable email adapter or provider accepted the message, not that the recipient saw or received it. This prevents duplicates within the platform and supports retries, while honestly acknowledging that an external provider without idempotency cannot eliminate duplicates after an ambiguous timeout.

The initial channels are persistent in-app notifications and a local-recording email adapter rather than a real provider integration. Localization mechanics are decided in [ADR 0044](0044-localize-interface-and-notifications-from-shared-catalogs.md), and retention plus permanent deduplication evidence are decided in [ADR 0046](0046-compact-terminal-notifications-to-delivery-receipts.md).

The mutable event-recipient-channel product policy is intentionally separate from this architectural decision. [The notification policy catalog](../notification-policy.md) is its single source of truth, including required content, privacy exclusions, suppression conditions, and explicit decisions not to notify.
