package focuskeeper.controller;

import focuskeeper.model.FocusSession;
import focuskeeper.service.FocusSessionService;
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

            FocusSession session = sessionService.startSession(userId, durationMinutes, sessionType);

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

    /**
     * Complete a session
     * PUT /api/sessions/complete/{sessionId}
     */
    @PutMapping("/complete/{sessionId}")
    public ResponseEntity<?> completeSession(@PathVariable Long sessionId) {
        try {
            FocusSession session = sessionService.completeSession(sessionId);

            Map<String, Object> response = new HashMap<>();
            response.put("id", session.getId());
            response.put("completed", true);
            response.put("completedAt", session.getCompletedAt());
            response.put("message", "Session completed successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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

    @GetMapping("weekly/{userId}")
    public ResponseEntity<?> getWeeklyStats(@PathVariable Long userId) {
        try {
            Map<String, Object> stats = sessionService.getWeeklyStats(userId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}