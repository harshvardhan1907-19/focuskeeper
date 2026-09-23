package focuskeeper.service;

import focuskeeper.model.FocusSession;
import focuskeeper.model.User;
import focuskeeper.repository.FocusSessionRepository;
import focuskeeper.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class FocusSessionService {

    @Autowired
    private FocusSessionRepository sessionRepository;

    @Autowired
    private UserRepository userRepository;

    // @Autowired
    // private OpenAIService openAIService;

    @Autowired
    private GeminiService geminiService;

    public Map<String, Object> getSessionQuestions(Long sessionId) {
        try {
            System.out.println("📋 Getting questions for session: " + sessionId);

            FocusSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            String title = session.getTitle() != null ? session.getTitle().trim() : "";
            System.out.println("📋 Title: " + title);

            Map<String, Object> questions = new HashMap<>();
            questions.put("sessionId", session.getId());
            questions.put("title", title);

            // Validate title
            boolean isMeaningful = geminiService.validateTitle(title);
            System.out.println("🤖 Is meaningful: " + isMeaningful);

            if (!isMeaningful) {
                questions.put("error", "Please provide a more specific title.");
                questions.put("warning", true);
                return questions;
            }

            // Check if title names a specific subject
            boolean isTopicSpecific = geminiService.isTopicSpecific(title);
            if (!isTopicSpecific) {
                questions.put("error", "Please include the specific SUBJECT in your title. " +
                                    "Example: 'DBMS normalization' instead of 'writing DBMS assignment'.");
                questions.put("warning", true);
                return questions;
            }

            // ✅ Generate questions with Gemini
            System.out.println("🤖 Calling Gemini for questions...");
            Map<String, Object> aiQuestions = geminiService.generateQuestions(title);
            System.out.println("🤖 AI Questions: " + aiQuestions);

            // ✅ Store expected answers in session
            String shortAnswer = (String) aiQuestions.get("shortAnswer");
            Boolean trueFalseAnswer = (Boolean) aiQuestions.get("trueFalseAnswer");
            String mcqAnswer = (String) aiQuestions.get("mcqAnswer");

            session.setShortAnswerExpected(shortAnswer);
            session.setTrueFalseExpected(trueFalseAnswer);
            session.setMcqExpected(mcqAnswer);
            sessionRepository.save(session);
            System.out.println("💾 Saved expected answers to session");

            questions.putAll(aiQuestions);
            questions.put("warning", false);

            return questions;

        } catch (Exception e) {
            System.err.println("❌ Error in getSessionQuestions: " + e.getMessage());
            e.printStackTrace();
            return generateFallbackQuestions(sessionId);
        }
    }

    private Map<String, Object> generateFallbackQuestions(Long sessionId) {
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("sessionId", sessionId);
        fallback.put("title", "Focus Session");
        fallback.put("shortQuestion", "What did you focus on? (2-3 words)");
        fallback.put("trueFalseQuestion", "Did you stay focused?");
        fallback.put("mcqQuestion", "What was your main subject?");

        Map<String, String> options = new LinkedHashMap<>();
        options.put("A", "Mathematics");
        options.put("B", "Science");
        options.put("C", "Language");
        options.put("D", "Other");
        fallback.put("mcqOptions", options);

        fallback.put("warning", false);
        return fallback;
    }

    /**
     * Start a new focus session
     */
    @Transactional
    public FocusSession startSession(Long userId, Integer durationMinutes, String sessionType, String title) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        FocusSession session = new FocusSession(user, durationMinutes, sessionType);
        session.setTitle(title != null && !title.trim().isEmpty() ? title : "Focus Session");
        return sessionRepository.save(session);
    }

    @Transactional
    public FocusSession registerAppSwitch(Long sessionId) {
        FocusSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found with id: " + sessionId));

        int switches = session.getAppSwitches() != null ? session.getAppSwitches() : 0;
        session.setAppSwitches(switches + 1);

        // ✅ Log each switch
        System.out.println("📱 App switch #" + (switches + 1) + " for session: " + sessionId);

        updateQualityScore(session);
        System.out.println("📊 New quality: " + session.getQualityScore() + "%");

        return sessionRepository.save(session);
    }

    public void updateQualityScore(FocusSession session) {
        int switches = session.getAppSwitches() != null ? session.getAppSwitches() : 0;
        double score = 100.0;

        if (switches <= 1) {
            score = 100.0;
        } else if (switches == 2) {
            score = 80.0;
        } else if (switches <= 4) {
            score = 50.0;
        } else {
            score = 20.0;
        }

        session.setQualityScore(score);
    }

    /**
     * Get all sessions for a user
     */
    public List<FocusSession> getUserSessions(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        return sessionRepository.findByUserOrderBySessionDateDesc(user, PageRequest.of(0, 10));
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
    public FocusSession completeSession(Long sessionId, String shortAnswer, Boolean trueOrFalseAnswer,
            String mcqAnswer) {
        System.out.println("🪙🪙🪙 COMPLETING SESSION: " + sessionId);

        FocusSession session = sessionRepository.findById(sessionId).orElseThrow(
                () -> new RuntimeException("Session not found with id: " + sessionId));

        session.setIsCompleted(true);
        session.setCompletedAt(LocalDateTime.now());
        session.setShortAnswer(shortAnswer);
        session.setTrueFalseAnswer(trueOrFalseAnswer);
        session.setMcqAnswer(mcqAnswer);

        // session = sessionRepository.save(session);

        // ✅ Validate answers (simulated AI validation)
        validateAnswers(session);

        // calculate coins earned based on app switch and quality score
        int switches = session.getAppSwitches() != null ? session.getAppSwitches() : 0;
        System.out.println("📱 App Switches detected: " + switches);

        double quality = calculateQuality(switches);
        session.setQualityScore(quality);
        System.out.println("📊 Quality: " + quality + "%");

        // check the correct answer
        int correctCount = 0;
        if (Boolean.TRUE.equals(session.getShortAnswerCorrect()))
            correctCount++;
        if (Boolean.TRUE.equals(session.getTrueFalseCorrect()))
            correctCount++;
        if (Boolean.TRUE.equals(session.getMcqCorrect()))
            correctCount++;

        boolean answersCorrect = correctCount >= 2;
        System.out.println("✅ Correct Answers: " + correctCount + "/3 | Passed: " + answersCorrect);

        // calculate coins earned
        int coinsEarned = calculateCoins(session.getDurationMinutes(), quality, answersCorrect);
        session.setCoinsEarned(coinsEarned);
        System.out.println("🪙 Coins Earned: " + coinsEarned);

        // Add coins to user
        if (coinsEarned > 0) {
            User user = session.getUser();
            System.out.println("👤 User before: " + user.getUsername() + " | Coins: " + user.getCoins());
            user.addCoins(coinsEarned);
            userRepository.save(user);
            System.out.println("👤 User after: " + user.getUsername() + " | Coins: " + user.getCoins());
        } else {
            System.out.println("❌ No coins earned for this session");
        }

        return sessionRepository.save(session);
    }

    private double calculateQuality(int switches) {
        if (switches == 0) {
            return 100.0; // Perfect
        } else if (switches == 1) {
            return 90.0; // Good
        } else if (switches == 2) {
            return 80.0; // Acceptable
        } else {
            return 0.0; // Too many switches
        }
    }

    private int calculateCoins(int duration, double quality, boolean answersCorrect) {
        System.out.println("========================================");
        System.out.println("🪙 CALCULATING COINS");
        System.out.println("   Duration: " + duration + " min");
        System.out.println("   Quality: " + quality + "%");
        System.out.println("   Answers Correct: " + answersCorrect);
        System.out.println("========================================");

        // ❌ Wrong answers = no coins (need at least 2/3 correct)
        if (!answersCorrect) {
            System.out.println("❌ No coins: Wrong answers (need 2/3 correct)");
            return 0;
        }

        // ❌ Session too short = no coins
        // if (duration < 15) {
        // System.out.println("❌ No coins: Duration < 15 minutes");
        // return 0;
        // }

        // ✅ 15-19 minutes: 1 coin ONLY at 100% quality
        if (duration >= 15 && duration <= 19) {
            int coins = quality >= 100.0 ? 1 : 0;
            System.out.println("🪙 15-19 min, quality: " + quality + "% → " + coins + " coin");
            return coins;
        }

        // ✅ 20-24 minutes: 2 coins at ≥ 80% quality
        if (duration >= 20 && duration <= 24) {
            int coins = quality >= 80.0 ? 2 : 0;
            System.out.println("🪙 20-24 min, quality: " + quality + "% → " + coins + " coins");
            return coins;
        }

        // ✅ 25+ minutes: 3 coins at 100%, 2 coins at ≥ 80%
        if (duration >= 25) {
            int coins;
            if (quality >= 100.0) {
                coins = 3;
            } else if (quality >= 80.0) {
                coins = 2;
            } else {
                coins = 0;
            }
            System.out.println("🪙 25+ min, quality: " + quality + "% → " + coins + " coins");
            return coins;
        }

        System.out.println("❌ No coins: Default fallback");
        return 0;
    }

    private void validateAnswers(FocusSession session) {
        System.out.println("📝 ========================================");
        System.out.println("📝 VALIDATING ANSWERS (AI-powered)");
        System.out.println("📝 ========================================");

        // Build the "original questions" map that GeminiService needs
        Map<String, Object> originalQuestions = new HashMap<>();
        originalQuestions.put("shortAnswer", session.getShortAnswerExpected());
        originalQuestions.put("trueFalseAnswer", session.getTrueFalseExpected());
        originalQuestions.put("mcqAnswer", session.getMcqExpected());

        // ✅ Let Gemini do the grading
        Map<String, Boolean> results = geminiService.validateAnswers(
                session.getTitle(),
                session.getShortAnswer(),
                session.getTrueFalseAnswer(),
                session.getMcqAnswer(),
                originalQuestions);

        // ✅ Apply the results to the session
        session.setShortAnswerCorrect(results.getOrDefault("shortAnswerCorrect", false));
        session.setTrueFalseCorrect(results.getOrDefault("trueFalseCorrect", false));
        session.setMcqCorrect(results.getOrDefault("mcqCorrect", false));

        System.out.println("📝 Final Results:");
        System.out.println("   Short Answer: " + session.getShortAnswerCorrect());
        System.out.println("   True/False: " + session.getTrueFalseCorrect());
        System.out.println("   MCQ: " + session.getMcqCorrect());
    }

    // get session summary with quality report
    public Map<String, Object> getSessionSummary(Long sessionId) {
        FocusSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        Map<String, Object> summary = new HashMap<>();
        summary.put("sessionId", session.getId());
        summary.put("title", session.getTitle());
        summary.put("duration", session.getDurationMinutes());
        summary.put("appSwitches", session.getAppSwitches());
        summary.put("qualityScore", session.getQualityScore());
        summary.put("coinsEarned", session.getCoinsEarned());
        summary.put("completedAt", session.getCompletedAt());

        // correct answers count
        int correctCount = 0;
        if (Boolean.TRUE.equals(session.getShortAnswerCorrect()))
            correctCount++;
        if (Boolean.TRUE.equals(session.getTrueFalseCorrect()))
            correctCount++;
        if (Boolean.TRUE.equals(session.getMcqCorrect()))
            correctCount++;
        summary.put("correctAnswers", correctCount);
        summary.put("totalQuestions", 3);
        return summary;
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