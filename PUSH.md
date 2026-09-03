# Push to GitHub, then Vercel

This folder is already a git repo with one commit and the remote set to
`https://github.com/shailjaatkotiya/banana-leaf-pendant.git`.

## 1. Create the empty repo
https://github.com/new — name `banana-leaf-pendant`, **no** README,
**no** .gitignore, **no** licence. (Private is fine; Vercel can read it.)

## 2. Push
```bash
cd banana-leaf-pendant     # this folder
git push -u origin main
```
If the remote URL is wrong for you:
```bash
git remote set-url origin https://github.com/<you>/banana-leaf-pendant.git
```

## 3. Import on Vercel
https://vercel.com/new → pick the repo → Framework preset **Other**,
no build command, no output directory → Deploy.
Every later `git push` redeploys automatically.

## Or skip GitHub entirely
Drag this folder onto https://vercel.com/new. Same result, no repo.
