# Update log

A record of every automated update run, newest first. Written by the updater following
`UPDATE-PLAYBOOK.md`. Check "Needs owner attention" after each run.

---

<!-- Newest entries go directly below this line. -->

## 2026-10-08

**Market figures:** No change. TRREB has not published a Markham community report newer than Q2 2026. The Q3 2026 address returned a 404.
**News:** Skipped. Fewer than 2 items dated September 8 to October 8, 2026 qualified. Opened and rejected: City of Markham releases (voter information letters, a staff appointment, a festival and the Highway 404 crossing release dated September 2), York Region newsroom items for September 24 to October 6 (nothing specific to Markham housing or services), Metrolinx news (Rail Safety Week and Woodbine GO construction), YRT news (Thanksgiving holiday service and a customer survey), YRDSB and YCDSB news (no Markham school openings or boundary reviews). The YRT fall service changes took effect September 6, before the window.
**Fact check:** cathedraltown, cornell, downtown. No wording changed. Confirmed: YRT routes on Major Mackenzie Drive, Cornell Community Centre and Library at 3201 Bur Oak Avenue, Markham Stouffville Hospital as part of Oak Valley Health, York University Markham Campus.
**Monthly city figures:** No change. September 2026 is still the newest Market Watch on trreb.ca. The October 2026 address returned a 404.

Sources:
- TRREB Market Watch page: https://trreb.ca/index.php/market-news/market-watch
- City of Markham news: https://www.markham.ca/news
- York Region Transit, service schedules: https://www.yrt.ca/en/schedules-and-maps/service-schedules.aspx
- York Region Transit, service changes and updates: https://www.yrt.ca/en/schedules-and-maps/service-changes-and-updates.aspx
- City of Markham, community centres and libraries: https://www.markham.ca/sports-recreation-fitness/community-centres-libraries
- City of Markham, Cornell Community Centre and Library: https://www.markham.ca/sports-recreation-fitness/community-centres-libraries/cornell-community-centre-library
- Oak Valley Health, our hospitals: https://www.oakvalleyhealth.ca/our-hospitals/
- York University, Markham Campus: https://www.yorku.ca/markham/
- York University, Markham Campus contact: https://www.yorku.ca/markham/contact/

Needs owner attention:
- Not re-verified this run and left unchanged on the three pages: the TRREB price and sales figures (Q1 2026 and August 2026) and the GO commute minutes. The TRREB and GO Transit PDFs downloaded but this Mac has no tool that can read PDF text (poppler is not installed), so the figures could not be checked line by line. Their existing source links were kept on the pages. Installing poppler (`brew install poppler`) would let future runs read these PDFs.
- Also not verified because no source page would open: the Cathedral of the Transfiguration, the Cornell Bus Terminal, Viva service on Highway 7, the school statements on all three pages and the cinema, restaurants and squares in Downtown Markham. The wording was left as it is.
- The Cornell page says four times that the hospital sits on the neighbourhood's edge. Oak Valley Health lists Markham Stouffville Hospital at 381 Church Street. No source states its position relative to Cornell, so the wording was left alone.
- Still open from October 7: the neighbourhood pages quote January to March 2026 figures while the ticker shows Q2 2026 medians.
- No news roundup has ever been published. yorkregion.com and CBC Toronto block automated reading and the Ontario newsroom and gotransit.com service updates load their content with scripts, which leaves few readable sources.

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

