package focuskeeper.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import focuskeeper.model.User;
import focuskeeper.service.UserService;
import focuskeeper.utils.JwtUtil;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    // new user create
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String email = request.get("email");
            String password = request.get("password");
            String fullName = request.get("fullName");

            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required!"));
            }
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required!"));
            }
            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required!"));
            }
            if (fullName == null || fullName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Full Name is required!"));
            }

            User user = userService.registerUser(username, email, password, fullName);

            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            response.put("createdAt", user.getCreatedAt());
            response.put("message", "User registered successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // user login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");

            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }

            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }

            User user = userService.getUserByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Invalid username or password"));

            // Verify password
            if (!userService.verifyPassword(password, user.getPassword())) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
            }

            // Generate JWT token
            String token = jwtUtil.generateToken(user.getUsername(), user.getId());

            // Update last login time
            userService.updateLastLogin(user.getId());

            // Return response with token
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            response.put("createdAt", user.getCreatedAt());
            response.put("lastLogin", user.getLastLogin());
            response.put("token", token);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    // validate token
    @PostMapping("/validate")
    public ResponseEntity<?> validate(@RequestBody Map<String, String> request) {
        try {
            String token = request.get("token");
            if (token == null || token.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("valid", false, "error", "Token is required"));
            }

            String username = jwtUtil.extractUsername(token);
            if (username != null && jwtUtil.validateToken(token, username)) {
                Map<String, Object> response = new HashMap<>();
                response.put("valid", true);
                response.put("username", username);
                response.put("userId", jwtUtil.getUserId(token));
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.ok(Map.of("valid", false));
            }
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("valid", false, "error", e.getMessage()));
        }
    }
}