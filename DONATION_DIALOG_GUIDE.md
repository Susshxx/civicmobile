# Donation Dialog Feature

## Overview
A donation dialog appears when the app starts, encouraging users to support the Prime Minister Disaster Relief Fund by scanning or downloading a fonepay QR code.

## Features

### 1. **Auto-Display on Launch**
- Dialog appears automatically when the app loads
- Prevents users from interacting with the app until acknowledged
- Non-dismissible by clicking outside the dialog

### 2. **QR Code Download**
- Click on the QR code image to download it
- Web: Downloads as PNG file automatically
- Mobile: Prompts user to take a screenshot

### 3. **Close Button**
- X button in top-right corner
- Only way to dismiss the dialog
- Ensures users see the donation request

## UI Design

```
╔═══════════════════════════════════════╗
║                                    × ║
║     Donate for the needy             ║
║                                      ║
║  Support the relief fund by scanning ║
║  or downloading this QR code.        ║
║                                      ║
║  ┌─────────────────────────────┐    ║
║  │                             │    ║
║  │    [fonepay QR Code]        │    ║
║  │      (Clickable)            │    ║
║  │                             │    ║
║  └─────────────────────────────┘    ║
║                                      ║
║  PRIME MINISTER DISASTER RELIEF FUND ║
║  Terminal: 2222040021637186          ║
║  Branch: Teendhara                   ║
║                                      ║
║  Click on the QR image to download   ║
╚═══════════════════════════════════════╝
```

## Component Structure

```javascript
<Modal visible={donationDialogVisible} transparent>
  <View style={donationOverlay}>
    <View style={donationDialog}>
      <Pressable onPress={close}>
        <Text>×</Text>
      </Pressable>
      
      <Text>Donate for the needy</Text>
      <Text>Support the relief fund...</Text>
      
      <Pressable onPress={downloadQRCode}>
        <Image source={qrRelieffund.png} />
      </Pressable>
      
      <View>
        <Text>PRIME MINISTER DISASTER RELIEF FUND</Text>
        <Text>Terminal: 2222040021637186</Text>
        <Text>Branch: Teendhara</Text>
        <Text>Click on the QR image to download</Text>
      </View>
    </View>
  </View>
</Modal>
```

## State Management

```javascript
const [donationDialogVisible, setDonationDialogVisible] = useState(true);
```

- **Initial state:** `true` (shows on app launch)
- **Close action:** `setDonationDialogVisible(false)`
- **Persistence:** Dialog shows every time app is opened

## Download Functionality

### Web Platform
```javascript
// Creates a download link and triggers it
const link = document.createElement('a');
link.href = require('./assets/qrRelieffund.png');
link.download = 'disaster-relief-fund-qr.png';
link.click();
```

### Mobile Platform
```javascript
// Prompts user to take a screenshot
Alert.alert(
  'Download QR Code',
  'To save this QR code, please take a screenshot of this dialog.'
);
```

## Styling Details

