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
            Map<String, Integer> zoneUpvotes = new HashMap<>();

            for (Map<String, Object> report : reports) {
                String zone = (String) report.get("zone");
                int upvotes = (Integer) report.get("upvotes_count");

                zoneCounts.put(zone, zoneCounts.getOrDefault(zone, 0) + 1);
                zoneUpvotes.put(zone, zoneUpvotes.getOrDefault(zone, 0) + upvotes);
            }

            StringBuilder auditResult = new StringBuilder("Fairness Audit Complete. ");
            for (String zone : zoneCounts.keySet()) {
                auditResult.append(zone).append(": ").append(zoneCounts.get(zone)).append(" issues (").append(zoneUpvotes.get(zone)).append(" upvotes). ");
            }

            return ResponseEntity.ok("{\"status\": \"success\", \"message\": \"" + auditResult.toString().trim() + "\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("{\"status\": \"error\", \"message\": \"Internal Server Error\"}");
        }
    }

    @PostMapping("/cluster-duplicates")
    public ResponseEntity<String> clusterDuplicates(@RequestBody Map<String, Object> newReport) {
        try {
            double newLat = Double.parseDouble(newReport.get("lat").toString());
            double newLng = Double.parseDouble(newReport.get("lng").toString());
            String newTitle = newReport.get("title").toString().toLowerCase();

            String reportsJson = supabaseClientService.getReports();
            List<Map<String, Object>> existingReports = objectMapper.readValue(reportsJson, new TypeReference<List<Map<String, Object>>>() {});

            for (Map<String, Object> existing : existingReports) {
                double exLat = Double.parseDouble(existing.get("lat").toString());
                double exLng = Double.parseDouble(existing.get("lng").toString());
                String exTitle = existing.get("title").toString().toLowerCase();

                // Simple Distance Check (approximate Haversine for small distances)
                double dLat = Math.toRadians(exLat - newLat);
                double dLng = Math.toRadians(exLng - newLng);
                double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                           Math.cos(Math.toRadians(newLat)) * Math.cos(Math.toRadians(exLat)) *
                           Math.sin(dLng / 2) * Math.sin(dLng / 2);
                double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                double distance = 6371000 * c; // Distance in meters

                if (distance < 500) { // within 500 meters
                    if (newTitle.contains(exTitle) || exTitle.contains(newTitle) || distance < 50) {
                        return ResponseEntity.ok("{\"status\": \"success\", \"is_duplicate\": true, \"message\": \"Potential duplicate found: '" + existing.get("title") + "'\"}");
                    }
                }
            }

            return ResponseEntity.ok("{\"status\": \"success\", \"is_duplicate\": false, \"message\": \"No duplicates found.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("{\"status\": \"error\", \"message\": \"Internal Server Error\"}");
        }
    }
}
