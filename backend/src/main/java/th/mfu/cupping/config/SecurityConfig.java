package th.mfu.cupping.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {

    CorsConfiguration configuration = new CorsConfiguration();

    configuration.setAllowedOrigins(
        List.of("http://localhost:4200"));

    configuration.setAllowedMethods(
        List.of(
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS"));

    configuration.setAllowedHeaders(
        List.of("*"));

    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

    source.registerCorsConfiguration(
        "/**",
        configuration);

    return source;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http) throws Exception {

    http
        .cors(cors -> {
        })

        .csrf(csrf -> csrf
            .ignoringRequestMatchers(
                "/api/auth/**"))

        .authorizeHttpRequests(auth -> auth

            .requestMatchers(
                "/api/auth/register",
                "/api/auth/login",
                "/api/health")
            .permitAll()

            .requestMatchers(
                "/api/auth/me",
                "/api/auth/logout")
            .authenticated()

            .anyRequest().authenticated())

        .formLogin(form -> form.disable())

        .httpBasic(basic -> basic.disable())

        .exceptionHandling(exception -> exception
            .authenticationEntryPoint(
                (request, response, authException) -> response.sendError(401)));

    return http.build();
  }
}
