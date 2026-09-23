package focuskeeper;

import java.security.SecureRandom;
import java.util.Base64;

public class GenerateSecretKey {
    public static void main(String[] args) {
        // Generate 256-bit (32 bytes) secure random key
        SecureRandom secureRandom = new SecureRandom();
        byte[] key = new byte[32]; // 32 bytes = 256 bits
        secureRandom.nextBytes(key);

        // Encode to Base64
        String secretKey = Base64.getEncoder().encodeToString(key);
        System.out.println("Your SECRET_KEY: " + secretKey);
        System.out.println("Length: " + secretKey.length() + " characters");
    }
}