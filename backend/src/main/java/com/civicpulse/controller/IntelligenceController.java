package com.civicpulse.controller;

import com.civicpulse.service.NewsScannerService;
import com.civicpulse.service.SupabaseClientService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/intelligence")
public class IntelligenceController {

    private final NewsScannerService newsScannerService;
    private final SupabaseClientService supabaseClientService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public IntelligenceController(NewsScannerService newsScannerService, SupabaseClientService supabaseClientService) {
        this.newsScannerService = newsScannerService;
        this.supabaseClientService = supabaseClientService;
    }

    @GetMapping("/scan-news")
    public ResponseEntity<List<Map<String, String>>> scanNews() {
        List<Map<String, String>> issues = newsScannerService.scanLocalNews("");
        return ResponseEntity.ok(issues);
    }

    @GetMapping("/audit-fairness")
    public ResponseEntity<String> auditFairness() {
        try {
            String reportsJson = supabaseClientService.getReports();
            List<Map<String, Object>> reports = objectMapper.readValue(reportsJson, new TypeReference<List<Map<String, Object>>>() {});

            Map<String, Integer> zoneCounts = new HashMap<>();

            for (Map<String, Object> report : reports) {
                String zone = (String) report.getOrDefault("zone", "General");
                zoneCounts.put(zone, zoneCounts.getOrDefault(zone, 0) + 1);
            }

            StringBuilder auditResult = new StringBuilder("Fairness Audit Complete. ");
            for (Map.Entry<String, Integer> entry : zoneCounts.entrySet()) {
                auditResult.append(entry.getKey()).append(": ").append(entry.getValue()).append(" issues. ");
            }

            return ResponseEntity.ok("{\"status\": \"success\", \"message\": \"" + auditResult.toString().trim() + "\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("{\"status\": \"error\", \"message\": \"Internal Server Error\"}");
        }
    }

}