### Colors
- **Overlay:** Dark semi-transparent (#071b36 at 85%)
- **Dialog:** White background (#ffffff)
- **Title:** Dark blue (#0c4a6e)
- **Text:** Slate gray (#64748b)
- **Border:** Light slate (#e2e8f0)
- **Hint text:** Lighter gray (#94a3b8)

### Dimensions
- **Dialog width:** 100% with max 380px
- **QR code:** 220x220px
- **Border radius:** 16px (dialog), 12px (QR wrapper)
- **Padding:** 24px (dialog), 16px (QR wrapper)

### Typography
- **Title:** 22px, bold (800)
- **Subtitle:** 13px, regular
- **Fund name:** 11px, bold (800), uppercase
- **Account info:** 11px, regular
- **Hint:** 10px, italic

## User Interactions

### Flow 1: Close Dialog
```
User opens app
      ↓
Donation dialog appears
      ↓
User clicks X button
      ↓
Dialog closes
      ↓
User can use the app
```

### Flow 2: Download QR Code
```
User opens app
      ↓
Donation dialog appears
      ↓
User clicks QR code image
      ↓
Web: File downloads automatically
Mobile: Screenshot prompt appears
      ↓
User clicks X to close dialog
      ↓
User can use the app
```

### Flow 3: Scan QR Code
```
User opens app
      ↓
Donation dialog appears
      ↓
User opens fonepay app
      ↓
User scans QR code from screen
      ↓
User completes donation
      ↓
User returns and clicks X to close dialog
```

## Accessibility

- **Modal overlay:** Prevents interaction with background
- **Close button:** Large touch target (32x32px)
- **Clear labeling:** Descriptive text for all elements
- **Alt text:** Image should have alt text (future enhancement)
- **Keyboard navigation:** Should support Escape key to close (future enhancement)

## Security Considerations

- QR code points to official PM Relief Fund account
- Terminal and branch information is publicly verifiable
- No personal data collected through donation dialog
- Donation happens through secure fonepay system

## Future Enhancements

### Possible Improvements
1. **Remember dismissal:** Only show once per session using AsyncStorage
2. **Share button:** Allow sharing QR code on social media
3. **Copy account details:** Button to copy terminal number
4. **Animation:** Fade in effect for smoother appearance
5. **Multi-language:** Support Nepali language text
6. **Progress bar:** If user donates, show community progress
7. **Donation history:** Link to view past donations (if tracked)

### Advanced Features
1. **In-app donation:** Integrate fonepay SDK for direct donation
2. **Donation verification:** Show donation receipt
3. **Social proof:** Display recent donors (anonymized)
4. **Goal tracking:** Show fund-raising goal progress
5. **Multiple causes:** Allow choosing between relief causes

## Testing

### Test Cases
1. **Dialog appears on launch**
   - Open app
   - Dialog should appear immediately
   - Background should be blurred/darkened

2. **Close button works**
   - Click X button
   - Dialog should close
   - App should be accessible

3. **Download on web**
   - Click QR code
   - File should download as PNG
   - Success alert should appear

4. **Download on mobile**
   - Click QR code
   - Alert should prompt for screenshot
   - No file download (expected behavior)

5. **Non-dismissible background**
   - Click outside dialog
   - Dialog should NOT close
   - Only X button closes it

6. **QR code displays correctly**
   - Image should be clear
   - Should show fonepay logo
   - Should be scannable

## Implementation Checklist

- [x] Add state variable `donationDialogVisible`
- [x] Create Modal component
- [x] Add donation dialog UI
- [x] Style the dialog with proper layout
- [x] Add close button functionality
- [x] Use existing `qrRelieffund.png` image
- [x] Implement download function
- [x] Add proper text and formatting
- [x] Test on web platform
- [ ] Test on mobile platform
- [x] Add documentation

## Files Modified

- `mobile/App.js` - Added donation dialog modal and logic
- `mobile/assets/qrRelieffund.png` - QR code image (already exists)
- `mobile/DONATION_DIALOG_GUIDE.md` - This documentation

## Usage

The donation dialog is automatically displayed when the app starts. Users can:
1. **Scan the QR code** using fonepay app to donate
2. **Download the QR code** by clicking on it
3. **Close the dialog** by clicking the X button

No additional configuration is required. The dialog will appear every time the app is opened.

## Code Snippet

### Show/Hide Dialog
```javascript
// Show dialog
setDonationDialogVisible(true);

// Hide dialog
setDonationDialogVisible(false);
```

### Download QR Code
```javascript
downloadQRCode(); // Triggers download or screenshot prompt
```

## Support

For issues or questions:
- Check that `qrRelieffund.png` exists in `mobile/assets/`
- Verify Modal import from react-native
- Test download function in browser console
- Check mobile permissions for file access (if implementing native download)

---

**Last Updated:** After adding donation dialog feature
**Status:** ✅ Ready for use
