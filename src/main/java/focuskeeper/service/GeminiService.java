package focuskeeper.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Scanner;
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-3.5-flash}")
    private String model;

    @PostConstruct
    public void init() {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getProperty("GCP_API_KEY");
        }
        if (apiKey == null || apiKey.trim().isEmpty()) {
            apiKey = System.getenv("GCP_API_KEY");
        }

        if (model == null || model.contains("3.5") || model.isEmpty()) {
            model = "gemini-flash-lite-latest";
        }

        System.out.println("========================================");
        System.out.println("🤖 GEMINI SERVICE INITIALIZED");
        System.out.println("   API Key loaded: " + (apiKey != null && !apiKey.isEmpty()));
        if (apiKey != null && !apiKey.isEmpty()) {
            System.out.println("   Key starts with: " + apiKey.substring(0, Math.min(10, apiKey.length())) + "...");
        }
        System.out.println("   Model: " + model);
        System.out.println("========================================");
    }

    /**
     * Generate 3 questions based on the title using Gemini API
     */
    public Map<String, Object> generateQuestions(String title) {
        System.out.println("========================================");
        System.out.println("🤖 GENERATE QUESTIONS CALLED");
        System.out.println("📝 Title: " + title);
        System.out.println("🔑 API Key: " + (apiKey != null && !apiKey.isEmpty() ? "✅ Present" : "❌ MISSING"));
        System.out.println("========================================");

        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("❌ API KEY MISSING! Using fallback questions.");
            return generateFallbackQuestions(title);
        }

        try {
            String prompt = buildPrompt(title);
            System.out.println("📤 Prompt: " + prompt);

            System.out.println("▶️ About to call Gemini API...");
            String response = callGeminiAPI(prompt);
            System.out.println("✅ Got response from Gemini:");
            System.out.println(response);

            System.out.println("▶️ About to parse response...");
            Map<String, Object> questions = parseGeminiResponse(response);
            System.out.println("✅ Parsed questions: " + questions);

            questions.put("shortAnswerExpected", questions.get("shortAnswer"));
            questions.put("trueFalseExpected", questions.get("trueFalseAnswer"));
            questions.put("mcqExpected", questions.get("mcqAnswer"));

            return questions;

        } catch (Throwable e) {
            System.err.println("❌❌❌ ERROR CAUGHT IN generateQuestions ❌❌❌");
            System.err.println("Error type: " + e.getClass().getName());
            System.err.println("Error message: " + e.getMessage());
            e.printStackTrace();
            System.err.println("⚠️ Falling back to default questions.");
            return generateFallbackQuestions(title);
        }
    }

    public boolean isTopicSpecific(String title) {
        try {
            String prompt = String.format(
                    "Does this title describe a specific study TOPIC (like 'DBMS', 'Python loops', 'English grammar') "
                            +
                            "or just a generic activity (like 'doing homework', 'writing assignment', 'studying for exam')?\n\n"
                            +
                            "Title: \"%s\"\n\n" +
                            "If the title contains a specific subject name (like a technology, language, science field, etc.), reply 'true'.\n"
                            +
                            "If the title only describes the activity without naming a specific subject, reply 'false'.\n\n"
                            +
                            "Reply ONLY 'true' or 'false'.",
                    title);
            String result = callGeminiAPI(prompt).toLowerCase().trim();
            System.out.println("🔍 isTopicSpecific('" + title + "') → " + result);
            return result.contains("true");
        } catch (Exception e) {
            System.err.println("❌ isTopicSpecific check failed: " + e.getMessage());
            return true; // Default to allowing the user through
        }
    }

    /**
     * Build the prompt for Gemini API
     */
    private String buildPrompt(String title) {
        return String.format(
                "A student just completed studying the following topic: \"%s\".\n\n" +
                        "Generate EXACTLY 3 challenging, meaningful educational questions to test their real conceptual knowledge and understanding of this topic:\n"
                        +
                        "1. A Short Answer question testing a core term, keyword, or definition (expecting a concise 1-3 word answer).\n"
                        +
                        "2. A factual True/False statement testing an important principle or common misconception about this topic.\n"
                        +
                        "3. A high-quality Multiple Choice Question (MCQ) testing practical syntax, calculation, or distinction between concepts with 4 distinct options (A, B, C, D).\n\n"
                        +
                        "Return ONLY valid JSON (no markdown backticks, no array, no other text):\n" +
                        "{\n" +
                        "  \"shortQuestion\": \"A specific technical or concept question about %s\",\n" +
                        "  \"shortAnswer\": \"concise answer\",\n" +
                        "  \"trueFalseQuestion\": \"A true/false statement about %s\",\n" +
                        "  \"trueFalseAnswer\": true,\n" +
                        "  \"mcqQuestion\": \"A practical multiple choice question about %s\",\n" +
                        "  \"mcqOptions\": {\"A\":\"...\",\"B\":\"...\",\"C\":\"...\",\"D\":\"...\"},\n" +
                        "  \"mcqAnswer\": \"A\"\n" +
                        "}",
                title, title, title, title);
    }

    /**
     * Call Gemini API with automatic model fallback
     */
    private String callGeminiAPI(String prompt) throws Exception {
        Client client = Client.builder()
                .apiKey(apiKey)
                .build();

        String[] modelsToTry = new String[] {
                model,
                "gemini-flash-lite-latest",
                "gemini-flash-latest",
                "gemini-pro-latest"
        };

        Exception lastException = null;
        for (String m : modelsToTry) {
            if (m == null || m.trim().isEmpty())
                continue;
            try {
                System.out.println("📡 Calling Gemini API with model: " + m);
                GenerateContentResponse response = client.models.generateContent(
                        m,
                        prompt,
                        null);
                String text = response.text();
                if (text != null && !text.trim().isEmpty()) {
                    System.out.println("✅ Gemini response received using model: " + m);
                    return text;
                }
            } catch (Exception ex) {
                System.err.println("⚠️ Model " + m + " failed: " + ex.getMessage());
                lastException = ex;
            }
        }

        throw lastException != null ? lastException : new RuntimeException("All Gemini models failed");
    }

    /**
     * Parse Gemini response to extract questions
     */
    private Map<String, Object> parseGeminiResponse(String response) {
        Gson gson = new Gson();

        // Step 1: Clean markdown and whitespace
        response = response.replaceAll("```json\\s*", "");
        response = response.replaceAll("```\\s*", "");
        response = response.trim();

        System.out.println("📝 Parsing: " + response);

        // ✅ Step 2: Try to repair truncated JSON (place it HERE)
        String cleanedResponse = response.trim();

        if (cleanedResponse.startsWith("{") && !cleanedResponse.endsWith("}")) {
            System.out.println("⚠️ Truncated JSON detected, attempting repair...");

            if (!cleanedResponse.endsWith("\"")) {
                cleanedResponse += "\"";
            }

            long openBraces = cleanedResponse.chars().filter(ch -> ch == '{').count();
            long closeBraces = cleanedResponse.chars().filter(ch -> ch == '}').count();

            for (long i = 0; i < (openBraces - closeBraces); i++) {
                cleanedResponse += "}";
            }

            System.out.println("⚠️ Repaired JSON: " + cleanedResponse);
        }

        // Step 3: Parse
        try {
            Map<String, Object> result = new LinkedHashMap<>();

            if (cleanedResponse.startsWith("[")) {
                // Array case — merge all objects
                JsonArray arr = gson.fromJson(cleanedResponse, JsonArray.class);
                System.out.println("⚠️ Response is an array of " + arr.size() + " objects — merging");

                for (int i = 0; i < arr.size(); i++) {
                    JsonObject obj = arr.get(i).getAsJsonObject();

                    if (obj.has("shortQuestion"))
                        result.put("shortQuestion", obj.get("shortQuestion").getAsString());
                    if (obj.has("shortAnswer"))
                        result.put("shortAnswer", obj.get("shortAnswer").getAsString());
                    if (obj.has("trueFalseQuestion"))
                        result.put("trueFalseQuestion", obj.get("trueFalseQuestion").getAsString());
                    if (obj.has("trueFalseAnswer"))
                        result.put("trueFalseAnswer", obj.get("trueFalseAnswer").getAsBoolean());
                    if (obj.has("mcqQuestion"))
                        result.put("mcqQuestion", obj.get("mcqQuestion").getAsString());
                    if (obj.has("mcqOptions")) {
                        JsonObject optionsObj = obj.getAsJsonObject("mcqOptions");
                        Map<String, String> options = new LinkedHashMap<>();
                        for (String key : new String[] { "A", "B", "C", "D" }) {
                            if (optionsObj.has(key)) {
                                options.put(key, optionsObj.get(key).getAsString());
                            }
                        }
                        result.put("mcqOptions", options);
                    }
                    if (obj.has("mcqAnswer"))
                        result.put("mcqAnswer", obj.get("mcqAnswer").getAsString());
                }
            } else {
                // Single object case
                JsonObject json = gson.fromJson(cleanedResponse, JsonObject.class);

                result.put("shortQuestion", json.has("shortQuestion")
                        ? json.get("shortQuestion").getAsString()
                        : "What did you learn?");
                result.put("shortAnswer", json.has("shortAnswer")
                        ? json.get("shortAnswer").getAsString()
                        : "concept");
                result.put("trueFalseQuestion", json.has("trueFalseQuestion")
                        ? json.get("trueFalseQuestion").getAsString()
                        : "Did you learn something?");
                result.put("trueFalseAnswer", json.has("trueFalseAnswer")
                        && json.get("trueFalseAnswer").getAsBoolean());
                result.put("mcqQuestion", json.has("mcqQuestion")
                        ? json.get("mcqQuestion").getAsString()
                        : "What did you learn?");

                Map<String, String> options = new LinkedHashMap<>();
                if (json.has("mcqOptions")) {
                    JsonObject optionsObj = json.getAsJsonObject("mcqOptions");
                    for (String key : new String[] { "A", "B", "C", "D" }) {
                        if (optionsObj.has(key)) {
                            options.put(key, optionsObj.get(key).getAsString());
                        }
                    }
                }
                result.put("mcqOptions", options);
                result.put("mcqAnswer", json.has("mcqAnswer")
                        ? json.get("mcqAnswer").getAsString()
                        : "A");
            }

            // Ensure all required fields
            result.putIfAbsent("shortQuestion", "What did you learn?");
            result.putIfAbsent("shortAnswer", "concept");
            result.putIfAbsent("trueFalseQuestion", "Did you learn something?");
            result.putIfAbsent("trueFalseAnswer", true);
            result.putIfAbsent("mcqQuestion", "What did you learn?");
            result.putIfAbsent("mcqAnswer", "A");

            Map<String, String> opts = (Map<String, String>) result.get("mcqOptions");
            if (opts == null || opts.isEmpty()) {
                Map<String, String> fallbackOpts = new LinkedHashMap<>();
                fallbackOpts.put("A", "Option A");
                fallbackOpts.put("B", "Option B");
                fallbackOpts.put("C", "Option C");
                fallbackOpts.put("D", "Option D");
                result.put("mcqOptions", fallbackOpts);
            }

            return result;

        } catch (Exception e) {
            System.err.println("❌ Failed to parse Gemini response: " + e.getMessage());
            throw new RuntimeException("Failed to parse Gemini response", e);
        }
    }

    /**
     * Fallback questions if Gemini fails - provides realistic, meaningful concept
     * questions
     */
    public Map<String, Object> generateFallbackQuestions(String title) {
        System.out.println("⚠️ Using intelligent concept fallback for: " + title);
        Map<String, Object> questions = new LinkedHashMap<>();
        String lower = title != null ? title.toLowerCase() : "";

        if (lower.contains("variable") || lower.contains("data type")) {
            questions.put("shortQuestion",
                    "In Python/Programming, which built-in function is used to check the data type of a variable?");
            questions.put("shortAnswer", "type");
            questions.put("shortAnswerExpected", "type");

            questions.put("trueFalseQuestion",
                    "Variables in dynamic languages like Python can change their data type at runtime.");
            questions.put("trueFalseAnswer", true);
            questions.put("trueFalseExpected", true);

            Map<String, String> options = new LinkedHashMap<>();
            options.put("A", "int");
            options.put("B", "tuple (immutable)");
            options.put("C", "list (mutable)");
            options.put("D", "dict");
            questions.put("mcqOptions", options);
            questions.put("mcqQuestion",
                    "Which of the following data structures in Python is strictly immutable after creation?");
            questions.put("mcqAnswer", "B");
            questions.put("mcqExpected", "B");
        } else if (lower.contains("function") || lower.contains("method")) {
            questions.put("shortQuestion", "What keyword is used in Python to define a new function?");
            questions.put("shortAnswer", "def");
            questions.put("shortAnswerExpected", "def");

            questions.put("trueFalseQuestion",
                    "A function can accept arguments and optionally send back data using a return statement.");
            questions.put("trueFalseAnswer", true);
            questions.put("trueFalseExpected", true);

            Map<String, String> options = new LinkedHashMap<>();
            options.put("A", "Code reusability & modularity");
            options.put("B", "Slowing down execution");
            options.put("C", "Creating infinite loops");
            options.put("D", "Increasing file size");
            questions.put("mcqOptions", options);
            questions.put("mcqQuestion", "What is the primary architectural purpose of defining functions?");
            questions.put("mcqAnswer", "A");
            questions.put("mcqExpected", "A");
        } else if (lower.contains("loop") || lower.contains("flow") || lower.contains("control")) {
            questions.put("shortQuestion",
                    "Which keyword is used to terminate or exit a loop immediately before its condition is false?");
            questions.put("shortAnswer", "break");
            questions.put("shortAnswerExpected", "break");

            questions.put("trueFalseQuestion",
                    "An infinite loop occurs if the loop termination condition never evaluates to false.");
            questions.put("trueFalseAnswer", true);
            questions.put("trueFalseExpected", true);

            Map<String, String> options = new LinkedHashMap<>();
            options.put("A", "skip");
            options.put("B", "continue");
            options.put("C", "pass");
            options.put("D", "break");
            questions.put("mcqOptions", options);
            questions.put("mcqQuestion",
                    "Which statement skips the current iteration and jumps to the next cycle of the loop?");
            questions.put("mcqAnswer", "B");
            questions.put("mcqExpected", "B");
        } else if (lower.contains("math") || lower.contains("algebra") || lower.contains("equation")) {
            questions.put("shortQuestion", "In the equation 3x - 5 = 10, what is the value of x?");
            questions.put("shortAnswer", "5");
            questions.put("shortAnswerExpected", "5");

            questions.put("trueFalseQuestion",
                    "A linear equation in one variable always has exactly one unique solution.");
            questions.put("trueFalseAnswer", true);
            questions.put("trueFalseExpected", true);

            Map<String, String> options = new LinkedHashMap<>();
            options.put("A", "y = mx + c");
            options.put("B", "ax^2 + bx + c = 0");
            options.put("C", "a^2 + b^2 = c^2");
            options.put("D", "x/y = k");
            questions.put("mcqOptions", options);
            questions.put("mcqQuestion", "What is the standard slope-intercept form of a straight line?");
            questions.put("mcqAnswer", "A");
            questions.put("mcqExpected", "A");
        } else {
            questions.put("shortQuestion", "What is the core fundamental principle behind " + title + "?");
            questions.put("shortAnswer", "fundamentals");
            questions.put("shortAnswerExpected", "fundamentals");

            questions.put("trueFalseQuestion", "Mastering " + title
                    + " requires understanding both its theoretical rules and practical applications.");
            questions.put("trueFalseAnswer", true);
            questions.put("trueFalseExpected", true);

            Map<String, String> options = new LinkedHashMap<>();
            options.put("A", "Testing edge cases and writing clean implementations");
            options.put("B", "Skipping validation and documentation");
            options.put("C", "Memorizing without understanding concepts");
            options.put("D", "Ignoring syntax errors");
            questions.put("mcqOptions", options);
            questions.put("mcqQuestion", "What is the most effective approach to mastering " + title + "?");
            questions.put("mcqAnswer", "A");
            questions.put("mcqExpected", "A");
        }

        questions.put("warning", false);
        return questions;
    }

    /**
     * Validate title - simple check
     */
    public boolean validateTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            return false;
        }
        String[] words = title.trim().split(" ");
        return title.trim().length() >= 5 && words.length >= 2;
    }

    /**
     * Validate answers - simple check
     */
    public Map<String, Boolean> validateAnswers(String title, String shortAnswer,
            Boolean trueFalseAnswer, String mcqAnswer,
            Map<String, Object> originalQuestions) {
        System.out.println("🤖 ========================================");
        System.out.println("🤖 AI VALIDATING ANSWERS");
        System.out.println("🤖 ========================================");

        Map<String, Boolean> results = new LinkedHashMap<>();

        // ✅ Get expected reference answers
        String expectedShort = (String) originalQuestions.getOrDefault("shortAnswer", "");
        Boolean expectedTrueFalse = (Boolean) originalQuestions.getOrDefault("trueFalseAnswer", true);
        String expectedMcq = (String) originalQuestions.getOrDefault("mcqAnswer", "A");

        // ✅ MCQ: case-insensitive compare
        String studentMcqUpper = mcqAnswer != null ? mcqAnswer.trim().toUpperCase() : "";
        String expectedMcqUpper = expectedMcq != null ? expectedMcq.trim().toUpperCase() : "";
        boolean mcqCorrect = studentMcqUpper.equals(expectedMcqUpper);
        results.put("mcqCorrect", mcqCorrect);
        System.out.println("📝 MCQ: student='" + mcqAnswer + "', expected='" + expectedMcq + "' → " + mcqCorrect);

        // ✅ True/False: exact Boolean compare
        boolean tfCorrect = trueFalseAnswer != null && trueFalseAnswer.equals(expectedTrueFalse);
        results.put("trueFalseCorrect", tfCorrect);
        System.out
                .println("📝 T/F: student=" + trueFalseAnswer + ", expected=" + expectedTrueFalse + " → " + tfCorrect);

        // ✅ Short Answer: AI grading (fuzzy match)
        boolean shortCorrect = false;
        try {
            String prompt = String.format(
                    "A student studied: \"%s\"\n\n" +
                            "Reference answer: \"%s\"\n" +
                            "Student's answer: \"%s\"\n\n" +
                            "Determine if the student's answer is CORRECT. " +
                            "Be lenient — accept answers that describe the same concept using different words, " +
                            "contain the key term, or are more detailed than the reference answer.\n\n" +
                            "Reply with ONLY 'true' or 'false'. No explanation.",
                    title, expectedShort, shortAnswer);

            System.out.println("📤 Asking Gemini to grade short answer...");
            String response = callGeminiAPI(prompt);
            System.out.println("📝 Gemini grading response: " + response);

            shortCorrect = response.toLowerCase().contains("true");
            results.put("shortAnswerCorrect", shortCorrect);
            System.out.println("📝 Short Answer graded by AI: " + shortCorrect);

        } catch (Exception e) {
            System.err.println("❌ AI grading failed, using fallback: " + e.getMessage());
            String s = shortAnswer != null ? shortAnswer.toLowerCase() : "";
            String ex = expectedShort != null ? expectedShort.toLowerCase() : "";
            shortCorrect = !s.isEmpty() && !ex.isEmpty() && (s.contains(ex) || ex.contains(s));
            results.put("shortAnswerCorrect", shortCorrect);
        }

        // ✅ Summary
        int correct = 0;
        if (Boolean.TRUE.equals(results.get("shortAnswerCorrect")))
            correct++;
        if (Boolean.TRUE.equals(results.get("trueFalseCorrect")))
            correct++;
        if (Boolean.TRUE.equals(results.get("mcqCorrect")))
            correct++;

        System.out.println("🤖 TOTAL CORRECT: " + correct + "/3");
        return results;
    }

    /**
     * Generate study material (theory, practical example, exercise, references) for
     * a specific topic
     */
    public String generateStudyMaterial(String subject, String title, String difficulty) {
        try {
            String prompt = String.format(
                    "You are an inspiring expert tutor for %s.\n" +
                            "Generate clear, engaging study material for the topic: '%s' (Difficulty level: %s).\n\n" +
                            "Structure your response with the following clearly labeled sections:\n\n" +
                            "📘 CONCEPT & THEORY:\n" +
                            "(Provide a clear, high-yield explanation in 2-4 sentences explaining the 'why' and 'how')\n\n"
                            +
                            "💻 PRACTICAL IMPLEMENTATION / WORKED EXAMPLE:\n" +
                            "(Provide a clean, readable practical code snippet if programming, or step-by-step formula and solution if Maths/Science)\n\n"
                            +
                            "⚡ HANDS-ON PRACTICAL CHALLENGE:\n" +
                            "(A specific mini-exercise the student should solve or code right now in their practical workspace)\n\n"
                            +
                            "📌 KEY REFERENCE & CHEAT SHEET:\n" +
                            "(2-3 bullet points with rules of thumb, syntax tips, or common pitfalls)\n\n" +
                            "Keep total length under 350 words so it is easy to read on screen.",
                    subject, title, difficulty);

            return callGeminiAPI(prompt);
        } catch (Exception e) {
            System.err.println("❌ Failed to generate study material: " + e.getMessage());
            e.printStackTrace();

            String lower = title.toLowerCase();
            if (lower.contains("linear equation") || lower.contains("algebra")) {
                return "📘 CONCEPT & THEORY:\n" +
                        "Linear equations express relationships where variables have an exponent of 1 (e.g., ax + b = c). In algebra, solving for 'x' involves isolating the variable by performing balanced inverse operations on both sides of the equals sign.\n\n"
                        +
                        "💻 PRACTICAL IMPLEMENTATION / WORKED EXAMPLE:\n" +
                        "Solve: 3x + 12 = 27\n" +
                        "Step 1: Subtract 12 from both sides -> 3x = 15\n" +
                        "Step 2: Divide both sides by 3 -> x = 5\n" +
                        "Verification: 3(5) + 12 = 15 + 12 = 27 ✓\n\n" +
                        "⚡ HANDS-ON PRACTICAL CHALLENGE:\n" +
                        "In your scratchpad or calculator on the right, solve for y:\n" +
                        "4y - 8 = 24. Calculate what y equals!\n\n" +
                        "📌 KEY REFERENCE & CHEAT SHEET:\n" +
                        "- Golden Rule: Whatever you do to one side of the equation, you MUST do to the other.\n" +
                        "- Standard Slope-Intercept Form: y = mx + c (m = slope, c = y-intercept).\n" +
                        "- Always check your solution by plugging it back into the original equation.";
            } else if (lower.contains("variable") || lower.contains("data type")) {
                return "📘 CONCEPT & THEORY:\n" +
                        "Variables are named references to computer memory locations that store data. Data types define the nature of the data (such as numbers, text, or booleans) and determine what operations can legally be performed on them.\n\n"
                        +
                        "💻 PRACTICAL IMPLEMENTATION / WORKED EXAMPLE:\n" +
                        "// Python Example:\n" +
                        "user_age = 21          # Integer\n" +
                        "user_score = 98.5       # Float\n" +
                        "user_name = 'Alex'      # String\n" +
                        "is_passed = True        # Boolean\n" +
                        "print(f'{user_name} is {user_age} years old and scored {user_score}')\n\n" +
                        "⚡ HANDS-ON PRACTICAL CHALLENGE:\n" +
                        "Switch to the Code Playground on the right. Declare three variables (a string, an integer, and a boolean), concatenate them into a single output, and click 'Run Code'.\n\n"
                        +
                        "📌 KEY REFERENCE & CHEAT SHEET:\n" +
                        "- Python is dynamically typed: variable types are inferred automatically at runtime.\n" +
                        "- Immutable types (cannot change in-place): int, float, str, tuple.\n" +
                        "- Mutable types (can modify contents): list, dict, set.";
            } else {
                return "📘 CONCEPT & THEORY:\n" +
                        title + " is a foundational pillar in " + subject
                        + ". Developing mastery requires understanding how core definitions connect to practical problem-solving rules.\n\n"
                        +
                        "💻 PRACTICAL IMPLEMENTATION / WORKED EXAMPLE:\n" +
                        "Step 1: Break down the problem statement into knowns and unknowns.\n" +
                        "Step 2: Apply the governing formulas or syntax conventions for " + title + ".\n" +
                        "Step 3: Verify the output against edge cases or test inputs.\n\n" +
                        "⚡ HANDS-ON PRACTICAL CHALLENGE:\n" +
                        "Use the practical workspace on the right to implement a clean demonstration solving a problem for "
                        + title + ".\n\n" +
                        "📌 KEY REFERENCE & CHEAT SHEET:\n" +
                        "- Review standard syntax and notation conventions.\n" +
                        "- Break complex problems down into modular mini-steps.\n" +
                        "- Validate edge cases before concluding.";
            }
        }
    }
}