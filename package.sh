#!/bin/bash

# QuizVision AI Chrome Extension Packaging Script

echo "📦 Packaging QuizVision AI for Chrome Web Store submission..."

# Create package directory
mkdir -p chrome-package

# Copy extension files (excluding development files)
cp manifest.json chrome-package/
cp *.html chrome-package/
cp *.js chrome-package/
cp *.css chrome-package/
cp -r icons chrome-package/

# Create ZIP file for Chrome Web Store
cd chrome-package
zip -r ../QuizVision-AI-v3.0.0.zip .
cd ..

# Clean up
rm -rf chrome-package

echo "✅ Package created: QuizVision-AI-v3.0.0.zip"
echo "📋 Ready for Chrome Web Store upload!"
echo ""
echo "Next steps:"
echo "1. Go to Chrome Web Store Developer Console"
echo "2. Upload QuizVision-AI-v3.0.0.zip"
echo "3. Fill out store listing using SUBMISSION_GUIDE.md"
echo "4. Take screenshots as specified in the guide"
echo "5. Submit for review"
