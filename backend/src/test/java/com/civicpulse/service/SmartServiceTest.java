package com.civicpulse.service;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SmartServiceTest {
    private final SmartService smart = new SmartService(500);

    @Test
    void ranksNearbySimilarActiveReportsAndExplainsMatch() {
        UUID matchId = UUID.randomUUID();
        List<SmartService.Candidate> candidates = smart.duplicates(
            "Deep pothole on Main road", "Large pothole near the school entrance", "Roads & Infrastructure", 23.8103, 90.4125,
            List.of(
                new SmartService.ReportData(matchId, "Deep pothole on Main road", "Large pothole near school", "Roads & Infrastructure", "Reported", 23.8104, 90.4126),
                new SmartService.ReportData(UUID.randomUUID(), "Pothole", "Road damage", "Roads & Infrastructure", "Resolved", 23.8104, 90.4126),
                new SmartService.ReportData(UUID.randomUUID(), "Broken streetlight", "Light is out", "Electricity & Lighting", "Reported", 23.8104, 90.4126)
            ));

        assertEquals(1, candidates.size());
        assertEquals(matchId, candidates.get(0).id());
        assertTrue(candidates.get(0).similarity() > .7);
        assertTrue(candidates.get(0).reasons().contains("Same category"));
    }

    @Test
    void suggestsCategoryAndMatchingDepartmentWithoutAssigningIt() {
        SmartService.Suggestion category = smart.category("Overflowing garbage bins", "Trash and litter are blocking the sidewalk");
        assertEquals("Waste & Sanitation", category.category());

        UUID departmentId = UUID.randomUUID();
        SmartService.Suggestion department = smart.department(
            "Overflowing garbage bins", "Trash and litter are blocking the sidewalk", category.category(),
            List.of(new SmartService.DepartmentData(departmentId, "Waste Management")));
        assertEquals(departmentId, department.departmentId());
        assertEquals("Waste Management", department.departmentName());
    }
}
