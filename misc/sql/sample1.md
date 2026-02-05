This query shows the most viewed pages across the site by counting page views for each unique URL over the last 30 days and ranking them from highest to lowest.

```sql
SELECT
web.webPageDetails.URL AS url,
COUNT(*) AS page_view_count
FROM partnerportal_web_interaction_dataset
WHERE eventType = 'web.webpagedetails.pageViews'
AND web.webPageDetails.URL IS NOT NULL
AND "timestamp" >= date_add(DAY, -30, current_timestamp)
GROUP BY web.webPageDetails.URL
ORDER BY page_view_count DESC
LIMIT 50000;
```
