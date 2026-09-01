# Testing Emergency Contacts Feature

## Quick Test Steps

### 1. Test with New Profile

1. **Open the mobile app** (refresh if already open)
2. **Click "My Profile"** button in the top navigation
3. **Fill in your profile:**
   - Name: Your Name
   - Email: test@example.com
   - Click "Send OTP" (note the OTP from the alert)
   - Enter the OTP and click "Verify"
   - Password: test123 (minimum 6 characters)
   - Phone: 1234567890
   - Location: Test Location (or use "Live GPS")
4. **Click "Save Profile"**
5. **Go back to the main report page** (click CivicAlert logo)
6. **Scroll down to "Emergency SOS contacts" section**
7. **Fill in Contact 1:**
   - Name: Emergency Contact Name
   - Email: contact@example.com
   - Phone: 9876543210
8. **Click "Save emergency contacts"**
9. **Verify success:**
   - Should see green banner "Emergency contacts saved successfully"
   - Should see alert "SOS saved"

### 2. Verify in Firebase Console

1. **Open Firebase Console:** https://console.firebase.google.com/project/incidentreportts/firestore
2. **Navigate to:** `cloud.firestore` > `userProfiles`
3. **Find your document:** Should be named with your email (e.g., `test@example.com`)
4. **Check the `emergencyContacts` field:** Should show array with your contacts

### 3. Test with Existing Profile

1. **Reload the app**
2. **Should auto-load your profile** with emergency contacts
3. **Try updating an emergency contact:**
   - Change a name or phone number
   - Click "Save emergency contacts"
   - Should see success message
4. **Verify update in Firebase Console**

### 4. Test Validation

#### Test Missing Email
1. **Clear browser data** or use incognito mode
2. **Open the app** without creating a profile
3. **Scroll to Emergency SOS contacts**
4. **Try to save without profile:**
   - Fill in a contact
   - Click "Save emergency contacts"
   - Should see error: "Please enter your email in your profile before saving SOS contacts."

#### Test Incomplete Contact
1. **Create a profile** with email
2. **Fill in Contact 1** with only name and email (leave phone empty)
3. **Click "Save emergency contacts"**
4. **Should see error:** "Each visible emergency contact must include a name, email, and phone number."

#### Test Invalid Email
1. **Create a profile** with invalid email format (e.g., "notanemail")
2. **Try to save emergency contacts**
3. **Should see error:** "Please enter a valid email address in your profile."

### 5. Test Multiple Contacts

1. **Save Contact 1**
2. **Click "+ Add another contact"**
3. **Fill in Contact 2**
4. **Click "Save emergency contacts"**
5. **Should save both contacts**
6. **Verify in Firebase:** Should see array with 2 contacts
7. **Repeat for Contact 3** (maximum)

## Expected Console Output

When saving successfully, you should see in the browser console:
```
Emergency contacts saved to Firestore: [{name: "...", email: "...", phone: "..."}, ...]
```

When there's an error, you should see:
```
SOS save error: [error object]
Error details: {code: "...", message: "...", cleanEmail: "...", ...}
```

## Common Issues & Solutions

### Issue: "Firebase permission denied"
**Solution:** 
- Make sure Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Verify your profile has both email and password fields

### Issue: Contacts not showing after reload
**Solution:**
- Check Firebase Console to verify data was saved
- Check browser console for errors
- Try clearing AsyncStorage and re-saving profile

### Issue: Save button does nothing
**Solution:**
- Open browser console (F12)
- Check for JavaScript errors
- Verify all required fields are filled
- Check network tab for failed requests

### Issue: "Email not verified" error
**Solution:**
- Make sure to complete the OTP verification step in profile
- The `isEmailVerified` flag must be true

## Browser Console Commands

Check current profile:
```javascript
localStorage.getItem('civicalert-mobile-profile')
```

Clear saved profile:
```javascript
localStorage.clear()
```

Check AsyncStorage (React Native):
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.getItem('civicalert-mobile-profile').then(console.log);
```

## What to Look For

✅ **Success indicators:**
- Green banner appears at top
- Alert shows "SOS saved"
- Console shows "Emergency contacts saved to Firestore"
- Data visible in Firebase Console
- Emergency contacts persist after page reload

❌ **Failure indicators:**
- Red error alert
- Console errors
- No data in Firebase Console
- Contacts disappear after reload

## Quick Debug Checklist

- [ ] Firestore rules deployed successfully
- [ ] Profile has valid email address
- [ ] Profile has password (min 6 characters)
- [ ] Email is verified (OTP completed)
- [ ] All emergency contact fields filled
- [ ] Browser console shows no errors
- [ ] Network tab shows successful Firestore request
- [ ] Firebase Console shows updated data

## Contact Support

If issues persist after following this guide:
1. Screenshot the error message
2. Copy browser console errors
3. Note the steps that lead to the error
4. Check Firebase Console for any security rule violations
