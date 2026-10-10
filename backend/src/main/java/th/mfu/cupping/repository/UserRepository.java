package th.mfu.cupping.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import th.mfu.cupping.model.User;

public interface UserRepository extends JpaRepository<User, Integer> {

  Optional<User> findByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCase(String email);
}
