package focuskeeper.service;

import focuskeeper.model.Topic;
import focuskeeper.model.User;
import focuskeeper.repository.TopicRepository;
import focuskeeper.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class TopicService {

    @Autowired
    private TopicRepository topicRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GeminiService geminiService;

    private static final Map<String, List<String>> DEFAULT_ROADMAPS = new HashMap<>();

    static {
        // Java Roadmap (matching student's notebook: Hello world -> Variables/Data types -> Functions -> Spring Framework)
        DEFAULT_ROADMAPS.put("Java", Arrays.asList(
                "Hello World Program",
                "Data Types & Variables",
                "Functions & Methods",
                "Object Oriented Programming (OOP)",
                "Spring Framework Basics"
        ));

        // Python Roadmap
        DEFAULT_ROADMAPS.put("Python", Arrays.asList(
                "Hello World & Syntax",
                "Variables & Data Types",
                "Lists, Tuples & Dictionaries",
                "Functions & Lambda",
                "OOP & Modules in Python"
        ));

        // Maths Roadmap
        DEFAULT_ROADMAPS.put("Maths", Arrays.asList(
                "Arithmetic & Number Properties",
                "Linear Equations & Algebra",
                "Quadratic Equations",
                "Trigonometry & Angles",
                "Calculus & Derivatives"
        ));

        // Science Roadmap
        DEFAULT_ROADMAPS.put("Science", Arrays.asList(
                "Newton's Laws of Motion",
                "Work, Energy & Power",
                "Atomic Structure & Elements",
                "Chemical Reactions & Bonding",
                "Cell Structure & Function"
        ));

        // Economics Roadmap
        DEFAULT_ROADMAPS.put("Economics", Arrays.asList(
                "Scarcity, Choice & Opportunity Cost",
                "Law of Demand and Supply",
                "Market Equilibrium & Elasticity",
                "Gross Domestic Product (GDP)",
                "Inflation & Monetary Policy"
        ));
    }

    /**
     * Normalize subject name to handle variations (e.g. math -> Maths, python -> Python)
     */
    public static String normalizeSubject(String subject) {
        if (subject == null || subject.trim().isEmpty()) return "Maths";
        String s = subject.trim();
        if (s.equalsIgnoreCase("math") || s.equalsIgnoreCase("maths") || s.equalsIgnoreCase("mathematics")) {
            return "Maths";
        }
        if (s.equalsIgnoreCase("python") || s.equalsIgnoreCase("py")) {
            return "Python";
        }
        if (s.equalsIgnoreCase("java")) {
            return "Java";
        }
        if (s.equalsIgnoreCase("science") || s.equalsIgnoreCase("general science")) {
            return "Science";
        }
        if (s.equalsIgnoreCase("economics") || s.equalsIgnoreCase("eco")) {
            return "Economics";
        }

        // Capitalize words for custom subjects
        String[] words = s.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                sb.append(Character.toUpperCase(w.charAt(0)))
                  .append(w.substring(1).toLowerCase())
                  .append(" ");
            }
        }
        return sb.toString().trim();
    }

    /**
     * Get roadmap topics for a user and subject. If first time, initializes default roadmap.
     */
    @Transactional
    public List<Topic> getTopicsForUserAndSubject(Long userId, String subject) {
        String normalized = normalizeSubject(subject);
        System.out.println("🗺️ Fetching roadmap for user " + userId + ", subject: '" + subject + "' (normalized: '" + normalized + "')");

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        List<Topic> topics = topicRepository.findByUserAndSubjectIgnoreCaseOrderBySequenceOrderAsc(user, normalized);

        // If existing topics were erroneously assigned Java topics (e.g., Maths has 'Hello World' from old tests), clean them up
        if (topics != null && !topics.isEmpty() && !normalized.equalsIgnoreCase("Java")) {
            boolean hasJavaTopics = topics.stream().anyMatch(t -> 
                t.getTitle().toLowerCase().contains("hello world") || 
                t.getTitle().toLowerCase().contains("spring framework")
            );
            if (hasJavaTopics) {
                System.out.println("🧹 Cleaning up mismatched Java topics found in subject: " + normalized);
                topicRepository.deleteAll(topics);
                topics = Collections.emptyList();
            }
        }

        if (topics == null || topics.isEmpty()) {
            System.out.println("🌱 Initializing default roadmap for: " + normalized);
            topics = initializeDefaultRoadmap(user, normalized);
        }

        return topics;
    }

    /**
     * Initialize default roadmap nodes for a subject
     */
    private List<Topic> initializeDefaultRoadmap(User user, String subject) {
        List<String> defaultTitles = DEFAULT_ROADMAPS.get(subject);
        if (defaultTitles == null || defaultTitles.isEmpty()) {
            // Fallback for custom subject
            defaultTitles = Arrays.asList(
                    "Fundamentals of " + subject,
                    "Core Principles of " + subject,
                    "Intermediate Practice in " + subject,
                    "Advanced Applications in " + subject
            );
        }

        List<Topic> created = new ArrayList<>();
        int seq = 1;
        for (String title : defaultTitles) {
            String difficulty = seq <= 2 ? "LOW" : (seq <= 4 ? "MEDIUM" : "HIGH");
            Topic topic = new Topic(user, subject, title, difficulty, seq);
            created.add(topicRepository.save(topic));
            seq++;
        }
        return created;
    }

    /**
     * Add a custom topic requested by the user
     */
    @Transactional
    public Topic addCustomTopic(Long userId, String subject, String title, String difficulty) {
        String normalized = normalizeSubject(subject);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("Topic title cannot be empty");
        }

        List<Topic> existing = topicRepository.findByUserAndSubjectIgnoreCaseOrderBySequenceOrderAsc(user, normalized);
        int nextSeq = existing.isEmpty() ? 1 : existing.get(existing.size() - 1).getSequenceOrder() + 1;

        String diff = (difficulty != null && !difficulty.trim().isEmpty()) ? difficulty.toUpperCase() : "MEDIUM";
        Topic newTopic = new Topic(user, normalized, title.trim(), diff, nextSeq);
        return topicRepository.save(newTopic);
    }

    /**
     * Mark a topic as completed
     */
    @Transactional
    public Topic markTopicCompleted(Long userId, String subject, String title) {
        String normalized = normalizeSubject(subject);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        Optional<Topic> topicOpt = topicRepository.findByUserAndSubjectIgnoreCaseAndTitleIgnoreCase(user, normalized, title.trim());
        if (topicOpt.isPresent()) {
            Topic topic = topicOpt.get();
            topic.setIsCompleted(true);
            topic.setCompletedAt(LocalDateTime.now());
            return topicRepository.save(topic);
        }
        return null;
    }

    /**
     * Generate or fetch study material using Gemini
     */
    public Map<String, Object> getStudyMaterial(String subject, String title, String difficulty) {
        String material = geminiService.generateStudyMaterial(subject, title, difficulty);

        Map<String, Object> response = new HashMap<>();
        response.put("subject", subject);
        response.put("title", title);
        response.put("difficulty", difficulty);
        response.put("studyMaterial", material);

        return response;
    }
}
