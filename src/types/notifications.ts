export interface AppNotification {
  id: number;
  type: string;
  call_id: number | null;
  client_id: number | null;
  title: string;
  body: string | null;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread: number;
}
