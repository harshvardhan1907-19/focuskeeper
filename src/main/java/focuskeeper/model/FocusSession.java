package focuskeeper.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * FocusSession Entity - Stores each focus session
 * Maps to "focus_sessions" table in database
 */
@Entity
@Table(name = "focus_sessions")
public class FocusSession {

    // ========================================
    // FIELDS
    // ========================================

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    @Column(name = "session_date", nullable = false)
    private LocalDateTime sessionDate;

    @Column(name = "start_time") // ADD THIS
    private LocalDateTime startTime; // ADD THIS

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "is_completed")
    private Boolean isCompleted = false;

    @Column(name = "session_type")
    private String sessionType; // "POMODORO", "SHORT_BREAK", "LONG_BREAK"

    // ========================================
    // CONSTRUCTORS
    // ========================================

    public FocusSession() {
        // Default constructor
    }

    public FocusSession(User user, Integer durationMinutes, String sessionType) {
        this.user = user;
        this.durationMinutes = durationMinutes;
        this.sessionType = sessionType;
        this.sessionDate = LocalDateTime.now();
        this.startTime = LocalDateTime.now(); // ADD THIS
        this.isCompleted = false;
    }

    // ========================================
    // GETTERS AND SETTERS
    // ========================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDateTime getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDateTime sessionDate) {
        this.sessionDate = sessionDate;
    }

    public LocalDateTime getStartTime() { // ADD THIS
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) { // ADD THIS
        this.startTime = startTime;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public Boolean getIsCompleted() {
        return isCompleted;
    }

    public void setIsCompleted(Boolean isCompleted) {
        this.isCompleted = isCompleted;
    }

    public String getSessionType() {
        return sessionType;
    }

    public void setSessionType(String sessionType) {
        this.sessionType = sessionType;
    }
}