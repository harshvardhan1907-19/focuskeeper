package focuskeeper.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * FocusSession Entity - Stores each focus session
 * Maps to "focus_sessions" table in database
 */
@Entity
@Table(name = "focus_sessions")
@Getter
@Setter
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

    @Column(name = "title")
    private String title;

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

    // ✅ NEW: Focus Quality Fields
    @Column(name = "app_switches")
    private Integer appSwitches = 0;

    @Column(name = "quality_score")
    private Double qualityScore = 100.0;

    @Column(name = "coins_earned")
    private Integer coinsEarned = 0;

    // ✅ NEW: AI Question Fields
    @Column(name = "short_answer")
    private String shortAnswer;

    @Column(name = "true_false_answer")
    private Boolean trueFalseAnswer;

    @Column(name = "mcq_answer")
    private String mcqAnswer;

    @Column(name = "short_answer_correct")
    private Boolean shortAnswerCorrect = false;

    @Column(name = "true_false_correct")
    private Boolean trueFalseCorrect = false;

    @Column(name = "mcq_correct")
    private Boolean mcqCorrect = false;

    // ✅ NEW: Accomplishment
    @Column(name = "accomplishment", length = 1000)
    private String accomplishment;

    @Column(name = "short_answer_expected")
    private String shortAnswerExpected;

    @Column(name = "true_false_expected")
    private Boolean trueFalseExpected;

    @Column(name = "mcq_expected")
    private String mcqExpected;

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

    // public Long getId() {
    // return id;
    // }

    // public void setId(Long id) {
    // this.id = id;
    // }

    // public User getUser() {
    // return user;
    // }

    // public void setUser(User user) {
    // this.user = user;
    // }

    // public LocalDateTime getSessionDate() {
    // return sessionDate;
    // }

    // public void setSessionDate(LocalDateTime sessionDate) {
    // this.sessionDate = sessionDate;
    // }

    // public LocalDateTime getStartTime() { // ADD THIS
    // return startTime;
    // }

    // public void setStartTime(LocalDateTime startTime) { // ADD THIS
    // this.startTime = startTime;
    // }

    // public Integer getDurationMinutes() {
    // return durationMinutes;
    // }

    // public void setDurationMinutes(Integer durationMinutes) {
    // this.durationMinutes = durationMinutes;
    // }

    // public LocalDateTime getCompletedAt() {
    // return completedAt;
    // }

    // public void setCompletedAt(LocalDateTime completedAt) {
    // this.completedAt = completedAt;
    // }

    // public Boolean getIsCompleted() {
    // return isCompleted;
    // }

    // public void setIsCompleted(Boolean isCompleted) {
    // this.isCompleted = isCompleted;
    // }

    // public String getSessionType() {
    // return sessionType;
    // }

    // public void setSessionType(String sessionType) {
    // this.sessionType = sessionType;
    // }

    // public String getTitle() {
    // return title;
    // }

    // public void setTitle(String title) {
    // this.title = title;
    // }

    // public Integer getAppSwitches() {
    // return appSwitches;
    // }

    // public void setAppSwitches(Integer appSwitches) {
    // this.appSwitches = appSwitches;
    // }

    // public Double getQualityScore() {
    // return qualityScore;
    // }

    // public void setQualityScore(Double qualityScore) {
    // this.qualityScore = qualityScore;
    // }

    // public Integer getCoinsEarned() {
    // return coinsEarned;
    // }

    // public void setCoinsEarned(Integer coinsEarned) {
    // this.coinsEarned = coinsEarned;
    // }

    // public String getShortAnswer() {
    // return shortAnswer;
    // }

    // public void setShortAnswer(String shortAnswer) {
    // this.shortAnswer = shortAnswer;
    // }

    // public Boolean getTrueFalseAnswer() {
    // return trueFalseAnswer;
    // }

    // public void setTrueFalseAnswer(Boolean trueFalseAnswer) {
    // this.trueFalseAnswer = trueFalseAnswer;
    // }

    // public String getMcqAnswer() {
    // return mcqAnswer;
    // }

    // public void setMcqAnswer(String mcqAnswer) {
    // this.mcqAnswer = mcqAnswer;
    // }

    // public Boolean getShortAnswerCorrect() {
    // return shortAnswerCorrect;
    // }

    // public void setShortAnswerCorrect(Boolean shortAnswerCorrect) {
    // this.shortAnswerCorrect = shortAnswerCorrect;
    // }

    // public Boolean getTrueFalseCorrect() {
    // return trueFalseCorrect;
    // }

    // public void setTrueFalseCorrect(Boolean trueFalseCorrect) {
    // this.trueFalseCorrect = trueFalseCorrect;
    // }

    // public Boolean getMcqCorrect() {
    // return mcqCorrect;
    // }

    // public void setMcqCorrect(Boolean mcqCorrect) {
    // this.mcqCorrect = mcqCorrect;
    // }

    // public String getAccomplishment() {
    // return accomplishment;
    // }

    // public void setAccomplishment(String accomplishment) {
    // this.accomplishment = accomplishment;
    // }

    // public String getShortAnswerExpected() {
    // return shortAnswerExpected;
    // }

    // public void setShortAnswerExpected(String shortAnswerExpected) {
    // this.shortAnswerExpected = shortAnswerExpected;
    // }

}