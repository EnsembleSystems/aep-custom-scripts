This query reports on file downloads over the last 30 days by counting “Download” link clicks from identified users, grouped by user, partner level, and download URL, and ranked by total download activity.

```sql
SELECT
_adobepartners.partnerData.email AS email,
_adobepartners.partnerData.level AS level,
web.webInteraction.URL AS url,
web.webInteraction.name AS cta,
COUNT(*) AS download_count
FROM public.partnerportal_web_interaction_dataset
WHERE eventType = 'web.webinteraction.linkClicks'
AND _adobepartners.partnerData.email IS NOT NULL
AND web.webInteraction.name = 'Download'
AND "timestamp" >= date_add(DAY, -30, current_timestamp)
GROUP BY
_adobepartners.partnerData.email,
_adobepartners.partnerData.level,
web.webInteraction.URL,
web.webInteraction.name
ORDER BY download_count DESC
LIMIT 50000;
```
