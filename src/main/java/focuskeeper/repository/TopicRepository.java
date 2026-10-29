package focuskeeper.repository;

import focuskeeper.model.Topic;
import focuskeeper.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    // Find all topics for a user, ordered by the tree sequence
    List<Topic> findByUserOrderBySequenceOrderAsc(User user);

    // Find topics by subject for a user
    List<Topic> findByUserAndSubjectOrderBySequenceOrderAsc(User user, String subject);

    List<Topic> findByUserAndSubjectIgnoreCaseOrderBySequenceOrderAsc(User user, String subject);

    // Find a specific topic
    Optional<Topic> findByUserAndSubjectAndTitle(User user, String subject, String title);

    Optional<Topic> findByUserAndSubjectIgnoreCaseAndTitleIgnoreCase(User user, String subject, String title);

    boolean existsByUserAndSubjectAndTitle(User user, String subject, String title);
}