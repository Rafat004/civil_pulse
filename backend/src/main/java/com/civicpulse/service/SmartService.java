package com.civicpulse.service;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SmartService {
    public record ReportData(UUID id, String title, String description, String category, String status, Double lat, Double lng) {}
    public record DepartmentData(UUID id, String name) {}
    public record Candidate(UUID id, String title, String category, String status, long distanceMeters, double similarity, List<String> reasons) {}
    public record Suggestion(String category, UUID departmentId, String departmentName, String reason) {}
    private static final List<String> CATEGORIES = List.of("Roads & Infrastructure", "Waste & Sanitation", "Water & Drainage", "Electricity & Lighting", "Public Safety", "Parks & Public Spaces", "Other");
    private static final List<String> KEYWORDS = List.of("pothole pavement sidewalk bridge road asphalt", "garbage rubbish trash waste litter dumping sanitation", "water drain drainage sewage sewer flooding leak", "streetlight electricity lighting power cable wiring electric", "crime danger unsafe hazard violence safety", "park playground tree garden grass bench");
    private static final Set<String> STOP = Set.of("the", "a", "an", "is", "are", "at", "on", "in", "of", "to", "and", "near", "this", "that", "there", "it", "for", "with", "please", "issue", "broken", "damaged");
    private final double radius;
    public SmartService(@Value("${intelligence.duplicate-radius-meters:500}") double radius) {
        if (!Double.isFinite(radius) || radius <= 0) throw new IllegalArgumentException("Duplicate radius must be positive");
        this.radius = radius;
    }
    public static boolean validCategory(String category) { return CATEGORIES.contains(category); }
    private static Set<String> tokens(String text) {
        return Arrays.stream(Normalizer.normalize(text == null ? "" : text, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
            .filter(t -> t.length() > 1 && !STOP.contains(t)).collect(Collectors.toSet());
    }
    private static double overlap(String a, String b) {
        Set<String> x = tokens(a), y = tokens(b);
        if (x.isEmpty() || y.isEmpty()) return 0;
        long common = x.stream().filter(y::contains).count();
        return 2.0 * common / (x.size() + y.size());
    }
    public List<Candidate> duplicates(String title, String description, String category, double lat, double lng, List<ReportData> reports) {
        List<Candidate> result = new ArrayList<>();
        for (ReportData r : reports) {
            if (r.id() == null || r.lat() == null || r.lng() == null || !Double.isFinite(r.lat()) || !Double.isFinite(r.lng()) || Math.abs(r.lat()) > 90 || Math.abs(r.lng()) > 180 || !Set.of("Reported", "Verified", "Assigned", "In Progress", "Reopened").contains(r.status() == null ? "" : r.status())) continue;
            double a = Math.pow(Math.sin(Math.toRadians(r.lat() - lat) / 2), 2) + Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(r.lat())) * Math.pow(Math.sin(Math.toRadians(r.lng() - lng) / 2), 2);
            double distance = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
            double titleScore = overlap(title, r.title()), descriptionScore = overlap(description, r.description());
            if (distance > radius || Math.max(titleScore, descriptionScore) < .35) continue;
            boolean sameCategory = category.equals(r.category());
            double score = .45 * titleScore + .30 * descriptionScore + .15 * (1 - distance / radius) + (sameCategory ? .10 : 0);
            if (score < .30) continue;
            List<String> reasons = new ArrayList<>();
            if (titleScore >= .35) reasons.add("Similar title");
            if (descriptionScore >= .35) reasons.add("Similar description");
            if (sameCategory) reasons.add("Same category");
            reasons.add("Nearby location");
            result.add(new Candidate(r.id(), r.title(), r.category(), r.status(), Math.round(distance), Math.round(score * 1000) / 1000.0, reasons));
        }
        return result.stream().sorted(Comparator.comparingDouble(Candidate::similarity).reversed().thenComparingLong(Candidate::distanceMeters).thenComparing(c -> c.id().toString())).limit(5).toList();
    }
    public Suggestion category(String title, String description) {
        Set<String> t = tokens(title), d = tokens(description);
        int best = 0, index = -1; boolean tie = false;
        for (int i = 0; i < KEYWORDS.size(); i++) {
            int score = 0;
            for (String word : KEYWORDS.get(i).split(" ")) score += (t.contains(word) ? 2 : 0) + (d.contains(word) ? 1 : 0);
            if (score > best) { best = score; index = i; tie = false; }
            else if (score == best && score > 0) tie = true;
        }
        return index < 0 || tie ? new Suggestion(null, null, null, "No clear suggestion. Please choose manually.") : new Suggestion(CATEGORIES.get(index), null, null, "Report text matches " + CATEGORIES.get(index) + " keywords.");
    }
    public Suggestion department(String title, String description, String category, List<DepartmentData> departments) {
        String selected = "Other".equals(category) ? category(title, description).category() : category;
        String name = "Waste & Sanitation".equals(selected) ? "Waste Management" : selected;
        return departments.stream().filter(d -> d.id() != null && Objects.equals(d.name(), name)).findFirst()
            .map(d -> new Suggestion(selected, d.id(), d.name(), "Department responsible for " + selected + ". Confirm before saving."))
            .orElse(new Suggestion(null, null, null, "No clear available department. Please choose manually."));
    }
}
