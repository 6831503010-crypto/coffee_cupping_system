package th.mfu.cupping.controller;

import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class CsrfController {
  @GetMapping("/csrf")
  public Map<String, String> csrf(HttpServletRequest request) {
    CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
    if (token == null) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "CSRF token unavailable");
    return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
  }
}
