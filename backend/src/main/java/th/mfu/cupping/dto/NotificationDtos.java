package th.mfu.cupping.dto;

import java.time.Instant;
import java.util.List;

public final class NotificationDtos {

  private NotificationDtos() {
  }

  public record NotificationView(
      Long notificationId,
      String notificationType,
      String message,
      Integer sessionId,
      boolean sessionAccessible,
      Instant createdAt,
      Instant readAt) {
  }

  public record NotificationPage(
      List<NotificationView> items,
      long unreadCount,
      boolean hasMore,
      Long nextBeforeId) {
  }
}
