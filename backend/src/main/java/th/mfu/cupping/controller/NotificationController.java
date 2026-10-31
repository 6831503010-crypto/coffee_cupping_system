package th.mfu.cupping.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import th.mfu.cupping.dto.NotificationDtos.NotificationPage;
import th.mfu.cupping.service.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

  private final NotificationService notifications;

  public NotificationController(NotificationService notifications) {
    this.notifications = notifications;
  }

  @GetMapping
  public NotificationPage list(
      Authentication authentication,
      @RequestParam(name = "beforeId", required = false) Long beforeId) {

    return notifications.list(authentication, beforeId);
  }

  @PostMapping("/{id}/read")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void markRead(
      @PathVariable("id") Long notificationId,
      Authentication authentication) {

    notifications.markRead(notificationId, authentication);
  }
}
