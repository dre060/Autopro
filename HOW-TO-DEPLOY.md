# Auto Pro site refresh: deploy as a PREVIEW (not live)

Pushing to any branch other than `main` makes Vercel build a Preview
deployment with its own private URL. The live site does not change.

## 1. Push to a preview branch
From your local Autopro repo:

    git checkout main
    git pull
    git checkout -b site-refresh

Then EITHER copy this zip's `frontend` folder over your repo's `frontend` folder,
OR apply the patch:  git am < autopro-refresh.patch

    git add -A
    git commit -m "Site refresh + 2022 Tacoma listing"    (skip if you used git am)
    git push -u origin site-refresh

Vercel posts a Preview URL (Vercel dashboard > autopro > Deployments, or the
GitHub commit's status check). Open it in a private/incognito window to see
the intro animation.

## 2. When you approve, make it live
    git checkout main
    git merge site-refresh
    git push origin main

Vercel then builds and deploys to production on autoprorepairs.com.

## Managing the Tacoma listing
- Listing lives in frontend/src/data/localInventory.js.
- Mark sold: change status: "available" to status: "sold" and push.
- If you later add it in /admin/vehicles, use stock number AP-TAC22 so it
  won't show twice. Set its title status there too.
