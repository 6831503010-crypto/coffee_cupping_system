package th.mfu.cupping.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

  @GetMapping({
      "/",
      "/login",
      "/register",
      "/feed",
      "/history",
      "/inventory",
      "/cupping",
      "/about",
      "/profile",
      "/guide",
      "/guide/{page}",
      "/sessions/{id}",
      "/individual/{id}",
      "/join/{token}"
  })
  public String angularPage() {
    return "forward:/index.html";
  }
}
