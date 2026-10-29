package focuskeeper.controller;

import focuskeeper.model.Topic;
import focuskeeper.service.TopicService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/topics")
@CrossOrigin(origins = "*")
public class TopicController {

    @Autowired
    private TopicService topicService;

    /**
     * Get roadmap topics for a user and subject
     * GET /api/topics/{userId}/{subject}
     */
    @GetMapping("/{userId}/{subject}")
    public ResponseEntity<?> getTopics(
            @PathVariable Long userId,
            @PathVariable String subject) {
        try {
            List<Topic> topics = topicService.getTopicsForUserAndSubject(userId, subject);
            return ResponseEntity.ok(topics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Add a custom topic node
     * POST /api/topics/custom
     */
    @PostMapping("/custom")
    public ResponseEntity<?> addCustomTopic(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            String subject = request.get("subject").toString();
            String title = request.get("title").toString();
            String difficulty = request.containsKey("difficulty") && request.get("difficulty") != null
                    ? request.get("difficulty").toString()
                    : "MEDIUM";

            Topic newTopic = topicService.addCustomTopic(userId, subject, title, difficulty);
            return ResponseEntity.ok(newTopic);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Mark a topic as completed
     * POST /api/topics/complete
     */
    @PostMapping("/complete")
    public ResponseEntity<?> completeTopic(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            String subject = request.get("subject").toString();
            String title = request.get("title").toString();

            Topic topic = topicService.markTopicCompleted(userId, subject, title);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "topic", topic != null ? topic : "Updated"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Fetch study material for a topic
     * POST /api/topics/study-material
     */
    @PostMapping("/study-material")
    public ResponseEntity<?> getStudyMaterial(@RequestBody Map<String, String> request) {
        try {
            String subject = request.get("subject");
            String title = request.get("title");
            String difficulty = request.getOrDefault("difficulty", "MEDIUM");

            if (subject == null || title == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Subject and title are required"));
            }

            Map<String, Object> result = topicService.getStudyMaterial(subject, title, difficulty);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
