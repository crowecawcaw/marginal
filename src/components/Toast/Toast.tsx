import React from "react";
import { useNotificationStore } from "../../stores/notificationStore";
import "./Toast.css";

const Toast: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`toast toast-${notification.type}`}
          onClick={() => removeNotification(notification.id)}
        >
          <span className="toast-message">{notification.message}</span>
          <button
            className="toast-close"
            onClick={() => removeNotification(notification.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
