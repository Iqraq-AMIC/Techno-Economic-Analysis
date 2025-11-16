# Troubleshooting Guide - Modal Not Showing

## Issue: Modal doesn't appear after login

### Most Likely Causes:

1. **Frontend not rebuilt** - React needs to recompile after code changes
2. **Browser cache** - Old JavaScript files cached
3. **Import error** - Component not loading properly
4. **Console error** - JavaScript error preventing modal from rendering

---

## Step-by-Step Debugging

### Step 1: Check Browser Console for Errors

1. Open the frontend in browser (http://localhost:3000)
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for red error messages

**Common errors to look for:**
```
❌ Module not found: Can't resolve '../components/project/ProjectStartupModal'
❌ Cannot read property 'user_id' of undefined
❌ Uncaught TypeError: Cannot read properties of null
```

**If you see any errors, copy them and share them with me.**

---

### Step 2: Verify Frontend Restart

Sometimes React doesn't pick up new files. **Restart the frontend completely:**

```bash
# Stop the frontend (Ctrl+C in the terminal)
# Then restart:
cd safapac-clean/frontend
npm start
```

Wait for: `Compiled successfully!`

---

### Step 3: Clear Browser Cache

1. Open DevTools (F12)
2. Right-click the **Refresh button** in browser
3. Select **"Empty Cache and Hard Reload"**

OR

1. Press **Ctrl+Shift+Delete**
2. Select "Cached images and files"
3. Click "Clear data"

---

### Step 4: Test Login Flow with Console Open

1. Open Console (F12)
2. Go to http://localhost:3000/login
3. Open `backend/pw.csv` and pick a test credential (value from the "Suggested Password" column). For development you can enter that value in both username and password fields.
4. Click "Sign In"
5. **Watch the console** - do you see any logs or errors?

**Add a test log to verify the code is running:**

Open `Login.js` and find this line (around line 56):
```javascript
if (result.success) {
  // Show project selection modal instead of redirecting directly
  setShowProjectModal(true);
```

Change it to:
```javascript
if (result.success) {
  console.log("LOGIN SUCCESS - About to show modal", result);
  console.log("User data:", result.user);
  setShowProjectModal(true);
  console.log("Modal state set to true");
```

Save, wait for recompile, then try logging in again and check the console.

---

### Step 5: Check if ProjectContext is Working

Open the Console and type:
```javascript
localStorage.getItem('safapac-user')
```

**Expected:** After at least one successful login, this should show something like:
```json
{"user_id":"user_2f421cb2","username":"<your-username>","email":"<your-email>"}
```

**If it shows `null`**, the login isn't working properly.

---

### Step 6: Verify Modal Rendering

Temporarily force the modal to show. In `Login.js`, change:
```javascript
const [showProjectModal, setShowProjectModal] = useState(false);
```

To:
```javascript
const [showProjectModal, setShowProjectModal] = useState(true);
```

**Refresh the page.**

- **If the modal shows:** The issue is with the login flow, not the modal component
- **If the modal still doesn't show:** There's an error in the modal component itself

---

### Step 7: Check Network Requests

1. Open DevTools → **Network** tab
2. Click "Sign In"
3. Look for any failed requests (red)

The modal doesn't make API calls immediately, but check if:
- There are any 404 errors for JavaScript files
- Any CORS errors

---

## Quick Fixes

### Fix 1: Rebuild Frontend from Scratch

```bash
# Stop frontend (Ctrl+C)
cd safapac-clean/frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Fix 2: Check for TypeScript Errors

If you see a blank screen, check the terminal running `npm start` for compilation errors:

```
Failed to compile.

./src/components/project/ProjectStartupModal.js
  Line 5:  'useProject' is not defined  no-undef
```

### Fix 3: Verify All Imports

Check that `ProjectContext.js` exists:
```bash
cat safapac-clean/frontend/src/contexts/ProjectContext.js | head -5
```

Expected output:
```javascript
/**
 * ProjectContext - Manages current project and scenario state
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
```

---

## Manual Testing of Components

### Test 1: Can you import ProjectStartupModal?

Create a test file:
```bash
# In safapac-clean/frontend/src/
cat > test-modal.js << 'EOF'
import ProjectStartupModal from './components/project/ProjectStartupModal';
console.log('Modal imported successfully:', ProjectStartupModal);
EOF
```

Then import it in `App.js` temporarily:
```javascript
import './test-modal';
```

Check the console for errors.

---

## Still Not Working? Provide These Details:

1. **What do you see after clicking "Sign In"?**
   - [ ] Stays on login page
   - [ ] Redirects to /TEA (dashboard) without modal
   - [ ] Blank screen
   - [ ] Error message

2. **Browser console errors** (copy/paste the red errors)

3. **Terminal output from `npm start`** (any warnings or errors?)

4. **Backend terminal output** when you log in (does it show any API calls?)

5. **localStorage check:**
   ```javascript
   // Paste this in browser console after login:
   console.log('Auth:', localStorage.getItem('safapac-authenticated'));
   console.log('User:', localStorage.getItem('safapac-user'));
   console.log('Project:', localStorage.getItem('safapac-current-project'));
   console.log('Scenario:', localStorage.getItem('safapac-current-scenario'));
   ```

---

## Expected Working Flow

**What SHOULD happen:**

1. You enter credentials → Click "Sign In"
2. Console shows: `"LOGIN SUCCESS - About to show modal"`
3. Console shows: `"Modal state set to true"`
4. **Modal appears** with:
   - Title: "Welcome to SAFAPAC TEA"
   - "Create New Project" button (teal)
   - "Load Existing Project" button (grayed out with "No projects yet")
5. You click "Create New Project"
6. **Second modal appears** asking for project name
7. You enter name → Click "Create Project"
8. Modal closes → Redirects to /TEA dashboard

---

## If Modal Component Has Errors

Check for syntax errors in:
1. `ProjectStartupModal.js`
2. `NewProjectPrompt.js`
3. `ProjectContext.js`

Common issues:
- Missing import statements
- Typo in hook names (`useProject` vs `useProjects`)
- Missing closing braces
- Incorrect file paths

---

## Contact Points

After trying these steps, share with me:
1. Browser console output (screenshot or copy/paste)
2. Terminal output from frontend
3. What you see on screen after login
4. localStorage values (from Step 5 in "Still Not Working?")

I'll help you debug from there!
