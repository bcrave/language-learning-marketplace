# Share FormatJS catalogs across UI and notifications

The product localizes its complete interface in English and Spanish with FormatJS, using React Intl in the web application and the same ICU message catalogs from worker processes. ICU messages handle plurals, selections, numbers, dates, times, validation text, and accessibility labels consistently, while administrator-authored curriculum and Learning Feedback remain in their authored language. A User's saved locale selects rendering at delivery time rather than duplicating message logic by channel.
