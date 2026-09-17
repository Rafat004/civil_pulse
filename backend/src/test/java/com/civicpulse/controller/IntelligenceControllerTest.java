package com.civicpulse.controller;

import com.civicpulse.service.IntelligenceDataSource;
import com.civicpulse.service.SmartService;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SmartController.class)
class IntelligenceControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private SmartService smartService;
    @MockBean private IntelligenceDataSource intelligenceDataSource;

    @Test
    void clusterDuplicatesReturnsStructuredCandidates() throws Exception {
        UUID id = UUID.randomUUID();
        when(intelligenceDataSource.reports()).thenReturn(List.of());
        when(smartService.duplicates(anyString(), anyString(), anyString(), anyDouble(), anyDouble(), anyList()))
            .thenReturn(List.of(new SmartService.Candidate(id, "Broken streetlight", "Electricity & Lighting", "Reported", 42, .87, List.of("Similar title", "Nearby location"))));

        mockMvc.perform(post("/api/v1/intelligence/cluster-duplicates")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Broken streetlight\",\"description\":\"Light is out\",\"category\":\"Electricity & Lighting\",\"lat\":23.8103,\"lng\":90.4125}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.candidates[0].id").value(id.toString()))
            .andExpect(jsonPath("$.candidates[0].similarity").value(.87));
    }

    @Test
    void clusterDuplicatesRejectsUnknownCategory() throws Exception {
        mockMvc.perform(post("/api/v1/intelligence/cluster-duplicates")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Broken streetlight\",\"description\":\"Light is out\",\"category\":\"Unknown\",\"lat\":23.8103,\"lng\":90.4125}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").exists());
    }
}
