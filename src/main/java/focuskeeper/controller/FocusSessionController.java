package focuskeeper.controller;

import focuskeeper.model.FocusSession;
import focuskeeper.service.FocusSessionService;
import focuskeeper.service.GeminiService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
@CrossOrigin(origins = "*")
public class FocusSessionController {

    @Autowired
    private FocusSessionService sessionService;

    @Autowired
    private GeminiService geminiService;

    @GetMapping("/test-gemini")
    public ResponseEntity<?> testGemini(@RequestParam String title) {
        System.out.println("🧪 TEST GEMINI CALLED: " + title);
        try {
            Map<String, Object> result = geminiService.generateQuestions(title);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Start a new session
     * POST /api/sessions/start
     * Body: { "userId": 1, "durationMinutes": 25, "sessionType": "POMODORO" }
     */
    @PostMapping("/start")
    public ResponseEntity<?> startSession(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            Integer durationMinutes = request.containsKey("durationMinutes")
                    ? Integer.valueOf(request.get("durationMinutes").toString())
                    : 25;
            String sessionType = request.containsKey("sessionType")
                    ? request.get("sessionType").toString()
                    : "POMODORO";

            String title = request.containsKey("title") ? request.get("title").toString() : null;
            FocusSession session = sessionService.startSession(userId, durationMinutes, sessionType, title);

            Map<String, Object> response = new HashMap<>();
            response.put("id", session.getId());
            response.put("userId", session.getUser().getId());
            response.put("durationMinutes", session.getDurationMinutes());
            response.put("sessionType", session.getSessionType());
            response.put("sessionDate", session.getSessionDate());
            response.put("message", "Session started successfully");

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ START FOCUSED SESSION
    @PostMapping("/start-focused")
    public ResponseEntity<?> startFocusedSession(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            Integer durationMinutes = request.containsKey("durationMinutes")
                    ? Integer.valueOf(request.get("durationMinutes").toString())
                    : 25;
            String sessionType = request.containsKey("sessionType")
                    ? request.get("sessionType").toString()
                    : "POMODORO";
            String title = request.containsKey("title")
                    ? request.get("title").toString()
                    : "Focus session";

            FocusSession session = sessionService.startSession(userId, durationMinutes, sessionType, title);

            Map<String, Object> response = new HashMap<>();
            response.put("id", session.getId());
            response.put("title", session.getTitle());
            response.put("durationMinutes", session.getDurationMinutes());
            response.put("message", "Focus session started!");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ REGISTER APP SWITCH
    @PostMapping("/switch/{sessionId}")
    public ResponseEntity<?> registerAppSwitch(@PathVariable Long sessionId) {
        try {
            FocusSession session = sessionService.registerAppSwitch(sessionId);
            return ResponseEntity.ok(Map.of(
                    "sessionId", session.getId(),
                    "appSwitches", session.getAppSwitches(),
                    "qualityScore", session.getQualityScore()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ GET SESSION QUESTIONS
    @GetMapping("/questions/{sessionId}")
    public ResponseEntity<?> getSessionQuestions(@PathVariable Long sessionId) {
        try {
            System.out.println("📋 Getting questions for session: " + sessionId);
            Map<String, Object> questions = sessionService.getSessionQuestions(sessionId);
            System.out.println("📋 Questions: " + questions);
            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ COMPLETE FOCUSED SESSION (FIXED)
    @PostMapping("/complete-focus")
    public ResponseEntity<?> completeFocusedSession(@RequestBody Map<String, Object> request) {
        try {
            Long sessionId = Long.valueOf(request.get("sessionId").toString());

            // ✅ FIXED: Use correct keys from request
            String shortAnswer = request.containsKey("shortAnswer")
                    ? request.get("shortAnswer").toString()
                    : "";

            Boolean trueOrFalseAnswer = request.containsKey("trueOrFalseAnswer")
                    ? Boolean.valueOf(request.get("trueOrFalseAnswer").toString())
                    : false;

            String mcqAnswer = request.containsKey("mcqAnswer")
                    ? request.get("mcqAnswer").toString()
                    : "A";

            FocusSession session = sessionService.completeSession(sessionId, shortAnswer, trueOrFalseAnswer, mcqAnswer);

            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", session.getId());
            response.put("coinsEarned", session.getCoinsEarned());
            response.put("qualityScore", session.getQualityScore());
            response.put("appSwitches", session.getAppSwitches());
            response.put("message", "Session completed!");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ GET SESSION SUMMARY
    @GetMapping("/summary/{sessionId}")
    public ResponseEntity<?> getSessionSummary(@PathVariable Long sessionId) {
        try {
            Map<String, Object> summary = sessionService.getSessionSummary(sessionId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Complete a session
     * PUT /api/sessions/complete/{sessionId}
     */
    @PutMapping("/complete/{sessionId}")
    public ResponseEntity<?> completeSession(
            @PathVariable Long sessionId,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String shortAnswer = body != null ? (String) body.get("shortAnswer") : null;
            Boolean trueFalseAnswer = body != null ? (Boolean) body.get("trueFalseAnswer") : null;
            String mcqAnswer = body != null ? (String) body.get("mcqAnswer") : null;

            FocusSession session = sessionService.completeSession(sessionId, shortAnswer, trueFalseAnswer, mcqAnswer);

            Map<String, Object> response = new HashMap<>();
            response.put("id", session.getId());
            response.put("completed", true);
            response.put("completedAt", session.getCompletedAt());
            response.put("message", "Session completed successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get user's stats
     * GET /api/sessions/stats/{userId}
     */
    @GetMapping("/stats/{userId}")
    public ResponseEntity<?> getUserStats(@PathVariable Long userId) {
        try {
            Map<String, Object> stats = sessionService.getUserStats(userId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get user's sessions
     * GET /api/sessions/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserSessions(@PathVariable Long userId) {
        try {
            List<FocusSession> sessions = sessionService.getUserSessions(userId);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get today's sessions
     * GET /api/sessions/today/{userId}
     */
    @GetMapping("/today/{userId}")
    public ResponseEntity<?> getTodaySessions(@PathVariable Long userId) {
        try {
            List<FocusSession> sessions = sessionService.getTodaySessions(userId);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Delete a session
     * DELETE /api/sessions/{sessionId}
     */
    @DeleteMapping("/{sessionId}")
    public ResponseEntity<?> deleteSession(@PathVariable Long sessionId) {
        try {
            sessionService.deleteSession(sessionId);
            return ResponseEntity.ok(Map.of("message", "Session deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ GET WEEKLY STATS (FIXED: added missing slash)
    @GetMapping("/weekly/{userId}")
    public ResponseEntity<?> getWeeklyStats(@PathVariable Long userId) {
        try {
            Map<String, Object> stats = sessionService.getWeeklyStats(userId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ GET COIN STATS
    @GetMapping("/coins/{userId}")
    public ResponseEntity<?> getCoinStats(@PathVariable Long userId) {
        System.out.println("🪙🪙🪙 COIN API CALLED for user: " + userId);
        try {
            Map<String, Object> stats = sessionService.getCoinStats(userId);
            System.out.println("🪙 Returning coins: " + stats.get("coins"));
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            System.err.println("❌ Error in getCoinStats: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ REDEEM REWARD (FIXED: added missing slash)
    @PostMapping("/coins/redeem/{userId}")
    public ResponseEntity<?> redeemReward(@PathVariable Long userId) {
        try {
            Map<String, Object> result = sessionService.redeemReward(userId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Validate focus session title
     * GET /api/sessions/validate-title?title=...
     */
    @GetMapping("/validate-title")
    public ResponseEntity<?> validateTitle(@RequestParam String title) {
        try {
            boolean isMeaningful = geminiService.validateTitle(title);
            boolean isSpecific = geminiService.isTopicSpecific(title);

            if (!isMeaningful || !isSpecific) {
                return ResponseEntity.ok(Map.of(
                        "warning", true,
                        "error", "Please include the specific SUBJECT in your title. " +
                                "Example: 'DBMS normalization' instead of 'writing DBMS assignment'."));
            }

            return ResponseEntity.ok(Map.of("warning", false));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("warning", false)); // Fail open
        }
    }
}