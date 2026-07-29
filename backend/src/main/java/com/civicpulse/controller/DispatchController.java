package com.civicpulse.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/dispatch")
public class DispatchController {

    @PostMapping("/assign")
    public ResponseEntity<String> dispatchIssue(@RequestBody Map<String, Object> dispatchRequest) {
        // Example Request Body: { "issueId": "REP-2024-089", "department": "Public Works" }
        String issueId = (String) dispatchRequest.getOrDefault("issueId", "UNKNOWN");
        String department = (String) dispatchRequest.getOrDefault("department", "UNKNOWN");
        
        String responseMessage = String.format("Successfully assigned issue %s to department: %s", issueId, department);
        
        return ResponseEntity.ok("{\"status\": \"success\", \"message\": \"" + responseMessage + "\"}");
    }
}
