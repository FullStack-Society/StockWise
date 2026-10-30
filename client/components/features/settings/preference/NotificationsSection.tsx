"use client";

import PreferenceToggle from "./PreferenceToggle";
import { NOTIFICATION_EVENTS, type EditablePreferences } from "./types";
import styles from "@/styles/settings/PreferencesPanel.module.css";

export default function NotificationsSection({
  preferences,
  pending,
  message,
  onToggleInvitations,
}: {
  preferences: EditablePreferences;
  pending: boolean;
  message: string;
  onToggleInvitations: () => void;
}) {
  return (
    <section className={styles.card} aria-labelledby="notifications-title">
      <h2 id="notifications-title" className={styles.cardTitle}>
        Notifications
      </h2>
      <p className={styles.cardSub}>
        Choose how you’d like to be notified about activity.
      </p>
      <div className={styles.notificationWrap}>
        <table className={styles.notificationTable}>
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Email</th>
              <th scope="col">Push</th>
              <th scope="col">In-app</th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_EVENTS.map((event) => {
              const isInvitation = event === "Organization invitations";
              return (
                <tr key={event}>
                  <th scope="row">
                    <span>{event}</span>
                    <small>
                      {isInvitation
                        ? "Organization invitations and membership updates."
                        : "This notification type is not available yet."}
                    </small>
                  </th>
                  <td>
                    <PreferenceToggle
                      label={`${event} email notifications unavailable`}
                      disabled
                    />
                  </td>
                  <td>
                    <PreferenceToggle
                      label={`${event} push notifications unavailable`}
                      disabled
                    />
                  </td>
                  <td>
                    {isInvitation ? (
                      <PreferenceToggle
                        label="Organization invitation notifications"
                        enabled={preferences.invitation_notifications}
                        disabled={pending}
                        onChange={onToggleInvitations}
                      />
                    ) : (
                      <PreferenceToggle
                        label={`${event} in-app notifications unavailable`}
                        disabled
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
