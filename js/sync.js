// Forces a fresh reload when a page is restored from the browser's
// back/forward cache (bfcache). Browsers can restore a page's exact
// prior JS state — including data fetched before the user navigated
// away — without re-running any of the page's init()/fetch calls.
// This is the most common cause of "I did something, went back, and
// it still shows the old data until I manually refresh."
window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});
