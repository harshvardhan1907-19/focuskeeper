// package focuskeeper.config;

// public class SecurityConstants {
//     // Read from environment variable, or use default for development
//     public static final String SECRET_KEY = "3TrZidWDAN1eWAqeh0qpHlusyoCCoifidxQ2t/jQQps="; // Fallback for dev

//     public static final long EXPIRATION_TIME = 86400000; // 24 hours
//     public static final String TOKEN_PREFIX = "Bearer ";
//     public static final String HEADER_STRING = "Authorization";
// }

package focuskeeper.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SecurityConstants {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration:86400000}")
    private long expirationTime;

    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_STRING = "Authorization";

    public String getSecretKey() {
        return secretKey;
    }

    public long getExpirationTime() {
        return expirationTime;
    }
}