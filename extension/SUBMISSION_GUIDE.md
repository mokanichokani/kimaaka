# Chrome Web Store Submission Guide

## Pre-Submission Checklist

### ✅ Files Ready
- [x] manifest.json updated with "QuizVision AI" name
- [x] Icons present (16, 32, 48, 128px)
- [x] Privacy policy created
- [x] Store listing information prepared

### 📝 Required Information

## 1. Basic Details
**Item Title:** QuizVision AI
**Summary:** AI-powered quiz solver with visual color-coded answer indicators for students.
**Category:** Education
**Language:** English

## 2. Detailed Description (Copy this exactly)
```
QuizVision AI is an innovative educational tool designed to assist students with multiple choice questions through advanced AI analysis. The extension captures screenshots of quiz content and uses Google's Gemini AI to identify correct answers, displaying them as intuitive color-coded visual indicators.

Key Features:
🎯 Smart Analysis: Advanced AI processing of quiz screenshots
🌈 Color-Coded Answers: Visual indicators (Red=A, Green=B, Blue=C, Orange=D, Pink=E)
⚡ Instant Results: Fast processing with keyboard shortcut (Cmd+Shift+Y)
🔄 Reliable Performance: Multiple server failover system for consistent availability
🎨 Non-Intrusive: Clean visual overlay that doesn't disrupt the original content
📚 Educational Focus: Designed specifically for learning and practice

Perfect for students using online learning platforms, practice tests, and educational websites. Simply press the keyboard shortcut or click the extension icon to analyze any multiple choice question on your screen.
```

## 3. Privacy Practices Justifications

### Single Purpose Description:
```
This extension serves the single purpose of helping students solve multiple choice questions by providing AI-powered visual answer indicators through screenshot analysis.
```

### activeTab Permission:
```
Required to capture screenshots of the current tab containing quiz questions. The extension only accesses the active tab when explicitly triggered by the user through keyboard shortcut or popup interaction. No background monitoring or automatic access occurs.
```

### Host Permissions:
```
Necessary to function on educational websites and learning platforms where students encounter quiz questions. The extension only activates when users explicitly request analysis and does not collect or store website data.
```

### Scripting Permission:
```
Used to inject visual answer indicators (colored boxes) onto the webpage after AI analysis. Scripts are only injected upon user command and are removed after displaying results. No persistent scripts or background execution.
```

### Storage Permission:
```
Stores user's Google Gemini API key locally for seamless operation. No personal data, quiz content, or browsing history is stored. Storage is limited to essential configuration data.
```

### Remote Code Justification:
```
Communicates with Google's Gemini AI API and backup server infrastructure to process quiz images. No code is downloaded or executed from remote sources. All communication is for AI analysis purposes only.
```

## 4. Screenshots Needed (Take these)

1. **Extension Popup** - Clean interface showing the analyze button
2. **Before Analysis** - A webpage with multiple choice questions visible  
3. **After Analysis** - Same page with color-coded answer boxes overlaid
4. **Settings Page** - Options page showing API key configuration
5. **Keyboard Shortcut Demo** - Visual showing Cmd+Shift+Y in action

## 5. Privacy Policy URL
Upload the `privacy_policy.md` file to your website or GitHub and provide the URL, or paste the content directly.

## 6. Data Usage Certification
Check these boxes in the Chrome Web Store:
- [x] This item does not collect or transmit personal or sensitive user data
- [x] This item only requests permissions necessary for functionality
- [x] This item complies with Chrome Web Store policies

## 7. Upload Process

1. **Create ZIP file** containing:
   - manifest.json
   - All HTML files (popup.html, options.html, etc.)
   - All JS files (popup.js, content.js, background.js, etc.)
   - CSS files
   - Icons folder with all icon sizes
   - README.md (optional)

2. **Upload to Chrome Web Store Developer Dashboard**

3. **Fill out all required fields** using the content above

4. **Submit for review**

## Common Rejection Reasons to Avoid

❌ **Don't do this:**
- Leave any required fields empty
- Use vague permission justifications
- Upload without proper icons
- Forget to select category/language
- Skip privacy practices tab

✅ **Do this:**
- Use specific, detailed justifications
- Complete every required field
- Test extension thoroughly before upload
- Provide clear screenshots
- Certify data usage compliance

## Post-Submission

- Review typically takes 1-7 days
- Check email for Google's response
- Address any review feedback promptly
- Once approved, extension will be live on Chrome Web Store

## Support Links

- [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Policies](https://developer.chrome.com/docs/webstore/program-policies/)
