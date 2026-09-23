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

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-3.6-flash}")
    private String model;

    @PostConstruct
    public void init() {
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
                "Does this title describe a specific study TOPIC (like 'DBMS', 'Python loops', 'English grammar') " +
                "or just a generic activity (like 'doing homework', 'writing assignment', 'studying for exam')?\n\n" +
                "Title: \"%s\"\n\n" +
                "If the title contains a specific subject name (like a technology, language, science field, etc.), reply 'true'.\n" +
                "If the title only describes the activity without naming a specific subject, reply 'false'.\n\n" +
                "Reply ONLY 'true' or 'false'.",
                title
            );
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
        "A student just studied this topic: \"%s\"\n\n" +
        "⚠️ YOUR JOB: Generate 3 questions that test KNOWLEDGE about the SUBJECT, " +
        "not about the activity of studying.\n\n" +
        "❌ DO NOT ask:\n" +
        "  - What is the assignment about?\n" +
        "  - Is the student writing an assignment?\n" +
        "  - What is the primary subject?\n" +
        "  - Questions about the student's task or context\n\n" +
        "✅ DO ask:\n" +
        "  - Specific questions about facts, concepts, definitions, or methods\n" +
        "  - Questions that require ACTUAL KNOWLEDGE of the topic\n\n" +
        "Extract the SUBJECT from the title (e.g., 'DBMS', 'Python exception handling', " +
        "'Modal auxiliaries') and generate questions about THAT SUBJECT.\n\n" +
        "Return ONLY valid JSON (no markdown, no array):\n" +
        "{\n" +
        "  \"shortQuestion\": \"[A specific knowledge question about the SUBJECT]\",\n" +
        "  \"shortAnswer\": \"[1-3 word reference answer]\",\n" +
        "  \"trueFalseQuestion\": \"[A fact-based statement about the SUBJECT]\",\n" +
        "  \"trueFalseAnswer\": true,\n" +
        "  \"mcqQuestion\": \"[A knowledge-testing question about the SUBJECT]\",\n" +
        "  \"mcqOptions\": {\"A\":\"...\",\"B\":\"...\",\"C\":\"...\",\"D\":\"...\"},\n" +
        "  \"mcqAnswer\": \"[A/B/C/D]\"\n" +
        "}",
        title);
    }

    /**
     * Call Gemini API
     */
    private String callGeminiAPI(String prompt) throws Exception {
        String urlString = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key="
                + apiKey;

        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);

        Gson gson = new Gson();
        JsonObject requestBody = new JsonObject();
        JsonArray contents = new JsonArray();
        JsonObject content = new JsonObject();
        JsonArray parts = new JsonArray();
        JsonObject part = new JsonObject();
        part.addProperty("text", prompt);
        parts.add(part);
        content.add("parts", parts);
        contents.add(content);
        requestBody.add("contents", contents);

        JsonObject generationConfig = new JsonObject();
        generationConfig.addProperty("temperature", 0.3);

        // ✅ INCREASED from 400 to 2000 tokens
        generationConfig.addProperty("maxOutputTokens", 2000);

        // ✅ ADD THIS: Disable thinking to save tokens
        JsonObject thinkingConfig = new JsonObject();
        thinkingConfig.addProperty("thinkingBudget", 0);
        generationConfig.add("thinkingConfig", thinkingConfig);

        requestBody.add("generationConfig", generationConfig);

        try (OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream())) {
            writer.write(requestBody.toString());
            writer.flush();
        }

        int responseCode = conn.getResponseCode();
        System.out.println("📡 Response Code: " + responseCode);

        if (responseCode != 200) {
            try (Scanner scanner = new Scanner(conn.getErrorStream())) {
                String error = scanner.useDelimiter("\\A").next();
                System.err.println("❌ Gemini API Error: " + error);
                throw new Exception("Gemini API error: " + error);
            }
        }

        try (Scanner scanner = new Scanner(conn.getInputStream())) {
            String response = scanner.useDelimiter("\\A").next();
            System.out.println("📝 Raw Response: " + response);

            JsonObject jsonResponse = gson.fromJson(response, JsonObject.class);

            // ✅ Concatenate ALL text parts
            JsonArray parts1 = jsonResponse
                .getAsJsonArray("candidates")
                .get(0)
                .getAsJsonObject()
                .getAsJsonObject("content")
                .getAsJsonArray("parts");

            StringBuilder fullText = new StringBuilder();
            for (int i = 0; i < parts1.size(); i++) {
                JsonObject part1 = parts1.get(i).getAsJsonObject();
                if (part1.has("text")) {
                    fullText.append(part1.get("text").getAsString());
                }
            }
            String text = fullText.toString();

            System.out.println("📝 Combined text from " + parts1.size() + " parts: " + text);
            return text;
        }
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
                        for (String key : new String[]{"A", "B", "C", "D"}) {
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
                    ? json.get("shortQuestion").getAsString() : "What did you learn?");
                result.put("shortAnswer", json.has("shortAnswer")
                    ? json.get("shortAnswer").getAsString() : "concept");
                result.put("trueFalseQuestion", json.has("trueFalseQuestion")
                    ? json.get("trueFalseQuestion").getAsString() : "Did you learn something?");
                result.put("trueFalseAnswer", json.has("trueFalseAnswer")
                    && json.get("trueFalseAnswer").getAsBoolean());
                result.put("mcqQuestion", json.has("mcqQuestion")
                    ? json.get("mcqQuestion").getAsString() : "What did you learn?");

                Map<String, String> options = new LinkedHashMap<>();
                if (json.has("mcqOptions")) {
                    JsonObject optionsObj = json.getAsJsonObject("mcqOptions");
                    for (String key : new String[]{"A", "B", "C", "D"}) {
                        if (optionsObj.has(key)) {
                            options.put(key, optionsObj.get(key).getAsString());
                        }
                    }
                }
                result.put("mcqOptions", options);
                result.put("mcqAnswer", json.has("mcqAnswer")
                    ? json.get("mcqAnswer").getAsString() : "A");
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
     * Fallback questions if Gemini fails
     */
    private Map<String, Object> generateFallbackQuestions(String title) {
        System.out.println("⚠️ Using fallback questions for: " + title);

        Map<String, Object> questions = new LinkedHashMap<>();
        String[] words = title.toLowerCase().split(" ");
        String topic = words.length > 0 ? words[0] : "study";

        questions.put("shortQuestion", "What did you learn about " + topic + "? (2-3 words)");
        questions.put("shortAnswer", topic);
        questions.put("shortAnswerExpected", topic);
        questions.put("trueFalseQuestion", "Did you learn something new about " + topic + "?");
        questions.put("trueFalseAnswer", true);
        questions.put("trueFalseExpected", true);

        Map<String, String> options = new LinkedHashMap<>();
        options.put("A", "Yes, I learned something");
        options.put("B", "No, I already knew everything");
        options.put("C", "I'm not sure");
        options.put("D", "I didn't focus");
        questions.put("mcqOptions", options);
        questions.put("mcqQuestion", "Did you learn something new during this session?");
        questions.put("mcqAnswer", "A");
        questions.put("mcqExpected", "A");
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
}