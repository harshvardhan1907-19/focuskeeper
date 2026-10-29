package focuskeeper.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "topics")
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The broad category (e.g., "Java", "Python", "Maths")
    @Column(nullable = false)
    private String subject;

    // The specific node on the tree (e.g., "Hello World", "Data Types")
    @Column(nullable = false)
    private String title;

    // "LOW", "MEDIUM", "HIGH"
    @Column(nullable = false)
    private String difficulty;

    // The AI-generated theory and code examples the user reads during the timer
    @Column(columnDefinition = "TEXT")
    private String studyMaterial;

    // Order of the node in the tree
    private Integer sequenceOrder;

    // Track if the user has completed this topic
    private Boolean isCompleted = false;

    // Timestamp of when the user completed it
    private LocalDateTime completedAt;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private User user;

    // Constructors
    public Topic() {
    }

    public Topic(User user, String subject, String title, String difficulty, Integer sequenceOrder) {
        this.user = user;
        this.subject = subject;
        this.title = title;
        this.difficulty = difficulty;
        this.sequenceOrder = sequenceOrder;
        this.isCompleted = false;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getStudyMaterial() {
        return studyMaterial;
    }

    public void setStudyMaterial(String studyMaterial) {
        this.studyMaterial = studyMaterial;
    }

    public Integer getSequenceOrder() {
        return sequenceOrder;
    }

    public void setSequenceOrder(Integer sequenceOrder) {
        this.sequenceOrder = sequenceOrder;
    }

    public Boolean getIsCompleted() {
        return isCompleted;
    }

    public void setIsCompleted(Boolean isCompleted) {
        this.isCompleted = isCompleted;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}