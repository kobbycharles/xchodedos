// Forces a fresh reload when a page is restored from the browser's
// back/forward cache (bfcache). Browsers can restore a page's exact
// prior JS state — including data fetched before the user navigated
// away — without re-running any of the page's init()/fetch calls.
// This is the most common cause of "I did something, went back, and
// it still shows the old data until I manually refresh."
//
// Pages with in-progress forms that trigger their own backgrounding
// (e.g. opening the camera via <input type="file" capture>) should
// set `window.SKIP_BFCACHE_RELOAD = true` BEFORE this script loads,
// since returning from the camera also restores from bfcache and
// would otherwise wipe unsaved form data.
window.addEventListener('pageshow', function (event) {
  if (event.persisted && !window.SKIP_BFCACHE_RELOAD) {
    window.location.reload();
  }
});
