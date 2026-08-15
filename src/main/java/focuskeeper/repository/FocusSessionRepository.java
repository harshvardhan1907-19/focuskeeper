package focuskeeper.repository;

import focuskeeper.model.FocusSession;
import focuskeeper.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FocusSessionRepository extends JpaRepository<FocusSession, Long> {

        /**
         * Find all sessions for a specific user
         */
        List<FocusSession> findByUserOrderBySessionDateDesc(User user);

        /**
         * Find sessions for a user on a specific date
         */
        List<FocusSession> findByUserAndSessionDateBetween(User user, LocalDateTime start, LocalDateTime end);

        /**
         * Count completed sessions for a user
         */
        Long countByUserAndIsCompletedTrue(User user);

        /**
         * Get total focus minutes for a user
         */
        @Query("SELECT SUM(f.durationMinutes) FROM FocusSession f WHERE f.user = :user AND f.isCompleted = true")
        Integer sumDurationMinutesByUser(@Param("user") User user);

        /**
         * Get today's total focus minutes
         * FIXED: Using BETWEEN instead of DATE() function
         */
        @Query("SELECT SUM(f.durationMinutes) FROM FocusSession f " +
                        "WHERE f.user = :user " +
                        "AND f.isCompleted = true " +
                        "AND f.sessionDate BETWEEN :startOfDay AND :endOfDay")
        Integer sumTodayDurationMinutes(@Param("user") User user,
                        @Param("startOfDay") LocalDateTime startOfDay,
                        @Param("endOfDay") LocalDateTime endOfDay);

        /**
         * Get sessions for today
         * FIXED: Using BETWEEN instead of DATE() function
         */
        @Query("SELECT f FROM FocusSession f " +
                        "WHERE f.user = :user " +
                        "AND f.sessionDate BETWEEN :startOfDay AND :endOfDay")
        List<FocusSession> findTodaySessions(@Param("user") User user,
                        @Param("startOfDay") LocalDateTime startOfDay,
                        @Param("endOfDay") LocalDateTime endOfDay);

        List<FocusSession> findByUserAndIsCompleted(User user, boolean completed);
}