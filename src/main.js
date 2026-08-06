/* Entry point. Loads the data, then wires the UI.
   Everything else in src/ is imported from here (directly or transitively) —
   index.html carries no logic. */
import "./analytics.js";
import { boot } from "./data/load.js";
import { initUI } from "./app/init.js";
import "./features/division-badge.js";   /* side-effect: delegated click handler */

boot().then(ok => { if (ok) initUI(); });
