# icra2027_bitter_slam

Website for the ICRA 2027 workshop **"Has the Bitter Lesson Finally Come for SLAM? Probabilistic State Estimation in the Era of Foundation Models"**.

Single static page (`index.html`), no build step. `.nojekyll` tells GitHub Pages to serve it as-is.

## Publish

Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
The site appears at `https://learnsyslab.github.io/icra2027_bitter_slam/`.

## Editing

- **Speakers / organizers:** each person is a `.person` block. For a photo, add a square image to `images/` and replace the `<div class="avatar">…</div>` with `<img class="avatar" src="images/name.jpg" alt="Full Name">`.
- **Pre-workshop poll:** the vote bars in the Debates section have the class `pending`. Remove it and set the two widths (e.g. `style="width:62%"`) once results are in.
- **Dates, submission platform:** marked TBA in the Call for Papers section.
