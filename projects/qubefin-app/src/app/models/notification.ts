export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: Date;
  isRead: boolean;
  actionUrl: string;
  createdOn: string;
  notificationType?: string;
  icon?: string;
}
