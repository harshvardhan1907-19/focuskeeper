package focuskeeper.config;

public class SecurityConstants {
    // Read from environment variable, or use default for development
    public static final String SECRET_KEY = "3TrZidWDAN1eWAqeh0qpHlusyoCCoifidxQ2t/jQQps="; // Fallback for dev

    public static final long EXPIRATION_TIME = 86400000; // 24 hours
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_STRING = "Authorization";
}