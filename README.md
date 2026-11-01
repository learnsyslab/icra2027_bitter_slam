# icra2027_bitter_slam

Website for the ICRA 2027 workshop **"Has the Bitter Lesson Finally Come for SLAM? Probabilistic State Estimation in the Era of Foundation Models"**.

Static site, no build step. `.nojekyll` tells GitHub Pages to serve it as-is.

- `index.html`: main page (hero animation, motions, program, speakers, organizers)
- `cfp.html`: call for papers
- `junior.html`: junior voices call and submission form
- `assets/site.css`, `assets/site.js`: styles, nav/scroll behavior and the backend URL (`ENDPOINT`) shared by all pages; `assets/poll.js`: the pre-workshop poll; `assets/junior.js`: the junior voices form
- `tools/backend.gs`: Google Apps Script behind the poll and the junior voices form (setup steps at the top)

The nav bar and footer are repeated in each page, so change them in all three.

## Publish

Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
The site appears at `https://learnsyslab.github.io/icra2027_bitter_slam/`.

## Editing

- **Speakers / organizers:** each person is a `.person` block. For a photo, add a square image to `resources/avatars/` and replace the `<div class="avatar">…</div>` with `<img class="avatar" src="resources/avatars/name.jpg" alt="Full Name">`.
- **Pre-workshop poll:** the vote bars in the Debates section load live tallies from the backend; the split appears once a motion has 20 votes (`MIN_SHOWN` in `assets/poll.js`). Votes and optional arguments land in the sheet *Poll*; delete spam rows there. Close the poll with `POLL_OPEN = false` in `tools/backend.gs`.
- **Dates, submission platform:** marked TBA in `cfp.html`.
- **Junior voices:** each submission becomes a row in the sheet *Submissions*. The form stays disabled while `ENDPOINT` in `assets/site.js` is empty. Add selected statements, only with the author's consent, as cards in the *Selected voices* block.
