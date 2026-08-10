import { useMutation, useQuery } from "@apollo/client/react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { MarkNotificationReadDocument, NotificationsDocument } from "./generated/graphql.js";

export function NotificationInbox() {
  const intl = useIntl();
  const { data, error, loading } = useQuery(NotificationsDocument);
  const [markRead] = useMutation(MarkNotificationReadDocument);
  const [locallyRead, setLocallyRead] = useState<Set<string>>(() => new Set());

  if (loading) return <p role="status"><FormattedMessage id="notifications.loading" /></p>;
  if (error) return <p role="alert"><FormattedMessage id="notifications.error" /></p>;
  const notifications = data?.notifications ?? [];

  return (
    <section className="workspace-card" id="notifications" aria-labelledby="notifications-title">
      <h2 id="notifications-title"><FormattedMessage id="notifications.title" /></h2>
      {notifications.length === 0 && <p><FormattedMessage id="notifications.empty" /></p>}
      <ul className="notification-list">
        {notifications.map((notification) => {
          const isRead = notification.readAt !== null || locallyRead.has(notification.id);
          return (
            <li key={notification.id}>
              <p>{notification.renderedContent}</p>
              <time dateTime={notification.createdAt}>{intl.formatDate(new Date(notification.createdAt), { dateStyle: "medium", timeStyle: "short" })}</time>
              {isRead ? <p role="status"><FormattedMessage id="notifications.read" /></p> : (
                <button type="button" onClick={async () => {
                  await markRead({ variables: { id: notification.id } });
                  setLocallyRead((current) => new Set(current).add(notification.id));
                }}>
                  <FormattedMessage id="notifications.markRead" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
