# Update log

A record of every automated update run, newest first. Written by the updater following
`UPDATE-PLAYBOOK.md`. Check "Needs owner attention" after each run.

---

<!-- Newest entries go directly below this line. -->

## 2026-10-07

**Market figures:** Updated to TRREB Q2 2026 (April to June). 10 of 12 neighbourhoods reported. Milliken Mills (reported as East and West) and Downtown Markham (not a TRREB community) stay null. New report at /market-reports/september-2026/, which carries the September Market Watch tables and the Q2 neighbourhood table, the same shape as the August report. No separate Q2 report was created.
**News:** Skipped. Fewer than 2 items dated September 7 to October 7, 2026 could be confirmed on an opened source page. Candidates opened and rejected: the Highway 404 crossing release (dated September 2, before the window), a Metrolinx Stouffville line service notice (dated October 2025), York Regional Council highlights for September 24 (nothing specific to Markham) and three City of Markham releases (an appointment, an event and the election candidate list).
**Fact check:** angus-glen, berczy-village, box-grove. No wording changed. Confirmed: Angus Glen Community Centre and Library and its library branch, Angus Glen Golf Club, Pierre Elliott Trudeau High School (YRDSB), Unionville GO, Markham GO and Mount Joy GO as Stouffville line stations.
**Monthly city figures:** Updated to TRREB Market Watch September 2026 for Markham, Richmond Hill, Vaughan and the City of Toronto. Every average was cross-checked against dollar volume divided by sales.

Sources:
- TRREB Market Watch, September 2026: https://trreb.ca/wp-content/files/market-stats/market-watch/mw2609.pdf
- TRREB Community Housing Market Report, Markham, Q2 2026: https://trreb.ca/wp-content/files/market-stats/community-reports/2026/Q2/MarkhamQ22026.pdf
- TRREB Community Housing Market Report, Markham, Q1 2026: https://trreb.ca/wp-content/files/market-stats/community-reports/2026/Q1/MarkhamQ12026.pdf
- GO Transit Stouffville line timetable, Table 71: https://assets.metrolinx.com/image/upload/v1787962004/Documents/GO/full-schedules/FS05092025/Table71.pdf
- City of Markham, Angus Glen Community Centre and Library: https://www.markham.ca/sports-recreation-fitness/community-centres-libraries/angus-glen-community-centre-library
- Markham Public Library, Angus Glen Branch: https://markhampubliclibrary.ca/locations/ag/
- Angus Glen Golf Club: https://www.angusglen.com
- YRDSB school profile, Pierre Elliott Trudeau High School: https://www2.yrdsb.ca/school-profiles/pierre-elliott-trudeau-hs

Needs owner attention:
- The neighbourhood ticker and the house prices page now show Q2 2026 medians, but the neighbourhood pages still quote January to March 2026 figures in `quickStats.priceRange`, `priceBands`, the FAQ and the body. They are labelled with their period so they are not wrong, only older. The playbook does not let this routine change them. For example Angus Glen is described as the highest median on the site for Q1. In Q2 Markham Village ($1,260,000) and Cathedraltown ($1,230,000) were higher than Angus Glen ($1,210,000).
- The sentence saying Unionville's median is pulled down by condo apartment sales was removed from the note in `src/data/market.json` and left out of the September report, because the Q2 report shows sales by type only as a chart that could not be read with certainty.
- Not re-verified this run and left unchanged: the GO commute minutes on the three pages (the timetable PDF could not be read column by column), the YRT route statements and school catchments. yorkregion.com could not be opened and YRT and YRDSB news pages returned errors, which is part of why there is no news roundup.
- An uncommitted file, `src/content/blog/real-estate-commission-ontario.mdx`, appeared in the working tree during this run. It was not created by this routine and was left untouched and uncommitted.

