package com.civicpulse.controller;

import com.civicpulse.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/intelligence")
public class SmartController {
    public record TextRequest(@NotBlank @Size(max=300) String title, @NotBlank @Size(max=10000) String description) {}
    public record DepartmentRequest(@NotBlank @Size(max=300) String title, @NotBlank @Size(max=10000) String description, @NotBlank String category) {}
    public record DuplicateRequest(@NotBlank @Size(max=300) String title, @NotBlank @Size(max=10000) String description, @NotBlank String category, @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat, @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng) {}
    public record DuplicateResponse(List<SmartService.Candidate> candidates) {}
    private final SmartService smart;
    private final IntelligenceDataSource data;
    public SmartController(SmartService smart, IntelligenceDataSource data) { this.smart = smart; this.data = data; }
    private void validateCategory(String category) { if (!SmartService.validCategory(category)) throw new IllegalArgumentException("Choose a documented report category."); }
    @PostMapping("/cluster-duplicates")
    public DuplicateResponse duplicates(@Valid @RequestBody DuplicateRequest request) {
        validateCategory(request.category());
        return new DuplicateResponse(smart.duplicates(request.title(), request.description(), request.category(), request.lat(), request.lng(), data.reports()));
    }
    @PostMapping("/suggest-category")
    public SmartService.Suggestion category(@Valid @RequestBody TextRequest request) { return smart.category(request.title(), request.description()); }
    @PostMapping("/recommend-department")
    public SmartService.Suggestion department(@Valid @RequestBody DepartmentRequest request) {
        validateCategory(request.category());
        return smart.department(request.title(), request.description(), request.category(), data.departments());
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String,String>> invalid(IllegalArgumentException error) { return ResponseEntity.badRequest().body(Map.of("message", error.getMessage())); }
    @ExceptionHandler({org.springframework.web.client.RestClientException.class, IllegalStateException.class})
    public ResponseEntity<Map<String,String>> unavailable(Exception error) { return ResponseEntity.status(503).body(Map.of("message", "Suggestions are temporarily unavailable.")); }
}
