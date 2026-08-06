package focuskeeper;

import org.springframework.boot.SpringApplication; // The class that boots up Spring Boot
import org.springframework.boot.autoconfigure.SpringBootApplication; // The annotation that configures everything

// @SpringBootApplication =
// @Configuration // Marks this as a configuration class
// + @EnableAutoConfiguration // Auto-configures Spring based on dependencies
// + @ComponentScan // Scans for components in this package and sub-packages
@SpringBootApplication
public class FocuskeeperApplication {

	public static void main(String[] args) {
		SpringApplication.run(FocuskeeperApplication.class, args);
	}

}