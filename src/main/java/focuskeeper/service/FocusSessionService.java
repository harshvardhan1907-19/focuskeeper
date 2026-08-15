package focuskeeper.service;

import focuskeeper.model.FocusSession;
import focuskeeper.model.User;
import focuskeeper.repository.FocusSessionRepository;
import focuskeeper.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FocusSessionService {

    @Autowired
    private FocusSessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Start a new focus session
     */
    @Transactional
    public FocusSession startSession(Long userId, Integer durationMinutes, String sessionType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        FocusSession session = new FocusSession(user, durationMinutes, sessionType);
        return sessionRepository.save(session);
    }

    /**
     * Complete a focus session
     */
    // @Transactional
    // public FocusSession completeSession(Long sessionId) {
    // FocusSession session = sessionRepository.findById(sessionId)
    // .orElseThrow(() -> new RuntimeException("Session not found with id: " +
    // sessionId));

    // session.setIsCompleted(true);
    // session.setCompletedAt(LocalDateTime.now());
    // return sessionRepository.save(session);
    // }

    /**
     * Get all sessions for a user
     */
    public List<FocusSession> getUserSessions(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        return sessionRepository.findByUserOrderBySessionDateDesc(user);
    }

    /**
     * Get today's sessions for a user
     */
    public List<FocusSession> getTodaySessions(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Get start and end of today
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        return sessionRepository.findTodaySessions(user, startOfDay, endOfDay);
    }

    /**
     * Get user statistics
     */
    public Map<String, Object> getUserStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        // Get start and end of today
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        Map<String, Object> stats = new HashMap<>();

        // Total completed sessions count
        Long totalSessions = sessionRepository.countByUserAndIsCompletedTrue(user);
        stats.put("totalSessions", totalSessions);

        // Total minutes
        Integer totalMinutes = sessionRepository.sumDurationMinutesByUser(user);
        stats.put("totalMinutes", totalMinutes != null ? totalMinutes : 0);

        // Today's minutes
        Integer todayMinutes = sessionRepository.sumTodayDurationMinutes(user, startOfDay, endOfDay);
        stats.put("todayMinutes", todayMinutes != null ? todayMinutes : 0);

        // Today's sessions
        List<FocusSession> todaySessions = sessionRepository.findTodaySessions(user, startOfDay, endOfDay);
        stats.put("todaySessions", todaySessions);
        stats.put("todaySessionCount", todaySessions.size());

        return stats;
    }

    /**
     * Get weekly stats (last 7 days)
     */
    public Map<String, Object> getWeeklyStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        List<FocusSession> weekSessions = sessionRepository.findByUserAndSessionDateBetween(user, weekAgo,
                LocalDateTime.now());

        Map<String, Object> stats = new HashMap<>();
        stats.put("weekSessions", weekSessions);
        stats.put("weekSessionCount", weekSessions.size());

        int weekMinutes = weekSessions.stream()
                .filter(FocusSession::getIsCompleted)
                .mapToInt(FocusSession::getDurationMinutes)
                .sum();
        stats.put("weekMinutes", weekMinutes);

        return stats;
    }

    /**
     * Delete a session
     */
    @Transactional
    public void deleteSession(Long sessionId) {
        if (!sessionRepository.existsById(sessionId)) {
            throw new RuntimeException("Session not found with id: " + sessionId);
        }
        sessionRepository.deleteById(sessionId);
    }

    // coins management
    @Transactional
    public FocusSession completeSession(Long sessionId) {
        FocusSession session = sessionRepository.findById(sessionId).orElseThrow(
                () -> new RuntimeException("Session not found with id: " + sessionId));

        session.setIsCompleted(true);
        session.setCompletedAt(LocalDateTime.now());
        session = sessionRepository.save(session);

        User user = session.getUser();

        // Count total completed sessions AFTER this one is marked complete
        Long completedCount = sessionRepository.countByUserAndIsCompletedTrue(user);
        int coinsEarned = 1; // base coin for completing a session

        // Bonus: +2 coins once user has completed 20 or more sessions total
        if (completedCount >= 20) {
            coinsEarned += 2;
            System.out.println("🎁 20+ session bonus applied! +2 coins");
        }

        // Bonus: +1 extra coin for a full 25-minute Pomodoro session
        if (session.getDurationMinutes() == 25 && "POMODORO".equalsIgnoreCase(session.getSessionType())) {
            coinsEarned += 1;
            System.out.println("🎁 25-min Pomodoro bonus applied! +1 coin");
        }

        System.out.println("🪙 Total coins earned this session: " + coinsEarned);

        user.addCoins(coinsEarned);
        userRepository.save(user);

        System.out.println("🪙 User total coins now: " + user.getCoins());

        // Check if user reached reward milestone
        if (user.canRedeemReward()) {
            System.out.println("🏆 User can redeem reward! Coins: " + user.getCoins());
            // TODO: handle this in the response later
        }

        return session;
    }

    // get the user coins nd reward stats
    public Map<String, Object> getCoinStats(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(
                () -> new RuntimeException("User not found with id: " + userId));

        Map<String, Object> stats = new HashMap<>();
        stats.put("coins", user.getCoins() != null ? user.getCoins() : 0);
        System.out.println("User " + user.getUsername() + " has " + stats.get("coins") + " coins.");
        stats.put("totalCoinsEarned", user.getTotalCoinsEarned() != null ? user.getTotalCoinsEarned() : 0);
        stats.put("rewardsRedeemed", user.getRewardsRedeemed() != null ? user.getRewardsRedeemed() : 0);
        stats.put("coinsProgress", user.getCoinsProgress());
        stats.put("coinsPercentage", user.getCoinsPercentage());
        stats.put("canRedeem", user.canRedeemReward());
        stats.put("coinsNeededForReward", 50 - (user.getCoins() != null ? user.getCoins() : 0));
        return stats;
    }

    // redeem reward
    @Transactional
    public Map<String, Object> redeemReward(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (!user.canRedeemReward()) {
            throw new RuntimeException("Not enough coins to redeem reward");
        }

        user.redeemReward();
        userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("rewardRedeemed", true);
        response.put("message", "🎉 Congratulations! You've redeemed ₹30 reward!");
        response.put("remainingCoins", user.getCoins());
        response.put("totalRewards", user.getRewardsRedeemed());
        return response;

    }

}