package focuskeeper.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // @Override
    // public void addResourceHandlers(ResourceHandlerRegistry registry) {
    // registry.addResourceHandler("/**")
    // .addResourceLocations("classpath:/static/")
    // .setCachePeriod(3600);
    // }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/style/**")
                .addResourceLocations("classpath:/static/style/")
                .setCachePeriod(3600);

        registry.addResourceHandler("/scripts/**")
                .addResourceLocations("classpath:/static/scripts/")
                .setCachePeriod(3600);
    }
}