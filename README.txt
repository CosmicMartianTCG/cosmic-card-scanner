COSMIC CARD SCANNER — V2 / IPHONE INSTALL BUILD
=========================================

COST: $0. No scan fees, paid APIs, Apple developer account, or subscription.
Your original neon CM logo is included as the iPhone Home Screen icon.

WHAT V2 ADDS
• Keep existing V1 batches/scans if V2 is hosted at the SAME website URL.
• Optional human-friendly batch labels with auto-created IDs (CM-YYYYMMDD-001).
• Edit an existing card record while preserving the ORIGINAL scan timestamp.
• Rename batches, export any batch, export all CSV, JSON backup and restore.
• A last-scan strip and return to the camera after card confirmation.
• Price source update date and visible warning when pricing is more than 14 days old.
• Correct interpretation of ISO or Unix timestamps from the card-pricing provider.
• Network-first app-shell updates; basic offline launch once installed.
• Free Tesseract on-device OCR and free TCGdex Pokémon catalog/prices.

WHAT IT DOESN'T DO YET
• Has not been tested on a real iPhone. Live camera use requires HTTPS and permission.
• Not guaranteed instant: OCR and internet lookup may take several seconds.
• No automatic foil, condition, or counterfeit grading. Always confirm correct version.
• No paid/licensed TCGplayer bulk download; limited to pricing shared by TCGdex.
• No live Dragon Ball lookup yet (catalog+pricing not verified as unrestricted free).
• No automatic cross-device sync. Scans live in your phone's browser data.
• Does not publish itself or create a working public URL.

PUBLISH FOR FREE
1. Unzip this package on your computer.
2. Sign into GitHub.com. Create PUBLIC repo 'cosmic-card-scanner'.
3. Upload the FILES INSIDE this folder (not the folder and not the ZIP).
4. Settings > Pages > Deploy from a branch > main > /(root) > Save.
5. Copy the HTTPS link displayed by GitHub Pages (publishing may take time).
6. In iPhone Safari open that link, Share > Add to Home Screen > Add.
7. Launch the new CM icon; approve camera access.

TO UPDATE FROM V1
Upload V2 files to the SAME repository and keep the same Pages URL. The app
uses the V1 localStorage key intentionally. Export a backup before updating.

TESTING STEPS ON IPHONE
1. Search Pikachu, choose a card, verify image, set and foil and Save.
2. Confirm the batch number and date/time in Batch History.
3. Tap Edit on the record, choose a different printing and Save. Its original
   timestamp should stay unchanged.
4. Create a New Batch with a label and scan another card.
5. Export CSV and a JSON backup; save these to Files or iCloud Drive.
6. Test camera capture and separately test Take or select photo.

DATA AND PRIVACY
This personal app uploads NO collection history to a server. Camera OCR runs
on-device after the free OCR library downloads. It sends recognized lookup
terms to TCGdex over HTTPS. Uploaded photos are not saved in the collection.
This is local browser storage; clearing website data can erase your history.

SOURCES
https://tcgdex.dev/
https://github.com/naptha/tesseract.js
https://docs.github.com/en/pages
