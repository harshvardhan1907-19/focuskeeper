package focuskeeper.controller;

import focuskeeper.model.User;
import focuskeeper.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * UserController - REST API endpoints for User operations
 * 
 * Base URL: /api/users
 * 
 * This controller handles HTTP requests and returns JSON responses
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*") // Allows frontend to call these APIs
public class UserController {

    @Autowired
    private UserService userService;

    // ========================================
    // CREATE - POST /api/users/register
    // ========================================

    /**
     * Register a new user
     * 
     * POST /api/users/register
     * Body: { "username": "john", "email": "john@example.com", "password": "pass",
     * "fullName": "John Doe" }
     */
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String email = request.get("email");
            String password = request.get("password");
            String fullName = request.get("fullName");

            // Validate input
            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }
            if (email == null || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            }
            if (password == null || password.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Password is required"));
            }

            User user = userService.registerUser(username, email, password, fullName);

            // Return user data without password
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("fullName", user.getFullName());
            response.put("createdAt", user.getCreatedAt());

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ========================================
    // READ - GET /api/users
    // ========================================

    /**
     * Get all users
     * 
     * GET /api/users
     */
    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userService.getAllUsers();

        // Remove passwords from response
        List<Map<String, Object>> response = users.stream().map(user -> {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("username", user.getUsername());
            userMap.put("email", user.getEmail());
            userMap.put("fullName", user.getFullName());
            userMap.put("createdAt", user.getCreatedAt());
            userMap.put("lastLogin", user.getLastLogin());
            return userMap;
        }).toList();

        return ResponseEntity.ok(response);
    }

    /**
     * Get user by ID
     * 
     * GET /api/users/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        Optional<User> userOptional = userService.getUserById(id);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found with ID: " + id));
        }

        User user = userOptional.get();

        // Return user without password
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("fullName", user.getFullName());
        response.put("createdAt", user.getCreatedAt());
        response.put("lastLogin", user.getLastLogin());

        return ResponseEntity.ok(response);
    }

    /**
     * Get user by username
     * 
     * GET /api/users/username/{username}
     */
    @GetMapping("/username/{username}")
    public ResponseEntity<?> getUserByUsername(@PathVariable String username) {
        Optional<User> userOptional = userService.getUserByUsername(username);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found with username: " + username));
        }

        User user = userOptional.get();

        // Return user without password
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("password", user.getPassword());
        response.put("fullName", user.getFullName());
        response.put("createdAt", user.getCreatedAt());
        response.put("lastLogin", user.getLastLogin());

        return ResponseEntity.ok(response);
    }

    // ========================================
    // UPDATE - PUT /api/users/{id}
    // ========================================

    /**
     * Update user's full name
     * 
     * PUT /api/users/{id}
     * Body: { "fullName": "New Name" }
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            String fullName = request.get("fullName");

            if (fullName == null || fullName.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "fullName is required"));
            }

            User updatedUser = userService.updateFullName(id, fullName);

            // Return updated user without password
            Map<String, Object> response = new HashMap<>();
            response.put("id", updatedUser.getId());
            response.put("username", updatedUser.getUsername());
            response.put("email", updatedUser.getEmail());
            response.put("fullName", updatedUser.getFullName());
            response.put("createdAt", updatedUser.getCreatedAt());

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Update user's last login time
     * 
     * PUT /api/users/{id}/login
     */
    @PutMapping("/{id}/login")
    public ResponseEntity<?> updateLastLogin(@PathVariable Long id) {
        try {
            User updatedUser = userService.updateLastLogin(id);

            Map<String, Object> response = new HashMap<>();
            response.put("id", updatedUser.getId());
            response.put("username", updatedUser.getUsername());
            response.put("lastLogin", updatedUser.getLastLogin());

            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ========================================
    // DELETE - DELETE /api/users/{id}
    // ========================================

    /**
     * Delete user by ID
     * 
     * DELETE /api/users/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully with ID: " + id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Delete user by username
     * 
     * DELETE /api/users/username/{username}
     */
    @DeleteMapping("/username/{username}")
    public ResponseEntity<?> deleteUserByUsername(@PathVariable String username) {
        try {
            userService.deleteUserByUsername(username);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully with username: " + username));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ========================================
    // CHECK EXISTENCE - GET /api/users/exists
    // ========================================

    /**
     * Check if username exists
     * 
     * GET /api/users/exists?username=john
     */
    @GetMapping("/exists")
    public ResponseEntity<?> checkExists(@RequestParam(required = false) String username,
            @RequestParam(required = false) String email) {
        Map<String, Boolean> response = new HashMap<>();

        if (username != null) {
            response.put("usernameExists", userService.userExistsByUsername(username));
        }

        if (email != null) {
            response.put("emailExists", userService.userExistsByEmail(email));
        }

        return ResponseEntity.ok(response);
    }

}