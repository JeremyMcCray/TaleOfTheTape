"use strict";

/* ============================ config ============================ */
export const CDN = "https://cdn.jsdelivr.net/gh/Greco1899/scrape_ufc_stats@main/";
export const SRC = {
  tott:    CDN + "ufc_fighter_tott.csv",
  results: CDN + "ufc_fight_results.csv",
  events:  CDN + "ufc_event_details.csv",
  roster:  "https://api.octagon-api.com/fighters",
  rankings:"https://api.octagon-api.com/rankings"
};

/* ---- UFC photo paths, harvested from ufc.com athlete pages ---- */
export const UFC_IMG = "https://ufc.com/images/styles/athlete_bio_full_body/s3/";
/* older fighters only exist under the headshot style — see the hand-added block below */
export const UFC_HEAD = "https://ufc.com/images/styles/event_results_athlete_headshot/s3/";
/* PHOTOS-BEGIN (regenerate to refresh) */
