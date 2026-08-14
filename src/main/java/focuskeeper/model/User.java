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

    @Column(name = "coins")
    private Integer coins = 0;

    @Column(name = "total_coins_earned")
    private Integer totalCoinsEarned = 0;

    @Column(name = "rewards_redeemed")
    private Integer rewardsRedeemed = 0;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<FocusSession> focusSessions = new ArrayList<>();

    @Column(name = "last_reward_at")
    private LocalDateTime lastRewardAt;

    public void addCoins(int amount) {
        if (this.coins == null)
            this.coins = 0;
        if (this.totalCoinsEarned == null)
            this.totalCoinsEarned = 0;
        this.coins += amount;
        this.totalCoinsEarned += amount;
    }

    public boolean canRedeemReward() {
        return this.coins != null && this.coins >= 50;
    }

    public void redeemReward() {
        if (canRedeemReward()) {
            this.coins -= 50;
            if (this.rewardsRedeemed == null) {
                this.rewardsRedeemed = 0;
            }
            this.rewardsRedeemed++;
            this.lastRewardAt = LocalDateTime.now();
        }
    }

    public int getCoinsProgress() {
        if (this.coins == null)
            return 0;
        return Math.min(this.coins, 50);
    }

    public int getCoinsPercentage() {
        if (this.coins == null)
            return 0;
        return Math.min((this.coins * 100) / 50, 100);
    }

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
