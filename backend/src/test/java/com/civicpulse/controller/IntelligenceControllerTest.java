package com.civicpulse.controller;

import com.civicpulse.service.NewsScannerService;
import com.civicpulse.service.SupabaseClientService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(IntelligenceController.class)
class IntelligenceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsScannerService newsScannerService;

    @MockBean
    private SupabaseClientService supabaseClientService;

    @Test
    void testClusterDuplicatesDetectsNearbyDuplicate() throws Exception {
        String mockReports = "[{\"title\":\"Deep Pothole on 5th Ave\",\"lat\":23.8103,\"lng\":90.4125}]";
        Mockito.when(supabaseClientService.getReports()).thenReturn(mockReports);

        String newReportJson = "{\"title\":\"Deep Pothole on 5th Ave\",\"lat\":23.8104,\"lng\":90.4126}";

        mockMvc.perform(post("/api/v1/intelligence/cluster-duplicates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(newReportJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.is_duplicate").value(true));
    }

    @Test
    void testClusterDuplicatesNoDuplicateForDistantReport() throws Exception {
        String mockReports = "[{\"title\":\"Water Leakage\",\"lat\":23.8103,\"lng\":90.4125}]";
        Mockito.when(supabaseClientService.getReports()).thenReturn(mockReports);

        String newReportJson = "{\"title\":\"Broken Streetlight\",\"lat\":24.8103,\"lng\":91.4125}";

        mockMvc.perform(post("/api/v1/intelligence/cluster-duplicates")
                .contentType(MediaType.APPLICATION_JSON)
                .content(newReportJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.is_duplicate").value(false));
    }
}
