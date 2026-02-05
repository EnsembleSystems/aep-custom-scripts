This query shows which links and calls-to-action were clicked most often in the last 30 days by identified users, grouped by user email, partner level, destination URL, and CTA, and ranked by total click volume.

```sql
SELECT
_adobepartners.partnerData.email AS email,
_adobepartners.partnerData.level AS level,
web.webInteraction.URL AS url,
web.webInteraction.name AS cta,
COUNT(*) AS click_count
FROM public.partnerportal_web_interaction_dataset
WHERE eventType = 'web.webinteraction.linkClicks'
AND _adobepartners.partnerData.email IS NOT NULL
AND "timestamp" >= date_add(DAY, -30, current_timestamp)
GROUP BY
_adobepartners.partnerData.email,
_adobepartners.partnerData.level,
web.webInteraction.URL,
web.webInteraction.name
ORDER BY click_count DESC
LIMIT 50000;
```
