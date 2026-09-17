package com.civicpulse.service;

import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/** Public, read-only Supabase data for advisory analysis. */
@Service
public class IntelligenceDataSource {
    private final RestTemplate client;
    private final String base;
    private final String key;
    public IntelligenceDataSource(RestTemplateBuilder builder, @Value("${supabase.url}") String url, @Value("${supabase.key}") String key) {
        this.client = builder.setConnectTimeout(Duration.ofSeconds(1)).setReadTimeout(Duration.ofSeconds(2)).build();
        String clean = url.replaceAll("/+$", "");
        this.base = clean.endsWith("/rest/v1") ? clean : clean + "/rest/v1";
        this.key = key;
    }
    private <T> List<T> read(String query, Class<T[]> type) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", key);
        headers.setBearerAuth(key);
        List<T> rows = new ArrayList<>();
        long deadline = System.nanoTime() + Duration.ofSeconds(3).toNanos();
        int offset = 0;
        while (true) {
            if (System.nanoTime() > deadline) throw new IllegalStateException("Intelligence data deadline exceeded");
            T[] page = client.exchange(base + query + "&order=id&limit=500&offset=" + offset, HttpMethod.GET, new HttpEntity<>(headers), type).getBody();
            if (page == null) throw new IllegalStateException("Missing intelligence data response");
            if (page.length == 0) return rows;
            rows.addAll(Arrays.asList(page));
            offset += page.length;
        }
    }
    public List<SmartService.ReportData> reports() {
        // Fetch the public report projection; SmartService applies the lifecycle filter locally.
        // Keeping the PostgREST query simple avoids encoding differences for statuses containing spaces.
        return read("/reports?select=id,title,description,category,status,lat,lng", SmartService.ReportData[].class);
    }
    public List<SmartService.DepartmentData> departments() { return read("/departments?select=id,name", SmartService.DepartmentData[].class); }
}
