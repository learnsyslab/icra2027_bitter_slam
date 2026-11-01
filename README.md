# icra2027_bitter_slam

Website for the ICRA 2027 workshop **"Has the Bitter Lesson Finally Come for SLAM? Probabilistic State Estimation in the Era of Foundation Models"**.

Static site, no build step. `.nojekyll` tells GitHub Pages to serve it as-is.

- `index.html`: main page (hero animation, motions, program, speakers, organizers)
- `cfp.html`: call for papers
- `junior.html`: junior voices call and submission form
- `assets/site.css`, `assets/site.js`: styles and nav/scroll behavior shared by all pages; `assets/junior.js`: the submission form

The nav bar and footer are repeated in each page, so change them in all three.

## Publish

Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
The site appears at `https://learnsyslab.github.io/icra2027_bitter_slam/`.

## Editing

- **Speakers / organizers:** each person is a `.person` block. For a photo, add a square image to `resources/avatars/` and replace the `<div class="avatar">…</div>` with `<img class="avatar" src="resources/avatars/name.jpg" alt="Full Name">`.
- **Pre-workshop poll:** the vote bars in the Debates section have the class `pending`. Remove it and set the two widths (e.g. `style="width:62%"`) once results are in.
- **Dates, submission platform:** marked TBA in `cfp.html`.
- **Junior voices:** the form stays disabled while `JV_ENDPOINT` in `assets/junior.js` is empty. Set it to the Google Apps Script web app URL to open submissions; the script and setup steps are in `tools/junior_voices.gs`, and each submission becomes a row in a Google Sheet. Add selected statements, only with the author's consent, as cards in the *Selected voices* block.
