package com.civicpulse.service;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class NewsScannerService {

    /**
     * Scans a mock news site URL to extract potential civic issues.
     */
    public List<Map<String, String>> scanLocalNews(String url) {
        List<Map<String, String>> issues = new ArrayList<>();
        try {
            // Using a public RSS feed (e.g. BBC World) as a reliable data source for demonstration
            String targetUrl = "http://feeds.bbci.co.uk/news/world/rss.xml";
            Document doc = Jsoup.connect(targetUrl).get();
            Elements articles = doc.select("item");

            // Limit to top 5 news items
            int count = 0;
            for (Element article : articles) {
                if (count >= 5) break;
                Map<String, String> issueData = new HashMap<>();
                issueData.put("headline", article.select("title").text());
                
                // Clean up the description to avoid raw HTML in output
                String rawDesc = article.select("description").text();
                String cleanDesc = Jsoup.parse(rawDesc).text();
                
                issueData.put("summary", cleanDesc);
                issues.add(issueData);
                count++;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return issues;
    }
}
