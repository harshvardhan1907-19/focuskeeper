package focuskeeper.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false, length = 50)
    private String username;
    
    @Column(unique = true, nullable = false, length = 100)
    private String email;
    
    @Column(nullable = false)
    private String password; // We'll encrypt this later
    
    @Column(length = 100)
    private String fullName;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<FocusSession> focusSessions = new ArrayList<>();

    public User() {
        // Default constructor (required by JPA)
    }

    public User(String username, String email, String password, String fullName) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.fullName = fullName;
        this.createdAt = LocalDateTime.now();
    }

    public List<FocusSession> getFocusSessions() {
        return focusSessions;
    }

    public void setFocusSessions(List<FocusSession> focusSessions) {
        this.focusSessions = focusSessions;
    }

    // Helper method to add a session
    public void addFocusSession(FocusSession session) {
        focusSessions.add(session);
        session.setUser(this);
    }
    
}
