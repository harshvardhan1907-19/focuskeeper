package focuskeeper;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication; // The class that boots up Spring Boot
import org.springframework.boot.autoconfigure.SpringBootApplication; // The annotation that configures everything
import org.springframework.context.annotation.Bean;

import focuskeeper.service.UserService;

// @SpringBootApplication =
// @Configuration // Marks this as a configuration class
// + @EnableAutoConfiguration // Auto-configures Spring based on dependencies
// + @ComponentScan // Scans for components in this package and sub-packages
@SpringBootApplication
public class FocuskeeperApplication {

	static {
		try {
			java.io.File envFile = new java.io.File(".env");
			if (envFile.exists()) {
				for (String line : java.nio.file.Files.readAllLines(envFile.toPath())) {
					line = line.trim();
					if (!line.isEmpty() && !line.startsWith("#") && line.contains("=")) {
						int idx = line.indexOf('=');
						String key = line.substring(0, idx).trim();
						String val = line.substring(idx + 1).trim();
						if (System.getProperty(key) == null) {
							System.setProperty(key, val);
						}
					}
				}
				System.out.println("✅ .env file loaded into System properties successfully!");
			}
		} catch (Exception e) {
			System.err.println("⚠️ Could not load .env: " + e.getMessage());
		}
	}

	public static void main(String[] args) {
		SpringApplication.run(FocuskeeperApplication.class, args);
	}

	// @Bean
	// public CommandLineRunner migrateCoins(UserService userService) {
	// return args -> {
	// System.out.println("🪙 Starting coin migration for past sessions...");
	// userService.migratePastSessionsCoins();
	// System.out.println("✅ Coin migration complete!");
	// };
	// }
}