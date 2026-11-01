package th.mfu.cupping.controller;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import th.mfu.cupping.service.PublicFeedService;
import th.mfu.cupping.service.PublicFeedService.FeedResult;

@RestController
@RequestMapping("/api/feed")
public class PublicFeedController {
  private final PublicFeedService feed;

  public PublicFeedController(PublicFeedService feed) {
    this.feed = feed;
  }

  @GetMapping
  public List<FeedResult> list() {
    return feed.list();
  }
}
