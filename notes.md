```bash
git remote add origin https://github.com/rugbyprof/IoT-inventory-system.git
git branch -M main
git push -u origin main

git remote add github git@github.com:rugbyprof/IoT-inventory-system.git
git remote add server ssh://root@profgriffin.com/root/IoT-inventory-system.git

git remote set-url server ssh://root@profgriffin.com:/root/IoT-inventory-system.git
```

Great question 🔍 When a **remote refuses a push**, Git is basically telling you:

> "I can't apply your changes because something on the server side conflicts, or it's not set up to receive pushes."

Here are **common reasons** and how to fix each:

---

### 🚫 1. **Remote Branch Is Out of Sync / Non-Fast-Forward**

You'll see an error like:

```
! [rejected]        main -> main (non-fast-forward)
```

🔧 **Fix**: You need to pull and rebase (or force push if appropriate):

```bash
git pull --rebase server main
# then retry
git push server main
```

❗ Or, if you're sure your version is the one to keep (⚠️ destructive):

```bash
git push --force server main
```

---

### 🔒 2. **Remote Repo is Not Bare**

You'll see something like:

```
refusing to update checked out branch: refs/heads/main
```

This means you're pushing to a **non-bare repo**, i.e. one that's being used directly as a working directory.

✅ **Fix**: On the server, use a **bare repository**:

```bash
git init --bare /home/youruser/lab-inventory.git
```

Then in your project:

```bash
git remote set-url server ssh://user@profgriffin.com:/home/youruser/lab-inventory.git
```

---

### ❌ 3. **Wrong Permissions or SSH Key Issues**

You might see:

```
Permission denied (publickey).
fatal: Could not read from remote repository.
```

🔧 **Fix**:

- Ensure your **public SSH key is in `~/.ssh/authorized_keys`** on the server
- Test manually:
  ```bash
  ssh user@profgriffin.com
  ```
- If using a custom SSH key, tell Git:
  ```bash
  GIT_SSH_COMMAND="ssh -i ~/.ssh/custom_key" git push server main
  ```

---

### 🧼 4. **Read-Only Repository or No `receive.denyCurrentBranch` Config**

This usually happens when you're pushing to a checked-out non-bare repo. Git won't let you overwrite a checked-out branch by default.

✅ Fix (if you're testing on a non-bare repo anyway):

```bash
git config receive.denyCurrentBranch updateInstead
```

⚠️ This lets the working directory auto-update with push.

---

Need help inspecting or fixing the remote on `profgriffin.com`? I can help guide that too 🔧
