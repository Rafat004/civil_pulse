package com.civicpulse.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class SupabaseClientService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Fetches all reports from the Supabase REST API.
     */
    public String getReports() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", supabaseKey);
        headers.set("Authorization", "Bearer " + supabaseKey);
        
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            String baseUrl = supabaseUrl.endsWith("/") ? supabaseUrl.substring(0, supabaseUrl.length() - 1) : supabaseUrl;
            if (!baseUrl.endsWith("/rest/v1")) {
                baseUrl += "/rest/v1";
            }
            String endpoint = baseUrl + "/reports?select=*";
            return restTemplate.exchange(endpoint, HttpMethod.GET, entity, String.class).getBody();
        } catch (Exception e) {
            e.printStackTrace();
            return "[]";
        }
    }
}
