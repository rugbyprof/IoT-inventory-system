# Git Hook Ideas

## 🗜️ 1. Generate a ZIP Archive of the Code

You can create a full ZIP of your project locally with this command in the repo root:

```bash
zip -r lab-inventory.zip . -x "*.git/*" -x ".env"
```

This includes **all files**, excludes environment secrets and Git internals. You'll get a `lab-inventory.zip` ready to upload.

---

## 🔁 2. Set Up Push Hooks for Multiple Remotes

You want to push:

- To **GitHub**
- To **your server** (profgriffin.com via SSH)

### A. Add Git Remotes

```bash
git remote add github git@github.com:your-username/lab-inventory-system.git
git remote add server ssh://user@profgriffin.com/path/to/repo.git
```

✅ Replace `user` and `path/to/repo.git` with your SSH user and repo path on profgriffin.com.

---

### B. Create a Git Hook for Direct Server Push

Add this client-side hook: `.git/hooks/post-push` (make it executable):

```bash
#!/bin/bash
# Run this hook only if pushing to a specific branch, e.g. main
branch="$(git rev-parse --abbrev-ref HEAD)"

if [ "$branch" = "main" ]; then
  echo "📡 Pushing to profgriffin.com..."
  git push server main
fi
```

Then:

```bash
chmod +x .git/hooks/post-push
```

**How it works:**

- You run `git push github main`
- After Git is done, `post-push` triggers automatically and pushes to your server.

---

### C. Optional: One-Shot Script

Instead of using a hook, you can run both pushes with one custom script:

Create `scripts/deploy.sh`:

```bash
#!/bin/bash
git push github main
git push server main
```

Then:

```bash
chmod +x scripts/deploy.sh
```

Now simply run:

```bash
./scripts/deploy.sh
```

…and you’ll deploy to both.

---

## ✅ Summary

- Use `zip` command to bundle all code into a `.zip` file.
- Configure `github` and `server` as Git remotes.
- Optionally add a `post-push` hook to auto-deploy to `profgriffin.com` after every GitHub push.
- Or use the simple `deploy.sh` script for two-line deploys.

Let me know if you’d like help scaffolding the ZIP or customizing the hook for branch/tag deployment!
