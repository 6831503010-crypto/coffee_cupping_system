package th.mfu.cupping.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class CsrfController {

  @GetMapping({ "/api/csrf", "/api/auth/csrf" })
  public Map<String, String> csrf(CsrfToken token) {
    if (token == null) {
      throw new ResponseStatusException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "CSRF token unavailable");
    }

    return Map.of(
        "headerName", token.getHeaderName(),
        "parameterName", token.getParameterName(),
        "token", token.getToken());
  }
}
